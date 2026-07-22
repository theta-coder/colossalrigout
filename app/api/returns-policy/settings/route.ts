import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { ReturnsPolicySettings } from '../../../../lib/returns-policy';
import { revalidatePath, revalidateTag } from 'next/cache';

const SETTINGS_DOC = 'returns-policy/settings';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { settings } = await request.json();
    const pageTitle = String(settings?.pageTitle || '').trim();
    const breadcrumbLabel = String(settings?.breadcrumbLabel || '').trim();
    const windowTitle = String(settings?.windowTitle || '').trim();
    const windowDescription = String(settings?.windowDescription || '').trim();
    const conditionsHeading = String(settings?.conditionsHeading || '').trim();
    const stepsHeading = String(settings?.stepsHeading || '').trim();
    const parsedReturnWindowDays = Math.floor(Number(settings?.returnWindowDays ?? 30));
    const returnWindowDays = Number.isFinite(parsedReturnWindowDays) ? Math.max(1, Math.min(365, parsedReturnWindowDays)) : 30;
    const productPageSummary = String(settings?.productPageSummary || '').trim();

    if (!pageTitle || pageTitle.length < 3 || pageTitle.length > 100) {
      return NextResponse.json({ success: false, message: 'Page title must be 3–100 characters.' }, { status: 400 });
    }
    if (!breadcrumbLabel || breadcrumbLabel.length < 2 || breadcrumbLabel.length > 60) {
      return NextResponse.json({ success: false, message: 'Breadcrumb label must be 2–60 characters.' }, { status: 400 });
    }
    if (!windowTitle || windowTitle.length < 2 || windowTitle.length > 100) {
      return NextResponse.json({ success: false, message: 'Window title must be 2–100 characters.' }, { status: 400 });
    }
    if (!windowDescription || windowDescription.length < 2 || windowDescription.length > 1000) {
      return NextResponse.json({ success: false, message: 'Window description must be 2–1,000 characters.' }, { status: 400 });
    }
    if (!conditionsHeading || conditionsHeading.length < 2 || conditionsHeading.length > 100) {
      return NextResponse.json({ success: false, message: 'Conditions heading must be 2–100 characters.' }, { status: 400 });
    }
    if (!stepsHeading || stepsHeading.length < 2 || stepsHeading.length > 100) {
      return NextResponse.json({ success: false, message: 'Steps heading must be 2–100 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const savedSettings: ReturnsPolicySettings = {
      pageTitle,
      breadcrumbLabel,
      windowTitle,
      windowDescription,
      conditionsHeading,
      stepsHeading,
      returnWindowDays,
      productPageEnabled: settings?.productPageEnabled !== false,
      productPageSummary: productPageSummary.slice(0, 500),
      active: settings?.active !== false,
      updatedAt: now,
    };

    await setDoc(doc(db, SETTINGS_DOC), savedSettings, { merge: true });
    revalidatePath('/product/[slug]', 'page');
    revalidatePath('/returns');
    revalidateTag('product-policy-summary');
    revalidateTag('returns-policy');
    return NextResponse.json({ success: true, data: savedSettings, message: 'Page settings updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
