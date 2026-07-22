import { NextRequest, NextResponse } from 'next/server';
import { trackGuestOrder, checkPersistentRateLimit } from '../../../../lib/server/orders';

export async function POST(request: NextRequest) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous').split(',')[0].trim();
    const previewBody = await request.json();
    const trackingId = String(previewBody.trackingId || previewBody.orderId || '').trim().toUpperCase();
    const email = String(previewBody.email || '').trim().toLowerCase();
    if (!await checkPersistentRateLimit(`${ip}:${trackingId}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many tracking attempts. Please wait 10 minutes before trying again.',
        },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!trackingId || !/^[A-Z0-9-]{6,64}$/.test(trackingId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "We couldn't find an order matching those details." },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const trackedOrder = await trackGuestOrder(trackingId, email);

    if (!trackedOrder) {
      // Generic privacy-preserving error response
      return NextResponse.json(
        { success: false, message: "We couldn't find an order matching those details." },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, order: trackedOrder },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('[API POST /api/orders/track] Error:', error.message);
    return NextResponse.json(
      { success: false, message: "We couldn't find an order matching those details." },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
