import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/serverAuth';
import { appendTrackingEvent, findOrderDocument, queueOrderNotification } from '../../../../../../lib/server/orders';
import { CanonicalOrderStatus } from '../../../../../../lib/order-tracking';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order ID is required.' }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      title,
      description,
      location,
      occurredAt,
      visibleToCustomer,
      courier,
      estimatedDeliveryAt,
      notifyCustomer,
    } = body;

    if (!status) {
      return NextResponse.json({ success: false, message: 'Status is required.' }, { status: 400 });
    }
    if (courier && (!String(courier.name || '').trim() || !String(courier.trackingNumber || '').trim())) {
      return NextResponse.json({ success: false, message: 'Courier name and tracking number are both required.' }, { status: 400 });
    }

    const result = await appendTrackingEvent(orderId, {
      status: status as CanonicalOrderStatus,
      title: String(title || ''),
      description: String(description || ''),
      location: location ? String(location) : undefined,
      occurredAt: occurredAt ? String(occurredAt) : undefined,
      visibleToCustomer: visibleToCustomer !== false,
      courier: courier ? {
        name: String(courier.name || ''),
        trackingNumber: String(courier.trackingNumber || ''),
        trackingUrl: courier.trackingUrl ? String(courier.trackingUrl) : undefined,
      } : undefined,
      estimatedDeliveryAt: estimatedDeliveryAt ? String(estimatedDeliveryAt) : undefined,
      createdBy: (admin as any).uid || 'admin',
    });

    if (notifyCustomer !== false) {
      try {
        const order = await findOrderDocument(orderId);
        if (order?.customer?.email) {
          await queueOrderNotification({ orderId: order.orderId, recipient: order.customer.email, template: 'order-status-update', templateData: { customerName: order.customer.name, orderId: order.orderId, trackingId: order.publicTrackingId, status, title: result.event.title, description: result.event.description } });
        }
      } catch (notificationError) { console.error('[Tracking Event] Notification queue failed:', notificationError); }
    }

    return NextResponse.json({
      success: true,
      event: result.event,
      message: `Tracking event recorded for order ${orderId}.`,
    });
  } catch (error: any) {
    console.error('[API POST /api/admin/orders/[orderId]/tracking-events] Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
