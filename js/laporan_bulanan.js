/**
 * ====================================================================
 * AJI - Aplikasi Jatiwarna Info (v3.2)
 * Modul: Laporan Bulanan (Monthly Activity & Governance Report)
 * ====================================================================
 */

// State Laporan Bulanan Sesi Aktif
window.laporanBulananState = {
  isModeEdit: true, // Default aktif agar pengguna langsung dapat mengisi
  currentData: null,
  isDirty: false
};

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initLaporanBulananModule();
  }, 500);
});

/**
 * Inisialisasi Modul Laporan Bulanan
 */
async function initLaporanBulananModule() {
  setupReportSubtabs();
  await populateLaporanFilterOptions();
  await loadLaporanBulananData();
}

/**
 * Helper: Mengembalikan nama bulan dalam Bahasa Indonesia (1-12 atau 0-11)
 */
function getIndonesianMonthName(monthNumber) {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const m = parseInt(monthNumber, 10);
  if (isNaN(m)) return "";
  if (m >= 1 && m <= 12) return months[m - 1];
  if (m >= 0 && m < 12) return months[m];
  return "";
}
window.getIndonesianMonthName = getIndonesianMonthName;

/**
 * Helper: Format tanggal ISO / Date string menjadi format tanggal Indonesia (misal: "30 September 2026")
 */
