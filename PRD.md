# Product Requirement Document (PRD)
## Aplikasi Jatiwarna Info (AJI) - Versi 3.2
### Platform Terpadu Administrasi Jamaah, Presensi Kegiatan & Kurikulum Keilmuan Generus (PPG)

---

## 1. Pendahuluan & Ringkasan Proyek

Aplikasi Jatiwarna Info (AJI) adalah platform manajemen data jamaah terpadu, pengelolaan kegiatan (pengajian), rekapitulasi data kepengurusan, serta pemantauan capaian kurikulum pembinaan generasi penerus (PPG) berbasis digital. Aplikasi ini dirancang khusus untuk membantu organisasi keagamaan/kemasyarakatan tingkat lokal (Jatiwarna/Pondok Melati) dalam mengelola anggotanya secara modern, aman, dan efisien.

Pada Versi 3.2, AJI diperluas dengan **Modul PPG (Penggerak Pembina Generus)** yang menyediakan pemantauan keaktifan presensi bulanan generus (PAUD s/d GUM), pencatatan capaian silabus keilmuan secara berkala (batch/individu), buku rapor santri digital, serta pelacak halaman per halaman (*page-by-page tracker*) untuk materi berbasis kitab seperti Hadis Himpunan.

---

## 2. Tujuan Proyek

1. **Efisiensi Administrasi Terpusat**: Mengganti pengelolaan manual dan sistem berbasis berkas fisik menjadi database terpusat yang aman.
2. **Transisi Database Fleksibel**: Menyediakan opsi database hibrida antara **Google Sheets (Google Apps Script)** untuk kemudahan administratif awal dan **Supabase (PostgreSQL)** untuk performa tinggi dan keamanan tingkat lanjut.
3. **Klasifikasi Jamaah Otomatis**: Mengelompokkan jamaah secara otomatis berdasarkan kelompok usia dan status pernikahan (Kelompok Peramutan) untuk memudahkan koordinasi pembinaan.
4. **Sistem Terpadu PPG**: Menyediakan evaluasi keaktifan presensi bulanan dan buku rapor/capaian keilmuan generus (PAUD s/d GUM) dalam satu panel.
5. **Pelacakan Hadis Kitab Digital**: Memantau progres pemaknaan hadis berbasis nomor halaman hingga mencapai status Khatam 100%.
6. **Akses Multi-Platform**: Mendukung akses berbasis Web (Vite + JavaScript), aplikasi web mobile berbasis Capacitor, serta aplikasi mobile native (Kotlin Android) dengan fitur notifikasi pengingat jadwal kegiatan.

---

## 3. Target Pengguna & Peran (Roles)

Sistem otentikasi AJI membagi hak akses ke dalam kategori:

| Peran (Role) | Deskripsi Hak Akses | Fitur yang Dapat Diakses |
| :--- | :--- | :--- |
| **Administrator** | Memiliki kontrol penuh atas sistem, konfigurasi database, dan data master. | Dasbor Utama, Modul Jamaah (Semua Kelompok), Kartu Keluarga, Data Pengurus, Manajemen Kegiatan, Rekap Laporan, Modul PPG Penuh, Master Kurikulum PPG, Data Master, Manajemen User global, Konfigurasi Koneksi Database, Audit Trail Log. |
| **Operator Kelompok** | Operator tingkat rukun/kelompok pengajian. Dibatasi hanya untuk mengelola kelompoknya sendiri. | Dasbor Utama (data terfilter per kelompok), Modul Jamaah (hanya kelompok yang dikelola), Kartu Keluarga (kelompok sendiri), Manajemen Kegiatan kelompok, Modul PPG (Rukun sendiri - input nilai & monitoring), Persetujuan/Registrasi akun jamaah baru di kelompoknya. |
| **Pendidik PPG** | Guru/muballigh/tim kurikulum PPG yang bertugas menguji materi. | Tab Data PPG (Rukun sasaran), Tab Input Capaian Keilmuan (Batch & Individu), Pelacak Halaman Hadis, Read-only pada Master Silabus. |
| **Jamaah** | Anggota umum/jamaah terdaftar di aplikasi. | Dasbor Jamaah ("Dashboard Saya"), Informasi Keluarga ("Keluarga Saya"), Jadwal Kegiatan, Rapor Keilmuan Diri/Anak (*Read-only*), Profil Pribadi. |

