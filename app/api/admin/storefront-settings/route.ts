import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  DEFAULT_ANNOUNCEMENT_SETTINGS,
  DEFAULT_NEWSLETTER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  normalizeAnnouncementSettings,
  normalizeNewsletterSettings,
  normalizeFooterSettings,
  validateAnnouncementInput,
  validateNewsletterInput,
  validateFooterInput,
} from '@/lib/storefront-settings';

const COLLECTION_NAME = 'storefront-settings';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const [annSnap, newsSnap, footSnap] = await Promise.all([
      getDoc(doc(db, COLLECTION_NAME, 'announcement')),
      getDoc(doc(db, COLLECTION_NAME, 'newsletter')),
      getDoc(doc(db, COLLECTION_NAME, 'footer')),
    ]);

    const announcement = normalizeAnnouncementSettings(
      annSnap.exists() ? annSnap.data() : DEFAULT_ANNOUNCEMENT_SETTINGS
    );
    const newsletter = normalizeNewsletterSettings(
      newsSnap.exists() ? newsSnap.data() : DEFAULT_NEWSLETTER_SETTINGS
    );
    const footer = normalizeFooterSettings(
      footSnap.exists() ? footSnap.data() : DEFAULT_FOOTER_SETTINGS
    );

    return NextResponse.json({
      success: true,
      data: {
        announcement,
        newsletter,
        footer,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch admin storefront settings.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { section, data } = body || {};

    if (!section || !['announcement', 'newsletter', 'footer'].includes(section)) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing section name. Must be announcement, newsletter, or footer.' },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid payload data.' },
        { status: 400 }
      );
    }

    const updatedBy = admin.email || admin.uid || 'admin';
    const updatedAt = new Date().toISOString();

    let normalizedData: any = null;
    let validation = { valid: true, errors: {} as Record<string, string> };

    if (section === 'announcement') {
      validation = validateAnnouncementInput(data);
      if (validation.valid) {
        normalizedData = {
          ...normalizeAnnouncementSettings(data),
          updatedAt,
          updatedBy,
        };
      }
    } else if (section === 'newsletter') {
      validation = validateNewsletterInput(data);
      if (validation.valid) {
        normalizedData = {
          ...normalizeNewsletterSettings(data),
          updatedAt,
          updatedBy,
        };
      }
    } else if (section === 'footer') {
      validation = validateFooterInput(data);
      if (validation.valid) {
        normalizedData = {
          ...normalizeFooterSettings(data),
          updatedAt,
          updatedBy,
        };
      }
    }

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: 'Validation failed.', errors: validation.errors },
        { status: 400 }
      );
    }

    // Write to Firestore document
    const docRef = doc(db, COLLECTION_NAME, section);
    await setDoc(docRef, normalizedData, { merge: true });

    // Invalidate Next.js server caches
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/');
      revalidateTag('storefront-settings');
      revalidateTag(`storefront-settings:${section}`);
    } catch (revalErr) {
      console.warn('[storefront-settings] Cache revalidation warning:', revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Storefront content section '${section}' updated successfully.`,
      data: normalizedData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update storefront settings.' },
      { status: 500 }
    );
  }
}
