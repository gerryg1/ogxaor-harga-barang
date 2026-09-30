// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAhKOv0hTR7yVqCtUATFVqfQtuwUPOmWQw",
    authDomain: "ragnarok-harga-barang.firebaseapp.com",
    projectId: "ragnarok-harga-barang",
    storageBucket: "ragnarok-harga-barang.firebasestorage.app",
    messagingSenderId: "347308907496",
    appId: "1:347308907496:web:7bf9e344e095a47504625d"
};

// Initialize Firebase (safely for SSR/Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let db = null;
try {
  db = getFirestore(app);
} catch (e) {
  console.warn("Firestore initialization error:", e);
}

// Key Pair = BMCpZuqvQ60blpPDqo0bGL6vy2G2QuBkuwuUh4u9emX8sYBKATmy6f7V3JwS0-aMtZ5xNdAR4wkhSjZ9kcj4RwE

const COLLECTION_NAME = "item_prices";
const STORAGE_KEY = "ogxaor_ro_item_prices";

// Helper with timeout to prevent Firestore hanging
function withTimeout(promise, ms = 1500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);
}

/**
 * Save or update Item Bonus Price (syncs with /api/prices, localStorage, and Firebase)
 * @param {Object} itemData { itemId, itemName, priceBonus, droppedBy, imageUrl, iconUrl, note }
 * @returns {Promise<Object>}
 */
export async function saveItemPriceToDb(itemData) {
  const payload = {
    itemId: Number(itemData.itemId),
    itemName: itemData.itemName,
    priceBonus: Number(itemData.priceBonus) || 0,
    priceBonusFormatted: "Rp " + (Number(itemData.priceBonus) || 0).toLocaleString("id-ID"),
    droppedBy: itemData.droppedBy || "Unknown",
    imageUrl: itemData.imageUrl || `https://static.divine-pride.net/images/items/collection/${itemData.itemId}.png`,
    iconUrl: itemData.iconUrl || `https://static.divine-pride.net/images/items/item/${itemData.itemId}.png`,
    updatedAt: new Date().toISOString(),
    note: itemData.note || ""
  };

  // 1. Call Next.js API Route (triggers visible action in browser Network tab & saves to file)
  if (typeof window !== "undefined") {
    try {
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          payload.updatedAt = json.data.updatedAt;
        }
      }
    } catch (apiErr) {
      console.warn("API route save error, continuing with local fallback:", apiErr.message);
    }
  }

  // 2. Save to LocalStorage fallback
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const filtered = existing.filter(x => Number(x.itemId) !== Number(payload.itemId));
      filtered.unshift(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn("LocalStorage save error:", err);
    }
  }

  // 3. Save to Firebase Firestore in background with timeout
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, String(payload.itemId));
      await withTimeout(setDoc(docRef, { ...payload, serverTimestamp: serverTimestamp() }, { merge: true }), 1500);
    } catch (fbErr) {
      console.warn("Firebase Firestore async sync skipped/timed out:", fbErr.message);
    }
  }

  return payload;
}

/**
 * Fetch all saved item prices (from /api/prices, then Firebase, then LocalStorage)
 * @returns {Promise<Array>}
 */
export async function getAllItemPrices() {
  // 1. Try Next.js API Route first
  if (typeof window !== "undefined") {
    try {
      const res = await fetch('/api/prices');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (e) {
      console.warn("Fetch /api/prices error, falling back:", e.message);
    }
  }

  // 2. Try LocalStorage
  let localList = [];
  if (typeof window !== "undefined") {
    try {
      localList = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (localList.length > 0) return localList;
    } catch (e) {
      localList = [];
    }
  }

  // 3. Try Firebase Firestore
  if (db) {
    try {
      const querySnapshot = await withTimeout(getDocs(collection(db, COLLECTION_NAME)), 2000);
      const firebaseList = [];
      querySnapshot.forEach((docSnap) => {
        firebaseList.push(docSnap.data());
      });
      if (firebaseList.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseList));
        }
        return firebaseList;
      }
    } catch (err) {
      console.warn("Firebase fetch skipped/timed out:", err.message);
    }
  }

  return localList;
}

/**
 * Delete Item Price by Item ID
 * @param {number|string} itemId 
 */
export async function deleteItemPriceFromDb(itemId) {
  const idNum = Number(itemId);

  // 1. Call API Route
  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/prices?itemId=${idNum}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("API delete error:", err);
    }
  }

  // 2. Remove from LocalStorage
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const updated = existing.filter(x => Number(x.itemId) !== idNum);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage delete error:", e);
    }
  }

  // 3. Remove from Firebase
  if (db) {
    try {
      await withTimeout(deleteDoc(doc(db, COLLECTION_NAME, String(idNum))), 1500);
    } catch (err) {
      console.warn("Firebase delete failed/timed out:", err.message);
    }
  }

  return true;
}

/**
 * Export all saved items as JSON string
 */
export function exportDatabaseAsJson() {
  if (typeof window !== "undefined") {
    const list = localStorage.getItem(STORAGE_KEY) || "[]";
    return list;
  }
  return "[]";
}

export { app, db };