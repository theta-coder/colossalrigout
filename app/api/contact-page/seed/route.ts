import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import {
  defaultContactSettings,
  defaultContactMapSettings,
  ContactDetail,
  ContactSubject,
} from '@/lib/contact-page';

const SETTINGS_DOC = 'contact-page/settings';
const MAP_DOC = 'contact-map/settings';
const DETAILS_COL = 'contact-details';
const SUBJECTS_COL = 'contact-subjects';

const initialDetails: Array<Omit<ContactDetail, 'id' | 'order'>> = [
  {
    type: 'address',
    label: 'Address',
    value: '12-C, Gulberg III, Lahore, Punjab, Pakistan',
    icon: 'map-pin',
    active: true,
  },
  {
    type: 'phone',
    label: 'Phone',
    value: '+92 300 1234567',
    href: 'tel:+923001234567',
    icon: 'phone',
    active: true,
  },
  {
    type: 'email',
    label: 'Email',
    value: 'support@colossalrigout.pk',
    href: 'mailto:support@colossalrigout.pk',
    icon: 'mail',
    active: true,
  },
  {
    type: 'hours',
    label: 'Hours',
    value: 'Mon–Sat, 10:00 AM – 8:00 PM',
    icon: 'clock',
    active: true,
  },
];

const initialSubjects = [
  'Order Help',
  'Product Question',
  'Returns & Exchange',
  'Payment Issue',
  'Store Information',
  'General Inquiry',
];

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const detailsSnap = await getDocs(collection(db, DETAILS_COL));
    const subjectsSnap = await getDocs(collection(db, SUBJECTS_COL));

    const totalExisting = detailsSnap.size + subjectsSnap.size;
    if (totalExisting > 0) {
      return NextResponse.json({
        success: false,
        message: `Seed blocked: Database already contains ${detailsSnap.size} details and ${subjectsSnap.size} subjects.`,
      }, { status: 409 });
    }

    const now = new Date().toISOString();

    // 1. Seed Settings & Map
    await setDoc(doc(db, SETTINGS_DOC), { ...defaultContactSettings, updatedAt: now }, { merge: true });
    await setDoc(doc(db, MAP_DOC), { ...defaultContactMapSettings, updatedAt: now }, { merge: true });

    // 2. Seed Contact Details
    for (let i = 0; i < initialDetails.length; i++) {
      const id = `detail-${i + 1}`;
      const data = initialDetails[i];
      const docData: ContactDetail = {
        id,
        ...data,
        order: i + 1,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, DETAILS_COL, id), docData);
    }

    // 3. Seed Contact Subjects
    for (let i = 0; i < initialSubjects.length; i++) {
      const name = initialSubjects[i];
      const id = `subj-${i + 1}`;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const docData: ContactSubject = {
        id,
        name,
        slug,
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, SUBJECTS_COL, id), docData);
    }

    return NextResponse.json({
      success: true,
      message: `Default contact page content seeded! Created page settings, map settings, 4 contact details, and 6 inquiry subjects.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
