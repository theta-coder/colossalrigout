'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface User {
  name: string;
  email: string;
  uid?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLocalUser = localStorage.getItem('cr_local_user');
        if (savedLocalUser) {
          return JSON.parse(savedLocalUser);
        }
      } catch (e) {
        console.error("Error parsing local user in initializer:", e);
      }
    }
    return null;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        let name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        const email = firebaseUser.email || '';
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) name = data.name;
          } else {
            // Write to Firestore profile without password field
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              name,
              email,
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Firestore user document read/write error:", err);
        }

        const authenticatedUser = {
          name,
          email,
          uid: firebaseUser.uid
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('cr_local_user', JSON.stringify(authenticatedUser));
        }
        setCurrentUser(authenticatedUser);
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cr_local_user');
        }
        setCurrentUser(null);
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: 'Please fill in all fields.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;
      const userName = user.displayName || cleanEmail.split('@')[0];
      const localUser = { name: userName, email: cleanEmail, uid: user.uid };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cr_local_user', JSON.stringify(localUser));
      }
      setCurrentUser(localUser);
      return { success: true, message: 'Welcome back!' };
    } catch (e: any) {
      console.error("Firebase Login Error:", e);
      let errorMsg = 'Invalid email or password.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid email or password.';
      } else if (e.code === 'auth/too-many-requests') {
        errorMsg = 'Access to this account has been temporarily disabled due to many failed login attempts. Reset your password or try again later.';
      }
      return { success: false, message: errorMsg };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return { success: false, message: 'All fields are required.' };
    }

    if (cleanPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    try {
      // 1. Create User via Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      await updateProfile(user, { displayName: cleanName });

      // 2. Save User Profile in Firestore (NO PLAINTEXT PASSWORD)
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: cleanName,
        email: cleanEmail,
        createdAt: new Date().toISOString()
      }, { merge: true });

      const localUser = { name: cleanName, email: cleanEmail, uid: user.uid };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cr_local_user', JSON.stringify(localUser));
      }
      setCurrentUser(localUser);

      return { success: true, message: 'Account successfully created!' };
    } catch (e: any) {
      console.error("Firebase Signup Error:", e);

      if (e.code === 'auth/email-already-in-use') {
        return { success: false, message: 'An account with this email already exists.' };
      }
      if (e.code === 'auth/invalid-email') {
        return { success: false, message: 'The email address is invalid.' };
      }
      if (e.code === 'auth/weak-password') {
        return { success: false, message: 'The password is too weak. Choose at least 6 characters.' };
      }

      return { success: false, message: e.message || 'Registration failed. Please try again.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userName = user.displayName || user.email?.split('@')[0] || 'Google User';
      const userEmail = user.email || '';

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: userName,
        email: userEmail,
        createdAt: new Date().toISOString()
      }, { merge: true });

      const localUser = { name: userName, email: userEmail, uid: user.uid };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cr_local_user', JSON.stringify(localUser));
      }
      setCurrentUser(localUser);

      return { success: true, message: 'Signed in with Google successfully!' };
    } catch (e: any) {
      console.error("Google Sign-In Error:", e);

      let errorMsg = 'Google Sign-In failed.';
      if (e.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Google Sign-In popup was closed.';
      } else if (e.message) {
        errorMsg = e.message;
      }
      return { success: false, message: errorMsg };
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cr_local_user');
      }
      await signOut(auth);
      setCurrentUser(null);
    } catch (e) {
      console.error("Firebase Logout Error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, loginWithGoogle, logout, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      currentUser: null,
      isLoaded: false,
      login: async () => ({ success: false, message: '' }),
      signup: async () => ({ success: false, message: '' }),
      loginWithGoogle: async () => ({ success: false, message: '' }),
      logout: async () => {},
    };
  }
  return context;
}
