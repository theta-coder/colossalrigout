import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseUser } from '../../../../../lib/serverAuth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { toNormalizedEmail } from '../../../../../lib/order-tracking';
import { createOrderClaimChallenge } from '../../../../../lib/server/orders';

export async function POST(request: NextRequest) {
  try {
    const verifiedUser = await verifyFirebaseUser(request);
    if (!verifiedUser) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const normEmail = toNormalizedEmail(verifiedUser.email);
    if (!normEmail) {
      return NextResponse.json({ success: false, message: 'No valid email associated with account.' }, { status: 400 });
    }

    // Check for unclaimed orders with matching normalized email
    const snapshot = await getDocs(collection(db, 'orders'));
    const unclaimedMatches = snapshot.docs
      .map((d) => d.data())
      .filter(
        (o: any) =>
          (!o.ownerId || o.ownerId === null || o.ownerId === '') &&
          toNormalizedEmail(o.customerEmailNormalized || o.customer?.email || '') === normEmail
      );

    if (unclaimedMatches.length === 0) return NextResponse.json({
      success: true,
      eligibleCount: 0,
      message: 'No unclaimed orders were found for your verified account email.',
    });
    const challenge = await createOrderClaimChallenge(verifiedUser.uid, normEmail);
    return NextResponse.json({ success: true, eligibleCount: unclaimedMatches.length, ...challenge, message: 'A 6-digit verification code has been queued for your account email.' });
  } catch (error: any) {
    console.error('[API POST /api/orders/claim/request] Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
