# Setup Supabase Storage untuk Galeri Kegiatan

Fitur **Unggah Foto Kegiatan** menyimpan gambar di **Supabase Storage** (bukan di
browser). Metadata (judul, tag, tanggal, URL) ikut tersinkron lewat tabel
`walikelas_store` yang sudah ada. Lakukan setup berikut **satu kali** di dashboard
Supabase proyek Anda (`mcdzgfjcjsowohmgvwmp`).

## 1. Buat bucket `kegiatan`

Dashboard Supabase → **Storage** → **New bucket**
- Name: `kegiatan`
- **Public bucket: ON** (untuk tahap "upload dulu" — foto bisa diakses via URL)
- Create.

> Catatan privasi: bucket publik berarti siapa pun yang tahu URL acak foto bisa
> membukanya. Untuk tahap awal (dokumentasi guru) ini cukup. Saat membangun
> **galeri wali**, pertimbangkan bucket privat + signed URL (lihat bagian 3).

## 2. Policy agar aplikasi (anon key) boleh upload / lihat / hapus

Dashboard → **Storage** → **Policies** → bucket `kegiatan` → atau jalankan SQL ini
di **SQL Editor**:

```sql
-- Izinkan baca publik objek di bucket 'kegiatan'
create policy "kegiatan public read"
on storage.objects for select
to public
using ( bucket_id = 'kegiatan' );

-- Izinkan upload (anon) ke bucket 'kegiatan'
create policy "kegiatan anon insert"
on storage.objects for insert
to anon
with check ( bucket_id = 'kegiatan' );

-- Izinkan hapus (anon) objek di bucket 'kegiatan'
create policy "kegiatan anon delete"
on storage.objects for delete
to anon
using ( bucket_id = 'kegiatan' );
```

Setelah ini, tombol **Unggah Foto** di tab *Buku Penghubung → Galeri Kegiatan*
akan berfungsi.

## 3. (Nanti) Galeri wali yang lebih aman

Saat menambah surface untuk wali murid:
- Jadikan bucket **privat**, akses lewat **signed URL** (kedaluwarsa).
- Tambah kolom/flag `showToParent` (sudah ada di data) untuk memfilter foto yang
  boleh tampil ke wali.
- Batasi `insert`/`delete` ke peran terautentikasi (guru), bukan `anon`, setelah
  ada login.

## Cara kerja di kode
- `store.uploadGalleryPhoto(blob, ext)` → upload ke `kegiatan/<kelas>/<acak>.jpg`,
  kembalikan public URL.
- `store.addGalleryItem({...})` → simpan metadata di `state.gallery` (ikut sync).
- `store.deleteGalleryItem(id)` → hapus metadata + objek storage (best-effort).
- Gambar **dikompres di browser** (maks sisi 1280px, JPEG 0.8) sebelum upload.
