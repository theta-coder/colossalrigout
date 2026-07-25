import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';

export interface AdminNotificationItem {
  id: string;
  type: 'order' | 'inquiry';
  title: string;
  subtitle: string;
  customerName: string;
  customerEmail: string;
  timestamp: string;
  status: string;
  targetTab: 'orders' | 'contact-inquiries';
  rawId: string;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    // 1. Fetch Orders
    const ordersSnap = await getDocs(collection(db, 'orders'));
    const orderItems: AdminNotificationItem[] = [];
    ordersSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const rawId = docSnap.id;
      const orderRef = d.publicTrackingId || d.orderRef || rawId;
      const totalStr = d.subtotal || d.total || d.totalAmount ? `PKR ${(d.subtotal || d.total || d.totalAmount || 0).toLocaleString()}` : '';
      const name = d.customerName || d.customer?.name || 'Customer';
      const email = d.customerEmail || d.customer?.email || '';

      orderItems.push({
        id: `ord-${rawId}`,
        rawId,
        type: 'order',
        title: `New Order #${orderRef}`,
        subtitle: `${name}${totalStr ? ` • ${totalStr}` : ''}`,
        customerName: name,
        customerEmail: email,
        timestamp: d.createdAt || d.orderDate || new Date().toISOString(),
        status: d.status || d.currentStatus || 'Placed',
        targetTab: 'orders',
      });
    });

    // 2. Fetch Contact Inquiries
    const inquiriesSnap = await getDocs(collection(db, 'contact-inquiries'));
    const inquiryItems: AdminNotificationItem[] = [];
    inquiriesSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const rawId = docSnap.id;
      const inqRef = d.inquiryRef || rawId;
      const name = d.name || 'Customer';
      const email = d.email || '';
      const subject = d.subjectLabel || d.subject || 'General Query';

      inquiryItems.push({
        id: `inq-${rawId}`,
        rawId,
        type: 'inquiry',
        title: `New Inquiry ${inqRef}`,
        subtitle: `${name} — ${subject}`,
        customerName: name,
        customerEmail: email,
        timestamp: d.createdAt || new Date().toISOString(),
        status: d.status || 'new',
        targetTab: 'contact-inquiries',
      });
    });

    // Combine & Sort by newest first
    const combined = [...orderItems, ...inquiryItems].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: combined.slice(0, 40),
        counts: {
          total: combined.length,
          orders: orderItems.length,
          inquiries: inquiryItems.length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
