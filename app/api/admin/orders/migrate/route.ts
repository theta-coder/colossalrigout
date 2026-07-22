import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/serverAuth';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import {
  toNormalizedEmail,
  generatePublicTrackingId,
  normalizeCanonicalStatus,
  STATUS_DISPLAY_MAP,
  OrderDocument
} from '../../../../../lib/order-tracking';
import { getOrderTrackingEvents } from '../../../../../lib/server/orders';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const snapshot = await getDocs(collection(db, 'orders'));
    let updatedCount = 0;
    let eventsCreatedCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as OrderDocument;
      const orderId = docSnap.id;

      const normEmail = toNormalizedEmail(data.customerEmailNormalized || data.customer?.email || '');
      const publicTrackingId = data.publicTrackingId || generatePublicTrackingId(orderId);
      const currentStatus = normalizeCanonicalStatus(data.currentStatus || data.statusIndex);

      const updates: Record<string, any> = {};

      if (!data.customerEmailNormalized && normEmail) {
        updates.customerEmailNormalized = normEmail;
      }
      if (!data.publicTrackingId) {
        updates.publicTrackingId = publicTrackingId;
      }
      if (!data.currentStatus) {
        updates.currentStatus = currentStatus;
      }
      if (!data.fulfillmentStatus) {
        updates.fulfillmentStatus = currentStatus === 'delivered' ? 'delivered' : currentStatus === 'shipped' ? 'shipped' : 'unfulfilled';
      }
      if (!data.paymentStatus) {
        updates.paymentStatus = currentStatus === 'delivered' ? 'paid' : 'cod-pending';
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'orders', orderId), updates);
        updatedCount++;
      }

      // Check if events exist for this order
      const existingEvents = await getOrderTrackingEvents(orderId);
      if (existingEvents.length === 0) {
        const initEventId = `evt-init-${orderId}`;
        const now = data.createdAt || new Date().toISOString();
        await setDoc(doc(db, 'order-tracking-events', initEventId), {
          id: initEventId,
          orderId,
          status: currentStatus,
          title: STATUS_DISPLAY_MAP[currentStatus].title,
          description: STATUS_DISPLAY_MAP[currentStatus].desc,
          occurredAt: now,
          visibleToCustomer: true,
          createdBy: 'migration',
          createdAt: now,
        });
        eventsCreatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Updated ${updatedCount} orders and created ${eventsCreatedCount} initial tracking events.`,
      stats: { totalOrders: snapshot.size, updatedCount, eventsCreatedCount },
    });
  } catch (error: any) {
    console.error('[API POST /api/admin/orders/migrate] Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
