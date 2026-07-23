import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { createHash, randomInt } from 'crypto';
import { db } from '../firebase';
import {
  OrderDocument,
  OrderTrackingEvent,
  CustomerSafeTrackedOrder,
  toNormalizedEmail,
  toCustomerSafeDTO,
  CanonicalOrderStatus,
  STATUS_DISPLAY_MAP,
  normalizeCanonicalStatus,
  resolveOrderDocumentStatus,
  generatePublicTrackingId,
  isValidOrderStatus,
  canTransitionOrderStatus
} from '../order-tracking';

const ORDERS_COLLECTION = 'orders';
const EVENTS_COLLECTION = 'order-tracking-events';
const CLAIMS_COLLECTION = 'order-claim-challenges';
const NOTIFICATIONS_COLLECTION = 'order-notifications';
const RATE_LIMIT_COLLECTION = 'order-tracking-rate-limits';

// ── In-Memory Rate Limiter for Tracking Lookups ─────────────────────────────
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ipOrFingerprint: string, maxAttempts = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ipOrFingerprint);

  if (!record || now > record.expiresAt) {
    rateLimitMap.set(ipOrFingerprint, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false; // Limit exceeded
  }

  record.count += 1;
  return true;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function checkPersistentRateLimit(fingerprint: string, maxAttempts = 5, windowMs = 10 * 60 * 1000): Promise<boolean> {
  const key = sha256(fingerprint).slice(0, 40);
  const ref = doc(db, RATE_LIMIT_COLLECTION, key);
  const now = Date.now();
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists() ? snapshot.data() : null;
    if (!data || now > Number(data.expiresAt || 0)) {
      transaction.set(ref, { count: 1, expiresAt: now + windowMs, updatedAt: new Date(now).toISOString() });
      return true;
    }
    if (Number(data.count || 0) >= maxAttempts) return false;
    transaction.update(ref, { count: Number(data.count || 0) + 1, updatedAt: new Date(now).toISOString() });
    return true;
  });
}

// ── Fetch Tracking Events for Order ──────────────────────────────────────────
export async function getOrderTrackingEvents(orderId: string): Promise<OrderTrackingEvent[]> {
  try {
    const q = query(collection(db, EVENTS_COLLECTION), where('orderId', '==', orderId));
    const snapshot = await getDocs(q);
    const events: OrderTrackingEvent[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as OrderTrackingEvent);
    events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    return events;
  } catch (error) {
    console.error(`Error loading tracking events for ${orderId}:`, error);
    return [];
  }
}

// ── Find Order Document by ID or Tracking ID ─────────────────────────────────
export async function findOrderDocument(trackingOrOrderId: string): Promise<OrderDocument | null> {
  const cleanKey = String(trackingOrOrderId || '').trim().toUpperCase();
  if (!cleanKey) return null;

  // 1. Try direct lookup by orderId document key
  try {
    const directSnap = await getDoc(doc(db, ORDERS_COLLECTION, cleanKey));
    if (directSnap.exists()) {
      return { id: directSnap.id, ...directSnap.data() } as OrderDocument;
    }
  } catch (e) {
    // Continue to query
  }

  // 2. Query by publicTrackingId
  try {
    const qTracking = query(collection(db, ORDERS_COLLECTION), where('publicTrackingId', '==', cleanKey));
    const snapTracking = await getDocs(qTracking);
    if (!snapTracking.empty) {
      const d = snapTracking.docs[0];
      return { id: d.id, ...d.data() } as OrderDocument;
    }
  } catch (e) {
    // Continue
  }

  // 3. Fallback: Query by orderId field
  try {
    const qOrder = query(collection(db, ORDERS_COLLECTION), where('orderId', '==', cleanKey));
    const snapOrder = await getDocs(qOrder);
    if (!snapOrder.empty) {
      const d = snapOrder.docs[0];
      return { id: d.id, ...d.data() } as OrderDocument;
    }
  } catch (e) {
    // Continue
  }

  return null;
}

