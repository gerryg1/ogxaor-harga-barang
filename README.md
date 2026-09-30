# OGxAOR Harga Barang - Ragnarok Database

Aplikasi web modern berbasis **Next.js** untuk pencarian database Ragnarok Online bergaya **RateMyServer**, dilengkapi fitur input harga barang bonus, aset gambar transparan berkualitas tinggi dari **Divine-Pride**, dan penyimpanan data terintegrasi ke Firebase / JSON.

---

## 🌟 Fitur Utama

1. **RateMyServer Table Style**:
   - Tampilan detail item (Ice Pick, Combat Knife, Valkyrian Armor, Cards, dll.) dengan desain tabel biru klasik RateMyServer yang otentik.
   - Informasi lengkap: Type, Class, Buy, Sell, Weight, Attack, Required Lvl, Weapon Lvl, Slot, Applicable Jobs, Description, Item Script, Dropped By (% drop), dan Socket Enchantment.
2. **Modal Input Harga Barang Bonus**:
   - Popup modal modern untuk memasukkan harga bonus barang dalam satuan Zeny.
   - Menampilkan preview gambar item koleksi dari Divine-Pride, Nama & ID Item, serta daftar monster yang menjatuhkannya (*Dropped By*).
3. **Tab List Harga Barang**:
   - Tab khusus untuk memantau semua barang yang sudah diberi harga bonus.
   - Menampilkan icon item, nama, ID, harga Zeny yang sudah diformat, monster drop, dan waktu update.
   - Fitur pencarian instan dalam daftar, edit harga, dan hapus barang.
   - Tombol **Salin JSON** dan **Unduh JSON** untuk kemudahan backup.
4. **Scraper rAthena & Divine Pride**:
   - Script scraping siap pakai di `scripts/scrape_rathena.mjs` untuk mengambil data item terbaru langsung dari repositori resmi rAthena dan menghubungkannya dengan CDN Divine-Pride.
5. **Penyimpanan Terintegrasi**:
   - `database.js` mendukung sinkronisasi ke **Firebase Firestore** dan **LocalStorage fallback** jika offline.

---

## 🚀 Cara Menjalankan

### 1. Install Dependensi
```bash
npm install
```

### 2. Jalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

### 3. Build Production
```bash
npm run build
npm run start
```

### 4. Menjalankan Scraper rAthena
```bash
npm run scrape
```

---

Dibuat untuk komunitas **Ragnarok Online** & server **OGxAOR**.
