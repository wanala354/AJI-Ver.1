/**
 * ====================================================================
 * AJI - Aplikasi Jatiwarna Info (v3.2)
 * Modul: PPG (Penggerak Pembina Generus)
 * Monitoring Presensi, Evaluasi Kurikulum & Pelacak Halaman Hadis
 * ====================================================================
 */

// STATE UTAMA MODUL PPG
window.ppgState = {
  activeSubtab: "data-ppg",       // 'data-ppg' | 'input-capaian' | 'master-kurikulum'
  inputMode: "batch",             // 'batch' | 'individu'
  
  // Data Master & Transaksional
  masterBidang: [],
  masterMateri: [],
  keilmuanProgress: [],           // array of { id, jamaah_id, materi_id, status, nilai_angka, tanggal_tuntas, penguji_nama, catatan }
  hadisProgress: [],              // array of { id, jamaah_id, materi_id, total_halaman, halaman_selesai: [], persentase_selesai, status, tanggal_khatam, penguji_terakhir, catatan }
  
  // Active Filter Tab 1
  filterKelompok: "",
  filterGender: "",
  filterKategori: "",
  filterSearch: "",
  filterBulan: new Date().getMonth() + 1,
  filterTahun: new Date().getFullYear(),
  
  // Active Input State (Mode 1 Batch)
  batchKelompok: "",
  batchJenjang: "Caberawit",
  batchBidangId: "",
  batchMateriId: "",
  batchSantriRows: [],
  
  // Active Input State (Mode 2 Individu)
  selectedSantriId: null,
  
  // Active Hadis Tracker
  activeHadisSantri: null,
  activeHadisMateri: null,
  activeHadisData: null,
  
  // Active Rapor Modal
  activeRaporSantri: null,

  // Active Monitoring Hadis Himpunan
  monitoringHadisFilterKelompok: "",
  monitoringHadisFilterJenjang: "GUS",
  monitoringHadisFilterSearch: "",
  monitoringHadisFilterDeficit: "all",
  monitoringHadisPageSearch: "",
  selectedMonitoringMateriId: null,
  monitoringHadisCurrentView: "khatam"
};

// Seed Data Default Kurikulum Standar (Bila Supabase belum dimigrasi / Offline)
const DEFAULT_PPG_BIDANG = [
  { id: "b1111111-0001-4000-8000-000000000001", nama_bidang: "Al-Qur'an & Tajwid", urutan: 1, deskripsi: "Standar bacaan, makhorijul huruf, tajwid, dan kelancaran membaca Al-Qur'an" },
  { id: "b1111111-0002-4000-8000-000000000002", nama_bidang: "Hafalan Doa & Dalil", urutan: 2, deskripsi: "Hafalan doa harian, dalil-dalil penting ibadah dan thobiat luhur" },
  { id: "b1111111-0003-4000-8000-000000000003", nama_bidang: "Praktik Ibadah", urutan: 3, deskripsi: "Praktik wudhu, sholat fardhu, sholat sunnah, adzan & iqomah" },
  { id: "b1111111-0004-4000-8000-000000000004", nama_bidang: "Hadis Himpunan", urutan: 4, deskripsi: "Pemaknaan dan pengkhataman kitab-kitab hadis himpunan secara bertahap" },
  { id: "b1111111-0005-4000-8000-000000000005", nama_bidang: "Karakter 6 Thobiat Luhur", urutan: 5, deskripsi: "Pembinaan karakter rukun, kompak, kerjasama baik, jujur, amanah, mujhid-muzhid" },
  { id: "b1111111-0006-4000-8000-000000000006", nama_bidang: "Fiqih & Munakahat", urutan: 6, deskripsi: "Pemahaman fiqih praktis, thoharoh, kesiapan mandiri" }
];

const DEFAULT_PPG_MATERI = [
  { id: "m1111111-0001-4000-8000-000000000001", bidang_id: "b1111111-0004-4000-8000-000000000004", kategori_generus: ["GUS", "GUM"], nama_materi: "Kitabu Sholah", tipe_penilaian: "halaman", total_halaman: 150, urutan: 1, deskripsi_target: "Pengkhataman Kitabu Sholah 150 Halaman" },
  { id: "m1111111-0002-4000-8000-000000000002", bidang_id: "b1111111-0004-4000-8000-000000000004", kategori_generus: ["GUS", "GUM"], nama_materi: "Kitabul Adab", tipe_penilaian: "halaman", total_halaman: 80, urutan: 2, deskripsi_target: "Pengkhataman Kitabul Adab 80 Halaman" },
  { id: "m1111111-0003-4000-8000-000000000003", bidang_id: "b1111111-0001-4000-8000-000000000001", kategori_generus: ["Caberawit"], nama_materi: "Iqro Jilid 1 s/d 6", tipe_penilaian: "standar", total_halaman: null, urutan: 1, deskripsi_target: "Tuntas lancar membaca Iqro Jilid 1 sampai dengan Jilid 6" },
  { id: "m1111111-0004-4000-8000-000000000004", bidang_id: "b1111111-0003-4000-8000-000000000003", kategori_generus: ["Caberawit"], nama_materi: "Praktik Wudhu Sempurna", tipe_penilaian: "standar", total_halaman: null, urutan: 2, deskripsi_target: "Menguasai rukun, sunnah, doa wudhu dan praktik langsung dengan benar" },
  { id: "m1111111-0005-4000-8000-000000000005", bidang_id: "b1111111-0002-4000-8000-000000000002", kategori_generus: ["PAUD", "Caberawit"], nama_materi: "Doa Sebelum & Sesudah Makan", tipe_penilaian: "standar", total_halaman: null, urutan: 1, deskripsi_target: "Hafal lafadz dan arti doa makan serta adab-adab makan" },
  { id: "m1111111-0006-4000-8000-000000000006", bidang_id: "b1111111-0005-4000-8000-000000000005", kategori_generus: ["Caberawit", "GUS", "GUM"], nama_materi: "Penerapan 6 Thobiat Luhur", tipe_penilaian: "standar", total_halaman: null, urutan: 1, deskripsi_target: "Memahami dan mengamalkan rukun, kompak, kerjasama baik, jujur, amanah, mujhid muzhid" },
  { id: "m1111111-0007-4000-8000-000000000007", bidang_id: "b1111111-0006-4000-8000-000000000006", kategori_generus: ["GUS", "GUM"], nama_materi: "Fiqih Thoharoh & Sholat Berjamaah", tipe_penilaian: "standar", total_halaman: null, urutan: 1, deskripsi_target: "Memahami kaidah bersuci dari hadats kecil/besar dan sholat berjamaah" }
];

document.addEventListener("DOMContentLoaded", () => {
  setupPpgEventListeners();
});

/**
 * Inisialisasi Modul PPG saat Tab Dibuka
 */
window.initPpgModule = async function() {
  const mainWrapper = document.querySelector(".main-wrapper");
  if (mainWrapper) mainWrapper.scrollTop = 0;
  window.scrollTo(0, 0);

  await loadPpgDataFromDatabase();
  setupPpgSubtabs();
  await populatePpgFilterOptions();
  renderPpgDataTab();
};

/**
 * Event Listeners untuk Modul PPG
 */
function setupPpgEventListeners() {
  // Filter listeners Tab 1
  const searchInput = document.getElementById("ppg-filter-search");
  if (searchInput) searchInput.addEventListener("input", () => { ppgState.filterSearch = searchInput.value; renderPpgDataTab(); });

  const kelompokSelect = document.getElementById("ppg-filter-kelompok");
  if (kelompokSelect) kelompokSelect.addEventListener("change", () => { ppgState.filterKelompok = kelompokSelect.value; renderPpgDataTab(); });

  const genderSelect = document.getElementById("ppg-filter-gender");
  if (genderSelect) genderSelect.addEventListener("change", () => { ppgState.filterGender = genderSelect.value; renderPpgDataTab(); });

  const kategoriSelect = document.getElementById("ppg-filter-kategori");
  if (kategoriSelect) kategoriSelect.addEventListener("change", () => { ppgState.filterKategori = kategoriSelect.value; renderPpgDataTab(); });

  const bulanSelect = document.getElementById("ppg-filter-bulan");
  if (bulanSelect) bulanSelect.addEventListener("change", () => { ppgState.filterBulan = parseInt(bulanSelect.value); renderPpgDataTab(); });

  const tahunSelect = document.getElementById("ppg-filter-tahun");
  if (tahunSelect) tahunSelect.addEventListener("change", () => { ppgState.filterTahun = parseInt(tahunSelect.value); renderPpgDataTab(); });

  const btnReset = document.getElementById("btn-reset-ppg-filter");
  if (btnReset) btnReset.addEventListener("click", resetPpgFilters);

  // Input Mode Switcher Tab 2
  const btnModeBatch = document.getElementById("btn-ppg-mode-batch");
  const btnModeIndividu = document.getElementById("btn-ppg-mode-individu");
  if (btnModeBatch && btnModeIndividu) {
    btnModeBatch.addEventListener("click", () => switchPpgInputMode("batch"));
    btnModeIndividu.addEventListener("click", () => switchPpgInputMode("individu"));
  }

  // Batch Selectors
  const batchBidang = document.getElementById("ppg-batch-bidang");
  const batchJenjang = document.getElementById("ppg-batch-jenjang");
  if (batchBidang) batchBidang.addEventListener("change", updateBatchMateriDropdown);
  if (batchJenjang) batchJenjang.addEventListener("change", updateBatchMateriDropdown);

  // Individu Filter Listeners (Mode 2)
  const indivKel = document.getElementById("ppg-individu-kelompok");
  if (indivKel) indivKel.addEventListener("change", updateIndividuGenerusDropdown);
  const indivJen = document.getElementById("ppg-individu-jenjang");
  if (indivJen) indivJen.addEventListener("change", updateIndividuGenerusDropdown);

  // Modal Backdrop Click to Close
  const modalIds = [
    "modal-ppg-rapor-santri",
    "modal-ppg-hadis-tracker",
    "modal-ppg-master-materi",
    "modal-ppg-master-bidang",
    "modal-ppg-import-csv"
  ];
  modalIds.forEach(id => {
    const m = document.getElementById(id);
    if (m && !m.dataset.backdropAttached) {
      m.addEventListener("click", (e) => {
        if (e.target === m) {
          m.classList.remove("active");
          m.style.display = "none";
        }
      });
      m.dataset.backdropAttached = "true";
    }
  });
}

/**
 * Setup Navigasi Subtab di Modul PPG
 */
function setupPpgSubtabs() {
  const subtabBtns = document.querySelectorAll("#section-ppg .card-panel-tabs .tab-btn");
  if (!subtabBtns || subtabBtns.length === 0) return;

  subtabBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSubtab = btn.getAttribute("data-subtab");
      ppgState.activeSubtab = targetSubtab;

      subtabBtns.forEach(b => {
        b.classList.remove("active");
        b.style.borderBottomColor = "transparent";
        b.style.color = "var(--text-secondary)";
      });
      btn.classList.add("active");
      btn.style.borderBottomColor = "var(--primary)";
      btn.style.color = "var(--primary)";

      document.querySelectorAll("#section-ppg .subtab-content").forEach(content => {
        content.style.display = "none";
        content.classList.remove("active-tab");
      });

      const targetEl = document.getElementById(`subtab-${targetSubtab}`);
      if (targetEl) {
        targetEl.style.display = "block";
        targetEl.classList.add("active-tab");
      }

      // Pastikan posisi scroll langsung berada di paling atas tanpa jeda/offset ke bawah
      const mainWrapper = document.querySelector(".main-wrapper");
      if (mainWrapper) mainWrapper.scrollTop = 0;
      window.scrollTo(0, 0);

      if (targetSubtab === "data-ppg") {
        renderPpgDataTab();
      } else if (targetSubtab === "input-capaian") {
        initPpgInputTab();
      } else if (targetSubtab === "monitoring-hadis") {
        renderMonitoringHadisTab();
      } else if (targetSubtab === "master-kurikulum") {
        renderMasterKurikulumTab();
      }
    });
  });
}

/**
 * Mengambil Data PPG dari Supabase atau LocalStorage
 */
async function loadPpgDataFromDatabase() {
  let loadedFromSupabase = false;

  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const [resBidang, resMateri, resKeilmuan, resHadis] = await Promise.all([
        supabaseClient.from("master_bidang_keilmuan").select("*").order("urutan", { ascending: true }),
        supabaseClient.from("master_keilmuan_materi").select("*").order("urutan", { ascending: true }),
        supabaseClient.from("generus_keilmuan_progress").select("*"),
        supabaseClient.from("generus_hadis_progress").select("*")
      ]);

      if (!resBidang.error && resBidang.data && resBidang.data.length > 0) {
        ppgState.masterBidang = resBidang.data;
        loadedFromSupabase = true;
      }
      if (!resMateri.error && resMateri.data && resMateri.data.length > 0) {
        ppgState.masterMateri = resMateri.data;
        loadedFromSupabase = true;
      }
      if (!resKeilmuan.error && resKeilmuan.data) {
        ppgState.keilmuanProgress = resKeilmuan.data;
      }
      if (!resHadis.error && resHadis.data) {
        ppgState.hadisProgress = resHadis.data;
      }
    } catch (e) {
      console.warn("Koneksi Supabase PPG dialihkan ke fallback lokal:", e);
    }
  }

  if (!loadedFromSupabase) {
    // Fallback: LocalStorage / Default Seed
    const localBidang = localStorage.getItem("aji_ppg_master_bidang");
    const localMateri = localStorage.getItem("aji_ppg_master_materi");
    const localProgress = localStorage.getItem("aji_ppg_keilmuan_progress");
    const localHadis = localStorage.getItem("aji_ppg_hadis_progress");

    ppgState.masterBidang = localBidang ? JSON.parse(localBidang) : DEFAULT_PPG_BIDANG;
    ppgState.masterMateri = localMateri ? JSON.parse(localMateri) : DEFAULT_PPG_MATERI;
    ppgState.keilmuanProgress = localProgress ? JSON.parse(localProgress) : [];
    ppgState.hadisProgress = localHadis ? JSON.parse(localHadis) : [];

    // Simpan inisialisasi default ke localStorage jika baru pertama
    if (!localBidang) localStorage.setItem("aji_ppg_master_bidang", JSON.stringify(ppgState.masterBidang));
    if (!localMateri) localStorage.setItem("aji_ppg_master_materi", JSON.stringify(ppgState.masterMateri));
  }
}

/**
 * Filter Helper: Cek apakah Jamaah adalah Generus (PAUD, Caberawit, GUS, GUM)
 */
function isGenerusJamaah(jamaah) {
  if (!jamaah) return false;
  const status = (jamaah.statusKeaktifan || "Aktif").trim().toLowerCase();
  if (status !== "aktif") return false;
  const kp = (jamaah.kelompokPeramutan || "").trim();
  return ["PAUD", "Caberawit", "GUS", "GUM"].includes(kp);
}

/**
 * Menghitung Prosentase Kehadiran Generus pada Bulan & Tahun Tertentu
 * Formula: ((Hadir + Online) / Total Sesi Sasaran Terlaksana) * 100%
 * Hanya sesi-sesi pengajian di mana generus menjadi peserta target yang dihitung sebagai pembagi.
 */