// ── Secure Guest Track Lookup ────────────────────────────────────────────────
export async function trackGuestOrder(
  trackingOrOrderId: string,
  emailInput: string
): Promise<CustomerSafeTrackedOrder | null> {
  const normalizedSearchEmail = toNormalizedEmail(emailInput);
  if (!normalizedSearchEmail) return null;

  const order = await findOrderDocument(trackingOrOrderId);
  if (!order) return null;

  // Match normalized email address
  const orderEmail = toNormalizedEmail(order.customerEmailNormalized || order.customer?.email || '');
  if (orderEmail !== normalizedSearchEmail) {
    return null; // Timing-safe style generic mismatch
  }

  // Load events
  const events = await getOrderTrackingEvents(order.orderId);
  const resolvedStatus = resolveOrderDocumentStatus(order as OrderDocument & { status?: unknown });

  // If no tracking events exist yet, construct initial event on the fly
  if (events.length === 0) {
    events.push({
      id: `evt-init-${order.orderId}`,
      orderId: order.orderId,
      status: normalizeCanonicalStatus(order.currentStatus || order.statusIndex),
      title: 'Order Placed',
      description: 'Your order was received and confirmed.',
      occurredAt: order.createdAt || new Date().toISOString(),
      visibleToCustomer: true,
      createdAt: order.createdAt || new Date().toISOString(),
    });
  }
  if (!events.some((event) => event.status === resolvedStatus)) {
    const statusInfo = STATUS_DISPLAY_MAP[resolvedStatus];
    events.push({
      id: `evt-legacy-${order.orderId}-${resolvedStatus}`,
      orderId: order.orderId,
      status: resolvedStatus,
      title: statusInfo.title,
      description: statusInfo.desc,
      occurredAt: (order as any).updatedAt || order.createdAt || new Date().toISOString(),
      visibleToCustomer: true,
      createdBy: 'legacy-status-reconciliation',
      createdAt: (order as any).updatedAt || order.createdAt || new Date().toISOString(),
    });
    events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }

  return toCustomerSafeDTO(order, events);
}

// ── Authenticated User Order History ─────────────────────────────────────────
export async function getUserOrders(uid: string, email?: string): Promise<OrderDocument[]> {
  try {
    const ordersMap = new Map<string, OrderDocument>();

    if (uid && uid.trim()) {
      const qOwner = query(collection(db, ORDERS_COLLECTION), where('ownerId', '==', uid.trim()));
      const snapOwner = await getDocs(qOwner);
      snapOwner.docs.forEach((d) => {
        ordersMap.set(d.id, { id: d.id, ...d.data() } as OrderDocument);
      });
    }

    const cleanEmail = email ? toNormalizedEmail(email) : null;
    if (cleanEmail) {
      const qEmail = query(collection(db, ORDERS_COLLECTION), where('customerEmailNormalized', '==', cleanEmail));
      const snapEmail = await getDocs(qEmail);
      snapEmail.docs.forEach((d) => {
        ordersMap.set(d.id, { id: d.id, ...d.data() } as OrderDocument);
      });

      const qRawEmail = query(collection(db, ORDERS_COLLECTION), where('customer.email', '==', cleanEmail));
      const snapRawEmail = await getDocs(qRawEmail);
      snapRawEmail.docs.forEach((d) => {
        ordersMap.set(d.id, { id: d.id, ...d.data() } as OrderDocument);
      });
    }

    const orders = Array.from(ordersMap.values());
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return orders;
  } catch (error) {
    console.error(`Error loading orders for user ${uid} / ${email}:`, error);
    return [];
  }
}

