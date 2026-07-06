/* MOBILE BARCODE SCANNER & ABSENSI CONTROLLER (AJI MOBILE) */

let html5QrcodeScanner = null;

document.addEventListener("DOMContentLoaded", () => {
  initMobileAbsen();
});

function initMobileAbsen() {
  const isMobile = window.innerWidth <= 768 || typeof Capacitor !== "undefined";
  if (!isMobile) return;

  console.log("AJI Mobile Absen Controller Initialized");

  // Bind click events
  const startBtn = document.getElementById("btn-start-scan");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      startAbsenScanner();
    });
  }

  const stopBtn = document.getElementById("btn-stop-scan");
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stopAbsenScanner();
    });
  }

  // Hook switchTab to manage scanner state and load list
  const originalSwitchTabAbsen = window.switchTab;
  window.switchTab = function(sectionId) {
    // 1. Stop scanning if navigating away from Absensi tab
    if (sectionId !== "section-jamaah-absensi") {
      stopAbsenScanner();
    }
    
    // 2. Run original switch tab
    if (originalSwitchTabAbsen) originalSwitchTabAbsen(sectionId);
    
    // 3. Load today's list if entering Absensi tab
    if (sectionId === "section-jamaah-absensi") {
      loadTodaySchedulesForAbsen();
    }
  };

  // Setup periodic refresh hook if database is reloaded
  const originalRefreshActivePage = window.refreshActivePage;
  window.refreshActivePage = function() {
    if (originalRefreshActivePage) originalRefreshActivePage();
    
    // If the active page is Absensi, refresh its list
    const absSection = document.getElementById("section-jamaah-absensi");
    if (absSection && absSection.classList.contains("active")) {
      loadTodaySchedulesForAbsen();
    }
  };
}

/**
 * Start the HTML5 Barcode/QR camera scanner
 */
async function startAbsenScanner() {
  const statusEl = document.getElementById("scanner-status");
  const stopBtn = document.getElementById("btn-stop-scan");
  const startBtn = document.getElementById("btn-start-scan");
  const frameWrapper = document.getElementById("scanner-frame-wrapper");

  if (!statusEl || !stopBtn || !startBtn || !frameWrapper) return;

  statusEl.style.display = "block";
  statusEl.style.color = "var(--text-secondary, #94a3b8)";
  statusEl.textContent = "Mengakses kamera...";

  try {
    frameWrapper.style.display = "block";
    
    if (!html5QrcodeScanner) {
      html5QrcodeScanner = new Html5Qrcode("qr-reader");
    }

    startBtn.style.display = "none";
    stopBtn.style.display = "inline-flex";

    await html5QrcodeScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        }
      },
      (decodedText) => {
        handleScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Quiet mode (ignoring no barcode in camera frame)
      }
    );

    statusEl.textContent = "Mencari barcode / QR code pengajian...";
    statusEl.style.color = "var(--primary, #10b981)";

  } catch (err) {
    console.error("Camera access error:", err);
    statusEl.textContent = "Gagal mengakses kamera: " + (err.message || "Izin ditolak");
    statusEl.style.color = "#ef4444";
    frameWrapper.style.display = "none";
    startBtn.style.display = "inline-flex";
    stopBtn.style.display = "none";
  }
}

/**
 * Stop the camera scanner and clean up resources
 */
async function stopAbsenScanner() {
  const statusEl = document.getElementById("scanner-status");
  const stopBtn = document.getElementById("btn-stop-scan");
  const startBtn = document.getElementById("btn-start-scan");
  const frameWrapper = document.getElementById("scanner-frame-wrapper");

  if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
    try {
      await html5QrcodeScanner.stop();
      console.log("Absen scanner stopped.");
    } catch (err) {
      console.warn("Failed to stop scanner cleanly:", err);
    }
  }

  if (statusEl) statusEl.style.display = "none";
  if (stopBtn) stopBtn.style.display = "none";
  if (startBtn) startBtn.style.display = "inline-flex";
  if (frameWrapper) frameWrapper.style.display = "none";
}

