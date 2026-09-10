import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  databaseURL: "https://maxbillup-default-rtdb.firebaseio.com",
  projectId: "maxbillup",
  storageBucket: "maxbillup.firebasestorage.app",
  messagingSenderId: "490905109908",
  appId: "1:490905109908:web:058b2b933dafaaa007fb81",
  measurementId: "G-3B058Z33F8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const storesToKeep = new Set([
  "100007", "100010", "100012", "100013", "100014", "100017",
  "100018", "100023", "100026", "100029", "100047", "100051",
  "100057", "100060", "100068", "100069", "100070", "100073",
  "100074", "100075", "100080", "100081", "100082", "100083",
  "100084", "100086", "100087", "100088", "100089", "100090",
  "100091"
]);

async function main() {
  const snap = await getDocs(collection(db, "store"));
  const allStores = snap.docs.map(d => ({ id: d.id, name: d.data().businessName || "Unnamed" }));
  console.log(`Total live stores in database: ${allStores.length}`);
  allStores.forEach(s => {
    const kept = storesToKeep.has(s.id) ? "[KEPT]" : "[OTHER]";
    console.log(` - ${kept} ${s.id}: ${s.name}`);
  });
}

main().catch(console.error);
