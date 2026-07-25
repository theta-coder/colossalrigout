import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';

const defaults = [
  ['Delivery Times','Orders are shipped through TCS and are generally delivered within 3–7 business days across Pakistan.','truck'],
  ['Shipping Charges','We offer free delivery across Pakistan on all products. There are no delivery charges or minimum purchase thresholds.','dollar'],
  ['Order Tracking','Once your order is placed, use your tracking ID together with your checkout email address on our Track Order page to follow real-time status updates.','package'],
  ['Nationwide Shipping','Colossal Rigout ships nationwide across Pakistan only via TCS.','globe'],
  ['Delays & Exceptions','Delivery times may occasionally be affected by circumstances outside our control, including public holidays, harsh weather, remote locations, or courier transit delays.','alert'],
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
