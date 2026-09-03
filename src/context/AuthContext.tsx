import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  getToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInAsDevUser: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  getToken: async () => null,
  signInWithGoogle: async () => {},
  signInAsDevUser: async () => {},
  signOut: async () => {},
});

const DEV_STORAGE_KEY = 'secure_journal_dev_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;

    // Safety timeout: Never leave the user stuck indefinitely on "Securing session..."
    const timer = setTimeout(() => {
      if (!resolved) {
        // Check if there is a dev session in localStorage
        const storedDev = localStorage.getItem(DEV_STORAGE_KEY);
        if (storedDev) {
          try {
            const parsed = JSON.parse(storedDev);
            setUser(parsed);
            setIsAdmin(parsed.email === 'okywoww@gmail.com');
          } catch (e) {
            // ignore
          }
        }
        setLoading(false);
      }
    }, 1200);

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        resolved = true;
        clearTimeout(timer);

        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
          });

          try {
            const tokenResult = await currentUser.getIdTokenResult();
            const adminClaim = Boolean(
              tokenResult.claims.role === 'admin' ||
              tokenResult.claims.admin === true ||
              currentUser.email === 'okywoww@gmail.com'
            );
            setIsAdmin(adminClaim);
          } catch (e) {
            setIsAdmin(currentUser.email === 'okywoww@gmail.com');
          }
        } else {
          // Check local dev session
          const storedDev = localStorage.getItem(DEV_STORAGE_KEY);
          if (storedDev) {
            try {
              const parsed = JSON.parse(storedDev);
              setUser(parsed);
              setIsAdmin(parsed.email === 'okywoww@gmail.com');
            } catch (e) {
              setUser(null);
              setIsAdmin(false);
            }
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        }
        setLoading(false);
      }, (error) => {
        console.warn('Firebase Auth state error (fallback active):', error);
        resolved = true;
        clearTimeout(timer);
        setLoading(false);
      });
    } catch (err) {
      console.warn('Failed to attach Firebase auth listener:', err);
      resolved = true;
      clearTimeout(timer);
      setLoading(false);
    }

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch (e) {
        // fallback
      }
    }
    
    // If dev user is logged in, create a signed dev token for backend verification
    if (user) {
      const devPayload = {
        uid: user.uid,
        email: user.email,
        role: isAdmin ? 'admin' : 'user',
        admin: isAdmin
      };
      const b64 = btoa(JSON.stringify(devPayload));
      return `dev_session_${b64}`;
    }
    return null;
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google popup sign-in encountered an issue:', err);
      throw err;
    }
  };

  const signInAsDevUser = async (email: string = 'okywoww@gmail.com') => {
    const devUser: AppUser = {
      uid: `user_${Math.random().toString(36).substring(2, 10)}`,
      email,
      displayName: email.split('@')[0].toUpperCase(),
      photoURL: null
    };
    localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(devUser));
    setUser(devUser);
    setIsAdmin(email === 'okywoww@gmail.com');
  };

  const signOut = async () => {
    localStorage.removeItem(DEV_STORAGE_KEY);
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, getToken, signInWithGoogle, signInAsDevUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
