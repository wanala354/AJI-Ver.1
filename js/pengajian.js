// MANAJEMEN PENGAJIAN MODULE LOGIC (v3.0)
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Setup subtab click listeners
  const subtabs = document.querySelectorAll("#section-pengajian .card-panel-tabs .tab-btn");
  subtabs.forEach(btn => {
    btn.addEventListener("click", () => {
      subtabs.forEach(b => {
        b.classList.remove("active");
        b.style.borderBottomColor = "transparent";
        b.style.color = "var(--text-secondary)";
      });
      btn.classList.add("active");
      btn.style.borderBottomColor = "var(--primary)";
      btn.style.color = "var(--primary)";
      
      const targetSubtab = btn.getAttribute("data-subtab");
      document.querySelectorAll("#section-pengajian .subtab-content").forEach(c => {
        c.style.display = "none";
      });
      
      const targetContent = document.getElementById("subtab-" + targetSubtab);
      if (targetContent) {
        targetContent.style.display = "block";
        refreshSubtabData(targetSubtab);
      }
    });
  });
});

window.initPengajianModule = function() {
  // Populate Year and Month Filters if empty
  const yearSelect = document.getElementById("filter-jadwal-tahun");
  const monthSelect = document.getElementById("filter-jadwal-bulan");
  
  if (yearSelect && yearSelect.options.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
    
    const currentMonth = new Date().getMonth();
    monthSelect.value = currentMonth;
  }
  
  // Render subtab active
  const activeBtn = document.querySelector("#section-pengajian .card-panel-tabs .tab-btn.active");
  if (activeBtn) {
    const activeSub = activeBtn.getAttribute("data-subtab");
    refreshSubtabData(activeSub);
  }
};

function refreshSubtabData(subtabName) {
  if (subtabName === "pengajian-penjadwalan") {
    renderCalendar();
  } else if (subtabName === "pengajian-presensi") {
    loadPresensiSesiDropdown();
  } else if (subtabName === "pengajian-monitoring") {
    calculateAndRenderMonitoring();
  }
}

