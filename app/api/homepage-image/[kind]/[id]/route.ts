import { NextResponse, NextRequest } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const sources: Record<string, { collection: string; field: string }> = {
  hero: { collection: 'hero-slide-images', field: 'dataUrl' },
  category: { collection: 'shop-category-images', field: 'dataUrl' },
  product: { collection: 'product-images', field: 'dataUrl' },
  promo: { collection: 'promo-campaign-images', field: 'dataUrl' },
  'campaign-card': { collection: 'campaign-card-images', field: 'dataUrl' },
  collection: { collection: 'collections', field: 'imageData' },
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const fallbackUrl = new URL('/product-placeholder.png', request.url);
  try {
    const { kind, id } = await params;
    const source = sources[kind];
    if (!source || !id || id.length > 160) {
      return NextResponse.redirect(fallbackUrl, 302);
    }

    const snapshot = await getDoc(doc(db, source.collection, id));
    const dataUrl = snapshot.exists() ? String(snapshot.data()?.[source.field] || '') : '';
    const match = /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
    if (!match || dataUrl.length > 800_000) {
      return NextResponse.redirect(fallbackUrl, 302);
    }

    const contentType = match[1] === 'jpeg' ? 'image/jpeg' : `image/${match[1]}`;
    return new Response(Buffer.from(match[2], 'base64'), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.redirect(fallbackUrl, 302);
  }
}

