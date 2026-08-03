-- Migration Script: Skema Tabel Data Haji AJI V1
-- Tabel data_haji menyimpan informasi pendaftaran dan status keberangkatan haji jamaah.

CREATE TABLE IF NOT EXISTS public.data_haji (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jamaah_id TEXT NOT NULL REFERENCES public.jamaah(id) ON DELETE CASCADE,
    status_haji TEXT NOT NULL CHECK (status_haji IN ('Sudah Berangkat', 'Belum Berangkat')),
    nomor_kursi TEXT,
    rencana_tahun_berangkat INT,
    tahun_berangkat INT,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_jamaah_haji UNIQUE (jamaah_id)
);

-- Index untuk mempercepat pencarian data haji berdasarkan jamaah_id dan status_haji
CREATE INDEX IF NOT EXISTS idx_data_haji_jamaah ON public.data_haji(jamaah_id);
CREATE INDEX IF NOT EXISTS idx_data_haji_status ON public.data_haji(status_haji);

-- Allow anonymous & authenticated access if RLS enabled
ALTER TABLE public.data_haji ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to data_haji" ON public.data_haji
    FOR ALL
    USING (true)
    WITH CHECK (true);