// ==========================================
// 1. PENJADWALAN & KALENDER LOGIC
// ==========================================
window.renderCalendar = function() {
  const container = document.getElementById("pengajian-calendar-container");
  if (!container) return;
  
  const year = parseInt(document.getElementById("filter-jadwal-tahun").value);
  const month = parseInt(document.getElementById("filter-jadwal-bulan").value);
  
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
  const schedules = getJadwalPengajianList() || [];
  
  for (let day = 1; day <= numDays; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.style.padding = "10px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    cell.style.position = "relative";
    cell.style.transition = "background-color 0.2s";
    
    // Hover styling
    cell.addEventListener("mouseenter", () => {
      cell.style.backgroundColor = "rgba(var(--primary-rgb), 0.03)";
    });
    cell.addEventListener("mouseleave", () => {
      cell.style.backgroundColor = "transparent";
    });
    
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
    
    // Add schedule button in cell (Admin or Operator only)
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    if (currentUser && curRoleClean !== "user") {
      const addBtn = document.createElement("button");
      addBtn.className = "calendar-add-btn";
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.style.border = "none";
      addBtn.style.background = "transparent";
      addBtn.style.cursor = "pointer";
      addBtn.style.fontSize = "0.75rem";
      addBtn.style.color = "var(--text-secondary)";
      addBtn.style.opacity = "0";
      addBtn.style.transition = "opacity 0.2s";
      
      cell.addEventListener("mouseenter", () => addBtn.style.opacity = "1");
      cell.addEventListener("mouseleave", () => addBtn.style.opacity = "0");
      
      addBtn.onclick = (e) => {
        e.stopPropagation();
        openAddJadwalModal(dateString);
      };
      
      cellHeader.appendChild(addBtn);
    }
    
    cell.appendChild(cellHeader);
    
    // Find matching schedules
    const daySchedules = schedules.filter(s => s.tanggal === dateString);
    
    daySchedules.forEach(sched => {
      const badge = document.createElement("div");
      badge.className = "calendar-event-badge";
      
      const isDesa = sched.tingkat_pengajian === "Tingkat Desa";
      badge.style.background = isDesa ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)";
      badge.style.borderLeft = `3px solid ${isDesa ? "#10b981" : "#3b82f6"}`;
      badge.style.color = isDesa ? "#34d399" : "#60a5fa";
      badge.style.fontSize = "0.72rem";
      badge.style.padding = "3px 6px";
      badge.style.borderRadius = "3px";
      badge.style.marginBottom = "4px";
      badge.style.cursor = "pointer";
      badge.style.fontWeight = "600";
      badge.style.overflow = "hidden";
      badge.style.textOverflow = "ellipsis";
      badge.style.whiteSpace = "nowrap";
      
      // Render text: "20:00 - Sambung"
      const timeStr = (sched.waktu_mulai || "").substring(0, 5);
      badge.textContent = `${timeStr} - ${sched.jenis_pengajian}`;
      badge.title = `${sched.tingkat_pengajian}\nMateri: ${sched.materi_pengajar.map(m => m.materi).join(', ')}`;
      
      badge.onclick = (e) => {
        e.stopPropagation();
        openEditJadwalModal(sched.id);
      };
      
      cell.appendChild(badge);
    });
    
    // Double click to add schedule directly
    if (currentUser && curRoleClean !== "user") {
      cell.ondblclick = () => openAddJadwalModal(dateString);
    }
    
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

// ==========================================
// 2. MODAL FORM JADWAL LOGIC
// ==========================================
function populateJadwalJenisDropdown(selectedVal = "") {
  const select = document.getElementById("jadwal-form-jenis");
  if (!select) return;
  select.innerHTML = '<option value="" disabled selected>-- Pilih Jenis Pengajian --</option>';
  
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  list.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (selectedVal && item.toLowerCase() === selectedVal.toLowerCase()) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
  if (selectedVal && select.value !== selectedVal) {
    const opt = document.createElement("option");
    opt.value = selectedVal;
    opt.textContent = selectedVal;
    opt.selected = true;
    select.appendChild(opt);
  }
}

window.openAddJadwalModal = function(date = null) {
  const form = document.getElementById("pengajian-jadwal-form");
  if (!form) return;
  form.reset();
  
  document.getElementById("jadwal-form-id").value = "";
  document.getElementById("pengajian-jadwal-modal-title").innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Tambah Jadwal Pengajian';
  
  if (date) {
    document.getElementById("jadwal-form-tanggal").value = date;
  } else {
    document.getElementById("jadwal-form-tanggal").value = new Date().toISOString().split('T')[0];
  }
  
  document.getElementById("jadwal-form-waktu-mulai").value = "20:00";
  document.getElementById("jadwal-form-waktu-selesai").value = "21:30";
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  const tingkatSelect = document.getElementById("jadwal-form-tingkat");
  tingkatSelect.value = "Tingkat Kelompok";
  tingkatSelect.disabled = isOperator;
  
  // Populate Jenis Pengajian
  populateJadwalJenisDropdown();
  
  // Populate Kelompok
  populateJadwalKelompokDropdown();
  
  // Reset Materi-Pengajar Container and add 1 default empty row
  document.getElementById("jadwal-materi-pengajar-container").innerHTML = "";
  
  setJadwalFormReadOnly(false);
  onJadwalTingkatChange();
  
  addMateriPengajarRow();
  
  const modal = document.getElementById("pengajian-jadwal-modal");
  modal.classList.add("active");
};

window.openEditJadwalModal = function(id) {
  const schedules = getJadwalPengajianList() || [];
  const sched = schedules.find(s => s.id == id);
  if (!sched) return;
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  // Check ownership/access
  if (isOperator) {
    const isDesaOrDaerah = sched.tingkat_pengajian === "Tingkat Desa" || sched.tingkat_pengajian === "Tingkat Daerah";
    if (!isDesaOrDaerah && sched.kelompok_pengajian !== currentUser.kelompok) {
      showToast("Anda tidak memiliki akses untuk melihat/mengedit jadwal kelompok lain!", "error");
      return;
    }
  }
  
  // Populate Jenis Pengajian first before setting its value
  populateJadwalJenisDropdown(sched.jenis_pengajian);
  
  document.getElementById("jadwal-form-id").value = sched.id;
  document.getElementById("pengajian-jadwal-modal-title").innerHTML = '<i class="fa-solid fa-calendar-check"></i> Edit Jadwal Pengajian';
  
  document.getElementById("jadwal-form-tingkat").value = sched.tingkat_pengajian;
  document.getElementById("jadwal-form-jenis").value = sched.jenis_pengajian;
  document.getElementById("jadwal-form-tanggal").value = sched.tanggal;
  document.getElementById("jadwal-form-waktu-mulai").value = sched.waktu_mulai.substring(0, 5);
  document.getElementById("jadwal-form-waktu-selesai").value = sched.waktu_selesai.substring(0, 5);
  
  // Populate Kelompok dropdown
  populateJadwalKelompokDropdown();
  
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  let hasOption = false;
  for (let i = 0; i < kelompokSel.options.length; i++) {
    if (kelompokSel.options[i].value === sched.kelompok_pengajian) {
      hasOption = true;
      break;
    }
  }
  if (!hasOption && sched.kelompok_pengajian) {
    const opt = document.createElement("option");
    opt.value = sched.kelompok_pengajian;
    opt.textContent = sched.kelompok_pengajian;
    kelompokSel.appendChild(opt);
  }
  kelompokSel.value = sched.kelompok_pengajian;
  
  // Determine read-only view
  const isReadOnly = (curRoleClean === "user") || (isOperator && (sched.tingkat_pengajian === "Tingkat Desa" || sched.tingkat_pengajian === "Tingkat Daerah"));
  setJadwalFormReadOnly(isReadOnly);
  
  // Populate the shared datalist before adding rows
  populatePengajarDatalist();
  
  // Populate Materi-Pengajar rows
  const container = document.getElementById("jadwal-materi-pengajar-container");
  container.innerHTML = "";
  
  const items = sched.materi_pengajar || [];
  if (items.length === 0) {
    addMateriPengajarRow();
  } else {
    items.forEach(item => {
      addMateriPengajarRow(item.materi, item.pengajar_id);
    });
  }
  
  // RLS for save button and delete action
  let delBtn = document.getElementById("btn-delete-jadwal-modal");
  if (!delBtn && !isReadOnly && curRoleClean !== "user") {
    delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.id = "btn-delete-jadwal-modal";
    delBtn.className = "btn-secondary";
    delBtn.style.background = "#ef4444";
    delBtn.style.color = "white";
    delBtn.style.border = "none";
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Hapus';
    delBtn.onclick = () => confirmDeleteJadwal(sched.id);
    
    const footer = document.querySelector("#pengajian-jadwal-modal .modal-footer");
    footer.insertBefore(delBtn, footer.firstChild);
  } else if (delBtn && (isReadOnly || curRoleClean === "user")) {
    delBtn.remove();
  } else if (delBtn) {
    delBtn.onclick = () => confirmDeleteJadwal(sched.id);
  }
  
  const modal = document.getElementById("pengajian-jadwal-modal");
  modal.classList.add("active");
};

window.closeJadwalModal = function() {
  const modal = document.getElementById("pengajian-jadwal-modal");
  modal.classList.remove("active");
  
  const delBtn = document.getElementById("btn-delete-jadwal-modal");
  if (delBtn) delBtn.remove();
};

function populateJadwalKelompokDropdown() {
  const select = document.getElementById("jadwal-form-kelompok");
  if (!select) return;
  
  select.innerHTML = "";
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  if (isOperator) {
    const opt = document.createElement("option");
    opt.value = currentUser.kelompok;
    opt.textContent = currentUser.kelompok;
    opt.selected = true;
    select.appendChild(opt);
    select.disabled = true;
  } else {
    select.disabled = false;
    
    // Add default select
    const defOpt = document.createElement("option");
    defOpt.value = "";
    defOpt.textContent = "-- Pilih Kelompok --";
    defOpt.disabled = true;
    defOpt.selected = true;
    select.appendChild(defOpt);
    
    const groups = getMasterKelompokList() || [];
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });
  }
}

