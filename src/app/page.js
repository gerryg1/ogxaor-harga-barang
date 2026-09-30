'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import RateMyServerItemCard from '../components/RateMyServerItemCard';
import PriceModal from '../components/PriceModal';
import PriceListTab from '../components/PriceListTab';

import itemsDatabase from '../data/items.json';
import defaultSavedPrices from '../data/saved_prices.json';
import { 
  saveItemPriceToDb, 
  getAllItemPrices, 
  deleteItemPriceFromDb 
} from '../../database';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState(itemsDatabase);
  const [savedPrices, setSavedPrices] = useState(defaultSavedPrices);
  const [modalItem, setModalItem] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Load saved prices on client mount
  useEffect(() => {
    async function loadPrices() {
      try {
        const prices = await getAllItemPrices();
        if (prices && prices.length > 0) {
          setSavedPrices(prices);
        } else {
          // If empty, keep default demo data
          setSavedPrices(defaultSavedPrices);
        }
      } catch (err) {
        console.error('Error loading prices:', err);
      }
    }
    loadPrices();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter items for Tab 1
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const idMatch = String(item.id).includes(q);
    const nameMatch = item.name.toLowerCase().includes(q);
    const aegisMatch = item.aegisName?.toLowerCase().includes(q);
    const dropMatch = Array.isArray(item.droppedBy) && item.droppedBy.some(d => d.monster?.toLowerCase().includes(q));
    return idMatch || nameMatch || aegisMatch || dropMatch;
  });

  // Handle Save Price from Modal
  const handleSavePrice = async (data) => {
    try {
      const saved = await saveItemPriceToDb(data);
      // Update state
      setSavedPrices((prev) => {
        const filtered = prev.filter(x => Number(x.itemId) !== Number(data.itemId));
        return [saved, ...filtered];
      });
      showToast(`✓ Harga untuk ${data.itemName} berhasil disimpan!`);
    } catch (err) {
      console.error('Error saving price:', err);
      showToast(`Terjadi kesalahan saat menyimpan harga.`);
    }
  };

  // Handle Delete Price
  const handleDeletePrice = async (itemId) => {
    if (!confirm('Yakin ingin menghapus harga barang ini dari daftar?')) return;
    try {
      await deleteItemPriceFromDb(itemId);
      setSavedPrices((prev) => prev.filter(x => Number(x.itemId) !== Number(itemId)));
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

      {/* Search Input Bar (Matching Screenshot 1) */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={() => {}}
      />

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Cari & Input Harga Item
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
                Item <strong>"{searchQuery}"</strong> tidak ditemukan.
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Coba cari dengan nama item lain seperti <em>Ice Pick</em>, <em>Combat Knife</em>, <em>Valkyrian</em>, atau ID nomornya.
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
