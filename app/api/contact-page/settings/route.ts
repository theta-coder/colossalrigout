import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { ContactPageSettings, validateContactImageSource, validateInternalOrExternalUrl } from '@/lib/contact-page';

const SETTINGS_DOC = 'contact-page/settings';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { settings } = await request.json();
    const heroTitle = String(settings?.heroTitle || '').trim();
    const heroSubtitle = String(settings?.heroSubtitle || '').trim();
    const heroImageUrl = validateContactImageSource(settings?.heroImageUrl);
    const heroImageAlt = String(settings?.heroImageAlt || '').trim();
    const breadcrumbLabel = String(settings?.breadcrumbLabel || '').trim();
    const formHeading = String(settings?.formHeading || '').trim();
    const formDescription = String(settings?.formDescription || '').trim();
    const submitButtonLabel = String(settings?.submitButtonLabel || '').trim();
    const successHeading = String(settings?.successHeading || '').trim();
    const successMessage = String(settings?.successMessage || '').trim();
    const responseTimeText = String(settings?.responseTimeText || '').trim();
    const faqHeading = String(settings?.faqHeading || '').trim();
    const faqDescription = String(settings?.faqDescription || '').trim();
    const faqButtonLabel = String(settings?.faqButtonLabel || '').trim();
    const faqButtonUrl = String(settings?.faqButtonUrl || '').trim();

    if (!heroTitle || heroTitle.length < 2 || heroTitle.length > 100) {
      return NextResponse.json({ success: false, message: 'Hero title must be 2–100 characters.' }, { status: 400 });
    }
    if (!formHeading || formHeading.length < 2 || formHeading.length > 100) {
      return NextResponse.json({ success: false, message: 'Form heading must be 2–100 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const savedSettings: ContactPageSettings = {
      pageActive: settings?.pageActive !== false,
      heroTitle,
      heroSubtitle,
      heroImageUrl: heroImageUrl || 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=1920&q=80',
      heroImageAlt: heroImageAlt || 'Contact us background image',
      breadcrumbLabel: breadcrumbLabel || 'Contact',
      formHeading,
      formDescription,
      submitButtonLabel: submitButtonLabel || 'SEND MESSAGE',
      successHeading: successHeading || 'Thank You!',
      successMessage: successMessage || "Your inquiry has been submitted successfully. We'll get back to you shortly.",
      responseTimeText: responseTimeText || 'Typically replies within 24 hours',
      contactDetailsActive: settings?.contactDetailsActive !== false,
      mapSectionActive: settings?.mapSectionActive !== false,
      faqCtaActive: settings?.faqCtaActive !== false,
      faqHeading: faqHeading || 'Have a quick question?',
      faqDescription: faqDescription || 'Check our FAQ — most answers are just a click away.',
      faqButtonLabel: faqButtonLabel || 'VISIT FAQ',
      faqButtonUrl: validateInternalOrExternalUrl(faqButtonUrl) || '/faq',
      updatedAt: now,
    };

    await setDoc(doc(db, SETTINGS_DOC), savedSettings, { merge: true });
    return NextResponse.json({ success: true, data: savedSettings, message: 'Contact page settings updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