function getMasterKelompokList() {
  return typeof localMasterKelompok !== 'undefined' ? localMasterKelompok : [];
}

function setJadwalFormReadOnly(isReadOnly) {
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";

  document.getElementById("jadwal-form-tingkat").disabled = isReadOnly || isOperator;
  document.getElementById("jadwal-form-jenis").disabled = isReadOnly;
  document.getElementById("jadwal-form-tanggal").disabled = isReadOnly;
  document.getElementById("jadwal-form-waktu-mulai").disabled = isReadOnly;
  document.getElementById("jadwal-form-waktu-selesai").disabled = isReadOnly;
  
  const tingkat = document.getElementById("jadwal-form-tingkat").value;
  document.getElementById("jadwal-form-kelompok").disabled = isReadOnly || isOperator || ["Tingkat Desa", "Tingkat Daerah"].includes(tingkat);
  
  const addRowBtn = document.getElementById("btn-add-materi-pengajar-row");
  if (addRowBtn) addRowBtn.style.display = isReadOnly ? "none" : "inline-flex";
  
  const saveBtn = document.getElementById("pengajian-jadwal-modal-save-btn");
  if (saveBtn) saveBtn.style.display = isReadOnly ? "none" : "inline-flex";
  
  const delBtn = document.getElementById("btn-delete-jadwal-modal");
  if (delBtn) delBtn.style.display = isReadOnly ? "none" : "inline-flex";
  
  const container = document.getElementById("jadwal-materi-pengajar-container");
  if (container) {
    const selects = container.querySelectorAll("select, input");
    selects.forEach(s => s.disabled = isReadOnly);
    const deleteBtns = container.querySelectorAll(".btn-icon.delete");
    deleteBtns.forEach(b => {
      b.style.display = isReadOnly ? "none" : "inline-block";
    });
  }
}

function populatePengajarDatalist() {
  const datalist = document.getElementById("pengajar-datalist");
  if (!datalist) return;
  datalist.innerHTML = "";
  
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  const selectedKelompok = kelompokSel ? kelompokSel.value : "";
  
  const masterPengajar = getMasterPengajarList() || [];
  const jamaah = getJamaahList() || [];
  
  let candidates = [];
  masterPengajar.forEach(mp => {
    const jObj = jamaah.find(j => j.id === mp.id_jamaah);
    if (jObj) {
      candidates.push(jObj);
    }
  });
  
  // Filter candidates by kelompok
  if (selectedKelompok && selectedKelompok !== "Semua" && selectedKelompok !== "Desa" && selectedKelompok !== "Daerah") {
    candidates = candidates.filter(j => j.kelompokPengajian === selectedKelompok);
  }
  
  candidates.forEach(j => {
    const opt = document.createElement("option");
    opt.value = `${j.namaLengkap} (${j.id})`;
    datalist.appendChild(opt);
  });
}

function setRowPengajarValue(inputEl, selectedId = "") {
  if (!selectedId) {
    inputEl.value = "";
    return;
  }
  const jamaah = getJamaahList() || [];
  const jObj = jamaah.find(j => j.id === selectedId);
  if (jObj) {
    inputEl.value = `${jObj.namaLengkap} (${jObj.id})`;
  } else {
    inputEl.value = `Ustadz ID ${selectedId} (Tidak Ditemukan)`;
  }
}

window.onJadwalTingkatChange = function() {
  const tingkat = document.getElementById("jadwal-form-tingkat").value;
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";

  if (tingkat === "Tingkat Desa") {
    let hasDesa = false;
    for (let i = 0; i < kelompokSel.options.length; i++) {
      if (kelompokSel.options[i].value === "Desa") {
        hasDesa = true;
        break;
      }
    }
    if (!hasDesa) {
      const opt = document.createElement("option");
      opt.value = "Desa";
      opt.textContent = "Desa";
      kelompokSel.appendChild(opt);
    }
    kelompokSel.value = "Desa";
    kelompokSel.disabled = true;
  } else if (tingkat === "Tingkat Daerah") {
    let hasDaerah = false;
    for (let i = 0; i < kelompokSel.options.length; i++) {
      if (kelompokSel.options[i].value === "Daerah") {
        hasDaerah = true;
        break;
      }
    }
    if (!hasDaerah) {
      const opt = document.createElement("option");
      opt.value = "Daerah";
      opt.textContent = "Daerah";
      kelompokSel.appendChild(opt);
    }
    kelompokSel.value = "Daerah";
    kelompokSel.disabled = true;
  } else {
    // Tingkat Kelompok
    if (isOperator) {
      kelompokSel.value = currentUser.kelompok;
      kelompokSel.disabled = true;
    } else {
      kelompokSel.disabled = false;
      if (kelompokSel.value === "Desa" || kelompokSel.value === "Daerah") {
        kelompokSel.value = "";
      }
    }
  }
  
  populatePengajarDatalist();
};

window.addMateriPengajarRow = function(materi = "", pengajarId = "") {
  const container = document.getElementById("jadwal-materi-pengajar-container");
  if (!container) return;
  
  const rowId = 'mp-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  const div = document.createElement("div");
  div.className = "materi-pengajar-row";
  div.id = rowId;
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.alignItems = "center";
  div.style.marginBottom = "8px";
  
  // Materi Select
  const materiSelect = document.createElement("select");
  materiSelect.className = "materi-select";
  materiSelect.required = true;
  materiSelect.style.flex = "1";
  materiSelect.innerHTML = '<option value="" disabled selected>-- Pilih Materi --</option>';
  
  const masterMateri = getMasterMateriList() || [];
  masterMateri.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    if (m === materi) opt.selected = true;
    materiSelect.appendChild(opt);
  });
  
  // Pengajar Datalist Input
  const pengajarInput = document.createElement("input");
  pengajarInput.type = "text";
  pengajarInput.className = "pengajar-select";
  pengajarInput.setAttribute("list", "pengajar-datalist");
  pengajarInput.required = true;
  pengajarInput.style.flex = "1";
  pengajarInput.placeholder = "Cari Pengajar...";
  setRowPengajarValue(pengajarInput, pengajarId);
  
  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-icon delete";
  removeBtn.style.padding = "6px 10px";
  removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  removeBtn.onclick = function() {
    div.remove();
  };
  
  div.appendChild(materiSelect);
  div.appendChild(pengajarInput);
  div.appendChild(removeBtn);
  container.appendChild(div);
  
  // Disable if form is read-only
  const isReadOnly = document.getElementById("jadwal-form-jenis").disabled;
  if (isReadOnly) {
    materiSelect.disabled = true;
    pengajarInput.disabled = true;
    removeBtn.style.display = "none";
  }
};

