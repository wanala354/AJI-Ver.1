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
  
  // Look for any integer digits in the decoded text (matches "25", "jadwal:25", etc)
  const match = decodedText.match(/\d+/);
  if (match) {
    const jadwalId = parseInt(match[0], 10);
    stopAbsenScanner();

    // Verify if schedule actually exists in database
    const allJadwal = typeof getJadwalPengajianList === "function" ? getJadwalPengajianList() : [];
    const sched = allJadwal.find(s => s && s.id === jadwalId);

    if (sched) {
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
      alert(`Jadwal pengajian dengan ID ${jadwalId} tidak ditemukan di database AJI.`);
      startAbsenScanner(); // Resume
    }
  } else {
    alert("Barcode tidak valid! Harap arahkan pada QR Code resmi jadwal pengajian.");
    startAbsenScanner(); // Resume
  }
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