---

## 4. Fitur & Spesifikasi Fungsional

### 4.1. Modul Otentikasi & Registrasi Akun
* **Registrasi Mandiri (Self-Registration)**: Jamaah dapat mendaftarkan akun secara mandiri melalui form registrasi satu langkah (*single-step form*).
  * Pencarian autocomplete nama lengkap jamaah berdasarkan data master yang sudah ada untuk menghindari duplikasi data.
  * Pilihan input Kelompok, Jenis Kelamin, Tanggal Lahir, Nomor HP, Status Pernikahan, Username, Password, dan unggah foto profil (opsional).
* **Alur Persetujuan (Approval Flow)**: Pendaftaran akun baru secara otomatis berstatus *pending* (tertunda) dan membutuhkan verifikasi/persetujuan oleh Administrator atau Operator Kelompok setempat sebelum akun dapat digunakan untuk masuk (*login*).
* **Metode Enkripsi**: Enkripsi kata sandi menggunakan hashing SHA-256 sisi klien (*client-side*).

### 4.2. Modul Dasbor & Analitik
* **Metrik KPI Utama**: Menampilkan jumlah total jamaah, jumlah kepala keluarga (KK), dan pembagian jamaah per kelompok peramutan (Caberawit, GUS, GUM, PAUD).
* **Dashboard Gauge Chart**: Grafik visual yang dinamis untuk memantau status keaktifan/sambung berdasarkan kategori:
  * Generasi Usia Mandiri (GUM)
  * Caberawit (anak-anak)
  * Generasi Usia Sekolah (GUS)
  * Ibu-Ibu
  * Pengurus Kelompok
  * Statistik 5 Unsur
* **Filter Dinamis**: Dasbor dapat difilter berdasarkan bulan kegiatan dan tingkat kelompok kepengurusan.
* **Auto-Sync / Background Refresh**: Sinkronisasi data di latar belakang setiap 30 detik untuk memperbarui metrik secara berkala tanpa mengganggu aktivitas aktif pengguna di halaman editing.

### 4.3. Modul Jamaah & Kartu Keluarga
* **Manajemen Data Jamaah**: CRUD (*Create, Read, Update, Delete*) data jamaah lengkap. Bidang data mencakup:
  * Data Dasar: ID Jamaah (format `J-001`), Nama Lengkap, Jenis Kelamin, Tempat/Tanggal Lahir, Nomor HP.
  * Data Status: Tingkat Pendidikan, Pekerjaan Utama, Status Pernikahan, Dapuan (Tugas Organisasi), Status Ekonomi (Aghnia, Dhuafa, Menengah), Kelancaran Sambung (Lancar, Kurang Lancar, Perlu Perhatian).
* **Klasifikasi Kelompok Peramutan (Care Groups) Otomatis**:
  * **Balita**: Usia $\le$ 3 tahun.
  * **PAUD**: Usia 4-5 tahun.
  * **Caberawit**: Usia 6-12 tahun.
  * **GUS (Generasi Usia Sekolah)**: Usia 13-18 tahun atau status pendidikan SMP/SMA/SMK.
  * **GUM (Generasi Usia Mandiri)**: Usia 19-29 tahun dan status belum menikah.
  * **Dewasa**: Usia 30-59 tahun, atau 19-29 tahun dengan status menikah.
  * **Manula**: Usia $\ge$ 60 tahun.
* **Hubungan Kepala Keluarga (Kartu Keluarga)**: Pemetaan hubungan anggota keluarga secara relasional berbasis *self-referencing primary key* (tiap anggota memiliki referensi `kepala_keluarga_id` yang terhubung ke data kepala keluarga bersangkutan).

