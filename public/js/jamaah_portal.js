// JAMAAH PORTAL MODULE (v1.0)
// Dashboard pribadi jamaah: kehadiran, keluarga, jadwal & self check-in
// -----------------------------------------------------------------------

window.initJamaahPortal = function() {
  const user = getCurrentUser();
  if (!user || (user.role || '').toLowerCase() !== 'jamaah') return;
  localCurrentJamaahId = user.jamaah_id || null;

  document.querySelectorAll('.portal-menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
      try {
        e.preventDefault();
        document.querySelectorAll('.portal-menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        const target = this.getAttribute('data-target');
        document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById(target);
        if (sec) sec.classList.add('active');
        if (target === 'section-jamaah-dashboard') loadJamaahDashboard();
        else if (target === 'section-jamaah-keluarga') loadJamaahKeluarga();
        else if (target === 'section-jamaah-jadwal') {
          initPortalCalendarFilters();
          switchPortalJadwalTab('kalender');
        }
      } catch(err) {
        alert('MENU CLICK ERROR: ' + err.message + '\n' + err.stack);
      }
    });
  });
  try {
    initPortalCalendarFilters();
    loadJamaahDashboard();
  } catch(err) {
    alert('INITIAL DASHBOARD ERROR: ' + err.message + '\n' + err.stack);
  }
};

// // ============================================================
// 1. DASHBOARD
// ============================================================
window.loadJamaahDashboard = function() {
  try {
  const jamaahId = localCurrentJamaahId;
  if (!jamaahId) { _dashboardEmpty(); return; }
  const jamaah = getJamaahList().find(j => j.id === jamaahId);
  if (!jamaah) { _dashboardEmpty(); return; }

  const kelompok = jamaah.kelompokPengajian;
  const peramutan = _getPeramutan(jamaah);
  const allJadwal = getJadwalPengajianList();
  const allPresensi = getPresensiKehadiranList();

  const jadwalRelevant = allJadwal.filter(j => {
    if (!j) return false;
    
    // Kelompok check
    const tk = String(j.tingkat_pengajian || '').toLowerCase();
    const isKelompok = tk.includes('kelompok') || (!tk.includes('desa') && !tk.includes('daerah'));
    if (isKelompok && j.kelompok_pengajian !== kelompok) {
      return false;
    }
    
    // Participant specific rule
    if (j.peserta_spesifik) {
      const allowedIds = j.peserta_spesifik.split(",").map(id => id.trim()).filter(Boolean);
      if (allowedIds.length > 0) {
        return allowedIds.includes(jamaahId);
      }
    }
    
    // Gender restriction
    const jnsL = String(j.jenis_pengajian || '').toLowerCase();
    if (jnsL.includes('ibu-ibu') || jnsL.includes('kewanitaan') || jnsL.includes('perempuan')) {
      if (String(jamaah.jenisKelamin || '').toLowerCase() !== 'perempuan') return false;
    }
    if (jnsL.includes('bapak-bapak') || jnsL.includes('laki-laki') || jnsL.includes('pria')) {
      if (String(jamaah.jenisKelamin || '').toLowerCase() !== 'laki-laki') return false;
    }

    const jpList = (typeof localMasterJenisPengajian !== 'undefined' && localMasterJenisPengajian) ? localMasterJenisPengajian : [];
    const jpObj = jpList.find(x => typeof x === 'object' && x !== null ? x.nama === j.jenis_pengajian : x === j.jenis_pengajian);
    let targetPeserta = [];
    if (jpObj && typeof jpObj === 'object' && jpObj.peserta_pengajian) {
      targetPeserta = String(jpObj.peserta_pengajian).split(',').map(x => x.trim().toLowerCase());
    }
    return targetPeserta.length === 0 || targetPeserta.includes(peramutan.toLowerCase());
  });
  
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const now = new Date();
  const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
  
  const sudahLewat = jadwalRelevant.filter(j => {
    if (j.tanggal < todayStr) return true;
    if (j.tanggal === todayStr) {
      const endTime = j.waktu_selesai || "23:59";
      return timeNow >= endTime;
    }
    return false;
  });
  const totalSesi = sudahLewat.length;

  let hadir = 0, izin = 0;
  const rekapRows = [];
  sudahLewat.forEach(j => {
    if (!j) return;
    const pr = allPresensi.find(p => p && p.id_pengajian == j.id && p.id_jamaah === jamaahId);
    const status = pr ? pr.status : 'Alpha';
    if (status === 'Hadir Fisik' || status === 'Online') hadir++;
    else if (status === 'Izin') izin++;
    rekapRows.push({ tanggal: j.tanggal, jenis: j.jenis_pengajian, tingkat: j.tingkat_pengajian, waktu: j.waktu_mulai, status });
  });

  const pct = totalSesi > 0 ? Math.round((hadir / totalSesi) * 100) : 0;

  // Update nama header
  const _set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  _set('portal-jamaah-name', jamaah.namaLengkap);
  _set('portal-jamaah-kelompok', kelompok + ' · ' + peramutan);
  
  // Dynamic Dapuan disemua tingkat
  const myRoles = (getPengurusList() || []).filter(p => p.jamaah_id === jamaahId);
  const dapuanText = myRoles.length > 0
    ? 'Dapuan: ' + myRoles.map(p => `${p.dapuan} (${p.tingkat_pengurus})`).join(', ')
    : 'Dapuan: -';
  _set('portal-jamaah-dapuan', dapuanText);
  
  const av = document.getElementById('portal-jamaah-avatar');
  if (av) av.textContent = String(jamaah.namaLengkap || 'U').charAt(0).toUpperCase();

  // Gauge
  const gaugeCircle = document.getElementById('portal-gauge-circle');
  const gaugePct = document.getElementById('portal-gauge-pct');
  if (gaugeCircle && gaugePct) {
    const circ = 2 * Math.PI * 54;
    gaugeCircle.style.strokeDasharray = circ;
    gaugeCircle.style.strokeDashoffset = circ - (pct / 100) * circ;
    gaugeCircle.style.stroke = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    gaugePct.textContent = pct + '%';
  }

  _set('portal-kpi-hadir', hadir);
  _set('portal-kpi-izin', izin);
  _set('portal-kpi-alpha', totalSesi - hadir - izin);
  _set('portal-kpi-total', totalSesi);
  _set('portal-kpi-pct', pct + '%');

  const tbody = document.getElementById('portal-rekap-tbody');
  if (tbody) {
    if (rekapRows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Belum ada sesi pengajian yang tercatat.</td></tr>';
    } else {
      tbody.innerHTML = rekapRows.slice().reverse().map(r => {
        const isHadir = r.status === 'Hadir Fisik' || r.status === 'Online';
        const sc = isHadir ? 'badge-green' : r.status === 'Izin' ? 'badge-warning' : 'badge-danger';
        return '<tr><td>' + formatDateIndo(r.tanggal) + '</td><td>' + (r.tingkat || '-') + '</td><td>' + (r.jenis || '-') + '</td><td>' + ((r.waktu || '').substring(0,5)) + '</td><td><span class="badge ' + sc + '">' + r.status + '</span></td></tr>';
      }).join('');
    }
  }
  } catch (err) { alert('DASHBOARD ERROR:\n' + err.message + '\n' + err.stack); }
};

