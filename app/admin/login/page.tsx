'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Lock, Mail, AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirect to admin dashboard if already logged in as admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is admin
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const isPrimaryAdmin = user.email === 'who1sdanish011@gmail.com';
          
          if (adminDoc.exists() || isPrimaryAdmin) {
            router.push('/admin');
            return;
          }
        } catch (e) {
          console.error("Error verifying admin status:", e);
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verify if they are an admin
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const isPrimaryAdmin = user.email === 'who1sdanish011@gmail.com';

      if (adminDoc.exists() || isPrimaryAdmin) {
        localStorage.setItem('cr_admin_session', 'true');
        router.push('/admin');
      } else {
        setError('Access Denied: You do not have administrator permissions.');
        await auth.signOut();
      }
    } catch (err: any) {
      console.error("Admin signin error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid admin credentials. Please try again.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Firebase Email/Password Auth is disabled in Firebase Console. Please contact the system administrator.');
      } else {
        setError(err.message || 'An unexpected error occurred during login.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#f4f4f3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm text-neutral-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f3] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6 hover:opacity-85 transition">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">Back to Store</span>
        </Link>
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-4">
            <ShieldAlert className="w-3.5 h-3.5" /> SECURE ADMIN GATEWAY
          </span>
          <h2 className="font-display text-3xl font-extrabold text-neutral-900 tracking-tight">
            COLOSSAL RIGOUT
          </h2>
          <p className="mt-1 text-sm text-neutral-500 font-light">
            Sign in to manage inventory, products, and customer orders
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-neutral-200/50">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRealLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Admin Email Address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@colossalrigout.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm bg-[#fbfbfb] text-neutral-800 outline-none focus:border-black transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Secret Access Key
              </label>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm bg-[#fbfbfb] text-neutral-800 outline-none focus:border-black transition"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 active:scale-95 transition flex items-center justify-center gap-2 disabled:bg-neutral-400"
              >
                {loading ? 'Authenticating Admin...' : 'AUTHORIZED SIGN IN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
