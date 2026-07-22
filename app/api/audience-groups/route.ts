import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { AudienceGroup } from '../../../lib/audience-group';

const collectionName = 'audience-groups';
const defaults = ['Men', 'Boys', 'Kids'];
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function readGroups(seed = true) {
  let snapshot = await getDocs(collection(db, collectionName));
  if (snapshot.empty && seed) {
    const now = new Date().toISOString();
    await Promise.all(defaults.map((name, index) => setDoc(doc(db, collectionName, slugify(name)), {
      id: slugify(name), name, slug: slugify(name), order: index + 1, active: true, createdAt: now, updatedAt: now
    })));
    snapshot = await getDocs(collection(db, collectionName));
  }
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AudienceGroup))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function GET(request: NextRequest) {
  try {
    const all = new URL(request.url).searchParams.get('all') === 'true';
    const groups = await readGroups();
    return NextResponse.json({ success: true, data: all ? groups : groups.filter(group => group.active) });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = (await request.json()).group;
    const name = String(incoming?.name || '').trim();
    const slug = slugify(name);
    if (!name || !slug) return NextResponse.json({ success: false, message: 'Group name is required.' }, { status: 400 });
    const groups = await readGroups(false);
    if (groups.some(group => group.slug === slug && group.id !== incoming?.id)) {
      return NextResponse.json({ success: false, message: `"${name}" already exists.` }, { status: 400 });
    }
    const id = incoming?.id || slug;
    const previous = groups.find(group => group.id === id);
    const now = new Date().toISOString();
    const group: AudienceGroup = {
      id, name, slug, order: Number(incoming?.order ?? previous?.order ?? groups.length + 1),
      active: incoming?.active ?? previous?.active ?? true, createdAt: previous?.createdAt || now, updatedAt: now
    };
    await setDoc(doc(db, collectionName, id), group);
    return NextResponse.json({ success: true, data: group });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'Group ID is required.' }, { status: 400 });
    await deleteDoc(doc(db, collectionName, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
