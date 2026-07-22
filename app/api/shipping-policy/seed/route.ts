import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';

const defaults = [
  ['Delivery Times','Orders are typically processed within 1–2 business days. Standard delivery takes 4–6 business days once dispatched. Delivery estimates are shown at checkout based on your location.','truck'],
  ['Shipping Charges','Standard shipping is PKR 500 within Pakistan. Orders over PKR 5,000 qualify for free standard shipping automatically at checkout. Charges are shown before order confirmation.','dollar'],
  ['Order Tracking','Once your order is placed, use your tracking ID together with the checkout email address on our Track Order page to follow real database status updates.','package'],
  ['International Shipping','At this time, Colossal Rigout ships within Pakistan only. We are working on expanding to international destinations.','globe'],
  ['Delays & Exceptions','Deliveries may occasionally be delayed due to weather, public holidays, courier disruption, or high order volume. Contact support if your order takes longer than expected.','alert'],
] as const;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request); if (admin instanceof NextResponse) return admin;
  const snapshot = await getDocs(collection(db, 'shipping-policy-sections'));
  if (!snapshot.empty) return NextResponse.json({ success: false, message: 'Shipping policy is already configured.' }, { status: 409 });
  const now = new Date().toISOString();
  await setDoc(doc(db, 'shipping-policy', 'settings'), { id: 'settings', pageTitle: 'SHIPPING POLICY', intro: '', updatedAt: now });
  await Promise.all(defaults.map(([title, description, icon], index) => setDoc(doc(db, 'shipping-policy-sections', `shipping-section-${index + 1}`), { id: `shipping-section-${index + 1}`, title, description, icon, order: index + 1, active: true, createdAt: now, updatedAt: now })));
  return NextResponse.json({ success: true, message: 'Shipping policy defaults created.', data: { sections: defaults.length } });
}
