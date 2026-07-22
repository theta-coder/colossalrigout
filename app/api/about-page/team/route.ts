import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { AboutTeamMember, validateAboutImageSource } from '../../../../lib/about-page';

const COLLECTION = 'about-team-members';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const member = body.member || body;
    const name = String(member?.name || '').trim();
    const role = String(member?.role || '').trim();
    const image = validateAboutImageSource(member?.image);
    const imageAlt = String(member?.imageAlt || '').trim();
    const bio = String(member?.bio || '').trim();

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json({ success: false, message: 'Member name must be 2–100 characters.' }, { status: 400 });
    }
    if (!role || role.length < 2 || role.length > 120) {
      return NextResponse.json({ success: false, message: 'Member role must be 2–120 characters.' }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ success: false, message: 'Team member image is required.' }, { status: 400 });
    }
    if (!imageAlt || imageAlt.length < 2 || imageAlt.length > 160) {
      return NextResponse.json({ success: false, message: 'Image alt text must be 2–160 characters.' }, { status: 400 });
    }
    if (bio.length > 1500) {
      return NextResponse.json({ success: false, message: 'Bio must be under 1,500 characters.' }, { status: 400 });
    }

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = member?.id || `member-${Date.now()}`;

    const saved: AboutTeamMember = {
      id,
      name,
      role,
      bio,
      image,
      imageAlt,
      order: typeof member?.order === 'number' ? Math.max(0, member.order) : maxOrder + 1,
      active: member?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Team member created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const member = body.member || body;
    const id = String(member?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Team member ID is required.' }, { status: 400 });
    }

    const name = String(member?.name || '').trim();
    const role = String(member?.role || '').trim();
    const image = validateAboutImageSource(member?.image);
    const imageAlt = String(member?.imageAlt || '').trim();
    const bio = String(member?.bio || '').trim();

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json({ success: false, message: 'Member name must be 2–100 characters.' }, { status: 400 });
    }
    if (!role || role.length < 2 || role.length > 120) {
      return NextResponse.json({ success: false, message: 'Member role must be 2–120 characters.' }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ success: false, message: 'Team member image is required.' }, { status: 400 });
    }
    if (!imageAlt || imageAlt.length < 2 || imageAlt.length > 160) {
      return NextResponse.json({ success: false, message: 'Image alt text must be 2–160 characters.' }, { status: 400 });
    }
    if (bio.length > 1500) {
      return NextResponse.json({ success: false, message: 'Bio must be under 1,500 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: AboutTeamMember = {
      id,
      name,
      role,
      bio,
      image,
      imageAlt,
      order: Math.max(0, Number(member?.order || 0)),
      active: member?.active !== undefined ? Boolean(member.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Team member updated.' });
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
      return NextResponse.json({ success: false, message: 'Team member ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Team member deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
