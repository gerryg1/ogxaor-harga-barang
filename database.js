// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
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
 * Realtime Live Listener for all connected devices (PC, Laptop, HP / Mobile)
 * @param {Function} onUpdate Callback when data changes anywhere
 * @param {Function} onError Callback if Firestore has permission/disabled issue
 * @returns {Function} Unsubscribe function
 */
export function subscribeToItemPrices(onUpdate, onError) {
  if (!db || typeof window === "undefined") return () => {};

  try {
    const unsub = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        
        // Cache to local storage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (_) {}

        onUpdate(list);
      },
      (err) => {
        console.warn("Firestore realtime live listener issue:", err.message);
        if (onError) onError(err);
      }
    );
    return unsub;
  } catch (err) {
    console.warn("Could not attach realtime listener:", err);
    return () => {};
  }
}

/**
 * Save or update Item Bonus Price (syncs with Firestore, API route, and localStorage)
 * @param {Object} itemData { itemId, itemName, priceBonus, droppedBy, imageUrl, iconUrl, note }
 * @returns {Promise<Object>}
 */
export async function saveItemPriceToDb(itemData) {
  const numericPrice = Number(itemData.priceBonus) || 0;
  const payload = {
    itemId: Number(itemData.itemId),
    itemName: itemData.itemName,
    priceBonus: numericPrice,
    priceBonusFormatted: "Rp " + numericPrice.toLocaleString("id-ID"),
    droppedBy: itemData.droppedBy || "Unknown",
    imageUrl: itemData.imageUrl || `https://static.divine-pride.net/images/items/collection/${itemData.itemId}.png`,
    iconUrl: itemData.iconUrl || `https://static.divine-pride.net/images/items/item/${itemData.itemId}.png`,
    updatedAt: new Date().toISOString(),
    note: itemData.note || ""
  };

  // 1. Save to Cloud Firestore (Synchronizes across PC, HP, and all devices in real-time)
  let cloudSaved = false;
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, String(payload.itemId));
      await setDoc(docRef, { ...payload, serverTimestamp: serverTimestamp() }, { merge: true });
      cloudSaved = true;
    } catch (fbErr) {
      console.warn("Firestore cloud save warning:", fbErr.message);
      if (fbErr.code === 'permission-denied') {
        console.error("Cloud Firestore API is disabled or database has not been created yet in Firebase Console.");
      }
    }
  }

  // 2. LocalStorage save (client fallback)
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

  // 3. API route fallback / sync
  if (typeof window !== "undefined") {
    try {
      await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (_) {}
  }

  return { ...payload, cloudSaved };
}

/**
 * Fetch all saved item prices
 * @returns {Promise<Array>}
 */
export async function getAllItemPrices() {
  // 1. Try Firebase Firestore first for live cloud sync
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const firebaseList = [];
      querySnapshot.forEach((docSnap) => {
        firebaseList.push(docSnap.data());
      });
      if (firebaseList.length > 0) {
        firebaseList.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseList));
        }
        return firebaseList;
      }
    } catch (err) {
      console.warn("Firestore fetch error/disabled:", err.message);
    }
  }

  // 2. Try API Route
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
    } catch (_) {}
  }

  // 3. LocalStorage fallback
  if (typeof window !== "undefined") {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (_) {}
  }

  return [];
}

/**
 * Delete Item Price by Item ID across cloud and local
 * @param {number|string} itemId 
 */
export async function deleteItemPriceFromDb(itemId) {
  const idNum = Number(itemId);

  // 1. Cloud Firestore delete
  if (db) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, String(idNum)));
    } catch (err) {
      console.warn("Firestore delete warning:", err.message);
    }
  }

  // 2. API route delete
  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/prices?itemId=${idNum}`, { method: 'DELETE' });
    } catch (_) {}
  }

  // 3. LocalStorage delete
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const updated = existing.filter(x => Number(x.itemId) !== idNum);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }

  return true;
}

export function exportDatabaseAsJson() {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY) || "[]";
  }
  return "[]";
}

export { app, db };