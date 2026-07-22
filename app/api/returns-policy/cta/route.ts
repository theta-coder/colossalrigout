import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { ReturnSupportCta, validateInternalPath } from '../../../../lib/returns-policy';

const CTA_DOC = 'return-page-cta/support';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { cta } = await request.json();
    const heading = String(cta?.heading || '').trim();
    const description = String(cta?.description || '').trim();
    const buttonLabel = String(cta?.buttonLabel || '').trim();
    const rawButtonPath = String(cta?.buttonPath || '').trim();

    if (!heading || heading.length < 2 || heading.length > 100) {
      return NextResponse.json({ success: false, message: 'CTA heading must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 1000) {
      return NextResponse.json({ success: false, message: 'CTA description must be 2–1,000 characters.' }, { status: 400 });
    }
    if (!buttonLabel || buttonLabel.length < 2 || buttonLabel.length > 60) {
      return NextResponse.json({ success: false, message: 'Button label must be 2–60 characters.' }, { status: 400 });
    }

    const buttonPath = validateInternalPath(rawButtonPath);
    if (!buttonPath) {
      return NextResponse.json({ success: false, message: 'Button path must be a safe internal route starting with "/".' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const savedCta: ReturnSupportCta = {
      heading,
      description,
      buttonLabel,
      buttonPath,
      active: cta?.active !== false,
      updatedAt: now,
    };

    await setDoc(doc(db, CTA_DOC), savedCta, { merge: true });
    return NextResponse.json({ success: true, data: savedCta, message: 'Support CTA updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
