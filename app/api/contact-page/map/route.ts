import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { ContactMapSettings, validateContactImageSource, validateInternalOrExternalUrl } from '@/lib/contact-page';

const MAP_DOC = 'contact-map/settings';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { map } = await request.json();
    const mapImageUrl = validateContactImageSource(map?.mapImageUrl);
    const mapImageAlt = String(map?.mapImageAlt || '').trim();
    const rawMapUrl = String(map?.mapUrl || '').trim();
    const ctaLabel = String(map?.ctaLabel || '').trim();

    const mapUrl = validateInternalOrExternalUrl(rawMapUrl) || 'https://maps.google.com/?q=Gulberg+III+Lahore+Pakistan';

    const now = new Date().toISOString();
    const savedMap: ContactMapSettings = {
      mapImageUrl: mapImageUrl || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
      mapImageAlt: mapImageAlt || 'Gulberg Lahore Map Location',
      mapUrl,
      ctaLabel: ctaLabel || 'FIND A STORE NEAR YOU',
      active: map?.active !== false,
      updatedAt: now,
    };

    await setDoc(doc(db, MAP_DOC), savedMap, { merge: true });
    return NextResponse.json({ success: true, data: savedMap, message: 'Map settings updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
