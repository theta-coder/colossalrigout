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
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

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
  loginOffline: (name: string, email: string) => Promise<{ success: boolean; message: string }>;
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

  const [isLoaded, setIsLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('cr_local_user');
    }
    return false;
  });

  // Monitor Firebase Authentication State
  useEffect(() => {
    // If we initialized loaded state from localStorage, we don't need to block
    // but we can still register onAuthStateChanged to pick up Firebase logins if they sign out/in
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // If there is an offline/local session active, ignore firebase auth state changes
      if (typeof window !== 'undefined' && localStorage.getItem('cr_local_user')) {
        setIsLoaded(true);
        return;
      }

      if (firebaseUser) {
        // Sync user profile from Firestore or Auth details
        let name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        const email = firebaseUser.email || '';
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) name = data.name;
          } else {
            // Write to Firestore if profile doesn't exist
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              name,
              email,
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Firestore connection testing or user document read failed:", err);
        }

        setCurrentUser({
          name,
          email,
          uid: firebaseUser.uid
        });
      } else {
        setCurrentUser(null);
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: 'Please fill in all fields.' };
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      return { success: true, message: 'Welcome back!' };
    } catch (e: any) {
      console.error("Firebase Login Error:", e);
      let errorMsg = 'Invalid email or password.';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        errorMsg = 'Invalid email or password.';
      } else if (e.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
      } else if (e.code === 'auth/operation-not-allowed') {
        errorMsg = "Email/Password accounts are currently disabled in your Firebase project. To enable them:\n\n1. Open your Firebase Console\n2. Go to Authentication > Sign-in method\n3. Click 'Add new provider' and choose 'Email/Password'\n4. Turn on Email/Password and click Save.\n\nAlternatively, you can log in instantly by clicking 'Bypass with Offline Demo Mode'.";
      } else if (e.message) {
        errorMsg = e.message;
      }
      return { success: false, message: errorMsg };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return { success: false, message: 'All fields are required.' };
    }

    if (cleanPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      // 2. Set Display Name
      await updateProfile(user, { displayName: cleanName });

      // 3. Save User Profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, {
          name: cleanName,
          email: cleanEmail,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      return { success: true, message: 'Account successfully created!' };
    } catch (e: any) {
      console.error("Firebase Signup Error:", e);
      let errorMsg = 'An error occurred during registration.';
      if (e.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists.';
      } else if (e.code === 'auth/invalid-email') {
        errorMsg = 'The email address is invalid.';
      } else if (e.code === 'auth/weak-password') {
        errorMsg = 'The password is too weak.';
      } else if (e.code === 'auth/operation-not-allowed') {
        errorMsg = "Email/Password accounts are currently disabled in your Firebase project. To enable them:\n\n1. Open your Firebase Console\n2. Go to Authentication > Sign-in method\n3. Click 'Add new provider' and choose 'Email/Password'\n4. Turn on Email/Password and click Save.\n\nAlternatively, you can register instantly by clicking 'Bypass with Offline Demo Mode'.";
      } else if (e.message) {
        errorMsg = e.message;
      }
      return { success: false, message: errorMsg };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, {
          name: user.displayName || 'Google User',
          email: user.email || '',
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      return { success: true, message: 'Signed in with Google successfully!' };
    } catch (e: any) {
      console.error("Google Sign-In Error:", e);
      let errorMsg = e.message || 'Google Sign-In failed.';
      if (e.code === 'auth/operation-not-allowed') {
        errorMsg = "Google Sign-In is currently disabled in your Firebase project. To enable it:\n\n1. Open your Firebase Console\n2. Go to Authentication > Sign-in method\n3. Click 'Add new provider' and choose 'Google'\n4. Fill in your project credentials and click Save.\n\nAlternatively, you can log in instantly by clicking 'Bypass with Offline Demo Mode'.";
      }
      return { success: false, message: errorMsg };
    }
  };

  const loginOffline = async (name: string, email: string) => {
    const cleanName = name.trim() || 'Demo User';
    const cleanEmail = email.trim() || 'demo@colossalrigout.pk';
    
    const localUser = {
      name: cleanName,
      email: cleanEmail,
      uid: 'offline_demo_user'
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('cr_local_user', JSON.stringify(localUser));
    }
    
    setCurrentUser(localUser);
    return { success: true, message: 'Welcome to Colossal Rigout (Offline Demo Session)!' };
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
    <AuthContext.Provider value={{ currentUser, login, signup, loginWithGoogle, loginOffline, logout, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
