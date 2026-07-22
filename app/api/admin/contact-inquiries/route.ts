import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { ContactInquiry, InquiryStatus } from '@/lib/contact-page';

const COLLECTION = 'contact-inquiries';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const statusFilter = (url.searchParams.get('status') || 'all').trim().toLowerCase();
    const subjectFilter = (url.searchParams.get('subjectId') || 'all').trim();

    const snapshot = await getDocs(collection(db, COLLECTION));
    const allInquiries = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as ContactInquiry)
      .sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

    // Count summary
    const counts: Record<InquiryStatus | 'all', number> = {
      all: allInquiries.length,
      new: 0,
      in_progress: 0,
      resolved: 0,
      archived: 0,
      spam: 0,
    };

    allInquiries.forEach((inq) => {
      if (inq.status && counts[inq.status] !== undefined) {
        counts[inq.status] += 1;
      }
    });

    // Apply filtering
    let filtered = allInquiries;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((inq) => inq.status === statusFilter);
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter((inq) => inq.subjectId === subjectFilter);
    }

    if (search) {
      filtered = filtered.filter((inq) =>
        (inq.inquiryRef || '').toLowerCase().includes(search) ||
        (inq.name || '').toLowerCase().includes(search) ||
        (inq.email || '').toLowerCase().includes(search) ||
        (inq.orderId || '').toLowerCase().includes(search) ||
        (inq.subjectLabel || '').toLowerCase().includes(search) ||
        (inq.message || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        inquiries: filtered,
        counts,
        total: filtered.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
