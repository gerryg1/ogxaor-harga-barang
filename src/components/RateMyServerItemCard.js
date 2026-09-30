'use client';

export default function RateMyServerItemCard({ item, onOpenPriceModal, savedPrice }) {
  if (!item) return null;

  const itemIcon = item.images?.icon || `https://static.divine-pride.net/images/items/item/${item.id}.png`;
  
  // Format jobs
  const jobsList = Array.isArray(item.applicableJobs) 
    ? item.applicableJobs 
    : (typeof item.applicableJobs === 'string' ? item.applicableJobs.split(', ') : ['All Jobs']);

  // Format dropped by
  const droppedByList = Array.isArray(item.droppedBy) ? item.droppedBy : [];

  return (
    <div className="item-row-wrapper">
      {/* RateMyServer Authentic Blue Table */}
      <div className="rms-table-card">
        {/* Header Bar */}
        <div className="rms-table-header">
          <div className="rms-title-left">
            <img 
              src={itemIcon} 
              alt={item.name}
              className="rms-item-sprite"
              onError={(e) => {
                e.currentTarget.src = 'https://ratemyserver.net/item_gfx/1230.gif';
              }}
            />
            <span className="rms-item-title">
              {item.name} {item.subtype || ''} Item ID# {item.id} {item.aegisName ? `(${item.aegisName})` : ''}
            </span>
          </div>
          <div className="rms-title-actions">
            <button type="button" className="rms-action-tag">Spr</button>
            <button type="button" className="rms-action-tag">C Re</button>
            <span style={{ fontSize: '11px', color: '#255883', cursor: 'pointer' }}>🔗</span>
          </div>
        </div>

        {/* Table Rows */}
        <table className="rms-data-table">
          <tbody>
            <tr>
              <td className="rms-lbl">Type</td>
              <td className="rms-val">{item.type || 'Weapon'}</td>
              <td className="rms-lbl">Class</td>
              <td className="rms-val">{item.class || 'Dagger'}</td>
              <td className="rms-lbl">Buy</td>
              <td className="rms-val">{item.buy || '20z'}</td>
              <td className="rms-lbl">Sell</td>
              <td className="rms-val">{item.sell || '10z'}</td>
              <td className="rms-lbl">Weight</td>
              <td className="rms-val">{item.weight || 0}</td>
            </tr>

            <tr>
              <td className="rms-lbl">Attack</td>
              <td className="rms-val">{item.attack || 0}</td>
              <td className="rms-lbl">Required Lvl</td>
              <td className="rms-val">{item.requiredLvl || 0}</td>
              <td className="rms-lbl">Weapon Lvl</td>
              <td className="rms-val">{item.weaponLvl || 0}</td>
              <td className="rms-lbl">Slot</td>
              <td className="rms-val" colSpan={3}>{item.slot ?? 0}</td>
            </tr>

            <tr>
              <td className="rms-lbl">Applicable Jobs</td>
              <td className="rms-val-wide" colSpan={9}>
                <div className="rms-jobs-list">
                  {jobsList.map((job, idx) => (
                    <span key={idx} className="rms-job-item">{job}</span>
                  ))}
                </div>
              </td>
            </tr>

            <tr>
              <td className="rms-lbl">Description</td>
              <td className="rms-val-wide rms-desc-text" colSpan={9}>
                {item.description}
              </td>
            </tr>

            {item.itemScript && (
              <tr>
                <td className="rms-lbl">Item Script</td>
                <td className="rms-val-wide rms-script-box" colSpan={9}>
                  <code>{item.itemScript}</code>
                </td>
              </tr>
            )}

            <tr>
              <td className="rms-lbl">Dropped By</td>
              <td className="rms-val-wide rms-drops-cell" colSpan={9}>
                {droppedByList.length > 0 ? (
                  droppedByList.map((drop, idx) => (
                    <span key={idx} className="rms-drop-item">
                      {drop.monster} <span className="rms-drop-rate">({drop.rate})</span>
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Tidak ada monster drop (Quest / Shop / Box)</span>
                )}
              </td>
            </tr>

            {item.enchantment && (
              <tr>
                <td className="rms-lbl">Enchantment</td>
                <td className="rms-val-wide" colSpan={9} style={{ color: '#0369a1' }}>
                  {item.enchantment}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Button: Masukan Harga Barang Bonus (Beside Table) */}
      <div className="price-btn-container">
        <button
          type="button"
          className={`btn-open-modal ${savedPrice ? 'is-saved' : ''}`}
          onClick={() => onOpenPriceModal(item)}
        >
          {savedPrice ? (
            <div>
              <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginBottom: '4px' }}>
                ✓ Terdaftar: {savedPrice.priceBonusFormatted || `${savedPrice.priceBonus} Zeny`}
              </div>
              <div>Edit Harga Bonus</div>
            </div>
          ) : (
            'Masukan Harga Barang Bonus'
          )}
        </button>
      </div>
    </div>
  );
}
