import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const [redemptions, orders, stores] = await Promise.all([
      getDocs(collection(db, 'promotion-redemptions')),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'stores')),
    ]);
    const users = new Map<string, { email: string; name: string }>();
    orders.forEach(item => {
      const data = item.data();
      if (data.ownerId) users.set(String(data.ownerId), {
        email: String(data.customer?.email || 'N/A'),
        name: String(data.customer?.name || 'Customer'),
      });
    });
    const storeNames = new Map(stores.docs.map(item => [item.id, String(item.data().name || item.id)]));
    const data = redemptions.docs.map(item => {
      const redemption = item.data();
      const user = users.get(String(redemption.userId));
      return {
        id: item.id,
        promotionId: String(redemption.promotionId || ''),
        userId: String(redemption.userId || ''),
        userEmail: user?.email || `User ID: ${redemption.userId || 'guest'}`,
        userName: user?.name || 'Customer',
        orderId: redemption.orderId || '',
        storeId: redemption.storeId || '',
        storeName: storeNames.get(String(redemption.storeId)) || redemption.storeId || 'N/A',
        channel: redemption.channel || 'online',
        discountAmount: Number(redemption.discountAmount || 0),
        redeemedAt: redemption.redeemedAt || '',
      };
    }).sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
