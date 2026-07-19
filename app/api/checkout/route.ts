import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { shippingInfo, shipCost, payMethod, items, ownerId } = await request.json();
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    if (!shippingInfo?.name || !shippingInfo?.address || !shippingInfo?.email) return NextResponse.json({ error: 'Incomplete shipping information.' }, { status: 400 });
    if (items.some(item => !item.variantId)) return NextResponse.json({ error: 'One or more cart items have no inventory variant. Add them again.' }, { status: 400 });

    const orderId = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const order = await runTransaction(db, async transaction => {
      let subtotal = 0;
      const snapshots: any[] = [];
      for (const item of items) {
        const [variantSnapshot, productSnapshot] = await Promise.all([
          transaction.get(doc(db, 'product-variants', item.variantId)),
          transaction.get(doc(db, 'products', String(item.id)))
        ]);
        if (!variantSnapshot.exists() || !productSnapshot.exists()) throw new Error(`${item.name} is no longer available.`);
        const variant = variantSnapshot.data();
        const product = productSnapshot.data();
        const quantity = Math.max(1, Number(item.qty || 1));
        const available = Number(variant.availableStock || 0);
        if (available < quantity) throw new Error(`Only ${available} units of ${item.name} are available.`);
        const retail = Number(product.retailPrice || 0);
        const unitPrice = product.discountPrice && Number(product.discountPrice) < retail ? Number(product.discountPrice) : retail;
        subtotal += unitPrice * quantity;
        snapshots.push({ item, variant, product, variantSnapshot, productSnapshot, quantity, available, unitPrice });
      }

      const deliveryDate = new Date(); deliveryDate.setDate(deliveryDate.getDate() + (Number(shipCost) === 12 ? 2 : 6));
      const orderData = {
        orderId, statusIndex: 0, delivery: deliveryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        total: subtotal + Number(shipCost || 0), payMethod: payMethod || 'Cash on Delivery', customer: shippingInfo, ownerId: ownerId || null, createdAt: now,
        items: snapshots.map(({ item, variant, product, quantity, unitPrice }) => ({ id: item.id, productId: String(item.id), variantId: item.variantId, sku: variant.sku, name: product.name, size: item.size, color: item.color, price: unitPrice, qty: quantity, img: item.img || '/colossal-rigout-logo.png' }))
      };
      for (const entry of snapshots) {
        const newAvailable = entry.available - entry.quantity;
        transaction.update(entry.variantSnapshot.ref, { stockOnHand: Number(entry.variant.stockOnHand || 0) - entry.quantity, availableStock: newAvailable, updatedAt: now });
        transaction.update(entry.productSnapshot.ref, { soldUnits: Number(entry.product.soldUnits || 0) + entry.quantity, updatedAt: now });
        const ledgerRef = doc(collection(db, 'inventory-transactions'));
        transaction.set(ledgerRef, { id: ledgerRef.id, productId: String(entry.item.id), variantId: entry.item.variantId, type: 'sale', quantityDelta: -entry.quantity, stockBefore: entry.available, stockAfter: newAvailable, orderId, actorId: ownerId || 'guest', createdAt: now });
      }
      transaction.set(doc(db, 'orders', orderId), orderData);
      return orderData;
    });
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Checkout transaction failed.' }, { status: 409 });
  }
}