window.onJadwalKelompokChange = function() {
  populatePengajarDatalist();
};

window.saveJadwalPengajianForm = function() {
  const currentUser = getCurrentUser();
  const operatorUsername = currentUser ? currentUser.username : null;
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  
  if (!currentUser || curRoleClean === "user") {
    showToast("Anda tidak memiliki hak akses menyimpan jadwal!", "error");
    return;
  }
  
  const id = document.getElementById("jadwal-form-id").value;
  const tingkat_pengajian = document.getElementById("jadwal-form-tingkat").value;
  const jenis_pengajian = document.getElementById("jadwal-form-jenis").value;
  const tanggal = document.getElementById("jadwal-form-tanggal").value;
  const waktu_mulai = document.getElementById("jadwal-form-waktu-mulai").value;
  const waktu_selesai = document.getElementById("jadwal-form-waktu-selesai").value;
  const kelompok_pengajian = document.getElementById("jadwal-form-kelompok").value;
  
  if (!kelompok_pengajian) {
    showToast("Kelompok pengajian harus diisi!", "warning");
    return;
  }
  
  // Construct materi_pengajar objects
  const materiRows = document.querySelectorAll("#jadwal-materi-pengajar-container .materi-pengajar-row");
  const materi_pengajar = [];
  
  for (const row of materiRows) {
    const materiSelect = row.querySelector(".materi-select");
    const pengajarSelect = row.querySelector(".pengajar-select");
    
    if (materiSelect.value && pengajarSelect.value) {
      const val = pengajarSelect.value;
      const match = val.match(/\((J-\d+)\)/);
      const pId = match ? match[1] : null;
      if (pId) {
        const jObj = getJamaahList().find(j => j.id === pId);
        materi_pengajar.push({
          materi: materiSelect.value,
          pengajar_id: pId,
          pengajar_nama: jObj ? jObj.namaLengkap : "Unknown"
        });
      } else {
        materi_pengajar.push({
          materi: materiSelect.value,
          pengajar_id: val,
          pengajar_nama: val
        });
      }
    }
  }
  
  if (materi_pengajar.length === 0) {
    showToast("Tambahkan minimal satu pasang Materi & Pengajar!", "warning");
    return;
  }
  
  const jadwalData = {
    id: id || null,
    tingkat_pengajian,
    jenis_pengajian,
    tanggal,
    waktu_mulai: waktu_mulai + ":00",
    waktu_selesai: waktu_selesai + ":00",
    materi_pengajar,
    kelompok_pengajian
  };
  
  const saveBtn = document.getElementById("pengajian-jadwal-modal-save-btn");
  const oldText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  
  saveJadwalPengajian(jadwalData, operatorUsername, 
    function(savedItem) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      closeJadwalModal();
      showToast(`Jadwal pengajian ${jenis_pengajian} berhasil disimpan!`, "success");
      renderCalendar();
    },
    function(err) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      showToast("Gagal menyimpan jadwal: " + err.message, "error");
    }
  );
};

function confirmDeleteJadwal(id) {
  if (confirm("Apakah Anda yakin ingin menghapus jadwal pengajian ini? Semua data presensi terkait juga akan dihapus.")) {
    const currentUser = getCurrentUser();
    const operatorUsername = currentUser ? currentUser.username : null;
    
    deleteJadwalPengajian(id, operatorUsername,
      function() {
        closeJadwalModal();
        showToast("Jadwal pengajian berhasil dihapus!", "success");
        renderCalendar();
      },
      function(err) {
        showToast("Gagal menghapus jadwal: " + err.message, "error");
      }
    );
  }
}

// ==========================================
// 3. PRESENSI KEHADIRAN LOGIC
// ==========================================
window.loadPresensiSesiDropdown = function() {
  const select = document.getElementById("presensi-jadwal-select");
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Pilih Sesi Pengajian --</option>';
  
  const schedules = getJadwalPengajianList() || [];
  if (schedules.length === 0) return;
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  let filtered = schedules;
  if (isOperator) {
    filtered = schedules.filter(s => {
      return s.kelompok_pengajian === currentUser.kelompok ||
             s.tingkat_pengajian === "Tingkat Desa" ||
             s.tingkat_pengajian === "Tingkat Daerah";
    });
  }
  
  const filterTingkat = document.getElementById("presensi-filter-tingkat") ? document.getElementById("presensi-filter-tingkat").value : "";
  const filterPeriode = document.getElementById("presensi-filter-periode") ? document.getElementById("presensi-filter-periode").value : "";
  
  if (filterTingkat) {
    filtered = filtered.filter(s => s.tingkat_pengajian === filterTingkat);
  }
  
  if (filterPeriode === "1week") {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    filtered = filtered.filter(s => new Date(s.tanggal) >= oneWeekAgo);
  }
  
  filtered.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    
    const dateStr = formatDateIndo(s.tanggal);
    opt.textContent = `${dateStr} - ${s.jenis_pengajian} [${s.kelompok_pengajian}]`;
    select.appendChild(opt);
  });
};

