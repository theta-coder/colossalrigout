'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, UserPlus, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

function SignupContent() {
  const { signup, loginWithGoogle, currentUser, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = searchParams.get('redirect') || searchParams.get('returnTo') || '/order-history';

  // If already logged in, redirect
  useEffect(() => {
    if (isLoaded && currentUser) {
      router.push(redirectPath);
    }
  }, [currentUser, isLoaded, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await signup(name, email, password);
      setIsLoading(false);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          router.push(redirectPath);
        }, 800);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Registration failed.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await loginWithGoogle();
      setIsLoading(false);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          router.push(redirectPath);
        }, 800);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Google Sign-In failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f3] flex flex-col items-center justify-center p-4 py-12 font-sans">
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <Link href="/" className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-1.5 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Store
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-2xl shadow-sm p-6 sm:p-8 animate-fade-up">
        {/* Brand Logo & Title */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black shadow-xs ring-1 ring-black/10">
              <Image src="/colossal-rigout-logo.png" alt="Logo" fill className="object-cover scale-[1.75]" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              Colossal<span className="text-neutral-400">Rigout</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-neutral-900 tracking-tight">
            CREATE ACCOUNT
          </h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 font-light">
            Sign up to build your wardrobe, track orders, and view history.
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
            <span className="whitespace-pre-line leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 bg-green-50 border border-green-200 text-green-600 rounded text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-none" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Danish Ali"
                className="w-full pl-9 pr-4 py-2.5 border border-neutral-300 rounded text-xs sm:text-sm focus:outline-none focus:border-black transition bg-neutral-50/30"
              />
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2.5 border border-neutral-300 rounded text-xs sm:text-sm focus:outline-none focus:border-black transition bg-neutral-50/30"
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-4 py-2.5 border border-neutral-300 rounded text-xs sm:text-sm focus:outline-none focus:border-black transition bg-neutral-50/30"
              />
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white text-xs sm:text-sm font-bold py-3 rounded hover:bg-neutral-800 transition active:scale-95 shadow flex items-center justify-center gap-2 cursor-pointer disabled:bg-neutral-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> CREATE ACCOUNT
              </>
            )}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
            <span className="bg-white px-3 text-neutral-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          type="button"
          className="w-full border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-bold py-2.5 rounded transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:bg-neutral-100 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 2.138 15.498 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.56-4.437 10.56-10.74 0-.72-.078-1.27-.174-1.975H12.24z"
            />
          </svg>
          SIGN UP WITH GOOGLE
        </button>



        {/* Login Link */}
        <div className="mt-6 text-center text-xs sm:text-sm text-neutral-500">
          Already have an account?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-black font-semibold underline hover:text-neutral-700 transition"
          >
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="w-8 h-8 border-3 border-black/20 border-t-black rounded-full animate-spin inline-block"></span>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
