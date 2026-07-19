import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ProductVariantDocument, InventoryTransactionDocument } from '../../../types/commerce';

// GET: Fetch variants and optional inventory transactions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    
    const varCol = collection(db, 'product-variants');
    let snapshot;
    if (productId) {
      const q = query(varCol, where('productId', '==', productId));
      snapshot = await getDocs(q);
    } else {
      snapshot = await getDocs(varCol);
    }

    const variants: ProductVariantDocument[] = [];
    snapshot.forEach((docSnap) => {
      variants.push(docSnap.data() as ProductVariantDocument);
    });

    return NextResponse.json({ variants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save or update product variant stock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variant, reason, actorId } = body;
    if (!variant || !variant.productId || !variant.colorId || !variant.sizeId) {
      return NextResponse.json({ error: 'Variant data missing required fields' }, { status: 400 });
    }

    const variantId = variant.id || `${variant.productId}_${variant.colorId}_${variant.sizeId}`;
    const stockOnHand = Number(variant.stockOnHand || 0);
    const reservedStock = Number(variant.reservedStock || 0);
    const availableStock = Math.max(stockOnHand - reservedStock, 0);

    const updatedVariant: ProductVariantDocument = {
      id: variantId,
      productId: variant.productId,
      colorId: variant.colorId,
      colorName: variant.colorName || '',
      sizeId: variant.sizeId,
      sizeName: variant.sizeName || '',
      sku: variant.sku || `${variant.productId}-${variant.colorId}-${variant.sizeId}`,
      barcode: variant.barcode || null,
      stockOnHand,
      reservedStock,
      availableStock,
      reorderLevel: Number(variant.reorderLevel || 5),
      active: variant.active !== undefined ? variant.active : true,
      createdAt: variant.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'product-variants', variantId), updatedVariant);

    // Create inventory transaction ledger record
    const transId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const ledgerEntry: InventoryTransactionDocument = {
      id: transId,
      productId: variant.productId,
      variantId,
      type: 'adjustment',
      quantityDelta: stockOnHand,
      stockBefore: 0,
      stockAfter: stockOnHand,
      reason: reason || 'Manual stock update via Admin',
      actorId: actorId || 'admin',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'inventory-transactions', transId), ledgerEntry);
    } catch (e) {
      console.warn('Ledger entry save skipped:', e);
    }

    return NextResponse.json({ success: true, variant: updatedVariant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