### 4.4. Modul Kegiatan & Presensi Kehadiran
* **Penjadwalan Kegiatan**: Pembuatan jadwal pengajian/kegiatan keagamaan lengkap dengan tanggal, jam mulai/selesai, jenis kegiatan, materi pembahasan, pengajar, tempat kegiatan, dan kelompok sasaran.
* **Presensi Digital**: 
  * Operator dapat melakukan pencatatan kehadiran jamaah secara interaktif menggunakan Check-in Modal.
  * Filter peserta otomatis berdasarkan sasaran kelompok peramutan atau grup kustom.
  * Penghitungan tingkat persentase keaktifan (*attendance rate*) per individu dan rekapitulasi kehadiran kelompok.
  * Pencarian dan penyaringan data keaktifan jamaah menggunakan filter interaktif berdasarkan kelompok peramutan, jenis kelamin (gender), pencarian nama, serta status kehadiran (Semua Status, Hadir Fisik, Online, Izin, Alpha).
  * Penanganan pembatasan pengambilan data Supabase bypass limit 1000 baris dengan teknik pencarian *page-by-page*.

### 4.5. Modul PPG (Penggerak Pembina Generus)
* **Tab 1: Data & Monitoring Generus**:
  * Filter dinamis: Kelompok, Gender, Kategori Generus (PAUD, Caberawit, GUS, GUM), Pencarian Teks Nama, Bulan & Tahun evaluasi.
  * Formula Kehadiran Bulanan: $\text{Persentase} = \left(\frac{\sum(\text{Hadir Fisik} + \text{Online})}{\text{Total Sesi Kegiatan Sasaran}}\right) \times 100\%$.
  * Indikator Warna Status Kehadiran: 🟢 Hijau ($\ge 80\%$), 🟡 Kuning ($50\% - 79\%$), 🔴 Merah ($< 50\%$).
  * Tombol Ikon Buku (`📖`) untuk membuka **Modal Detail Rapor Keilmuan Santri**.
* **Modal Detail Keilmuan Santri (Rapor Generus)**:
  * Header profil santri, bilah kemajuan akumulatif (*14 / 20 Target Materi Lulus - 70%*).
  * Tabel materi standar per bidang keilmuan (Status, Nilai, Tanggal, Penguji, Catatan).
  * Daftar Hadis Himpunan (Khusus GUS & GUM) dengan kartu per kitab, persentase khatam, dan tombol pembuka pelacak halaman.
  * Fitur Cetak Rapor Santri siap print/PDF standar A4.
* **Tab 2: Input Capaian Keilmuan**:
  * **Mode 1 (Batch / Massal per Materi)**: Form pemilih Kelompok, Jenjang, Bidang, dan Target Materi. Tabel inline editing santri dengan tombol "Tandai Semua Tuntas" dan "Simpan Semua Perubahan (Batch Upsert)".
  * **Mode 2 (Individu / Buku Rapor)**: Pemilih santri spesifik dengan matriks silabus lengkap jenjang tersebut.
* **Sub-fitur Pelacak Progres Hadis Himpunan (Halaman per Halaman)**:
  * Matriks grid halaman interaktif 1 s/d $N$ dengan kotak bernomor (Hijau = Tuntas, Abu-abu = Belum). Klik kotak untuk toggle status halaman secara langsung.
  * Panel aksi cepat: Input rentang halaman (`Dari Hal` s/d `Sampai Hal`), tombol `[+ Tandai Terisi]`, `[- Batalkan]`, `[⭐ Khatam Instan]`, dan `[↺ Reset]`.
  * Auto-kalkulasi persentase dan ringkasan halaman belum dimaknai (contoh: *Halaman belum: 1-12, 18, 45-60*).
  * Otomatis berstatus `Khatam` dan mencatat tanggal khatam saat mencapai 100%.
* **Tab 3: Master Kurikulum & Silabus PPG**:
  * CRUD Master Bidang Keilmuan dan Master Materi Pembelajaran.
  * Fitur Impor CSV Silabus, Ekspor CSV Silabus, dan Unduh Template CSV Silabus PPG.

### 4.6. Modul Pengurus & Laporan Rekapitulasi
* **Data Pengurus**: Manajemen terpisah untuk pengurus organisasi berdasarkan data posisi/jabatan (Dapuan).
* **Cetak Data**: Fitur cetak rekapitulasi data jamaah dan kehadiran kegiatan secara langsung ke format kertas/PDF.

