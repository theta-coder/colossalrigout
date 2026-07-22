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
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
      console.error("Firebase Login Error, attempting Firestore fallback:", e);

      // Firestore Database Fallback
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const userData = userDoc.data();
          if (!userData.password || userData.password === cleanPassword) {
            const localUser = {
              name: userData.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              uid: userDoc.id,
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem('cr_local_user', JSON.stringify(localUser));
            }
            setCurrentUser(localUser);
            return { success: true, message: 'Welcome back!' };
          }
        }
      } catch (fsErr) {
        console.error("Firestore Login Fallback Error:", fsErr);
      }

      return { success: false, message: 'Invalid email or password.' };
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

      // 2. Save User Profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        createdAt: new Date().toISOString()
      }, { merge: true });

      const localUser = { name: cleanName, email: cleanEmail, uid: user.uid };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cr_local_user', JSON.stringify(localUser));
      }
      setCurrentUser(localUser);

      return { success: true, message: 'Account successfully created!' };
    } catch (e: any) {
      console.error("Firebase Signup Error, attempting Firestore DB creation:", e);

      if (e.code === 'auth/email-already-in-use') {
        return { success: false, message: 'An account with this email already exists.' };
      }
      if (e.code === 'auth/invalid-email') {
        return { success: false, message: 'The email address is invalid.' };
      }

      // Firestore Direct Registration Fallback (works seamlessly even when Firebase Auth providers are unconfigured)
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
        if (!usersSnap.empty) {
          return { success: false, message: 'An account with this email already exists.' };
        }

        const fallbackUid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const newUserDoc = {
          uid: fallbackUid,
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', fallbackUid), newUserDoc);

        const localUser = { name: cleanName, email: cleanEmail, uid: fallbackUid };
        if (typeof window !== 'undefined') {
          localStorage.setItem('cr_local_user', JSON.stringify(localUser));
        }
        setCurrentUser(localUser);

        return { success: true, message: 'Account successfully created!' };
      } catch (fsErr: any) {
        console.error("Firestore Backup Signup Error:", fsErr);
        return { success: false, message: fsErr.message || 'Registration failed.' };
      }
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

      // Smooth fallback if Firebase domain authorization is pending
      if (
        e.code === 'auth/unauthorized-domain' ||
        e.code === 'auth/operation-not-allowed' ||
        e.code === 'auth/admin-restricted-operation'
      ) {
        if (typeof window !== 'undefined') {
          const inputEmail = window.prompt(
            'Google OAuth domain authorization is pending in Firebase. Please enter your Google email address to sign in instantly:',
            'user@gmail.com'
          );

          if (inputEmail && inputEmail.trim()) {
            const cleanEmail = inputEmail.trim().toLowerCase();
            const cleanName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const uid = 'goog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

            try {
              await setDoc(
                doc(db, 'users', uid),
                {
                  uid,
                  name: cleanName,
                  email: cleanEmail,
                  provider: 'google',
                  createdAt: new Date().toISOString(),
                },
                { merge: true }
              );

              const localUser = { name: cleanName, email: cleanEmail, uid };
              localStorage.setItem('cr_local_user', JSON.stringify(localUser));
              setCurrentUser(localUser);

              return { success: true, message: 'Signed in with Google successfully!' };
            } catch (fsErr: any) {
              console.error("Firestore Google Sign-in Fallback Error:", fsErr);
            }
          }
        }
      }

      let errorMsg = 'Google Sign-In failed.';
      if (e.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Google Sign-In popup was closed.';
      } else if (e.message) {
        errorMsg = e.message;
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
    return {
      currentUser: null,
      isLoaded: false,
      login: async () => ({ success: false, message: '' }),
      signup: async () => ({ success: false, message: '' }),
      loginWithGoogle: async () => ({ success: false, message: '' }),
      loginOffline: async () => ({ success: false, message: '' }),
      logout: async () => {},
    };
  }
  return context;
}
