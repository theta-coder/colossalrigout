import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { AboutPageSettings, validateAboutImageSource } from '../../../../lib/about-page';

const SETTINGS_DOC = 'about-page/settings';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const s = body.settings || body;
    const heroEyebrow = String(s.heroEyebrow || '').trim();
    const heroTitle = String(s.heroTitle || '').trim();
    const heroImage = validateAboutImageSource(s.heroImage);
    const heroImageAlt = String(s.heroImageAlt || '').trim();
    const breadcrumbLabel = String(s.breadcrumbLabel || '').trim();
    const teamHeading = String(s.teamHeading || '').trim();
    const teamDescription = String(s.teamDescription || '').trim();

    if (!heroEyebrow || heroEyebrow.length < 2 || heroEyebrow.length > 60) {
      return NextResponse.json({ success: false, message: 'Hero eyebrow must be 2–60 characters.' }, { status: 400 });
    }
    if (!heroTitle || heroTitle.length < 2 || heroTitle.length > 100) {
      return NextResponse.json({ success: false, message: 'Hero title must be 2–100 characters.' }, { status: 400 });
    }
    if (!heroImageAlt || heroImageAlt.length < 2 || heroImageAlt.length > 160) {
      return NextResponse.json({ success: false, message: 'Hero image alt text must be 2–160 characters.' }, { status: 400 });
    }
    if (!breadcrumbLabel || breadcrumbLabel.length < 2 || breadcrumbLabel.length > 60) {
      return NextResponse.json({ success: false, message: 'Breadcrumb label must be 2–60 characters.' }, { status: 400 });
    }
    if (!teamHeading || teamHeading.length < 2 || teamHeading.length > 100) {
      return NextResponse.json({ success: false, message: 'Team heading must be 2–100 characters.' }, { status: 400 });
    }
    if (teamDescription.length > 500) {
      return NextResponse.json({ success: false, message: 'Team description must be under 500 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: AboutPageSettings = {
      heroEyebrow,
      heroTitle,
      heroImage: heroImage || '',
      heroImageAlt,
      breadcrumbLabel,
      valuesSectionActive: s.valuesSectionActive !== false,
      teamHeading,
      teamDescription,
      teamSectionActive: s.teamSectionActive !== false,
      pageActive: s.pageActive !== false,
      updatedAt: now,
    };

    await setDoc(doc(db, SETTINGS_DOC), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Page settings updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
