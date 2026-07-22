import { NextRequest, NextResponse } from 'next/server';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { ContactInquiry, InquiryPriority, InquiryStatus } from '@/lib/contact-page';

const COLLECTION = 'contact-inquiries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) {
      return NextResponse.json({ success: false, message: 'Inquiry not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: snap.id, ...snap.data() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) {
      return NextResponse.json({ success: false, message: 'Inquiry not found.' }, { status: 404 });
    }

    const existing = snap.data() as ContactInquiry;
    const body = await request.json();

    const now = new Date().toISOString();
    const status = body.status ? (String(body.status) as InquiryStatus) : existing.status;
    const priority = body.priority ? (String(body.priority) as InquiryPriority) : existing.priority;
    const assignedTo = body.assignedTo !== undefined ? body.assignedTo : existing.assignedTo;
    const adminNotes = body.adminNotes !== undefined ? String(body.adminNotes) : existing.adminNotes;

    let resolvedAt = existing.resolvedAt || null;
    if (status === 'resolved' && existing.status !== 'resolved') {
      resolvedAt = now;
    } else if (status !== 'resolved') {
      resolvedAt = null;
    }

    const updated = {
      ...existing,
      status,
      priority,
      assignedTo,
      adminNotes,
      resolvedAt,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), updated, { merge: true });
    return NextResponse.json({ success: true, data: updated, message: 'Inquiry updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Inquiry deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
