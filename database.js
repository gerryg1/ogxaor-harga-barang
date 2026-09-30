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

/**
 * Save or update Item Bonus Price (saves to Firebase & syncs to local storage)
 * @param {Object} itemData { itemId, itemName, priceBonus, droppedBy, imageUrl, iconUrl, note }
 * @returns {Promise<Object>}
 */
export async function saveItemPriceToDb(itemData) {
  const payload = {
    itemId: Number(itemData.itemId),
    itemName: itemData.itemName,
    priceBonus: Number(itemData.priceBonus) || 0,
    priceBonusFormatted: (Number(itemData.priceBonus) || 0).toLocaleString("id-ID") + " Zeny",
    droppedBy: itemData.droppedBy || "Unknown",
    imageUrl: itemData.imageUrl || `https://static.divine-pride.net/images/items/collection/${itemData.itemId}.png`,
    iconUrl: itemData.iconUrl || `https://static.divine-pride.net/images/items/item/${itemData.itemId}.png`,
    updatedAt: new Date().toISOString(),
    note: itemData.note || ""
  };

  // 1. Save to LocalStorage / In-memory fallback
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const filtered = existing.filter(x => x.itemId !== payload.itemId);
      filtered.unshift(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn("LocalStorage save error:", err);
    }
  }

  // 2. Save to Firebase Firestore if reachable
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, String(payload.itemId));
      await setDoc(docRef, { ...payload, serverTimestamp: serverTimestamp() }, { merge: true });
    } catch (fbErr) {
      console.warn("Firebase Firestore save skipped/failed (rules or network):", fbErr.message);
    }
  }

  return payload;
}

/**
 * Fetch all saved item prices (from Firebase with LocalStorage fallback)
 * @returns {Promise<Array>}
 */
export async function getAllItemPrices() {
  let localList = [];
  if (typeof window !== "undefined") {
    try {
      localList = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      localList = [];
    }
  }

  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const firebaseList = [];
      querySnapshot.forEach((docSnap) => {
        firebaseList.push(docSnap.data());
      });
      if (firebaseList.length > 0) {
        // Sync back to local storage
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseList));
        }
        return firebaseList;
      }
    } catch (err) {
      console.warn("Firebase fetch failed, using local storage:", err.message);
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
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const updated = existing.filter(x => Number(x.itemId) !== idNum);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage delete error:", e);
    }
  }

  if (db) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, String(idNum)));
    } catch (err) {
      console.warn("Firebase delete failed:", err.message);
    }
  }

  return true;
}

/**
 * Export all saved items as JSON string or download as file
 */
export function exportDatabaseAsJson() {
  if (typeof window !== "undefined") {
    const list = localStorage.getItem(STORAGE_KEY) || "[]";
    return list;
  }
  return "[]";
}

export { app, db };