import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const productPlaceholder = '/product-placeholder.png';
const isManagedImage = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:image/webp;base64,') && value.length <= 750_000;

async function readProducts() {
  const [productsSnapshot, imagesSnapshot, colorsSnapshot, sizesSnapshot] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'product-images')),
    getDocs(collection(db, 'colors')),
    getDocs(collection(db, 'sizes'))
  ]);
  if (productsSnapshot.empty) {
    const now = new Date().toISOString();
    await setDoc(doc(db, 'products', '_schema'), {
      type: 'collection-schema',
      description: 'Product records are created from the admin panel. This document keeps the Firestore collection visible while it is empty.',
      fields: ['name', 'retailPrice', 'discountPrice', 'categoryId', 'imageIds', 'colorIds', 'sizeIds', 'collectionIds', 'sizeGuideId', 'status'],
      createdAt: now,
      updatedAt: now
    });
  }
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
  return productsSnapshot.docs.filter(productDoc => productDoc.id !== '_schema' && productDoc.data().type !== 'collection-schema').map(productDoc => {
    const data = productDoc.data();
    const images = (imagesByProduct.get(productDoc.id) || []).sort((a, b) => a.order - b.order);
    const retailPrice = Number(data.retailPrice ?? data.price ?? 0);
    const discountPrice = data.discountPrice ? Number(data.discountPrice) : null;
    return {
      ...data,
      id: /^\d+$/.test(productDoc.id) ? Number(productDoc.id) : productDoc.id,
      price: discountPrice || retailPrice,
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
      sold: data.soldUnits ? `${data.soldUnits} sold` : undefined
    };
  });
}

async function saveImages(productId: string, values: unknown[]) {
  const current = await getDocs(collection(db, 'product-images'));
  await Promise.all(current.docs.filter(item => item.data().productId === productId).map(item => deleteDoc(item.ref)));
  const valid = values.filter(isManagedImage);
  const ids: string[] = [];
  for (let order = 0; order < valid.length; order++) {
    const id = `${productId}-image-${order + 1}`;
    ids.push(id);
    await setDoc(doc(db, 'product-images', id), { id, productId, dataUrl: valid[order], role: order === 0 ? 'primary' : 'gallery', order, updatedAt: new Date().toISOString() });
  }
  return ids;
}

export async function GET() {
  try { return NextResponse.json({ products: await readProducts(), source: 'firestore' }); }
  catch (error: any) { return NextResponse.json({ products: [], source: 'error', error: error.message }, { status: 500 }); }
}

async function saveProduct(request: NextRequest, update: boolean) {
  const { product } = await request.json();
  if (!product?.name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  if (update && product.id === undefined) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  const id = String(product.id ?? `prod-${Date.now()}`);
  const retailPrice = Number(product.retailPrice ?? product.price ?? 0);
  const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
  if (retailPrice <= 0 || (discountPrice !== null && (discountPrice <= 0 || discountPrice >= retailPrice))) {
    return NextResponse.json({ error: 'Discount price must be greater than zero and lower than retail price.' }, { status: 400 });
  }
  const uploaded = Array.isArray(product.images) ? product.images.filter(isManagedImage) : [];
  let imageIds = Array.isArray(product.imageIds) ? product.imageIds : [];
  if (uploaded.length) imageIds = await saveImages(id, uploaded);
  const now = new Date().toISOString();
  const record = {
    id, name: String(product.name).trim(), slug: product.slug || String(product.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: product.description || '', categoryId: product.cat || product.categoryId || '', categorySlug: product.cat || product.categorySlug || '',
    retailPrice, discountPrice, currency: product.currency || 'USD', imageIds, primaryImageId: imageIds[0] || null,
    colorIds: product.colorIds || product.colors || [], sizeIds: product.sizeIds || product.sizes || [], collectionIds: product.collectionIds || product.collections || [],
    colors: product.colors || [], sizes: product.sizes || [], collections: product.collections || [], sizeGuideId: product.sizeGuideId || null,
    status: product.status || 'active', featured: product.featured !== false, bestsellerOverride: Boolean(product.isBestseller || product.bestsellerOverride),
    aggregateRating: Number(product.aggregateRating || 0), approvedReviewCount: Number(product.approvedReviewCount || 0), soldUnits: Number(product.soldUnits || 0),
    totalStock: Number(product.totalStock || 0), cat: product.cat || product.categorySlug || '', createdAt: product.createdAt || now, updatedAt: now
  };
  await setDoc(doc(db, 'products', id), record, { merge: update });
  const products = await readProducts();
  return NextResponse.json({ success: true, product: products.find(item => String(item.id) === id) });
}

export async function POST(request: NextRequest) { try { return await saveProduct(request, false); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); } }
export async function PUT(request: NextRequest) { try { return await saveProduct(request, true); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); } }

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    await deleteDoc(doc(db, 'products', id));
    const images = await getDocs(collection(db, 'product-images'));
    await Promise.all(images.docs.filter(item => item.data().productId === id).map(item => deleteDoc(item.ref)));
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
