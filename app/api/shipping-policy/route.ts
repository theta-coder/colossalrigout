import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';
import { ShippingPolicyIcon, ShippingPolicySection, defaultShippingSettings } from '../../../lib/shipping-policy';
import { revalidatePath, revalidateTag } from 'next/cache';

const settingsRef = doc(db, 'shipping-policy', 'settings');
const sectionsCollection = 'shipping-policy-sections';
const icons: ShippingPolicyIcon[] = ['truck', 'dollar', 'package', 'globe', 'alert'];

async function readData(all: boolean) {
  const [settingsSnapshot, sectionsSnapshot] = await Promise.all([getDoc(settingsRef), getDocs(collection(db, sectionsCollection))]);
  const settings = settingsSnapshot.exists() ? { ...defaultShippingSettings, ...settingsSnapshot.data() } : defaultShippingSettings;
  const sections = sectionsSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as ShippingPolicySection))
    .filter(item => all || item.active !== false).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  return { settings, sections };
}

export async function GET(request: NextRequest) {
  try {
    const all = new URL(request.url).searchParams.get('all') === 'true';
    if (all) { const admin = await requireAdmin(request); if (admin instanceof NextResponse) return admin; }
    return NextResponse.json({ success: true, data: await readData(all) });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request); if (admin instanceof NextResponse) return admin;
    const body = await request.json();
    const now = new Date().toISOString();
    if (body.settings) {
      const pageTitle = String(body.settings.pageTitle || '').trim();
      const intro = String(body.settings.intro || '').trim();
      const freeShippingThreshold = Number(body.settings.freeShippingThreshold ?? 5000);
      const flatRate = Number(body.settings.flatRate ?? 500);
      const deliveryMinBusinessDays = Math.floor(Number(body.settings.deliveryMinBusinessDays ?? 4));
      const deliveryMaxBusinessDays = Math.floor(Number(body.settings.deliveryMaxBusinessDays ?? 6));
      const productPageNote = String(body.settings.productPageNote || '').trim();
      if (pageTitle.length < 3 || pageTitle.length > 100 || intro.length > 1000) return NextResponse.json({ success: false, message: 'Valid page title and intro are required.' }, { status: 400 });
      if (![freeShippingThreshold, flatRate, deliveryMinBusinessDays, deliveryMaxBusinessDays].every(Number.isFinite) || freeShippingThreshold < 0 || flatRate < 0 || deliveryMinBusinessDays < 1 || deliveryMaxBusinessDays < deliveryMinBusinessDays || productPageNote.length > 500) return NextResponse.json({ success: false, message: 'Enter valid shipping rates, delivery days, and a note under 500 characters.' }, { status: 400 });
      const settings = {
        id: 'settings',
        pageTitle,
        intro,
        freeShippingEnabled: body.settings.freeShippingEnabled !== false,
        freeShippingThreshold,
        flatRateEnabled: body.settings.flatRateEnabled !== false,
        flatRate,
        deliveryMinBusinessDays,
        deliveryMaxBusinessDays,
        productPageEnabled: body.settings.productPageEnabled !== false,
        productPageNote,
        updatedAt: now
      };
      await setDoc(settingsRef, settings, { merge: true });
      revalidatePath('/product/[slug]', 'page');
      revalidatePath('/shipping-policy');
      revalidateTag('product-policy-summary');
      revalidateTag('shipping-policy');
      return NextResponse.json({ success: true, data: settings, message: 'Shipping page settings saved.' });
    }
    const section = body.section;
    const title = String(section?.title || '').trim();
    const description = String(section?.description || '').trim();
    if (title.length < 2 || title.length > 100 || description.length < 2 || description.length > 3000) return NextResponse.json({ success: false, message: 'Section title and description are required.' }, { status: 400 });
    if (!icons.includes(section.icon)) return NextResponse.json({ success: false, message: 'Invalid section icon.' }, { status: 400 });
    const existing = await getDocs(collection(db, sectionsCollection));
    const id = `shipping-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: ShippingPolicySection = { id, title, description, icon: section.icon, order: existing.size + 1, active: section.active !== false, createdAt: now, updatedAt: now };
    await setDoc(doc(db, sectionsCollection, id), record);
    return NextResponse.json({ success: true, data: record, message: 'Shipping section created.' });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request); if (admin instanceof NextResponse) return admin;
    const { section } = await request.json();
    const ref = doc(db, sectionsCollection, String(section?.id || ''));
    const current = await getDoc(ref);
    if (!current.exists()) return NextResponse.json({ success: false, message: 'Shipping section not found.' }, { status: 404 });
    const title = String(section.title || '').trim(); const description = String(section.description || '').trim();
    if (title.length < 2 || title.length > 100 || description.length < 2 || description.length > 3000 || !icons.includes(section.icon)) return NextResponse.json({ success: false, message: 'Valid title, description and icon are required.' }, { status: 400 });
    const record = { ...current.data(), id: current.id, title, description, icon: section.icon, order: Math.max(1, Number(section.order || current.data().order || 1)), active: section.active !== false, updatedAt: new Date().toISOString() };
    await setDoc(ref, record);
    return NextResponse.json({ success: true, data: record, message: 'Shipping section updated.' });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request); if (admin instanceof NextResponse) return admin;
    const { orderedIds } = await request.json();
    const snapshot = await getDocs(collection(db, sectionsCollection)); const ids = new Set(snapshot.docs.map(item => item.id));
    if (!Array.isArray(orderedIds) || orderedIds.length !== ids.size || orderedIds.some((id: string) => !ids.has(id))) return NextResponse.json({ success: false, message: 'Section list changed. Refresh and try again.' }, { status: 409 });
    const batch = writeBatch(db); const now = new Date().toISOString();
    orderedIds.forEach((id: string, index: number) => batch.update(doc(db, sectionsCollection, id), { order: index + 1, updatedAt: now }));
    await batch.commit(); return NextResponse.json({ success: true, message: 'Shipping section order updated.' });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request); if (admin instanceof NextResponse) return admin;
    const id = new URL(request.url).searchParams.get('id'); if (!id) return NextResponse.json({ success: false, message: 'Section ID is required.' }, { status: 400 });
    await deleteDoc(doc(db, sectionsCollection, id)); return NextResponse.json({ success: true, message: 'Shipping section deleted.' });
  } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); }
}
