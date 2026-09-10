import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Real-Time Direct Firestore Data Workers
 * Zero Caching: All metrics and store details are queried directly from live Firestore.
 */

// Cleanup helper to purge any lingering browser storage keys
export function purgeAllLocalCaches() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("max_platform_sales_metrics_cache");
      localStorage.removeItem("max_platform_sales_metrics_cache_v2");
      // Remove all store session cache keys
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("max_store_cache_")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (_) {}
  }
}

// Backward-compatible stub returning null to ensure 100% live fetch
export function getStoreCache() {
  return null;
}

export function getPersistedPlatformSalesMap() {
  purgeAllLocalCaches();
  return {};
}

export function prefetchStoreWithAStar() {
  // No-op: Caching disabled per user request
}

/**
 * Fetch all store subcollections in PARALLEL directly from live Firestore
 */
export async function fetchStoreDataParallel(storeId) {
  if (!storeId) return null;
  const sid = storeId.toString();

  try {
    const [productsRes, salesRes, staffRes, customersRes, expensesRes] = await Promise.allSettled([
      fetchProducts(sid),
      fetchSales(sid),
      fetchStaff(sid),
      fetchCustomers(sid),
      fetchExpenses(sid),
    ]);

    return {
      products: productsRes.status === "fulfilled" ? productsRes.value : [],
      sales: salesRes.status === "fulfilled" ? salesRes.value : [],
      staff: staffRes.status === "fulfilled" ? staffRes.value : [],
      customers: customersRes.status === "fulfilled" ? customersRes.value : [],
      expenses: expensesRes.status === "fulfilled" ? expensesRes.value : [],
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error(`Parallel live fetch error for store ${sid}:`, err);
    throw err;
  }
}

/* =========================================================================
   LIVE SUBCOLLECTION QUERY WORKERS (Direct Firestore)
   ========================================================================= */

async function fetchProducts(storeId) {
  let itemsList = [];
  try {
    const snap = await getDocs(collection(db, "store", storeId, "Products"));
    itemsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  if (itemsList.length === 0) {
    try {
      const snap = await getDocs(collection(db, "store", storeId, "products"));
      itemsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (_) {}
  }

  if (itemsList.length === 0) {
    try {
      const snap = await getDocs(collection(db, "store", storeId, "items"));
      itemsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (_) {}
  }

  itemsList.sort((a, b) => (a.itemName || a.name || "").localeCompare(b.itemName || b.name || ""));
  return itemsList;
}

export async function fetchSales(storeId) {
  let salesList = [];
  try {
    const snap = await getDocs(collection(db, "store", storeId, "sales"));
    salesList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  if (salesList.length === 0) {
    try {
      const snap = await getDocs(collection(db, "store", storeId, "bills"));
      salesList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (_) {}
  }

  salesList.sort((a, b) => {
    const getDate = (item) => {
      const t = item.timestamp || item.date || item.createdAt;
      if (!t) return 0;
      if (t.toMillis) return t.toMillis();
      if (t.seconds) return t.seconds * 1000;
      return new Date(t).getTime() || 0;
    };
    return getDate(b) - getDate(a);
  });

  return salesList;
}

async function fetchStaff(storeId) {
  const staffMap = new Map();
  try {
    const [subSnap, rootSnap] = await Promise.allSettled([
      getDocs(collection(db, "store", storeId, "users")),
      getDocs(query(collection(db, "users"), where("storeId", "==", storeId))),
    ]);

    if (subSnap.status === "fulfilled") {
      subSnap.value.docs.forEach((d) => staffMap.set(d.id, { id: d.id, ...d.data() }));
    }
    if (rootSnap.status === "fulfilled") {
      rootSnap.value.docs.forEach((d) => {
        if (!staffMap.has(d.id)) {
          staffMap.set(d.id, { id: d.id, ...d.data() });
        } else {
          staffMap.set(d.id, { ...staffMap.get(d.id), ...d.data() });
        }
      });
    }
  } catch (_) {}

  if (staffMap.size === 0) {
    try {
      const staffSnap = await getDocs(collection(db, "store", storeId, "staff"));
      staffSnap.docs.forEach((d) => staffMap.set(d.id, { id: d.id, ...d.data() }));
    } catch (_) {}
  }

  return Array.from(staffMap.values());
}

async function fetchCustomers(storeId) {
  let custList = [];
  try {
    const snap = await getDocs(collection(db, "store", storeId, "customers"));
    custList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  custList.sort(
    (a, b) =>
      (Number(b.balance) || 0) - (Number(a.balance) || 0) ||
      (Number(b.totalSales) || 0) - (Number(a.totalSales) || 0)
  );
  return custList;
}

async function fetchExpenses(storeId) {
  let expList = [];
  try {
    const snap = await getDocs(collection(db, "store", storeId, "expenses"));
    expList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  if (expList.length === 0) {
    try {
      const snap = await getDocs(collection(db, "store", storeId, "otherExpenses"));
      expList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (_) {}
  }

  expList.sort((a, b) => {
    const getDate = (item) => {
      const t = item.timestamp || item.date || item.createdAt;
      if (!t) return 0;
      if (t.toMillis) return t.toMillis();
      if (t.seconds) return t.seconds * 1000;
      return new Date(t).getTime() || 0;
    };
    return getDate(b) - getDate(a);
  });

  return expList;
}

/* =========================================================================
   DIRECT LIVE METRICS QUERY (Zero Cache, 100% Real Time)
   ========================================================================= */

export async function fetchStoreSalesMetrics(storeId) {
  if (!storeId) return { billCount: 0, totalSales: 0 };
  const sid = storeId.toString();

  try {
    const salesList = await fetchSales(sid);
    const billCount = salesList.length;
    const totalSales = salesList.reduce(
      (sum, s) => sum + (Number(s.total ?? s.totalAmount ?? s.grandTotal ?? 0) || 0),
      0
    );

    return { billCount, totalSales };
  } catch (err) {
    return { billCount: 0, totalSales: 0 };
  }
}
