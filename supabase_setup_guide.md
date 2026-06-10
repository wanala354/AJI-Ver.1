# Panduan Migrasi Database Supabase & Deployment GitHub Pages - AJI v2.1

Dokumen ini berisi panduan lengkap langkah-demi-langkah untuk memigrasikan database Aplikasi Jatiwarna Info (AJI) dari Google Sheets ke **Supabase (PostgreSQL)** dan men-deploy aplikasinya ke **GitHub Pages** sebagai static web application yang cepat, aman, dan 100% serverless.

---

## DAFTAR ISI
1. [Langkah 1: Setup Proyek Supabase](#langkah-1-setup-proyek-supabase)
2. [Langkah 2: Eksekusi SQL Schema di Supabase](#langkah-2-eksekusi-sql-schema-di-supabase)
3. [Langkah 3: Setup Hosting di GitHub Pages](#langkah-3-setup-hosting-di-github-pages)
4. [Langkah 4: Menghubungkan Aplikasi ke Supabase](#langkah-4-menghubungkan-aplikasi-ke-supabase)
5. [Langkah 5: Migrasi Data (Impor dari Google Sheets)](#langkah-5-migrasi-data-impor-dari-google-sheets)
6. [Catatan Keamanan & Batasan Akses (Row Level Security)](#catatan-keamanan--batasan-akses-row-level-security)

---

## Langkah 1: Setup Proyek Supabase

1. Buka browser dan masuk ke [Supabase](https://supabase.com/).
2. Login dengan akun GitHub atau Email Anda.
3. Klik tombol **New Project** di halaman dashboard.
4. Pilih organisasi Anda, lalu isi detail proyek:
   - **Name**: `AJI Info` (atau nama lain pilihan Anda).
   - **Database Password**: Buat password yang kuat dan catat password tersebut.
   - **Region**: Pilih region terdekat (misal: `Singapore` atau `Southeast Asia` untuk kecepatan optimal).
   - **Pricing Plan**: Pilih **Free Plan** (sudah lebih dari cukup untuk menampung data jamaah).
5. Klik **Create new project** dan tunggu beberapa menit hingga server Supabase selesai disiapkan.

---

## Langkah 2: Eksekusi SQL Schema di Supabase

Setelah proyek Supabase aktif, jalankan script SQL berikut untuk membuat tabel dan relasi yang diperlukan oleh aplikasi AJI v2.1.

1. Pada menu navigasi sebelah kiri di dashboard Supabase, klik **SQL Editor** (ikon lembar dengan teks SQL).
2. Klik **New Query** (atau tombol **New query**).
3. Salin dan tempel (paste) script SQL DDL di bawah ini ke editor:

```sql
-- ====================================================
-- AJI DATABASE SCHEMA (POSTGRESQL - VERSION 2.1)
-- ====================================================

-- 1. BUAT TABEL MASTER (OPSI DINAMIS)
CREATE TABLE master_kelompok (
    nama TEXT PRIMARY KEY
);

CREATE TABLE master_pendidikan (
    nama TEXT PRIMARY KEY
);

CREATE TABLE master_dapuan (
    nama TEXT PRIMARY KEY
);

CREATE TABLE master_pekerjaan (
    nama TEXT PRIMARY KEY
);

-- 2. BUAT TABEL PENGGUNA (USERS)
CREATE TABLE app_users (
    username TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    kelompok TEXT NOT NULL -- Berisi 'Semua' atau nama Kelompok tertentu
);

-- 3. BUAT TABEL UTAMA JAMAAH (SELF-REFERENCING RELATION FOR KARTU KELUARGA)
CREATE TABLE jamaah (
    id TEXT PRIMARY KEY, -- ID unik format 'J-001', 'J-002', dll.
    nama_lengkap TEXT NOT NULL,
    kelompok_pengajian TEXT NOT NULL REFERENCES master_kelompok(nama) ON UPDATE CASCADE,
    jenis_kelamin TEXT NOT NULL,
    tempat_lahir TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    status_pernikahan TEXT NOT NULL,
    status_hubungan_keluarga TEXT NOT NULL,
    kepala_keluarga_id TEXT REFERENCES jamaah(id) ON DELETE SET NULL, -- Self-reference relasional Kepala Keluarga
    nomor_hp TEXT,
    tingkat_pendidikan TEXT NOT NULL REFERENCES master_pendidikan(nama) ON UPDATE CASCADE,
    pekerjaan_utama TEXT NOT NULL REFERENCES master_pekerjaan(nama) ON UPDATE CASCADE,
    dapuan TEXT NOT NULL REFERENCES master_dapuan(nama) ON UPDATE CASCADE,
    status_ekonomi TEXT NOT NULL,
    kelancaran_sambung TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BUAT TABEL AUDIT LOGS (RIWAYAT AKTIVITAS)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operator_username TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL
);
```

4. Klik tombol **Run** di bagian kanan bawah editor SQL.
5. Pastikan muncul pesan sukses: `Success. No rows returned.` di bagian output log.

---

## Langkah 3: Setup Hosting di GitHub Pages

Karena data tersimpan langsung di database Supabase secara serverless, file `index.html` aplikasi AJI sekarang dapat di-host secara gratis sebagai static website di GitHub Pages.

1. Buat repositori baru di GitHub (bisa berstatus Public maupun Private):
   - Masuk ke [GitHub](https://github.com/) -> klik **New Repository**.
   - Nama repositori bebas (misalnya: `aji-app`).
2. Upload file `index.html` (serta file pendukung lainnya di direktori jika ada) ke repositori tersebut.
   - **PENTING**: Pastikan nama file utama adalah `index.html` (semua huruf kecil) agar dibaca otomatis oleh GitHub Pages sebagai halaman index utama.
3. Setelah ter-upload, buka tab **Settings** di repositori GitHub Anda.
4. Pada sidebar kiri menu Settings, klik **Pages**.
5. Di bagian **Build and deployment**:
   - Source: pilih **Deploy from a branch**.
   - Branch: pilih **main** (atau branch utama Anda), direktori: **/(root)**.
   - Klik tombol **Save**.
6. Tunggu sekitar 1-2 menit. Refresh halaman, dan tautan deployment akan muncul di bagian atas halaman Settings Pages tersebut (format URL: `https://<username-github>.github.io/<nama-repo>/`).

---

## Langkah 4: Menghubungkan Aplikasi ke Supabase

Demi keamanan data, **API Key dan URL database Supabase Anda TIDAK BOLEH dikodekan keras (hardcoded) ke dalam kode file index.html**. Dengan cara ini, kode di GitHub tetap aman dan bersih dari bocoran kredensial.

1. Buka URL halaman GitHub Pages Anda (atau jalankan secara lokal menggunakan Vite).
2. Karena aplikasi mendeteksi belum adanya kredensial database, aplikasi secara otomatis akan mengarahkan Anda ke halaman **AJI Setup (Hubungkan Supabase)**.
3. Isi kolom yang diminta dengan data dari proyek Supabase Anda:
   - Dapatkan **Supabase Project URL** dan **API Anon Key** dari dashboard Supabase Anda di menu `Settings (ikon roda gigi) -> API`.
   - Salin **Project URL** (misal: `https://xxxx.supabase.co`) dan masukkan ke kolom URL.
   - Salin **Project API keys (anon / public)** dan masukkan ke kolom Anon Key.
4. Klik **Hubungkan Database**.
5. Jika berhasil, sistem akan menyimpan kredensial di browser Anda secara lokal (`localStorage`), menutup form setup, dan menampilkan layar Login.
6. *(Catatan: Untuk memutus koneksi atau mengubah database di kemudian hari, login sebagai Admin, lalu buka menu **Koneksi Database** di sidebar dan klik **Reset / Reset Koneksi**).*

---

## Langkah 5: Migrasi Data (Impor dari Google Sheets)

Untuk menyalin semua data dari Google Sheets lama Anda ke Supabase secara instan:

### Opsi A: Jika Anda Membuka Aplikasi Dari Google Sheets (Apps Script Mode)
1. Buka aplikasi AJI yang ter-embed di lingkungan Google Apps Script Anda.
2. Login sebagai **Admin**.
3. Buka menu **Koneksi Database** di sidebar sebelah kiri.
4. Di bagian kanan panel migrasi data, sistem akan secara otomatis mendeteksi lingkungan Apps Script Anda (`Terdeteksi di lingkungan Apps Script`).
5. Klik tombol **Jalankan Impor Data**.
6. Log migrasi akan berjalan di layar menampilkan status migrasi batch demi batch:
   - Mengimpor opsi master (Kelompok, Pendidikan, Pekerjaan, Dapuan)
   - Mengimpor daftar user akun
   - Mengimpor data jamaah (Fase 1: Data utama)
   - Mengimpor relasi keluarga (Fase 2: Kepala Keluarga)
   - Mengimpor riwayat audit log.
7. Tunggu sampai muncul log `🎉 MIGRASI SELESAI DENGAN SUKSES!`. Seluruh data Anda kini telah termigrasi dengan sempurna ke Supabase.

### Opsi B: Jika Anda Membuka Aplikasi Dari GitHub Pages (Standalone Mode)
1. Buka Google Sheets database Anda, buka menu `Extensions -> Apps Script`.
2. Pastikan file `Code.js` Anda sudah ter-update ke versi terbaru yang memiliki penanganan parameter `action=getAllData`.
3. Klik tombol **Deploy** di kanan atas -> pilih **New Deployment**.
4. Pilih tipe deployment **Web App**:
   - **Execute as**: `Me (email anda)`
   - **Who has access**: `Anyone` (Penting: harus diset ke *Anyone* agar standalone frontend dapat menarik datanya melalui cross-origin fetch).
   - Klik **Deploy** dan salin URL Web App yang dihasilkan (format URL: `https://script.google.com/macros/s/.../exec`).
5. Buka web AJI di GitHub Pages Anda. Login sebagai **Admin**.
6. Buka menu **Koneksi Database** di sidebar.
7. Tempelkan URL Web App Google Apps Script yang Anda salin tadi ke kolom **GAS Web App URL**.
8. Klik tombol **Jalankan Impor Data**.
9. Sistem akan menghubungi Web App Apps Script tersebut secara background, mengambil seluruh datanya dalam format JSON, dan mengunggahnya secara bertahap ke Supabase Anda.
10. Tunggu sampai muncul pesan sukses. Setelah sukses, Anda dapat menarik kembali deployment Web App tersebut atau mengubah aksesnya jika diperlukan untuk alasan keamanan.

---

## Catatan Keamanan & Batasan Akses (Row Level Security)

Untuk menjaga integrasi data dan melindungi hak akses dari modifikasi yang tidak diinginkan oleh pengguna luar, Anda dapat mengaktifkan **Row Level Security (RLS)** pada Supabase melalui dashboard Anda:
- **Tabel `master_`**: Diberi akses baca (`SELECT`) untuk publik/anonim, namun operasi tulis (`INSERT/UPDATE/DELETE`) hanya diizinkan untuk Admin (atau dinonaktifkan dari manipulasi eksternal).
- **Tabel `app_users`**: Hanya boleh diakses oleh proses otentikasi internal aplikasi.
- **Tabel `jamaah`**: Akses baca (`SELECT`) dibatasi berdasarkan user kelompok pengajian masing-masing di frontend, dan operasi tulis dibatasi sesuai level operator yang sedang aktif.

Aplikasi AJI v2.1 telah dilengkapi sistem RLS tingkat aplikasi (Application-Level RLS) yang membatasi menu, tombol CRUD, dan data jamaah yang ditarik berdasarkan kelompok pengajian pengguna operator yang sedang login, baik saat menggunakan Supabase maupun demo offline.