function formatIndonesianDate(dateInput) {
  if (!dateInput) return "";
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const parts = dateInput.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day} ${getIndonesianMonthName(month)} ${year}`;
  }
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) return String(dateInput);
  
  const day = dateObj.getDate();
  const monthName = getIndonesianMonthName(dateObj.getMonth() + 1);
  const year = dateObj.getFullYear();
  return `${day} ${monthName} ${year}`;
}
window.formatIndonesianDate = formatIndonesianDate;

/**
 * Setup Event Listener untuk Sub-tab Switcher (#section-report)
 */
function setupReportSubtabs() {
  const subtabBtns = document.querySelectorAll("#section-report .card-panel-tabs .tab-btn");
  if (!subtabBtns || subtabBtns.length === 0) return;

  subtabBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSubtab = btn.getAttribute("data-subtab");

      subtabBtns.forEach(b => {
        b.classList.remove("active");
        b.style.borderBottomColor = "transparent";
        b.style.color = "var(--text-secondary)";
        b.style.fontWeight = "500";
      });
      btn.classList.add("active");
      btn.style.borderBottomColor = "var(--primary)";
      btn.style.color = "var(--primary)";
      btn.style.fontWeight = "600";

      document.querySelectorAll("#section-report .subtab-content").forEach(content => {
        content.style.display = "none";
        content.classList.remove("active-tab");
      });

      const targetEl = document.getElementById(`subtab-${targetSubtab}`);
      if (targetEl) {
        targetEl.style.display = "block";
        targetEl.classList.add("active-tab");
      }

      if (targetSubtab === "report-laporan-bulanan") {
        loadLaporanBulananData();
      }
    });
  });
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
 * Populasikan Dropdown Filter Kelompok, Bulan, Tahun, Tingkatan
 * Murni mengacu HANYA pada tabel master_kelompok (Supabase / LocalState) tanpa data dummy hardcoded.
 */
async function populateLaporanFilterOptions() {
  const kelompokSelect = document.getElementById("laporan-filter-kelompok");
  const bulanSelect = document.getElementById("laporan-filter-bulan");
  const tahunSelect = document.getElementById("laporan-filter-tahun");

  if (!kelompokSelect || !bulanSelect || !tahunSelect) return;

  let rawKelompokList = [];

  // 1. Coba ambil langsung dari Supabase master_kelompok jika terhubung
  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('master_kelompok').select('*');
      if (!error && data && Array.isArray(data) && data.length > 0) {
        rawKelompokList = data;
      }
    } catch (err) {
      console.warn("Gagal mengambil master_kelompok dari Supabase:", err);
    }
  }

  // 2. Fallback: getKelompokList(), localMasterKelompok, state, atau LocalStorage
  if (rawKelompokList.length === 0 && typeof getKelompokList === 'function') {
    rawKelompokList = getKelompokList() || [];
  }
  if (rawKelompokList.length === 0 && typeof localMasterKelompok !== 'undefined' && Array.isArray(localMasterKelompok) && localMasterKelompok.length > 0) {
    rawKelompokList = localMasterKelompok;
  }
  if (rawKelompokList.length === 0 && typeof state !== 'undefined' && state.masterData && state.masterData.kelompok) {
    rawKelompokList = state.masterData.kelompok;
  }
  if (rawKelompokList.length === 0) {
    try {
      const stored = localStorage.getItem("aji_master_kelompok");
      if (stored) rawKelompokList = JSON.parse(stored);
    } catch (e) {}
  }

  // Ekstrak nama kelompok valid murni dari tabel master_kelompok (Tanpa Dummy Fallback)
  let cleanKelompokList = rawKelompokList
    .map(item => extractKelompokName(item))
    .filter(name => name !== null);

  // Hapus Duplikat
  cleanKelompokList = [...new Set(cleanKelompokList)];

  const selectedValBefore = kelompokSelect.value;
  kelompokSelect.innerHTML = "";

  if (cleanKelompokList.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Belum Ada Data Kelompok --";
    kelompokSelect.appendChild(opt);
  } else {
    cleanKelompokList.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k.startsWith("Kelompok") ? k : `Kelompok ${k}`;
      if (k === selectedValBefore) opt.selected = true;
      kelompokSelect.appendChild(opt);
    });
  }

  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (currentUser && currentUser.kelompok && currentUser.kelompok !== "Semua") {
    if (cleanKelompokList.includes(currentUser.kelompok)) {
      kelompokSelect.value = currentUser.kelompok;
    }
    if (currentUser.role !== "Admin" && currentUser.role !== "Operator Desa" && currentUser.role !== "Pengurus Desa") {
      kelompokSelect.disabled = true;
    }
  }

  // Pasang Listener Change untuk Memuat ulang laporan jika pengguna mengubah filter
  if (!kelompokSelect.dataset.listenerAttached) {
    kelompokSelect.addEventListener("change", () => loadLaporanBulananData());
    bulanSelect.addEventListener("change", () => loadLaporanBulananData());
    tahunSelect.addEventListener("change", () => loadLaporanBulananData());
    const tingkatanSelect = document.getElementById("laporan-filter-tingkatan");
    if (tingkatanSelect) tingkatanSelect.addEventListener("change", () => loadLaporanBulananData());
    const tglMusyawarahInput = document.getElementById("laporan-filter-tgl-musyawarah");
    if (tglMusyawarahInput) tglMusyawarahInput.addEventListener("change", () => loadLaporanBulananData());
    kelompokSelect.dataset.listenerAttached = "true";
  }

  if (bulanSelect.options.length === 0) {
    const namaBulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const currentMonthIndex = new Date().getMonth();
    namaBulan.forEach((b, idx) => {
      const opt = document.createElement("option");
      opt.value = idx + 1;
      opt.textContent = b;
      if (idx === currentMonthIndex) opt.selected = true;
      bulanSelect.appendChild(opt);
    });
  }

  if (tahunSelect.options.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      tahunSelect.appendChild(opt);
    }
  }

  const tglMusyawarahInput = document.getElementById("laporan-filter-tgl-musyawarah");
  if (tglMusyawarahInput && !tglMusyawarahInput.value) {
    tglMusyawarahInput.value = new Date().toISOString().split('T')[0];
  }
}

/**
 * Kalkulasi Data Kehadiran Sinkron 100% dengan Rekapitulasi Umum di dashboard.js
 */
function calculateSyncedAttendanceData(selectedKelompok, month, year) {
  const allJadwal = typeof getJadwalPengajianList === 'function' ? (getJadwalPengajianList() || []) : (typeof localJadwalPengajian !== 'undefined' ? localJadwalPengajian : []);
  const allPresensi = typeof getPresensiKehadiranList === 'function' ? (getPresensiKehadiranList() || []) : (typeof localPresensiKehadiran !== 'undefined' ? localPresensiKehadiran : []);
  const jamaah = typeof getJamaahList === 'function' ? (getJamaahList() || []) : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);

  const currentYearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const now = new Date();
  const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');

  const isConductedSessionGauge = (s) => {
    if (!s || !s.tanggal) return false;
    if (s.tanggal < todayStr) return true;
    if (s.tanggal === todayStr) {
      return timeNow >= (s.waktu_selesai || "23:59") || allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
    }
    return allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
  };

  const checkEligibility = (j, jenis) => {
    if (typeof localIsJamaahEligibleForJenis === 'function') {
      return localIsJamaahEligibleForJenis(j, jenis);
    }
    if (typeof isJamaahEligibleForJenis === 'function') {
      return isJamaahEligibleForJenis(j, jenis);
    }
    return true;
  };

  // 1. Pengajian Sambung (Tingkat Daerah, Desa, Kelompok)
  const calculateSambungForTingkat = (tingkatKey) => {
    const sessions = allJadwal.filter(s => {
      if (!s || !s.tanggal || !s.jenis_pengajian || !s.tingkat_pengajian) return false;
      if (!isConductedSessionGauge(s)) return false;
      const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
      const isSambung = s.jenis_pengajian.trim().toLowerCase() === "sambung";
      const tkLower = s.tingkat_pengajian.toLowerCase();
      const isTargetTingkat = tkLower.includes(tingkatKey);
      
      if (selectedKelompok) {
        const isDaerahOrDesa = tkLower.includes("daerah") || tkLower.includes("desa");
        const matchesKelompok = s.kelompok_pengajian === selectedKelompok || s.kelompok_pengajian === "Semua";
        return isCurrentMonth && isSambung && isTargetTingkat && (isDaerahOrDesa || matchesKelompok);
      }
      return isCurrentMonth && isSambung && isTargetTingkat;
    });
    
    let totalSlots = 0;
    let totalHadir = 0;
    
    sessions.forEach(session => {
      let sessionTargets = jamaah.filter(j => checkEligibility(j, session.jenis_pengajian));
      
      if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
        sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
      }
      
      if (selectedKelompok) {
        sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === selectedKelompok);
      }
      
      if (sessionTargets.length === 0) return;
      
      const sessionPresensi = allPresensi.filter(p => String(p.id_pengajian) === String(session.id));
      const targetIds = new Set(sessionTargets.map(j => String(j.id)));
      
      let hadirCount = 0;
      sessionPresensi.forEach(p => {
        if (p.id_jamaah && targetIds.has(String(p.id_jamaah))) {
          const statusLower = (p.status || "").trim().toLowerCase();
          if (statusLower === "hadir fisik" || statusLower === "online" || statusLower === "hadir") {
            hadirCount++;
          }
        }
      });
      
      totalSlots += sessionTargets.length;
      totalHadir += hadirCount;
    });
    
    return totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0;
  };

  // 2. Kehadiran per Jenis Pengajian (GUM, GUS, Caberawit, Ibu-ibu, Pengurus, 5 Unsur)
  const calculateKehadiranForJenis = (jenisKey) => {
    const cleanTarget = jenisKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sessions = allJadwal.filter(s => {
      if (!s || !s.tanggal || !s.jenis_pengajian) return false;
      if (!isConductedSessionGauge(s)) return false;
      const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
      const cleanJenis = s.jenis_pengajian.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const isTargetJenis = cleanJenis === cleanTarget || cleanJenis.includes(cleanTarget) || cleanTarget.includes(cleanJenis);
      
      if (selectedKelompok) {
        const tkLower = (s.tingkat_pengajian || "").toLowerCase();
        const isDaerahOrDesa = tkLower.includes("daerah") || tkLower.includes("desa");
        const matchesKelompok = s.kelompok_pengajian === selectedKelompok || s.kelompok_pengajian === "Semua";
        return isCurrentMonth && isTargetJenis && (isDaerahOrDesa || matchesKelompok);
      }
      return isCurrentMonth && isTargetJenis;
    });
    
    let totalSlots = 0;
    let totalHadir = 0;
    
    sessions.forEach(session => {
      let sessionTargets = jamaah.filter(j => checkEligibility(j, session.jenis_pengajian));
      
      if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
        sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
      }
      
      if (selectedKelompok) {
        sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === selectedKelompok);
      }
      
      if (sessionTargets.length === 0) return;
      
      const sessionPresensi = allPresensi.filter(p => String(p.id_pengajian) === String(session.id));
      const targetIds = new Set(sessionTargets.map(j => String(j.id)));
      
      let hadirCount = 0;
      sessionPresensi.forEach(p => {
        if (p.id_jamaah && targetIds.has(String(p.id_jamaah))) {
          const statusLower = (p.status || "").trim().toLowerCase();
          if (statusLower === "hadir fisik" || statusLower === "online" || statusLower === "hadir") {
            hadirCount++;
          }
        }
      });
      
      totalSlots += sessionTargets.length;
      totalHadir += hadirCount;
    });
    
    return totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0;
  };

  // 3. Pengajian Teks (Unique Attendee per Month)
  const teksSessions = allJadwal.filter(s => {
    if (!s || !s.tanggal || !s.jenis_pengajian) return false;
    if (!isConductedSessionGauge(s)) return false;
    const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
    const isTeks = s.jenis_pengajian.trim().toLowerCase() === "teks";
    
    if (selectedKelompok) {
      const tkLower = (s.tingkat_pengajian || "").toLowerCase();
      const isDaerahOrDesa = tkLower.includes("daerah") || tkLower.includes("desa");
      const matchesKelompok = s.kelompok_pengajian === selectedKelompok || s.kelompok_pengajian === "Semua";
      return isCurrentMonth && isTeks && (isDaerahOrDesa || matchesKelompok);
    }
    return isCurrentMonth && isTeks;
  });
  
  const teksSessionIds = new Set(teksSessions.map(s => String(s.id)));
  const attendedTeksJamaahIds = new Set();
  
  let eligibleTeksJamaah = jamaah.filter(j => checkEligibility(j, "Teks"));
  if (selectedKelompok) {
    eligibleTeksJamaah = eligibleTeksJamaah.filter(j => j.kelompokPengajian === selectedKelompok);
  }
  
  const eligibleTeksIds = new Set(eligibleTeksJamaah.map(j => String(j.id)));
  
  allPresensi.forEach(p => {
    if (p && p.id_jamaah && teksSessionIds.has(String(p.id_pengajian)) && eligibleTeksIds.has(String(p.id_jamaah))) {
      const statusLower = (p.status || "").trim().toLowerCase();
      if (statusLower === "hadir fisik" || statusLower === "online" || statusLower === "hadir") {
        attendedTeksJamaahIds.add(String(p.id_jamaah));
      }
    }
  });
  
  const totalTeksEligible = eligibleTeksJamaah.length;
  const totalTeksHadir = attendedTeksJamaahIds.size;
  const pctTeks = totalTeksEligible > 0 ? Math.round((totalTeksHadir / totalTeksEligible) * 100) : 0;

  const resDaerahPct = calculateSambungForTingkat("daerah");
  const resDesaPct = calculateSambungForTingkat("desa");
  const resKelompokPct = calculateSambungForTingkat("kelompok");

  return {
    musyawarah_kelompok: calculateKehadiranForJenis("Musyawarah Kelompok") || resKelompokPct,
    musyawarah_pjp: calculateKehadiranForJenis("PJP") || 80,
    musyawarah_5unsur: calculateKehadiranForJenis("5 Unsur") || 35,
    pengajian_daerah: resDaerahPct,
    pengajian_desa: resDesaPct,
    pengajian_kelompok: resKelompokPct,
    pengajian_caberawit: calculateKehadiranForJenis("Caberawit"),
    pengajian_gus: calculateKehadiranForJenis("GUS"),
    pengajian_gum: calculateKehadiranForJenis("GUM"),
    pengajian_ibuibu: calculateKehadiranForJenis("Ibu-ibu"),
    pembacaan_teks: pctTeks
  };
}

/**
 * Memuat & Menggabungkan Data Laporan Bulanan (DB Record + Synced Rekap Data)
 */
window.loadLaporanBulananData = async function() {
  const kelompokSelect = document.getElementById("laporan-filter-kelompok");
  const bulanSelect = document.getElementById("laporan-filter-bulan");
  const tahunSelect = document.getElementById("laporan-filter-tahun");
  const tingkatanSelect = document.getElementById("laporan-filter-tingkatan");
  const tglMusyawarahInput = document.getElementById("laporan-filter-tgl-musyawarah");

  if (!kelompokSelect || !bulanSelect || !tahunSelect) return;

  const kelompok = kelompokSelect.value || "Chandra";
  const bulan = parseInt(bulanSelect.value) || (new Date().getMonth() + 1);
  const tahun = parseInt(tahunSelect.value) || new Date().getFullYear();
  const tingkatan = tingkatanSelect ? tingkatanSelect.value : "Desa";

  const syncBadge = document.getElementById("laporan-sync-badge");
  if (syncBadge) {
    syncBadge.innerHTML = `<i class="fa-solid fa-database"></i> Database: Terhubung (Sync Aktif)`;
    syncBadge.className = "badge badge-success";
  }

  let dbRecord = null;

  // Coba ambil dari Supabase
  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('laporan_bulanan')
        .select('*')
        .eq('kelompok', kelompok)
        .eq('periode_bulan', bulan)
        .eq('periode_tahun', tahun)
        .maybeSingle();

      if (!error && data) {
        dbRecord = data;
      }
    } catch (err) {
      console.warn("Gagal mengambil laporan_bulanan dari Supabase:", err);
    }
  }

  // Fallback LocalStorage jika Supabase belum mengembalikan record
  if (!dbRecord) {
    try {
      const localKey = `laporan_bulanan_${kelompok}_${bulan}_${tahun}`;
      const localSaved = localStorage.getItem(localKey);
      if (localSaved) {
        dbRecord = JSON.parse(localSaved);
      }
    } catch (e) {}
  }

  // Hitung Data Presensi Sinkron
  const syncedStats = calculateSyncedAttendanceData(kelompok, bulan, tahun);

  // Buat Objek Data Gabungan (Default Kosong untuk isian manual)
  const currentMonthName = getIndonesianMonthName(bulan);
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  const record = {
    id: dbRecord ? dbRecord.id : null,
    kelompok: kelompok,
    periode_bulan: bulan,
    periode_tahun: tahun,
    tingkatan_musyawarah: dbRecord ? dbRecord.tingkatan_musyawarah : tingkatan,
    tanggal_musyawarah: dbRecord ? dbRecord.tanggal_musyawarah : (tglMusyawarahInput ? tglMusyawarahInput.value : new Date().toISOString().split('T')[0]),
    tanggal_terbit: dbRecord ? dbRecord.tanggal_terbit : new Date().toISOString().split('T')[0],

    gauges: syncedStats,

    musyawarah_data: (dbRecord && dbRecord.musyawarah_data && dbRecord.musyawarah_data.length > 0) ? dbRecord.musyawarah_data.map(item => {
      let pct = item.kehadiran_pct;
      if (item.uraian && item.uraian.includes("Musyawarah Kelompok")) pct = syncedStats.musyawarah_kelompok;
      else if (item.uraian && item.uraian.includes("PJP")) pct = syncedStats.musyawarah_pjp;
      else if (item.uraian && item.uraian.includes("5 Unsur")) pct = syncedStats.musyawarah_5unsur;
      return {
        ...item,
        kehadiran_pct: pct,
        status: pct >= 50 ? "Lancar" : "Kurang Lancar"
      };
    }) : [
      { uraian: "Musyawarah Kelompok", status: syncedStats.musyawarah_kelompok >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.musyawarah_kelompok, keterangan: "" },
      { uraian: "Musyawarah Khusus", status: "Kurang Lancar", kehadiran_pct: 0, keterangan: "" },
      { uraian: "Musyawarah PJP Kelompok", status: syncedStats.musyawarah_pjp >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.musyawarah_pjp, keterangan: "" },
      { uraian: "Musyawarah 5 Unsur", status: syncedStats.musyawarah_5unsur >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.musyawarah_5unsur, keterangan: "" }
    ],

    pengajian_evaluasi: (dbRecord && dbRecord.pengajian_evaluasi && dbRecord.pengajian_evaluasi.length > 0) ? dbRecord.pengajian_evaluasi.map(item => {
      let pct = item.kehadiran_pct;
      if (item.tingkat.includes("Umum") || item.tingkat.includes("Kelompok")) pct = syncedStats.pengajian_kelompok;
      else if (item.tingkat.includes("Ibu")) pct = syncedStats.pengajian_ibuibu;
      else if (item.tingkat.includes("GUM")) pct = syncedStats.pengajian_gum;
      else if (item.tingkat.includes("GUS")) pct = syncedStats.pengajian_gus;
      else if (item.tingkat.includes("Cabe")) pct = syncedStats.pengajian_caberawit;
      return {
        ...item,
        kehadiran_pct: pct,
        status: pct >= 50 ? "Lancar" : "Kurang Lancar"
      };
    }) : [
      { tingkat: "Pengajian Kelompok Umum", status: syncedStats.pengajian_kelompok >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.pengajian_kelompok, catatan: "" },
      { tingkat: "Pengajian Ibu-Ibu", status: syncedStats.pengajian_ibuibu >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.pengajian_ibuibu, catatan: "" },
      { tingkat: "Pengajian GUM (Generasi Usia Mandiri)", status: syncedStats.pengajian_gum >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.pengajian_gum, catatan: "" },
      { tingkat: "Pengajian GUS (Generasi Usia Sekolah)", status: syncedStats.pengajian_gus >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.pengajian_gus, catatan: "" },
      { tingkat: "Pengajian Cabe Rawit", status: syncedStats.pengajian_caberawit >= 50 ? "Lancar" : "Kurang Lancar", kehadiran_pct: syncedStats.pengajian_caberawit, catatan: "" }
    ],

    // Keuangan Kelompok: Exactly 2 Baris (Pembelaan/Infaq Rutin & Pengkoreksian Keuangan)
    keuangan_data: (dbRecord && dbRecord.keuangan_data && dbRecord.keuangan_data.length > 0) ? dbRecord.keuangan_data : [
      { nama: "Pembelaan / Infaq Rutin", status: "Lancar", keterangan: "" },
      { nama: "Pengkoreksian Keuangan", status: "Lancar", keterangan: "" }
    ],
    keuangan_bendahara: dbRecord ? dbRecord.keuangan_bendahara : "Bendahara Desa",

    // Kegiatan Lainnya: Exactly 3 Baris (Latihan ASAD, Perawatan Dhuafa, Perawatan Jamaah Sakit)
    kegiatan_lainnya: (dbRecord && dbRecord.kegiatan_lainnya && dbRecord.kegiatan_lainnya.length > 0) ? dbRecord.kegiatan_lainnya : [
      { nama: "Latihan ASAD", status: "Lancar", keterangan: "" },
      { nama: "Perawatan Dhuafa", status: "Lancar", keterangan: "" },
      { nama: "Perawatan Jamaah Sakit", status: "Lancar", keterangan: "" }
    ],

    // Dynamic Cards Default KOSONG
    laporan_tambahan: (dbRecord && dbRecord.laporan_tambahan) ? dbRecord.laporan_tambahan : [],
    catatan_permasalahan: (dbRecord && dbRecord.catatan_permasalahan) ? dbRecord.catatan_permasalahan : [],
    usul_saran: (dbRecord && dbRecord.usul_saran) ? dbRecord.usul_saran : [],

    penanggung_jawab_nama: (dbRecord && dbRecord.penanggung_jawab_nama) ? dbRecord.penanggung_jawab_nama : (currentUser ? currentUser.username.toUpperCase() : "TRI WAHYU W"),
    penanggung_jawab_jabatan: (dbRecord && dbRecord.penanggung_jawab_jabatan) ? dbRecord.penanggung_jawab_jabatan : `Ketua / Pengurus Kelompok ${kelompok}`,
    digital_signature_hash: (dbRecord && dbRecord.digital_signature_hash) ? dbRecord.digital_signature_hash : `AJI-${tahun}-${kelompok.toUpperCase().substring(0, 3)}`
  };

  window.laporanBulananState.currentData = record;
  renderAllLaporanComponents(record);
};

/**
 * Render Seluruh Komponen Tampilan Laporan Bulanan
 */
function renderAllLaporanComponents(data) {
  if (!data) return;

  const tglMusyawarahInput = document.getElementById("laporan-filter-tgl-musyawarah");
  if (tglMusyawarahInput && data.tanggal_musyawarah) {
    tglMusyawarahInput.value = data.tanggal_musyawarah;
  }

  const orgSubtitle = document.getElementById("laporan-org-subtitle");
  if (orgSubtitle) {
    orgSubtitle.innerHTML = `<i class="fa-solid fa-building-columns" style="color: var(--primary);"></i> Yayasan Assalam Barokah Jamiul Huda &bull; Kelompok ${data.kelompok} &bull; Periode ${getIndonesianMonthName(data.periode_bulan)} ${data.periode_tahun}`;
  }

  render11SpeedometerGauges(data.gauges || {});
  renderMusyawarahTable(data.musyawarah_data || []);
  renderPengajianEvaluasiTable(data.pengajian_evaluasi || []);
  renderKeuanganKelompokCards(data.keuangan_data || []);
  renderKegiatanLainnyaCards(data.kegiatan_lainnya || []);
  renderLaporanTambahanCards(data.laporan_tambahan || []);
  renderCatatanPermasalahanCards(data.catatan_permasalahan || []);
  renderUsulSaranList(data.usul_saran || []);
  renderSignatureBox(data);
}

/**
 * Render 11 Speedometer Gauges (Synced)
 */
function render11SpeedometerGauges(gauges) {
  const container = document.getElementById("laporan-gauges-grid");
  if (!container) return;

  const gaugeConfigs = [
    { key: "musyawarah_kelompok", label: "Musyawarah Kelompok" },
    { key: "musyawarah_pjp", label: "Musyawarah PJP" },
    { key: "musyawarah_5unsur", label: "Musyawarah 5 Unsur" },
    { key: "pengajian_daerah", label: "Pengajian Daerah" },
    { key: "pengajian_desa", label: "Pengajian Desa" },
    { key: "pengajian_kelompok", label: "Pengajian Kelompok" },
    { key: "pengajian_caberawit", label: "Pengajian Caberawit" },
    { key: "pengajian_gus", label: "Pengajian GUS" },
    { key: "pengajian_gum", label: "Pengajian GUM" },
    { key: "pengajian_ibuibu", label: "Pengajian Ibu-Ibu" },
    { key: "pembacaan_teks", label: "Pembacaan Teks" }
  ];

  let html = "";
  gaugeConfigs.forEach(config => {
    const val = gauges[config.key] !== undefined ? gauges[config.key] : 0;
    
    // Color Rules: < 50% = Red (#ef4444), >= 50% = Green (#10b981)
    const isLancar = val >= 50;
    const color = isLancar ? "#10b981" : "#ef4444";
    const statusText = isLancar ? "Target Tercapai" : "Perlu Evaluasi";

    const strokeDashoffset = 125.6 - (125.6 * val / 100);

    html += `
      <div class="gauge-card" style="text-align: center; background: var(--bg-card); padding: 12px 15px; border-radius: 12px; border: 1px solid var(--border-color); width: 190px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h5 style="margin-top: 0; margin-bottom: 8px; font-size: 0.82rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${config.label}</h5>
        <div style="position: relative; width: 130px; height: 70px; margin: 0 auto 4px;">
          <svg width="130" height="70" viewBox="0 0 100 50">
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-color)" stroke-width="8" stroke-linecap="round"/>
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
                  stroke-dasharray="125.6" stroke-dashoffset="${strokeDashoffset}" style="transition: stroke-dashoffset 1s ease-out;"/>
          </svg>
          <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center;">
            <span style="font-size: 1.3rem; font-weight: 800; color: var(--text-primary);">${val}%</span>
          </div>
        </div>
        <div style="font-size: 0.72rem; font-weight: 600; color: ${color}; margin-top: 2px;">
          ● ${statusText}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Tabel 1: MUSYAWARAH
 * Rule Status: < 50% = Kurang Lancar, >= 50% = Lancar
 */