// ── Admin Append Tracking Event ──────────────────────────────────────────────
export async function appendTrackingEvent(
  orderId: string,
  eventInput: {
    status: CanonicalOrderStatus;
    title: string;
    description: string;
    location?: string;
    occurredAt?: string;
    visibleToCustomer?: boolean;
    courier?: { name: string; trackingNumber: string; trackingUrl?: string } | null;
    estimatedDeliveryAt?: string | null;
    createdBy?: string;
  }
): Promise<{ success: boolean; event: OrderTrackingEvent; message?: string }> {
  const order = await findOrderDocument(orderId);
  if (!order) {
    throw new Error(`Order "${orderId}" not found.`);
  }
  if (!isValidOrderStatus(eventInput.status)) throw new Error('Invalid order status.');
  const previousStatus = normalizeCanonicalStatus(order.currentStatus || order.statusIndex);
  if (!canTransitionOrderStatus(previousStatus, eventInput.status)) {
    throw new Error(`Order cannot move from ${previousStatus} to ${eventInput.status}.`);
  }
  if (eventInput.title.trim().length > 120 || eventInput.description.trim().length > 1000) {
    throw new Error('Tracking title or description is too long.');
  }
  const occurredAt = eventInput.occurredAt || new Date().toISOString();
  if (Number.isNaN(new Date(occurredAt).getTime())) throw new Error('Invalid event date.');
  if (eventInput.estimatedDeliveryAt && Number.isNaN(new Date(eventInput.estimatedDeliveryAt).getTime())) throw new Error('Invalid estimated delivery date.');
  if (eventInput.courier?.trackingUrl) {
    const url = new URL(eventInput.courier.trackingUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Courier URL must use http or https.');
  }

  const now = new Date().toISOString();
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const statusInfo = STATUS_DISPLAY_MAP[eventInput.status] || { title: 'Status Updated', desc: '' };

  const event: OrderTrackingEvent = {
    id: eventId,
    orderId: order.orderId,
    status: eventInput.status,
    title: eventInput.title.trim() || statusInfo.title,
    description: eventInput.description.trim() || statusInfo.desc,
    location: eventInput.location?.trim() || undefined,
    occurredAt,
    visibleToCustomer: eventInput.visibleToCustomer !== false,
    createdBy: eventInput.createdBy || 'admin',
    createdAt: now,
  };

  // Run update in transaction
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, ORDERS_COLLECTION, order.id || order.orderId);
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    const updateFields: Record<string, any> = {
      currentStatus: eventInput.status,
      updatedAt: now,
    };
    const legacyStatusByCanonical: Partial<Record<CanonicalOrderStatus, string>> = {
      placed: 'Placed', confirmed: 'Processed', processing: 'Processed', packed: 'Processed',
      shipped: 'Shipped', 'in-transit': 'Shipped', 'out-for-delivery': 'Out for Delivery', delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    const legacyIndexByCanonical: Partial<Record<CanonicalOrderStatus, number>> = {
      placed: 0, confirmed: 1, processing: 1, packed: 1, shipped: 2, 'in-transit': 2,
      'out-for-delivery': 3, delivered: 4,
    };
    if (legacyStatusByCanonical[eventInput.status]) updateFields.status = legacyStatusByCanonical[eventInput.status];
    if (legacyIndexByCanonical[eventInput.status] !== undefined) updateFields.statusIndex = legacyIndexByCanonical[eventInput.status];

    if (eventInput.courier !== undefined) {
      updateFields.courier = eventInput.courier;
    }
    if (eventInput.estimatedDeliveryAt !== undefined) {
      updateFields.estimatedDeliveryAt = eventInput.estimatedDeliveryAt;
    }
    if (eventInput.status === 'delivered') {
      updateFields.deliveredAt = occurredAt;
      updateFields.fulfillmentStatus = 'delivered';
      updateFields.paymentStatus = 'paid';
    } else if (eventInput.status === 'shipped') {
      updateFields.fulfillmentStatus = 'shipped';
    } else if (['confirmed', 'processing', 'packed', 'in-transit', 'out-for-delivery'].includes(eventInput.status)) {
      updateFields.fulfillmentStatus = 'processing';
    } else if (eventInput.status === 'cancelled') {
      updateFields.fulfillmentStatus = 'cancelled';
    } else if (eventInput.status === 'returned') {
      updateFields.fulfillmentStatus = 'returned';
    } else if (eventInput.status === 'refunded') {
      updateFields.paymentStatus = 'refunded';
    }

    const cleanUpdateFields = Object.fromEntries(
      Object.entries(updateFields).filter(([_, v]) => v !== undefined)
    );
    const cleanEvent = Object.fromEntries(
      Object.entries(event).filter(([_, v]) => v !== undefined)
    );

    transaction.update(orderRef, cleanUpdateFields);
    transaction.set(eventRef, cleanEvent);
  });

  return { success: true, event };
}

