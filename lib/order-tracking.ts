export type CanonicalOrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'in-transit'
  | 'out-for-delivery'
  | 'delivered'
  | 'confirmation-pending'
  | 'on-hold'
  | 'delivery-attempted'
  | 'cancelled'
  | 'return-requested'
  | 'returned'
  | 'refunded';

export type LegacyStatusString = 'Placed' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export type PaymentStatus = 'cod-pending' | 'paid' | 'failed' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface CourierSnapshot {
  name: string;
  trackingNumber: string;
  trackingUrl?: string;
}

export interface OrderTrackingEvent {
  id: string;
  orderId: string;
  status: CanonicalOrderStatus;
  title: string;
  description: string;
  location?: string;
  occurredAt: string; // ISO timestamp
  visibleToCustomer: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface OrderCustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

export interface OrderItemSnapshot {
  id: number | string;
  productId: string;
  variantId?: string;
  sku?: string;
  name: string;
  size: string;
  color: string;
  price: number;
  qty: number;
  img: string;
}

export interface OrderDocument {
  id?: string;
  orderId: string; // Internal business ID, e.g. CR-482913
  publicTrackingId: string; // Cryptographic/Unpredictable lookup key, e.g. CR-X7K4-P9QD-2M
  ownerId: string | null; // Firebase UID or null for guests
  customer: OrderCustomerInfo;
  customerEmailNormalized: string;
  currentStatus: CanonicalOrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  payMethod: string;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  courier?: CourierSnapshot | null;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  items: OrderItemSnapshot[];
  promoCodeApplied?: string | null;
  createdAt: string;
  updatedAt: string;
  statusIndex?: number; // Legacy compatibility
}

export interface CustomerSafeTrackedOrder {
  orderId: string;
  publicTrackingId: string;
  currentStatus: CanonicalOrderStatus;
  statusTitle: string;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  courier?: CourierSnapshot | null;
  customerMaskedEmail: string;
  customerMaskedPhone: string;
  shippingCity: string;
  payMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  items: OrderItemSnapshot[];
  timeline: OrderTrackingEvent[];
  createdAt: string;
}

export interface OrderHistorySummary {
  orderId: string;
  publicTrackingId: string;
  currentStatus: CanonicalOrderStatus;
  statusTitle: string;
  total: number;
  itemCount: number;
  itemsPreview: { name: string; img: string; size: string; color: string; qty: number }[];
  courier?: CourierSnapshot | null;
  estimatedDeliveryAt?: string | null;
  createdAt: string;
}

// ── STATUS DISPLAY MAP ──────────────────────────────────────────────────
export const STATUS_DISPLAY_MAP: Record<CanonicalOrderStatus, { title: string; desc: string }> = {
  placed: { title: 'Order Placed', desc: 'Your order has been received and logged in our system.' },
  confirmed: { title: 'Order Confirmed', desc: 'Order details and inventory reservation confirmed.' },
  processing: { title: 'Processing Order', desc: 'Our warehouse team is preparing your items.' },
  packed: { title: 'Packed & Sealed', desc: 'Your parcel is packed and waiting for courier dispatch.' },
  shipped: { title: 'Shipped', desc: 'Parcel handed over to courier logistics partner.' },
  'in-transit': { title: 'In Transit', desc: 'Your shipment is moving through regional logistics hubs.' },
  'out-for-delivery': { title: 'Out for Delivery', desc: 'Rider is assigned and delivery is scheduled today.' },
  delivered: { title: 'Delivered', desc: 'Package delivered to recipient.' },
  'confirmation-pending': { title: 'Confirmation Pending', desc: 'Pending verification call or address confirmation.' },
  'on-hold': { title: 'Order On Hold', desc: 'Order temporarily paused pending customer instruction.' },
  'delivery-attempted': { title: 'Delivery Attempted', desc: 'Courier attempted delivery but recipient was unavailable.' },
  cancelled: { title: 'Cancelled', desc: 'Order has been cancelled.' },
  'return-requested': { title: 'Return Requested', desc: 'Customer return request received.' },
  returned: { title: 'Returned', desc: 'Item returned to fulfillment facility.' },
  refunded: { title: 'Refunded', desc: 'Order payment refunded.' },
};

// Map legacy status index (0..4) or string to canonical status
export function normalizeCanonicalStatus(input: any): CanonicalOrderStatus {
  if (typeof input === 'number') {
    const map: CanonicalOrderStatus[] = ['placed', 'packed', 'shipped', 'out-for-delivery', 'delivered'];
    return map[input] || 'placed';
  }
  const str = String(input || '').toLowerCase().trim();
  if (str === 'placed') return 'placed';
  if (str === 'confirmed') return 'confirmed';
  if (str === 'processing') return 'processing';
  if (str === 'processed') return 'processing';
  if (str === 'packed') return 'packed';
  if (str === 'shipped') return 'shipped';
  if (str === 'in-transit' || str === 'in transit') return 'in-transit';
  if (str === 'out-for-delivery' || str === 'out for delivery') return 'out-for-delivery';
  if (str === 'delivered') return 'delivered';
  if (str === 'confirmation-pending' || str === 'confirmation pending') return 'confirmation-pending';
  if (str === 'on-hold' || str === 'on hold') return 'on-hold';
  if (str === 'delivery-attempted' || str === 'delivery attempted') return 'delivery-attempted';
  if (str === 'cancelled') return 'cancelled';
  if (str === 'return-requested' || str === 'return requested') return 'return-requested';
  if (str === 'returned') return 'returned';
  if (str === 'refunded') return 'refunded';
  return 'placed';
}

export function resolveOrderDocumentStatus(order: Partial<OrderDocument> & { status?: unknown }): CanonicalOrderStatus {
  const canonical = normalizeCanonicalStatus(order.currentStatus ?? order.statusIndex);
  const legacy = normalizeCanonicalStatus(order.status ?? order.statusIndex);
  const progress: CanonicalOrderStatus[] = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'in-transit', 'out-for-delivery', 'delivered'];
  const canonicalRank = progress.indexOf(canonical);
  const legacyRank = progress.indexOf(legacy);
  return legacyRank > canonicalRank ? legacy : canonical;
}

