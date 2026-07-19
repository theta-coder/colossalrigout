import { NextResponse } from 'next/server';
import { deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const productNames = [
  'Classic Cotton Shirt', 'Premium Oxford Shirt', 'Relaxed Linen Shirt', 'Essential Crew T-Shirt', 'Graphic Weekend T-Shirt',
  'Slim Fit Chinos', 'Pleated Smart Trousers', 'Relaxed Cargo Pants', 'Classic Denim Jeans', 'Tailored Formal Pants',
  'Elegant Midi Dress', 'Floral Summer Dress', 'Evening Wrap Dress', 'Classic Shirt Dress', 'Relaxed Maxi Dress',
  'Minimal Leather Sneakers', 'Everyday Running Shoes', 'Classic Formal Loafers', 'Comfort Walking Shoes', 'Premium Court Trainers',
  'Structured Handbag', 'Everyday Crossbody Bag', 'Classic Leather Belt', 'Minimal Card Holder', 'Statement Sunglasses',
  'Kids Cotton Polo', 'Kids Weekend T-Shirt', 'Kids Stretch Chinos', 'Kids Everyday Hoodie', 'Kids Smart Shirt',
  'Lightweight Bomber Jacket', 'Classic Denim Jacket', 'Tailored Blazer', 'Everyday Zip Hoodie', 'Weather Ready Overshirt',
  'Soft Knit Sweater', 'Premium Cardigan', 'Classic Turtleneck', 'Relaxed Sweatshirt', 'Textured Knit Polo',
  'Performance Polo Shirt', 'Resort Collar Shirt', 'Essential Tank Top', 'Wide Leg Trousers', 'Relaxed Jogger Pants',
  'Modern Mini Dress', 'Premium Chelsea Boots', 'Compact Shoulder Bag', 'Kids Summer Shorts', 'Signature Everyday Set'
];

const categories = [
  { id: 'cat-tops', slug: 'tops' }, { id: 'cat-bottoms', slug: 'bottoms' },
  { id: 'cat-dresses', slug: 'dresses' }, { id: 'cat-shoes', slug: 'shoes' },
  { id: 'cat-accessories', slug: 'accessories' }
];
const colors = ['black', 'stone', 'navy', 'blue', 'white', 'grey', 'amber'];
const sizes = ['s', 'm', 'l', 'xl'];

export async function POST() {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    productNames.forEach((name, index) => {
      const productId = String(1001 + index);
      const category = categories[index % categories.length];
      const colorIds = [colors[index % colors.length], colors[(index + 2) % colors.length]];
      const retailPrice = 24 + (index % 12) * 3;
      const discountPrice = index % 3 === 0 ? retailPrice - 5 : null;
      let totalStock = 0;

      colorIds.forEach((colorId, colorIndex) => {
        sizes.forEach((sizeId, sizeIndex) => {
          const stock = 5 + ((index + colorIndex + sizeIndex) % 16);
          totalStock += stock;
          const variantId = `${productId}-${colorId}-${sizeId}`;
          batch.set(doc(db, 'product-variants', variantId), {
            id: variantId, productId, colorId, sizeId,
            sku: `CR-${productId}-${colorId.toUpperCase()}-${sizeId.toUpperCase()}`,
            stock,
            stockOnHand: stock,
            reserved: 0,
            reservedStock: 0,
            availableStock: stock,
            reorderLevel: 5,
            soldUnits: 0,
            active: true,
            createdAt: now, updatedAt: now
          });
        });
      });

      batch.set(doc(db, 'products', productId), {
        id: productId,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: `${name} created for everyday comfort, dependable quality, and versatile styling.`,
        categoryId: category.id,
        categorySlug: category.slug,
        cat: category.slug,
        retailPrice,
        discountPrice,
        currency: 'USD',
        imageIds: [],
        primaryImageId: null,
        colorIds,
        sizeIds: sizes,
        collectionIds: [],
        sizeGuideId: null,
        status: 'active',
        featured: index < 12,
        bestsellerOverride: index % 10 === 0,
        aggregateRating: 0,
        approvedReviewCount: 0,
        soldUnits: 0,
        totalStock,
        demoSeed: true,
        createdAt: now,
        updatedAt: now
      });
    });

    await batch.commit();
    await deleteDoc(doc(db, 'products', '_schema')).catch(() => undefined);
    return NextResponse.json({ success: true, productsCreated: productNames.length, variantsCreated: productNames.length * 8 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