export async function queueOrderNotification(input: {
  orderId?: string;
  recipient: string;
  template: string;
  templateData: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const ref = doc(collection(db, NOTIFICATIONS_COLLECTION));
  const storedTemplateData = { ...input.templateData };
  if ('code' in storedTemplateData) storedTemplateData.code = '[REDACTED]';
  await setDoc(ref, { id: ref.id, ...input, templateData: storedTemplateData, status: 'queued', attempts: 0, createdAt: now, updatedAt: now });

  // Send via Nodemailer Gmail
  const gmailUser = process.env.GMAIL_USER || 'colossalrigout@gmail.com';
  const gmailAppPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailAppPass) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPass },
    });
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    const subject = input.template === 'claim-guest-orders-otp' ? 'Your Colossal Rigout verification code' : input.template === 'order-confirmation' ? `Order ${escape(input.orderId)} confirmed` : `Order ${escape(input.orderId)} status updated`;
    const body = input.template === 'claim-guest-orders-otp'
      ? `<h2>Verify your guest orders</h2><p>Your verification code is <strong>${escape(input.templateData.code)}</strong>. It expires in 10 minutes.</p>`
      : `<h2>${escape(input.templateData.title || 'Order update')}</h2><p>${escape(input.templateData.description || '')}</p><p>Order: <strong>${escape(input.orderId)}</strong></p><p>Tracking ID: <strong>${escape(input.templateData.trackingId)}</strong></p>`;
    try {
      await transporter.sendMail({
        from: `"Colossal Rigout" <${gmailUser}>`,
        to: input.recipient,
        subject,
        html: body,
      });
      await updateDoc(ref, { status: 'sent', attempts: 1, updatedAt: new Date().toISOString() });
    } catch (error: any) {
      await updateDoc(ref, { status: 'failed', attempts: 1, lastError: String(error.message || 'Email delivery failed'), updatedAt: new Date().toISOString() });
    }
  }
  return ref.id;
}

export async function createOrderClaimChallenge(uid: string, email: string) {
  const normalizedEmail = toNormalizedEmail(email);
  const code = String(randomInt(100000, 1000000));
  const now = Date.now();
  const challengeId = `claim-${uid}-${now}`;
  await setDoc(doc(db, CLAIMS_COLLECTION, challengeId), {
    id: challengeId,
    uid,
    emailHash: sha256(normalizedEmail),
    codeHash: sha256(`${challengeId}:${code}`),
    attempts: 0,
    used: false,
    expiresAt: now + 10 * 60 * 1000,
    createdAt: new Date(now).toISOString(),
  });
  await queueOrderNotification({ recipient: normalizedEmail, template: 'claim-guest-orders-otp', templateData: { code, expiresInMinutes: 10 } });
  return { challengeId, debugCode: process.env.NODE_ENV === 'production' ? undefined : code };
}

export async function verifyOrderClaimChallenge(uid: string, email: string, challengeId: string, code: string) {
  const ref = doc(db, CLAIMS_COLLECTION, challengeId);
  const normalizedEmail = toNormalizedEmail(email);
  const verified = await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Invalid or expired verification code.');
    const data = snapshot.data();
    if (data.uid !== uid || data.emailHash !== sha256(normalizedEmail) || data.used || Date.now() > Number(data.expiresAt) || Number(data.attempts || 0) >= 5) {
      throw new Error('Invalid or expired verification code.');
    }
    if (data.codeHash !== sha256(`${challengeId}:${String(code).trim()}`)) {
      transaction.update(ref, { attempts: Number(data.attempts || 0) + 1 });
      return false;
    }
    transaction.update(ref, { used: true, verifiedAt: new Date().toISOString() });
    return true;
  });
  if (!verified) throw new Error('Invalid or expired verification code.');
  return claimGuestOrdersForUser(uid, normalizedEmail);
}

// ── Claim Guest Orders ───────────────────────────────────────────────────────
export async function claimGuestOrdersForUser(
  uid: string,
  userEmail: string
): Promise<{ success: boolean; claimedCount: number; orderIds: string[] }> {
  const normEmail = toNormalizedEmail(userEmail);
  if (!normEmail || !uid) return { success: false, claimedCount: 0, orderIds: [] };

  const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
  const unclaimedMatches: OrderDocument[] = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as OrderDocument)
    .filter(
      (o) =>
        (!o.ownerId || o.ownerId === null || o.ownerId === '') &&
        toNormalizedEmail(o.customerEmailNormalized || o.customer?.email || '') === normEmail
    );

  if (unclaimedMatches.length === 0) {
    return { success: true, claimedCount: 0, orderIds: [] };
  }

  const now = new Date().toISOString();
  const claimedIds: string[] = [];

  const batch = writeBatch(db);
  for (const order of unclaimedMatches) {
    batch.update(doc(db, ORDERS_COLLECTION, order.id || order.orderId), {
      ownerId: uid,
      updatedAt: now,
    });
    claimedIds.push(order.orderId);
  }
  await batch.commit();

  return { success: true, claimedCount: claimedIds.length, orderIds: claimedIds };
}