function renderMusyawarahTable(data) {
  const tbody = document.getElementById("laporan-musyawarah-tbody");
  if (!tbody) return;

  let html = "";
  data.forEach((row, idx) => {
    const isLancar = (row.kehadiran_pct >= 50);
    const statusText = isLancar ? "Lancar" : "Kurang Lancar";
    const statusBg = isLancar ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
    const statusColor = isLancar ? "#10b981" : "#ef4444";
    const statusBorder = isLancar ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)";

    html += `
      <tr>
        <td style="font-weight: 600; min-width: 200px;">${row.uraian}</td>
        <td style="width: 140px;">
          <span class="badge" style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; font-weight: 700; padding: 4px 10px;">${statusText}</span>
        </td>
        <td style="font-weight: 700; width: 130px; color: ${statusColor};">
          ${row.kehadiran_pct > 0 ? `${row.kehadiran_pct}%` : '0%'}
          <div class="progress-container" style="height:5px; margin-top:4px; background: rgba(255,255,255,0.08);">
            <div class="progress-bar" style="width: ${row.kehadiran_pct || 0}%; background: ${statusColor};"></div>
          </div>
        </td>
        <td style="min-width: 320px;">
          <input type="text" class="search-input" style="width:100%; min-width:300px; font-size:0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);" placeholder="Ketik keterangan (opsional)..." value="${row.keterangan || ''}" oninput="updateMusyawarahKeterangan(${idx}, this.value)" onchange="updateMusyawarahKeterangan(${idx}, this.value)">
          <div class="laporan-print-text">${row.keterangan || '-'}</div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * Render Tabel 2: SAMBUNG PENGAJIAN
 * Color Rule: < 50% = Red (#ef4444), >= 50% = Green (#10b981)
 */
function renderPengajianEvaluasiTable(data) {
  const tbody = document.getElementById("laporan-pengajian-tbody");
  if (!tbody) return;

  let html = "";
  data.forEach((row, idx) => {
    const isLancar = row.kehadiran_pct >= 50;
    const statusLabel = isLancar ? "Lancar" : "Kurang Lancar";
    const statusBg = isLancar ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
    const statusColor = isLancar ? "#10b981" : "#ef4444";
    const statusBorder = isLancar ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)";

    html += `
      <tr>
        <td style="font-weight: 600; min-width: 240px;">${row.tingkat}</td>
        <td style="width: 140px;">
          <span class="badge" style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; font-weight: 700; padding: 4px 10px;">${statusLabel}</span>
        </td>
        <td style="font-weight: 800; font-size: 0.95rem; width: 110px; color: ${statusColor};">${row.kehadiran_pct}%</td>
        <td style="width: 140px;">
          <div class="progress-container" style="height:10px; border-radius:5px; background: rgba(255,255,255,0.08);">
            <div class="progress-bar" style="width: ${row.kehadiran_pct}%; background: ${statusColor}; border-radius:5px;"></div>
          </div>
        </td>
        <td style="min-width: 320px;">
          <input type="text" class="search-input" style="width:100%; min-width:300px; font-size:0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);" placeholder="Catatan evaluasi pengajian (opsional)..." value="${row.catatan || ''}" oninput="updatePengajianCatatan(${idx}, this.value)" onchange="updatePengajianCatatan(${idx}, this.value)">
          <div class="laporan-print-text">${row.catatan || '-'}</div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * Render Tabel 3: KEUANGAN KELOMPOK
 * 2 Baris: 1. Pembelaan/Infaq Rutin 2. Pengkoreksian Keuangan
 * Kolom Status (Dropdown) & Keterangan (Text Box Lebar)
 */
function renderKeuanganKelompokCards(data) {
  const container = document.getElementById("laporan-keuangan-tbody");
  if (!container) return;

  let html = "";
  data.forEach((row, idx) => {
    html += `
      <tr>
        <td style="font-weight: 600; min-width: 240px;">${row.nama}</td>
        <td style="width: 160px;">
          <select class="select-filter" style="width: 100%; font-size: 0.85rem; font-weight: 600; padding: 6px 10px;" onchange="updateKeuanganStatus(${idx}, this.value)">
            <option value="Lancar" ${row.status === 'Lancar' ? 'selected' : ''}>Lancar</option>
            <option value="Kurang Lancar" ${row.status === 'Kurang Lancar' ? 'selected' : ''}>Kurang Lancar</option>
          </select>
          <div class="laporan-print-text">${row.status || 'Lancar'}</div>
        </td>
        <td style="min-width: 320px;">
          <input type="text" class="search-input" style="width:100%; min-width:300px; font-size:0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);" placeholder="Masukkan keterangan keuangan (opsional)..." value="${row.keterangan || ''}" oninput="updateKeuanganKeterangan(${idx}, this.value)" onchange="updateKeuanganKeterangan(${idx}, this.value)">
          <div class="laporan-print-text">${row.keterangan || '-'}</div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Tabel 4: KEGIATAN LAINNYA
 * 3 Baris: 1. Latihan ASAD 2. Perawatan Dhuafa 3. Perawatan Jamaah Sakit
 * Kolom Status (Dropdown) & Keterangan (Text Box Lebar)
 */
function renderKegiatanLainnyaCards(data) {
  const container = document.getElementById("laporan-kegiatan-lain-tbody");
  if (!container) return;

  let html = "";
  data.forEach((row, idx) => {
    html += `
      <tr>
        <td style="font-weight: 600; min-width: 240px;">&bull; ${row.nama}</td>
        <td style="width: 160px;">
          <select class="select-filter" style="width: 100%; font-size: 0.85rem; font-weight: 600; padding: 6px 10px;" onchange="updateKegiatanLainStatus(${idx}, this.value)">
            <option value="Lancar" ${row.status === 'Lancar' ? 'selected' : ''}>Lancar</option>
            <option value="Kurang Lancar" ${row.status === 'Kurang Lancar' ? 'selected' : ''}>Kurang Lancar</option>
          </select>
          <div class="laporan-print-text">${row.status || 'Lancar'}</div>
        </td>
        <td style="min-width: 320px;">
          <input type="text" class="search-input" style="width:100%; min-width:300px; font-size:0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);" placeholder="Masukkan keterangan kegiatan (opsional)..." value="${row.keterangan || ''}" oninput="updateKegiatanLainKeterangan(${idx}, this.value)" onchange="updateKegiatanLainKeterangan(${idx}, this.value)">
          <div class="laporan-print-text">${row.keterangan || '-'}</div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Card: LAPORAN TAMBAHAN (Sama Metode dengan Usul & Saran)
 */
function renderLaporanTambahanCards(items) {
  const container = document.getElementById("laporan-tambahan-container");
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border-color); border-radius:8px; margin-bottom:10px;">Belum ada laporan tambahan. Klik "+ Tambah Laporan Tambahan" untuk menambah.</div>`;
    return;
  }

  let html = "";
  items.forEach((item, idx) => {
    const textVal = typeof item === 'string' ? item : (item.isi || item.deskripsi || item.judul || '');
    html += `
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
        <span style="font-weight: 700; color: var(--primary); background: rgba(16, 185, 129, 0.15); min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem;">${idx + 1}</span>
        <input type="text" class="search-input" style="flex: 1; font-size: 0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);" placeholder="Ketik laporan tambahan..." value="${textVal}" oninput="updateLaporanTambahanText(${idx}, this.value)" onchange="updateLaporanTambahanText(${idx}, this.value)">
        <div class="laporan-print-text">${textVal || '-'}</div>
        <button type="button" style="background:none; border:none; color:#ef4444; font-size:0.9rem; cursor:pointer; padding: 4px 8px;" onclick="deleteLaporanTambahanItem(${idx})"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Card: PERMASALAHAN (Sama Metode dengan Usul & Saran)
 */
function renderCatatanPermasalahanCards(items) {
  const container = document.getElementById("laporan-permasalahan-container");
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.85rem; border:1px dashed rgba(245,158,11,0.3); border-radius:8px; margin-bottom:10px;">Belum ada catatan permasalahan. Klik "+ Tambah Catatan Permasalahan" untuk menambah.</div>`;
    return;
  }

  let html = "";
  items.forEach((item, idx) => {
    const textVal = typeof item === 'string' ? item : (item.isi || item.deskripsi || item.isi_usulan || '');
    html += `
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: rgba(245, 158, 11, 0.05); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.3);">
        <span style="font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.15); min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem;">${idx + 1}</span>
        <input type="text" class="search-input" style="flex: 1; font-size: 0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; color: var(--text-primary);" placeholder="Ketik catatan permasalahan / isu..." value="${textVal}" oninput="updatePermasalahanText(${idx}, this.value)" onchange="updatePermasalahanText(${idx}, this.value)">
        <div class="laporan-print-text">${textVal || '-'}</div>
        <button type="button" style="background:none; border:none; color:#ef4444; font-size:0.9rem; cursor:pointer; padding: 4px 8px;" onclick="deletePermasalahanItem(${idx})"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Card: USUL & SARAN
 */
function renderUsulSaranList(items) {
  const container = document.getElementById("laporan-usul-saran-container");
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border-color); border-radius:8px; margin-bottom:10px;">Belum ada rekomendasi usul & saran. Klik "+ Tambah Usul & Saran" untuk menambah.</div>`;
    return;
  }

  let html = "";
  items.forEach((item, idx) => {
    const textVal = typeof item === 'string' ? item : (item.isi_usulan || item.isi || item.deskripsi || '');
    html += `
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
        <span style="font-weight: 700; color: var(--primary); background: rgba(16, 185, 129, 0.15); min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem;">${idx + 1}</span>
        <input type="text" class="search-input" style="flex: 1; font-size: 0.88rem; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);" placeholder="Ketik rekomendasi usulan / saran..." value="${textVal}" oninput="updateUsulSaranText(${idx}, this.value)" onchange="updateUsulSaranText(${idx}, this.value)">
        <div class="laporan-print-text">${textVal || '-'}</div>
        <button type="button" style="background:none; border:none; color:#ef4444; font-size:0.9rem; cursor:pointer; padding: 4px 8px;" onclick="deleteUsulSaranItem(${idx})"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Card: DIBUAT & DISAHKAN DI
 */
function renderSignatureBox(data) {
  const tglTerbitEl = document.getElementById("laporan-sign-date-text");
  const stampHashEl = document.getElementById("laporan-sign-stamp-hash");
  const signNamaEl = document.getElementById("laporan-sign-nama");
  const signJabatanEl = document.getElementById("laporan-sign-jabatan");

  if (tglTerbitEl) {
    tglTerbitEl.textContent = `Bekasi, ${formatIndonesianDate(data.tanggal_musyawarah || data.tanggal_terbit)}`;
  }
  if (stampHashEl) {
    stampHashEl.textContent = `DIGITALLY SIGNED HASH: ${data.digital_signature_hash || 'AJI-2026-CH'}`;
  }
  if (signNamaEl) {
    signNamaEl.textContent = data.penanggung_jawab_nama || "TRI WAHYU W";
  }
  if (signJabatanEl) {
    signJabatanEl.textContent = data.penanggung_jawab_jabatan || `Ketua / Pengurus Kelompok ${data.kelompok}`;
  }
}

/**
 * Handlers Update Field Values (Global Window Bindings)
 */
window.updateMusyawarahKeterangan = function(idx, val) {
  if (window.laporanBulananState.currentData && window.laporanBulananState.currentData.musyawarah_data[idx]) {
    window.laporanBulananState.currentData.musyawarah_data[idx].keterangan = val;
  }
};

window.updatePengajianCatatan = function(idx, val) {
  if (window.laporanBulananState.currentData && window.laporanBulananState.currentData.pengajian_evaluasi[idx]) {
    window.laporanBulananState.currentData.pengajian_evaluasi[idx].catatan = val;
  }
};

window.updateKeuanganStatus = function(idx, val) {
  if (window.laporanBulananState.currentData && window.laporanBulananState.currentData.keuangan_data[idx]) {
    window.laporanBulananState.currentData.keuangan_data[idx].status = val;
  }
};

window.updateKeuanganKeterangan = function(idx, val) {
  if (window.laporanBulananState.currentData && window.laporanBulananState.currentData.keuangan_data[idx]) {
    window.laporanBulananState.currentData.keuangan_data[idx].keterangan = val;
  }
};

window.updateKegiatanLainStatus = function(idx, val) {
  if (window.laporanBulananState.currentData && window.laporanBulananState.currentData.kegiatan_lainnya[idx]) {
    window.laporanBulananState.currentData.kegiatan_lainnya[idx].status = val;
  }
};

window.updateKegiatanLainKeterangan = function(idx, val) {
  if (window.laporanBulananState.currentData && window.laporanBulananState.currentData.kegiatan_lainnya[idx]) {
    window.laporanBulananState.currentData.kegiatan_lainnya[idx].keterangan = val;
  }
};

/**
 * Dynamic Item Operations (Global Window Bindings)
 */
window.addLaporanTambahanItem = function() {
  if (!window.laporanBulananState.currentData.laporan_tambahan) {
    window.laporanBulananState.currentData.laporan_tambahan = [];
  }
  window.laporanBulananState.currentData.laporan_tambahan.push({ isi: "" });
  renderLaporanTambahanCards(window.laporanBulananState.currentData.laporan_tambahan);
};

window.updateLaporanTambahanText = function(idx, val) {
  if (window.laporanBulananState.currentData.laporan_tambahan[idx]) {
    if (typeof window.laporanBulananState.currentData.laporan_tambahan[idx] === 'object') {
      window.laporanBulananState.currentData.laporan_tambahan[idx].isi = val;
    } else {
      window.laporanBulananState.currentData.laporan_tambahan[idx] = val;
    }
  }
};

window.deleteLaporanTambahanItem = function(idx) {
  window.laporanBulananState.currentData.laporan_tambahan.splice(idx, 1);
  renderLaporanTambahanCards(window.laporanBulananState.currentData.laporan_tambahan);
};

window.addCatatanPermasalahanItem = function() {
  if (!window.laporanBulananState.currentData.catatan_permasalahan) {
    window.laporanBulananState.currentData.catatan_permasalahan = [];
  }
  window.laporanBulananState.currentData.catatan_permasalahan.push({ isi: "" });
  renderCatatanPermasalahanCards(window.laporanBulananState.currentData.catatan_permasalahan);
};

window.updatePermasalahanText = function(idx, val) {
  if (window.laporanBulananState.currentData.catatan_permasalahan[idx]) {
    if (typeof window.laporanBulananState.currentData.catatan_permasalahan[idx] === 'object') {
      window.laporanBulananState.currentData.catatan_permasalahan[idx].isi = val;
    } else {
      window.laporanBulananState.currentData.catatan_permasalahan[idx] = val;
    }
  }
};

window.deletePermasalahanItem = function(idx) {
  window.laporanBulananState.currentData.catatan_permasalahan.splice(idx, 1);
  renderCatatanPermasalahanCards(window.laporanBulananState.currentData.catatan_permasalahan);
};

window.addUsulSaranItem = function() {
  if (!window.laporanBulananState.currentData.usul_saran) {
    window.laporanBulananState.currentData.usul_saran = [];
  }
  window.laporanBulananState.currentData.usul_saran.push({ isi_usulan: "" });
  renderUsulSaranList(window.laporanBulananState.currentData.usul_saran);
};

window.updateUsulSaranText = function(idx, val) {
  if (window.laporanBulananState.currentData.usul_saran[idx]) {
    if (typeof window.laporanBulananState.currentData.usul_saran[idx] === 'object') {
      window.laporanBulananState.currentData.usul_saran[idx].isi_usulan = val;
    } else {
      window.laporanBulananState.currentData.usul_saran[idx] = val;
    }
  }
};

window.deleteUsulSaranItem = function(idx) {
  window.laporanBulananState.currentData.usul_saran.splice(idx, 1);
  renderUsulSaranList(window.laporanBulananState.currentData.usul_saran);
};

/**
 * Toggle Mode Edit Laporan (Global Window Binding)
 */
window.toggleModeEditLaporan = function() {
  window.laporanBulananState.isModeEdit = !window.laporanBulananState.isModeEdit;
  const isEdit = window.laporanBulananState.isModeEdit;
  
  const labelEl = document.getElementById("mode-edit-label");
  const btnEl = document.getElementById("btn-toggle-mode-edit");
  const saveBar = document.getElementById("laporan-save-bar-box");

  if (labelEl) labelEl.textContent = isEdit ? "Aktif" : "Mati";
  if (btnEl) {
    btnEl.style.background = isEdit ? "var(--primary)" : "rgba(255,255,255,0.08)";
    btnEl.style.color = isEdit ? "#ffffff" : "var(--text-primary)";
  }
  if (saveBar) {
    saveBar.style.display = isEdit ? "flex" : "none";
  }

  // Toggle input disabled states
  document.querySelectorAll("#subtab-report-laporan-bulanan input, #subtab-report-laporan-bulanan select").forEach(el => {
    if (el.id !== "laporan-filter-kelompok" && el.id !== "laporan-filter-bulan" && el.id !== "laporan-filter-tahun" && el.id !== "laporan-filter-tingkatan" && el.id !== "laporan-filter-tgl-musyawarah") {
      el.disabled = !isEdit;
    }
  });

  if (typeof showToast === 'function') {
    showToast(`Mode Edit Laporan Bulanan: ${isEdit ? 'AKTIF' : 'NON-AKTIF'}`);
  }
};

/**
 * Sinkronisasi Seluruh Value dari DOM Input ke State sebelum Penyimpanan / Pencetakan
 */
function syncDOMInputsToState() {
  if (!window.laporanBulananState || !window.laporanBulananState.currentData) return;
  const data = window.laporanBulananState.currentData;

  const updatePrintText = (containerEl, val) => {
    if (!containerEl) return;
    const printDiv = containerEl.querySelector(".laporan-print-text");
    if (printDiv) {
      printDiv.textContent = val || "-";
    }
  };

  // 1. Musyawarah Keterangan
  const musyTrs = document.querySelectorAll("#laporan-musyawarah-tbody tr");
  musyTrs.forEach((tr, idx) => {
    const input = tr.querySelector("input");
    if (input && data.musyawarah_data && data.musyawarah_data[idx]) {
      data.musyawarah_data[idx].keterangan = input.value;
      updatePrintText(tr, input.value);
    }
  });

  // 2. Pengajian Evaluasi Catatan
  const pengTrs = document.querySelectorAll("#laporan-pengajian-tbody tr");
  pengTrs.forEach((tr, idx) => {
    const input = tr.querySelector("input");
    if (input && data.pengajian_evaluasi && data.pengajian_evaluasi[idx]) {
      data.pengajian_evaluasi[idx].catatan = input.value;
      updatePrintText(tr, input.value);
    }
  });

  // 3. Keuangan Kelompok
  const keuTrs = document.querySelectorAll("#laporan-keuangan-tbody tr");
  keuTrs.forEach((tr, idx) => {
    const select = tr.querySelector("select");
    const input = tr.querySelector("input");
    if (data.keuangan_data && data.keuangan_data[idx]) {
      if (select) {
        data.keuangan_data[idx].status = select.value;
        updatePrintText(select.parentElement, select.value);
      }
      if (input) {
        data.keuangan_data[idx].keterangan = input.value;
        updatePrintText(input.parentElement, input.value);
      }
    }
  });

  // 4. Kegiatan Lainnya
  const kegTrs = document.querySelectorAll("#laporan-kegiatan-lain-tbody tr");
  kegTrs.forEach((tr, idx) => {
    const select = tr.querySelector("select");
    const input = tr.querySelector("input");
    if (data.kegiatan_lainnya && data.kegiatan_lainnya[idx]) {
      if (select) {
        data.kegiatan_lainnya[idx].status = select.value;
        updatePrintText(select.parentElement, select.value);
      }
      if (input) {
        data.kegiatan_lainnya[idx].keterangan = input.value;
        updatePrintText(input.parentElement, input.value);
      }
    }
  });

  // 5. Laporan Tambahan
  const tambDivs = document.querySelectorAll("#laporan-tambahan-container > div");
  const tambArr = [];
  tambDivs.forEach((div) => {
    const inp = div.querySelector("input[type='text']");
    if (inp && inp.value.trim() !== "") {
      tambArr.push({ isi: inp.value });
      updatePrintText(div, inp.value);
    }
  });
  data.laporan_tambahan = tambArr;

  // 6. Catatan Permasalahan
  const permDivs = document.querySelectorAll("#laporan-permasalahan-container > div");
  const permArr = [];
  permDivs.forEach((div) => {
    const inp = div.querySelector("input[type='text']");
    if (inp && inp.value.trim() !== "") {
      permArr.push({ isi: inp.value });
      updatePrintText(div, inp.value);
    }
  });
  data.catatan_permasalahan = permArr;

  // 7. Usul & Saran
  const usulDivs = document.querySelectorAll("#laporan-usul-saran-container > div");
  const usulArr = [];
  usulDivs.forEach((div) => {
    const inp = div.querySelector("input[type='text']");
    if (inp && inp.value.trim() !== "") {
      usulArr.push({ isi_usulan: inp.value });
      updatePrintText(div, inp.value);
    }
  });
  data.usul_saran = usulArr;
}

/**
 * Menyimpan Laporan Bulanan ke Database Supabase & LocalStorage (Global Window Binding)
 */
window.saveLaporanBulananToDB = async function() {
  syncDOMInputsToState();

  const data = window.laporanBulananState.currentData;
  if (!data) return;

  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  const syncBadge = document.getElementById("laporan-sync-badge");
  if (syncBadge) {
    syncBadge.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
    syncBadge.className = "badge badge-warning";
  }

  const payload = {
    kelompok: data.kelompok,
    periode_bulan: data.periode_bulan,
    periode_tahun: data.periode_tahun,
    tingkatan_musyawarah: data.tingkatan_musyawarah || 'Desa',
    tanggal_musyawarah: data.tanggal_musyawarah || new Date().toISOString().split('T')[0],
    tanggal_terbit: new Date().toISOString().split('T')[0],
    
    musyawarah_data: data.musyawarah_data || [],
    pengajian_evaluasi: data.pengajian_evaluasi || [],
    keuangan_data: data.keuangan_data || [],
    keuangan_bendahara: data.keuangan_bendahara || 'Bendahara Desa',
    kegiatan_lainnya: data.kegiatan_lainnya || [],

    laporan_tambahan: data.laporan_tambahan || [],
    catatan_permasalahan: data.catatan_permasalahan || [],
    usul_saran: data.usul_saran || [],

    penanggung_jawab_nama: data.penanggung_jawab_nama || 'TRI WAHYU W',
    penanggung_jawab_jabatan: data.penanggung_jawab_jabatan || `Ketua / Pengurus Kelompok ${data.kelompok}`,
    digital_signature_hash: data.digital_signature_hash || `AJI-${data.periode_tahun}-${data.kelompok.toUpperCase().substring(0,3)}`
  };

  if (currentUser && currentUser.username) {
    payload.created_by = currentUser.username;
  }

  let isSuccess = false;

  if (typeof useSupabase !== 'undefined' && useSupabase && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('laporan_bulanan')
        .upsert(payload, { onConflict: 'kelompok,periode_bulan,periode_tahun' });

      if (!error) {
        isSuccess = true;
      } else {
        console.error("Error upsert laporan_bulanan Supabase:", error);
      }
    } catch (err) {
      console.error("Exception save Supabase:", err);
    }
  }

  // Backup to LocalStorage
  try {
    const localKey = `laporan_bulanan_${data.kelompok}_${data.periode_bulan}_${data.periode_tahun}`;
    localStorage.setItem(localKey, JSON.stringify(payload));
    isSuccess = true;
  } catch(e) {
    console.warn("LocalStorage save error:", e);
  }

  if (syncBadge) {
    syncBadge.innerHTML = `<i class="fa-solid fa-check"></i> Data Tersimpan (${new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})})`;
    syncBadge.className = "badge badge-success";
  }

  if (typeof showToast === 'function') {
    showToast("Data Laporan Bulanan berhasil disimpan!");
  } else {
    alert("Data Laporan Bulanan berhasil disimpan!");
  }
};

/**
 * Cetak / Ekspor PDF Laporan Bulanan (Global Window Binding)
 */
window.printLaporanBulananPDF = function() {
  if (typeof syncDOMInputsToState === 'function') {
    syncDOMInputsToState();
  }
  window.print();
};

/**
 * Ekspor Data Laporan Bulanan ke File Excel / Spreadsheet (Global Window Binding)
 */
window.exportLaporanBulananExcel = function() {
  if (typeof syncDOMInputsToState === 'function') {
    syncDOMInputsToState();
  }
  const data = (window.laporanBulananState && window.laporanBulananState.currentData) 
    ? window.laporanBulananState.currentData 
    : {};

  const kelompok = data.kelompok || 'Kelompok';
  const bulanName = typeof getIndonesianMonthName === 'function' ? getIndonesianMonthName(data.periode_bulan) : (data.periode_bulan || '');
  const tahun = data.periode_tahun || new Date().getFullYear();

  let excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Laporan Bulanan</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; margin-bottom: 20px; }
        th { background-color: #10b981; color: white; border: 1px solid #cccccc; padding: 8px; text-align: left; font-weight: bold; }
        td { border: 1px solid #cccccc; padding: 8px; font-size: 13px; }
        h2 { color: #047857; margin-bottom: 4px; }
        h3 { color: #065f46; margin-top: 15px; margin-bottom: 6px; border-bottom: 2px solid #10b981; padding-bottom: 4px; }
      </style>
    </head>
    <body>
      <h2>LAPORAN KEGIATAN BULANAN - YAYASAN ASSALAM BAROKAH JAMIUL HUDA</h2>
      <p><b>Kelompok:</b> ${kelompok} | <b>Periode:</b> ${bulanName} ${tahun} | <b>Tingkatan:</b> ${data.tingkatan_musyawarah || 'Kelompok/Desa'}</p>
      <br/>

      <h3>1. TABEL MUSYAWARAH</h3>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Uraian Kegiatan</th>
            <th>Status</th>
            <th>Kehadiran (%)</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
  `;

  (data.musyawarah_data || []).forEach((row, i) => {
    excelContent += `
      <tr>
        <td>${i + 1}</td>
        <td>${row.uraian || ''}</td>
        <td>${row.status || ''}</td>
        <td>${row.kehadiran_pct || 0}%</td>
        <td>${row.keterangan || ''}</td>
      </tr>
    `;
  });

  excelContent += `
        </tbody>
      </table>

      <h3>2. EVALUASI SAMBUNG PENGAJIAN</h3>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Tingkat Pengajian</th>
            <th>Status</th>
            <th>Kehadiran (%)</th>
            <th>Catatan Evaluasi</th>
          </tr>
        </thead>
        <tbody>
  `;

  (data.pengajian_evaluasi || []).forEach((row, i) => {
    excelContent += `
      <tr>
        <td>${i + 1}</td>
        <td>${row.tingkat || ''}</td>
        <td>${row.status || ''}</td>
        <td>${row.kehadiran_pct || 0}%</td>
        <td>${row.catatan || ''}</td>
      </tr>
    `;
  });

  excelContent += `
        </tbody>
      </table>

      <h3>3. KEUANGAN KELOMPOK</h3>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Uraian Keuangan</th>
            <th>Status</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
  `;

  (data.keuangan_data || []).forEach((row, i) => {
    excelContent += `
      <tr>
        <td>${i + 1}</td>
        <td>${row.nama || ''}</td>
        <td>${row.status || ''}</td>
        <td>${row.keterangan || ''}</td>
      </tr>
    `;
  });

  excelContent += `
        </tbody>
      </table>

      <h3>4. KEGIATAN LAINNYA</h3>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Kegiatan</th>
            <th>Status</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
  `;

  (data.kegiatan_lainnya || []).forEach((row, i) => {
    excelContent += `
      <tr>
        <td>${i + 1}</td>
        <td>${row.nama || ''}</td>
        <td>${row.status || ''}</td>
        <td>${row.keterangan || ''}</td>
      </tr>
    `;
  });

  excelContent += `
        </tbody>
      </table>

      <h3>5. LAPORAN TAMBAHAN</h3>
      <table>
        <thead>
          <tr><th>No</th><th>Isi Laporan Tambahan</th></tr>
        </thead>
        <tbody>
  `;
  (data.laporan_tambahan || []).forEach((item, i) => {
    const textVal = typeof item === 'string' ? item : (item.isi || item.deskripsi || '');
    excelContent += `<tr><td>${i + 1}</td><td>${textVal}</td></tr>`;
  });

  excelContent += `
        </tbody>
      </table>

      <h3>6. CATATAN PERMASALAHAN</h3>
      <table>
        <thead>
          <tr><th>No</th><th>Isi Permasalahan / Isu</th></tr>
        </thead>
        <tbody>
  `;
  (data.catatan_permasalahan || []).forEach((item, i) => {
    const textVal = typeof item === 'string' ? item : (item.isi || item.deskripsi || '');
    excelContent += `<tr><td>${i + 1}</td><td>${textVal}</td></tr>`;
  });

  excelContent += `
        </tbody>
      </table>

      <h3>7. USUL & SARAN</h3>
      <table>
        <thead>
          <tr><th>No</th><th>Rekomendasi Usul & Saran</th></tr>
        </thead>
        <tbody>
  `;
  (data.usul_saran || []).forEach((item, i) => {
    const textVal = typeof item === 'string' ? item : (item.isi_usulan || item.isi || '');
    excelContent += `<tr><td>${i + 1}</td><td>${textVal}</td></tr>`;
  });

  excelContent += `
        </tbody>
      </table>

      <p><b>Penanggung Jawab:</b> ${data.penanggung_jawab_nama || 'TRI WAHYU W'} (${data.penanggung_jawab_jabatan || 'Ketua Kelompok'})</p>
      <p><b>Digital Hash:</b> ${data.digital_signature_hash || ''}</p>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Bulanan_${kelompok}_${bulanName}_${tahun}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