### 4.7. Modul Pengaturan & Log Sistem
* **Dual-Database Switcher**: 
  * Integrasi data menggunakan **Google Sheets API via Google Apps Script (GAS)** Web App.
  * Migrasi mandiri data lokal/Sheets langsung ke **Supabase** melalui panel pengaturan.
* **Audit Trail Log**: Pencatatan riwayat perubahan data krusial secara real-time yang mencatat timestamp, operator pelaksana, jenis aksi (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `EXPORT`), dan deskripsi perubahan data secara detail.
* **Manajemen User (User Management)**:
  * Khusus untuk level Admin/Operator untuk menyetujui, mengedit peran (termasuk peran Pendidik PPG), atau memblokir/menghapus akun pengguna yang tidak aktif.

---

## 5. Spesifikasi Aplikasi Mobile Native (Kotlin Android)

Aplikasi mobile native AJI Portal dikembangkan menggunakan Kotlin untuk memberikan kenyamanan akses bagi jamaah umum:

1. **Jadwal Kegiatan & Reminder**: Menarik jadwal kegiatan secara berkala.
2. **Alarm Pengingat Kehadiran**: 
   * Menggunakan modul `JadwalReminderScheduler` berbasis `AlarmManager` Android.
   * Jadwal alarm akan otomatis disetel **1 jam sebelum kegiatan dimulai** (`alarmDateTime = scheduleDateTime.minusHours(1)`).
   * Memberikan notifikasi getar dan suara pada perangkat ponsel pintar pengguna agar tidak terlewat menghadiri kegiatan.
3. **Pendaftaran & Hubung Database**: Memiliki kesamaan alur registrasi satu pintu dan integrasi Supabase SDK seperti versi web.

---

## 6. Spesifikasi Teknis & Lingkungan Sistem

* **Bahasa Pemrograman**:
  * Web & Hybrid App: HTML5, CSS Vanilla, JavaScript (Vite compiler).
  * Mobile Native App: Kotlin (SDK Android).
* **Database**:
  * PostgreSQL di Supabase (dengan enkripsi data dan integrasi RLS).
  * Google Spreadsheet (sebagai fallback / database administratif cadangan).
* **Otentikasi & Keamanan**:
  * Enkripsi kata sandi menggunakan hashing SHA-256 di browser sebelum dikirim ke database.
  * Aplikasi menerapkan pengamanan *Row Level Security* (RLS) di mana visualisasi data jamaah dibatasi secara dinamis berdasarkan Kelompok Pengajian pengguna yang terotentikasi.
* **Manajemen Cache**: 
  * Parameter versi unik disematkan pada impor file JavaScript (cache-busting) guna mematikan fungsi cache browser saat merilis versi baru (`index.html?v=3.1.9`).

---

## 7. Skema Database (Supabase PostgreSQL)

Berikut adalah struktur database utama yang digunakan pada AJI v2.1/v3.1:

