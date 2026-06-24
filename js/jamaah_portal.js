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
        else if (target === 'section-jamaah-jadwal') loadJamaahJadwal();
      } catch(err) {
        alert('MENU CLICK ERROR: ' + err.message + '\n' + err.stack);
      }
    });
  });
  try {
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
    if (j.kelompok_pengajian !== kelompok) return false;
    
    const jnsL = String(j.jenis_pengajian || '').toLowerCase();
    if (jnsL.includes('ibu-ibu') || jnsL.includes('kewanitaan')) {
      if (String(jamaah.jenisKelamin || '').toLowerCase() !== 'perempuan') return false;
    }

    const jpList = (typeof localMasterJenisPengajian !== 'undefined' && localMasterJenisPengajian) ? localMasterJenisPengajian : [];
    const jpObj = jpList.find(x => typeof x === 'object' && x !== null ? x.nama === j.jenis_pengajian : x === j.jenis_pengajian);
    let targetPeserta = [];
    if (jpObj && typeof jpObj === 'object' && jpObj.peserta_pengajian) {
      targetPeserta = String(jpObj.peserta_pengajian).split(',').map(x => x.trim().toLowerCase());
    }
    return targetPeserta.length === 0 || targetPeserta.includes(peramutan.toLowerCase());
  });
  
  const sudahLewat = jadwalRelevant.filter(j => new Date(j.tanggal) <= new Date());
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
    
    return '<tr><td>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">' + String(m.namaLengkap || '?').charAt(0).toUpperCase() + '</div>' +
      '<div><div style="font-weight:600;">' + (m.namaLengkap || 'Tanpa Nama') + '</div><div style="font-size:0.78rem;color:var(--text-muted);">' + m.id + '</div></div>' +
      '</div></td>' +
      '<td><span class="badge ' + (isKK ? 'badge-green' : 'badge-blue') + '">' + m.statusHubunganKeluarga + '</span></td>' +
      '<td>' + age + ' th</td>' +
      '<td>' + per + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + pc + '%;background:' + (pc >= 75 ? '#10b981' : pc >= 50 ? '#f59e0b' : '#ef4444') + ';border-radius:3px;"></div></div><span style="font-size:0.8rem;">' + pc + '%</span></div></td>' +
      '<td style="text-align:center;">' + (canEdit ? '<button class="btn-secondary" style="padding:5px 12px;font-size:0.8rem;" onclick="window.openJamaahModal(\'' + m.id + '\')"><i class="fa-solid fa-pen"></i> Edit</button>' : '<span style="color:var(--text-muted);">-</span>') + '</td>' +
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
window.loadJamaahJadwal = function() {
  try {
  const jamaahId = localCurrentJamaahId;
  if (!jamaahId) return;
  const jamaah = getJamaahList().find(j => j.id === jamaahId);
  if (!jamaah) return;
  const myFamily = _getMyFamily(jamaahId, jamaah);
  const allJadwal = getJadwalPengajianList();
  const allPresensi = getPresensiKehadiranList();
  
  const jadwal = allJadwal.filter(j => {
    if (!j) return false;
    const tk = String(j.tingkat_pengajian || '').toLowerCase();
    return tk.includes('daerah') || tk.includes('desa') || j.kelompok_pengajian === jamaah.kelompokPengajian;
  }).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  const myPeramutan = _getPeramutan(jamaah);
  const container = document.getElementById('portal-jadwal-container');
  if (!container) return;
  
  if (!jadwal.length) { 
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-calendar-xmark" style="font-size:2rem;margin-bottom:10px;display:block;"></i>Belum ada jadwal pengajian.</div>'; 
    return; 
  }

  // Add Calendar Filter Header
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
      <div style="padding:10px; background:rgba(59, 130, 246, 0.1); border-left:4px solid var(--primary); border-radius:6px; flex-grow:1; font-size:0.85rem;">
        <i class="fa-solid fa-circle-info"></i> Anda hanya dapat <b>Check-In Hadir</b> atau <b>Izin</b> pada jadwal hari ini.
      </div>
      <div style="display:flex; gap:10px;">
        <select id="portal-jadwal-month" class="select-filter" style="padding:6px; font-size:0.85rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);" onchange="window.renderJamaahCalendarGrid()">
          <option value="0">Januari</option><option value="1">Februari</option><option value="2">Maret</option>
          <option value="3">April</option><option value="4">Mei</option><option value="5">Juni</option>
          <option value="6">Juli</option><option value="7">Agustus</option><option value="8">September</option>
          <option value="9">Oktober</option><option value="10">November</option><option value="11">Desember</option>
        </select>
        <select id="portal-jadwal-year" class="select-filter" style="padding:6px; font-size:0.85rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);" onchange="window.renderJamaahCalendarGrid()"></select>
      </div>
    </div>
    <div class="calendar-grid" id="portal-calendar-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:0; border:1px solid var(--border-color); border-radius:8px; overflow:hidden; background:var(--bg-secondary);">
    </div>
  `;
  container.innerHTML = html;

  // Populate Year Dropdown
  const yearSelect = document.getElementById('portal-jadwal-year');
  const monthSelect = document.getElementById('portal-jadwal-month');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  monthSelect.value = new Date().getMonth();

  // Attach the grid renderer to the global scope so the select onChange can call it
  window.renderJamaahCalendarGrid = function() {
    const gridContainer = document.getElementById('portal-calendar-grid');
    if (!gridContainer) return;
    const y = parseInt(document.getElementById('portal-jadwal-year').value);
    const m = parseInt(document.getElementById('portal-jadwal-month').value);
    
    gridContainer.innerHTML = '';
    
    // Header
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
      hDiv.style.background = "var(--bg-primary)";
      gridContainer.appendChild(hDiv);
    });

    const firstDay = new Date(y, m, 1).getDay();
    const numDays = new Date(y, m + 1, 0).getDate();
    const prevNumDays = new Date(y, m, 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);

    // Prev month blanks
    for (let i = firstDay - 1; i >= 0; i--) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell prev-month";
      cell.innerHTML = '<span class="date-num" style="opacity:0.25;">' + (prevNumDays - i) + '</span>';
      cell.style.background = "rgba(255, 255, 255, 0.01)";
      cell.style.padding = "8px";
      cell.style.minHeight = "120px";
      cell.style.border = "1px solid var(--border-color)";
      gridContainer.appendChild(cell);
    }

    // Days
    for (let day = 1; day <= numDays; day++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.style.padding = "8px";
      cell.style.minHeight = "120px";
      cell.style.border = "1px solid var(--border-color)";
      cell.style.position = "relative";
      cell.style.background = "var(--bg-primary)";
      
      const currentCellDate = new Date(y, m, day);
      const isToday = currentCellDate.getTime() === today.getTime();
      const isPast = currentCellDate.getTime() < today.getTime();
      const isFuture = currentCellDate.getTime() > today.getTime();
      
      if (isToday) {
        cell.style.background = "rgba(59, 130, 246, 0.05)";
        cell.style.border = "1px solid var(--primary)";
      }

      const dateString = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      
      // Top header of cell
      const cellHeader = document.createElement("div");
      cellHeader.style.marginBottom = "5px";
      const numSpan = document.createElement("span");
      numSpan.className = "date-num";
      numSpan.textContent = day;
      numSpan.style.fontWeight = "bold";
      if (isToday) {
        numSpan.style.background = "var(--primary)";
        numSpan.style.color = "#fff";
        numSpan.style.borderRadius = "50%";
        numSpan.style.width = "24px";
        numSpan.style.height = "24px";
        numSpan.style.display = "inline-flex";
        numSpan.style.alignItems = "center";
        numSpan.style.justifyContent = "center";
      }
      cellHeader.appendChild(numSpan);
      cell.appendChild(cellHeader);

      const daySchedules = jadwal.filter(j => j && j.tanggal === dateString);
      
      daySchedules.forEach(j => {
        // Eligibility check
        let isEligible = true;
        if (j.peserta_spesifik) {
          const allowedIds = j.peserta_spesifik.split(",").map(id => id.trim()).filter(Boolean);
          if (allowedIds.length > 0) {
            isEligible = allowedIds.includes(jamaah.id);
          }
        } else {
          isEligible = typeof isJamaahEligibleForJenis === 'function' ? isJamaahEligibleForJenis(jamaah, j.jenis_pengajian) : true;
        }

        const myPr = allPresensi.find(p => p && p.id_pengajian == j.id && p.id_jamaah === jamaahId);
        const mySt = myPr ? myPr.status : (isFuture ? 'BELUM WAKTUNYA' : 'Alpha');
        const displaySt = (!isEligible && mySt === 'Alpha') ? 'Bukan Sesi Anda' : mySt;
        const isHadir = mySt === 'Hadir Fisik' || mySt === 'Online';
        
        let bgColor = "rgba(107, 114, 128, 0.15)";
        let borderCol = "#6b7280";
        let textCol = "#9ca3af";
        
        if (isHadir) {
          bgColor = "rgba(16, 185, 129, 0.15)"; borderCol = "#10b981"; textCol = "#34d399";
        } else if (mySt === 'Izin') {
          bgColor = "rgba(245, 158, 11, 0.15)"; borderCol = "#f59e0b"; textCol = "#fbbf24";
        } else if (mySt === 'Alpha' && isEligible && (isPast || isToday)) {
          bgColor = "rgba(239, 68, 68, 0.15)"; borderCol = "#ef4444"; textCol = "#f87171";
        } else if (isFuture) {
          bgColor = "rgba(59, 130, 246, 0.15)"; borderCol = "#3b82f6"; textCol = "#60a5fa";
        }

        const badge = document.createElement("div");
        badge.className = "calendar-event-badge";
        badge.style.background = bgColor;
        badge.style.borderLeft = "3px solid " + borderCol;
        badge.style.color = textCol;
        badge.style.fontSize = "0.72rem";
        badge.style.padding = "4px 6px";
        badge.style.borderRadius = "3px";
        badge.style.marginBottom = "5px";
        badge.style.fontWeight = "600";
        badge.style.lineHeight = "1.2";
        badge.style.cursor = "pointer";
        
        const timeStr = (j.waktu_mulai || "").substring(0, 5);
        badge.innerHTML = '<div style="margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + timeStr + ' - ' + (j.jenis_pengajian || '-') + '</div>';
        
        // Tooltip
        const materiList = (j.materi_pengajar || []).map(m => m.materi).join(', ');
        const pengajarList = (j.materi_pengajar || []).map(m => m.pengajar_nama).join(', ');
        badge.title = `Tingkat: ${j.tingkat_pengajian || '-'}\nKelompok Pembuat: ${j.kelompok_pengajian || '-'}\nMateri: ${materiList || '-'}\nPengajar: ${pengajarList || '-'}`;
        
        const statusBadge = document.createElement("div");
        statusBadge.style.fontSize = "0.65rem";
        statusBadge.style.color = borderCol;
        statusBadge.style.textTransform = "uppercase";
        statusBadge.style.display = "flex";
        statusBadge.style.justifyContent = "space-between";
        statusBadge.style.alignItems = "center";
        statusBadge.innerHTML = '<span>' + displaySt + '</span>';
        
        badge.appendChild(statusBadge);

        // Check-in logic only for eligible today
        if (isToday && mySt === 'Alpha' && isEligible) {
          const actionBtn = document.createElement('button');
          actionBtn.style.marginTop = "4px";
          actionBtn.style.padding = "2px 5px";
          actionBtn.style.fontSize = "0.6rem";
          actionBtn.style.background = "#3b82f6";
          actionBtn.style.color = "#fff";
          actionBtn.style.border = "none";
          actionBtn.style.borderRadius = "3px";
          actionBtn.style.cursor = "pointer";
          actionBtn.style.width = "100%";
          actionBtn.textContent = "Check-in Hadir";
          actionBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof openJamaahPresensiModal === 'function') {
              openJamaahPresensiModal(j.id);
            }
          };
          badge.appendChild(actionBtn);
        }

        cell.appendChild(badge);
      });
      gridContainer.appendChild(cell);
    }

    // Next month blanks
    const totalCells = firstDay + numDays;
    const remaining = 42 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell next-month";
      cell.innerHTML = '<span class="date-num" style="opacity:0.25;">' + i + '</span>';
      cell.style.background = "rgba(255, 255, 255, 0.01)";
      cell.style.padding = "8px";
      cell.style.minHeight = "120px";
      cell.style.border = "1px solid var(--border-color)";
      gridContainer.appendChild(cell);
    }
  };

  // Initial Render
  window.renderJamaahCalendarGrid();
  } catch (err) { alert('JADWAL ERROR:\n' + err.message + '\n' + err.stack); }
};

window.showIzinForm = function(jadwalId) {
  const f = document.getElementById('izin-form-' + jadwalId);
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

window.doSelfCheckIn = function(jadwalId, status, keterangan) {
  const user = getCurrentUser();
  if (!user || !localCurrentJamaahId) return;
  google.script.run
    .withSuccessHandler(function() {
      fetchDatabaseFromServer(function() {
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

window.openJamaahPresensiModal = function(jadwalId) {
  const modal = document.getElementById('jamaah-presensi-modal');
  if (!modal) return;
  
  document.getElementById('presensi-form-jadwal-id').value = jadwalId;
  document.getElementById('presensi-form-keterangan').value = '';
  
  const defaultRadio = document.querySelector('input[name="presensi-status"][value="Hadir Fisik"]');
  if (defaultRadio) defaultRadio.checked = true;
  
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
