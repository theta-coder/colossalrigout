import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ContactInquiry, generateInquiryRef, ContactSubject } from '@/lib/contact-page';
import { sendContactNotifications } from '@/lib/server/contact-email';
import { contactInquiryInputSchema } from '@/lib/validations/api-schemas';

const INQUIRIES_COL = 'contact-inquiries';
const SUBJECTS_COL = 'contact-subjects';

// ─── IN-MEMORY RATE LIMITING ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Zod Schema Input Validation
    const validationResult = contactInquiryInputSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Invalid contact inquiry payload.';
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const { name, email, phone, orderId, subjectId, subject, subjectLabel, message, honeypot, website } = validationResult.data;

    // 2. Bot Honeypot Check (hidden field)
    const checkHoneypot = String(website || honeypot || '').trim();
    if (checkHoneypot.length > 0) {
      // Return synthetic success without writing to DB
      return NextResponse.json({
        success: true,
        inquiryRef: generateInquiryRef(),
        message: 'Thank you for your message! We will get back to you shortly.',
      });
    }

    // 3. IP Rate Limit Check
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-client';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { success: false, message: 'Too many contact requests from your IP. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const customSubject = String(subject || subjectLabel || '').trim();

    // Resolve subject label
    let resolvedSubjectLabel = customSubject || 'General Inquiry';
    let recipientEmail = '';
    if (subjectId) {
      const subjectSnap = await getDoc(doc(db, SUBJECTS_COL, subjectId));
      if (!subjectSnap.exists() || subjectSnap.data().active === false) {
        return NextResponse.json({ success: false, message: 'Please select an active inquiry subject.' }, { status: 400 });
      }
      const subData = subjectSnap.data() as ContactSubject;
      resolvedSubjectLabel = subData.name || resolvedSubjectLabel;
      recipientEmail = subData.recipientEmail || '';
    }

    // 4. Generate Inquiry Reference & Build Document
    const inquiryRef = generateInquiryRef();
    const now = new Date().toISOString();
    const inquiryId = `inq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const inquiry: ContactInquiry = {
      id: inquiryId,
      inquiryRef,
      name,
      email,
      ...(phone ? { phone } : {}),
      ...(orderId ? { orderId } : {}),
      subjectId: subjectId || 'general',
      subjectLabel: resolvedSubjectLabel,
      message,
      status: 'new',
      priority: 'normal',
      source: 'contact_page',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, INQUIRIES_COL, inquiryId), inquiry);

    const notificationStatus = await sendContactNotifications({
      inquiryRef,
      name,
      email,
      subject: resolvedSubjectLabel,
      message,
      adminRecipient: recipientEmail,
    });
    await setDoc(doc(db, INQUIRIES_COL, inquiryId), { notificationStatus, notificationAttemptedAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({
      success: true,
      data: { inquiryRef, inquiryId },
      message: `Your inquiry (${inquiryRef}) has been submitted successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
