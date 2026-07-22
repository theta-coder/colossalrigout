import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';

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
  const imagesByProduct = new Map<string, Array<{ id: string; dataUrl: string; colorId: string | null; altText: string; role: 'primary' | 'gallery'; order: number }>>();
  imagesSnapshot.forEach(imageDoc => {
    const data = imageDoc.data();
    if (!isManagedImage(data.dataUrl)) return;
    const list = imagesByProduct.get(String(data.productId)) || [];
    list.push({ id: imageDoc.id, dataUrl: data.dataUrl, colorId: data.colorId ? String(data.colorId) : null, altText: String(data.altText || ''), role: data.role === 'primary' ? 'primary' : 'gallery', order: Number(data.order) || 0 });
    imagesByProduct.set(String(data.productId), list);
  });
  return productsSnapshot.docs.filter(productDoc => productDoc.id !== '_schema' && productDoc.data().type !== 'collection-schema').map(productDoc => {
    const data = productDoc.data();
    const images = (imagesByProduct.get(productDoc.id) || []).sort((a, b) => a.order - b.order);
    const colorGalleries = images.reduce<Record<string, any[]>>((groups, image) => {
      if (!image.colorId) return groups;
      (groups[image.colorId] ||= []).push({ ...image, colorId: image.colorId, url: image.dataUrl });
      return groups;
    }, {});
    const retailPrice = Number(data.retailPrice ?? data.price ?? 0);
    const discountPrice = data.discountPrice ? Number(data.discountPrice) : null;
    return {
      ...data,
      id: /^\d+$/.test(productDoc.id) ? Number(productDoc.id) : productDoc.id,
      price: discountPrice || retailPrice,
      retailPrice,
      discountPrice,
      img: images[0]?.dataUrl || productPlaceholder,
      images: (() => {
        const rawList = images.length ? images.map(image => image.dataUrl) : [productPlaceholder];
        if (rawList.length === 1) {
          if (!rawList.includes('/colossal-rigout-logo.png')) rawList.push('/colossal-rigout-logo.png');
          if (!rawList.includes('/product-placeholder.png')) rawList.push('/product-placeholder.png');
        }
        return rawList;
      })(),
      imageIds: images.map(image => image.id),
      colorGalleries,
      colors: (data.colorIds || data.colors || []).map((id: string) => colorNames.get(id) || id),
      sizes: (data.sizeIds || data.sizes || []).map((id: string) => sizeNames.get(id) || id),
      collections: data.collections || data.collectionIds || [],
      rating: data.aggregateRating ? String(data.aggregateRating) : undefined,
      reviews: data.approvedReviewCount ? String(data.approvedReviewCount) : undefined,
      sold: data.soldUnits ? `${data.soldUnits} sold` : undefined
    };
  });
}

async function saveImages(productId: string, values: unknown[], colorGalleries: Record<string, any[]> = {}) {
  const current = await getDocs(collection(db, 'product-images'));
  const pending: Array<{ id: string; dataUrl: string; colorId: string | null; altText: string; role: 'primary' | 'gallery'; order: number }> = [];
  Object.entries(colorGalleries).forEach(([colorId, gallery]) => {
    if (!Array.isArray(gallery)) return;
    const validGallery = gallery.filter((image) => isManagedImage(image?.dataUrl || image?.url)).slice(0, 8);
    validGallery.forEach((image, index) => pending.push({
      id: `${productId}-${colorId}-image-${index + 1}`,
      dataUrl: image.dataUrl || image.url,
      colorId,
      altText: String(image.altText || '').trim().slice(0, 180),
      role: image.role === 'primary' || index === 0 && !validGallery.some((entry) => entry.role === 'primary') ? 'primary' : 'gallery',
      order: index,
    }));
  });
  const valid = values.filter(isManagedImage);
  if (pending.length === 0) valid.forEach((dataUrl, order) => pending.push({ id: `${productId}-image-${order + 1}`, dataUrl, colorId: null, altText: '', role: order === 0 ? 'primary' : 'gallery', order }));
  await Promise.all(current.docs.filter(item => item.data().productId === productId).map(item => deleteDoc(item.ref)));
  const ids: string[] = [];
  for (const image of pending) {
    ids.push(image.id);
    await setDoc(doc(db, 'product-images', image.id), { ...image, productId, mimeType: 'image/webp', updatedAt: new Date().toISOString() });
  }
  return ids;
}

export async function GET() {
  try { return NextResponse.json({ products: await readProducts(), source: 'firestore' }); }
  catch (error: any) { return NextResponse.json({ products: [], source: 'error', error: error.message }, { status: 500 }); }
}

