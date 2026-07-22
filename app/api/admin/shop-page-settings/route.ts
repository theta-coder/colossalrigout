import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  DEFAULT_SHOP_BANNER_SETTINGS,
  normalizeShopBannerSettings,
  validateShopBannerInput,
} from '@/lib/shop-page-settings';

const COLLECTION_SETTINGS = 'shop-page-settings';
const COLLECTION_IMAGES = 'shop-page-images';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const [settingsSnap, imageSnap] = await Promise.all([
      getDoc(doc(db, COLLECTION_SETTINGS, 'banner')),
      getDoc(doc(db, COLLECTION_IMAGES, 'banner')),
    ]);

    const bannerSettings = normalizeShopBannerSettings(
      settingsSnap.exists() ? settingsSnap.data() : DEFAULT_SHOP_BANNER_SETTINGS
    );

    const hasCustomImage = imageSnap.exists() && Boolean(imageSnap.data()?.dataUrl);

    return NextResponse.json({
      success: true,
      data: {
        banner: bannerSettings,
        hasCustomImage,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch shop page admin settings.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 1_100_000) {
      return NextResponse.json(
        { success: false, message: 'Banner request is too large.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { settings, imageDataUrl, resetImage } = body || {};

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid settings payload.' },
        { status: 400 }
      );
    }

    const validation = validateShopBannerInput(settings);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: 'Validation failed.', errors: validation.errors },
        { status: 400 }
      );
    }

    const updatedBy = admin.email || admin.uid || 'admin';
    const updatedAt = new Date().toISOString();

    const normalizedSettings = {
      ...normalizeShopBannerSettings(settings),
      updatedAt,
      updatedBy,
    };

    let validatedImageDataUrl: string | null = null;

    // Validate the image completely before writing either document so an
    // invalid image cannot partially save otherwise-valid banner settings.
    if (!resetImage && imageDataUrl && typeof imageDataUrl === 'string') {
      const imageMatch = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
      if (!imageMatch) {
        return NextResponse.json(
          { success: false, message: 'Invalid image format. Must be a WebP image data URL.' },
          { status: 400 }
        );
      }

      const imageBuffer = Buffer.from(imageMatch[1], 'base64');
      if (imageBuffer.length === 0 || imageBuffer.length > 750_000) {
        return NextResponse.json(
          { success: false, message: 'Image size exceeds maximum allowed size (750KB).' },
          { status: 400 }
        );
      }

      const isWebP =
        imageBuffer.length >= 12 &&
        imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP';
      if (!isWebP) {
        return NextResponse.json(
          { success: false, message: 'The uploaded banner is not a valid WebP image.' },
          { status: 400 }
        );
      }

      validatedImageDataUrl = imageDataUrl;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTION_SETTINGS, 'banner'), normalizedSettings, { merge: true });

    if (resetImage) {
      batch.set(doc(db, COLLECTION_IMAGES, 'banner'), {
        id: 'banner',
        dataUrl: '',
        mimeType: 'image/webp',
        updatedAt,
      });
    } else if (validatedImageDataUrl) {
      batch.set(doc(db, COLLECTION_IMAGES, 'banner'), {
        id: 'banner',
        dataUrl: validatedImageDataUrl,
        mimeType: 'image/webp',
        updatedAt,
      });
    }

    await batch.commit();

    // Invalidate caches
    try {
      revalidatePath('/shop');
      revalidateTag('shop-page-settings');
      revalidateTag('shop-page-settings:banner');
    } catch (revalErr) {
      console.warn('[admin-shop-page-settings] Cache revalidation warning:', revalErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Shop page banner settings updated successfully.',
      data: normalizedSettings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update shop page settings.' },
      { status: 500 }
    );
  }
}
