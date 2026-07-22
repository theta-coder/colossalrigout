/**
 * lib/server/shop-page-settings.ts
 * 
 * Server-side data access for Shop Page Banner settings.
 * Uses Firestore REST client with caching, falling back to Firebase SDK and defaults.
 */

import { cache } from 'react';
import firebaseConfig from '@/firebase-applet-config.json';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { parseFirestoreDocument } from './firestore-rest';
import {
  ShopBannerSettings,
  DEFAULT_SHOP_BANNER_SETTINGS,
  normalizeShopBannerSettings,
} from '../shop-page-settings';

const COLLECTION_SETTINGS = 'shop-page-settings';

async function fetchBannerWithSdk(): Promise<Record<string, any> | null> {
  try {
    const docRef = doc(db, COLLECTION_SETTINGS, 'banner');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('[shop-page-settings] SDK fetch failed for banner settings:', err);
    return null;
  }
}

export const getShopBannerSettings = cache(async (): Promise<ShopBannerSettings> => {
  const { projectId, firestoreDatabaseId, apiKey } = firebaseConfig;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents/${COLLECTION_SETTINGS}/banner?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: {
        tags: ['shop-page-settings', 'shop-page-settings:banner'],
        revalidate: 3600,
      },
    });

    if (!res.ok) {
      const sdkData = await fetchBannerWithSdk();
      const normalized = normalizeShopBannerSettings(sdkData || DEFAULT_SHOP_BANNER_SETTINGS);
      delete normalized.updatedBy;
      return normalized;
    }

    const docObj = await res.json();
    const parsed = parseFirestoreDocument(docObj);
    const normalized = normalizeShopBannerSettings(parsed ? parsed.data : DEFAULT_SHOP_BANNER_SETTINGS);
    delete normalized.updatedBy;
    return normalized;
  } catch (err) {
    console.warn('[shop-page-settings] REST fetch failed, using fallback:', err);
    const sdkData = await fetchBannerWithSdk();
    const normalized = normalizeShopBannerSettings(sdkData || DEFAULT_SHOP_BANNER_SETTINGS);
    delete normalized.updatedBy;
    return normalized;
  }
});
