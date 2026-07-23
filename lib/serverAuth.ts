import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

interface VerifiedAdmin {
  uid: string;
  email: string;
}

export async function verifyFirebaseUser(request: NextRequest): Promise<VerifiedAdmin | null> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return null;
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }), cache: 'no-store'
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const user = payload.users?.[0];
    return user?.localId ? { uid: user.localId, email: String(user.email || '').toLowerCase() } : null;
  } catch { return null; }
}

export async function requireAdmin(request: NextRequest): Promise<VerifiedAdmin | NextResponse> {
  try {
    const user = await verifyFirebaseUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Admin authentication required or session expired' }, { status: 401 });
    }
    const email = user.email;
    const isPrimaryAdmin = email === 'who1sdanish011@gmail.com';
    const adminDocument = await getDoc(doc(db, 'admins', user.uid));
    if (!isPrimaryAdmin && !adminDocument.exists()) {
      return NextResponse.json({ success: false, message: 'Administrator permission required' }, { status: 403 });
    }
    return user;
  } catch {
    return NextResponse.json({ success: false, message: 'Unable to verify administrator session' }, { status: 401 });
  }
}