function calculateSantriPresensiStats(jamaahId, targetKelompok, targetPeramutan, bulan, tahun) {
  const allJadwal = typeof getJadwalPengajianList === 'function' ? getJadwalPengajianList() : (typeof localJadwalPengajian !== 'undefined' ? localJadwalPengajian : []);
  const allPresensi = typeof getPresensiKehadiranList === 'function' ? getPresensiKehadiranList() : (typeof localPresensiKehadiran !== 'undefined' ? localPresensiKehadiran : []);
  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);

  const santri = allJamaah.find(j => j.id === jamaahId) || {
    id: jamaahId,
    kelompokPengajian: targetKelompok,
    kelompokPeramutan: targetPeramutan
  };

  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const now = new Date();
  const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');

  const isConductedSession = (s) => {
    if (!s || !s.tanggal) return false;
    if (s.tanggal < todayStr) return true;
    if (s.tanggal === todayStr) {
      return timeNow >= (s.waktu_selesai || "23:59") || allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
    }
    return allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
  };

  // Filter jadwal pengajian pada bulan & tahun terpilih
  const bulanStr = String(bulan).padStart(2, '0');
  const targetYearMonth = `${tahun}-${bulanStr}`;

  const relevantJadwal = allJadwal.filter(s => {
    if (!s.tanggal || !s.tanggal.startsWith(targetYearMonth)) return false;

    // Hanya sesi yang sudah terlaksana atau memiliki presensi
    if (!isConductedSession(s)) return false;

    // Cek apakah generus ini terdaftar / memenuhi syarat sebagai peserta sasaran kegiatan
    if (typeof window.isJamaahEligibleForSchedule === 'function') {
      if (!window.isJamaahEligibleForSchedule(santri, s)) return false;
    } else {
      const tk = String(s.tingkat_pengajian || '').toLowerCase();
      const isKelompok = tk.includes('kelompok') || (!tk.includes('desa') && !tk.includes('daerah'));
      if (isKelompok) {
        const sk = String(s.kelompok_pengajian || '').trim().toLowerCase();
        const jk = String(santri.kelompokPengajian || targetKelompok || '').trim().toLowerCase();
        if (sk && jk && sk !== 'semua' && sk !== jk) return false;
      }
      if (s.peserta_spesifik) {
        const allowedIds = s.peserta_spesifik.split(',').map(id => id.trim()).filter(Boolean);
        if (allowedIds.length > 0 && !allowedIds.includes(santri.id)) return false;
      }
      if (typeof isJamaahEligibleForJenis === 'function') {
        if (!isJamaahEligibleForJenis(santri, s.jenis_pengajian)) return false;
      }
    }

    return true;
  });

  const totalSesi = relevantJadwal.length;
  if (totalSesi === 0) {
    return {
      persentase: null, // Belum ada sesi kegiatan sasaran yang terlaksana
      totalSesi: 0,
      hadir: 0,
      online: 0,
      izin: 0,
      sakit: 0,
      alpha: 0
    };
  }

  const jadwalIds = new Set(relevantJadwal.map(j => j.id));
  let hadirCount = 0;
  let onlineCount = 0;
  let izinCount = 0;
  let sakitCount = 0;
  let alphaCount = 0;

  allPresensi.forEach(p => {
    if (p.id_jamaah === jamaahId && jadwalIds.has(p.id_pengajian)) {
      const st = (p.status || "").trim().toLowerCase();
      if (st === "hadir" || st === "hadir fisik") hadirCount++;
      else if (st === "online") onlineCount++;
      else if (st === "izin") izinCount++;
      else if (st === "sakit") sakitCount++;
      else if (st === "alpha" || st === "alpa") alphaCount++;
    }
  });

  const recordedTotal = hadirCount + onlineCount + izinCount + sakitCount + alphaCount;
  const unrecorded = Math.max(0, totalSesi - recordedTotal);
  alphaCount += unrecorded;

  const validHadir = hadirCount + onlineCount;
  const persentase = Math.min(100, Math.round((validHadir / totalSesi) * 100));

  return {
    persentase,
    totalSesi,
    hadir: hadirCount,
    online: onlineCount,
    izin: izinCount,
    sakit: sakitCount,
    alpha: alphaCount
  };
}

/**
 * Menghitung Akumulasi Capaian Materi Santri Sesuai Jenjangnya
 */
function calculateSantriKurikulumProgress(santri) {
  const jenjang = santri.kelompokPeramutan;
  
  // Ambil daftar materi yang ditujukan untuk jenjang santri ini
  const relevantMateri = ppgState.masterMateri.filter(m => {
    if (Array.isArray(m.kategori_generus)) {
      return m.kategori_generus.includes(jenjang);
    }
    return false;
  });

  const totalTarget = relevantMateri.length;
  if (totalTarget === 0) return { totalTarget: 0, tuntasCount: 0, persentase: 0, details: [] };

  let tuntasCount = 0;
  const details = relevantMateri.map(m => {
    if (m.tipe_penilaian === "halaman") {
      const hp = ppgState.hadisProgress.find(h => h.jamaah_id === santri.id && h.materi_id === m.id);
      const isKhatam = hp && hp.status === "Khatam";
      if (isKhatam) tuntasCount++;
      return {
        materi: m,
        type: "halaman",
        status: hp ? hp.status : "Belum",
        persentase: hp ? hp.persentase_selesai : 0,
        total_halaman: m.total_halaman || 0,
        halaman_selesai: hp ? (hp.halaman_selesai || []).length : 0,
        data: hp || null
      };
    } else {
      const kp = ppgState.keilmuanProgress.find(k => k.jamaah_id === santri.id && k.materi_id === m.id);
      const isTuntas = kp && kp.status === "Tuntas";
      if (isTuntas) tuntasCount++;
      return {
        materi: m,
        type: "standar",
        status: kp ? kp.status : "Belum",
        nilai_angka: kp ? kp.nilai_angka : null,
        tanggal_tuntas: kp ? kp.tanggal_tuntas : null,
        penguji_nama: kp ? kp.penguji_nama : null,
        catatan: kp ? kp.catatan : null,
        data: kp || null
      };
    }
  });

  const persentase = Math.round((tuntasCount / totalTarget) * 100);
  return { totalTarget, tuntasCount, persentase, details };
}

/**
 * Helper: Ekstrak nama kelompok valid dari berbagai struktur data (Object/String)
 */
function extractKelompokName(item) {
  if (item === null || item === undefined) return null;
  if (typeof item === 'string') {
    const s = item.trim();
    return (s && s !== 'undefined' && s !== 'null') ? s : null;
  }
  if (typeof item === 'object') {
    const candidate = item.nama || item.nama_kelompok || item.kelompok || item.name || item.namaKelompok || item.value || item.label;
    if (candidate && typeof candidate === 'string') {
      const s = candidate.trim();
      return (s && s !== 'undefined' && s !== 'null') ? s : null;
    }
  }
  return null;
}

/**
 * Mengambil daftar kelompok murni dari tabel master_kelompok (Supabase / Local State)
 */
async function loadMasterKelompokList() {
  let raw = [];

  // 1. Ambil langsung dari Supabase tabel master_kelompok
  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('master_kelompok').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        raw = data;
      }
    } catch (err) {
      console.warn("PPG: Gagal mengambil master_kelompok dari Supabase:", err);
    }
  }

  // 2. Fallbacks
  if (raw.length === 0 && typeof getKelompokList === 'function') {
    raw = getKelompokList() || [];
  }
  if (raw.length === 0 && typeof localMasterKelompok !== 'undefined' && Array.isArray(localMasterKelompok) && localMasterKelompok.length > 0) {
    raw = localMasterKelompok;
  }
  if (raw.length === 0 && typeof state !== 'undefined' && state.masterData && state.masterData.kelompok) {
    raw = state.masterData.kelompok;
  }
  if (raw.length === 0) {
    try {
      const stored = localStorage.getItem("aji_master_kelompok");
      if (stored) raw = JSON.parse(stored);
    } catch (e) {}
  }
  if (raw.length === 0 && typeof getJamaahList === 'function') {
    const jList = getJamaahList() || [];
    raw = [...new Set(jList.map(j => j.kelompokPengajian).filter(Boolean))];
  }

  const clean = raw.map(extractKelompokName).filter(Boolean);
  return [...new Set(clean)].sort();
}

/**
 * Populasikan Dropdown Filter Kelompok, Bulan, Tahun di Seluruh Tab PPG
 */
async function populatePpgFilterOptions() {
  const kelompokSelect = document.getElementById("ppg-filter-kelompok");
  const batchKelompokSelect = document.getElementById("ppg-batch-kelompok");
  const indivKelompokSelect = document.getElementById("ppg-individu-kelompok");
  const bulanSelect = document.getElementById("ppg-filter-bulan");
  const tahunSelect = document.getElementById("ppg-filter-tahun");

  const cleanKelompokList = await loadMasterKelompokList();

  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pendidik ppg" || curRoleClean === "pengurus kelompok");

  const populateKelDropdown = (selectEl, defaultLabel, currentVal) => {
    if (!selectEl) return;
    const previousVal = currentVal || selectEl.value;
    selectEl.innerHTML = `<option value="">${defaultLabel}</option>`;
    cleanKelompokList.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      if (k === previousVal) opt.selected = true;
      selectEl.appendChild(opt);
    });

    if (isRestricted && currentUser.kelompok && currentUser.kelompok !== "Semua") {
      selectEl.value = currentUser.kelompok;
      selectEl.disabled = true;
    } else {
      selectEl.disabled = false;
    }
  };

  populateKelDropdown(kelompokSelect, "Semua Kelompok", ppgState.filterKelompok);
  populateKelDropdown(batchKelompokSelect, "Semua Kelompok", document.getElementById("ppg-batch-kelompok")?.value);
  populateKelDropdown(indivKelompokSelect, "Semua Kelompok", document.getElementById("ppg-individu-kelompok")?.value);

  if (isRestricted && currentUser.kelompok && currentUser.kelompok !== "Semua") {
    ppgState.filterKelompok = currentUser.kelompok;
  }

  // Filter Bulan
  if (bulanSelect && bulanSelect.options.length === 0) {
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    monthNames.forEach((m, idx) => {
      const opt = document.createElement("option");
      opt.value = idx + 1;
      opt.textContent = m;
      if (idx + 1 === ppgState.filterBulan) opt.selected = true;
      bulanSelect.appendChild(opt);
    });
  }

  // Filter Tahun
  if (tahunSelect && tahunSelect.options.length === 0) {
    const curYear = new Date().getFullYear();
    for (let y = curYear - 1; y <= curYear + 1; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === ppgState.filterTahun) opt.selected = true;
      tahunSelect.appendChild(opt);
    }
  }
}

/**
 * Reset Filter Tab 1
 */
function resetPpgFilters() {
  ppgState.filterSearch = "";
  ppgState.filterGender = "";
  ppgState.filterKategori = "";
  ppgState.filterBulan = new Date().getMonth() + 1;
  ppgState.filterTahun = new Date().getFullYear();

  const searchInput = document.getElementById("ppg-filter-search");
  const genderSelect = document.getElementById("ppg-filter-gender");
  const kategoriSelect = document.getElementById("ppg-filter-kategori");
  const bulanSelect = document.getElementById("ppg-filter-bulan");
  const tahunSelect = document.getElementById("ppg-filter-tahun");

  if (searchInput) searchInput.value = "";
  if (genderSelect) genderSelect.value = "";
  if (kategoriSelect) kategoriSelect.value = "";
  if (bulanSelect) bulanSelect.value = ppgState.filterBulan;
  if (tahunSelect) tahunSelect.value = ppgState.filterTahun;

  const kelompokSelect = document.getElementById("ppg-filter-kelompok");
  if (kelompokSelect && !kelompokSelect.disabled) {
    kelompokSelect.value = "";
    ppgState.filterKelompok = "";
  }

  renderPpgDataTab();
}

/**
 * Render Tab 1: Data & Monitoring Generus
 */
