import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { FaqCategory, FaqItem } from '../../../../lib/faq';

const CATEGORIES_COLLECTION = 'faq-categories';
const FAQS_COLLECTION = 'faqs';

const seedCategories: Omit<FaqCategory, 'createdAt' | 'updatedAt'>[] = [
  { id: 'orders', name: 'Orders', slug: 'orders', order: 1, active: true },
  { id: 'shipping', name: 'Shipping', slug: 'shipping', order: 2, active: true },
  { id: 'returns', name: 'Returns', slug: 'returns', order: 3, active: true },
  { id: 'payments', name: 'Payments', slug: 'payments', order: 4, active: true },
  { id: 'sizing', name: 'Sizing', slug: 'sizing', order: 5, active: true },
];

const seedFaqs: Omit<FaqItem, 'createdAt' | 'updatedAt'>[] = [
  { id: 'faq-orders-1', categoryId: 'orders', question: 'How do I place an order?', answer: 'Browse the shop, select your size and color, add to cart, and complete checkout with your shipping and payment details.', order: 1, active: true },
  { id: 'faq-orders-2', categoryId: 'orders', question: 'Can I cancel or change my order?', answer: 'Orders can be changed or cancelled prior to courier dispatch. Contact us immediately at 03284844309 or colossalrigout@gmail.com.', order: 2, active: true },
  { id: 'faq-shipping-1', categoryId: 'shipping', question: 'How long does delivery take?', answer: 'Orders are shipped through TCS and are generally delivered within 3–7 business days across Pakistan.', order: 1, active: true },
  { id: 'faq-shipping-2', categoryId: 'shipping', question: 'Do you offer free shipping?', answer: 'Standard shipping is Rs. 250 across Pakistan. We offer free nationwide shipping on all orders of Rs. 2,500 or more.', order: 2, active: true },
  { id: 'faq-shipping-3', categoryId: 'shipping', question: 'Do you ship internationally?', answer: 'Currently we ship nationwide across Pakistan only via TCS.', order: 3, active: true },
  { id: 'faq-returns-1', categoryId: 'returns', question: 'What is your return policy?', answer: 'We offer a 2-day return window on unworn items with original tags attached. See our Returns & Exchanges page for full details.', order: 1, active: true },
  { id: 'faq-returns-2', categoryId: 'returns', question: 'How do I start a return?', answer: "Contact our customer support team via our Contact page or call 03284844309 within 2 days of delivery.", order: 2, active: true },
  { id: 'faq-payments-1', categoryId: 'payments', question: 'What payment methods do you accept?', answer: 'We accept Cash on Delivery across Pakistan.', order: 1, active: true },
  { id: 'faq-payments-2', categoryId: 'payments', question: 'Is Cash on Delivery available?', answer: 'Yes, COD is available on all orders within Pakistan at no extra charge.', order: 2, active: true },
  { id: 'faq-sizing-1', categoryId: 'sizing', question: 'How do I find my size?', answer: 'Check the Size Guide linked on every product page for a full chest, waist, and length chart with measuring tips.', order: 1, active: true },
  { id: 'faq-sizing-2', categoryId: 'sizing', question: "What if the size doesn't fit?", answer: 'No problem — exchange it for a different size within 2 days of delivery.', order: 2, active: true },
];

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    // Check if data already exists
    const existingCats = await getDocs(collection(db, CATEGORIES_COLLECTION));
    const existingFaqs = await getDocs(collection(db, FAQS_COLLECTION));

    if (!existingCats.empty || !existingFaqs.empty) {
      return NextResponse.json({
        success: false,
        message: `Seed blocked: ${existingCats.size} categories and ${existingFaqs.size} FAQs already exist. Clear collections first if you want to re-seed.`,
      }, { status: 409 });
    }

    const now = new Date().toISOString();

    // Seed categories
    await Promise.all(
      seedCategories.map((cat) =>
        setDoc(doc(db, CATEGORIES_COLLECTION, cat.id), { ...cat, createdAt: now, updatedAt: now })
      )
    );

    // Seed FAQs
    await Promise.all(
      seedFaqs.map((faq) =>
        setDoc(doc(db, FAQS_COLLECTION, faq.id), { ...faq, createdAt: now, updatedAt: now })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Seeded ${seedCategories.length} categories and ${seedFaqs.length} FAQs.`,
      data: { categories: seedCategories.length, faqs: seedFaqs.length },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
