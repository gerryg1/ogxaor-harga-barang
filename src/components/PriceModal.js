'use client';

import { useState, useEffect } from 'react';

export default function PriceModal({ item, initialPrice, isOpen, onClose, onSave }) {
  const [priceInput, setPriceInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialPrice) {
      setPriceInput(String(initialPrice.priceBonus || ''));
      setNoteInput(initialPrice.note || '');
    } else {
      setPriceInput('');
      setNoteInput('');
    }
  }, [initialPrice, item]);

  if (!isOpen || !item) return null;

  // Divine Pride image URLs
  const collectionImg = item.images?.collection || `https://static.divine-pride.net/images/items/collection/${item.id}.png`;
  const iconImg = item.images?.icon || `https://static.divine-pride.net/images/items/item/${item.id}.png`;

  // Format dropped by text
  const droppedBySummary = Array.isArray(item.droppedBy) && item.droppedBy.length > 0
    ? item.droppedBy.map(d => `${d.monster} (${d.rate})`).join(', ')
    : 'None / Special Quest / MVP Box';

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const cleanNum = Number(String(priceInput).replace(/\D/g, '')) || 0;

    try {
      await onSave({
        itemId: item.id,
        itemName: item.name,
        priceBonus: cleanNum,
        droppedBy: droppedBySummary,
        imageUrl: collectionImg,
        iconUrl: iconImg,
        note: noteInput
      });
      onClose();
    } catch (err) {
      console.error('Error in modal onSave:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericVal = Number(String(priceInput).replace(/\D/g, '')) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Item Image Box */}
        <div className="modal-image-box">
          <img 
            src={collectionImg} 
            alt={item.name}
            className="modal-item-img"
            onError={(e) => {
              e.currentTarget.src = iconImg;
            }}
          />
        </div>

        {/* Modal Title: Item Name + ITEM ID */}
        <h2 className="modal-title">
          {item.name} - ID# {item.id}
        </h2>

        {/* Dropped By Box */}
        <div className="modal-dropped-box">
          <div className="modal-dropped-label">
            Dropped By :
          </div>
          {Array.isArray(item.droppedBy) && item.droppedBy.length > 0 ? (
            item.droppedBy.map((drop, idx) => (
              <div key={idx} className="modal-dropped-detail">
                • {drop.monster} <span style={{ color: '#fbbf24' }}>({drop.rate})</span>
              </div>
            ))
          ) : (
            <div className="modal-dropped-detail">
              {droppedBySummary}
            </div>
          )}
        </div>

        {/* Price Input */}
        <div className="modal-input-container">
          <input
            type="text"
            className="modal-input-field"
            placeholder="Masukan Harga Bonus Barang Disini"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave(e);
            }}
            autoFocus
          />
          {numericVal > 0 && (
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#fbbf24', marginTop: '6px' }}>
              Preview: {numericVal.toLocaleString('id-ID')} Zeny
            </div>
          )}
        </div>

        {/* Action Buttons: OKE & BATAL */}
        <div className="modal-buttons-row">
          <button 
            type="button" 
            className="modal-btn modal-btn-ok"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'MENYIMPAN...' : 'OKE'}
          </button>
          <button 
            type="button" 
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            BATAL
          </button>
        </div>
      </div>
    </div>
  );
}