window.loadPresensiSheet = function() {
  const id = document.getElementById("presensi-jadwal-select").value;
  const infoCard = document.getElementById("presensi-jadwal-info");
  const sheetArea = document.getElementById("presensi-sheet-area");
  
  if (!id) {
    infoCard.style.display = "none";
    sheetArea.style.display = "none";
    return;
  }
  
  const schedules = getJadwalPengajianList() || [];
  const sched = schedules.find(s => s.id == id);
  if (!sched) return;
  
  // Render Info
  infoCard.style.display = "block";
  sheetArea.style.display = "block";
  
  const dateStr = formatDateIndo(sched.tanggal);
  const timeStr = `${sched.waktu_mulai.substring(0, 5)} - ${sched.waktu_selesai.substring(0, 5)}`;
  const materiStr = sched.materi_pengajar.map(m => `<strong>${m.materi}</strong> (Ustadz: ${m.pengajar_nama})`).join(", ");
  
  infoCard.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.88rem; line-height: 1.5;">
      <div><strong>Tingkat:</strong> ${sched.tingkat_pengajian}</div>
      <div><strong>Jenis:</strong> ${sched.jenis_pengajian}</div>
      <div><strong>Waktu:</strong> ${dateStr}, Jam ${timeStr} WIB</div>
      <div><strong>Kelompok Pembuat:</strong> ${sched.kelompok_pengajian}</div>
      <div style="grid-column: span 12; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 5px;">
        <strong>Detail Materi & Pengajar:</strong> ${materiStr}
      </div>
    </div>
  `;
  
  renderPresensiTable(sched);
};

let currentPresensiList = []; // Kept in memory to track changes

function renderPresensiTable(session) {
  const tbody = document.getElementById("presensi-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  const allJamaah = getJamaahList() || [];
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  let targetJamaah = allJamaah;
  if (isOperator) {
    targetJamaah = allJamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
  } else {
    if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
      targetJamaah = allJamaah.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
    }
  }
  
  // Apply automatic filtering based on jenis_pengajian
  const jenis = (session.jenis_pengajian || "").trim().toLowerCase();
  targetJamaah = targetJamaah.filter(j => {
    const peramutan = (j.kelompokPeramutan || "").trim();
    const gender = (j.jenisKelamin || "").trim();
    
    if (jenis === "sambung") {
      return ["Dewasa", "Manula", "GUM"].includes(peramutan);
    } else if (jenis === "5 unsur") {
      return ["Dewasa", "Manula", "GUM"].includes(peramutan);
    } else if (jenis === "gus") {
      return peramutan === "GUS";
    } else if (jenis === "gum") {
      return peramutan === "GUM";
    } else if (jenis === "gabungan gus dan gum") {
      return ["GUS", "GUM"].includes(peramutan);
    } else if (jenis === "caberawit") {
      return ["PAUD", "Caberawit"].includes(peramutan);
    } else if (jenis === "ibu-ibu" || jenis === "ibu - ibu") {
      return ["Dewasa", "Manula"].includes(peramutan) && gender === "Perempuan";
    } else {
      return true;
    }
  });
  
  if (targetJamaah.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada jamaah yang memenuhi kriteria untuk jenis pengajian ini.</td></tr>';
    return;
  }
  
  const presensiDb = getPresensiKehadiranList() || [];
  const sessionPresensi = presensiDb.filter(p => p.id_pengajian == session.id);
  
  currentPresensiList = targetJamaah.map(j => {
    const exist = sessionPresensi.find(p => p.id_jamaah === j.id);
    return {
      id_jamaah: j.id,
      nama: j.namaLengkap,
      gender: j.jenisKelamin,
      peramutan: j.kelompokPeramutan,
      status: exist ? exist.status : "Alpha",
      keterangan: exist ? exist.keterangan || "" : ""
    };
  });
  
  currentPresensiList.sort((a, b) => a.nama.localeCompare(b.nama));
  
  fillPresensiDOM();
}

function fillPresensiDOM() {
  const tbody = document.getElementById("presensi-table-body");
  tbody.innerHTML = "";
  
  const searchQuery = document.getElementById("presensi-search").value.trim().toLowerCase();
  const genderFilter = document.getElementById("presensi-gender-filter").value;
  
  let filtered = currentPresensiList;
  if (searchQuery) filtered = filtered.filter(p => p.nama.toLowerCase().includes(searchQuery));
  if (genderFilter) filtered = filtered.filter(p => p.gender === genderFilter);
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada jamaah yang cocok dengan filter pencarian.</td></tr>';
    return;
  }
  
  filtered.forEach((p, index) => {
    const tr = document.createElement("tr");
    
    const statuses = ["Hadir Fisik", "Online", "Izin", "Alpha"];
    let statusRadioHtml = `<div style="display: flex; gap: 16px; justify-content: center; align-items: center; width: 100%;">`;
    
    statuses.forEach(st => {
      const isChecked = p.status === st;
      const color = st === "Hadir Fisik" ? "#10b981" : st === "Online" ? "#3b82f6" : st === "Izin" ? "#f59e0b" : "#ef4444";
      statusRadioHtml += `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 1rem; cursor: pointer; font-weight: 600;">
          <input type="radio" name="status-${p.id_jamaah}" value="${st}" ${isChecked ? 'checked' : ''} onchange="updatePresensiStatusInMem('${p.id_jamaah}', '${st}')" style="width: 18px; height: 18px; margin: 0; cursor: pointer;">
          <span style="color: ${color};">${st}</span>
        </label>
      `;
    });
    statusRadioHtml += `</div>`;
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${p.nama}</strong><span style="display:block; font-size:0.75rem; color:var(--text-secondary);">${p.id_jamaah}</span></td>
      <td>${p.gender === "Laki-laki" ? "L" : "P"}</td>
      <td><span class="status-badge status-active" style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); border: 1px solid var(--border-color);">${p.peramutan}</span></td>
      <td>${statusRadioHtml}</td>
      <td><input type="text" value="${p.keterangan}" class="form-control" style="width: 100%; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px;" placeholder="Isi alasan..." onchange="updatePresensiKetInMem('${p.id_jamaah}', this.value)"></td>
    `;
    
    tbody.appendChild(tr);
  });
}