function renderPpgDataTab() {
  const tbody = document.getElementById("ppg-santri-table-body");
  if (!tbody) return;

  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  
  // Saring hanya santri Generus (PAUD, Caberawit, GUS, GUM)
  let generusList = allJamaah.filter(j => isGenerusJamaah(j));

  // Terapkan filter
  if (ppgState.filterKelompok) {
    generusList = generusList.filter(j => j.kelompokPengajian === ppgState.filterKelompok);
  }
  if (ppgState.filterGender) {
    generusList = generusList.filter(j => j.jenisKelamin === ppgState.filterGender);
  }
  if (ppgState.filterKategori) {
    generusList = generusList.filter(j => j.kelompokPeramutan === ppgState.filterKategori);
  }
  if (ppgState.filterSearch) {
    const q = ppgState.filterSearch.toLowerCase();
    generusList = generusList.filter(j => (j.namaLengkap || "").toLowerCase().includes(q) || (j.id || "").toLowerCase().includes(q));
  }

  // Hitung KPI Stats
  let totalSangatAktif = 0;
  let sumPersentase = 0;
  let countWithSessions = 0;
  let totalMateriLulusGlobal = 0;

  const processedSantri = generusList.map(santri => {
    const presensiStats = calculateSantriPresensiStats(
      santri.id,
      santri.kelompokPengajian,
      santri.kelompokPeramutan,
      ppgState.filterBulan,
      ppgState.filterTahun
    );

    const kurikulumStats = calculateSantriKurikulumProgress(santri);
    totalMateriLulusGlobal += kurikulumStats.tuntasCount;

    if (presensiStats.persentase !== null) {
      sumPersentase += presensiStats.persentase;
      countWithSessions++;
      if (presensiStats.persentase >= 80) totalSangatAktif++;
    }

    return { santri, presensiStats, kurikulumStats };
  });

  // Urutkan generus dari persentase kehadiran tertinggi ke terendah
  processedSantri.sort((a, b) => {
    const pctA = a.presensiStats.persentase !== null ? a.presensiStats.persentase : -1;
    const pctB = b.presensiStats.persentase !== null ? b.presensiStats.persentase : -1;
    if (pctB !== pctA) {
      return pctB - pctA;
    }
    // Jika persentase kehadiran sama, urutkan berdasarkan capaian materi tuntas tertinggi
    if (b.kurikulumStats.tuntasCount !== a.kurikulumStats.tuntasCount) {
      return b.kurikulumStats.tuntasCount - a.kurikulumStats.tuntasCount;
    }
    // Jika masih sama, urutkan alfabetis nama
    return (a.santri.namaLengkap || '').localeCompare(b.santri.namaLengkap || '');
  });

  // Update KPI Cards UI
  const elTotal = document.getElementById("ppg-kpi-total-generus");
  const elAktif = document.getElementById("ppg-kpi-sangat-aktif");
  const elAvg = document.getElementById("ppg-kpi-avg-kehadiran");
  const elTuntas = document.getElementById("ppg-kpi-total-tuntas");

  if (elTotal) elTotal.textContent = generusList.length;
  if (elAktif) elAktif.textContent = totalSangatAktif;
  if (elAvg) elAvg.textContent = countWithSessions > 0 ? Math.round(sumPersentase / countWithSessions) + "%" : "-";
  if (elTuntas) elTuntas.textContent = totalMateriLulusGlobal;

  // Render Table Rows
  tbody.innerHTML = "";
  if (processedSantri.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-secondary);">Tidak ada data santri generus yang sesuai kriteria filter.</td></tr>`;
    return;
  }

  processedSantri.forEach((item, index) => {
    const { santri, presensiStats, kurikulumStats } = item;
    const tr = document.createElement("tr");

    // Badge Peramutan
    let peramutanClass = "badge-generus-paud";
    if (santri.kelompokPeramutan === "Caberawit") peramutanClass = "badge-generus-caberawit";
    else if (santri.kelompokPeramutan === "GUS") peramutanClass = "badge-generus-gus";
    else if (santri.kelompokPeramutan === "GUM") peramutanClass = "badge-generus-gum";

    // Presensi Badge & Indicator
    let presensiHtml = "";
    if (presensiStats.persentase === null) {
      presensiHtml = `<span style="color:var(--text-muted); font-size:0.85rem;">Belum ada sesi</span>`;
    } else {
      let badgeColorClass = "badge-red";
      let statusLabel = "Kurang Aktif";
      let dotColor = "#ef4444";
      if (presensiStats.persentase >= 80) {
        badgeColorClass = "badge-green";
        statusLabel = "Sangat Aktif";
        dotColor = "#10b981";
      } else if (presensiStats.persentase >= 50) {
        badgeColorClass = "badge-yellow";
        statusLabel = "Cukup";
        dotColor = "#f59e0b";
      }

      const tooltipText = `Hadir: ${presensiStats.hadir} | Online: ${presensiStats.online} | Izin: ${presensiStats.izin} | Sakit: ${presensiStats.sakit} | Alpha: ${presensiStats.alpha} (Total ${presensiStats.totalSesi} Sesi)`;

      presensiHtml = `
        <div style="display:flex; align-items:center; gap:8px;" title="${tooltipText}">
          <span class="badge ${badgeColorClass}" style="font-weight:700; font-size:0.88rem; cursor:help;">
            <i class="fa-solid fa-circle" style="font-size:0.55rem; color:${dotColor}; margin-right:4px;"></i>
            ${presensiStats.persentase}%
          </span>
          <span style="font-size:0.75rem; color:var(--text-muted);">(${presensiStats.hadir + presensiStats.online}/${presensiStats.totalSesi})</span>
        </div>
      `;
    }

    // Capaian Keilmuan Progress Bar
    const kProgress = kurikulumStats.persentase;
    const kurikulumHtml = `
      <div style="min-width:140px;">
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:3px;">
          <span style="font-weight:600; color:var(--text-primary);">${kurikulumStats.tuntasCount}/${kurikulumStats.totalTarget} Materi</span>
          <span style="color:var(--primary); font-weight:700;">${kProgress}%</span>
        </div>
        <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
          <div style="width:${kProgress}%; height:100%; background:linear-gradient(90deg, #10b981, #059669); border-radius:10px;"></div>
        </div>
      </div>
    `;

    tr.innerHTML = `
      <td style="text-align:center; color:var(--text-muted); font-size:0.85rem;">${index + 1}</td>
      <td>
        <div style="font-weight:600; color:var(--text-primary);">${santri.namaLengkap}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${santri.id} &bull; ${santri.umur || 0} Thn</div>
      </td>
      <td style="text-align:center;">
        <span class="badge ${santri.jenisKelamin === 'Laki-laki' ? 'badge-blue' : 'badge-yellow'}" style="font-size:0.75rem;">
          ${santri.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
        </span>
      </td>
      <td><span style="font-size:0.85rem; color:var(--text-secondary);">${santri.kelompokPengajian}</span></td>
      <td>
        <span class="badge ${peramutanClass}" style="font-size:0.75rem; font-weight:600;">
          ${santri.kelompokPeramutan}
        </span>
      </td>
      <td>${presensiHtml}</td>
      <td>${kurikulumHtml}</td>
      <td style="text-align:center;">
        <button class="btn-primary" style="padding:6px 10px; font-size:0.8rem; border-radius:6px;" onclick="openRaporSantriModal('${santri.id}')" title="Buka Detail Rapor Santri">
          <i class="fa-solid fa-book-open"></i> Rapor
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Switch Input Mode di Tab 2 (Batch vs Individu)
 */
function switchPpgInputMode(mode) {
  ppgState.inputMode = mode;
  const btnBatch = document.getElementById("btn-ppg-mode-batch");
  const btnIndividu = document.getElementById("btn-ppg-mode-individu");
  const areaBatch = document.getElementById("ppg-input-mode-batch-area");
  const areaIndividu = document.getElementById("ppg-input-mode-individu-area");

  if (mode === "batch") {
    if (btnBatch) { btnBatch.classList.add("active"); btnBatch.style.background = "var(--primary)"; btnBatch.style.color = "#ffffff"; }
    if (btnIndividu) { btnIndividu.classList.remove("active"); btnIndividu.style.background = "transparent"; btnIndividu.style.color = "var(--text-secondary)"; }
    if (areaBatch) areaBatch.style.display = "block";
    if (areaIndividu) areaIndividu.style.display = "none";
    initBatchSelectors();
  } else {
    if (btnIndividu) { btnIndividu.classList.add("active"); btnIndividu.style.background = "var(--primary)"; btnIndividu.style.color = "#ffffff"; }
    if (btnBatch) { btnBatch.classList.remove("active"); btnBatch.style.background = "transparent"; btnBatch.style.color = "var(--text-secondary)"; }
    if (areaBatch) areaBatch.style.display = "none";
    if (areaIndividu) areaIndividu.style.display = "block";
    initIndividuSelector();
  }
}

/**
 * Inisialisasi Tab 2: Input Capaian Keilmuan
 */
function initPpgInputTab() {
  switchPpgInputMode(ppgState.inputMode || "batch");
  const mainWrapper = document.querySelector(".main-wrapper");
  if (mainWrapper) mainWrapper.scrollTop = 0;
  window.scrollTo(0, 0);
}

/**
 * Inisialisasi Selector Mode 1: Batch
 */
function initBatchSelectors() {
  populatePpgFilterOptions();

  const bidangSelect = document.getElementById("ppg-batch-bidang");
  if (bidangSelect) {
    bidangSelect.innerHTML = '<option value="">-- Pilih Bidang Keilmuan --</option>';
    ppgState.masterBidang.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.nama_bidang;
      bidangSelect.appendChild(opt);
    });
    if (ppgState.masterBidang.length > 0) {
      bidangSelect.value = ppgState.masterBidang[0].id;
    }
  }

  updateBatchMateriDropdown();
}

/**
 * Update Dropdown Target Materi sesuai Bidang & Jenjang Terpilih
 */
function updateBatchMateriDropdown() {
  const bidangSelect = document.getElementById("ppg-batch-bidang");
  const jenjangSelect = document.getElementById("ppg-batch-jenjang");
  const materiSelect = document.getElementById("ppg-batch-materi");

  if (!bidangSelect || !jenjangSelect || !materiSelect) return;

  const selectedBidang = bidangSelect.value;
  const selectedJenjang = jenjangSelect.value;

  materiSelect.innerHTML = '<option value="">-- Pilih Target Materi --</option>';

  const filteredMateri = ppgState.masterMateri.filter(m => {
    const matchBidang = !selectedBidang || m.bidang_id === selectedBidang;
    const matchJenjang = Array.isArray(m.kategori_generus) && m.kategori_generus.includes(selectedJenjang);
    return matchBidang && matchJenjang;
  });

  filteredMateri.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.nama_materi + (m.tipe_penilaian === 'halaman' ? ` (${m.total_halaman} Hal - Hadis)` : '');
    materiSelect.appendChild(opt);
  });

  if (filteredMateri.length > 0) {
    materiSelect.value = filteredMateri[0].id;
  }
}

/**
 * Muat Daftar Generus untuk Evaluasi Batch
 */
window.loadBatchSantriList = function() {
  const kelSelect = document.getElementById("ppg-batch-kelompok");
  const jenjangSelect = document.getElementById("ppg-batch-jenjang");
  const materiSelect = document.getElementById("ppg-batch-materi");
  const tbody = document.getElementById("ppg-batch-table-body");
  const container = document.getElementById("ppg-batch-table-container");

  if (!jenjangSelect || !materiSelect || !tbody) return;

  const kelompok = kelSelect ? kelSelect.value : "";
  const jenjang = jenjangSelect.value;
  const materiId = materiSelect.value;

  if (!materiId) {
    if (typeof showToast === 'function') showToast("Silakan pilih target materi terlebih dahulu.", "warning");
    return;
  }

  const selectedMateri = ppgState.masterMateri.find(m => m.id === materiId);
  if (!selectedMateri) return;

  // Saring generus yang aktif dan sesuai jenjang & kelompok
  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  let santriList = allJamaah.filter(j => isGenerusJamaah(j) && j.kelompokPeramutan === jenjang);

  if (kelompok) {
    santriList = santriList.filter(j => j.kelompokPengajian === kelompok);
  }

  if (container) container.style.display = "block";
  tbody.innerHTML = "";

  const infoBadge = document.getElementById("ppg-batch-materi-info");
  if (infoBadge) {
    infoBadge.innerHTML = `
      Target: <strong>${selectedMateri.nama_materi}</strong> &bull; Tipe: 
      <span class="badge ${selectedMateri.tipe_penilaian === 'halaman' ? 'badge-blue' : 'badge-green'}">
        ${selectedMateri.tipe_penilaian === 'halaman' ? selectedMateri.total_halaman + ' Halaman (Kitab Hadis)' : 'Standar Silabus'}
      </span>
    `;
  }

  if (santriList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:25px; color:var(--text-secondary);">Tidak ada data generus pada jenjang ${jenjang} untuk kelompok ini.</td></tr>`;
    return;
  }

  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const currentUsername = currentUser ? currentUser.username : "Pendidik PPG";
  const todayStr = new Date().toISOString().split('T')[0];

  santriList.forEach((santri, idx) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-jamaah-id", santri.id);
    tr.setAttribute("data-materi-id", materiId);

    if (selectedMateri.tipe_penilaian === "halaman") {
      // Tipe Penilaian Halaman (Hadis)
      const hp = ppgState.hadisProgress.find(h => h.jamaah_id === santri.id && h.materi_id === materiId);
      const halCount = hp ? (hp.halaman_selesai || []).length : 0;
      const pct = hp ? hp.persentase_selesai : 0;
      const status = hp ? hp.status : "Belum";
      const catatanVal = hp ? (hp.catatan || "") : "";

      tr.innerHTML = `
        <td style="text-align:center;">${idx + 1}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${santri.namaLengkap}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${santri.id} &bull; ${extractKelompokName(santri.kelompokPengajian)}</div>
        </td>
        <td style="text-align:center;">
          <span class="badge ${status === 'Khatam' ? 'badge-green' : (status === 'Proses' ? 'badge-yellow' : 'badge-red')}" style="font-weight:700; font-size:0.85rem;">
            ${pct}% (${status})
          </span>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
            ${halCount}/${selectedMateri.total_halaman} Hal
          </div>
        </td>
        <td colspan="4" style="text-align:center;">
          <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
            <button type="button" class="btn-primary" style="padding:6px 14px; font-size:0.82rem; border-radius:6px; display:inline-flex; align-items:center; gap:6px;" onclick="openHadisTrackerModal('${santri.id}', '${materiId}')">
              <i class="fa-solid fa-list-check"></i> Buka Pelacak Halaman (${halCount}/${selectedMateri.total_halaman})
            </button>
          </div>
        </td>
        <td>
          <input type="text" class="batch-catatan-input batch-hadis-catatan" value="${catatanVal}" placeholder="Catatan pemaknaan hadis..." style="width:100%; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
      `;
    } else {
      // Tipe Penilaian Standar
      const kp = ppgState.keilmuanProgress.find(k => k.jamaah_id === santri.id && k.materi_id === materiId);
      const curStatus = kp ? kp.status : "Belum";
      const curNilai = kp && kp.nilai_angka !== null ? kp.nilai_angka : "";
      const curTgl = kp && kp.tanggal_tuntas ? kp.tanggal_tuntas : (curStatus === 'Tuntas' ? todayStr : "");
      const curPenguji = kp && kp.penguji_nama ? kp.penguji_nama : currentUsername;
      const curCatatan = kp && kp.catatan ? kp.catatan : "";

      tr.innerHTML = `
        <td style="text-align:center;">${idx + 1}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${santri.namaLengkap}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${santri.id} &bull; ${santri.kelompokPengajian}</div>
        </td>
        <td style="text-align:center;">
          <span class="badge ${curStatus === 'Tuntas' ? 'badge-green' : (curStatus === 'Proses' ? 'badge-yellow' : 'badge-red')}">
            ${curStatus}
          </span>
        </td>
        <td>
          <select class="batch-status-select select-filter" style="padding:6px; font-size:0.85rem; width:100%;">
            <option value="Belum" ${curStatus === 'Belum' ? 'selected' : ''}>Belum</option>
            <option value="Proses" ${curStatus === 'Proses' ? 'selected' : ''}>Proses</option>
            <option value="Tuntas" ${curStatus === 'Tuntas' ? 'selected' : ''}>Tuntas</option>
          </select>
        </td>
        <td>
          <input type="number" min="0" max="100" class="batch-nilai-input" value="${curNilai}" placeholder="0-100" style="width:70px; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem; text-align:center;">
        </td>
        <td>
          <input type="date" class="batch-tanggal-input" value="${curTgl}" style="padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
        <td>
          <input type="text" class="batch-penguji-input" value="${curPenguji}" placeholder="Nama Guru" style="width:110px; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
        <td>
          <input type="text" class="batch-catatan-input" value="${curCatatan}" placeholder="Catatan evaluasi" style="width:100%; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
      `;
    }
    tbody.appendChild(tr);
  });
};

/**
 * Tandai Semua Generus Tuntas di Tabel Batch
 */
window.markAllBatchTuntas = function() {
  const selects = document.querySelectorAll(".batch-status-select");
  const dates = document.querySelectorAll(".batch-tanggal-input");
  const todayStr = new Date().toISOString().split('T')[0];

  selects.forEach(s => s.value = "Tuntas");
  dates.forEach(d => { if (!d.value) d.value = todayStr; });

  if (typeof showToast === 'function') showToast("Semua generus berhasil ditandai 'Tuntas'. Klik Simpan untuk memperbarui database.", "info");
};

/**
 * Simpan Seluruh Perubahan Batch ke Database & State
 */
window.saveAllBatchProgress = async function() {
  const tbody = document.getElementById("ppg-batch-table-body");
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr[data-jamaah-id]");
  if (rows.length === 0) return;

  const upsertPayloads = [];
  const hadisPayloads = [];

  rows.forEach(tr => {
    const jamaahId = tr.getAttribute("data-jamaah-id");
    const materiId = tr.getAttribute("data-materi-id");

    const statusEl = tr.querySelector(".batch-status-select");
    if (!statusEl) {
      // Baris tipe hadis: simpan catatan jika ada
      const hadisCatatanEl = tr.querySelector(".batch-hadis-catatan");
      if (hadisCatatanEl) {
        const catatanVal = hadisCatatanEl.value.trim();
        let hp = ppgState.hadisProgress.find(h => h.jamaah_id === jamaahId && h.materi_id === materiId);
        if (hp) {
          hp.catatan = catatanVal;
          hp.updated_at = new Date().toISOString();
        } else {
          const mat = ppgState.masterMateri.find(m => m.id === materiId);
          hp = {
            jamaah_id: jamaahId,
            materi_id: materiId,
            total_halaman: mat ? (mat.total_halaman || 150) : 150,
            halaman_selesai: [],
            persentase_selesai: 0,
            status: "Belum",
            tanggal_khatam: null,
            penguji_terakhir: "",
            catatan: catatanVal,
            updated_at: new Date().toISOString()
          };
          ppgState.hadisProgress.push(hp);
        }
        hadisPayloads.push({ ...hp });
      }
      return;
    }

    const status = statusEl.value;
    const nilaiEl = tr.querySelector(".batch-nilai-input");
    const tglEl = tr.querySelector(".batch-tanggal-input");
    const pengujiEl = tr.querySelector(".batch-penguji-input");
    const catatanEl = tr.querySelector(".batch-catatan-input");

    const nilaiVal = nilaiEl && nilaiEl.value ? parseFloat(nilaiEl.value) : null;
    const tglVal = tglEl && tglEl.value ? tglEl.value : (status === 'Tuntas' ? new Date().toISOString().split('T')[0] : null);
    const pengujiVal = pengujiEl ? pengujiEl.value.trim() : "";
    const catatanVal = catatanEl ? catatanEl.value.trim() : "";

    upsertPayloads.push({
      jamaah_id: jamaahId,
      materi_id: materiId,
      status: status,
      nilai_angka: nilaiVal,
      tanggal_tuntas: tglVal,
      penguji_nama: pengujiVal,
      catatan: catatanVal,
      updated_at: new Date().toISOString()
    });
  });

  if (upsertPayloads.length === 0 && hadisPayloads.length === 0) return;

  // Simpan ke Supabase jika aktif
  let supabaseSuccess = false;
  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      if (upsertPayloads.length > 0) {
        const { error } = await supabaseClient.from("generus_keilmuan_progress").upsert(upsertPayloads, { onConflict: 'jamaah_id,materi_id' });
        if (!error) supabaseSuccess = true;
        else console.error("Gagal batch upsert ke Supabase:", error);
      }
      if (hadisPayloads.length > 0) {
        await supabaseClient.from("generus_hadis_progress").upsert(hadisPayloads, { onConflict: 'jamaah_id,materi_id' });
      }
    } catch (e) {
      console.warn("Exception batch upsert Supabase:", e);
    }
  }

  // Perbarui Local State & LocalStorage
  upsertPayloads.forEach(item => {
    const idx = ppgState.keilmuanProgress.findIndex(k => k.jamaah_id === item.jamaah_id && k.materi_id === item.materi_id);
    if (idx !== -1) {
      ppgState.keilmuanProgress[idx] = { ...ppgState.keilmuanProgress[idx], ...item };
    } else {
      ppgState.keilmuanProgress.push(item);
    }
  });
  localStorage.setItem("aji_ppg_keilmuan_progress", JSON.stringify(ppgState.keilmuanProgress));

  hadisPayloads.forEach(item => {
    const idx = ppgState.hadisProgress.findIndex(k => k.jamaah_id === item.jamaah_id && k.materi_id === item.materi_id);
    if (idx !== -1) {
      ppgState.hadisProgress[idx] = { ...ppgState.hadisProgress[idx], ...item };
    } else {
      ppgState.hadisProgress.push(item);
    }
  });
  localStorage.setItem("aji_ppg_hadis_progress", JSON.stringify(ppgState.hadisProgress));

  // Tampilkan Notifikasi Sukses
  if (typeof showToast === 'function') {
    showToast(`Berhasil menyimpan ${upsertPayloads.length} capaian materi generus!`, "success");
  }

  // Muat ulang tampilan tabel batch dan tab 1
  loadBatchSantriList();
  renderPpgDataTab();
};

/**
 * Inisialisasi Mode 2: Input per Individu
 */
function initIndividuSelector() {
  populatePpgFilterOptions();
  updateIndividuGenerusDropdown();
}

/**
 * Update dropdown pilihan generus di Mode 2 dengan filter Kelompok & Jenjang (PAUD, Caberawit, GUS, GUM)
 */
