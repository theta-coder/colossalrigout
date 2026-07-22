import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { AboutValue, allowedValueIcons } from '../../../../lib/about-page';

const COLLECTION = 'about-values';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const value = body.value || body;
    const title = String(value?.title || '').trim();
    const description = String(value?.description || '').trim();
    const icon = String(value?.icon || '').trim().toLowerCase();

    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ success: false, message: 'Value title must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 500) {
      return NextResponse.json({ success: false, message: 'Value description must be 2–500 characters.' }, { status: 400 });
    }
    if (!allowedValueIcons.includes(icon as any)) {
      return NextResponse.json({ success: false, message: `Icon must be one of: ${allowedValueIcons.join(', ')}.` }, { status: 400 });
    }

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = value?.id || `value-${Date.now()}`;

    const saved: AboutValue = {
      id,
      title,
      description,
      icon,
      order: typeof value?.order === 'number' ? Math.max(0, value.order) : maxOrder + 1,
      active: value?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Brand value created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const value = body.value || body;
    const id = String(value?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Value ID is required.' }, { status: 400 });
    }

    const title = String(value?.title || '').trim();
    const description = String(value?.description || '').trim();
    const icon = String(value?.icon || '').trim().toLowerCase();

    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ success: false, message: 'Value title must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 500) {
      return NextResponse.json({ success: false, message: 'Value description must be 2–500 characters.' }, { status: 400 });
    }
    if (!allowedValueIcons.includes(icon as any)) {
      return NextResponse.json({ success: false, message: `Icon must be one of: ${allowedValueIcons.join(', ')}.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: AboutValue = {
      id,
      title,
      description,
      icon,
      order: Math.max(0, Number(value?.order || 0)),
      active: value?.active !== undefined ? Boolean(value.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Brand value updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Value ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Brand value deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