function _dashboardEmpty() {
  const tbody = document.getElementById('portal-rekap-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Data jamaah tidak ditemukan. Hubungi admin.</td></tr>';
}

function _getPeramutan(jamaah) {
  const age = typeof calculateAge === 'function' ? calculateAge(jamaah.tanggalLahir) : 0;
  return getKelompokPeramutan(age, jamaah.statusPernikahan, jamaah.tingkatPendidikan);
}

function _getMyFamily(jamaahId, jamaah) {
  const kkId = jamaah.statusHubunganKeluarga === 'Kepala Keluarga' ? jamaah.id : (jamaah.kepalaKeluargaId || null);
  const allJ = getJamaahList();
  if (!kkId) return [jamaah];
  return allJ.filter(j => j.id === kkId || j.kepalaKeluargaId === kkId);
}

// ============================================================
// 2. KELUARGA SAYA
// ============================================================
window.loadJamaahKeluarga = function() {
  try {
  const jamaahId = localCurrentJamaahId;
  if (!jamaahId) return;
  const myJamaah = getJamaahList().find(j => j.id === jamaahId);
  if (!myJamaah) return;
  const members = _getMyFamily(jamaahId, myJamaah);
  const tbody = document.getElementById('portal-family-tbody');
  if (!tbody) return;
  if (!members.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Tidak ada data anggota keluarga.</td></tr>'; return; }

  const allPr = getPresensiKehadiranList();
  const allJdwl = getJadwalPengajianList();
  tbody.innerHTML = members.map(m => {
    if (!m) return '';
    const age = typeof calculateAge === 'function' ? calculateAge(m.tanggalLahir) : '-';
    const per = _getPeramutan(m);
    const isKK = m.statusHubunganKeluarga === 'Kepala Keluarga';
    
    const jadwalM = allJdwl.filter(j => {
      if (!j) return false;
      if (j.kelompok_pengajian !== m.kelompokPengajian || new Date(j.tanggal) > new Date()) return false;
      
      const jnsL = String(j.jenis_pengajian || '').toLowerCase();
      if (jnsL.includes('ibu-ibu') || jnsL.includes('kewanitaan')) {
        if (String(m.jenisKelamin || '').toLowerCase() !== 'perempuan') return false;
      }

      const jpList = (typeof localMasterJenisPengajian !== 'undefined' && localMasterJenisPengajian) ? localMasterJenisPengajian : [];
      const jpObj = jpList.find(x => typeof x === 'object' && x !== null ? x.nama === j.jenis_pengajian : x === j.jenis_pengajian);
      let targetPeserta = [];
      if (jpObj && typeof jpObj === 'object' && jpObj.peserta_pengajian) targetPeserta = String(jpObj.peserta_pengajian).split(',').map(x => x.trim().toLowerCase());
      return targetPeserta.length === 0 || targetPeserta.includes(per.toLowerCase());
    });
    
    const hadirC = allPr.filter(p => p && p.id_jamaah === m.id && jadwalM.find(j => j && j.id == p.id_pengajian) && (p.status === 'Hadir Fisik' || p.status === 'Online')).length;
    const pc = jadwalM.length > 0 ? Math.round((hadirC / jadwalM.length) * 100) : 0;
    const canEdit = myJamaah.statusHubunganKeluarga === 'Kepala Keluarga' || m.id === myJamaah.id;
    const editBtn = canEdit ? '<button class="btn-icon edit" title="Edit" onclick="window.openJamaahModal(\'' + m.id + '\')"><i class="fa-solid fa-pen"></i></button>' : '';
    const viewBtn = '<button class="btn-icon view" title="Lihat Detail" onclick="window.openJamaahViewModal(\'' + m.id + '\')"><i class="fa-solid fa-eye"></i></button>';
    
    return '<tr><td>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">' + String(m.namaLengkap || '?').charAt(0).toUpperCase() + '</div>' +
      '<div><div style="font-weight:600;">' + (m.namaLengkap || 'Tanpa Nama') + '</div><div style="font-size:0.78rem;color:var(--text-muted);">' + m.id + '</div></div>' +
      '</div></td>' +
      '<td><span class="badge ' + (isKK ? 'badge-green' : 'badge-blue') + '">' + m.statusHubunganKeluarga + '</span></td>' +
      '<td>' + age + ' th</td>' +
      '<td>' + per + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + pc + '%;background:' + (pc >= 75 ? '#10b981' : pc >= 50 ? '#f59e0b' : '#ef4444') + ';border-radius:3px;"></div></div><span style="font-size:0.8rem;">' + pc + '%</span></div></td>' +
      '<td style="text-align:center;"><div style="display:flex;justify-content:center;gap:6px;">' + viewBtn + editBtn + '</div></td>' +
      '</tr>';
  }).join('');
  
  const btnAdd = document.getElementById('portal-btn-add-family');
  if (btnAdd) {
    if (myJamaah.statusHubunganKeluarga === 'Kepala Keluarga') {
      btnAdd.style.display = 'inline-block';
      btnAdd.onclick = () => window.openJamaahModal();
    } else {
      btnAdd.style.display = 'none';
    }
  }

  } catch (err) { alert('KELUARGA ERROR:\n' + err.message + '\n' + err.stack); }
};

// ============================================================
// 3. JADWAL & SELF CHECK-IN
// ============================================================
let portalJadwalDates = [];
let portalJadwalDateIndex = -1;

window.switchPortalJadwalTab = function(tabName) {
  const tabs = document.querySelectorAll("#portal-jadwal-tabs .master-tab-btn");
  tabs.forEach(t => {
    if (t.getAttribute("data-tab") === tabName) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  const contentKalender = document.getElementById("portal-tab-content-kalender");
  const contentPresensi = document.getElementById("portal-tab-content-presensi");

  if (tabName === "kalender") {
    if (contentKalender) contentKalender.style.display = "block";
    if (contentPresensi) contentPresensi.style.display = "none";
    window.renderJamaahCalendarGrid();
  } else {
    if (contentKalender) contentKalender.style.display = "none";
    if (contentPresensi) contentPresensi.style.display = "block";
    loadJamaahJadwal();
  }
};

window.initPortalCalendarFilters = function() {
  const selectTahun = document.getElementById("portal-filter-jadwal-tahun");
  const selectBulan = document.getElementById("portal-filter-jadwal-bulan");
  if (!selectTahun || !selectBulan) return;

  const currentYear = new Date().getFullYear();
  selectTahun.innerHTML = "";
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    selectTahun.appendChild(opt);
  }

  const currentMonth = new Date().getMonth();
  selectBulan.value = currentMonth;
};

window.renderJamaahCalendarGrid = function() {
  const container = document.getElementById("portal-calendar-container");
  if (!container) return;
  
  let yearSelect = document.getElementById("portal-filter-jadwal-tahun");
  let monthSelect = document.getElementById("portal-filter-jadwal-bulan");
  if (!yearSelect || !monthSelect) return;
  
  if (!yearSelect.value || isNaN(parseInt(yearSelect.value))) {
    initPortalCalendarFilters();
    yearSelect = document.getElementById("portal-filter-jadwal-tahun");
    monthSelect = document.getElementById("portal-filter-jadwal-bulan");
  }
  
  const year = parseInt(yearSelect.value);
  const month = parseInt(monthSelect.value);
  
  container.innerHTML = "";
  
  // Draw Days Header
  const daysHeader = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  daysHeader.forEach(d => {
    const hDiv = document.createElement("div");
    hDiv.className = "calendar-day-header";
    hDiv.textContent = d;
    hDiv.style.fontWeight = "bold";
    hDiv.style.textAlign = "center";
    hDiv.style.padding = "10px 0";
    hDiv.style.borderBottom = "1px solid var(--border-color)";
    hDiv.style.color = "var(--primary)";
    container.appendChild(hDiv);
  });
  
  const firstDay = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  
  // Prev month tail
  const prevNumDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const dateNum = prevNumDays - i;
    const cell = document.createElement("div");
    cell.className = "calendar-cell prev-month";
    cell.innerHTML = `<span class="date-num" style="opacity: 0.25;">${dateNum}</span>`;
    cell.style.background = "rgba(255, 255, 255, 0.01)";
    cell.style.padding = "10px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    container.appendChild(cell);
  }
  
  // Current month days
  const jamaahId = localCurrentJamaahId;
  const jamaah = getJamaahList().find(j => j.id === jamaahId);
  const kelompok = jamaah ? jamaah.kelompokPengajian : "";
  const peramutan = jamaah ? _getPeramutan(jamaah) : "";
  const allJadwal = getJadwalPengajianList() || [];
  const allPresensi = getPresensiKehadiranList() || [];
  
  const relevantSessions = allJadwal;
  
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const now = new Date();
  const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
  
  for (let day = 1; day <= numDays; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.style.padding = "8px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    cell.style.position = "relative";
    
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Header row inside cell
    const cellHeader = document.createElement("div");
    cellHeader.style.display = "flex";
    cellHeader.style.justifyContent = "space-between";
    cellHeader.style.alignItems = "center";
    cellHeader.style.marginBottom = "5px";
    
    const numSpan = document.createElement("span");
    numSpan.className = "date-num";
    numSpan.textContent = day;
    numSpan.style.fontWeight = "bold";
    cellHeader.appendChild(numSpan);
    
    cell.appendChild(cellHeader);
    
    // Find matching schedules
    const daySchedules = relevantSessions.filter(s => s.tanggal === dateString);
    daySchedules.sort((a, b) => (a.waktu_mulai || "").localeCompare(b.waktu_mulai || ""));
    
    daySchedules.forEach(sched => {
      const badge = document.createElement("div");
      badge.className = "calendar-event-badge";
      
      const tingkat = (sched.tingkat_pengajian || "").trim().toLowerCase();
      let bgColor = "rgba(59, 130, 246, 0.15)";
      let borderCol = "#3b82f6";
      let textCol = "#60a5fa";
      
      if (tingkat.includes("desa")) {
        bgColor = "rgba(16, 185, 129, 0.15)";
        borderCol = "#10b981";
        textCol = "#34d399";
      } else if (tingkat.includes("daerah")) {
        bgColor = "rgba(245, 158, 11, 0.15)";
        borderCol = "#f59e0b";
        textCol = "#fbbf24";
      }
      
      badge.style.background = bgColor;
      badge.style.borderLeft = `3px solid ${borderCol}`;
      badge.style.color = textCol;
      badge.style.fontSize = "0.72rem";
      badge.style.padding = "3px 6px";
      badge.style.borderRadius = "3px";
      badge.style.marginBottom = "4px";
      badge.style.cursor = "pointer";
      badge.style.fontWeight = "600";
      badge.style.overflow = "hidden";
      badge.style.textOverflow = "ellipsis";
      badge.style.whiteSpace = "nowrap";
      
      const isEligible = isJamaahEligibleForSchedule(jamaah, sched);
      const suffix = isEligible ? "" : " (Bukan Peserta)";
      if (!isEligible) {
        badge.style.opacity = "0.55";
      }
      
      const timeStr = (sched.waktu_mulai || "").substring(0, 5);
      const pesertaTxt = getScheduleParticipantText(sched);
      badge.textContent = `${timeStr} - ${sched.jenis_pengajian}${suffix}`;
      
      const materiList = (sched.materi_pengajar || []).map(m => m.materi).join(', ');
      const pengajarList = (sched.materi_pengajar || []).map(m => m.pengajar_nama).join(', ');
      badge.title = `Tingkat: ${sched.tingkat_pengajian || '-'}\nKelompok Pembuat: ${sched.kelompok_pengajian || '-'}\nPeserta: ${pesertaTxt}\nMateri: ${materiList || '-'}\nPengajar: ${pengajarList || '-'}`;
      
      badge.onclick = (e) => {
        e.stopPropagation();
        window.showPortalJadwalDetailModal(sched);
      };
      
      cell.appendChild(badge);
    });
    
    container.appendChild(cell);
  }
  
  // Next month head
  const totalCells = firstDay + numDays;
  const remaining = 42 - totalCells; // 6 rows of 7 days
  for (let i = 1; i <= remaining; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell next-month";
    cell.innerHTML = `<span class="date-num" style="opacity: 0.25;">${i}</span>`;
    cell.style.background = "rgba(255, 255, 255, 0.01)";
    cell.style.padding = "10px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    container.appendChild(cell);
  }
};

window.loadJamaahJadwal = function() {
  try {
    const jamaahId = localCurrentJamaahId;
    if (!jamaahId) return;
    const jamaah = getJamaahList().find(j => j.id === jamaahId);
    if (!jamaah) return;
    
    const allJadwal = getJadwalPengajianList();
    const allPresensi = getPresensiKehadiranList();
    const kelompok = jamaah.kelompokPengajian;
    const peramutan = _getPeramutan(jamaah);
    
    // Filter all relevant sessions for this jamaah
    const relevantSessions = allJadwal.filter(j => {
      if (!j) return false;
      
      // Kelompok check
      const tk = String(j.tingkat_pengajian || '').toLowerCase();
      const isKelompok = tk.includes('kelompok') || (!tk.includes('desa') && !tk.includes('daerah'));
      if (isKelompok && j.kelompok_pengajian !== kelompok) {
        return false;
      }
      
      // Participant specific rule
      if (j.peserta_spesifik) {
        const allowedIds = j.peserta_spesifik.split(",").map(id => id.trim()).filter(Boolean);
        if (allowedIds.length > 0) {
          return allowedIds.includes(jamaahId);
        }
      }
      
      // Gender restriction
      const jnsL = String(j.jenis_pengajian || '').toLowerCase();
      if (jnsL.includes('ibu-ibu') || jnsL.includes('kewanitaan') || jnsL.includes('perempuan')) {
        if (String(jamaah.jenisKelamin || '').toLowerCase() !== 'perempuan') return false;
      }
      if (jnsL.includes('bapak-bapak') || jnsL.includes('laki-laki') || jnsL.includes('pria')) {
        if (String(jamaah.jenisKelamin || '').toLowerCase() !== 'laki-laki') return false;
      }

      // Demographic check
      const jpList = (typeof localMasterJenisPengajian !== 'undefined' && localMasterJenisPengajian) ? localMasterJenisPengajian : [];
      const jpObj = jpList.find(x => typeof x === 'object' && x !== null ? x.nama === j.jenis_pengajian : x === j.jenis_pengajian);
      let targetPeserta = [];
      if (jpObj && typeof jpObj === 'object' && jpObj.peserta_pengajian) {
        targetPeserta = String(jpObj.peserta_pengajian).split(',').map(x => x.trim().toLowerCase());
      }
      return targetPeserta.length === 0 || targetPeserta.includes(peramutan.toLowerCase());
    });
    
    const container = document.getElementById('portal-jadwal-container');
    if (!container) return;
    
    if (!relevantSessions.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-calendar-xmark" style="font-size:2rem;margin-bottom:10px;display:block;"></i>Belum ada jadwal pengajian yang relevan untuk Anda.</div>';
      return;
    }
    
    // Extract unique dates and sort ascending
    portalJadwalDates = [...new Set(relevantSessions.map(s => s.tanggal))].sort();
    
    // Find default date index if not already set or out of bounds
    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    if (portalJadwalDateIndex === -1 || portalJadwalDateIndex >= portalJadwalDates.length) {
      const idx = portalJadwalDates.findIndex(d => d >= todayStr);
      if (idx !== -1) {
        portalJadwalDateIndex = idx;
      } else {
        portalJadwalDateIndex = portalJadwalDates.length - 1;
      }
    }
    
    const activeDate = portalJadwalDates[portalJadwalDateIndex];
    const isToday = activeDate === todayStr;
    const dateSchedules = relevantSessions.filter(s => s.tanggal === activeDate);
    
    dateSchedules.sort((a, b) => (a.waktu_mulai || "").localeCompare(b.waktu_mulai || ""));
    
    const dateStatus = isToday ? 'Hari Ini' : (activeDate < todayStr ? 'Sudah Lewat' : 'Akan Datang');
    let dateStatusClass = 'badge-blue';
    if (isToday) dateStatusClass = 'badge-green';
    else if (activeDate < todayStr) dateStatusClass = 'badge-gray';
    
    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background:rgba(0,0,0,0.15); padding:12px 20px; border-radius:10px; border:1px solid var(--border-color); flex-wrap:wrap; gap:10px;">
        <button id="portal-jadwal-prev-btn" class="btn-secondary" style="padding:8px 12px; font-size:0.85rem;" ${portalJadwalDateIndex === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-chevron-left"></i> Sebelumnya
        </button>
        <div style="text-align:center; min-width: 150px;">
          <div style="font-weight:700; font-size:1.1rem; color:var(--primary);">${formatDateIndo(activeDate)}</div>
          <div style="margin-top:4px;"><span class="badge ${dateStatusClass}" style="font-size:0.7rem;">${dateStatus}</span></div>
        </div>
        <button id="portal-jadwal-next-btn" class="btn-secondary" style="padding:8px 12px; font-size:0.85rem;" ${portalJadwalDateIndex === portalJadwalDates.length - 1 ? 'disabled' : ''}>
          Selanjutnya <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      
      <div class="sessions-card-grid" id="portal-jadwal-cards-container">
    `;
    
    const now = new Date();
    const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    
    dateSchedules.forEach(j => {
      const myPr = allPresensi.find(p => p && p.id_pengajian == j.id && p.id_jamaah === jamaahId);
      
      const tkClean = String(j.tingkat_pengajian || '').toLowerCase();
      const tingkatClass = tkClean.includes('kelompok') ? 'tingkat-kelompok' : (tkClean.includes('desa') ? 'tingkat-desa' : 'tingkat-daerah');
      const labelTingkat = j.tingkat_pengajian || 'Tingkat Kelompok';
      
      const isSessionPast = j.tanggal < todayStr || (j.tanggal === todayStr && (j.waktu_selesai && timeNow >= j.waktu_selesai));
      const mySt = myPr ? myPr.status : (isSessionPast ? 'Alpha' : 'Belum Mulai');
      const canCheckIn = isToday && !isSessionPast;
      
      const materialsHtml = (j.materi_pengajar || []).map(m => `
        <div style="margin-top: 4px; font-size: 0.85rem; display: flex; align-items: flex-start; gap: 6px;">
          <i class="fa-solid fa-book-open" style="color: var(--primary); margin-top: 3px;"></i>
          <div>
            <strong>${m.materi}</strong> <span class="session-ustadz" style="display:block; font-size: 0.78rem; color:var(--text-secondary); margin-top:1px;">(Ustadz: ${m.pengajar_nama})</span>
          </div>
        </div>
      `).join('');
      
      let presenceBadgeClass = 'badge-gray';
      if (mySt === 'Hadir Fisik' || mySt === 'Online') {
        presenceBadgeClass = 'badge-green';
      } else if (mySt === 'Izin') {
        presenceBadgeClass = 'badge-yellow';
      } else if (mySt === 'Alpha') {
        presenceBadgeClass = 'badge-red';
      } else if (mySt === 'Belum Mulai') {
        presenceBadgeClass = 'badge-blue';
      }
      
      let presenceControls = '';
      if (canCheckIn) {
        const isFisikActive = mySt === 'Hadir Fisik';
        const isOnlineActive = mySt === 'Online';
        const isIzinActive = mySt === 'Izin';
        
        presenceControls = `
          <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px;">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Pencatatan Presensi Kehadiran:</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <button class="btn-primary" style="${isFisikActive ? 'background: #10b981; color: white;' : 'background: transparent; border: 1px solid #10b981; color: #10b981;'} font-size: 0.75rem; padding: 8px 4px; justify-content: center; font-weight:600;" onclick="window.submitFastPresensi('${j.id}', 'Hadir Fisik')">
                <i class="fa-solid fa-location-dot"></i> Fisik
              </button>
              <button class="btn-primary" style="${isOnlineActive ? 'background: #3b82f6; color: white;' : 'background: transparent; border: 1px solid #3b82f6; color: #3b82f6;'} font-size: 0.75rem; padding: 8px 4px; justify-content: center; font-weight:600;" onclick="window.openPresensiModalPortal('${j.id}', 'Online')">
                <i class="fa-solid fa-video"></i> Online
              </button>
              <button class="btn-primary" style="${isIzinActive ? 'background: #f59e0b; color: white;' : 'background: transparent; border: 1px solid #f59e0b; color: #f59e0b;'} font-size: 0.75rem; padding: 8px 4px; justify-content: center; font-weight:600;" onclick="window.openPresensiModalPortal('${j.id}', 'Izin')">
                <i class="fa-solid fa-envelope"></i> Izin
              </button>
            </div>
          </div>
        `;
      } else {
        presenceControls = `
          <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Status Kehadiran:</span>
            <span class="badge ${presenceBadgeClass}" style="font-size: 0.85rem; padding: 4px 10px;">${mySt}</span>
          </div>
          ${myPr && myPr.keterangan ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; font-style: italic;">Ket: "${myPr.keterangan}"</div>` : ''}
        `;
      }
      
      html += `
        <div class="session-card ${tingkatClass} active" style="cursor: default; background: var(--bg-card); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="session-card-header">
              <span class="session-badge badge-${tingkatClass}">${labelTingkat}</span>
              <span class="session-type" style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">${j.jenis_pengajian}</span>
            </div>
            <div class="session-card-body" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
              <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                <i class="fa-regular fa-calendar" style="color: var(--primary); width:14px; text-align:center;"></i>
                <span>${formatDateIndo(j.tanggal)}</span>
              </div>
              <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                <i class="fa-regular fa-clock" style="color: var(--primary); width:14px; text-align:center;"></i>
                <span>${(j.waktu_mulai || '').substring(0, 5)} - ${(j.waktu_selesai || '').substring(0, 5)} WIB</span>
              </div>
              <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                <i class="fa-solid fa-location-dot" style="color: var(--primary); width:14px; text-align:center;"></i>
                <span>Lokasi: ${j.lokasi || '-'}</span>
              </div>
              <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                <i class="fa-solid fa-users" style="color: var(--primary); width:14px; text-align:center;"></i>
                <span>Pembuat: ${j.kelompok_pengajian || 'Semua'}</span>
              </div>
              <div class="session-materi-list" style="border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 4px; display:flex; flex-direction:column; gap:6px;">
                ${materialsHtml}
              </div>
            </div>
          </div>
          ${presenceControls}
        </div>
      `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    const prevBtn = document.getElementById('portal-jadwal-prev-btn');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (portalJadwalDateIndex > 0) {
          portalJadwalDateIndex--;
          loadJamaahJadwal();
        }
      };
    }
    
    const nextBtn = document.getElementById('portal-jadwal-next-btn');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (portalJadwalDateIndex < portalJadwalDates.length - 1) {
          portalJadwalDateIndex++;
          loadJamaahJadwal();
        }
      };
    }
  } catch (err) {
    alert('JADWAL CARD RENDER ERROR:\n' + err.message + '\n' + err.stack);
  }
};

window.submitFastPresensi = function(jadwalId, status) {
  if (typeof doSelfCheckIn === 'function') {
    doSelfCheckIn(jadwalId, status, '');
  }
};

window.openPresensiModalPortal = function(jadwalId, status) {
  if (typeof openJamaahPresensiModal === 'function') {
    openJamaahPresensiModal(jadwalId, status);
  }
};

window.doSelfCheckIn = function(jadwalId, status, keterangan) {
  const user = getCurrentUser();
  if (!user || !localCurrentJamaahId) return;
  google.script.run
    .withSuccessHandler(function() {
      fetchDatabaseFromServer(function() {
        if (status === 'Hadir Fisik') {
          alert("Alhamdulilah jazakumullahu khoiro, sudah hadir !, Semoga Allah memberikan Aman, Slamat, Lancar dan Barokah!");
        }
        loadJamaahJadwal();
        loadJamaahDashboard();
        if (typeof showToast === 'function') showToast('Check-in berhasil: ' + status, 'success');
      });
    })
    .withFailureHandler(function(err) {
      if (typeof showToast === 'function') showToast('Gagal check-in: ' + (err.message || err), 'error');
    })
    .selfCheckInGAS(jadwalId, localCurrentJamaahId, status, keterangan || '', user.username);
};

window.openJamaahPresensiModal = function(jadwalId, status = 'Hadir Fisik') {
  const modal = document.getElementById('jamaah-presensi-modal');
  if (!modal) return;
  
  document.getElementById('presensi-form-jadwal-id').value = jadwalId;
  document.getElementById('presensi-form-keterangan').value = '';
  
  const radio = document.querySelector(`input[name="presensi-status"][value="${status}"]`);
  if (radio) radio.checked = true;
  
  togglePresensiKeterangan();
  modal.classList.add('active');
};

window.closeJamaahPresensiModal = function() {
  const modal = document.getElementById('jamaah-presensi-modal');
  if (modal) modal.classList.remove('active');
};

window.togglePresensiKeterangan = function() {
  const container = document.getElementById('presensi-keterangan-container');
  const textarea = document.getElementById('presensi-form-keterangan');
  if (!container || !textarea) return;
  
  const checkedRadio = document.querySelector('input[name="presensi-status"]:checked');
  const status = checkedRadio ? checkedRadio.value : 'Hadir Fisik';
  
  if (status === 'Online' || status === 'Izin') {
    container.style.display = 'block';
    textarea.required = true;
  } else {
    container.style.display = 'none';
    textarea.required = false;
  }
};

window.submitJamaahPresensi = function() {
  const jadwalId = document.getElementById('presensi-form-jadwal-id').value;
  const checkedRadio = document.querySelector('input[name="presensi-status"]:checked');
  const status = checkedRadio ? checkedRadio.value : 'Hadir Fisik';
  const keterangan = document.getElementById('presensi-form-keterangan').value.trim();
  
  if ((status === 'Online' || status === 'Izin') && !keterangan) {
    if (typeof showToast === 'function') showToast('Keterangan / alasan wajib diisi!', 'warning');
    return;
  }
  
  doSelfCheckIn(jadwalId, status, keterangan);
  closeJamaahPresensiModal();
};

window.showPortalJadwalDetailModal = function(sched) {
  let modal = document.getElementById("portal-jadwal-detail-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "portal-jadwal-detail-modal";
    modal.className = "modal-overlay";
    modal.style.zIndex = "9999";
    document.body.appendChild(modal);
  }
  
  const timeStr = (sched.waktu_mulai || "").substring(0, 5) + " - " + (sched.waktu_selesai || "").substring(0, 5);
  const materialsHtml = (sched.materi_pengajar || []).map(m => `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-top: 8px;">
      <div style="font-weight: 600; color: var(--primary);">${m.materi}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Pengajar: <strong>${m.pengajar_nama}</strong></div>
    </div>
  `).join("") || '<div style="color: var(--text-muted); font-style: italic; margin-top: 8px;">Tidak ada materi khusus</div>';
  
  const allPresensi = getPresensiKehadiranList() || [];
  const myPr = allPresensi.find(p => p && p.id_pengajian == sched.id && p.id_jamaah === localCurrentJamaahId);
  const status = myPr ? myPr.status : 'Alpha';
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const isToday = sched.tanggal === todayStr;
  const now = new Date();
  const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
  const isSessionPast = sched.tanggal < todayStr || (isToday && (sched.waktu_selesai && timeNow >= sched.waktu_selesai));
  
  const jamaah = getJamaahList().find(j => j.id === localCurrentJamaahId);
  const isEligible = isJamaahEligibleForSchedule(jamaah, sched);
  const pesertaTxt = getScheduleParticipantText(sched);
  
  let statusBadge = "";
  if (isSessionPast) {
    let presenceBadgeClass = 'badge-gray';
    let displayStatus = status;
    if (status === 'Hadir Fisik' || status === 'Online') {
      presenceBadgeClass = 'badge-green';
    } else if (status === 'Izin') {
      presenceBadgeClass = 'badge-yellow';
    } else if (status === 'Alpha') {
      if (!isEligible) {
        displayStatus = 'Bukan Peserta';
        presenceBadgeClass = 'badge-gray';
      } else {
        presenceBadgeClass = 'badge-red';
      }
    }
    statusBadge = `<span class="badge ${presenceBadgeClass}" style="font-size: 0.8rem; padding: 4px 10px;">${displayStatus}</span>`;
  } else {
    if (!isEligible) {
      statusBadge = `<span class="badge badge-gray" style="font-size: 0.8rem; padding: 4px 10px;">Bukan Peserta</span>`;
    } else {
      statusBadge = `<span class="badge badge-gray" style="font-size: 0.8rem; padding: 4px 10px;">Akan Datang / Belum Presensi</span>`;
    }
  }
  
  modal.innerHTML = `
    <div class="modal-container" style="max-width: 500px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-circle-info"></i> Detail Jadwal Kegiatan</h3>
        <button class="modal-close-btn" type="button" onclick="document.getElementById('portal-jadwal-detail-modal').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
        <div>
          <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--primary); font-weight: bold; letter-spacing: 0.5px;">Jenis Pengajian</span>
          <div style="font-size: 1.2rem; font-weight: bold; color: var(--text-primary); margin-top: 2px;">${sched.jenis_pengajian}</div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
          <div>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Tanggal</span>
            <div style="font-weight: 600; color: var(--text-primary); margin-top: 2px;"><i class="fa-regular fa-calendar-days" style="margin-right: 6px; color: var(--primary);"></i>${formatDateIndo(sched.tanggal)}</div>
          </div>
          <div>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Waktu</span>
            <div style="font-weight: 600; color: var(--text-primary); margin-top: 2px;"><i class="fa-regular fa-clock" style="margin-right: 6px; color: var(--primary);"></i>${timeStr}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Lokasi</span>
            <div style="font-weight: 600; color: var(--text-primary); margin-top: 2px;"><i class="fa-solid fa-location-dot" style="margin-right: 6px; color: var(--primary);"></i>${sched.lokasi || '-'}</div>
          </div>
          <div>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Tingkat Kegiatan</span>
            <div style="font-weight: 600; color: var(--text-primary); margin-top: 2px;"><i class="fa-solid fa-users" style="margin-right: 6px; color: var(--primary);"></i>${sched.tingkat_pengajian || '-'}</div>
          </div>
        </div>
        
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Peserta</span>
          <div style="font-weight: 600; color: var(--text-primary); margin-top: 2px;"><i class="fa-solid fa-user-group" style="margin-right: 6px; color: var(--primary);"></i>${pesertaTxt}</div>
        </div>
        
        ${isSessionPast ? `
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Status Kehadiran Anda</span>
          <div style="margin-top: 4px;">${statusBadge}</div>
        </div>` : ''}
        
        <div style="margin-top: 6px; border-top: 1px solid var(--border-color); padding-top: 10px;">
          <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; display: block; margin-bottom: 4px;">Materi & Pengajar</span>
          ${materialsHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-primary" onclick="document.getElementById('portal-jadwal-detail-modal').classList.remove('active')">Tutup</button>
      </div>
    </div>
  `;
  modal.classList.add("active");
};
