import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_IMAGES = 'shop-page-images';

export async function GET(request: NextRequest) {
  try {
    const docRef = doc(db, COLLECTION_IMAGES, 'banner');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const dataUrl = data?.dataUrl || '';

      if (typeof dataUrl === 'string') {
        const matches = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
        if (matches) {
          const mimeType = matches[1] === 'jpeg' ? 'image/jpeg' : `image/${matches[1]}`;
          const buffer = Buffer.from(matches[2], 'base64');

          if (buffer.length === 0 || buffer.length > 750_000) {
            return NextResponse.redirect(new URL('/colossal-rigout-logo.png', request.url));
          }

          const validSignature = matches[1] === 'webp'
            ? buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
            : matches[1] === 'png'
              ? buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          if (!validSignature) {
            return NextResponse.redirect(new URL('/colossal-rigout-logo.png', request.url));
          }

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        }
      }
    }

    // Fallback redirect to static logo asset
    return NextResponse.redirect(new URL('/colossal-rigout-logo.png', request.url));
  } catch (error) {
    console.warn('[shop-banner-image] Error serving shop banner image:', error);
    return NextResponse.redirect(new URL('/colossal-rigout-logo.png', request.url));
  }
}