/**
 * Handle successful QR/Barcode decoding
 */
function handleScanSuccess(decodedText) {
  console.log("QR decoded text:", decodedText);
  const rawValue = decodedText.trim();
  
  if (rawValue === "AJI_PRESENSI_UMUM" || rawValue === "AJI_PRESENSI:UMUM:UMUM") {
    handleGeneralScan();
    return;
  }

  if (rawValue.startsWith("AJI_PRESENSI:")) {
    const parts = rawValue.split(":");
    if (parts.length >= 3) {
      const tingkat = parts[1].trim();
      const jenis = parts[2].trim();
      handleOldFormatScan(tingkat, jenis);
      return;
    }
  }

  // Look for any integer digits in the decoded text (matches "25", "jadwal:25", etc)
  const match = rawValue.match(/\d+/);
  if (match) {
    const jadwalId = parseInt(match[0], 10);
    stopAbsenScanner();

    // Verify if schedule actually exists in database
    const allJadwal = typeof getJadwalPengajianList === "function" ? getJadwalPengajianList() : [];
    const sched = allJadwal.find(s => s && s.id === jadwalId);

    if (sched) {
      const confirmMsg = `Isi Presensi pada Kegiatan ${sched.jenis_pengajian} (${sched.tingkat_pengajian || 'Umum'})?`;
      if (confirm(confirmMsg)) {
        const statusEl = document.getElementById("scanner-status");
        if (statusEl) {
          statusEl.style.display = "block";
          statusEl.style.color = "var(--primary, #10b981)";
          statusEl.textContent = `Barcode Valid: ${sched.jenis_pengajian}! Mengirim presensi...`;
        }
        
        // Execute self check-in
        if (typeof window.doSelfCheckIn === "function") {
          window.doSelfCheckIn(jadwalId, 'Hadir Fisik', 'Presensi via Scan Barcode');
        } else {
          alert("Fungsi presensi mandiri tidak tersedia.");
        }
      } else {
        startAbsenScanner(); // Resume
      }
    } else {
      alert(`Jadwal pengajian dengan ID ${jadwalId} tidak ditemukan di database AJI.`);
      startAbsenScanner(); // Resume
    }
  } else {
    alert("Barcode tidak valid! Harap arahkan pada QR Code resmi jadwal pengajian.");
    startAbsenScanner(); // Resume
  }
}

