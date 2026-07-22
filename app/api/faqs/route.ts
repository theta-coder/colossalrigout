import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';
import { FaqItem } from '../../../lib/faq';

const COLLECTION = 'faqs';

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === 'true';
    const categoryId = url.searchParams.get('categoryId');

    if (all) {
      const admin = await requireAdmin(request);
      if (admin instanceof NextResponse) return admin;
    }

    // Load FAQs
    const faqSnapshot = await getDocs(collection(db, COLLECTION));
    let faqs: FaqItem[] = faqSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FaqItem);

    // Public: only active FAQs in active categories
    if (!all) {
      const catSnapshot = await getDocs(collection(db, 'faq-categories'));
      const activeCatIds = new Set(
        catSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c: any) => c.active !== false)
          .map((c) => c.id)
      );
      faqs = faqs.filter((f) => f.active !== false && activeCatIds.has(f.categoryId));
    }

    // Category filter
    if (categoryId) {
      faqs = faqs.filter((f) => f.categoryId === categoryId);
    }

    // Sort by order then createdAt
    faqs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));

    return NextResponse.json({ success: true, data: faqs });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { faq } = await request.json();
    const categoryId = String(faq?.categoryId || '').trim();
    const question = String(faq?.question || '').trim();
    const answer = String(faq?.answer || '').trim();

    if (!categoryId) return NextResponse.json({ success: false, message: 'Category is required.' }, { status: 400 });
    if (!question || question.length < 2 || question.length > 200) {
      return NextResponse.json({ success: false, message: 'Question must be 2–200 characters.' }, { status: 400 });
    }
    if (!answer || answer.length < 2 || answer.length > 5000) {
      return NextResponse.json({ success: false, message: 'Answer must be 2–5000 characters.' }, { status: 400 });
    }
    if (faq?.order !== undefined && (!Number.isInteger(Number(faq.order)) || Number(faq.order) < 0)) {
      return NextResponse.json({ success: false, message: 'Display order must be a non-negative whole number.' }, { status: 400 });
    }

    // Verify category exists
    const catSnapshot = await getDocs(collection(db, 'faq-categories'));
    const selectedCategory = catSnapshot.docs.find((d) => d.id === categoryId);
    if (!selectedCategory) {
      return NextResponse.json({ success: false, message: 'Selected category does not exist.' }, { status: 400 });
    }
    if (selectedCategory.data().active === false) {
      return NextResponse.json({ success: false, message: 'New FAQs can only be assigned to an active category.' }, { status: 400 });
    }

    // Determine next order within category
    const faqSnapshot = await getDocs(collection(db, COLLECTION));
    const inCategory = faqSnapshot.docs
      .map((d) => d.data())
      .filter((f) => f.categoryId === categoryId);
    const maxOrder = inCategory.reduce((max, f) => Math.max(max, Number(f.order || 0)), 0);

    const now = new Date().toISOString();
    const id = `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const saved: FaqItem = {
      id,
      categoryId,
      question: question.slice(0, 200),
      answer: answer.slice(0, 5000),
      order: faq?.order !== undefined ? Number(faq.order) : maxOrder + 1,
      active: faq?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'FAQ created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT ────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { faq } = await request.json();
    const id = String(faq?.id || '').trim();
    if (!id) return NextResponse.json({ success: false, message: 'FAQ ID is required.' }, { status: 400 });

    const allFaqs = await getDocs(collection(db, COLLECTION));
    const current = allFaqs.docs.find((d) => d.id === id)?.data();
    if (!current) return NextResponse.json({ success: false, message: 'FAQ not found.' }, { status: 404 });

    const categoryId = String(faq?.categoryId || '').trim();
    const question = String(faq?.question || '').trim();
    const answer = String(faq?.answer || '').trim();

    if (!categoryId) return NextResponse.json({ success: false, message: 'Category is required.' }, { status: 400 });
    if (!question || question.length < 2 || question.length > 200) {
      return NextResponse.json({ success: false, message: 'Question must be 2–200 characters.' }, { status: 400 });
    }
    if (!answer || answer.length < 2 || answer.length > 5000) {
      return NextResponse.json({ success: false, message: 'Answer must be 2–5000 characters.' }, { status: 400 });
    }
    if (faq?.order !== undefined && (!Number.isInteger(Number(faq.order)) || Number(faq.order) < 0)) {
      return NextResponse.json({ success: false, message: 'Display order must be a non-negative whole number.' }, { status: 400 });
    }

    // Verify category exists
    const catSnapshot = await getDocs(collection(db, 'faq-categories'));
    if (!catSnapshot.docs.some((d) => d.id === categoryId)) {
      return NextResponse.json({ success: false, message: 'Selected category does not exist.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const saved: FaqItem = {
      id,
      categoryId,
      question: question.slice(0, 200),
      answer: answer.slice(0, 5000),
      order: Number(faq?.order ?? current.order ?? 0),
      active: faq?.active !== undefined ? Boolean(faq.active) : true,
      createdAt: (current?.createdAt as string) || now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'FAQ updated.' });
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
    if (!id) return NextResponse.json({ success: false, message: 'FAQ ID is required.' }, { status: 400 });

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'FAQ deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
