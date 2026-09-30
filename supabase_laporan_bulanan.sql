-- ====================================================================
-- SKRIP MIGRASI DATABASE SUPABASE (POSTGRESQL)
-- FITUR: TAB LAPORAN BULANAN (AJI v3.2)
-- ====================================================================
-- Petunjuk: 
-- 1. Buka Dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Proyek AJI -> Buka menu "SQL Editor"
-- 3. Paste seluruh skrip di bawah ini lalu tekan tombol "Run"
-- ====================================================================

-- 1. BUAT TABEL UTAMA LAPORAN BULANAN (SINGLE-TABLE DESIGN)
CREATE TABLE IF NOT EXISTS public.laporan_bulanan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Filter Parameter Utama
    kelompok TEXT NOT NULL REFERENCES public.master_kelompok(nama) ON UPDATE CASCADE,
    periode_bulan INT NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
    periode_tahun INT NOT NULL,
    tingkatan_musyawarah TEXT NOT NULL DEFAULT 'Kelompok', -- Options: 'Kelompok', 'Desa', 'Daerah'
    tanggal_musyawarah DATE NOT NULL,
    tanggal_terbit DATE DEFAULT CURRENT_DATE,
    
    -- Data Musyawarah & Evaluasi Pengajian (Disimpan sebagai JSONB)
    musyawarah_data JSONB DEFAULT '[]'::jsonb,
    -- Format JSON: [{"uraian": "Musyawarah Kelompok", "status": "Lancar", "kehadiran_pct": 75, "keterangan": "..."}]
    
    pengajian_evaluasi JSONB DEFAULT '[]'::jsonb,
    -- Format JSON: [{"tingkat": "Pengajian Kelompok Umum", "status": "Kurang Lancar", "kehadiran_pct": 38, "catatan": "..."}]
    
    -- Status Keuangan & Kegiatan Lain
    status_keuangan_infaq TEXT DEFAULT 'Lancar',
    status_keuangan_pemeriksaan TEXT DEFAULT 'Lancar',
    keuangan_bendahara TEXT DEFAULT 'Bendahara Desa',
    keuangan_data JSONB DEFAULT '[]'::jsonb,
    kegiatan_lainnya JSONB DEFAULT '[]'::jsonb,
    -- Format JSON: [{"nama": "Latihan ASAD", "status": "Lancar"}, {"nama": "Perawatan Dhuafa", "status": "2 orang"}]
    
    -- Dynamic Cards (Laporan Tambahan, Permasalahan, Usul & Saran)
    laporan_tambahan JSONB DEFAULT '[]'::jsonb,
    -- Format JSON: [{"judul": "Asrama Liburan GUS", "badge": "ASLD", "deskripsi": "..."}]
    
    catatan_permasalahan JSONB DEFAULT '[]'::jsonb,
    -- Format JSON: [{"kode_id": "PR-01", "prioritas": "Perlu Tindakan Segera", "deskripsi": "..."}]
    
    usul_saran JSONB DEFAULT '[]'::jsonb,
    -- Format JSON: [{"urutan": 1, "isi_usulan": "..."}]
    
    -- Pengesahan & Digital Signature
    penanggung_jawab_nama TEXT NOT NULL,
    penanggung_jawab_jabatan TEXT NOT NULL,
    digital_signature_hash TEXT,
    
    created_by TEXT REFERENCES public.app_users(username) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint Unik Per Kelompok & Periode
    CONSTRAINT unq_laporan_kelompok_periode UNIQUE(kelompok, periode_bulan, periode_tahun)
);

-- ALTER MIGRATION (JIKA TABEL SUDAH PERNAH DIBUAT)
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS keuangan_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS musyawarah_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS pengajian_evaluasi JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS kegiatan_lainnya JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS laporan_tambahan JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS catatan_permasalahan JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.laporan_bulanan ADD COLUMN IF NOT EXISTS usul_saran JSONB DEFAULT '[]'::jsonb;

-- 2. INDEX UNTUK PERFORMA PENCARIAN CEPAT PER KELOMPOK & PERIODE
CREATE INDEX IF NOT EXISTS idx_laporan_bulanan_kelompok_periode 
ON public.laporan_bulanan(kelompok, periode_tahun, periode_bulan);

-- 3. TRIGGER OTOMATIS UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_laporan_bulanan_timestamp ON public.laporan_bulanan;
CREATE TRIGGER set_laporan_bulanan_timestamp
BEFORE UPDATE ON public.laporan_bulanan
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. KONFIGURASI ROW LEVEL SECURITY (RLS) & IZIN AKSES
ALTER TABLE public.laporan_bulanan ENABLE ROW LEVEL SECURITY;

-- Policy Select (Dapat dibaca oleh semua pengguna terotentikasi & anonim)
DROP POLICY IF EXISTS "Laporan Bulanan dapat dibaca" ON public.laporan_bulanan;
CREATE POLICY "Laporan Bulanan dapat dibaca"
ON public.laporan_bulanan FOR SELECT
TO authenticated, anon
USING (true);

-- Policy Insert/Update/Delete (Dapat dikelola oleh pengguna terotentikasi & anonim)
DROP POLICY IF EXISTS "Laporan Bulanan dapat dikelola" ON public.laporan_bulanan;
CREATE POLICY "Laporan Bulanan dapat dikelola"
ON public.laporan_bulanan FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
