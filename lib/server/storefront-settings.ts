/**
 * lib/server/storefront-settings.ts
 * 
 * Server-side data access helpers for Storefront Content.
 * Uses Firestore REST API with Next.js tags & caching, falling back to Firebase SDK
 * and hardcoded default settings on errors or missing documents.
 */

import { cache } from 'react';
import firebaseConfig from '@/firebase-applet-config.json';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AnnouncementSettings,
  NewsletterSettings,
  FooterSettings,
  StorefrontSettingsBundle,
  DEFAULT_ANNOUNCEMENT_SETTINGS,
  DEFAULT_NEWSLETTER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  normalizeAnnouncementSettings,
  normalizeNewsletterSettings,
  normalizeFooterSettings,
} from '../storefront-settings';
import { parseFirestoreDocument } from './firestore-rest';

const COLLECTION_NAME = 'storefront-settings';

async function fetchDocWithSdk(docId: string): Promise<Record<string, any> | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn(`[storefront-settings] SDK fetch doc failed for '${docId}':`, err);
    return null;
  }
}

async function fetchStorefrontDocument(docId: string, tags: string[]): Promise<Record<string, any> | null> {
  const { projectId, firestoreDatabaseId, apiKey } = firebaseConfig;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents/${COLLECTION_NAME}/${docId}?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: {
        tags,
        revalidate: 3600,
      },
    });

    if (res.status === 404) {
      // Document does not exist in Firestore yet
      return null;
    }

    if (!res.ok) {
      return fetchDocWithSdk(docId);
    }

    const docObj = await res.json();
    const parsed = parseFirestoreDocument(docObj);
    return parsed ? parsed.data : await fetchDocWithSdk(docId);
  } catch (err) {
    console.warn(`[storefront-settings] REST fetch failed for '${docId}', falling back to SDK:`, err);
    return fetchDocWithSdk(docId);
  }
}

function stripPrivateFields<T extends { updatedBy?: string }>(data: T): T {
  const copy = { ...data };
  delete copy.updatedBy;
  return copy;
}

export const getAnnouncementSettings = cache(async (): Promise<AnnouncementSettings> => {
  const data = await fetchStorefrontDocument('announcement', [
    'storefront-settings',
    'storefront-settings:announcement',
  ]);
  return stripPrivateFields(normalizeAnnouncementSettings(data || DEFAULT_ANNOUNCEMENT_SETTINGS));
});

export const getNewsletterSettings = cache(async (): Promise<NewsletterSettings> => {
  const data = await fetchStorefrontDocument('newsletter', [
    'storefront-settings',
    'storefront-settings:newsletter',
  ]);
  return stripPrivateFields(normalizeNewsletterSettings(data || DEFAULT_NEWSLETTER_SETTINGS));
});

export const getFooterSettings = cache(async (): Promise<FooterSettings> => {
  const data = await fetchStorefrontDocument('footer', [
    'storefront-settings',
    'storefront-settings:footer',
  ]);
  return stripPrivateFields(normalizeFooterSettings(data || DEFAULT_FOOTER_SETTINGS));
});

export const getAllStorefrontSettings = cache(async (): Promise<StorefrontSettingsBundle> => {
  const [announcement, newsletter, footer] = await Promise.all([
    getAnnouncementSettings(),
    getNewsletterSettings(),
    getFooterSettings(),
  ]);

  return {
    announcement,
    newsletter,
    footer,
  };
});
