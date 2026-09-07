import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  let date;
  if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (typeof timestamp === "object" && (timestamp.seconds != null || timestamp._seconds != null)) {
    date = new Date((timestamp.seconds ?? timestamp._seconds) * 1000);
  } else if (typeof timestamp === "number") {
    date = timestamp < 1e11 ? new Date(timestamp * 1000) : new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }
  if (!date || isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function calculateMembershipDays(timestamp) {
  if (!timestamp) return 0;
  const date = parseDate(timestamp);
  if (!date) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function parseDate(timestamp) {
  if (!timestamp) return null;
  let date;
  if (typeof timestamp === "object" && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (typeof timestamp === "object" && (timestamp.seconds != null || timestamp._seconds != null)) {
    date = new Date((timestamp.seconds ?? timestamp._seconds) * 1000);
  } else if (typeof timestamp === "number") {
    date = timestamp < 1e11 ? new Date(timestamp * 1000) : new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }
  if (!date || isNaN(date.getTime())) return null;
  return date;
}

export function isPlanExpired(store) {
  if (!store) return false;
  if (store.isExpired === true || store.planExpired === true) return true;

  const expiryRaw =
    store.subscriptionExpiryDate ||
    store.expiryDate ||
    store.planExpiresAt ||
    store.trialExpires;

  if (!expiryRaw) return false;

  const expDate = parseDate(expiryRaw);
  if (!expDate) return false;

  return new Date() > expDate;
}

export function isStoreActive(store) {
  if (!store) return false;
  if (store.isActive === false) return false;
  if (isPlanExpired(store)) return false;
  return true;
}

export function getStoreStatus(store) {
  if (!store) return { status: "inactive", label: "Inactive", color: "rose" };
  if (store.isActive === false) {
    return { status: "blocked", label: "Inactive", subLabel: "Blocked", color: "rose" };
  }
  if (isPlanExpired(store)) {
    return { status: "expired", label: "Inactive", subLabel: "Expired", color: "rose" };
  }
  return { status: "active", label: "Active", subLabel: null, color: "emerald" };
}

