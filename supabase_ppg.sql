-- ====================================================================
-- SKRIP MIGRASI DATABASE SUPABASE (POSTGRESQL)
-- FITUR: MODUL PPG (PENGGERAK PEMBINA GENERUS) - AJI v3.2
-- ====================================================================
-- Petunjuk Eksekusi:
-- 1. Buka Dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Proyek AJI -> Buka menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini lalu tekan tombol "Run"
-- ====================================================================

-- 1. UPDATE CHECK CONSTRAINT ROLE DI TABEL APP_USERS (Bila Diperlukan)
DO $$
BEGIN
    -- Menambahkan 'Pendidik PPG' ke check constraint app_users jika ada
    ALTER TABLE IF EXISTS public.app_users 
    DROP CONSTRAINT IF EXISTS app_users_role_check;
    
    ALTER TABLE IF EXISTS public.app_users 
    ADD CONSTRAINT app_users_role_check 
    CHECK (role IN ('Administrator', 'Operator Kelompok', 'Operator Desa', 'Pengurus Desa', 'Pengurus Kelompok', 'Pendidik PPG', 'Jamaah', 'User'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping constraint update: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. TABEL MASTER BIDANG KEILMUAN PPG
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.master_bidang_keilmuan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_bidang TEXT NOT NULL UNIQUE,
    deskripsi TEXT,
    urutan INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABEL MASTER MATERI KEILMUAN PPG
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.master_keilmuan_materi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bidang_id UUID NOT NULL REFERENCES public.master_bidang_keilmuan(id) ON DELETE CASCADE,
    kategori_generus TEXT[] NOT NULL, -- ARRAY['PAUD', 'Caberawit'], ARRAY['GUS', 'GUM'], dll.
    nama_materi TEXT NOT NULL,
    tipe_penilaian TEXT NOT NULL DEFAULT 'standar' CHECK (tipe_penilaian IN ('standar', 'halaman')),
    total_halaman INT DEFAULT NULL,   -- Wajib diisi jika tipe_penilaian = 'halaman'
    deskripsi_target TEXT,
    urutan INT DEFAULT 0,             -- Prioritas urutan tampilan di kurikulum
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABEL CAPAIAN KEILMUAN SANTRI (PROGRESS MATERI STANDAR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.generus_keilmuan_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jamaah_id TEXT NOT NULL REFERENCES public.jamaah(id) ON DELETE CASCADE,
    materi_id UUID NOT NULL REFERENCES public.master_keilmuan_materi(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Belum' CHECK (status IN ('Belum', 'Proses', 'Tuntas')),
    nilai_angka NUMERIC(5,2),
    tanggal_tuntas DATE,
    penguji_nama TEXT,
    catatan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_jamaah_materi UNIQUE (jamaah_id, materi_id)
);

-- ============================================================================
-- 5. TABEL PROGRES HADIS HIMPUNAN SANTRI (PELACAK HALAMAN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.generus_hadis_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jamaah_id TEXT NOT NULL REFERENCES public.jamaah(id) ON DELETE CASCADE,
    materi_id UUID NOT NULL REFERENCES public.master_keilmuan_materi(id) ON DELETE CASCADE,
    total_halaman INT NOT NULL,
    halaman_selesai INTEGER[] DEFAULT '{}', -- Array nomor halaman: {1,2,3,4,15}
    persentase_selesai NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Belum' CHECK (status IN ('Belum', 'Proses', 'Khatam')),
    tanggal_khatam DATE,
    penguji_terakhir TEXT,
    catatan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_jamaah_hadis UNIQUE (jamaah_id, materi_id)
);

-- ============================================================================
-- 6. TRIGGER OTOMATIS: KALKULASI PROGRES HALAMAN & STATUS KHATAM HADIS
-- ============================================================================
CREATE OR REPLACE FUNCTION kalkulasi_progress_hadis_trigger()
RETURNS TRIGGER AS $$
DECLARE
    jumlah_selesai INT;
BEGIN
    -- Menghitung total elemen unik di dalam array halaman_selesai
    IF NEW.halaman_selesai IS NOT NULL AND array_length(NEW.halaman_selesai, 1) > 0 THEN
        SELECT count(DISTINCT elem) INTO jumlah_selesai 
        FROM unnest(NEW.halaman_selesai) AS elem;
    ELSE
        jumlah_selesai := 0;
    END IF;

    IF NEW.total_halaman > 0 THEN
        NEW.persentase_selesai := ROUND((jumlah_selesai::numeric / NEW.total_halaman::numeric) * 100, 2);
    ELSE
        NEW.persentase_selesai := 0;
    END IF;

    -- Evaluasi otomatis status kelulusan/khatam
    IF NEW.persentase_selesai >= 100.00 THEN
        NEW.status := 'Khatam';
        IF NEW.tanggal_khatam IS NULL THEN
            NEW.tanggal_khatam := CURRENT_DATE;
        END IF;
    ELSIF NEW.persentase_selesai > 0 THEN
        NEW.status := 'Proses';
        NEW.tanggal_khatam := NULL;
    ELSE
        NEW.status := 'Belum';
        NEW.tanggal_khatam := NULL;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hitung_hadis_progress ON public.generus_hadis_progress;
CREATE TRIGGER trg_hitung_hadis_progress
BEFORE INSERT OR UPDATE ON public.generus_hadis_progress
FOR EACH ROW EXECUTE FUNCTION kalkulasi_progress_hadis_trigger();

-- ============================================================================
-- 7. INDEXING UNTUK KECEPATAN QUERY BESAR
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_materi_generus ON public.master_keilmuan_materi USING GIN (kategori_generus);
CREATE INDEX IF NOT EXISTS idx_materi_urutan ON public.master_keilmuan_materi (bidang_id, urutan);
CREATE INDEX IF NOT EXISTS idx_keilmuan_progress_lookup ON public.generus_keilmuan_progress (jamaah_id, materi_id, status);
CREATE INDEX IF NOT EXISTS idx_hadis_progress_lookup ON public.generus_hadis_progress (jamaah_id, materi_id, status);

-- ============================================================================
-- 8. DATA AWAL (SEED DATA KURIKULUM STANDAR PPG)
-- ============================================================================
INSERT INTO public.master_bidang_keilmuan (nama_bidang, urutan, deskripsi) VALUES
('Al-Qur''an & Tajwid', 1, 'Standar bacaan, makhorijul huruf, tajwid, dan kelancaran membaca Al-Qur''an'),
('Hafalan Doa & Dalil', 2, 'Hafalan doa harian, dalil-dalil penting ibadah dan thobiat luhur'),
('Praktik Ibadah', 3, 'Praktik wudhu, sholat fardhu, sholat sunnah, adzan & iqomah, serta perawatan jenazah'),
('Hadis Himpunan', 4, 'Pemaknaan dan pengkhataman kitab-kitab hadis himpunan secara bertahap'),
('Karakter 6 Thobiat Luhur', 5, 'Pembinaan karakter rukun, kompak, kerjasama yang baik, jujur, amanah, dan mujhid-muzhid'),
('Fiqih & Munakahat', 6, 'Pemahaman fiqih praktis, thoharoh, zakat, puasa, dan kesiapan hidup mandiri')
ON CONFLICT (nama_bidang) DO NOTHING;

INSERT INTO public.master_keilmuan_materi (bidang_id, kategori_generus, nama_materi, tipe_penilaian, total_halaman, urutan, deskripsi_target) VALUES
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Hadis Himpunan'), ARRAY['GUS', 'GUM'], 'Kitabu Sholah', 'halaman', 150, 1, 'Pengkhataman makna dan keterangan Kitabu Sholah 150 Halaman'),
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Hadis Himpunan'), ARRAY['GUS', 'GUM'], 'Kitabul Adab', 'halaman', 80, 2, 'Pengkhataman Kitabul Adab 80 Halaman'),
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Al-Qur''an & Tajwid'), ARRAY['Caberawit'], 'Iqro Jilid 1 s/d 6', 'standar', NULL, 1, 'Tuntas lancar membaca Iqro Jilid 1 sampai dengan Jilid 6'),
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Praktik Ibadah'), ARRAY['Caberawit'], 'Praktik Wudhu Sempurna', 'standar', NULL, 2, 'Menguasai rukun, sunnah, doa wudhu dan praktik langsung dengan benar'),
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Hafalan Doa & Dalil'), ARRAY['PAUD', 'Caberawit'], 'Doa Sebelum & Sesudah Makan', 'standar', NULL, 1, 'Hafal lafadz dan arti doa makan serta adab-adab makan'),
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Karakter 6 Thobiat Luhur'), ARRAY['Caberawit', 'GUS', 'GUM'], 'Penerapan 6 Thobiat Luhur', 'standar', NULL, 1, 'Memahami dan mengamalkan rukun, kompak, kerjasama baik, jujur, amanah, mujhid muzhid'),
((SELECT id FROM public.master_bidang_keilmuan WHERE nama_bidang = 'Fiqih & Munakahat'), ARRAY['GUS', 'GUM'], 'Fiqih Thoharoh & Sholat Berjamaah', 'standar', NULL, 1, 'Memahami kaidah bersuci dari hadats kecil/besar dan tata cara sholat berjamaah')
ON CONFLICT DO NOTHING;
