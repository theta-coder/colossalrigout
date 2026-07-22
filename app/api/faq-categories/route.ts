import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';
import { FaqCategory } from '../../../lib/faq';

const COLLECTION = 'faq-categories';

const toSlug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const all = new URL(request.url).searchParams.get('all') === 'true';
    if (all) {
      const admin = await requireAdmin(request);
      if (admin instanceof NextResponse) return admin;
    }
    const snapshot = await getDocs(collection(db, COLLECTION));
    const data: FaqCategory[] = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as FaqCategory)
      .filter((c) => all || c.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { category } = await request.json();
    const name = String(category?.name || '').trim();
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ success: false, message: 'Category name must be 2–60 characters.' }, { status: 400 });
    }

    const slug = toSlug(name);
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Cannot generate a valid slug from this name.' }, { status: 400 });
    }

    // Duplicate check
    const snapshot = await getDocs(collection(db, COLLECTION));
    const existing = snapshot.docs.map((d) => d.data() as FaqCategory);
    if (existing.some((c) => toSlug(c.name || '') === slug || c.slug === slug)) {
      return NextResponse.json({ success: false, message: `Category "${name}" already exists.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const maxOrder = existing.reduce((max, c) => Math.max(max, Number(c.order || 0)), 0);
    const id = slug;
    if (category?.order !== undefined && (!Number.isInteger(Number(category.order)) || Number(category.order) < 0)) {
      return NextResponse.json({ success: false, message: 'Display order must be a non-negative whole number.' }, { status: 400 });
    }

    const saved: FaqCategory = {
      id,
      name,
      slug,
      order: category?.order !== undefined ? Number(category.order) : maxOrder + 1,
      active: category?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: `Category "${name}" created.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT ────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { category } = await request.json();
    const id = String(category?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Category ID is required.' }, { status: 400 });
    }

    const name = String(category?.name || '').trim();
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ success: false, message: 'Category name must be 2–60 characters.' }, { status: 400 });
    }

    // Duplicate name check (exclude self)
    const snapshot = await getDocs(collection(db, COLLECTION));
    const existing = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FaqCategory);
    const nameSlug = toSlug(name);
    if (existing.some((c) => c.id !== id && (toSlug(c.name || '') === nameSlug || c.slug === nameSlug))) {
      return NextResponse.json({ success: false, message: `Another category with name "${name}" already exists.` }, { status: 409 });
    }

    const current = existing.find((c) => c.id === id);
    if (!current) {
      return NextResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    }
    const now = new Date().toISOString();
    if (category?.order !== undefined && (!Number.isInteger(Number(category.order)) || Number(category.order) < 0)) {
      return NextResponse.json({ success: false, message: 'Display order must be a non-negative whole number.' }, { status: 400 });
    }

    const saved: FaqCategory = {
      id,
      name,
      slug: current?.slug || nameSlug, // preserve original slug
      order: Number(category?.order ?? current.order ?? 0),
      active: category?.active !== undefined ? Boolean(category.active) : true,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: `Category "${name}" updated.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Category ID is required.' }, { status: 400 });
    }

    // Check for assigned FAQs
    const faqSnapshot = await getDocs(collection(db, 'faqs'));
    const assignedCount = faqSnapshot.docs.filter((d) => d.data().categoryId === id).length;
    if (assignedCount > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete: ${assignedCount} FAQ(s) are assigned to this category. Move or delete them first.` },
        { status: 409 }
      );
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Category deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