function handleOldFormatScan(tingkat, jenis) {
  stopAbsenScanner();
  
  const jamaahId = typeof localCurrentJamaahId !== "undefined" ? localCurrentJamaahId : null;
  if (!jamaahId) {
    alert("Silakan login terlebih dahulu untuk melakukan presensi.");
    startAbsenScanner();
    return;
  }

  const jamaahList = typeof getJamaahList === "function" ? getJamaahList() : [];
  const jamaah = jamaahList.find(j => j.id === jamaahId);
  if (!jamaah) {
    alert("Gagal memuat profil Jamaah.");
    startAbsenScanner();
    return;
  }

  const allJadwal = typeof getJadwalPengajianList === "function" ? getJadwalPengajianList() : [];
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  
  const scanTingkatClean = tingkat.toLowerCase().replace("tingkat", "").replace(" ", "").trim();
  const scanJenisClean = jenis.toLowerCase().replace(" ", "").trim();

  const match = allJadwal.find(s => {
    if (!s) return false;
    const isToday = s.tanggal === todayStr;

    const dbTingkatClean = (s.tingkat_pengajian || "").toLowerCase().replace("tingkat", "").replace(" ", "").trim();
    const isTingkatMatch = dbTingkatClean === scanTingkatClean || dbTingkatClean.includes(scanTingkatClean) || scanTingkatClean.includes(dbTingkatClean);

    const dbJenisClean = (s.jenis_pengajian || "").toLowerCase().replace(" ", "").trim();
    const isJenisMatch = dbJenisClean === scanJenisClean || dbJenisClean.includes(scanJenisClean) || scanJenisClean.includes(dbJenisClean);

    const isKelompokValid = (scanTingkatClean === "kelompok")
      ? (s.kelompok_pengajian || "").toLowerCase() === (jamaah.kelompokPengajian || "").toLowerCase()
      : true;

    return isToday && isTingkatMatch && isJenisMatch && isKelompokValid;
  });

  if (match) {
    const confirmMsg = `Isi Presensi pada Kegiatan ${match.jenis_pengajian} (${match.tingkat_pengajian || 'Umum'})?`;
    if (confirm(confirmMsg)) {
      const statusEl = document.getElementById("scanner-status");
      if (statusEl) {
        statusEl.style.display = "block";
        statusEl.style.color = "var(--primary, #10b981)";
        statusEl.textContent = `Barcode Valid: ${match.jenis_pengajian}! Mengirim presensi...`;
      }
      
      if (typeof window.doSelfCheckIn === "function") {
        window.doSelfCheckIn(match.id, 'Hadir Fisik', 'Presensi via Scan QR Dinding');
      } else {
        alert("Fungsi presensi mandiri tidak tersedia.");
      }
    } else {
      startAbsenScanner();
    }
  } else {
    alert(`Tidak ada jadwal aktif pengajian ${tingkat} - ${jenis} hari ini.`);
    startAbsenScanner();
  }
}

