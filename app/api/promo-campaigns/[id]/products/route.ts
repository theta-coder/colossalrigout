import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';

const CAMPAIGNS_COL = 'promo-campaigns';
const IMAGES_COL = 'promo-campaign-images';
const productPlaceholder = '/product-placeholder.png';
const isManagedImage = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:image/webp;base64,') && value.length <= 750_000;

async function getProducts() {
  const [productsSnapshot, imagesSnapshot, colorsSnapshot, sizesSnapshot] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'product-images')),
    getDocs(collection(db, 'colors')),
    getDocs(collection(db, 'sizes'))
  ]);

  const colorNames = new Map(colorsSnapshot.docs.map(item => [item.id, String(item.data().name || item.id)]));
  const sizeNames = new Map(sizesSnapshot.docs.map(item => [item.id, String(item.data().code || item.data().name || item.id)]));
  const imagesByProduct = new Map<string, Array<{ id: string; dataUrl: string; order: number }>>();

  imagesSnapshot.forEach(imageDoc => {
    const data = imageDoc.data();
    if (!isManagedImage(data.dataUrl)) return;
    const list = imagesByProduct.get(String(data.productId)) || [];
    list.push({ id: imageDoc.id, dataUrl: data.dataUrl, order: Number(data.order) || 0 });
    imagesByProduct.set(String(data.productId), list);
  });

  return productsSnapshot.docs
    .filter(productDoc => productDoc.id !== '_schema' && productDoc.data().type !== 'collection-schema')
    .map(productDoc => {
      const data = productDoc.data();
      const images = (imagesByProduct.get(productDoc.id) || []).sort((a, b) => a.order - b.order);
      const retailPrice = Number(data.retailPrice ?? data.price ?? 0);
      const discountPrice = data.discountPrice ? Number(data.discountPrice) : null;
      return {
        ...data,
        id: /^\d+$/.test(productDoc.id) ? Number(productDoc.id) : productDoc.id,
        retailPrice,
        discountPrice,
        img: images[0]?.dataUrl || productPlaceholder,
        images: images.length ? images.map(image => image.dataUrl) : [productPlaceholder],
        imageIds: images.map(image => image.id),
        colors: (data.colorIds || data.colors || []).map((id: string) => colorNames.get(id) || id),
        sizes: (data.sizeIds || data.sizes || []).map((id: string) => sizeNames.get(id) || id),
        collections: data.collections || data.collectionIds || [],
        rating: data.aggregateRating ? String(data.aggregateRating) : undefined,
        reviews: data.approvedReviewCount ? String(data.approvedReviewCount) : undefined,
        sold: data.soldUnits ? `${data.soldUnits} sold` : undefined,
        status: data.status || 'active',
        categoryId: data.categoryId || data.categorySlug || '',
        categorySlug: data.categorySlug || data.cat || '',
      };
    });
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Campaign ID is required' }, { status: 400 });
    }

    const campaignSnap = await getDoc(doc(db, CAMPAIGNS_COL, id));
    if (!campaignSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignSnap.data();
    const allProducts = await getProducts();

    // Filter active products
    const activeProducts = allProducts.filter(p => p.status === 'active');

    // Filter campaign eligible products
    let eligibleProducts = [];
    if (campaign.targetType === 'all-products') {
      eligibleProducts = activeProducts;
    } else if (campaign.targetType === 'selected-products') {
      const pids = Array.isArray(campaign.productIds) ? campaign.productIds.map(String) : [];
      eligibleProducts = activeProducts.filter(p => pids.includes(String(p.id)));
    } else if (campaign.targetType === 'selected-categories') {
      const cids = Array.isArray(campaign.categoryIds) ? campaign.categoryIds.map((s: any) => String(s).toLowerCase().trim()) : [];
      eligibleProducts = activeProducts.filter(p => {
        const catId = String(p.categoryId || '').toLowerCase().trim();
        const catSlug = String(p.categorySlug || '').toLowerCase().trim();
        return cids.includes(catId) || cids.includes(catSlug);
      });
    } else {
      eligibleProducts = activeProducts;
    }

    // Now calculate campaign-aware effective pricing
    const data = eligibleProducts.map(p => {
      let campaignPrice = p.retailPrice;
      if (campaign.discountType === 'percentage') {
        campaignPrice = p.retailPrice * (1 - Number(campaign.discountValue || 0) / 100);
      } else if (campaign.discountType === 'fixed') {
        campaignPrice = Math.max(0.01, p.retailPrice - Number(campaign.discountValue || 0));
      }

      // Check whether manual discount is lower
      const manualPrice = p.discountPrice !== null ? p.discountPrice : p.retailPrice;
      const effectivePrice = campaign.discountMode === 'automatic'
        ? Math.min(campaignPrice, manualPrice)
        : manualPrice; // If coupon is required, the default list/detail price is just the manual price

      return {
        ...p,
        price: Number(effectivePrice.toFixed(2)),
        campaignPrice: Number(campaignPrice.toFixed(2)),
        manualPrice: Number(manualPrice.toFixed(2)),
        campaignDiscountApplied: campaign.discountMode === 'automatic' && campaignPrice < manualPrice,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      campaign: {
        id: campaign.id,
        heading: campaign.heading,
        discountMode: campaign.discountMode,
        discountType: campaign.discountType,
        discountValue: campaign.discountValue,
      }
    });

  } catch (error: any) {
    console.error('[API GET /api/promo-campaigns/[id]/products] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
