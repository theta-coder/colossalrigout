'use client';

import { auth } from './firebase';

/** Adds the signed-in administrator's Firebase ID token to internal API calls. */
export async function adminApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
