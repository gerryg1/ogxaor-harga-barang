'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import RateMyServerItemCard from '../components/RateMyServerItemCard';
import PriceModal from '../components/PriceModal';
import PriceListTab from '../components/PriceListTab';

import initialFeaturedItems from '../data/featured_items.json';
import defaultSavedPrices from '../data/saved_prices.json';
import { 
  saveItemPriceToDb, 
  getAllItemPrices, 
  deleteItemPriceFromDb,
  subscribeToItemPrices
} from '../../database';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState(initialFeaturedItems);
  const [savedPrices, setSavedPrices] = useState(defaultSavedPrices);
  const [modalItem, setModalItem] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [cloudStatus, setCloudStatus] = useState('checking'); // 'connected' | 'unconfigured' | 'checking'

  const debounceTimerRef = useRef(null);

  // Load saved prices on mount and attach realtime live listener
  useEffect(() => {
    async function loadPrices() {
      try {
        const prices = await getAllItemPrices();
        if (Array.isArray(prices) && prices.length > 0) {
          setSavedPrices(prices);
        }
      } catch (err) {
        console.error('Error loading prices:', err);
      }
    }
    loadPrices();

    // Realtime live synchronization across all devices (PC & HP)
    const unsubscribe = subscribeToItemPrices(
      (livePrices) => {
        if (Array.isArray(livePrices)) {
          setSavedPrices(livePrices);
          setCloudStatus('connected');
        }
      },
      (err) => {
        if (err && (err.code === 'permission-denied' || String(err.message).includes('PERMISSION_DENIED'))) {
          setCloudStatus('unconfigured');
        }
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Perform on-demand search to /api/search
  const executeSearch = useCallback(async (queryText) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();

    if (!q) {
      setItems(initialFeaturedItems);
      setSearchedTerm('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchedTerm(q);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=60`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.items)) {
          setItems(json.items);
        }
      }
    } catch (err) {
      console.error('Search request error:', err);
      showToast('Gagal mencari item. Pastikan server aktif.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle typing with 5-second debounce (as requested by user)
  const handleQueryChange = (text) => {
    setSearchQuery(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim()) {
      setItems(initialFeaturedItems);
      setSearchedTerm('');
      setIsSearching(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(text);
    }, 5000);
  };

  // Immediate search on Enter or Search Button
  const handleImmediateSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch();
  };

  // Filter items by category tab
  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'consumable') {
      const isConsumable = item.type === 'Healing' || item.type === 'Usable' || item.type === 'DelayConsume' || item.type === 'Cash' || item.name.toLowerCase().includes('herb') || item.name.toLowerCase().includes('potion');
      if (!isConsumable) return false;
    } else if (selectedCategory === 'loot') {
      const isLoot = item.type === 'Etc' || item.type === 'Ammo' || item.class === 'Material';
      if (!isLoot) return false;
    } else if (selectedCategory === 'card') {
      if (item.type !== 'Card' && !item.name.toLowerCase().includes('card')) return false;
    } else if (selectedCategory === 'equip') {
      const isEquip = item.type === 'Weapon' || item.type === 'Armor' || item.type === 'Equipment' || item.type === 'Headgear' || item.type === 'Shadow';
      if (!isEquip) return false;
    }
    return true;
  });

  // Handle Save Price from Modal
  const handleSavePrice = async (data) => {
    try {
      const cleanNum = Number(data.priceBonus) || 0;
      const optimisticItem = {
        itemId: Number(data.itemId),
        itemName: data.itemName,
        priceBonus: cleanNum,
        priceBonusFormatted: 'Rp ' + cleanNum.toLocaleString('id-ID'),
        droppedBy: data.droppedBy,
        imageUrl: data.imageUrl,
        iconUrl: data.iconUrl,
        updatedAt: new Date().toISOString(),
        note: data.note || ''
      };

      setSavedPrices((prev) => {
        const filtered = prev.filter(x => Number(x.itemId) !== Number(data.itemId));
        return [optimisticItem, ...filtered];
      });

      const result = await saveItemPriceToDb(data);
      if (result) {
        setSavedPrices((prev) => {
          const filtered = prev.filter(x => Number(x.itemId) !== Number(data.itemId));
          return [result, ...filtered];
        });
      }

      showToast(`✓ Harga ${data.itemName} (${optimisticItem.priceBonusFormatted}) berhasil disimpan!`);
    } catch (err) {
      console.error('Error saving price:', err);
      showToast(`Terjadi kesalahan saat menyimpan harga.`);
    }
  };

  // Handle Delete Price
  const handleDeletePrice = async (itemId) => {
    if (!confirm(`Yakin ingin menghapus harga barang ID #${itemId} dari daftar?`)) return;
    try {
      setSavedPrices((prev) => prev.filter(x => Number(x.itemId) !== Number(itemId)));
      await deleteItemPriceFromDb(itemId);
      showToast(`Harga barang ID #${itemId} berhasil dihapus.`);
    } catch (err) {
      console.error('Error deleting price:', err);
    }
  };

  // Edit item from Tab 2
  const handleEditFromList = (savedItem) => {
    const matched = items.find(x => Number(x.id) === Number(savedItem.itemId)) || {
      id: savedItem.itemId,
      name: savedItem.itemName,
      droppedBy: [{ monster: savedItem.droppedBy, rate: 'Saved' }],
      images: { collection: savedItem.imageUrl, icon: savedItem.iconUrl }
    };
    setModalItem(matched);
  };

  return (
    <main className="container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#1e3a5f',
          color: '#ffffff',
          border: '1px solid #38bdf8',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Main Header */}
      <Header />

      {/* Cloud Sync Status Alert Banner if not enabled yet in Firebase console */}
      {cloudStatus === 'unconfigured' && (
        <div style={{
          background: 'rgba(234, 88, 12, 0.12)',
          border: '1px solid rgba(234, 88, 12, 0.5)',
          borderRadius: '8px',
          padding: '12px 18px',
          margin: '-10px auto 20px auto',
          maxWidth: '800px',
          fontSize: '0.85rem',
          color: '#fdba74',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          <strong>📡 Sinkronisasi Cloud Antar-Perangkat (PC &amp; HP):</strong>
          <div style={{ marginTop: '4px' }}>
            Agar harga yang diinput di PC langsung muncul <strong>LIVE di HP</strong> secara real-time:
            <br />
            Silakan buka <a href="https://console.firebase.google.com/project/ragnarok-harga-barang/firestore" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 700 }}>Firebase Console Firestore</a> lalu klik <strong>"Create database"</strong> (pilih <em>Start in test mode</em>).
          </div>
        </div>
      )}

      {/* Search Input Bar (Matching Screenshot 1) */}
      <SearchBar
        value={searchQuery}
        onChange={handleQueryChange}
        onSearch={handleImmediateSearch}
      />

      {/* Search Status & Info Indicator */}
      <div style={{ textAlign: 'center', margin: '-10px auto 16px auto', fontSize: '0.85rem' }}>
        {isSearching ? (
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>
            ⏳ Sedang mencari di seluruh database rAthena (30.000+ item)...
          </span>
        ) : searchedTerm ? (
          <span style={{ color: '#94a3b8' }}>
            Hasil pencarian untuk <strong style={{ color: '#fbbf24' }}>"{searchedTerm}"</strong>: ditemukan {filteredItems.length} item.
          </span>
        ) : (
          <span style={{ color: '#64748b' }}>
            💡 Tekan <strong>Enter</strong> atau klik <strong>Search Button</strong> untuk mencari seketika (atau tunggu 5 detik setelah mengetik).
          </span>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="category-filters">
        <button
          type="button"
          className={`chip-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Semua ({filteredItems.length})
        </button>
        <button
          type="button"
          className={`chip-btn ${selectedCategory === 'equip' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('equip')}
        >
          ⚔️ Senjata &amp; Armor
        </button>
        <button
          type="button"
          className={`chip-btn ${selectedCategory === 'consumable' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('consumable')}
        >
          🧪 Consumable &amp; Herb
        </button>
        <button
          type="button"
          className={`chip-btn ${selectedCategory === 'loot' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('loot')}
        >
          📦 Sampahan &amp; Loot
        </button>
        <button
          type="button"
          className={`chip-btn ${selectedCategory === 'card' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('card')}
        >
          🃏 Kartu / Card
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Cari &amp; Input Harga Item
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 List Harga Barang
          <span className="tab-badge">{savedPrices.length}</span>
        </button>
      </div>

      {/* TAB 1: Cari & Input Harga Item */}
      {activeTab === 'search' && (
        <div className="items-stack">
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                Item tidak ditemukan.
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Coba cari dengan nama item seperti <em>Blacksmith Blessing</em>, <em>Ice Pick</em>, <em>Red Herb</em>, <em>Valkyrie</em>, atau nomor ID.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const saved = savedPrices.find(p => Number(p.itemId) === Number(item.id));
              return (
                <RateMyServerItemCard
                  key={item.id}
                  item={item}
                  savedPrice={saved}
                  onOpenPriceModal={(it) => setModalItem(it)}
                />
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: List Harga Barang */}
      {activeTab === 'list' && (
        <PriceListTab
          savedPrices={savedPrices}
          onEditItem={handleEditFromList}
          onDeleteItem={handleDeletePrice}
          onExportJson={() => {}}
        />
      )}

      {/* Price Modal (Matching Screenshot 2) */}
      <PriceModal
        isOpen={Boolean(modalItem)}
        item={modalItem}
        initialPrice={savedPrices.find(p => Number(p.itemId) === Number(modalItem?.id))}
        onClose={() => setModalItem(null)}
        onSave={handleSavePrice}
      />
    </main>
  );
}
