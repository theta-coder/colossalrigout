import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseUser, requireAdmin } from '../../../../lib/serverAuth';
import { findOrderDocument, getOrderTrackingEvents } from '../../../../lib/server/orders';
import { toCustomerSafeDTO } from '../../../../lib/order-tracking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order ID is required.' }, { status: 400 });
    }

    const verifiedUser = await verifyFirebaseUser(request);
    if (!verifiedUser) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const order = await findOrderDocument(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    // Ownership check: must be owner or primary administrator
    const isOwner = order.ownerId === verifiedUser.uid;
    const adminCheck = await requireAdmin(request);
    const isAdmin = !(adminCheck instanceof NextResponse);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Access denied.' }, { status: 403 });
    }

    const events = await getOrderTrackingEvents(order.orderId);
    const safeOrder = toCustomerSafeDTO(order, events);

    return NextResponse.json({ success: true, order: safeOrder });
  } catch (error: any) {
    console.error('[API GET /api/orders/[orderId]] Error:', error.message);
    return NextResponse.json({ success: false, message: 'Failed to load order details.' }, { status: 500 });
  }
}