// Convert canonical status to legacy index (0..4) for backward compatibility
export function canonicalToStatusIndex(status: CanonicalOrderStatus): number {
  switch (status) {
    case 'placed':
    case 'confirmed':
    case 'confirmation-pending':
      return 0;
    case 'processing':
    case 'packed':
      return 1;
    case 'shipped':
    case 'in-transit':
      return 2;
    case 'out-for-delivery':
    case 'delivery-attempted':
      return 3;
    case 'delivered':
      return 4;
    default:
      return 0;
  }
}

// ── HELPER FUNCTIONS ────────────────────────────────────────────────────

export function toNormalizedEmail(email: string): string {
  return String(email || '').toLowerCase().trim();
}

export function generatePublicTrackingId(orderId: string): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  const token = Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('').toUpperCase();
  return `TRK-${token.slice(0, 6)}-${token.slice(6, 12)}-${token.slice(12, 18)}-${token.slice(18, 24)}`;
}

export const CANONICAL_ORDER_STATUSES = Object.keys(STATUS_DISPLAY_MAP) as CanonicalOrderStatus[];

const TERMINAL_STATUSES = new Set<CanonicalOrderStatus>(['delivered', 'cancelled', 'returned', 'refunded']);
export function isValidOrderStatus(value: unknown): value is CanonicalOrderStatus {
  return typeof value === 'string' && CANONICAL_ORDER_STATUSES.includes(value as CanonicalOrderStatus);
}

export function canTransitionOrderStatus(from: CanonicalOrderStatus, to: CanonicalOrderStatus): boolean {
  if (from === to) return true;
  if (TERMINAL_STATUSES.has(from)) {
    return from === 'delivered' && (to === 'return-requested' || to === 'returned' || to === 'refunded');
  }
  return true;
}

export function maskEmail(email: string): string {
  const norm = toNormalizedEmail(email);
  const [local, domain] = norm.split('@');
  if (!domain) return '***@***.com';
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length < 4) return '03*******';
  return `${cleaned.slice(0, 2)}*******${cleaned.slice(-2)}`;
}

export function toCustomerSafeDTO(order: OrderDocument, timeline: OrderTrackingEvent[]): CustomerSafeTrackedOrder {
  const currentStatus = resolveOrderDocumentStatus(order as OrderDocument & { status?: unknown });
  const visibleTimeline = timeline.filter((e) => e.visibleToCustomer !== false);

  return {
    orderId: order.orderId,
    publicTrackingId: order.publicTrackingId || order.orderId,
    currentStatus,
    statusTitle: STATUS_DISPLAY_MAP[currentStatus]?.title || 'Order Processing',
    estimatedDeliveryAt: order.estimatedDeliveryAt || null,
    deliveredAt: order.deliveredAt || null,
    courier: order.courier || null,
    customerMaskedEmail: maskEmail(order.customer?.email || ''),
    customerMaskedPhone: maskPhone(order.customer?.phone || ''),
    shippingCity: order.customer?.city || 'Standard City',
    payMethod: order.payMethod || 'Cash on Delivery',
    paymentStatus: order.paymentStatus || 'cod-pending',
    subtotal: order.subtotal || 0,
    discountAmount: order.discountAmount || 0,
    shippingCost: order.shippingCost || 0,
    total: order.total || 0,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId || String(item.id),
      sku: item.sku || '',
      name: item.name,
      size: item.size,
      color: item.color,
      price: item.price,
      qty: item.qty,
      img: item.img,
    })),
    timeline: visibleTimeline.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
    createdAt: order.createdAt,
  };
}
