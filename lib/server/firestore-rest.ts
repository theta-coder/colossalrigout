/**
 * lib/server/firestore-rest.ts
 * 
 * Server-native, stateless Firestore REST client for Next.js Server Components.
 * Avoids browser SDK initialization, preventing memory state leaks in RSC payloads.
 * Supports Next.js fetch caching, tags, and automated revalidation.
 */

import firebaseConfig from '@/firebase-applet-config.json';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreRestDoc {
  id: string;
  data: Record<string, any>;
}

export function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function parseFirestoreDocument(docObj: any): FirestoreRestDoc | null {
  if (!docObj || !docObj.name) return null;
  const nameParts = docObj.name.split('/');
  const id = nameParts[nameParts.length - 1];
  const fields = docObj.fields || {};
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = parseFirestoreValue(v);
  }
  return { id, data };
}

export interface FetchCollectionOptions {
  collectionName: string;
  whereEquals?: Array<{ field: string; value: string | boolean | number }>;
  orderBy?: { field: string; direction?: 'ASCENDING' | 'DESCENDING' };
  limit?: number;
  tags?: string[];
  revalidate?: number;
}

/**
 * The Google REST endpoint does not carry the Firebase Web SDK's request
 * context and some named databases reject it even though the SDK can read the
 * same public storefront data. Keep the fast/cacheable REST path, but fall
 * back to the SDK instead of turning a permission response into an empty
 * homepage.
 */
async function fetchCollectionWithSdk(options: FetchCollectionOptions): Promise<FirestoreRestDoc[]> {
  const snapshot = await getDocs(collection(db, options.collectionName));
  let docs: FirestoreRestDoc[] = snapshot.docs.map(item => ({
    id: item.id,
    data: item.data() as Record<string, any>,
  }));

  for (const filter of options.whereEquals || []) {
    docs = docs.filter(item => item.data[filter.field] === filter.value);
  }

  if (options.orderBy) {
    const { field, direction = 'ASCENDING' } = options.orderBy;
    const multiplier = direction === 'DESCENDING' ? -1 : 1;
    docs.sort((a, b) => {
      const left = a.data[field];
      const right = b.data[field];
      return (left < right ? -1 : left > right ? 1 : 0) * multiplier;
    });
  }

  return options.limit ? docs.slice(0, options.limit) : docs;
}

export async function fetchFirestoreRestCollection(options: FetchCollectionOptions): Promise<FirestoreRestDoc[]> {
  const { projectId, firestoreDatabaseId, apiKey } = firebaseConfig;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents`;

  const fetchInit: RequestInit & { next?: { tags?: string[]; revalidate?: number } } = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    next: {
      tags: options.tags || ['homepage'],
      revalidate: options.revalidate ?? 3600,
    },
  };

  try {
    // Standard list query if no complex filters
    if (!options.whereEquals?.length && !options.orderBy && !options.limit) {
      const url = `${baseUrl}/${options.collectionName}?key=${apiKey}&pageSize=100`;
      const res = await fetch(url, fetchInit);
      if (!res.ok) return fetchCollectionWithSdk(options);
      const json = await res.json();
      const docs: any[] = json.documents || [];
      return docs.map(parseFirestoreDocument).filter((d): d is FirestoreRestDoc => d !== null);
    }

    // RunQuery for structured queries
    const queryUrl = `${baseUrl}:runQuery?key=${apiKey}`;
    const structuredQuery: any = {
      from: [{ collectionId: options.collectionName }],
    };

    if (options.whereEquals && options.whereEquals.length > 0) {
      const filters = options.whereEquals.map(w => {
        let valueField: any = { stringValue: String(w.value) };
        if (typeof w.value === 'boolean') valueField = { booleanValue: w.value };
        else if (typeof w.value === 'number') valueField = { integerValue: w.value };
        return {
          fieldFilter: {
            field: { fieldPath: w.field },
            op: 'EQUAL',
            value: valueField,
          },
        };
      });

      if (filters.length === 1) {
        structuredQuery.where = filters[0];
      } else {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters,
          },
        };
      }
    }

    if (options.orderBy) {
      structuredQuery.orderBy = [
        {
          field: { fieldPath: options.orderBy.field },
          direction: options.orderBy.direction || 'ASCENDING',
        },
      ];
    }

    if (options.limit) {
      structuredQuery.limit = options.limit;
    }

    const postInit: RequestInit & { next?: { tags?: string[]; revalidate?: number } } = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
      next: {
        tags: options.tags || ['homepage'],
        revalidate: options.revalidate ?? 3600,
      },
    };

    const res = await fetch(queryUrl, postInit);
    if (!res.ok) {
      // Fallback to GET list if runQuery is unavailable or requires index
      const fallbackUrl = `${baseUrl}/${options.collectionName}?key=${apiKey}&pageSize=100`;
      const fallbackRes = await fetch(fallbackUrl, fetchInit);
      if (!fallbackRes.ok) return fetchCollectionWithSdk(options);
      const json = await fallbackRes.json();
      const docs: any[] = json.documents || [];
      return docs.map(parseFirestoreDocument).filter((d): d is FirestoreRestDoc => d !== null);
    }

    const results: any[] = await res.json();
    const docs: FirestoreRestDoc[] = [];
    for (const item of results) {
      if (item.document) {
        const parsed = parseFirestoreDocument(item.document);
        if (parsed) docs.push(parsed);
      }
    }
    return docs;
  } catch (err) {
    console.warn(`[firestore-rest] REST fetch failed for ${options.collectionName}; using Firebase SDK fallback.`);
    try {
      return await fetchCollectionWithSdk(options);
    } catch (fallbackError) {
      console.error(`[firestore-rest] SDK fallback failed for ${options.collectionName}:`, fallbackError);
      return [];
    }
  }
}
