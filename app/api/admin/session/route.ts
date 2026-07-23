import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { verifyFirebaseUser } from '../../../../lib/serverAuth';

const ADMIN_COOKIE = 'cr_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export async function POST(request: NextRequest) {
  const user = await verifyFirebaseUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired authentication token.' },
      { status: 401 },
    );
  }

  const email = user.email;
  const isPrimaryAdmin = email === 'who1sdanish011@gmail.com';

  let isAdminDoc = false;
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    isAdminDoc = adminDoc.exists();
  } catch {
    // Firestore rules may deny if not admin — treat as not admin
  }

  if (!isPrimaryAdmin && !isAdminDoc) {
    return NextResponse.json(
      { success: false, message: 'Administrator permission required.' },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ success: true, message: 'Admin session created.' });

  response.cookies.set(ADMIN_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Admin session cleared.' });

  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
