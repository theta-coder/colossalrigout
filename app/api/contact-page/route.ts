import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import {
  ContactPageSettings,
  ContactDetail,
  ContactSubject,
  ContactMapSettings,
  ContactPagePayload,
  defaultContactSettings,
  defaultContactMapSettings,
} from '@/lib/contact-page';

const SETTINGS_DOC = 'contact-page/settings';
const DETAILS_COL = 'contact-details';
const SUBJECTS_COL = 'contact-subjects';
const MAP_DOC = 'contact-map/settings';

export async function GET(request: NextRequest) {
  try {
    const all = new URL(request.url).searchParams.get('all') === 'true';
    if (all) {
      const admin = await requireAdmin(request);
      if (admin instanceof NextResponse) return admin;
    }

    // Settings
    const settingsSnap = await getDoc(doc(db, SETTINGS_DOC));
    const settingsData: ContactPageSettings = settingsSnap.exists()
      ? ({ id: settingsSnap.id, ...settingsSnap.data() } as ContactPageSettings)
      : defaultContactSettings;

    // Map Settings
    const mapSnap = await getDoc(doc(db, MAP_DOC));
    const mapData: ContactMapSettings = mapSnap.exists()
      ? (mapSnap.data() as ContactMapSettings)
      : defaultContactMapSettings;

    // Details
    const detailsSnap = await getDocs(collection(db, DETAILS_COL));
    const details = detailsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ContactDetail)
      .filter((item) => all || item.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Subjects
    const subjectsSnap = await getDocs(collection(db, SUBJECTS_COL));
    const subjects = subjectsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ContactSubject)
      .filter((s) => all || s.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const payload: ContactPagePayload = {
      settings: settingsData,
      details,
      subjects,
      map: mapData,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
  }
}
