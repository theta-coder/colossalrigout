import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';
import {
  ReturnsPolicySettings,
  ReturnCondition,
  ReturnStep,
  ReturnInfoSection,
  ReturnSupportCta,
  ReturnsPolicyPayload,
  defaultSettings,
  defaultCta,
} from '../../../lib/returns-policy';

const SETTINGS_DOC = 'returns-policy/settings';
const CONDITIONS_COL = 'return-conditions';
const STEPS_COL = 'return-steps';
const INFO_COL = 'return-info-sections';
const CTA_DOC = 'return-page-cta/support';

export async function GET(request: NextRequest) {
  try {
    const all = new URL(request.url).searchParams.get('all') === 'true';
    if (all) {
      const admin = await requireAdmin(request);
      if (admin instanceof NextResponse) return admin;
    }

    // Load Settings
    const settingsSnap = await getDoc(doc(db, SETTINGS_DOC));
    const settingsData = settingsSnap.exists()
      ? ({ id: settingsSnap.id, ...settingsSnap.data() } as ReturnsPolicySettings)
      : defaultSettings;

    // Load CTA
    const ctaSnap = await getDoc(doc(db, CTA_DOC));
    const ctaData = ctaSnap.exists()
      ? ({ id: ctaSnap.id, ...ctaSnap.data() } as ReturnSupportCta)
      : defaultCta;

    // Load Conditions
    const condSnap = await getDocs(collection(db, CONDITIONS_COL));
    const conditions = condSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ReturnCondition)
      .filter((c) => all || c.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Load Steps
    const stepsSnap = await getDocs(collection(db, STEPS_COL));
    const steps = stepsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ReturnStep)
      .filter((s) => all || s.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Load Info Sections
    const infoSnap = await getDocs(collection(db, INFO_COL));
    const infoSections = infoSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ReturnInfoSection)
      .filter((i) => all || i.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const payload: ReturnsPolicyPayload = {
      settings: settingsData,
      conditions,
      steps,
      infoSections,
      cta: ctaData,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
  }
}
