import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchFirestoreRestCollection } from '@/lib/server/firestore-rest';

export const revalidate = 3600; // Revalidate feed cache every 1 hour

const SITE_URL = 'https://colossalrigout.pk';

/**
 * Escapes special XML characters and strips illegal control characters.
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Cleans HTML markup from descriptions and normalizes whitespace.
 */
function cleanDescription(text: string): string {
  if (!text) return '';
  const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped;
}

/**
 * Formats a numeric price into Google Merchant Center format (e.g. 2499.00 PKR).
 */
function formatPrice(price: number): string {
  const num = Number(price);
  if (isNaN(num) || num < 0) return '0.00 PKR';
  return `${num.toFixed(2)} PKR`;
}

/**
 * Resolves an absolute HTTPS URL for product images.
 */
function resolveImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${SITE_URL}${trimmed}`;
  }
  return `${SITE_URL}/${trimmed}`;
}

/**
 * Maps category slug or name to Google Product Category taxonomy.
 */
function mapGoogleCategory(categorySlug?: string, categoryName?: string): string {
  const slug = (categorySlug || categoryName || '').toLowerCase();
  if (slug.includes('top') || slug.includes('shirt') || slug.includes('t-shirt') || slug.includes('hoodie')) {
    return 'Apparel &amp; Accessories &gt; Clothing &gt; Tops';
  }
  if (slug.includes('bottom') || slug.includes('trouser') || slug.includes('pant') || slug.includes('jeans') || slug.includes('chino')) {
    return 'Apparel &amp; Accessories &gt; Clothing &gt; Pants';
  }
  if (slug.includes('dress') || slug.includes('frock')) {
    return 'Apparel &amp; Accessories &gt; Clothing &gt; Dresses';
  }
  if (slug.includes('shoe') || slug.includes('footwear') || slug.includes('boot') || slug.includes('sneaker') || slug.includes('loafer')) {
    return 'Apparel &amp; Accessories &gt; Shoes';
  }
  if (slug.includes('accessory') || slug.includes('accessories') || slug.includes('bag') || slug.includes('belt')) {
    return 'Apparel &amp; Accessories &gt; Clothing Accessories';
  }
  return 'Apparel &amp; Accessories &gt; Clothing';
}

/**
 * Maps product type for internal categorization display.
 */
function mapProductType(categoryName?: string): string {
  const cat = categoryName ? categoryName.trim() : 'Clothing';
  return escapeXml(`Apparel > ${cat}`);
}

/**
 * Maps target gender based on product name, category, or audience.
 */
function mapGender(audienceSlug?: string, categorySlug?: string, name?: string): 'male' | 'female' | 'unisex' {
  const text = `${audienceSlug || ''} ${categorySlug || ''} ${name || ''}`.toLowerCase();
  if (text.includes('women') || text.includes('woman') || text.includes('lady') || text.includes('ladies') || text.includes('dress')) {
    return 'female';
  }
  if (text.includes('men') || text.includes('man') || text.includes('gents')) {
    return 'male';
  }
  return 'unisex';
}

/**
 * Maps age group based on product info.
 */
function mapAgeGroup(audienceSlug?: string, categorySlug?: string, name?: string): 'kids' | 'adult' {
  const text = `${audienceSlug || ''} ${categorySlug || ''} ${name || ''}`.toLowerCase();
  if (text.includes('kid') || text.includes('child') || text.includes('boy') || text.includes('girl') || text.includes('junior')) {
    return 'kids';
  }
  return 'adult';
}

async function fetchCollectionData(collectionName: string): Promise<Array<{ id: string; data: Record<string, any> }>> {
  try {
    const restDocs = await fetchFirestoreRestCollection({ collectionName, revalidate: 3600 });
    if (Array.isArray(restDocs) && restDocs.length > 0) {
      return restDocs;
    }
  } catch (err) {
    console.warn(`[merchant-feed] REST fetch failed for ${collectionName}, trying SDK fallback:`, err);
  }

  try {
    if (db) {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }));
    }
  } catch (sdkErr) {
    console.error(`[merchant-feed] SDK fetch failed for ${collectionName}:`, sdkErr);
  }
  return [];
}

export async function GET() {
  try {
    const [productsList, imagesList, variantsList, colorsList, sizesList, categoriesList] = await Promise.all([
      fetchCollectionData('products'),
      fetchCollectionData('product-images'),
      fetchCollectionData('product-variants'),
      fetchCollectionData('colors'),
      fetchCollectionData('sizes'),
      fetchCollectionData('shop-categories'),
    ]);

    // Build colors dictionary
    const colorsMap = new Map<string, string>();
    colorsList.forEach((item) => {
      const data = item.data;
      if (data.name) {
        colorsMap.set(item.id, data.name);
        if (data.slug) colorsMap.set(data.slug, data.name);
      }
    });

    // Build sizes dictionary
    const sizesMap = new Map<string, string>();
    sizesList.forEach((item) => {
      const data = item.data;
      if (data.name) {
        sizesMap.set(item.id, data.name);
        if (data.code) sizesMap.set(data.code, data.name);
      }
    });

    // Build categories dictionary
    const categoriesMap = new Map<string, string>();
    categoriesList.forEach((item) => {
      const data = item.data;
      if (data.name) {
        categoriesMap.set(item.id, data.name);
        if (data.slug) categoriesMap.set(data.slug, data.name);
      }
    });

    // Map images by productId
    const imagesByProduct = new Map<string, Array<{ id: string; order: number; colorId?: string }>>();
    imagesList.forEach((item) => {
      const data = item.data;
      if (!data.productId) return;
      const pId = String(data.productId);
      const list = imagesByProduct.get(pId) || [];
      list.push({
        id: item.id,
        order: Number(data.order || 0),
        colorId: data.colorId ? String(data.colorId) : undefined,
      });
      imagesByProduct.set(pId, list);
    });

    // Map variants by productId
    const variantsByProduct = new Map<string, any[]>();
    variantsList.forEach((item) => {
      const data = item.data;
      if (!data.productId || data.active === false) return;
      const pId = String(data.productId);
      const list = variantsByProduct.get(pId) || [];
      list.push({ id: item.id, ...data });
      variantsByProduct.set(pId, list);
    });

    const itemsXml: string[] = [];
    let processedProductsCount = 0;
    let totalItemsCount = 0;
    const skippedItems: Array<{ id: string; name: string; reason: string }> = [];

    productsList.forEach((item) => {
      const pId = item.id;
      const data = item.data;

      // Step 1: Filter out inactive, draft, archived, or deleted products
      if (data.status === 'draft' || data.status === 'archived') {
        skippedItems.push({ id: pId, name: data.name || 'Unnamed', reason: `Status is ${data.status}` });
        return;
      }

      const name = data.name ? String(data.name).trim() : '';
      if (!name) {
        skippedItems.push({ id: pId, name: 'Unnamed', reason: 'Missing product name' });
        return;
      }

      const slug = data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const productLink = `${SITE_URL}/product/${slug}`;

      // Resolve images
      const imageDocs = (imagesByProduct.get(pId) || []).sort((a, b) => a.order - b.order);
      let mainImageUrl: string | null = null;
      const additionalImageUrls: string[] = [];

      if (imageDocs.length > 0) {
        mainImageUrl = resolveImageUrl(`/api/homepage-image/product/${encodeURIComponent(imageDocs[0].id)}`);
        for (let i = 1; i < imageDocs.length; i++) {
          const addUrl = resolveImageUrl(`/api/homepage-image/product/${encodeURIComponent(imageDocs[i].id)}`);
          if (addUrl && addUrl !== mainImageUrl && !additionalImageUrls.includes(addUrl)) {
            additionalImageUrls.push(addUrl);
          }
        }
      }

      if (!mainImageUrl && data.primaryImageUrl) {
        mainImageUrl = resolveImageUrl(data.primaryImageUrl);
      }
      if (!mainImageUrl && data.img) {
        mainImageUrl = resolveImageUrl(data.img);
      }
      if (!mainImageUrl && Array.isArray(data.images) && data.images.length > 0) {
        mainImageUrl = resolveImageUrl(data.images[0]);
        for (let i = 1; i < data.images.length; i++) {
          const addUrl = resolveImageUrl(data.images[i]);
          if (addUrl && addUrl !== mainImageUrl && !additionalImageUrls.includes(addUrl)) {
            additionalImageUrls.push(addUrl);
          }
        }
      }

      if (!mainImageUrl) {
        skippedItems.push({ id: pId, name, reason: 'Missing valid image URL' });
        return;
      }

      // Pricing logic
      const retailPrice = Number(data.retailPrice ?? data.price ?? 0);
      const discountPrice = data.discountPrice !== null && data.discountPrice !== undefined ? Number(data.discountPrice) : null;
      const hasValidSale = discountPrice !== null && discountPrice > 0 && discountPrice < retailPrice;

      const formattedPrice = formatPrice(retailPrice);
      const formattedSalePrice = hasValidSale ? formatPrice(discountPrice) : null;

      // Category & taxonomy
      const categoryName = data.categoryName || categoriesMap.get(data.categoryId) || categoriesMap.get(data.categorySlug) || data.cat;
      const googleCategory = mapGoogleCategory(data.categorySlug, categoryName);
      const productType = mapProductType(categoryName);
      const gender = mapGender(data.audienceSlug, data.categorySlug, name);
      const ageGroup = mapAgeGroup(data.audienceSlug, data.categorySlug, name);

      // Description
      const rawDescription = data.description || `${name} by Colossal Rigout. Premium quality apparel created for everyday comfort and style.`;
      const description = escapeXml(cleanDescription(rawDescription));

      // Process variants if present
      const productVariants = variantsByProduct.get(pId) || [];
      processedProductsCount++;

      if (productVariants.length > 0) {
        productVariants.forEach((v) => {
          try {
            const variantId = v.sku || `${pId}_${v.colorId || 'c'}_${v.sizeId || 's'}`;
            const colorName = v.colorName || colorsMap.get(v.colorId) || v.colorId || '';
            const sizeName = v.sizeName || sizesMap.get(v.sizeId) || v.sizeId || '';

            // Title with variant details
            const variantTitleParts = [name];
            if (colorName && sizeName) {
              variantTitleParts.push(`- ${colorName} / ${sizeName.toUpperCase()}`);
            } else if (colorName) {
              variantTitleParts.push(`- ${colorName}`);
            } else if (sizeName) {
              variantTitleParts.push(`- ${sizeName.toUpperCase()}`);
            }
            const variantTitle = escapeXml(variantTitleParts.join(' '));

            // Stock calculation
            const availableStock = Number(v.availableStock ?? (Number(v.stockOnHand || 0) - Number(v.reservedStock || 0)));
            const availability = availableStock > 0 ? 'in_stock' : 'out_of_stock';

            // Check variant specific image
            let variantImageUrl = mainImageUrl;
            if (v.colorId && imageDocs.length > 0) {
              const matchedImg = imageDocs.find((img) => String(img.colorId) === String(v.colorId));
              if (matchedImg) {
                const specUrl = resolveImageUrl(`/api/homepage-image/product/${encodeURIComponent(matchedImg.id)}`);
                if (specUrl) variantImageUrl = specUrl;
              }
            }

            const gtin = v.barcode || v.gtin || data.barcode || data.gtin;
            const mpn = v.sku || v.mpn || data.sku || variantId;
            const identifierExists = gtin ? 'yes' : 'no';

            let itemBuffer = '    <item>\n';
            itemBuffer += `      <g:id>${escapeXml(variantId)}</g:id>\n`;
            itemBuffer += `      <g:item_group_id>${escapeXml(pId)}</g:item_group_id>\n`;
            itemBuffer += `      <g:title>${variantTitle}</g:title>\n`;
            itemBuffer += `      <g:description>${description}</g:description>\n`;
            itemBuffer += `      <g:link>${escapeXml(productLink)}</g:link>\n`;
            itemBuffer += `      <g:image_link>${escapeXml(variantImageUrl!)}</g:image_link>\n`;

            additionalImageUrls.slice(0, 10).forEach((addImg) => {
              itemBuffer += `      <g:additional_image_link>${escapeXml(addImg)}</g:additional_image_link>\n`;
            });

            itemBuffer += `      <g:availability>${availability}</g:availability>\n`;
            itemBuffer += `      <g:price>${formattedPrice}</g:price>\n`;
            if (formattedSalePrice) {
              itemBuffer += `      <g:sale_price>${formattedSalePrice}</g:sale_price>\n`;
            }
            itemBuffer += '      <g:condition>new</g:condition>\n';
            itemBuffer += '      <g:brand>Colossal Rigout</g:brand>\n';
            itemBuffer += `      <g:google_product_category>${googleCategory}</g:google_product_category>\n`;
            itemBuffer += `      <g:product_type>${productType}</g:product_type>\n`;
            itemBuffer += `      <g:identifier_exists>${identifierExists}</g:identifier_exists>\n`;

            if (gtin) {
              itemBuffer += `      <g:gtin>${escapeXml(gtin)}</g:gtin>\n`;
            }
            if (mpn) {
              itemBuffer += `      <g:mpn>${escapeXml(mpn)}</g:mpn>\n`;
            }
            if (colorName) {
              itemBuffer += `      <g:color>${escapeXml(colorName)}</g:color>\n`;
            }
            if (sizeName) {
              itemBuffer += `      <g:size>${escapeXml(sizeName.toUpperCase())}</g:size>\n`;
            }
            itemBuffer += `      <g:gender>${gender}</g:gender>\n`;
            itemBuffer += `      <g:age_group>${ageGroup}</g:age_group>\n`;

            itemBuffer += '      <g:shipping>\n';
            itemBuffer += '        <g:country>PK</g:country>\n';
            itemBuffer += '        <g:service>TCS</g:service>\n';
            itemBuffer += '        <g:price>0.00 PKR</g:price>\n';
            itemBuffer += '      </g:shipping>\n';

            itemBuffer += '    </item>';

            itemsXml.push(itemBuffer);
            totalItemsCount++;
          } catch (varErr) {
            console.error(`[merchant-feed] Error processing variant for product ${pId}:`, varErr);
          }
        });
      } else {
        // Single product item without separate variants
        try {
          const totalStock = Number(data.totalStock || 0);
          const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';
          const gtin = data.barcode || data.gtin;
          const mpn = data.sku || pId;
          const identifierExists = gtin ? 'yes' : 'no';
          const productTitle = escapeXml(name);

          let itemBuffer = '    <item>\n';
          itemBuffer += `      <g:id>${escapeXml(pId)}</g:id>\n`;
          itemBuffer += `      <g:title>${productTitle}</g:title>\n`;
          itemBuffer += `      <g:description>${description}</g:description>\n`;
          itemBuffer += `      <g:link>${escapeXml(productLink)}</g:link>\n`;
          itemBuffer += `      <g:image_link>${escapeXml(mainImageUrl)}</g:image_link>\n`;

          additionalImageUrls.slice(0, 10).forEach((addImg) => {
            itemBuffer += `      <g:additional_image_link>${escapeXml(addImg)}</g:additional_image_link>\n`;
          });

          itemBuffer += `      <g:availability>${availability}</g:availability>\n`;
          itemBuffer += `      <g:price>${formattedPrice}</g:price>\n`;
          if (formattedSalePrice) {
            itemBuffer += `      <g:sale_price>${formattedSalePrice}</g:sale_price>\n`;
          }
          itemBuffer += '      <g:condition>new</g:condition>\n';
          itemBuffer += '      <g:brand>Colossal Rigout</g:brand>\n';
          itemBuffer += `      <g:google_product_category>${googleCategory}</g:google_product_category>\n`;
          itemBuffer += `      <g:product_type>${productType}</g:product_type>\n`;
          itemBuffer += `      <g:identifier_exists>${identifierExists}</g:identifier_exists>\n`;

          if (gtin) {
            itemBuffer += `      <g:gtin>${escapeXml(gtin)}</g:gtin>\n`;
          }
          if (mpn) {
            itemBuffer += `      <g:mpn>${escapeXml(mpn)}</g:mpn>\n`;
          }
          itemBuffer += `      <g:gender>${gender}</g:gender>\n`;
          itemBuffer += `      <g:age_group>${ageGroup}</g:age_group>\n`;

          itemBuffer += '      <g:shipping>\n';
          itemBuffer += '        <g:country>PK</g:country>\n';
          itemBuffer += '        <g:service>TCS</g:service>\n';
          itemBuffer += '        <g:price>0.00 PKR</g:price>\n';
          itemBuffer += '      </g:shipping>\n';

          itemBuffer += '    </item>';

          itemsXml.push(itemBuffer);
          totalItemsCount++;
        } catch (prodErr) {
          console.error(`[merchant-feed] Error processing single item product ${pId}:`, prodErr);
          skippedItems.push({ id: pId, name, reason: 'Error processing product item XML' });
        }
      }
    });

    const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Colossal Rigout Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Official Google Merchant Center RSS 2.0 Feed for Colossal Rigout</description>
${itemsXml.join('\n')}
  </channel>
</rss>`;

    return new Response(xmlFeed, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Feed-Products-Count': String(processedProductsCount),
        'X-Feed-Items-Count': String(totalItemsCount),
        'X-Feed-Skipped-Count': String(skippedItems.length),
      },
    });
  } catch (error: any) {
    console.error('[merchant-feed.xml] Fatal error generating feed:', error);
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Colossal Rigout Product Feed - Error</title>
    <link>${SITE_URL}</link>
    <description>An error occurred generating the feed: ${escapeXml(error?.message || 'Unknown error')}</description>
  </channel>
</rss>`;
    return new Response(errorXml, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}
