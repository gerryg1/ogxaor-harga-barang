# Cloudflare Worker - OGxAOR Backend & Edge API

Script ini membungkus backend **OGxAOR Ragnarok Database & Harga Barang** ke dalam **Cloudflare Worker** (Edge runtime) dengan dukungan CORS, caching global, dan penyimpanan KV.

---

## 📁 Struktur File
* `worker.js`: Script utama Cloudflare Worker (kompatibel dengan ES module `export default { fetch }`).
* `wrangler.toml`: Konfigurasi Wrangler untuk deployment.

---

## ⚡ Fitur Worker
1. **CORS Otomatis**: Mendukung request dari domain publik Vercel, localhost, atau domain custom tanpa masalah CORS.
2. **`GET /api/search?q={namaItem}`**: Pencarian dengan cache otomatis di Cloudflare Edge CDN.
3. **`GET /api/prices`**: Mengambil daftar harga barang (dari Cloudflare KV atau in-memory fallback).
4. **`POST /api/prices`**: Menyimpan harga barang baru dengan format Rupiah (`Rp ...`).
5. **`DELETE /api/prices?itemId={id}`**: Menghapus harga barang dari daftar.

---

## 🚀 Cara Memasang (Pilih Salah Satu)

### Cara 1: Lewat Web Dashboard Cloudflare (Paling Mudah, Tanpa Install Apapun)
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) -> Masuk ke menu **Workers & Pages**.
2. Klik **Create Application** -> **Create Worker**.
3. Beri nama worker (misal: `ogxaor-ro-worker`), lalu klik **Deploy**.
4. Klik **Quick Edit** / **Edit Code**.
5. Hapus semua isi kode default, lalu **Copy & Paste seluruh isi file `worker/worker.js`**.
6. Klik **Save and Deploy**. Selesai!

*(Opsional untuk simpan data KV)*:
* Di tab **Settings** Worker -> **Variables** -> scroll ke **KV Namespace Bindings** -> klik **Add Binding** -> beri nama Variable `PRICES_KV`.

---

### Cara 2: Lewat Command Line (Wrangler)
Jika ingin deploy via terminal di lain waktu:
```bash
npx wrangler deploy worker/worker.js
```
