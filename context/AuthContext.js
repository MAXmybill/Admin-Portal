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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let isAuthorized = false;
        let fetchedUserDoc = null;

        if (currentUser.email?.trim().toLowerCase() === 'maxmybillapp@gmail.com') {
          isAuthorized = true;
          // Fetch super admin doc if it exists
          try {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) fetchedUserDoc = docSnap.data();
          } catch (e) { console.error(e); }
        } else {
          try {
            const userEmail = (currentUser.email || "").trim().toLowerCase();
            const q = query(collection(db, "companystaff"), where("email", "==", userEmail));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const staffDoc = querySnapshot.docs[0].data();
              if (!staffDoc.isBlocked) {
                isAuthorized = true;
                fetchedUserDoc = staffDoc;
              }
            }
          } catch (e) { console.error(e); }
        }

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

    let isAuthorized = false;
    if (result.user.email?.trim().toLowerCase() === 'maxmybillapp@gmail.com') {
      isAuthorized = true;
    } else {
      const userEmail = (result.user.email || "").trim().toLowerCase();
      const q = query(collection(db, "companystaff"), where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const staffDoc = querySnapshot.docs[0].data();
        if (!staffDoc.isBlocked) {
          isAuthorized = true;
        } else {
          await firebaseSignOut(auth);
          throw new Error('Your account has been deactivated. Please contact the administrator.');
        }
      }
    }

    if (!isAuthorized) {
      await firebaseSignOut(auth);
      throw new Error('Unauthorized email. Access denied.');
    }
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