window.updatePresensiStatusInMem = function(jamaahId, status) {
  const item = currentPresensiList.find(x => x.id_jamaah === jamaahId);
  if (item) item.status = status;
};

window.updatePresensiKetInMem = function(jamaahId, val) {
  const item = currentPresensiList.find(x => x.id_jamaah === jamaahId);
  if (item) item.keterangan = val;
};

window.filterPresensiTable = function() {
  fillPresensiDOM();
};

window.submitPresensiKehadiran = function() {
  const currentUser = getCurrentUser();
  const operatorUsername = currentUser ? currentUser.username : null;
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  
  if (!currentUser || curRoleClean === "user") {
    showToast("Anda tidak memiliki hak akses untuk menyimpan presensi!", "error");
    return;
  }
  
  const id_pengajian = document.getElementById("presensi-jadwal-select").value;
  if (!id_pengajian) return;
  
  const dataToSubmit = currentPresensiList.map(p => ({
    id_pengajian: id_pengajian,
    id_jamaah: p.id_jamaah,
    status: p.status,
    keterangan: p.keterangan
  }));
  
  const saveBtn = document.getElementById("btn-save-presensi");
  const oldText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Presensi...';
  
  savePresensiKehadiran(id_pengajian, dataToSubmit, operatorUsername,
    function() {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      showToast("Presensi pengajian berhasil disimpan!", "success");
      fetchDatabaseFromServer(function() {
        loadPresensiSheet();
      });
    },
    function(err) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      showToast("Gagal menyimpan presensi: " + err.message, "error");
    }
  );
};

// ==========================================
// 4. MONITORING KEHADIRAN LOGIC
// ==========================================
function initMonitoringFilters() {
  const selectKelompok = document.getElementById("monitor-kelompok");
  const selectJenis = document.getElementById("monitor-jenis");
  
  if (selectKelompok && selectKelompok.children.length === 0) {
    selectKelompok.innerHTML = "";
    
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    const isOperator = curRoleClean === "operator kelompok";
    
    if (isOperator) {
      const opt = document.createElement("option");
      opt.value = currentUser.kelompok;
      opt.textContent = currentUser.kelompok;
      opt.selected = true;
      selectKelompok.appendChild(opt);
      selectKelompok.disabled = true;
    } else {
      selectKelompok.disabled = false;
      const defOpt = document.createElement("option");
      defOpt.value = "";
      defOpt.textContent = "Semua Kelompok";
      defOpt.selected = true;
      selectKelompok.appendChild(defOpt);
      
      const groups = getMasterKelompokList() || [];
      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        selectKelompok.appendChild(opt);
      });
    }
  }

  if (selectJenis && selectJenis.children.length <= 1) {
    const currentVal = selectJenis.value;
    selectJenis.innerHTML = '<option value="">Semua Jenis Pengajian</option>';
    const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
    list.forEach(item => {
      const opt = document.createElement("option");
      const val = typeof item === 'object' ? item.nama : item;
      opt.value = val;
      opt.textContent = val;
      selectJenis.appendChild(opt);
    });
    if (currentVal) {
      selectJenis.value = currentVal;
    }
  }
}

