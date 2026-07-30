import { formatPkr } from '../utils';
import { defaultShippingSettings } from '../shipping-policy';
import { defaultSettings as defaultReturnsSettings } from '../returns-policy';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface ProductPolicySummary {
  shippingText: string;
  returnsText: string;
  freeShippingThreshold: number;
  flatRate: number;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  returnWindowDays: number;
}

export async function getProductPolicySummary(): Promise<ProductPolicySummary> {
  try {
    const [shippingSnap, returnsSnap] = await Promise.all([
      getDoc(doc(db, 'shipping-policy', 'settings')).catch(() => null),
      getDoc(doc(db, 'returns-policy', 'settings')).catch(() => null),
    ]);

    const shipping = shippingSnap?.exists() ? { ...defaultShippingSettings, ...shippingSnap.data() } : defaultShippingSettings;
    const returns = returnsSnap?.exists() ? { ...defaultReturnsSettings, ...returnsSnap.data() } : defaultReturnsSettings;

    const freeShippingThreshold = Number(shipping.freeShippingThreshold ?? 2500);
    const flatRate = Number(shipping.flatRate ?? 250);
    const deliveryMinDays = Number(shipping.deliveryMinBusinessDays ?? 3);
    const deliveryMaxDays = Number(shipping.deliveryMaxBusinessDays ?? 7);
    const returnWindowDays = Number(returns.returnWindowDays ?? 2);

    const shippingText = `Shipping Rs. ${flatRate}. Free nationwide shipping on orders of Rs. ${freeShippingThreshold.toLocaleString()} or more via TCS. Delivered within ${deliveryMinDays}–${deliveryMaxDays} business days.`;
    const returnsText = `Easy ${returnWindowDays}-day returns & exchanges — item must meet our return conditions with original tags attached.`;

    return {
      shippingText,
      returnsText,
      freeShippingThreshold,
      flatRate,
      deliveryMinDays,
      deliveryMaxDays,
      returnWindowDays,
    };
  } catch {
    return {
      shippingText: 'Shipping Rs. 250. Free nationwide shipping on orders of Rs. 2,500 or more.',
      returnsText: 'Easy 2-day returns & exchanges — item must meet our return conditions with original tags attached.',
      freeShippingThreshold: 2500,
      flatRate: 250,
      deliveryMinDays: 3,
      deliveryMaxDays: 7,
      returnWindowDays: 2,
    };
  }
}
