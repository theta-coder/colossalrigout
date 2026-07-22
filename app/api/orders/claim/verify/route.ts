import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseUser } from '../../../../../lib/serverAuth';
import { verifyOrderClaimChallenge } from '../../../../../lib/server/orders';

export async function POST(request: NextRequest) {
  try {
    const verifiedUser = await verifyFirebaseUser(request);
    if (!verifiedUser) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const { challengeId, code } = await request.json();
    if (!challengeId || !/^\d{6}$/.test(String(code || '').trim())) {
      return NextResponse.json({ success: false, message: 'Challenge ID and 6-digit verification code are required.' }, { status: 400 });
    }
    const result = await verifyOrderClaimChallenge(verifiedUser.uid, verifiedUser.email, String(challengeId), String(code));

    return NextResponse.json({
      success: true,
      claimedCount: result.claimedCount,
      orderIds: result.orderIds,
      message: result.claimedCount > 0
        ? `Successfully claimed ${result.claimedCount} guest order(s)!`
        : 'No eligible guest orders were found to claim.',
    });
  } catch (error: any) {
    console.error('[API POST /api/orders/claim/verify] Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
