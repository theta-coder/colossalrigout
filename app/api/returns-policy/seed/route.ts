import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import {
  defaultSettings,
  defaultCta,
  ReturnCondition,
  ReturnStep,
  ReturnInfoSection,
} from '../../../../lib/returns-policy';

const SETTINGS_DOC = 'returns-policy/settings';
const CONDITIONS_COL = 'return-conditions';
const STEPS_COL = 'return-steps';
const INFO_COL = 'return-info-sections';
const CTA_DOC = 'return-page-cta/support';

const initialConditions = [
  'Unused and unwashed',
  'Original tags attached',
  'Original packaging included',
  'No signs of wear or damage by the customer',
];

const initialSteps: Array<{ title: string; description: string; linkLabel?: string; linkPath?: string }> = [];

const initialInfoSections = [
  {
    title: 'Non-Returnable Items',
    description: '• Sale items\n• Clearance products\n• Gift cards\n• Used or washed items\n• Products without original tags',
  },
  {
    title: 'Damaged or Incorrect Orders',
    description: 'If you receive a damaged, defective, or incorrect item, contact us within 12 hours of delivery with photos. We will arrange a replacement or refund after verification.',
  },
  {
    title: 'Exchange Policy',
    description: 'Items can be exchanged for another size or colour, subject to stock availability.',
  },
  {
    title: 'Refund Policy',
    description: 'After inspection and approval, refunds are processed within 5–7 business days using the original payment method.',
  },
  {
    title: 'Return Shipping',
    description: 'If the return is due to our mistake (wrong or defective item), Colossal Rigout will bear the return shipping cost.\n\nIf the customer wants to return an item for personal reasons, the customer is responsible for the return shipping cost.',
  },
];

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const condSnap = await getDocs(collection(db, CONDITIONS_COL));
    const stepSnap = await getDocs(collection(db, STEPS_COL));
    const infoSnap = await getDocs(collection(db, INFO_COL));

    const totalExisting = condSnap.size + stepSnap.size + infoSnap.size;
    if (totalExisting > 0) {
      return NextResponse.json({
        success: false,
        message: `Seed blocked: Database already contains ${condSnap.size} conditions, ${stepSnap.size} steps, and ${infoSnap.size} sections.`,
      }, { status: 409 });
    }

    const now = new Date().toISOString();

    // 1. Seed Settings
    await setDoc(doc(db, SETTINGS_DOC), { ...defaultSettings, updatedAt: now }, { merge: true });

    // 2. Seed CTA
    await setDoc(doc(db, CTA_DOC), { ...defaultCta, updatedAt: now }, { merge: true });

    // 3. Seed Conditions
    for (let i = 0; i < initialConditions.length; i++) {
      const condId = `cond-${i + 1}`;
      const condDoc: ReturnCondition = {
        id: condId,
        text: initialConditions[i],
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, CONDITIONS_COL, condId), condDoc);
    }

    // 4. Seed Steps
    for (let i = 0; i < initialSteps.length; i++) {
      const stepId = `step-${i + 1}`;
      const stepData = initialSteps[i];
      const stepDoc: ReturnStep = {
        id: stepId,
        title: stepData.title,
        description: stepData.description,
        linkLabel: stepData.linkLabel || '',
        linkPath: stepData.linkPath || '',
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, STEPS_COL, stepId), stepDoc);
    }

    // 5. Seed Info Sections
    for (let i = 0; i < initialInfoSections.length; i++) {
      const infoId = `info-${i + 1}`;
      const infoData = initialInfoSections[i];
      const infoDoc: ReturnInfoSection = {
        id: infoId,
        title: infoData.title,
        description: infoData.description,
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, INFO_COL, infoId), infoDoc);
    }

    return NextResponse.json({
      success: true,
      message: `Default returns policy seeded! Added 5 conditions, 4 process steps, 2 info sections, page settings & CTA.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
