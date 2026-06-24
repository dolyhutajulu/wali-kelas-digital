# 🎓 WaliKelas Digital

Sistem manajemen informasi wali kelas (SD/MI/SMP/SMA) yang dirancang khusus untuk perangkat mobile (**responsive-first**), aman dengan enkripsi lokal, dan tanpa biaya server (**serverless**) menggunakan browser storage. Aplikasi ini siap dideploy langsung ke Vercel secara gratis.

---

## 🌟 Fitur Utama
1. **Buku Induk Kelas**: Pencatatan profil siswa lengkap (NIS, NISN, TTL, Agama, Alamat), data orang tua/wali, serta catatan khusus bimbingan konseling dan penyakit bawaan/alergi.
2. **Presensi Harian**: Input absensi sekali tap (**Hadir**, **Sakit**, **Izin**, **Alfa**) dengan penghitungan persentase bulanan/semester otomatis untuk pengisian rapor.
3. **Manajemen Nilai & Karakter**: Input nilai Tugas, Ulangan Harian, UTS/STS, UAS/SAS, observasi sikap spiritual & sosial (sesuai Kurikulum Merdeka atau K13), serta ekspor rekap nilai langsung ke format **Excel (CSV)**.
4. **Keuangan Kelas**: Buku tabungan siswa (setor/tarik tunai beserta mutasi transaksi) dan buku kas kelas (pemasukan/pengeluaran).
5. **Jadwal & Agenda**: Jadwal pelajaran harian, pembagian kelompok piket kebersihan kelas, serta kalender akademik sekolah.
6. **Buku Penghubung Digital**: Papan pengumuman kelas (bisa langsung dibagikan ke WhatsApp grup kelas), galeri dokumentasi kegiatan belajar, dan template pesan WhatsApp otomatis langsung ke nomor orang tua/wali murid.
7. **Offline-first & Keamanan**: Data disimpan aman di perangkat guru, dilindungi dengan kata sandi login, dan memiliki fitur ekspor/impor cadangan data (backup/restore).

---

## 🚀 Cara Menjalankan Aplikasi

### Cara 1: Buka Langsung (Tanpa Install)
Karena aplikasi ini dibuat sebagai SPA statis, Anda dapat langsung membukanya tanpa perlu menginstal Node.js atau server apa pun:
1. Unduh atau salin seluruh folder proyek `Wali-kelas`.
2. Klik ganda (double-click) file `index.html` untuk membukanya di browser Google Chrome/Safari/Firefox di laptop atau HP Anda.

### Cara 2: Menggunakan Local Server (Sangat Disarankan)
Untuk performa optimal dan menghindari kebijakan CORS browser saat mengembangkan lanjut:
```bash
# Menggunakan serve (Node.js)
npx serve .

# Atau menggunakan Live Server jika Anda menggunakan VS Code
# (Cukup klik kanan pada index.html dan pilih "Open with Live Server")
```

---

## 🔑 Akses & Kredensial Bawaan
- **Kata Sandi Utama**: `admin`
*(Dapat diubah kapan saja melalui halaman **Pengaturan > Keamanan Wali Kelas**).*

> [!TIP]
> **Mulai Cepat dengan Data Demo:**
> Setelah masuk sistem untuk pertama kali, masuk ke halaman **Setelan** (ikon roda gigi) di bagian bawah/kiri, lalu klik tombol **"Muat Data Demo Sekolah"**. Sistem akan terisi otomatis dengan 8 profil siswa simulasi lengkap dengan absensi, nilai, riwayat kas, dan jadwal belajar agar Anda dapat langsung mencoba seluruh fitur.

---

## 📦 Cara Deploy ke Vercel (Gratis & Instan)

Aplikasi ini dapat dideploy secara statis ke Vercel tanpa perlu melakukan konfigurasi build (Zero Config):

### Cara 1: Menggunakan Git & GitHub (Direkomendasikan)
1. Buat repositori baru di GitHub Anda (misal: `wali-kelas-digital`).
2. Hubungkan folder lokal Anda dan push ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <URL-REPOS-GITHUB-ANDA>
   git branch -M main
   git push -u origin main
   ```
3. Masuk ke [Vercel](https://vercel.com/) menggunakan akun GitHub Anda.
4. Klik **Add New > Project**, lalu impor repositori `wali-kelas-digital` Anda.
5. Klik **Deploy**. Selesai! Vercel akan otomatis menyajikan link website Anda secara online dan aman (HTTPS).

### Cara 2: Menggunakan Vercel CLI
Jika Anda ingin deploy langsung lewat terminal tanpa GitHub:
1. Pastikan Vercel CLI terpasang di komputer Anda: `npm install -g vercel`.
2. Jalankan perintah `vercel` di dalam folder proyek Anda.
3. Ikuti langkah-langkah di layar (pilih *Yes* untuk semua pengaturan default).
4. Website Anda siap diakses dalam hitungan detik!

---

## 🔒 Privasi Data & Keamanan
Aplikasi ini berjalan 100% di browser pengguna (Client-Side). Tidak ada data murid atau data sensitif orang tua yang diunggah ke server database cloud luar. Ini memastikan kepatuhan penuh terhadap privasi data anak di bawah umur (UU Pelindungan Data Pribadi / PDP). 

**PENTING**: Lakukan ekspor cadangan data secara berkala ke file `.json` melalui menu **Pengaturan** agar data Anda aman jika Anda mengganti browser atau membersihkan cache browser.
