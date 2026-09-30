'use client';

import { useState } from 'react';
import { exportDatabaseAsJson } from '../../database';

export default function PriceListTab({ savedPrices, onEditItem, onDeleteItem, onExportJson }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const filteredList = (savedPrices || []).filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(term) ||
      String(item.itemId).includes(term) ||
      item.droppedBy?.toLowerCase().includes(term)
    );
  });

  const totalIdr = filteredList.reduce((acc, curr) => acc + (Number(curr.priceBonus) || 0), 0);

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(savedPrices, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(savedPrices, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ragnarok_harga_barang_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="price-list-container">
      {/* Top Bar */}
      <div className="price-list-topbar">
        <div>
          <h2 className="price-list-title">
            📋 Daftar Harga Barang Terdaftar ({filteredList.length})
          </h2>
          <p style={{ color: '#8899a6', fontSize: '0.85rem', marginTop: '4px' }}>
            Total Valuasi Bonus: <strong style={{ color: '#fbbf24' }}>Rp {totalIdr.toLocaleString('id-ID')}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="price-list-actions">
          <button 
            type="button" 
            className="action-btn-secondary"
            onClick={handleCopyJson}
          >
            {copiedNotification ? '✓ JSON Disalin!' : '📋 Salin JSON'}
          </button>

          <button 
            type="button" 
            className="action-btn-secondary"
            onClick={handleDownloadJson}
          >
            💾 Unduh JSON
          </button>
        </div>
      </div>

      {/* Filter / Search within list */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Cari dalam daftar barang terdaftar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '8px 14px',
            background: '#131720',
            border: '1px solid #283142',
            borderRadius: '6px',
            color: '#fff',
            fontFamily: 'var(--font-rms)',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Table of Saved Items */}
      {filteredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <p style={{ fontSize: '1rem', marginBottom: '8px' }}>
            {searchTerm ? 'Tidak ada barang yang cocok dengan pencarian.' : 'Belum ada barang yang didaftarkan harganya.'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            Klik tombol <strong>"Masukan Harga Barang Bonus"</strong> di tab Cari & Input untuk menambahkan.
          </p>
        </div>
      ) : (
        <div className="price-table-wrapper">
          <table className="price-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Icon</th>
                <th>Nama Item</th>
                <th>Item ID</th>
                <th>Harga Bonus (IDR)</th>
                <th>Dropped By</th>
                <th>Waktu Diperbarui</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => (
                <tr key={item.itemId}>
                  {/* Icon / Image */}
                  <td>
                    <img 
                      src={item.iconUrl || `https://static.divine-pride.net/images/items/item/${item.itemId}.png`} 
                      alt={item.itemName}
                      className="item-thumb-img"
                      onError={(e) => {
                        e.currentTarget.src = `https://static.divine-pride.net/images/items/collection/${item.itemId}.png`;
                      }}
                    />
                  </td>

                  {/* Name */}
                  <td>
                    <div className="item-thumb-name">{item.itemName}</div>
                    {item.note && (
                      <div style={{ color: '#8899a6', fontSize: '11px', marginTop: '2px' }}>
                        Catatan: {item.note}
                      </div>
                    )}
                  </td>

                  {/* ID */}
                  <td>
                    <span className="item-thumb-id">#{item.itemId}</span>
                  </td>

                  {/* Price */}
                  <td>
                    <span className="badge-price">
                      {item.priceBonusFormatted || `Rp ${Number(item.priceBonus).toLocaleString('id-ID')}`}
                    </span>
                  </td>

                  {/* Dropped By */}
                  <td style={{ color: '#94a3b8', fontSize: '11px', maxWidth: '240px' }}>
                    {item.droppedBy || '-'}
                  </td>

                  {/* Timestamp */}
                  <td style={{ color: '#64748b', fontSize: '11px' }}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn-icon btn-icon-edit"
                        title="Edit Harga"
                        onClick={() => onEditItem(item)}
                      >
                        ✏️
                      </button>
                      <button 
                        type="button" 
                        className="btn-icon"
                        title="Hapus dari daftar"
                        onClick={() => onDeleteItem(item.itemId)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
