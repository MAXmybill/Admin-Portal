import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1CM-Q4XNV7zOs6XQTSIqetOYUwohC0zA",
  authDomain: "maxbillup.firebaseapp.com",
  databaseURL: "https://maxbillup-default-rtdb.firebaseio.com",
  projectId: "maxbillup",
  storageBucket: "maxbillup.firebasestorage.app",
  messagingSenderId: "490905109908",
  appId: "1:490905109908:web:058b2b933dafaaa007fb81",
  measurementId: "G-3B058Z33F8"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Secondary app for creating users without logging out the current admin
const secondaryApp = getApps().find(a => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

export { app, auth, db, secondaryAuth };