function getCurrentJakartaTime() {
  const options = { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
  const timeParts = new Intl.DateTimeFormat("en-US", options).format(new Date()).split(":");
  return `${timeParts[0]}:${timeParts[1]}:00`;
}

function isTimeInsideWindow(current, start, end) {
  const toSeconds = (tStr) => {
    if (!tStr) return 0;
    const parts = tStr.split(":").map(Number);
    return parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  };
  
  const curSec = toSeconds(current);
  const startSec = toSeconds(start || "20:00:00");
  const endSec = toSeconds(end || "21:30:00");
  
  return curSec >= startSec && curSec <= endSec;
}

function handleGeneralScan() {
  stopAbsenScanner();
  
  const jamaahId = typeof localCurrentJamaahId !== "undefined" ? localCurrentJamaahId : null;
  if (!jamaahId) {
    alert("Silakan login terlebih dahulu untuk melakukan presensi.");
    startAbsenScanner();
    return;
  }

  const jamaahList = typeof getJamaahList === "function" ? getJamaahList() : [];
  const jamaah = jamaahList.find(j => j.id === jamaahId);
  if (!jamaah) {
    alert("Gagal memuat profil Jamaah.");
    startAbsenScanner();
    return;
  }

  const allJadwal = typeof getJadwalPengajianList === "function" ? getJadwalPengajianList() : [];
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  
  // Filter schedules that are today AND where the jamaah is eligible
  const eligibleToday = allJadwal.filter(s => {
    if (!s) return false;
    const isToday = s.tanggal === todayStr;
    const isEligible = typeof window.isJamaahEligibleForSchedule === "function" 
      ? window.isJamaahEligibleForSchedule(jamaah, s) 
      : false;
    return isToday && isEligible;
  });

  if (eligibleToday.length === 0) {
    alert("Tidak ada jadwal pengajian aktif untuk Anda hari ini.");
    startAbsenScanner();
    return;
  }

  // Filter which ones are currently open based on time
  const currentTime = getCurrentJakartaTime();
  const activeSchedules = eligibleToday.filter(s => {
    return isTimeInsideWindow(currentTime, s.waktu_mulai, s.waktu_selesai);
  });

  if (activeSchedules.length === 0) {
    alert("Presensi belum dibuka atau sudah ditutup untuk jadwal pengajian hari ini.");
    startAbsenScanner();
    return;
  }

  if (activeSchedules.length === 1) {
    const sched = activeSchedules[0];
    const confirmMsg = `Isi Presensi pada Kegiatan ${sched.jenis_pengajian} (${sched.tingkat_pengajian || 'Umum'})?`;
    if (confirm(confirmMsg)) {
      const statusEl = document.getElementById("scanner-status");
      if (statusEl) {
        statusEl.style.display = "block";
        statusEl.style.color = "var(--primary, #10b981)";
        statusEl.textContent = `Barcode Valid: ${sched.jenis_pengajian}! Mengirim presensi...`;
      }
      
      if (typeof window.doSelfCheckIn === "function") {
        window.doSelfCheckIn(sched.id, 'Hadir Fisik', 'Presensi via Scan Barcode Umum');
      } else {
        alert("Fungsi presensi mandiri tidak tersedia.");
      }
    } else {
      startAbsenScanner();
    }
  } else {
    // Show selection modal
    showScheduleSelectionPrompt(activeSchedules, (selectedId) => {
      const sched = activeSchedules.find(s => s.id === selectedId);
      if (sched) {
        const confirmMsg = `Isi Presensi pada Kegiatan ${sched.jenis_pengajian} (${sched.tingkat_pengajian || 'Umum'})?`;
        if (confirm(confirmMsg)) {
          const statusEl = document.getElementById("scanner-status");
          if (statusEl) {
            statusEl.style.display = "block";
            statusEl.style.color = "var(--primary, #10b981)";
            statusEl.textContent = `Barcode Valid: ${sched.jenis_pengajian}! Mengirim presensi...`;
          }
          if (typeof window.doSelfCheckIn === "function") {
            window.doSelfCheckIn(sched.id, 'Hadir Fisik', 'Presensi via Scan Barcode Umum');
          }
        } else {
          startAbsenScanner();
        }
      }
    });
  }
}

function showScheduleSelectionPrompt(schedules, callback) {
  const modalId = "schedule-selection-modal";
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = modalId;
  modal.className = "modal-overlay active";
  modal.style.zIndex = "9999";
  
  const optionsHtml = schedules.map(s => `
    <button class="btn-primary" style="width: 100%; margin-bottom: 8px; justify-content: flex-start; text-align: left; padding: 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;" onclick="window.confirmScheduleSelection(${s.id})">
      <i class="fa-solid fa-graduation-cap"></i> 
      <span>${s.jenis_pengajian} (${s.tingkat_pengajian || 'Umum'})</span>
    </button>
  `).join("");

  modal.innerHTML = `
    <div class="modal-container" style="max-width: 360px; background: var(--bg-card, #1e293b); color: var(--text-primary, #f8fafc); border-radius: 12px; padding: 20px; border: 1px solid var(--border-color, #334155);">
      <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 1.1rem;"><i class="fa-solid fa-list-check"></i> Pilih Pengajian</h3>
        <button class="modal-close-btn" onclick="document.getElementById('${modalId}').remove(); if(typeof startAbsenScanner === 'function') startAbsenScanner();" style="background: transparent; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 0;">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Ditemukan beberapa pengajian aktif hari ini. Silakan pilih salah satu untuk presensi:</p>
        ${optionsHtml}
      </div>
      <div class="modal-footer" style="margin-top: 15px; display: flex; justify-content: flex-end; padding-top: 10px; border-top: 1px solid var(--border-color);">
        <button class="btn-secondary" onclick="document.getElementById('${modalId}').remove(); if(typeof startAbsenScanner === 'function') startAbsenScanner();">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  window.confirmScheduleSelection = function(id) {
    document.getElementById(modalId).remove();
    callback(id);
  };
}

/**
 * Render today's eligible sessions for manual backup check-in
 */
function loadTodaySchedulesForAbsen() {
  const listContainer = document.getElementById("portal-today-absen-list");
  if (!listContainer) return;

  const jamaahId = typeof localCurrentJamaahId !== "undefined" ? localCurrentJamaahId : null;
  if (!jamaahId) {
    listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-style: italic; padding: 15px 0;">Silakan login terlebih dahulu</div>';
    return;
  }

  const jamaahList = typeof getJamaahList === "function" ? getJamaahList() : [];
  const jamaah = jamaahList.find(j => j.id === jamaahId);
  if (!jamaah) {
    listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-style: italic; padding: 15px 0;">Gagal memuat profil Jamaah</div>';
    return;
  }

  const allJadwal = typeof getJadwalPengajianList === "function" ? getJadwalPengajianList() : [];
  const allPresensi = typeof getPresensiKehadiranList === "function" ? getPresensiKehadiranList() : [];

  // Get current date string in WIB (Asia/Jakarta) format: YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

  // Filter schedules that are today AND where the jamaah is eligible
  const todaySchedules = allJadwal.filter(s => {
    if (!s) return false;
    const isToday = s.tanggal === todayStr;
    const isEligible = typeof window.isJamaahEligibleForSchedule === "function" 
      ? window.isJamaahEligibleForSchedule(jamaah, s) 
      : false;
    return isToday && isEligible;
  });

  if (todaySchedules.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-style: italic; padding: 25px 0;">
        Tidak ada jadwal pengajian untuk Anda hari ini (${typeof formatDateIndo === "function" ? formatDateIndo(todayStr) : todayStr})
      </div>
    `;
    return;
  }

  let html = "";
  todaySchedules.forEach(sched => {
    // Check if user already checked in for this session
    const myPr = allPresensi.find(p => p && p.id_pengajian == sched.id && p.id_jamaah === jamaahId);
    const status = myPr ? myPr.status : "Belum Hadir";

    let badgeClass = "badge-danger";
    if (status === "Hadir Fisik" || status === "Hadir Online") {
      badgeClass = "badge-success";
    } else if (status === "Izin") {
      badgeClass = "badge-warning";
    }

    const timeStr = (sched.waktu_mulai || "").substring(0, 5) + " - " + (sched.waktu_selesai || "").substring(0, 5);

    html += `
      <div class="mobile-data-card fade-up-entry" style="margin-bottom: 10px;">
        <div class="mobile-data-card-header" style="border: none; padding-bottom: 0;">
          <div>
            <div class="mobile-data-card-title">${sched.jenis_pengajian}</div>
            <div class="mobile-data-card-subtitle" style="margin-top: 4px;"><i class="fa-solid fa-clock"></i> ${timeStr} WIB</div>
          </div>
          <span class="badge ${badgeClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
            ${status}
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin: 8px 0 4px 0; padding: 0 4px;">
          <i class="fa-solid fa-location-dot" style="margin-right: 4px; color: var(--primary);"></i> <strong>Tempat:</strong> ${sched.tempat_kegiatan_nama || 'Masjid/Kelompok'}
        </div>
    `;

    // Only show check-in buttons if status is not already present
    if (status === "Belum Hadir" || status === "Alpha") {
      html += `
        <div class="mobile-data-card-actions" style="margin-top: 10px; display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn-primary" onclick="window.doSelfCheckIn(${sched.id}, 'Hadir Fisik', 'Presensi Manual Portal');" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 0.75rem; border-radius: 6px;">
            <i class="fa-solid fa-user-check"></i> Hadir Fisik
          </button>
          <button class="btn-secondary" onclick="window.openPresensiModalPortal(${sched.id}, 'Online');" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 0.75rem; border: 1px solid var(--border-color); background: transparent; border-radius: 6px; color: var(--text-primary);">
            Online / Izin
          </button>
        </div>
      `;
    } else {
      html += `
        <div style="font-size: 0.75rem; color: var(--primary); text-align: right; margin-top: 8px; font-weight: 600; padding-right: 4px;">
          <i class="fa-solid fa-circle-check"></i> Anda sudah melakukan presensi
        </div>
      `;
    }

    html += `</div>`;
  });

  listContainer.innerHTML = html;
}