async function saveProduct(request: NextRequest, update: boolean) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { product } = await request.json();
  if (!product?.name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  if (update && product.id === undefined) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  const id = String(product.id ?? `prod-${Date.now()}`);
  const requestedColorIds: string[] = [...new Set<string>((Array.isArray(product.colorIds) ? product.colorIds : product.colors || []).map(String))];
  const requestedSizeIds: string[] = [...new Set<string>((Array.isArray(product.sizeIds) ? product.sizeIds : product.sizes || []).map(String))];
  const [colorsSnapshot, sizesSnapshot, existingSnapshot] = await Promise.all([
    getDocs(collection(db, 'colors')),
    getDocs(collection(db, 'sizes')),
    update ? getDoc(doc(db, 'products', id)) : Promise.resolve(null),
  ]);
  const existingData = existingSnapshot?.exists() ? existingSnapshot.data() : {};
  const existingColorIds = new Set<string>(Array.isArray(existingData.colorIds) ? existingData.colorIds.map(String) : []);
  const existingSizeIds = new Set<string>(Array.isArray(existingData.sizeIds) ? existingData.sizeIds.map(String) : []);
  const colorsById = new Map(colorsSnapshot.docs.map((item) => [item.id, item.data()]));
  const sizesById = new Map(sizesSnapshot.docs.map((item) => [item.id, item.data()]));
  const invalidColor = requestedColorIds.find((colorId) => !colorsById.has(colorId) || (colorsById.get(colorId)?.active === false && !existingColorIds.has(colorId)));
  const invalidSize = requestedSizeIds.find((sizeId) => !sizesById.has(sizeId) || (sizesById.get(sizeId)?.active === false && !existingSizeIds.has(sizeId)));
  if (invalidColor) return NextResponse.json({ error: `Invalid or inactive product color: ${invalidColor}` }, { status: 400 });
  if (invalidSize) return NextResponse.json({ error: `Invalid or inactive product size: ${invalidSize}` }, { status: 400 });
  const retailPrice = Number(product.retailPrice ?? product.price ?? 0);
  const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
  if (retailPrice <= 0 || (discountPrice !== null && (discountPrice <= 0 || discountPrice >= retailPrice))) {
    return NextResponse.json({ error: 'Discount price must be greater than zero and lower than retail price.' }, { status: 400 });
  }
  const uploaded = Array.isArray(product.images) ? product.images.filter(isManagedImage) : [];
  const requestedGalleries = product.colorGalleries && typeof product.colorGalleries === 'object' ? product.colorGalleries : {};
  const invalidGalleryColor = Object.keys(requestedGalleries).find((colorId) => !requestedColorIds.includes(colorId));
  if (invalidGalleryColor) return NextResponse.json({ error: `Gallery color is not assigned to product: ${invalidGalleryColor}` }, { status: 400 });
  let imageIds = Array.isArray(product.imageIds) ? product.imageIds : [];
  if (uploaded.length || Object.keys(requestedGalleries).length) imageIds = await saveImages(id, uploaded, requestedGalleries);
  const now = new Date().toISOString();
  const record = {
    id, name: String(product.name).trim(), slug: product.slug || String(product.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: product.description || '', categoryId: product.cat || product.categoryId || '', categorySlug: product.cat || product.categorySlug || '',
    audienceId: product.audienceId || product.audienceSlug || '', audienceSlug: product.audienceSlug || product.audienceId || '',
    retailPrice, discountPrice, currency: 'PKR', imageIds, primaryImageId: imageIds[0] || null,
    colorIds: requestedColorIds, sizeIds: requestedSizeIds, collectionIds: product.collectionIds || product.collections || [],
    colors: requestedColorIds.map((colorId) => String(colorsById.get(colorId)?.name || colorId)),
    sizes: requestedSizeIds.map((sizeId) => String(sizesById.get(sizeId)?.code || sizesById.get(sizeId)?.name || sizeId)),
    collections: product.collections || [], sizeGuideId: product.sizeGuideId || null,
    status: product.status || 'active', featured: product.featured !== false, bestsellerOverride: Boolean(product.isBestseller || product.bestsellerOverride),
    aggregateRating: Number(product.aggregateRating || 0), approvedReviewCount: Number(product.approvedReviewCount || 0), soldUnits: Number(product.soldUnits || 0),
    totalStock: Number(product.totalStock || 0), cat: product.cat || product.categorySlug || '', createdAt: product.createdAt || now, updatedAt: now
  };
  await setDoc(doc(db, 'products', id), record, { merge: update });
  try {
    revalidatePath('/');
    revalidateTag('homepage');
    revalidateTag('homepage:products');
  } catch {}
  const products = await readProducts();
  return NextResponse.json({ success: true, product: products.find(item => String(item.id) === id) });
}

export async function POST(request: NextRequest) { try { return await saveProduct(request, false); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); } }
export async function PUT(request: NextRequest) { try { return await saveProduct(request, true); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); } }

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    await deleteDoc(doc(db, 'products', id));
    const images = await getDocs(collection(db, 'product-images'));
    await Promise.all(images.docs.filter(item => item.data().productId === id).map(item => deleteDoc(item.ref)));
    try {
      revalidatePath('/');
      revalidateTag('homepage');
      revalidateTag('homepage:products');
    } catch {}
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