```sql
-- 1. TABEL MASTER
CREATE TABLE master_kelompok ( nama TEXT PRIMARY KEY );
CREATE TABLE master_pendidikan ( nama TEXT PRIMARY KEY );
CREATE TABLE master_dapuan ( nama TEXT PRIMARY KEY );
CREATE TABLE master_pekerjaan ( nama TEXT PRIMARY KEY );

-- 2. TABEL PENGGUNA (USERS)
CREATE TABLE app_users (
    username TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    kelompok TEXT NOT NULL -- 'Semua' atau Kelompok tertentu
);

-- 3. TABEL UTAMA JAMAAH
CREATE TABLE jamaah (
    id TEXT PRIMARY KEY,
    nama_lengkap TEXT NOT NULL,
    kelompok_pengajian TEXT NOT NULL REFERENCES master_kelompok(nama) ON UPDATE CASCADE,
    jenis_kelamin TEXT NOT NULL,
    tempat_lahir TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    status_pernikahan TEXT NOT NULL,
    status_hubungan_keluarga TEXT NOT NULL,
    kepala_keluarga_id TEXT REFERENCES jamaah(id) ON DELETE SET NULL,
    nomor_hp TEXT,
    tingkat_pendidikan TEXT NOT NULL REFERENCES master_pendidikan(nama) ON UPDATE CASCADE,
    pekerjaan_utama TEXT NOT NULL REFERENCES master_pekerjaan(nama) ON UPDATE CASCADE,
    dapuan TEXT NOT NULL REFERENCES master_dapuan(nama) ON UPDATE CASCADE,
    status_ekonomi TEXT NOT NULL,
    kelancaran_sambung TEXT NOT NULL,
    status_keaktifan TEXT NOT NULL DEFAULT 'Aktif',
    keterangan_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operator_username TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL
);

-- 5. TABEL KURIKULUM & PROGRESS PPG
CREATE TABLE master_bidang_keilmuan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_bidang TEXT NOT NULL UNIQUE,
    deskripsi TEXT,
    urutan INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE master_keilmuan_materi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bidang_id UUID NOT NULL REFERENCES master_bidang_keilmuan(id) ON DELETE CASCADE,
    kategori_generus TEXT[] NOT NULL,
    nama_materi TEXT NOT NULL,
    tipe_penilaian TEXT NOT NULL DEFAULT 'standar' CHECK (tipe_penilaian IN ('standar', 'halaman')),
    total_halaman INT DEFAULT NULL,
    deskripsi_target TEXT,
    urutan INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generus_keilmuan_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jamaah_id TEXT NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
    materi_id UUID NOT NULL REFERENCES master_keilmuan_materi(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Belum' CHECK (status IN ('Belum', 'Proses', 'Tuntas')),
    nilai_angka NUMERIC(5,2),
    tanggal_tuntas DATE,
    penguji_nama TEXT,
    catatan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_jamaah_materi UNIQUE (jamaah_id, materi_id)
);

CREATE TABLE generus_hadis_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jamaah_id TEXT NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
    materi_id UUID NOT NULL REFERENCES master_keilmuan_materi(id) ON DELETE CASCADE,
    total_halaman INT NOT NULL,
    halaman_selesai INTEGER[] DEFAULT '{}',
    persentase_selesai NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Belum' CHECK (status IN ('Belum', 'Proses', 'Khatam')),
    tanggal_khatam DATE,
    penguji_terakhir TEXT,
    catatan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_jamaah_hadis UNIQUE (jamaah_id, materi_id)
);
```

---

## 8. Sejarah Rilis Proyek (Project Release Plan)

* **v1.0 & v2.0**:
  * Pembangunan simulasi frontend, integrasi Google Spreadsheet sebagai database awal melalui Google Apps Script Web App.
* **v2.1**:
  * Integrasi Supabase PostgreSQL untuk stabilitas data, konfigurasi skema tabel relasional (self-referencing KK), penambahan modul register single-step, dan rilis aplikasi web mobile berbasis Capacitor.
* **v3.0 - v3.1**:
  * Dasbor visual (gauge chart dinamis per bulan).
  * Penambahan auto-refresh background sync 30 detik.
  * Penyelesaian *bypass pagination* di atas 1000 baris untuk data berkapasitas besar di Supabase.
  * Mekanisme cache-busting JS aset di berkas index utama.
* **v3.2**:
  * Perluasan **Modul PPG (Penggerak Pembina Generus)**:
    * Tab Data & Monitoring Generus dengan formula presensi bulanan otomatis, filter dinamis, dan 4 metrik KPI.
    * Tab Input Capaian Keilmuan dengan 2 mode (Batch per materi / kelas dan Individu per santri).
    * Sub-fitur Pelacak Halaman Hadis Himpunan interaktif (grid kotak 1-N, quick range action, auto-khatam).
    * Modal Rapor Keilmuan Santri terpadu dengan fitur cetak PDF/kertas.
    * Manajemen Master Kurikulum & Silabus (Bidang & Materi) dengan ekspor/impor CSV.
    * Dukungan hak akses peran baru `Pendidik PPG`.
    * Akses Rapor PPG santri di Portal Jamaah untuk diri sendiri dan keluarga.

