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

    const freeShippingThreshold = Number(shipping.freeShippingThreshold ?? 5000);
    const flatRate = Number(shipping.flatRate ?? 500);
    const deliveryMinDays = Number(shipping.deliveryMinBusinessDays ?? 4);
    const deliveryMaxDays = Number(shipping.deliveryMaxBusinessDays ?? 6);
    const returnWindowDays = Number(returns.returnWindowDays ?? 30);

    const shippingText = `Free shipping on orders over ${formatPkr(freeShippingThreshold)}. Standard delivery in ${deliveryMinDays}–${deliveryMaxDays} business days for ${formatPkr(flatRate)} flat rate.${shipping.productPageNote ? ' ' + shipping.productPageNote : ''}`;
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
      shippingText: `Free shipping on orders over ${formatPkr(5000)}. Standard delivery in 4–6 business days for ${formatPkr(500)} flat.`,
      returnsText: 'Easy 30-day returns & exchanges — item must meet our return conditions with original tags attached.',
      freeShippingThreshold: 5000,
      flatRate: 500,
      deliveryMinDays: 4,
      deliveryMaxDays: 6,
      returnWindowDays: 30,
    };
  }
}
