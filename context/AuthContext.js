"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut
} from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  userDoc: null,
  loading: true,
  login: async () => { },
  logout: async () => { },
  isSuperAdmin: false,
  hasEditAccess: false,
});

async function verifyAndFetchUser(currentUser) {
  if (!currentUser) {
    return { isAuthorized: false, isBlocked: false, userDoc: null };
  }

  const email = (currentUser.email || "").trim().toLowerCase();

  // Super admin check
  if (email === 'maxmybillapp@gmail.com') {
    let fetchedUserDoc = null;
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) fetchedUserDoc = docSnap.data();
    } catch (e) {
      console.error("Error fetching super admin doc:", e);
    }
    return { isAuthorized: true, isBlocked: false, userDoc: fetchedUserDoc };
  }

  // Company staff check
  try {
    const q = query(collection(db, "companystaff"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const staffDoc = querySnapshot.docs[0].data();
      if (staffDoc.isBlocked) {
        return { isAuthorized: false, isBlocked: true, userDoc: null };
      }
      return { isAuthorized: true, isBlocked: false, userDoc: staffDoc };
    }
  } catch (e) {
    console.error("Error fetching staff doc:", e);
  }

  return { isAuthorized: false, isBlocked: false, userDoc: null };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const { isAuthorized, userDoc: fetchedUserDoc } = await verifyAndFetchUser(currentUser);

        if (!isAuthorized) {
          await firebaseSignOut(auth);
          setUser(null);
          setUserDoc(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        setUserDoc(fetchedUserDoc);
      } else {
        setUser(null);
        setUserDoc(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const { isAuthorized, isBlocked, userDoc: fetchedUserDoc } = await verifyAndFetchUser(result.user);

    if (isBlocked) {
      await firebaseSignOut(auth);
      setUser(null);
      setUserDoc(null);
      throw new Error('Your account has been deactivated. Please contact the administrator.');
    }

    if (!isAuthorized) {
      await firebaseSignOut(auth);
      setUser(null);
      setUserDoc(null);
      throw new Error('Unauthorized email. Access denied.');
    }

    // Synchronously set authenticated user state before login() resolves
    setUser(result.user);
    setUserDoc(fetchedUserDoc);
    setLoading(false);

    return result;
  };

  const logout = async () => {
    setUser(null);
    setUserDoc(null);
    await firebaseSignOut(auth);
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  const isSuperAdmin = user?.email?.trim().toLowerCase() === 'maxmybillapp@gmail.com';
  const hasEditAccess = isSuperAdmin || userDoc?.accessLevel === 'edit';

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, login, logout, isSuperAdmin, hasEditAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
