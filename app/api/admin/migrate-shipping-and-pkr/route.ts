import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultShippingSettings } from '@/lib/shipping-policy';

export async function POST(request: NextRequest) {
  try {
    const now = new Date().toISOString();
    const results: Record<string, any> = {};

    // 1. Authoritative Shipping Policy Settings Migration
    const shippingSettingsData = {
      ...defaultShippingSettings,
      freeShippingEnabled: true,
      freeShippingThreshold: 2500,
      flatRateEnabled: true,
      flatRate: 250,
      deliveryMinBusinessDays: 3,
      deliveryMaxBusinessDays: 7,
      productPageEnabled: true,
      productPageNote: 'Shipping Rs. 250. Free nationwide shipping on orders of Rs. 2,500 or more.',
      updatedAt: now,
    };

    await setDoc(doc(db, 'shipping-policy', 'settings'), shippingSettingsData, { merge: true });
    await setDoc(doc(db, 'shipping-policy-settings', 'settings'), shippingSettingsData, { merge: true });
    results.shippingPolicySettings = 'Updated shipping-policy/settings and synced shipping-policy-settings/settings to 250/2500 PKR';

    // 2. Announcement Settings Migration
    try {
      await setDoc(
        doc(db, 'storefront-settings', 'announcement'),
        {
          id: 'announcement',
          enabled: true,
          message: 'FREE NATIONWIDE SHIPPING ON ORDERS OVER RS. 2,500',
          secondaryMessage: 'EASY RETURNS',
          separator: '|',
          updatedAt: now,
        },
        { merge: true }
      );
      results.announcement = 'Updated storefront-settings/announcement message';
    } catch (err: any) {
      results.announcement = `Skipped/error: ${err.message}`;
    }

    // 3. Trust Benefits Migration
    try {
      await setDoc(
        doc(db, 'trust-benefits', 'free-shipping'),
        {
          id: 'free-shipping',
          title: 'Free Shipping',
          subtitle: 'On orders over Rs. 2,500',
          icon: 'truck',
          order: 1,
          active: true,
          updatedAt: now,
        },
        { merge: true }
      );
      results.trustBenefits = 'Updated free-shipping trust benefit subtitle';
    } catch (err: any) {
      results.trustBenefits = `Skipped/error: ${err.message}`;
    }

    // 4. Products Currency Migration (USD -> PKR)
    let updatedProductsCount = 0;
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      for (const d of prodSnap.docs) {
        const data = d.data();
        if (data.currency === 'USD' || !data.currency) {
          await updateDoc(doc(db, 'products', d.id), {
            currency: 'PKR',
            updatedAt: now,
          });
          updatedProductsCount++;
        }
      }
      results.productsUpdated = `Updated ${updatedProductsCount} product records to currency PKR`;
    } catch (err: any) {
      results.productsUpdated = `Error migrating products: ${err.message}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Shipping settings and PKR currency migration executed successfully.',
      details: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Migration failed.' },
      { status: 500 }
    );
  }
}
