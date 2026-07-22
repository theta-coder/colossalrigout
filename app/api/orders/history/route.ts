import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseUser } from '../../../../lib/serverAuth';
import { getUserOrders, getOrderTrackingEvents } from '../../../../lib/server/orders';
import { toCustomerSafeDTO } from '../../../../lib/order-tracking';

export async function GET(request: NextRequest) {
  try {
    const verifiedUser = await verifyFirebaseUser(request);
    const { searchParams } = new URL(request.url);
    const targetUid = verifiedUser?.uid || searchParams.get('userId') || '';
    const targetEmail = verifiedUser?.email || searchParams.get('email') || '';

    if (!verifiedUser && !targetUid && !targetEmail) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access order history.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const rawOrders = await getUserOrders(targetUid, targetEmail);

    // Attach tracking events to each order for rich history view
    const safeOrders = await Promise.all(
      rawOrders.map(async (order) => {
        const events = await getOrderTrackingEvents(order.orderId);
        if (events.length === 0) {
          events.push({
            id: `evt-init-${order.orderId}`,
            orderId: order.orderId,
            status: order.currentStatus || 'placed',
            title: 'Order Placed',
            description: 'Your order was received and confirmed.',
            occurredAt: order.createdAt || new Date().toISOString(),
            visibleToCustomer: true,
            createdAt: order.createdAt || new Date().toISOString(),
          });
        }
        return toCustomerSafeDTO(order, events);
      })
    );

    return NextResponse.json(
      { success: true, orders: safeOrders },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('[API GET /api/orders/history] Error:', error.message);
    return NextResponse.json(
      { success: false, message: 'Failed to load order history.', error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