window.updateIndividuGenerusDropdown = function() {
  const selectGenerus = document.getElementById("ppg-individu-santri-select");
  if (!selectGenerus) return;

  const kelompokFilter = (document.getElementById("ppg-individu-kelompok")?.value || "").trim().toLowerCase();
  const jenjangFilter = (document.getElementById("ppg-individu-jenjang")?.value || "").trim().toUpperCase();

  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  let generusList = allJamaah.filter(j => isGenerusJamaah(j));

  if (kelompokFilter) {
    generusList = generusList.filter(j => extractKelompokName(j.kelompokPengajian).toLowerCase() === kelompokFilter);
  }
  if (jenjangFilter) {
    generusList = generusList.filter(j => (j.kelompokPeramutan || "").toUpperCase() === jenjangFilter);
  }

  // Sort generus alphabetically by name
  generusList.sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));

  const prevVal = selectGenerus.value;
  selectGenerus.innerHTML = '<option value="">-- Cari / Pilih Generus --</option>';
  generusList.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.namaLengkap} (${s.id}) - ${s.kelompokPeramutan || '-'} [${extractKelompokName(s.kelompokPengajian)}]`;
    selectGenerus.appendChild(opt);
  });

  if (prevVal && generusList.some(s => s.id === prevVal)) {
    selectGenerus.value = prevVal;
  } else {
    const container = document.getElementById("ppg-individu-content");
    if (container && (!prevVal || !generusList.some(s => s.id === prevVal))) {
      container.style.display = "none";
    }
  }
};

/**
 * Muat Rapor Capaian Individu untuk Editing
 */
window.loadIndividuRapor = function() {
  const selectSantri = document.getElementById("ppg-individu-santri-select");
  const container = document.getElementById("ppg-individu-content");
  if (!selectSantri || !container) return;

  const santriId = selectSantri.value;
  if (!santriId) {
    container.style.display = "none";
    return;
  }

  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  const santri = allJamaah.find(j => j.id === santriId);
  if (!santri) return;

  container.style.display = "block";

  // Header Card
  const profileEl = document.getElementById("ppg-individu-profile-card");
  if (profileEl) {
    profileEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:50px; height:50px; border-radius:50%; background:var(--primary-soft); display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:var(--primary); font-weight:700;">
          ${santri.namaLengkap.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 style="margin:0; font-size:1.15rem; color:var(--text-primary);">${santri.namaLengkap}</h4>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:3px;">
            ID: <strong style="color:var(--text-primary);">${santri.id}</strong> &bull; 
            Rukun: <strong style="color:var(--text-primary);">${extractKelompokName(santri.kelompokPengajian)}</strong> &bull; 
            Jenjang: <span class="badge badge-generus-${(santri.kelompokPeramutan || '').toLowerCase()}">${santri.kelompokPeramutan}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Matriks Silabus Generus
  const tbody = document.getElementById("ppg-individu-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const stats = calculateSantriKurikulumProgress(santri);
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const currentUsername = currentUser ? currentUser.username : "Pendidik PPG";

  if (stats.details.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-secondary);">Belum ada kurikulum yang dikonfigurasi untuk jenjang ${santri.kelompokPeramutan}.</td></tr>`;
    return;
  }

  stats.details.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-santri-id", santri.id);
    tr.setAttribute("data-materi-id", item.materi.id);

    const bidangObj = ppgState.masterBidang.find(b => b.id === item.materi.bidang_id);
    const bidangNama = bidangObj ? bidangObj.nama_bidang : "-";

    if (item.type === "halaman") {
      const curCatatan = item.data && item.data.catatan ? item.data.catatan : "";
      tr.innerHTML = `
        <td style="text-align:center;">${idx + 1}</td>
        <td><span style="font-size:0.8rem; color:var(--text-secondary);">${bidangNama}</span></td>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${item.materi.nama_materi}</div>
          <span class="badge badge-blue" style="font-size:0.75rem;">Kitab Hadis (${item.materi.total_halaman} Hal)</span>
        </td>
        <td style="text-align:center;">
          <span class="badge ${item.status === 'Khatam' ? 'badge-green' : (item.status === 'Proses' ? 'badge-yellow' : 'badge-red')}" style="font-weight:700; font-size:0.85rem;">
            ${item.persentase}% (${item.status})
          </span>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
            ${item.halaman_selesai}/${item.total_halaman} Hal
          </div>
        </td>
        <td colspan="2" style="text-align:center;">
          <button type="button" class="btn-primary" style="padding:6px 14px; font-size:0.82rem; border-radius:6px; display:inline-flex; align-items:center; gap:6px;" onclick="openHadisTrackerModal('${santri.id}', '${item.materi.id}')">
            <i class="fa-solid fa-list-check"></i> Pelacak Halaman (${item.halaman_selesai}/${item.total_halaman})
          </button>
        </td>
        <td>
          <input type="text" class="indiv-catatan-input indiv-hadis-catatan" value="${curCatatan}" placeholder="Catatan pemaknaan hadis..." style="width:100%; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td style="text-align:center;">${idx + 1}</td>
        <td><span style="font-size:0.8rem; color:var(--text-secondary);">${bidangNama}</span></td>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${item.materi.nama_materi}</div>
        </td>
        <td>
          <select class="indiv-status-select select-filter" style="padding:6px; font-size:0.85rem; width:100%;">
            <option value="Belum" ${item.status === 'Belum' ? 'selected' : ''}>Belum</option>
            <option value="Proses" ${item.status === 'Proses' ? 'selected' : ''}>Proses</option>
            <option value="Tuntas" ${item.status === 'Tuntas' ? 'selected' : ''}>Tuntas</option>
          </select>
        </td>
        <td>
          <input type="number" min="0" max="100" class="indiv-nilai-input" value="${item.nilai_angka !== null ? item.nilai_angka : ''}" placeholder="Nilai" style="width:70px; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem; text-align:center;">
        </td>
        <td>
          <input type="text" class="indiv-penguji-input" value="${item.penguji_nama || currentUsername}" placeholder="Penguji" style="width:110px; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
        <td>
          <input type="text" class="indiv-catatan-input" value="${item.catatan || ''}" placeholder="Catatan" style="width:100%; padding:6px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.85rem;">
        </td>
      `;
    }
    tbody.appendChild(tr);
  });
};

/**
 * Simpan Capaian Seluruh Baris Individu
 */
window.saveIndividuRapor = async function() {
  const tbody = document.getElementById("ppg-individu-table-body");
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr[data-santri-id]");
  const payloads = [];
  const hadisPayloads = [];

  rows.forEach(tr => {
    const santriId = tr.getAttribute("data-santri-id");
    const materiId = tr.getAttribute("data-materi-id");

    const statusSelect = tr.querySelector(".indiv-status-select");
    if (statusSelect) {
      const status = statusSelect.value;
      const nilaiEl = tr.querySelector(".indiv-nilai-input");
      const pengujiEl = tr.querySelector(".indiv-penguji-input");
      const catatanEl = tr.querySelector(".indiv-catatan-input:not(.indiv-hadis-catatan)");

      payloads.push({
        jamaah_id: santriId,
        materi_id: materiId,
        status: status,
        nilai_angka: nilaiEl && nilaiEl.value ? parseFloat(nilaiEl.value) : null,
        tanggal_tuntas: status === 'Tuntas' ? new Date().toISOString().split('T')[0] : null,
        penguji_nama: pengujiEl ? pengujiEl.value.trim() : "",
        catatan: catatanEl ? catatanEl.value.trim() : "",
        updated_at: new Date().toISOString()
      });
      return;
    }

    // Baris Hadis Himpunan
    const hadisCatatanEl = tr.querySelector(".indiv-hadis-catatan");
    if (hadisCatatanEl) {
      const newCatatan = hadisCatatanEl.value.trim();
      let hp = ppgState.hadisProgress.find(h => h.jamaah_id === santriId && h.materi_id === materiId);
      if (hp) {
        hp.catatan = newCatatan;
        hp.updated_at = new Date().toISOString();
      } else {
        const mat = ppgState.masterMateri.find(m => m.id === materiId);
        hp = {
          jamaah_id: santriId,
          materi_id: materiId,
          total_halaman: mat ? (mat.total_halaman || 150) : 150,
          halaman_selesai: [],
          persentase_selesai: 0,
          status: "Belum",
          tanggal_khatam: null,
          penguji_terakhir: "",
          catatan: newCatatan,
          updated_at: new Date().toISOString()
        };
        ppgState.hadisProgress.push(hp);
      }
      hadisPayloads.push({ ...hp });
    }
  });

  if (payloads.length === 0 && hadisPayloads.length === 0) return;

  // Simpan Standar ke Supabase
  if (payloads.length > 0 && typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from("generus_keilmuan_progress").upsert(payloads, { onConflict: 'jamaah_id,materi_id' });
    } catch (e) {
      console.warn("Gagal simpan individu ke Supabase:", e);
    }
  }

  // Simpan Hadis ke Supabase
  if (hadisPayloads.length > 0 && typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from("generus_hadis_progress").upsert(hadisPayloads, { onConflict: 'jamaah_id,materi_id' });
    } catch (e) {
      console.warn("Gagal simpan hadis individu ke Supabase:", e);
    }
  }

  // Update State Standar
  payloads.forEach(item => {
    const idx = ppgState.keilmuanProgress.findIndex(k => k.jamaah_id === item.jamaah_id && k.materi_id === item.materi_id);
    if (idx !== -1) ppgState.keilmuanProgress[idx] = { ...ppgState.keilmuanProgress[idx], ...item };
    else ppgState.keilmuanProgress.push(item);
  });
  localStorage.setItem("aji_ppg_keilmuan_progress", JSON.stringify(ppgState.keilmuanProgress));

  // Update State Hadis
  hadisPayloads.forEach(item => {
    const idx = ppgState.hadisProgress.findIndex(k => k.jamaah_id === item.jamaah_id && k.materi_id === item.materi_id);
    if (idx !== -1) ppgState.hadisProgress[idx] = { ...ppgState.hadisProgress[idx], ...item };
    else ppgState.hadisProgress.push(item);
  });
  localStorage.setItem("aji_ppg_hadis_progress", JSON.stringify(ppgState.hadisProgress));

  if (typeof showToast === 'function') showToast("Rapor generus berhasil diperbarui!", "success");
  loadIndividuRapor();
  renderPpgDataTab();
};

/**
 * ====================================================================
 * MODAL PELACAK PROGRES HADIS HIMPUNAN (HALAMAN PER HALAMAN)
 * ====================================================================
 */
window.openHadisTrackerModal = function(santriId, materiId) {
  const modal = document.getElementById("modal-ppg-hadis-tracker");
  if (!modal) return;

  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  const santri = allJamaah.find(j => j.id === santriId);
  const materi = ppgState.masterMateri.find(m => m.id === materiId);

  if (!santri || !materi) return;

  ppgState.activeHadisSantri = santri;
  ppgState.activeHadisMateri = materi;

  // Cari progres tersimpan
  let progress = ppgState.hadisProgress.find(h => h.jamaah_id === santriId && h.materi_id === materiId);
  if (!progress) {
    progress = {
      jamaah_id: santriId,
      materi_id: materiId,
      total_halaman: materi.total_halaman || 150,
      halaman_selesai: [],
      persentase_selesai: 0,
      status: "Belum",
      tanggal_khatam: null,
      penguji_terakhir: "",
      catatan: ""
    };
  } else {
    // Clone agar tidak langsung mutasi sebelum klik simpan
    progress = JSON.parse(JSON.stringify(progress));
    if (!Array.isArray(progress.halaman_selesai)) progress.halaman_selesai = [];
  }
  ppgState.activeHadisData = progress;

  // Header Title
  document.getElementById("hadis-modal-title").textContent = `Pelacak Hadis: ${materi.nama_materi}`;
  document.getElementById("hadis-modal-subtitle").textContent = `Generus: ${santri.namaLengkap} (${santri.id}) &bull; ${extractKelompokName(santri.kelompokPengajian)}`;

  // Reset Range Input
  const fromEl = document.getElementById("hadis-range-from");
  const toEl = document.getElementById("hadis-range-to");
  if (fromEl) fromEl.value = "1";
  if (toEl) toEl.value = String(materi.total_halaman || 150);

  // Penguji & Catatan
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const pengujiInput = document.getElementById("hadis-penguji-input");
  const catatanInput = document.getElementById("hadis-catatan-input");
  if (pengujiInput) pengujiInput.value = progress.penguji_terakhir || (currentUser ? currentUser.username : "");
  if (catatanInput) catatanInput.value = progress.catatan || "";

  renderHadisGridAndStats();
  modal.style.display = "flex";
  modal.classList.add("active");
};

window.closeHadisTrackerModal = function() {
  const modal = document.getElementById("modal-ppg-hadis-tracker");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
  ppgState.activeHadisSantri = null;
  ppgState.activeHadisMateri = null;
  ppgState.activeHadisData = null;
};

/**
 * Render Matriks Grid Kotak Halaman dan Metrik Progres
 */
function renderHadisGridAndStats() {
  const data = ppgState.activeHadisData;
  const materi = ppgState.activeHadisMateri;
  if (!data || !materi) return;

  const totalPages = materi.total_halaman || 150;
  const doneSet = new Set(data.halaman_selesai || []);
  const doneCount = doneSet.size;
  const pct = Math.round((doneCount / totalPages) * 100);

  // Evaluasi Status Otomatis
  let status = "Belum";
  if (pct >= 100) status = "Khatam";
  else if (doneCount > 0) status = "Proses";

  data.persentase_selesai = pct;
  data.status = status;
  if (status === "Khatam" && !data.tanggal_khatam) {
    data.tanggal_khatam = new Date().toISOString().split('T')[0];
  }

  // Update Summary Elements
  const elPagesDone = document.getElementById("hadis-stat-pages-done");
  const elTotalPages = document.getElementById("hadis-stat-total-pages");
  const elPct = document.getElementById("hadis-stat-percentage");
  const elProgressBar = document.getElementById("hadis-progress-bar-fill");
  const elStatusBadge = document.getElementById("hadis-stat-status-badge");
  const elUnreadSummary = document.getElementById("hadis-unread-summary");

  if (elPagesDone) elPagesDone.textContent = doneCount;
  if (elTotalPages) elTotalPages.textContent = totalPages;
  if (elPct) elPct.textContent = pct + "%";
  if (elProgressBar) elProgressBar.style.width = pct + "%";

  if (elStatusBadge) {
    let bClass = "badge-red";
    if (status === "Khatam") bClass = "badge-green";
    else if (status === "Proses") bClass = "badge-yellow";
    elStatusBadge.className = `badge ${bClass}`;
    elStatusBadge.textContent = status;
  }

  // Format Ringkasan Halaman Belum Dimaknai (Range format: misal 1-15, 20, 25-30)
  if (elUnreadSummary) {
    if (doneCount >= totalPages) {
      elUnreadSummary.innerHTML = `<span style="color:#10b981; font-weight:600;"><i class="fa-solid fa-check-circle"></i> Seluruh halaman (${totalPages} Hal) telah tuntas khatam!</span>`;
    } else {
      const unreadPages = [];
      for (let p = 1; p <= totalPages; p++) {
        if (!doneSet.has(p)) unreadPages.push(p);
      }
      
      // Mengelompokkan range
      const ranges = [];
      let start = unreadPages[0];
      let prev = unreadPages[0];

      for (let i = 1; i <= unreadPages.length; i++) {
        const curr = unreadPages[i];
        if (curr === prev + 1) {
          prev = curr;
        } else {
          if (start === prev) ranges.push(String(start));
          else ranges.push(`${start}–${prev}`);
          start = curr;
          prev = curr;
        }
      }

      elUnreadSummary.innerHTML = `
        <span style="color:var(--warning); font-weight:600;">Halaman belum dimaknai: </span>
        <span style="color:var(--text-secondary);">${ranges.slice(0, 15).join(', ')}${ranges.length > 15 ? ' ...dst' : ''}</span>
      `;
    }
  }

  // Render Grid Kotak
  const gridContainer = document.getElementById("hadis-pages-grid");
  if (!gridContainer) return;
  gridContainer.innerHTML = "";

  for (let page = 1; page <= totalPages; page++) {
    const isDone = doneSet.has(page);
    const box = document.createElement("div");
    box.className = `hadis-page-box ${isDone ? 'page-done' : 'page-undone'}`;
    box.textContent = page;
    box.title = `Halaman ${page} - Klik untuk ubah status (${isDone ? 'Sudah Tuntas' : 'Belum'})`;

    box.addEventListener("click", () => {
      toggleHadisSinglePage(page);
    });

    gridContainer.appendChild(box);
  }
}

/**
 * Toggle Status Satu Halaman Hadis
 */
function toggleHadisSinglePage(page) {
  const data = ppgState.activeHadisData;
  if (!data) return;

  const set = new Set(data.halaman_selesai || []);
  if (set.has(page)) {
    set.delete(page);
  } else {
    set.add(page);
  }
  data.halaman_selesai = Array.from(set).sort((a, b) => a - b);
  renderHadisGridAndStats();
}

/**
 * Tandai Rentang Halaman Terisi
 */
window.applyHadisRangeAction = function(isMarkingDone) {
  const data = ppgState.activeHadisData;
  const materi = ppgState.activeHadisMateri;
  if (!data || !materi) return;

  const fromVal = parseInt(document.getElementById("hadis-range-from").value);
  const toVal = parseInt(document.getElementById("hadis-range-to").value);
  const totalPages = materi.total_halaman || 150;

  if (isNaN(fromVal) || isNaN(toVal) || fromVal < 1 || toVal < fromVal) {
    if (typeof showToast === 'function') showToast("Rentang nomor halaman tidak valid.", "warning");
    return;
  }

  const set = new Set(data.halaman_selesai || []);
  const maxLimit = Math.min(toVal, totalPages);

  for (let p = fromVal; p <= maxLimit; p++) {
    if (isMarkingDone) set.add(p);
    else set.delete(p);
  }

  data.halaman_selesai = Array.from(set).sort((a, b) => a - b);
  renderHadisGridAndStats();
};

