import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  DEFAULT_ANNOUNCEMENT_SETTINGS,
  DEFAULT_NEWSLETTER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
} from '@/lib/storefront-settings';

const COLLECTION_NAME = 'storefront-settings';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const url = new URL(request.url);
    const reset = url.searchParams.get('reset') === 'true';

    const updatedBy = admin.email || admin.uid || 'admin-seed';
    const updatedAt = new Date().toISOString();

    const sections = [
      { id: 'announcement', defaultData: DEFAULT_ANNOUNCEMENT_SETTINGS },
      { id: 'newsletter', defaultData: DEFAULT_NEWSLETTER_SETTINGS },
      { id: 'footer', defaultData: DEFAULT_FOOTER_SETTINGS },
    ];

    const results: Record<string, 'created' | 'reset' | 'skipped'> = {};
    let hasChanges = false;

    for (const sec of sections) {
      const docRef = doc(db, COLLECTION_NAME, sec.id);
      const snap = await getDoc(docRef);

      if (!snap.exists() || reset) {
        const payload = {
          ...sec.defaultData,
          updatedAt,
          updatedBy,
        };
        await setDoc(docRef, payload);
        results[sec.id] = snap.exists() ? 'reset' : 'created';
        hasChanges = true;
      } else {
        results[sec.id] = 'skipped';
      }
    }

    if (hasChanges) {
      try {
        revalidatePath('/', 'layout');
        revalidatePath('/');
        revalidateTag('storefront-settings');
      } catch (err) {
        console.warn('[storefront-settings-seed] Cache revalidation warning:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: reset
        ? 'Storefront settings reset to default values successfully.'
        : 'Storefront settings seeded successfully.',
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to seed storefront settings.' },
      { status: 500 }
    );
  }
}