window.calculateAndRenderMonitoring = function(isSesiChange = false) {
  initMonitoringFilters();
  
  const filterTingkat = document.getElementById("monitor-tingkat").value;
  const filterJenis = document.getElementById("monitor-jenis").value;
  const filterPeriod = document.getElementById("monitor-periode").value;
  
  const schedules = getJadwalPengajianList() || [];
  const presensiDb = getPresensiKehadiranList() || [];
  const jamaah = getJamaahList() || [];
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  // Filter schedules by tingkat, jenis, period
  let periodSchedules = schedules;
  if (filterTingkat) {
    periodSchedules = periodSchedules.filter(s => s.tingkat_pengajian === filterTingkat);
  }
  if (filterJenis) {
    periodSchedules = periodSchedules.filter(s => s.jenis_pengajian === filterJenis);
  }
  
  // Time period filter
  const today = new Date();
  if (filterPeriod === "weekly") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    periodSchedules = periodSchedules.filter(s => new Date(s.tanggal) >= sevenDaysAgo);
  } else if (filterPeriod === "monthly") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    periodSchedules = periodSchedules.filter(s => new Date(s.tanggal) >= thirtyDaysAgo);
  }
  
  // Update session filter select options if not triggered by it
  const sesiSelect = document.getElementById("monitor-sesi");
  if (!isSesiChange && sesiSelect) {
    const currentVal = sesiSelect.value;
    sesiSelect.innerHTML = '<option value="">Semua Sesi</option>';
    periodSchedules.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.jenis_pengajian} - ${formatDateIndo(s.tanggal)} (${s.kelompok_pengajian})`;
      sesiSelect.appendChild(opt);
    });
    if (periodSchedules.some(s => s.id == currentVal)) {
      sesiSelect.value = currentVal;
    } else {
      sesiSelect.value = "";
    }
  }
  
  const selectedSesiId = sesiSelect ? sesiSelect.value : "";
  let filteredSchedules = periodSchedules;
  if (selectedSesiId) {
    filteredSchedules = periodSchedules.filter(s => s.id == selectedSesiId);
  }
  
  const totalSesi = filteredSchedules.length;
  document.getElementById("monitor-total-sesi").textContent = totalSesi;
  
  if (totalSesi === 0) {
    document.getElementById("monitor-avg-kehadiran").textContent = "0%";
    document.getElementById("monitor-stat-fisik-val").textContent = "0 (0%)";
    document.getElementById("monitor-stat-online-val").textContent = "0 (0%)";
    document.getElementById("monitor-stat-izin-val").textContent = "0 (0%)";
    document.getElementById("monitor-stat-alpha-val").textContent = "0 (0%)";
    document.getElementById("monitor-pb-fisik").style.width = "0%";
    document.getElementById("monitor-pb-online").style.width = "0%";
    document.getElementById("monitor-pb-izin").style.width = "0%";
    document.getElementById("monitor-pb-alpha").style.width = "0%";
    document.getElementById("monitor-gender-l-val").textContent = "0 (0%)";
    document.getElementById("monitor-gender-p-val").textContent = "0 (0%)";
    document.getElementById("monitor-pb-gender-l").style.width = "0%";
    document.getElementById("monitor-pb-gender-p").style.width = "0%";
    
    const tbody = document.getElementById("monitor-table-body");
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Belum ada data sesi pengajian.</td></tr>';
    return;
  }
  
  // Gather active presensi records and compute overall statistics
  const targetJamaahForStats = isOperator ? jamaah.filter(j => j.kelompokPengajian === currentUser.kelompok) : jamaah;

  // Build a lookup map for presensi
  const presensiMap = {};
  presensiDb.forEach(p => {
    presensiMap[`${p.id_pengajian}_${p.id_jamaah}`] = p.status;
  });

  // Kehadiran Stats
  let countFisik = 0;
  let countOnline = 0;
  let countIzin = 0;
  let countAlpha = 0;
  let grandTotal = 0;

  // Keaktifan per Gender
  let totalMaleMarked = 0;
  let presentMaleMarked = 0;
  let totalFemaleMarked = 0;
  let presentFemaleMarked = 0;

  filteredSchedules.forEach(s => {
    const jenis = s.jenis_pengajian || "";
    targetJamaahForStats.forEach(j => {
      if (isJamaahEligibleForJenis(j, jenis)) {
        const inKelompok = s.tingkat_pengajian === "Tingkat Desa" ||
                           s.tingkat_pengajian === "Tingkat Daerah" ||
                           s.kelompok_pengajian === j.kelompokPengajian;
        if (inKelompok) {
          grandTotal++;
          const status = presensiMap[`${s.id}_${j.id}`] || "Alpha";

          if (status === "Hadir Fisik") countFisik++;
          else if (status === "Online") countOnline++;
          else if (status === "Izin") countIzin++;
          else if (status === "Alpha") countAlpha++;

          if (j.jenisKelamin === "Laki-laki") {
            totalMaleMarked++;
            if (status === "Hadir Fisik" || status === "Online") presentMaleMarked++;
          } else if (j.jenisKelamin === "Perempuan") {
            totalFemaleMarked++;
            if (status === "Hadir Fisik" || status === "Online") presentFemaleMarked++;
          }
        }
      }
    });
  });

  const pctFisik = grandTotal > 0 ? Math.round((countFisik / grandTotal) * 100) : 0;
  const pctOnline = grandTotal > 0 ? Math.round((countOnline / grandTotal) * 100) : 0;
  const pctIzin = grandTotal > 0 ? Math.round((countIzin / grandTotal) * 100) : 0;
  const pctAlpha = grandTotal > 0 ? Math.round((countAlpha / grandTotal) * 100) : 0;
  
  // Avg presence (Fisik + Online)
  const totalPresence = countFisik + countOnline;
  const avgKehadiran = grandTotal > 0 ? Math.round((totalPresence / grandTotal) * 100) : 0;
  
  document.getElementById("monitor-avg-kehadiran").textContent = avgKehadiran + "%";
  
  document.getElementById("monitor-stat-fisik-val").textContent = `${countFisik} (${pctFisik}%)`;
  document.getElementById("monitor-stat-online-val").textContent = `${countOnline} (${pctOnline}%)`;
  document.getElementById("monitor-stat-izin-val").textContent = `${countIzin} (${pctIzin}%)`;
  document.getElementById("monitor-stat-alpha-val").textContent = `${countAlpha} (${pctAlpha}%)`;
  
  document.getElementById("monitor-pb-fisik").style.width = pctFisik + "%";
  document.getElementById("monitor-pb-online").style.width = pctOnline + "%";
  document.getElementById("monitor-pb-izin").style.width = pctIzin + "%";
  document.getElementById("monitor-pb-alpha").style.width = pctAlpha + "%";
  
  const pctGenderL = totalMaleMarked > 0 ? Math.round((presentMaleMarked / totalMaleMarked) * 100) : 0;
  const pctGenderP = totalFemaleMarked > 0 ? Math.round((presentFemaleMarked / totalFemaleMarked) * 100) : 0;
  
  document.getElementById("monitor-gender-l-val").textContent = `${presentMaleMarked}/${totalMaleMarked} (${pctGenderL}%)`;
  document.getElementById("monitor-gender-p-val").textContent = `${presentFemaleMarked}/${totalFemaleMarked} (${pctGenderP}%)`;
  
  document.getElementById("monitor-pb-gender-l").style.width = pctGenderL + "%";
  document.getElementById("monitor-pb-gender-p").style.width = pctGenderP + "%";
  
  // Render Individual keaktifan table
  renderIndividualMonitoringTable(filteredSchedules, presensiMap);
};

let currentMonitoringTableData = [];

// Helper: returns list of kelompok_peramutan that are eligible for a given jenis_pengajian
function getEligiblePeramutanForJenis(jenis) {
  const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
  
  // Special cases override
  if (jClean === "ibu-ibu" || jClean === "ibu--ibu" || jClean === "ibuibu") {
    return ["Dewasa", "Manula"];
  }
  if (jClean === "kewanitaan") {
    return ["Dewasa", "Manula", "GUS", "GUM"];
  }
  
  // Dynamic lookup
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  const match = list.find(item => {
    const name = typeof item === 'object' ? item.nama : item;
    return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
  });
  
  if (match && typeof match === 'object' && match.peserta_pengajian) {
    return match.peserta_pengajian.split(",").map(p => p.trim()).filter(Boolean);
  }
  
  // Fallback to static mapping if not found dynamically
  if (jClean === "sambung" || jClean === "5unsur") {
    return ["Dewasa", "Manula", "GUM"];
  } else if (jClean === "gus") {
    return ["GUS"];
  } else if (jClean === "gum") {
    return ["GUM"];
  } else if (jClean === "gabungangusdangum") {
    return ["GUS", "GUM"];
  } else if (jClean === "caberawit") {
    return ["PAUD", "Caberawit"];
  } else if (jClean === "teks" || jClean === "turbadesa" || jClean === "turbadaerah") {
    return ["Dewasa", "Manula", "GUM", "GUS"];
  }
  
  return null; // no restriction
}

// Returns true if jamaah j is eligible to attend a session with given jenis_pengajian
function isJamaahEligibleForJenis(j, jenis) {
  const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
  
  // Gender restriction for Ibu-ibu & Kewanitaan
  if (jClean === "ibu-ibu" || jClean === "ibu--ibu" || jClean === "ibuibu" || jClean === "kewanitaan") {
    if ((j.jenisKelamin || "").trim() !== "Perempuan") {
      return false;
    }
  }
  
  const allowedPeramutan = getEligiblePeramutanForJenis(jenis);
  if (allowedPeramutan === null) return true; // no restriction
  
  const peramutan = (j.kelompokPeramutan || "").trim().toLowerCase();
  return allowedPeramutan.some(p => p.toLowerCase() === peramutan);
}

function renderIndividualMonitoringTable(filteredSchedules, presensiMap) {
  const jamaah = getJamaahList() || [];
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  // Full jamaah list (optionally filtered by operator's kelompok)
  let targetJamaah = jamaah;
  if (isOperator) {
    targetJamaah = jamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
  }
  
  const filterJenis = document.getElementById("monitor-jenis") ? document.getElementById("monitor-jenis").value : "";
  
  // Only include jamaah relevant to filterJenis or at least one session in the schedules
  let displayJamaah = targetJamaah;
  if (filterJenis) {
    displayJamaah = targetJamaah.filter(j => isJamaahEligibleForJenis(j, filterJenis));
  } else {
    const relevantJamaahIds = new Set();
    filteredSchedules.forEach(s => {
      const jenis = s.jenis_pengajian || "";
      targetJamaah.forEach(j => {
        if (isJamaahEligibleForJenis(j, jenis)) {
          // Eligible for this session's kelompok too
          const inKelompok = s.tingkat_pengajian === "Tingkat Desa" ||
                             s.tingkat_pengajian === "Tingkat Daerah" ||
                             s.kelompok_pengajian === j.kelompokPengajian;
          if (inKelompok) relevantJamaahIds.add(j.id);
        }
      });
    });
    displayJamaah = targetJamaah.filter(j => relevantJamaahIds.size === 0 || relevantJamaahIds.has(j.id));
  }
  
  currentMonitoringTableData = displayJamaah.map(j => {
    // Total sessions this jamaah was eligible to attend
    const relevantSessions = filteredSchedules.filter(s => {
      const inKelompok = s.tingkat_pengajian === "Tingkat Desa" ||
                         s.tingkat_pengajian === "Tingkat Daerah" ||
                         s.kelompok_pengajian === j.kelompokPengajian;
      return inKelompok && isJamaahEligibleForJenis(j, s.jenis_pengajian);
    });
    
    const jTotalSesi = relevantSessions.length;
    
    let fisik = 0;
    let online = 0;
    let izin = 0;
    let alpha = 0;
    
    relevantSessions.forEach(s => {
      const status = presensiMap[`${s.id}_${j.id}`] || "Alpha";
      if (status === "Hadir Fisik") fisik++;
      else if (status === "Online") online++;
      else if (status === "Izin") izin++;
      else if (status === "Alpha") alpha++;
    });
    
    const attended = fisik + online;
    const pct = jTotalSesi > 0 ? Math.round((attended / jTotalSesi) * 100) : 0;
    
    return {
      id: j.id,
      nama: j.namaLengkap,
      peramutan: j.kelompokPeramutan,
      kelompokPengajian: j.kelompokPengajian,
      totalSesi: jTotalSesi,
      fisik,
      online,
      izin,
      alpha,
      pct
    };
  });
  
  currentMonitoringTableData.sort((a, b) => b.pct - a.pct);
  
  fillMonitoringDOM();
}

function fillMonitoringDOM() {
  const tbody = document.getElementById("monitor-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const search = document.getElementById("monitor-search").value.trim().toLowerCase();
  const filterKelompok = document.getElementById("monitor-kelompok") ? document.getElementById("monitor-kelompok").value : "";
  
  let filtered = currentMonitoringTableData;
  if (search) {
    filtered = filtered.filter(p => p.nama.toLowerCase().includes(search));
  }
  if (filterKelompok) {
    filtered = filtered.filter(p => p.kelompokPengajian === filterKelompok);
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada data keaktifan jamaah ditemukan.</td></tr>';
    return;
  }
  
  filtered.forEach((p, index) => {
    const tr = document.createElement("tr");
    
    let pctColor = "#ef4444";
    if (p.pct >= 80) pctColor = "#10b981";
    else if (p.pct >= 50) pctColor = "#f59e0b";
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${p.nama}</strong><span style="display:block; font-size:0.75rem; color:var(--text-secondary);">${p.id}</span></td>
      <td><span class="status-badge status-active" style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); border: 1px solid var(--border-color);">${p.peramutan}</span></td>
      <td style="text-align: center;">${p.totalSesi} Sesi</td>
      <td style="text-align: center; color:#10b981; font-weight: 600;">${p.fisik}</td>
      <td style="text-align: center; color:#3b82f6; font-weight: 600;">${p.online}</td>
      <td style="text-align: center; color:#f59e0b; font-weight: 600;">${p.izin}</td>
      <td style="text-align: center; color:#ef4444; font-weight: 600;">${p.alpha}</td>
      <td style="text-align: center;">
        <div style="font-weight: 800; color: ${pctColor};">${p.pct}%</div>
        <div class="progress-container" style="height: 4px; margin-top: 5px; background: rgba(255,255,255,0.05);"><div class="progress-bar" style="width: ${p.pct}%; background: ${pctColor};"></div></div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

window.filterMonitoringTable = function() {
  fillMonitoringDOM();
};