/**
 * Tandai Khatam Instan (1 s/d N)
 */
window.markHadisInstantKhatam = function() {
  const data = ppgState.activeHadisData;
  const materi = ppgState.activeHadisMateri;
  if (!data || !materi) return;

  const totalPages = materi.total_halaman || 150;
  const allPages = [];
  for (let p = 1; p <= totalPages; p++) allPages.push(p);

  data.halaman_selesai = allPages;
  data.tanggal_khatam = new Date().toISOString().split('T')[0];
  renderHadisGridAndStats();
  if (typeof showToast === 'function') showToast(`Kitab ${materi.nama_materi} berhasil ditandai KHATAM 100%!`, "success");
};

/**
 * Reset Semua Halaman Hadis
 */
window.resetHadisPages = function() {
  if (!confirm("Apakah Anda yakin ingin mengosongkan seluruh halaman kitab hadis ini?")) return;
  const data = ppgState.activeHadisData;
  if (!data) return;

  data.halaman_selesai = [];
  data.tanggal_khatam = null;
  renderHadisGridAndStats();
};

/**
 * Simpan Progres Hadis ke Database
 */
window.saveHadisProgress = async function() {
  const data = ppgState.activeHadisData;
  const santri = ppgState.activeHadisSantri;
  const materi = ppgState.activeHadisMateri;
  if (!data || !santri || !materi) return;

  const pengujiInput = document.getElementById("hadis-penguji-input");
  const catatanInput = document.getElementById("hadis-catatan-input");
  if (pengujiInput) data.penguji_terakhir = pengujiInput.value.trim();
  if (catatanInput) data.catatan = catatanInput.value.trim();
  data.updated_at = new Date().toISOString();

  // Simpan ke Supabase
  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const payload = {
        jamaah_id: data.jamaah_id,
        materi_id: data.materi_id,
        total_halaman: data.total_halaman,
        halaman_selesai: data.halaman_selesai,
        persentase_selesai: data.persentase_selesai,
        status: data.status,
        tanggal_khatam: data.tanggal_khatam,
        penguji_terakhir: data.penguji_terakhir,
        catatan: data.catatan,
        updated_at: data.updated_at
      };
      await supabaseClient.from("generus_hadis_progress").upsert([payload], { onConflict: 'jamaah_id,materi_id' });
    } catch (e) {
      console.warn("Gagal simpan progress hadis ke Supabase:", e);
    }
  }

  // Simpan ke State & LocalStorage
  const idx = ppgState.hadisProgress.findIndex(h => h.jamaah_id === data.jamaah_id && h.materi_id === data.materi_id);
  if (idx !== -1) ppgState.hadisProgress[idx] = { ...data };
  else ppgState.hadisProgress.push({ ...data });

  localStorage.setItem("aji_ppg_hadis_progress", JSON.stringify(ppgState.hadisProgress));

  if (typeof showToast === 'function') {
    showToast(`Progres hadis ${materi.nama_materi} untuk ${santri.namaLengkap} berhasil disimpan!`, "success");
  }

  closeHadisTrackerModal();
  renderPpgDataTab();
  
  // Refresh jika sedang di dalam modal rapor santri
  if (ppgState.activeRaporSantri && ppgState.activeRaporSantri.id === santri.id) {
    openRaporSantriModal(santri.id);
  }
};

/**
 * ====================================================================
 * MODAL DETAIL KEILMUAN GENERUS (RAPOR GENERUS)
 * ====================================================================
 */
window.openRaporSantriModal = function(santriId) {
  const modal = document.getElementById("modal-ppg-rapor-santri");
  if (!modal) return;

  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  const santri = allJamaah.find(j => j.id === santriId);
  if (!santri) return;

  ppgState.activeRaporSantri = santri;

  // Header Data Generus
  const headerContainer = document.getElementById("rapor-santri-header-info");
  if (headerContainer) {
    headerContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; border-radius:50%; background:var(--primary-soft); display:flex; align-items:center; justify-content:center; font-size:1.8rem; color:var(--primary); font-weight:800; border:2px solid var(--primary);">
            ${santri.namaLengkap.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style="margin:0 0 4px 0; color:var(--text-primary); font-size:1.35rem;">${santri.namaLengkap}</h3>
            <div style="font-size:0.88rem; color:var(--text-secondary); display:flex; flex-wrap:wrap; gap:10px;">
              <span>ID: <strong style="color:var(--text-primary);">${santri.id}</strong></span>
              <span>&bull; Rukun: <strong style="color:var(--text-primary);">${extractKelompokName(santri.kelompokPengajian)}</strong></span>
              <span>&bull; Gender: <strong style="color:var(--text-primary);">${santri.jenisKelamin}</strong></span>
              <span>&bull; Usia: <strong style="color:var(--text-primary);">${santri.umur || 0} Tahun</strong></span>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge badge-generus-${(santri.kelompokPeramutan || '').toLowerCase()}" style="font-size:0.9rem; padding:6px 14px; font-weight:700;">
            ${santri.kelompokPeramutan}
          </span>
        </div>
      </div>
    `;
  }

  // Hitung Capaian
  const stats = calculateSantriKurikulumProgress(santri);

  // Progress Bar Akumulatif
  const progBar = document.getElementById("rapor-progress-bar-fill");
  const progRatio = document.getElementById("rapor-progress-ratio");
  const progPct = document.getElementById("rapor-progress-percentage");

  if (progBar) progBar.style.width = stats.persentase + "%";
  if (progRatio) progRatio.textContent = `${stats.tuntasCount} / ${stats.totalTarget} Target Materi Lulus`;
  if (progPct) progPct.textContent = `${stats.persentase}%`;

  // Render Tabel Materi Standar (Dikelompokkan per Bidang)
  const standarContainer = document.getElementById("rapor-materi-standar-container");
  if (standarContainer) {
    const standarItems = stats.details.filter(d => d.type === "standar");
    if (standarItems.length === 0) {
      standarContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">Tidak ada materi standar untuk jenjang ${santri.kelompokPeramutan}.</div>`;
    } else {
      // Group by bidang
      const grouped = {};
      standarItems.forEach(item => {
        const bObj = ppgState.masterBidang.find(b => b.id === item.materi.bidang_id);
        const bName = bObj ? bObj.nama_bidang : "Lainnya";
        if (!grouped[bName]) grouped[bName] = [];
        grouped[bName].push(item);
      });

      let html = "";
      for (const [bidangName, items] of Object.entries(grouped)) {
        html += `
          <div style="margin-bottom:18px;">
            <div style="font-weight:700; color:var(--primary); font-size:0.95rem; margin-bottom:8px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
              <i class="fa-solid fa-bookmark" style="margin-right:6px;"></i> ${bidangName}
            </div>
            <table class="table-custom" style="width:100%; font-size:0.85rem;">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center;">No</th>
                  <th>Nama Materi</th>
                  <th style="width:110px; text-align:center;">Status</th>
                  <th style="width:80px; text-align:center;">Nilai</th>
                  <th style="width:120px;">Tgl Lulus</th>
                  <th style="width:140px;">Penguji</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
        `;
        items.forEach((it, idx) => {
          html += `
            <tr>
              <td style="text-align:center; color:var(--text-muted);">${idx + 1}</td>
              <td style="font-weight:600; color:var(--text-primary);">${it.materi.nama_materi}</td>
              <td style="text-align:center;">
                <span class="badge ${it.status === 'Tuntas' ? 'badge-green' : (it.status === 'Proses' ? 'badge-yellow' : 'badge-red')}">
                  ${it.status}
                </span>
              </td>
              <td style="text-align:center; font-weight:700; color:${it.nilai_angka >= 75 ? '#10b981' : 'var(--text-primary)'};">
                ${it.nilai_angka !== null ? it.nilai_angka : '-'}
              </td>
              <td style="color:var(--text-secondary);">${it.tanggal_tuntas || '-'}</td>
              <td style="color:var(--text-secondary);">${it.penguji_nama || '-'}</td>
              <td style="color:var(--text-muted); font-size:0.8rem;">${it.catatan || '-'}</td>
            </tr>
          `;
        });
        html += `</tbody></table></div>`;
      }
      standarContainer.innerHTML = html;
    }
  }

  // Render Hadis Himpunan (Khusus GUS & GUM)
  const hadisSection = document.getElementById("rapor-hadis-section");
  const hadisContainer = document.getElementById("rapor-hadis-cards-container");
  
  if (hadisSection && hadisContainer) {
    const hadisItems = stats.details.filter(d => d.type === "halaman");
    if (hadisItems.length === 0) {
      hadisSection.style.display = "none";
    } else {
      hadisSection.style.display = "block";
      let hHtml = "";
      hadisItems.forEach(hItem => {
        const isKhatam = hItem.status === "Khatam";
        hHtml += `
          <div class="card-glass" style="padding:16px; border:1px solid var(--border-color); border-radius:10px; background:rgba(255,255,255,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
              <div>
                <h5 style="margin:0 0 4px 0; font-size:1.05rem; color:var(--text-primary);">${hItem.materi.nama_materi}</h5>
                <span style="font-size:0.8rem; color:var(--text-secondary);">Total: ${hItem.total_halaman} Halaman</span>
              </div>
              <span class="badge ${isKhatam ? 'badge-green' : (hItem.status === 'Proses' ? 'badge-yellow' : 'badge-red')}" style="font-weight:700;">
                ${hItem.status}
              </span>
            </div>
            
            <div style="margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
                <span style="color:var(--text-muted);">${hItem.halaman_selesai} dari ${hItem.total_halaman} Halaman Selesai</span>
                <span style="font-weight:700; color:var(--primary);">${hItem.persentase}%</span>
              </div>
              <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                <div style="width:${hItem.persentase}%; height:100%; background:linear-gradient(90deg, #10b981, #059669); border-radius:10px;"></div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; pt-2; border-top:1px solid rgba(255,255,255,0.05);">
              <span style="font-size:0.78rem; color:var(--text-muted);">
                ${hItem.data && hItem.data.tanggal_khatam ? 'Khatam: ' + hItem.data.tanggal_khatam : (hItem.data && hItem.data.penguji_terakhir ? 'Penguji: ' + hItem.data.penguji_terakhir : '')}
              </span>
              <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem; border-radius:6px;" onclick="openHadisTrackerModal('${santri.id}', '${hItem.materi.id}')">
                <i class="fa-solid fa-list-check"></i> Pelacak Halaman
              </button>
            </div>
          </div>
        `;
      });
      hadisContainer.innerHTML = hHtml;
    }
  }

  modal.style.display = "flex";
  modal.classList.add("active");
};

window.closeRaporSantriModal = function() {
  const modal = document.getElementById("modal-ppg-rapor-santri");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
  document.body.classList.remove("printing-rapor-santri");
  ppgState.activeRaporSantri = null;
};

// Aliases for Generus naming
window.openRaporGenerusModal = window.openRaporSantriModal;
window.closeRaporGenerusModal = window.closeRaporSantriModal;

/**
 * Cetak Dokumen Rapor Generus (Print-friendly)
 */
window.printRaporSantri = function() {
  document.body.classList.remove("printing-laporan-bulanan");
  document.body.classList.add("printing-rapor-santri");
  const cleanup = () => {
    document.body.classList.remove("printing-rapor-santri");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
};
window.printRaporGenerus = window.printRaporSantri;

/**
 * ====================================================================
 * TAB 3: DATA MASTER KURIKULUM & MATERI PPG
 * ====================================================================
 */
function renderMasterKurikulumTab() {
  renderMasterBidangTable();
  renderMasterMateriTable();
}

function renderMasterBidangTable() {
  const tbody = document.getElementById("ppg-master-bidang-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (ppgState.masterBidang.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">Belum ada bidang keilmuan.</td></tr>`;
    return;
  }

  ppgState.masterBidang.forEach((b, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center; width:50px;">${b.urutan || idx + 1}</td>
      <td style="font-weight:600; color:var(--text-primary);">${b.nama_bidang}</td>
      <td style="color:var(--text-secondary); font-size:0.85rem;">${b.deskripsi || '-'}</td>
      <td style="text-align:center; width:100px;">
        <button class="btn-icon" onclick="openEditBidangModal('${b.id}')" title="Edit Bidang" style="color:var(--primary); margin-right:6px;"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon" onclick="deleteMasterBidang('${b.id}')" title="Hapus Bidang" style="color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMasterMateriTable() {
  const tbody = document.getElementById("ppg-master-materi-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (ppgState.masterMateri.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Belum ada materi kurikulum.</td></tr>`;
    return;
  }

  ppgState.masterMateri.forEach((m, idx) => {
    const tr = document.createElement("tr");
    const bObj = ppgState.masterBidang.find(b => b.id === m.bidang_id);
    const bNama = bObj ? bObj.nama_bidang : "-";

    const jenjangBadges = (Array.isArray(m.kategori_generus) ? m.kategori_generus : []).map(j => {
      let bClass = "badge-generus-paud";
      if (j === "Caberawit") bClass = "badge-generus-caberawit";
      else if (j === "GUS") bClass = "badge-generus-gus";
      else if (j === "GUM") bClass = "badge-generus-gum";
      return `<span class="badge ${bClass}" style="font-size:0.75rem; margin-right:4px;">${j}</span>`;
    }).join("");

    tr.innerHTML = `
      <td style="text-align:center; width:50px;">${m.urutan || idx + 1}</td>
      <td style="font-weight:600; color:var(--text-primary);">${m.nama_materi}</td>
      <td><span style="font-size:0.85rem; color:var(--text-secondary);">${bNama}</span></td>
      <td>${jenjangBadges || '-'}</td>
      <td style="text-align:center;">
        <span class="badge ${m.tipe_penilaian === 'halaman' ? 'badge-blue' : 'badge-green'}">
          ${m.tipe_penilaian === 'halaman' ? m.total_halaman + ' Hal' : 'Standar'}
        </span>
      </td>
      <td style="font-size:0.85rem; color:var(--text-muted);">${m.deskripsi_target || '-'}</td>
      <td style="text-align:center; width:100px;">
        <button class="btn-icon" onclick="openEditMateriModal('${m.id}')" title="Edit Materi" style="color:var(--primary); margin-right:6px;"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon" onclick="deleteMasterMateri('${m.id}')" title="Hapus Materi" style="color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Modal Tambah / Edit Master Materi
 */
window.openAddMateriModal = function() {
  const form = document.getElementById("form-ppg-master-materi");
  if (form) form.reset();
  document.getElementById("materi-edit-id").value = "";
  document.getElementById("materi-modal-title").innerHTML = `<i class="fa-solid fa-plus"></i> Tambah Materi Kurikulum PPG`;

  populateMateriModalBidangSelect();
  toggleTotalHalamanInput();

  const modal = document.getElementById("modal-ppg-master-materi");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
};

window.openEditMateriModal = function(materiId) {
  const materi = ppgState.masterMateri.find(m => m.id === materiId);
  if (!materi) return;

  populateMateriModalBidangSelect();

  document.getElementById("materi-edit-id").value = materi.id;
  document.getElementById("materi-nama-input").value = materi.nama_materi;
  document.getElementById("materi-bidang-select").value = materi.bidang_id;
  document.getElementById("materi-tipe-select").value = materi.tipe_penilaian;
  document.getElementById("materi-total-hal-input").value = materi.total_halaman || "";
  document.getElementById("materi-urutan-input").value = materi.urutan || 1;
  document.getElementById("materi-deskripsi-input").value = materi.deskripsi_target || "";

  // Checkbox Jenjang
  const arr = Array.isArray(materi.kategori_generus) ? materi.kategori_generus : [];
  ["PAUD", "Caberawit", "GUS", "GUM"].forEach(j => {
    const cb = document.getElementById(`cb-jenjang-${j.toLowerCase()}`);
    if (cb) cb.checked = arr.includes(j);
  });

  document.getElementById("materi-modal-title").innerHTML = `<i class="fa-solid fa-pen"></i> Edit Materi Kurikulum PPG`;
  toggleTotalHalamanInput();
  const modal = document.getElementById("modal-ppg-master-materi");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
};

function populateMateriModalBidangSelect() {
  const sel = document.getElementById("materi-bidang-select");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Bidang --</option>';
  ppgState.masterBidang.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.nama_bidang;
    sel.appendChild(opt);
  });
}

window.toggleTotalHalamanInput = function() {
  const tipe = document.getElementById("materi-tipe-select").value;
  const halGroup = document.getElementById("materi-total-hal-group");
  if (halGroup) {
    halGroup.style.display = tipe === "halaman" ? "block" : "none";
  }
};

window.closeMasterMateriModal = function() {
  const modal = document.getElementById("modal-ppg-master-materi");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
};

window.saveMasterMateriForm = async function() {
  const editId = document.getElementById("materi-edit-id").value;
  const nama = document.getElementById("materi-nama-input").value.trim();
  const bidangId = document.getElementById("materi-bidang-select").value;
  const tipe = document.getElementById("materi-tipe-select").value;
  const totalHalVal = document.getElementById("materi-total-hal-input").value;
  const urutanVal = parseInt(document.getElementById("materi-urutan-input").value) || 1;
  const deskripsi = document.getElementById("materi-deskripsi-input").value.trim();

  // Kategori Jenjang
  const checkedJenjang = [];
  ["PAUD", "Caberawit", "GUS", "GUM"].forEach(j => {
    const cb = document.getElementById(`cb-jenjang-${j.toLowerCase()}`);
    if (cb && cb.checked) checkedJenjang.push(j);
  });

  if (!nama || !bidangId) {
    if (typeof showToast === 'function') showToast("Nama materi dan bidang wajib diisi.", "warning");
    return;
  }
  if (checkedJenjang.length === 0) {
    if (typeof showToast === 'function') showToast("Pilih minimal satu jenjang sasaran generus.", "warning");
    return;
  }
  if (tipe === "halaman" && (!totalHalVal || parseInt(totalHalVal) <= 0)) {
    if (typeof showToast === 'function') showToast("Total halaman wajib diisi untuk penilaian tipe halaman.", "warning");
    return;
  }

  const payload = {
    nama_materi: nama,
    bidang_id: bidangId,
    kategori_generus: checkedJenjang,
    tipe_penilaian: tipe,
    total_halaman: tipe === "halaman" ? parseInt(totalHalVal) : null,
    urutan: urutanVal,
    deskripsi_target: deskripsi,
    updated_at: new Date().toISOString()
  };

  if (editId) payload.id = editId;

  // Supabase Save
  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      if (editId) {
        await supabaseClient.from("master_keilmuan_materi").update(payload).eq("id", editId);
      } else {
        const { data, error } = await supabaseClient.from("master_keilmuan_materi").insert([payload]).select();
        if (!error && data && data.length > 0) payload.id = data[0].id;
      }
    } catch (e) {
      console.warn("Gagal simpan materi ke Supabase:", e);
    }
  }

  if (!payload.id) {
    payload.id = editId || "mat-" + Date.now();
  }

  // Update State
  const idx = ppgState.masterMateri.findIndex(m => m.id === payload.id);
  if (idx !== -1) ppgState.masterMateri[idx] = payload;
  else ppgState.masterMateri.push(payload);

  localStorage.setItem("aji_ppg_master_materi", JSON.stringify(ppgState.masterMateri));

  if (typeof showToast === 'function') showToast("Data materi berhasil disimpan!", "success");
  closeMasterMateriModal();
  renderMasterMateriTable();
};

window.deleteMasterMateri = async function(materiId) {
  if (!confirm("Apakah Anda yakin ingin menghapus materi kurikulum ini? Semua progres capaian generus terkait materi ini juga akan terhapus.")) return;

  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from("master_keilmuan_materi").delete().eq("id", materiId);
    } catch (e) {
      console.warn("Gagal hapus materi dari Supabase:", e);
    }
  }

  ppgState.masterMateri = ppgState.masterMateri.filter(m => m.id !== materiId);
  localStorage.setItem("aji_ppg_master_materi", JSON.stringify(ppgState.masterMateri));

  if (typeof showToast === 'function') showToast("Materi kurikulum berhasil dihapus.", "info");
  renderMasterMateriTable();
};

/**
 * Modal Tambah / Edit Master Bidang
 */
window.openAddBidangModal = function() {
  document.getElementById("bidang-edit-id").value = "";
  document.getElementById("bidang-nama-input").value = "";
  document.getElementById("bidang-urutan-input").value = ppgState.masterBidang.length + 1;
  document.getElementById("bidang-deskripsi-input").value = "";
  document.getElementById("bidang-modal-title").innerHTML = `<i class="fa-solid fa-plus"></i> Tambah Bidang Keilmuan`;
  const modal = document.getElementById("modal-ppg-master-bidang");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
};

window.openEditBidangModal = function(bidangId) {
  const bidang = ppgState.masterBidang.find(b => b.id === bidangId);
  if (!bidang) return;
  document.getElementById("bidang-edit-id").value = bidang.id;
  document.getElementById("bidang-nama-input").value = bidang.nama_bidang;
  document.getElementById("bidang-urutan-input").value = bidang.urutan || 1;
  document.getElementById("bidang-deskripsi-input").value = bidang.deskripsi || "";
  document.getElementById("bidang-modal-title").innerHTML = `<i class="fa-solid fa-pen"></i> Edit Bidang Keilmuan`;
  const modal = document.getElementById("modal-ppg-master-bidang");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
};

window.closeMasterBidangModal = function() {
  const modal = document.getElementById("modal-ppg-master-bidang");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
};

window.saveMasterBidangForm = async function() {
  const editId = document.getElementById("bidang-edit-id").value;
  const nama = document.getElementById("bidang-nama-input").value.trim();
  const urutan = parseInt(document.getElementById("bidang-urutan-input").value) || 1;
  const deskripsi = document.getElementById("bidang-deskripsi-input").value.trim();

  if (!nama) {
    if (typeof showToast === 'function') showToast("Nama bidang wajib diisi.", "warning");
    return;
  }

  const payload = {
    nama_bidang: nama,
    urutan: urutan,
    deskripsi: deskripsi
  };
  if (editId) payload.id = editId;

  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      if (editId) {
        await supabaseClient.from("master_bidang_keilmuan").update(payload).eq("id", editId);
      } else {
        const { data, error } = await supabaseClient.from("master_bidang_keilmuan").insert([payload]).select();
        if (!error && data && data.length > 0) payload.id = data[0].id;
      }
    } catch (e) {
      console.warn("Gagal simpan bidang ke Supabase:", e);
    }
  }

  if (!payload.id) payload.id = editId || "bid-" + Date.now();

  const idx = ppgState.masterBidang.findIndex(b => b.id === payload.id);
  if (idx !== -1) ppgState.masterBidang[idx] = payload;
  else ppgState.masterBidang.push(payload);

  localStorage.setItem("aji_ppg_master_bidang", JSON.stringify(ppgState.masterBidang));

  if (typeof showToast === 'function') showToast("Data bidang berhasil disimpan!", "success");
  closeMasterBidangModal();
  renderMasterBidangTable();
};

window.deleteMasterBidang = async function(bidangId) {
  if (!confirm("Apakah Anda yakin ingin menghapus bidang keilmuan ini beserta seluruh materi di dalamnya?")) return;

  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from("master_bidang_keilmuan").delete().eq("id", bidangId);
    } catch (e) {
      console.warn("Gagal hapus bidang dari Supabase:", e);
    }
  }

  ppgState.masterBidang = ppgState.masterBidang.filter(b => b.id !== bidangId);
  ppgState.masterMateri = ppgState.masterMateri.filter(m => m.bidang_id !== bidangId);
  localStorage.setItem("aji_ppg_master_bidang", JSON.stringify(ppgState.masterBidang));
  localStorage.setItem("aji_ppg_master_materi", JSON.stringify(ppgState.masterMateri));

  if (typeof showToast === 'function') showToast("Bidang keilmuan berhasil dihapus.", "info");
  renderMasterKurikulumTab();
};

/**
 * ====================================================================
 * EKSPOR & IMPOR CSV SILABUS PPG
 * ====================================================================
 */
window.exportSilabusCsv = function() {
  if (ppgState.masterMateri.length === 0) {
    if (typeof showToast === 'function') showToast("Belum ada data materi untuk diekspor.", "warning");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Urutan,Nama Materi,Nama Bidang,Jenjang Generus,Tipe Penilaian,Total Halaman,Deskripsi Target\n";

  ppgState.masterMateri.forEach(m => {
    const bObj = ppgState.masterBidang.find(b => b.id === m.bidang_id);
    const bNama = bObj ? `"${bObj.nama_bidang.replace(/"/g, '""')}"` : '""';
    const jStr = `"${(Array.isArray(m.kategori_generus) ? m.kategori_generus.join(';') : '').replace(/"/g, '""')}"`;
    const mNama = `"${(m.nama_materi || '').replace(/"/g, '""')}"`;
    const desc = `"${(m.deskripsi_target || '').replace(/"/g, '""')}"`;

    csvContent += `${m.urutan || 1},${mNama},${bNama},${jStr},${m.tipe_penilaian},${m.total_halaman || ''},${desc}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Silabus_Kurikulum_PPG_AJI_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.downloadSilabusTemplateCsv = function() {
  let csv = "data:text/csv;charset=utf-8,";
  csv += "Urutan,Nama Materi,Nama Bidang,Jenjang Generus,Tipe Penilaian,Total Halaman,Deskripsi Target\n";
  csv += "1,Kitabu Sholah,Hadis Himpunan,GUS;GUM,halaman,150,Khatam 150 Halaman\n";
  csv += "2,Iqro Jilid 1-6,Al-Qur'an & Tajwid,Caberawit,standar,,Tuntas membaca lancar Iqro\n";
  csv += "3,Praktik Wudhu,Praktik Ibadah,PAUD;Caberawit,standar,,Wudhu sempurna\n";

  const encodedUri = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Template_Silabus_PPG.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.openImportSilabusModal = function() {
  const modal = document.getElementById("modal-ppg-import-csv");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }
};

window.closeImportSilabusModal = function() {
  const modal = document.getElementById("modal-ppg-import-csv");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
};

window.handleSilabusCsvUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parseAndImportSilabusCsv(text);
  };
  reader.readAsText(file);
};

async function parseAndImportSilabusCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length <= 1) {
    if (typeof showToast === 'function') showToast("File CSV kosong atau format tidak sesuai.", "warning");
    return;
  }

  // Header baris 0
  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    // Parse CSV line sederhana dengan regex
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    if (row.length < 5) continue;

    const urutan = parseInt(row[0]) || i;
    const namaMateri = row[1];
    const namaBidang = row[2];
    const jenjangStr = row[3];
    const tipe = (row[4] || 'standar').toLowerCase() === 'halaman' ? 'halaman' : 'standar';
    const totalHal = row[5] ? parseInt(row[5]) : null;
    const deskripsi = row[6] || "";

    if (!namaMateri || !namaBidang) continue;

    // Cari atau buat Bidang
    let bidang = ppgState.masterBidang.find(b => b.nama_bidang.toLowerCase() === namaBidang.toLowerCase());
    if (!bidang) {
      bidang = {
        id: "bid-" + Date.now() + "-" + i,
        nama_bidang: namaBidang,
        urutan: ppgState.masterBidang.length + 1,
        deskripsi: ""
      };
      ppgState.masterBidang.push(bidang);
    }

    const kategoriGenerus = jenjangStr ? jenjangStr.split(';').map(s => s.trim()).filter(Boolean) : ["Caberawit"];

    const newMateri = {
      id: "mat-" + Date.now() + "-" + i,
      bidang_id: bidang.id,
      kategori_generus: kategoriGenerus,
      nama_materi: namaMateri,
      tipe_penilaian: tipe,
      total_halaman: tipe === 'halaman' ? totalHal : null,
      urutan: urutan,
      deskripsi_target: deskripsi
    };

    ppgState.masterMateri.push(newMateri);
    importedCount++;
  }

  localStorage.setItem("aji_ppg_master_bidang", JSON.stringify(ppgState.masterBidang));
  localStorage.setItem("aji_ppg_master_materi", JSON.stringify(ppgState.masterMateri));

  if (typeof showToast === 'function') showToast(`Berhasil mengimpor ${importedCount} materi silabus!`, "success");
  closeImportSilabusModal();
  renderMasterKurikulumTab();
}

/**
 * ====================================================================
 * PORTAL JAMAAH: RAPOR PPG DIRI / ANAK
 * ====================================================================
 */
window.initJamaahPortalPpgRapor = function() {
  const container = document.getElementById("jamaah-portal-ppg-content");
  if (!container) return;

  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!currentUser || !currentUser.jamaah_id) {
    container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-secondary);">Akun Anda belum ditautkan ke data jamaah master. Hubungi pengurus rukun.</div>`;
    return;
  }

  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  const myJamaah = allJamaah.find(j => j.id === currentUser.jamaah_id);
  if (!myJamaah) return;

  // Temukan anggota keluarga (jika kepala keluarga) atau diri sendiri
  const familyGenerus = [];
  if (isGenerusJamaah(myJamaah)) {
    familyGenerus.push(myJamaah);
  }

  // Jika kepala keluarga, cari anak-anak di KK
  const kkMappings = typeof getKartuKeluargaMappings === 'function' ? getKartuKeluargaMappings() : (typeof localKartuKeluargaMappings !== 'undefined' ? localKartuKeluargaMappings : []);
  const myMemberIds = kkMappings.filter(m => m.kepalaKeluargaId === myJamaah.id).map(m => m.anggotaKeluargaId);
  myMemberIds.forEach(mId => {
    const mem = allJamaah.find(j => j.id === mId);
    if (mem && isGenerusJamaah(mem) && !familyGenerus.some(f => f.id === mem.id)) {
      familyGenerus.push(mem);
    }
  });

  if (familyGenerus.length === 0) {
    container.innerHTML = `
      <div style="padding:40px; text-align:center; color:var(--text-secondary);">
        <i class="fa-solid fa-graduation-cap" style="font-size:3rem; color:var(--text-muted); margin-bottom:12px;"></i>
        <h4 style="color:var(--text-primary); margin-bottom:6px;">Tidak Ada Data Generus</h4>
        <p style="margin:0; font-size:0.9rem;">Akun Anda dan anggota keluarga di Kartu Keluarga Anda tidak berada dalam kategori generus PPG (PAUD, Caberawit, GUS, atau GUM).</p>
      </div>
    `;
    return;
  }

  let html = `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">`;
  familyGenerus.forEach(santri => {
    const stats = calculateSantriKurikulumProgress(santri);
    html += `
      <div class="card-glass" style="padding:20px; border-radius:12px; border:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <h4 style="margin:0 0 4px 0; color:var(--text-primary); font-size:1.15rem;">${santri.namaLengkap}</h4>
            <div style="font-size:0.8rem; color:var(--text-secondary);">ID: ${santri.id} &bull; ${extractKelompokName(santri.kelompokPengajian)}</div>
          </div>
          <span class="badge badge-generus-${(santri.kelompokPeramutan || '').toLowerCase()}">${santri.kelompokPeramutan}</span>
        </div>

        <div style="margin-bottom:15px;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
            <span style="color:var(--text-muted);">Progres Kurikulum</span>
            <span style="font-weight:700; color:var(--primary);">${stats.tuntasCount}/${stats.totalTarget} Target (${stats.persentase}%)</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
            <div style="width:${stats.persentase}%; height:100%; background:linear-gradient(90deg, #10b981, #059669); border-radius:10px;"></div>
          </div>
        </div>

        <button class="btn-primary" style="width:100%; padding:10px; font-size:0.9rem; border-radius:8px;" onclick="openRaporSantriModal('${santri.id}')">
          <i class="fa-solid fa-book-open"></i> Buka Buku Rapor Keilmuan
        </button>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
};

/* ====================================================================
 * FITUR: MONITORING HADIS HIMPUNAN (MODUL PPG AJI v3.2)
 * Memuat materi Makna Hadis Himpunan, analisis generus khatam 100%,
 * serta matriks rincian halaman kosong/belum diisi beserta daftar generus.
 * ====================================================================
 */

/**
 * Mengisi Opsi Filter Dropdown Kelompok untuk Monitoring Hadis
 */
async function populateMonitoringHadisFilterOptions() {
  const kelSelect = document.getElementById("hadis-mon-filter-kelompok");
  if (!kelSelect) return;

  const kelompokList = await loadMasterKelompokList();
  const currentVal = kelSelect.value || ppgState.monitoringHadisFilterKelompok;

  kelSelect.innerHTML = '<option value="">Semua Kelompok</option>';
  kelompokList.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    if (k === currentVal) opt.selected = true;
    kelSelect.appendChild(opt);
  });

  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isRestricted = currentUser && (currentUser.role === 'Operator Kelompok' || currentUser.role === 'Pengurus Kelompok');
  if (isRestricted && currentUser.kelompok && currentUser.kelompok !== 'Semua') {
    kelSelect.value = currentUser.kelompok;
    kelSelect.disabled = true;
    ppgState.monitoringHadisFilterKelompok = currentUser.kelompok;
  }
}

/**
 * Render Utama Tab Monitoring Hadis Himpunan
 */
window.renderMonitoringHadisTab = async function() {
  // Pastikan posisi scroll langsung berada di paling atas
  const mainWrapper = document.querySelector(".main-wrapper");
  if (mainWrapper) mainWrapper.scrollTop = 0;
  window.scrollTo(0, 0);

  await populateMonitoringHadisFilterOptions();

  // Pastikan Master Materi & Bidang siap
  if (!ppgState.masterMateri || ppgState.masterMateri.length === 0) {
    ppgState.masterMateri = JSON.parse(JSON.stringify(DEFAULT_PPG_MATERI));
  }
  if (!ppgState.masterBidang || ppgState.masterBidang.length === 0) {
    ppgState.masterBidang = JSON.parse(JSON.stringify(DEFAULT_PPG_BIDANG));
  }

  // Saring materi Hadis Himpunan (tipe_penilaian === 'halaman' atau bidangnya memuat kata Hadis)
  const hadisBidangIds = new Set(
    (ppgState.masterBidang || [])
      .filter(b => /hadis/i.test(b.nama_bidang))
      .map(b => b.id)
  );

  let hadisMateriList = (ppgState.masterMateri || []).filter(m => {
    return m.tipe_penilaian === "halaman" || hadisBidangIds.has(m.bidang_id);
  });

  hadisMateriList.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

  // Ambil seluruh generus aktif
  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  let allGenerus = allJamaah.filter(j => isGenerusJamaah(j));

  // Terapkan filter Kelompok & Jenjang global jika ada
  if (ppgState.monitoringHadisFilterKelompok) {
    allGenerus = allGenerus.filter(g => extractKelompokName(g.kelompokPengajian) === ppgState.monitoringHadisFilterKelompok);
  }
  if (ppgState.monitoringHadisFilterJenjang) {
    allGenerus = allGenerus.filter(g => g.kelompokPeramutan === ppgState.monitoringHadisFilterJenjang);
  }

  // Search filter kata kunci nama kitab
  const searchQuery = (ppgState.monitoringHadisFilterSearch || "").trim().toLowerCase();
  let displayMateriList = hadisMateriList;
  if (searchQuery) {
    displayMateriList = hadisMateriList.filter(m => 
      (m.nama_materi || "").toLowerCase().includes(searchQuery) ||
      (m.deskripsi_target || "").toLowerCase().includes(searchQuery)
    );
  }

  // Hitung KPI Agregat
  const totalKitab = hadisMateriList.length;
  const totalGenerusSasaran = allGenerus.length;

  let totalKhatamCount = 0;
  let totalPctSum = 0;
  let evaluatedItemsCount = 0;

  hadisMateriList.forEach(m => {
    const targetGenerus = allGenerus.filter(g => {
      if (!m.kategori_generus || m.kategori_generus.length === 0) return true;
      return m.kategori_generus.includes(g.kelompokPeramutan);
    });

    targetGenerus.forEach(g => {
      const hp = (ppgState.hadisProgress || []).find(h => h.jamaah_id === g.id && h.materi_id === m.id);
      const halCount = hp && Array.isArray(hp.halaman_selesai) ? hp.halaman_selesai.length : 0;
      const isKhatam = hp && (hp.status === "Khatam" || hp.persentase_selesai >= 100 || (m.total_halaman && halCount >= m.total_halaman && m.total_halaman > 0));
      if (isKhatam) totalKhatamCount++;
      totalPctSum += hp ? (hp.persentase_selesai || 0) : 0;
      evaluatedItemsCount++;
    });
  });

  const avgProgress = evaluatedItemsCount > 0 ? Math.round(totalPctSum / evaluatedItemsCount) : 0;

  // Update KPI ke DOM
  const kpiKitabEl = document.getElementById("hadis-mon-kpi-total-kitab");
  const kpiGenerusEl = document.getElementById("hadis-mon-kpi-total-generus");
  const kpiKhatamEl = document.getElementById("hadis-mon-kpi-total-khatam");
  const kpiAvgEl = document.getElementById("hadis-mon-kpi-avg-progress");

  if (kpiKitabEl) kpiKitabEl.textContent = totalKitab;
  if (kpiGenerusEl) kpiGenerusEl.textContent = totalGenerusSasaran;
  if (kpiKhatamEl) kpiKhatamEl.textContent = totalKhatamCount;
  if (kpiAvgEl) kpiAvgEl.textContent = `${avgProgress}%`;

  // Render Grid Kartu Kitab
  const gridContainer = document.getElementById("hadis-mon-kitab-grid");
  if (!gridContainer) return;

  if (displayMateriList.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column:1/-1; padding:30px; text-align:center; color:var(--text-secondary); background:rgba(0,0,0,0.15); border-radius:10px; border:1px dashed var(--border-color);">
        <i class="fa-solid fa-book-open" style="font-size:2rem; margin-bottom:10px; color:var(--text-muted);"></i>
        <div>Tidak ditemukan materi Hadis Himpunan sesuai kata kunci pencarian.</div>
      </div>
    `;
    const detailPanel = document.getElementById("hadis-mon-detail-panel");
    if (detailPanel) detailPanel.style.display = "none";
    return;
  }

  let cardsHtml = "";
  displayMateriList.forEach(m => {
    const isSelected = ppgState.selectedMonitoringMateriId === m.id;
    const targetGenerus = allGenerus.filter(g => {
      if (!m.kategori_generus || m.kategori_generus.length === 0) return true;
      return m.kategori_generus.includes(g.kelompokPeramutan);
    });

    let mKhatam = 0;
    let mProses = 0;
    let mBelum = 0;
    let mPctSum = 0;

    targetGenerus.forEach(g => {
      const hp = (ppgState.hadisProgress || []).find(h => h.jamaah_id === g.id && h.materi_id === m.id);
      const halCount = hp && Array.isArray(hp.halaman_selesai) ? hp.halaman_selesai.length : 0;
      const isKhatam = hp && (hp.status === "Khatam" || hp.persentase_selesai >= 100 || (m.total_halaman && halCount >= m.total_halaman && m.total_halaman > 0));
      if (isKhatam) {
        mKhatam++;
      } else if (halCount > 0) {
        mProses++;
      } else {
        mBelum++;
      }
      mPctSum += hp ? (hp.persentase_selesai || 0) : 0;
    });

    const mAvgPct = targetGenerus.length > 0 ? Math.round(mPctSum / targetGenerus.length) : 0;
    const jenjangBadges = (m.kategori_generus || []).map(j => `<span class="badge badge-generus-${j.toLowerCase()}" style="font-size:0.7rem; padding:2px 6px;">${j}</span>`).join(" ");

    cardsHtml += `
      <div class="card-glass hadis-kitab-card" id="hadis-card-${m.id}" onclick="selectMonitoringHadisMateri('${m.id}')" style="padding:16px; border-radius:10px; cursor:pointer; transition:all 0.25s ease; border: ${isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)'}; background: ${isSelected ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)'}; box-shadow: ${isSelected ? '0 0 15px rgba(16,185,129,0.2)' : 'none'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div>
            <h4 style="margin:0 0 4px 0; color:var(--text-primary); font-size:1.05rem; font-weight:700;">
              <i class="fa-solid fa-book-quran" style="color:var(--primary); margin-right:6px;"></i> ${m.nama_materi}
            </h4>
            <div style="font-size:0.75rem; color:var(--text-secondary);">${m.deskripsi_target || 'Kitab Makna Hadis Himpunan'}</div>
          </div>
          <span class="badge badge-blue" style="font-size:0.75rem; white-space:nowrap;">
            ${m.total_halaman || 0} Hal
          </span>
        </div>

        <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
          <span style="font-size:0.75rem; color:var(--text-muted);">Sasaran:</span>
          ${jenjangBadges || '<span style="font-size:0.75rem; color:var(--text-muted);">-</span>'}
        </div>

        <!-- Progres Bar Rata-rata -->
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:3px;">
            <span style="color:var(--text-secondary);">Rata-rata Khatam</span>
            <span style="font-weight:700; color:${mAvgPct === 100 ? '#10b981' : 'var(--text-primary)'};">${mAvgPct}%</span>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:6px; overflow:hidden;">
            <div style="width:${mAvgPct}%; height:100%; background:linear-gradient(90deg, #10b981, #059669); border-radius:6px;"></div>
          </div>
        </div>

        <!-- Metrik Status Generus -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center; background:rgba(0,0,0,0.2); padding:8px 6px; border-radius:6px; font-size:0.75rem;">
          <div>
            <div style="color:#10b981; font-weight:700; font-size:0.95rem;">${mKhatam}</div>
            <div style="color:var(--text-muted); font-size:0.7rem;">Khatam 100%</div>
          </div>
          <div>
            <div style="color:#f59e0b; font-weight:700; font-size:0.95rem;">${mProses}</div>
            <div style="color:var(--text-muted); font-size:0.7rem;">Proses</div>
          </div>
          <div>
            <div style="color:var(--text-secondary); font-weight:700; font-size:0.95rem;">${mBelum}</div>
            <div style="color:var(--text-muted); font-size:0.7rem;">Belum</div>
          </div>
        </div>

        <div style="margin-top:10px; text-align:center; font-size:0.75rem; color:${isSelected ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:600;">
          <i class="fa-solid ${isSelected ? 'fa-circle-chevron-down' : 'fa-hand-pointer'}"></i> ${isSelected ? 'Kitab Terpilih (Lihat Analisis di Bawah)' : 'Klik untuk Buka Analisis'}
        </div>
      </div>
    `;
  });

  gridContainer.innerHTML = cardsHtml;

  // Auto select materi pertama bila belum ada yang dipilih
  if (!ppgState.selectedMonitoringMateriId && displayMateriList.length > 0) {
    selectMonitoringHadisMateri(displayMateriList[0].id, false);
  } else if (ppgState.selectedMonitoringMateriId) {
    renderMonitoringHadisDetail();
  }
};

/**
 * Memilih Materi Kitab Hadis untuk Dianalisis
 */
window.selectMonitoringHadisMateri = function(materiId, shouldScroll = true) {
  ppgState.selectedMonitoringMateriId = materiId;

  document.querySelectorAll(".hadis-kitab-card").forEach(c => {
    c.style.border = "1px solid var(--border-color)";
    c.style.background = "var(--bg-card)";
    c.style.boxShadow = "none";
  });
  const activeCard = document.getElementById(`hadis-card-${materiId}`);
  if (activeCard) {
    activeCard.style.border = "2px solid var(--primary)";
    activeCard.style.background = "rgba(16,185,129,0.08)";
    activeCard.style.boxShadow = "0 0 15px rgba(16,185,129,0.2)";
  }

  const detailPanel = document.getElementById("hadis-mon-detail-panel");
  if (detailPanel) {
    detailPanel.style.display = "block";
  }

  renderMonitoringHadisDetail();

  if (shouldScroll && detailPanel) {
    detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

/**
 * Switch Tampilan Detail Antara View 1 (Khatam 100%) dan View 2 (Halaman Kosong)
 */
window.switchMonitoringHadisView = function(view) {
  ppgState.monitoringHadisCurrentView = view;
  const btnKhatam = document.getElementById("btn-hadis-view-khatam");
  const btnHalaman = document.getElementById("btn-hadis-view-halaman");
  const viewKhatam = document.getElementById("hadis-mon-view-khatam");
  const viewHalaman = document.getElementById("hadis-mon-view-halaman");

  if (view === "khatam") {
    if (btnKhatam) { btnKhatam.classList.add("active"); btnKhatam.style.borderBottomColor = "var(--primary)"; btnKhatam.style.color = "var(--primary)"; }
    if (btnHalaman) { btnHalaman.classList.remove("active"); btnHalaman.style.borderBottomColor = "transparent"; btnHalaman.style.color = "var(--text-secondary)"; }
    if (viewKhatam) viewKhatam.style.display = "block";
    if (viewHalaman) viewHalaman.style.display = "none";
  } else {
    if (btnHalaman) { btnHalaman.classList.add("active"); btnHalaman.style.borderBottomColor = "var(--primary)"; btnHalaman.style.color = "var(--primary)"; }
    if (btnKhatam) { btnKhatam.classList.remove("active"); btnKhatam.style.borderBottomColor = "transparent"; btnKhatam.style.color = "var(--text-secondary)"; }
    if (viewKhatam) viewKhatam.style.display = "none";
    if (viewHalaman) viewHalaman.style.display = "block";
  }
};

/**
 * Render Detail Materi Hadis Terpilih:
 * Bagian 1: Generus Khatam 100%
 * Bagian 2: Data Halaman Kosong & Generus Belum Mengisi
 */
window.renderMonitoringHadisDetail = function() {
  const materiId = ppgState.selectedMonitoringMateriId;
  const materi = (ppgState.masterMateri || []).find(m => m.id === materiId);
  const detailPanel = document.getElementById("hadis-mon-detail-panel");
  if (!materi || !detailPanel) return;

  // Ambil generus aktif sesuai filter
  const allJamaah = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);
  let allGenerus = allJamaah.filter(j => isGenerusJamaah(j));

  if (ppgState.monitoringHadisFilterKelompok) {
    allGenerus = allGenerus.filter(g => extractKelompokName(g.kelompokPengajian) === ppgState.monitoringHadisFilterKelompok);
  }
  if (ppgState.monitoringHadisFilterJenjang) {
    allGenerus = allGenerus.filter(g => g.kelompokPeramutan === ppgState.monitoringHadisFilterJenjang);
  }

  // Generus sasaran materi ini
  const targetGenerus = allGenerus.filter(g => {
    if (!materi.kategori_generus || materi.kategori_generus.length === 0) return true;
    return materi.kategori_generus.includes(g.kelompokPeramutan);
  });

  // Render Header Materi Terpilih
  const headerContainer = document.getElementById("hadis-mon-selected-header");
  if (headerContainer) {
    const jenjangTags = (materi.kategori_generus || []).map(j => `<span class="badge badge-generus-${j.toLowerCase()}" style="font-size:0.75rem;">${j}</span>`).join(" ");
    headerContainer.innerHTML = `
      <div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
          <h3 style="margin:0; font-size:1.25rem; color:var(--text-primary);">
            <i class="fa-solid fa-book-open-reader" style="color:var(--primary); margin-right:6px;"></i> ${materi.nama_materi}
          </h3>
          <span class="badge badge-blue" style="font-size:0.8rem; font-weight:700;">${materi.total_halaman || 0} Halaman</span>
          ${jenjangTags}
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          ${materi.deskripsi_target || 'Target pengkhataman santri generus'} &bull; 
          Filter Terpilih: <strong>${ppgState.monitoringHadisFilterKelompok || 'Semua Kelompok'}</strong> (${targetGenerus.length} Generus Sasaran)
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn-secondary" onclick="renderMonitoringHadisTab()" style="padding:8px 14px; font-size:0.85rem; border-radius:6px;">
          <i class="fa-solid fa-rotate"></i> Refresh
        </button>
      </div>
    `;
  }

  // ============================================================
  // BAGIAN 1: GENERUS YANG SUDAH KHATAM 100%
  // ============================================================
  const khatamList = [];
  targetGenerus.forEach(g => {
    const hp = (ppgState.hadisProgress || []).find(h => h.jamaah_id === g.id && h.materi_id === materi.id);
    const halCount = hp && Array.isArray(hp.halaman_selesai) ? hp.halaman_selesai.length : 0;
    const isKhatam = hp && (
      hp.status === "Khatam" ||
      hp.persentase_selesai >= 100 ||
      (materi.total_halaman && halCount >= materi.total_halaman && materi.total_halaman > 0)
    );
    if (isKhatam) {
      khatamList.push({ generus: g, hp: hp || {} });
    }
  });

  const badgeKhatamEl = document.getElementById("hadis-mon-badge-khatam-count");
  if (badgeKhatamEl) badgeKhatamEl.textContent = khatamList.length;

  const summaryTextEl = document.getElementById("hadis-mon-khatam-summary-text");
  if (summaryTextEl) {
    summaryTextEl.innerHTML = `<strong>${khatamList.length}</strong> dari <strong>${targetGenerus.length}</strong> generus (${targetGenerus.length > 0 ? Math.round((khatamList.length / targetGenerus.length) * 100) : 0}%) telah khatam 100%`;
  }

  const khatamTbody = document.getElementById("hadis-mon-khatam-tbody");
  if (khatamTbody) {
    if (khatamList.length === 0) {
      khatamTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:35px 20px; color:var(--text-secondary);">
            <i class="fa-solid fa-hourglass-start" style="font-size:2rem; margin-bottom:8px; color:var(--text-muted); display:block;"></i>
            Belum ada generus yang mencapai khotam 100% untuk kitab <strong>${materi.nama_materi}</strong> pada filter yang dipilih.
          </td>
        </tr>
      `;
    } else {
      let rowsHtml = "";
      khatamList.forEach((item, idx) => {
        const santri = item.generus;
        const hp = item.hp;
        const tglKhatam = hp.tanggal_khatam ? hp.tanggal_khatam : (hp.status === "Khatam" ? "Tercatat" : "-");
        const penguji = hp.penguji_terakhir || "-";

        rowsHtml += `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>
              <div style="font-weight:600; color:var(--text-primary);">${santri.namaLengkap}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${santri.id} &bull; ${santri.umur || '-'} Thn &bull; ${santri.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</div>
            </td>
            <td><span style="font-size:0.85rem; color:var(--text-secondary);">${santri.kelompokPengajian}</span></td>
            <td style="text-align:center;">
              <span class="badge badge-generus-${(santri.kelompokPeramutan || '').toLowerCase()}" style="font-size:0.75rem;">
                ${santri.kelompokPeramutan}
              </span>
            </td>
            <td style="text-align:center;">
              <span class="badge badge-green" style="font-weight:700; font-size:0.82rem;">
                <i class="fa-solid fa-check"></i> Khatam 100%
              </span>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${materi.total_halaman}/${materi.total_halaman} Halaman</div>
            </td>
            <td style="text-align:center; font-size:0.85rem; color:var(--text-secondary);">${tglKhatam}</td>
            <td style="font-size:0.85rem; color:var(--text-secondary);">${penguji}</td>
            <td style="text-align:center;">
              <div style="display:inline-flex; gap:6px;">
                <button type="button" class="btn-primary" style="padding:5px 9px; font-size:0.78rem; border-radius:5px;" onclick="openHadisTrackerModal('${santri.id}', '${materi.id}')" title="Buka Pelacak Halaman">
                  <i class="fa-solid fa-list-check"></i> Tracker
                </button>
                <button type="button" class="btn-secondary" style="padding:5px 9px; font-size:0.78rem; border-radius:5px;" onclick="openRaporSantriModal('${santri.id}')" title="Buka Rapor Santri">
                  <i class="fa-solid fa-book-open"></i> Rapor
                </button>
              </div>
            </td>
          </tr>
        `;
      });
      khatamTbody.innerHTML = rowsHtml;
    }
  }

  // ============================================================
  // BAGIAN 2: HALAMAN KOSONG / BELUM DIISI BESERTA DAFTAR GENERUS
  // ============================================================
  const totalPages = parseInt(materi.total_halaman) || 100;
  const pageAnalysisList = [];
  const deficitList = [];

  for (let p = 1; p <= totalPages; p++) {
    const generusBelum = [];
    const generusSudah = [];
    targetGenerus.forEach(g => {
      const hp = (ppgState.hadisProgress || []).find(h => h.jamaah_id === g.id && h.materi_id === materi.id);
      const completedPages = hp && Array.isArray(hp.halaman_selesai) ? hp.halaman_selesai : [];
      if (completedPages.includes(p)) {
        generusSudah.push(g);
      } else {
        generusBelum.push(g);
      }
    });

    const pageItem = {
      page: p,
      count: generusBelum.length,
      belumCount: generusBelum.length,
      sudahCount: generusSudah.length,
      total: targetGenerus.length,
      generusList: generusBelum,
      generusSudah: generusSudah
    };

    pageAnalysisList.push(pageItem);
    if (generusBelum.length > 0) {
      deficitList.push(pageItem);
    }
  }

  // Simpan data analisa & deficit terkalkulasi ke state
  ppgState._activePageAnalysisList = pageAnalysisList;
  ppgState._activeDeficitList = deficitList;
  ppgState._activeTargetGenerus = targetGenerus;
  ppgState._activeMateri = materi;

  const badgeDeficitEl = document.getElementById("hadis-mon-badge-deficit-count");
  if (badgeDeficitEl) badgeDeficitEl.textContent = deficitList.length;

  // Render Visual Matrix Grid Kotak Halaman
  const matrixContainer = document.getElementById("hadis-mon-page-matrix");
  if (matrixContainer) {
    let matrixHtml = "";
    const pageMap = new Map();
    pageAnalysisList.forEach(d => pageMap.set(d.page, d));

    for (let p = 1; p <= totalPages; p++) {
      const def = pageMap.get(p);
      let bgStyle = "";
      let titleTooltip = "";

      if (!def || def.belumCount === 0) {
        // 100% Terisi oleh semua generus
        bgStyle = "background:#10b981; color:#ffffff;";
        titleTooltip = `Hal. ${p}: 100% Terisi oleh seluruh generus`;
      } else if (def.belumCount === targetGenerus.length) {
        // Kosong total (0% terisi)
        bgStyle = "background:rgba(239,68,68,0.7); color:#ffffff;";
        titleTooltip = `Hal. ${p}: Kosong total (Belum diisi oleh siapapun / 0%)`;
      } else {
        // Sebagian belum isi
        bgStyle = "background:#f59e0b; color:#ffffff;";
        titleTooltip = `Hal. ${p}: ${def.sudahCount} sudah isi, ${def.belumCount} belum isi`;
      }

      matrixHtml += `
        <div onclick="jumpToDeficitPage(${p})" title="${titleTooltip}" style="aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:5px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:transform 0.15s ease; ${bgStyle}" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
          ${p}
        </div>
      `;
    }
    matrixContainer.innerHTML = matrixHtml;
  }

  // Render Tabel Halaman
  renderDeficitTableOnly();
};

/**
 * Render Khusus Tabel Halaman & Generus (mendukung filter Sudah Isi, Belum Tuntas, Kosong Total, Mayoritas Belum)
 */
function renderDeficitTableOnly() {
  const deficitTbody = document.getElementById("hadis-mon-deficit-tbody");
  if (!deficitTbody) return;

  const pageAnalysisList = ppgState._activePageAnalysisList || [];
  const deficitList = ppgState._activeDeficitList || [];
  const targetGenerus = ppgState._activeTargetGenerus || [];
  const materi = ppgState._activeMateri;
  if (!materi) return;

  const filterType = ppgState.monitoringHadisFilterDeficit || "all";
  const isFilledMode = filterType === "filled";

  // Update Table Header Title secara dinamis
  const colGenerusTitle = document.getElementById("hadis-col-generus-title");
  const colCountTitle = document.getElementById("hadis-col-count-title");
  const colStatusTitle = document.getElementById("hadis-col-status-title");

  if (colStatusTitle) {
    colStatusTitle.textContent = isFilledMode ? "Status Keterisian" : "Status Defisit";
  }
  if (colGenerusTitle) {
    colGenerusTitle.innerHTML = isFilledMode
      ? `<i class="fa-solid fa-circle-check" style="color:#10b981; margin-right:6px;"></i> Daftar Generus yang Sudah Mengisi Halaman Ini`
      : `Daftar Generus yang Belum Mengisi Halaman Ini`;
  }
  if (colCountTitle) {
    colCountTitle.textContent = isFilledMode ? "Jumlah Sudah Isi" : "Jumlah Belum";
  }

  // Tentukan baris data berdasarkan filterType
  let filteredRows = [];

  if (isFilledMode) {
    // Mode "Sudah Isi": tampilkan halaman yang sudah diisi oleh setidaknya 1 generus
    filteredRows = pageAnalysisList.filter(d => d.sudahCount > 0);
  } else if (filterType === "empty") {
    // Kosong total (0% terisi / belum ada yang isi)
    filteredRows = pageAnalysisList.filter(d => d.belumCount === d.total);
  } else if (filterType === "majority") {
    // Mayoritas (>50% generus belum isi)
    filteredRows = pageAnalysisList.filter(d => d.belumCount > (d.total / 2));
  } else {
    // "all": Semua Halaman Belum Tuntas (setidaknya 1 generus belum isi)
    filteredRows = deficitList;
  }

  // Filter Search Nomor Halaman Spesifik jika diisi
  if (ppgState.monitoringHadisPageSearch) {
    const pageNum = parseInt(ppgState.monitoringHadisPageSearch);
    if (!isNaN(pageNum)) {
      if (isFilledMode) {
        filteredRows = pageAnalysisList.filter(d => d.page === pageNum);
      } else {
        filteredRows = filteredRows.filter(d => d.page === pageNum);
      }
    }
  }

  if (targetGenerus.length === 0) {
    deficitTbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:35px 20px; color:var(--text-secondary);">
          Tidak ada data generus sasaran pada filter yang dipilih.
        </td>
      </tr>
    `;
    return;
  }

  if (filteredRows.length === 0) {
    if (isFilledMode) {
      deficitTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:35px 20px; color:var(--text-secondary);">
            <i class="fa-solid fa-hourglass-start" style="font-size:2.2rem; margin-bottom:10px; color:#f59e0b; display:block;"></i>
            <strong>Belum ada generus yang mengisi halaman ini.</strong>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Gunakan pelacak halaman santri untuk mencatat pemaknaan hadis generus.</div>
          </td>
        </tr>
      `;
    } else {
      deficitTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:35px 20px; color:var(--text-secondary);">
            <i class="fa-solid fa-circle-check" style="font-size:2.2rem; margin-bottom:10px; color:#10b981; display:block;"></i>
            <strong>Masya Allah! Seluruh halaman kitab ini telah selesai diisi oleh generus sasaran (100% tuntas).</strong>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Tidak ada defisit halaman pada kriteria filter saat ini.</div>
          </td>
        </tr>
      `;
    }
    return;
  }

  let rowsHtml = "";
  filteredRows.forEach(d => {
    const terisiCount = d.sudahCount;
    const pctTerisi = d.total > 0 ? Math.round((terisiCount / d.total) * 100) : 0;
    const isEmptyTotal = terisiCount === 0;

    let generusChips = "";
    if (isFilledMode) {
      if (d.generusSudah.length === 0) {
        generusChips = `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Belum ada generus yang mengisi halaman ini</span>`;
      } else {
        generusChips = d.generusSudah.map(g => `
          <span class="generus-filled-chip" onclick="openHadisTrackerModal('${g.id}', '${materi.id}')" title="Klik untuk membuka pelacak halaman ${g.namaLengkap}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:16px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); font-size:0.78rem; cursor:pointer; color:var(--text-primary); transition:all 0.15s ease;" onmouseover="this.style.background='rgba(16,185,129,0.25)'" onmouseout="this.style.background='rgba(16,185,129,0.12)'">
            <i class="fa-solid fa-circle-check" style="color:#10b981; font-size:0.75rem;"></i>
            <strong>${g.namaLengkap}</strong>
            <span style="color:var(--text-muted); font-size:0.72rem;">(${extractKelompokName(g.kelompokPengajian)})</span>
          </span>
        `).join(" ");
      }
    } else {
      generusChips = d.generusList.map(g => `
        <span class="generus-deficit-chip" onclick="openHadisTrackerModal('${g.id}', '${materi.id}')" title="Klik untuk membuka pelacak halaman ${g.namaLengkap}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:16px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); font-size:0.78rem; cursor:pointer; color:var(--text-primary); transition:all 0.15s ease;" onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">
          <i class="fa-solid fa-user-xmark" style="color:#ef4444; font-size:0.75rem;"></i>
          <strong>${g.namaLengkap}</strong>
          <span style="color:var(--text-muted); font-size:0.72rem;">(${extractKelompokName(g.kelompokPengajian)})</span>
        </span>
      `).join(" ");
    }

    const badgeColorClass = isFilledMode
      ? (d.sudahCount === d.total ? 'badge-green' : 'badge-blue')
      : (isEmptyTotal ? 'badge-red' : 'badge-yellow');

    const countBadge = isFilledMode
      ? `<span class="badge ${badgeColorClass}" style="font-weight:700; font-size:0.82rem;">${d.sudahCount} Generus</span>`
      : `<span class="badge ${badgeColorClass}" style="font-weight:700; font-size:0.82rem;">${d.belumCount} Generus</span>`;

    rowsHtml += `
      <tr id="deficit-page-row-${d.page}">
        <td style="text-align:center;">
          <span class="badge ${isFilledMode ? 'badge-green' : (isEmptyTotal ? 'badge-red' : 'badge-yellow')}" style="font-size:0.88rem; font-weight:700; padding:4px 10px;">
            Hal. ${d.page}
          </span>
        </td>
        <td style="text-align:center;">
          <div style="font-size:0.8rem; font-weight:600; color:${isEmptyTotal ? '#ef4444' : (pctTerisi === 100 ? '#10b981' : '#f59e0b')}; margin-bottom:4px;">
            ${isEmptyTotal ? 'Kosong Total (0%)' : `${pctTerisi}% Terisi`}
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:6px; overflow:hidden;">
            <div style="width:${pctTerisi}%; height:100%; background:${isEmptyTotal ? '#ef4444' : (pctTerisi === 100 ? '#10b981' : '#f59e0b')}; border-radius:6px;"></div>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">
            ${terisiCount}/${d.total} Generus Sudah Isi
          </div>
        </td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${generusChips}
          </div>
        </td>
        <td style="text-align:center;">
          ${countBadge}
        </td>
      </tr>
    `;
  });

  deficitTbody.innerHTML = rowsHtml;
}

/**
 * Filter Halaman Defisit (Semua / Sudah Isi / Kosong Total / >50% Belum Isi)
 */
window.filterDeficitPages = function(filterType) {
  ppgState.monitoringHadisFilterDeficit = filterType;
  document.querySelectorAll(".hadis-page-filter-btn").forEach(b => {
    if (b.getAttribute("data-filter") === filterType) {
      b.classList.add("active");
      b.style.background = "var(--primary)";
      b.style.color = "#ffffff";
    } else {
      b.classList.remove("active");
      b.style.background = "transparent";
      b.style.color = "var(--text-secondary)";
    }
  });
  renderDeficitTableOnly();
};

/**
 * Cari Halaman Defisit Berdasarkan Nomor Halaman
 */
window.searchDeficitPageNumber = function(query) {
  ppgState.monitoringHadisPageSearch = query;
  renderDeficitTableOnly();
};

/**
 * Klik Kotak Halaman untuk Melompat Langsung ke Baris Tabel Halaman Bersangkutan
 */
window.jumpToDeficitPage = function(pageNum) {
  switchMonitoringHadisView('halaman');

  // Jika halaman tersebut 100% terisi (tidak ada defisit belum), otomatis switch ke filter 'filled' agar halamannya muncul dan disorot
  const pageAnalysisList = ppgState._activePageAnalysisList || [];
  const pageData = pageAnalysisList.find(d => d.page === pageNum);

  if (pageData && pageData.belumCount === 0 && ppgState.monitoringHadisFilterDeficit !== 'filled') {
    ppgState.monitoringHadisFilterDeficit = "filled";
    document.querySelectorAll(".hadis-page-filter-btn").forEach(b => {
      if (b.getAttribute("data-filter") === "filled") {
        b.classList.add("active");
        b.style.background = "var(--primary)";
        b.style.color = "#ffffff";
      } else {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "var(--text-secondary)";
      }
    });
  } else if (ppgState.monitoringHadisFilterDeficit !== 'filled') {
    ppgState.monitoringHadisFilterDeficit = "all";
    document.querySelectorAll(".hadis-page-filter-btn").forEach(b => {
      if (b.getAttribute("data-filter") === "all") {
        b.classList.add("active");
        b.style.background = "var(--primary)";
        b.style.color = "#ffffff";
      } else {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "var(--text-secondary)";
      }
    });
  }

  ppgState.monitoringHadisPageSearch = "";
  const pageInput = document.getElementById("hadis-mon-page-search-input");
  if (pageInput) pageInput.value = "";

  renderDeficitTableOnly();

  const targetRow = document.getElementById(`deficit-page-row-${pageNum}`);
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    targetRow.style.transition = "background 0.3s ease";
    targetRow.style.background = "rgba(245, 158, 11, 0.3)";
    setTimeout(() => {
      targetRow.style.background = "";
    }, 2000);
  }
};

/**
 * Filter Form Events
 */
window.applyMonitoringHadisFilter = function() {
  const searchInput = document.getElementById("hadis-mon-filter-search");
  const kelSelect = document.getElementById("hadis-mon-filter-kelompok");
  const jenjangSelect = document.getElementById("hadis-mon-filter-jenjang");

  if (searchInput) ppgState.monitoringHadisFilterSearch = searchInput.value;
  if (kelSelect) ppgState.monitoringHadisFilterKelompok = kelSelect.value;
  if (jenjangSelect) ppgState.monitoringHadisFilterJenjang = jenjangSelect.value;

  renderMonitoringHadisTab();
};

window.resetMonitoringHadisFilter = function() {
  ppgState.monitoringHadisFilterSearch = "";
  ppgState.monitoringHadisFilterJenjang = "";
  ppgState.monitoringHadisFilterDeficit = "all";
  ppgState.monitoringHadisPageSearch = "";

  const searchInput = document.getElementById("hadis-mon-filter-search");
  const jenjangSelect = document.getElementById("hadis-mon-filter-jenjang");
  const kelSelect = document.getElementById("hadis-mon-filter-kelompok");
  const pageInput = document.getElementById("hadis-mon-page-search-input");

  if (searchInput) searchInput.value = "";
  if (jenjangSelect) jenjangSelect.value = "";
  if (pageInput) pageInput.value = "";
  if (kelSelect && !kelSelect.disabled) {
    kelSelect.value = "";
    ppgState.monitoringHadisFilterKelompok = "";
  }

  renderMonitoringHadisTab();
};
