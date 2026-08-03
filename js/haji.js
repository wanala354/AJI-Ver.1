// ============================================================
// MODUL DATA HAJI JAMAAH (VERSION 3.2.0)
// ============================================================

/**
 * Inisialisasi Modul Data Haji saat section-haji diakses
 */
function initHajiModule() {
  populateHajiKelompokFilter();
  populateHajiJamaahSelect();
  renderHajiTable();
}

/**
 * Mengisi dropdown filter kelompok pengajian di section Data Haji
 */
function populateHajiKelompokFilter() {
  const filterKelompok = document.getElementById("haji-filter-kelompok");
  if (!filterKelompok) return;

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const userRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";

  filterKelompok.innerHTML = '<option value="">Semua Kelompok</option>';

  const kelompokList = typeof localMasterKelompok !== "undefined" && Array.isArray(localMasterKelompok)
    ? localMasterKelompok.map(k => typeof k === "string" ? k : k.nama)
    : [];

  kelompokList.forEach(kNama => {
    const opt = document.createElement("option");
    opt.value = kNama;
    opt.textContent = kNama;
    filterKelompok.appendChild(opt);
  });

  // Kunci filter jika login sebagai Operator Kelompok
  if (currentUser && (userRoleClean === "operator kelompok" || userRoleClean === "pengurus kelompok") && currentUser.kelompok) {
    filterKelompok.value = currentUser.kelompok;
    filterKelompok.disabled = true;
  } else {
    filterKelompok.disabled = false;
  }
}

/**
 * Mengisi dropdown pilih jamaah di modal form haji
 */
function populateHajiJamaahSelect() {
  const selectJamaah = document.getElementById("haji-jamaah-id");
  if (!selectJamaah) return;

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const userRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";

  selectJamaah.innerHTML = '<option value="">-- Pilih Jamaah --</option>';

  let jamaahList = typeof localJamaahList !== "undefined" ? localJamaahList : [];

  // Filter jamaah sesuai kelompok jika operator kelompok
  if (currentUser && (userRoleClean === "operator kelompok" || userRoleClean === "pengurus kelompok") && currentUser.kelompok) {
    jamaahList = jamaahList.filter(j => j.kelompokPengajian === currentUser.kelompok);
  }

  // Urutkan berdasarkan nama
  const sorted = [...jamaahList].sort((a, b) => (a.namaLengkap || "").localeCompare(b.namaLengkap || ""));

  sorted.forEach(j => {
    const opt = document.createElement("option");
    opt.value = j.id;
    opt.textContent = `${j.namaLengkap} (${j.id} - ${j.kelompokPengajian || 'Tanpa Kelompok'})`;
    selectJamaah.appendChild(opt);
  });
}

/**
 * Listener saat Jamaah dipilih pada modal form haji
 */
function onHajiJamaahSelected() {
  const selectJamaah = document.getElementById("haji-jamaah-id");
  const wrapper = document.getElementById("haji-kelompok-info-wrapper");
  const display = document.getElementById("haji-jamaah-kelompok-display");
  if (!selectJamaah || !display) return;

  const jamaahId = selectJamaah.value;
  if (!jamaahId) {
    if (wrapper) wrapper.style.display = "none";
    display.textContent = "-";
    return;
  }

  const jamaah = (typeof localJamaahList !== "undefined" ? localJamaahList : []).find(j => j.id === jamaahId);
  if (jamaah) {
    if (wrapper) wrapper.style.display = "block";
    display.textContent = `${jamaah.kelompokPengajian || '-'} | ID: ${jamaah.id} | Gender: ${jamaah.jenisKelamin || '-'}`;
  } else {
    if (wrapper) wrapper.style.display = "none";
  }
}

/**
 * Toggle visibilitas field kondisional pada modal haji berdasarkan status haji
 */
function toggleHajiFormFields() {
  const selectedStatus = document.querySelector('input[name="haji-status"]:checked')?.value || "Belum Berangkat";
  const fieldsBelum = document.getElementById("haji-fields-belum");
  const fieldsSudah = document.getElementById("haji-fields-sudah");

  if (selectedStatus === "Belum Berangkat") {
    if (fieldsBelum) fieldsBelum.style.display = "grid";
    if (fieldsSudah) fieldsSudah.style.display = "none";
  } else {
    if (fieldsBelum) fieldsBelum.style.display = "none";
    if (fieldsSudah) fieldsSudah.style.display = "block";
  }
}

/**
 * Membuka Modal Form Data Haji (Tambah / Edit)
 */
function openHajiModal(editId = null) {
  populateHajiJamaahSelect();

  const modal = document.getElementById("modal-haji");
  const form = document.getElementById("form-haji");
  const titleEl = document.getElementById("modal-haji-title");
  const editIdEl = document.getElementById("haji-edit-id");

  if (!modal || !form) return;

  form.reset();
  if (editIdEl) editIdEl.value = "";

  if (editId) {
    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Data Haji`;
    const item = (typeof localDataHaji !== "undefined" ? localDataHaji : []).find(h => String(h.id) === String(editId));

    if (item) {
      if (editIdEl) editIdEl.value = item.id;
      const selectJamaah = document.getElementById("haji-jamaah-id");
      if (selectJamaah) selectJamaah.value = item.jamaahId || "";

      const radioStatus = document.querySelector(`input[name="haji-status"][value="${item.statusHaji}"]`);
      if (radioStatus) radioStatus.checked = true;

      const inputKursi = document.getElementById("haji-nomor-kursi");
      if (inputKursi) inputKursi.value = item.nomorKursi || "";

      const inputRencanaThn = document.getElementById("haji-rencana-tahun");
      if (inputRencanaThn) inputRencanaThn.value = item.rencanaTahunBerangkat || "";

      const inputThnSudah = document.getElementById("haji-tahun-berangkat");
      if (inputThnSudah) inputThnSudah.value = item.tahunBerangkat || "";

      const inputCatatan = document.getElementById("haji-catatan");
      if (inputCatatan) inputCatatan.value = item.catatan || "";
    }
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-kaaba"></i> Tambah Data Haji`;
    const defaultRadio = document.querySelector('input[name="haji-status"][value="Belum Berangkat"]');
    if (defaultRadio) defaultRadio.checked = true;
  }

  toggleHajiFormFields();
  onHajiJamaahSelected();
  modal.style.display = "flex";
  modal.classList.add("active");
}

/**
 * Menutup Modal Form Data Haji
 */
function closeHajiModal() {
  const modal = document.getElementById("modal-haji");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
}

/**
 * Menyimpan data haji (Submit form modal)
 */
function saveHajiData() {
  const editId = document.getElementById("haji-edit-id")?.value || null;
  const jamaahId = document.getElementById("haji-jamaah-id")?.value;
  const statusHaji = document.querySelector('input[name="haji-status"]:checked')?.value || "Belum Berangkat";
  const nomorKursi = document.getElementById("haji-nomor-kursi")?.value.trim() || "";
  const rencanaTahun = document.getElementById("haji-rencana-tahun")?.value || null;
  const tahunBerangkat = document.getElementById("haji-tahun-berangkat")?.value || null;
  const catatan = document.getElementById("haji-catatan")?.value.trim() || "";

  if (!jamaahId) {
    if (typeof showToast === "function") showToast("Silakan pilih Jamaah terlebih dahulu!", "warning");
    return;
  }

  // Cek duplikasi jamaahId jika data baru
  if (!editId) {
    const existing = (typeof localDataHaji !== "undefined" ? localDataHaji : []).find(h => h.jamaahId === jamaahId);
    if (existing) {
      if (typeof showToast === "function") showToast("Data haji untuk jamaah ini sudah terdaftar!", "warning");
      return;
    }
  }

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const operatorUsername = currentUser ? currentUser.username : "System";

  const hajiData = {
    id: editId,
    jamaahId: jamaahId,
    statusHaji: statusHaji,
    nomorKursi: statusHaji === "Belum Berangkat" ? nomorKursi : null,
    rencanaTahunBerangkat: statusHaji === "Belum Berangkat" ? (rencanaTahun ? parseInt(rencanaTahun) : null) : null,
    tahunBerangkat: statusHaji === "Sudah Berangkat" ? (tahunBerangkat ? parseInt(tahunBerangkat) : null) : null,
    catatan: catatan
  };

  const saveBtn = document.querySelector("#form-haji button[type='submit']");
  const origText = saveBtn ? saveBtn.innerHTML : "";
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
  }

  const isSupabase = (typeof getUseSupabase === "function" && getUseSupabase()) || (typeof useSupabase !== "undefined" && useSupabase) || (typeof supabaseClient !== "undefined" && supabaseClient);

  if (isSupabase && typeof supabaseSaveDataHaji === "function") {
    supabaseSaveDataHaji(hajiData, operatorUsername)
      .then(() => {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = origText; }
        if (typeof showToast === "function") showToast(editId ? "Data haji berhasil diperbarui!" : "Data haji berhasil ditambahkan!", "success");
        closeHajiModal();
        
        // Refresh data dari server
        if (typeof fetchDatabaseFromServer === "function") {
          fetchDatabaseFromServer(() => renderHajiTable());
        } else {
          renderHajiTable();
        }
      })
      .catch(err => {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = origText; }
        if (typeof showToast === "function") showToast("Gagal menyimpan data haji: " + (err.message || err), "error");
      });
  } else {
    // Fallback lokal jika tanpa database
    if (editId) {
      const idx = localDataHaji.findIndex(h => String(h.id) === String(editId));
      if (idx !== -1) localDataHaji[idx] = { ...localDataHaji[idx], ...hajiData };
    } else {
      hajiData.id = "HJ-" + Date.now();
      localDataHaji.push(hajiData);
    }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = origText; }
    if (typeof showToast === "function") showToast("Data haji berhasil disimpan (mode lokal)!", "success");
    closeHajiModal();
    renderHajiTable();
  }
}

/**
 * Menghapus data haji
 */
function deleteHajiData(id, jamaahNama) {
  if (!confirm(`Apakah Anda yakin ingin menghapus data haji untuk jamaah "${jamaahNama}"?`)) return;

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const operatorUsername = currentUser ? currentUser.username : "System";

  const item = (typeof localDataHaji !== "undefined" ? localDataHaji : []).find(h => String(h.id) === String(id));
  const jamaahId = item ? item.jamaahId : id;

  const isSupabase = (typeof getUseSupabase === "function" && getUseSupabase()) || (typeof useSupabase !== "undefined" && useSupabase) || (typeof supabaseClient !== "undefined" && supabaseClient);

  if (isSupabase && typeof supabaseDeleteDataHaji === "function") {
    supabaseDeleteDataHaji(id, jamaahId, operatorUsername)
      .then(() => {
        if (typeof showToast === "function") showToast("Data haji berhasil dihapus!", "success");
        if (typeof fetchDatabaseFromServer === "function") {
          fetchDatabaseFromServer(() => renderHajiTable());
        } else {
          localDataHaji = localDataHaji.filter(h => String(h.id) !== String(id));
          renderHajiTable();
        }
      })
      .catch(err => {
        if (typeof showToast === "function") showToast("Gagal menghapus data haji: " + (err.message || err), "error");
      });
  } else {
    localDataHaji = localDataHaji.filter(h => String(h.id) !== String(id));
    if (typeof showToast === "function") showToast("Data haji berhasil dihapus (mode lokal)!", "success");
    renderHajiTable();
  }
}

/**
 * Render Tabel Data Haji beserta Statistik dan Filter
 */
function renderHajiTable() {
  const tbody = document.getElementById("table-haji-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("haji-filter-search")?.value || "").toLowerCase().trim();
  const kelompokVal = document.getElementById("haji-filter-kelompok")?.value || "";
  const statusVal = document.getElementById("haji-filter-status")?.value || "";

  const allHaji = typeof localDataHaji !== "undefined" ? localDataHaji : [];
  const jamaahList = typeof localJamaahList !== "undefined" ? localJamaahList : [];

  // Map data haji dengan data jamaah
  const mappedList = allHaji.map(h => {
    const j = jamaahList.find(jamaah => jamaah.id === h.jamaahId) || {};
    return {
      ...h,
      namaLengkap: j.namaLengkap || "Tidak Diketahui",
      kelompokPengajian: j.kelompokPengajian || "Tanpa Kelompok"
    };
  });

  // Hitung Statistik Utama (sebelum filter pencarian)
  const totalCount = mappedList.length;
  const sudahCount = mappedList.filter(h => h.statusHaji === "Sudah Berangkat").length;
  const belumCount = mappedList.filter(h => h.statusHaji === "Belum Berangkat").length;

  const statTotal = document.getElementById("haji-stat-total");
  const statSudah = document.getElementById("haji-stat-sudah");
  const statBelum = document.getElementById("haji-stat-belum");
  if (statTotal) statTotal.textContent = totalCount;
  if (statSudah) statSudah.textContent = sudahCount;
  if (statBelum) statBelum.textContent = belumCount;

  // Filter Data
  const filtered = mappedList.filter(h => {
    // Filter Kelompok
    if (kelompokVal && h.kelompokPengajian !== kelompokVal) return false;
    // Filter Status Haji
    if (statusVal && h.statusHaji !== statusVal) return false;
    // Filter Search (Nama / ID Jamaah / No Kursi)
    if (searchVal) {
      const matchNama = (h.namaLengkap || "").toLowerCase().includes(searchVal);
      const matchId = (h.jamaahId || "").toLowerCase().includes(searchVal);
      const matchKursi = (h.nomorKursi || "").toLowerCase().includes(searchVal);
      if (!matchNama && !matchId && !matchKursi) return false;
    }
    return true;
  });

  // Update Footer Counts
  const shownCountEl = document.getElementById("haji-shown-count");
  const totalCountEl = document.getElementById("haji-total-count");
  if (shownCountEl) shownCountEl.textContent = filtered.length;
  if (totalCountEl) totalCountEl.textContent = totalCount;

  // Render Rows
  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:40px; color:var(--text-secondary);">
          <i class="fa-solid fa-kaaba" style="font-size:2.5rem; margin-bottom:10px; display:block; opacity:0.5;"></i>
          Belum ada data haji yang sesuai filter.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((item, idx) => {
    const tr = document.createElement("tr");

    const badgeStatus = item.statusHaji === "Sudah Berangkat"
      ? `<span class="haji-badge-sudah"><i class="fa-solid fa-circle-check"></i> Sudah Berangkat</span>`
      : `<span class="haji-badge-belum"><i class="fa-solid fa-clock"></i> Belum Berangkat</span>`;

    const noKursiDisplay = item.statusHaji === "Belum Berangkat"
      ? (item.nomorKursi ? `<strong style="color: #ffffff;">${item.nomorKursi}</strong>` : '-')
      : '-';

    const thnBerangkatDisplay = item.statusHaji === "Belum Berangkat"
      ? (item.rencanaTahunBerangkat ? `<span class="haji-badge-tahun">${item.rencanaTahunBerangkat}</span>` : '-')
      : (item.tahunBerangkat ? `<span class="haji-badge-tahun" style="border-color:#10b981; color:#34d399; background:rgba(16,185,129,0.15);">${item.tahunBerangkat}</span>` : '-');

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="font-weight:600; color:var(--text-primary);">${item.jamaahId || '-'}</td>
      <td style="font-weight:700; color:#ffffff;">${item.namaLengkap}</td>
      <td><span class="haji-badge-kelompok">${item.kelompokPengajian}</span></td>
      <td>${badgeStatus}</td>
      <td>${noKursiDisplay}</td>
      <td>${thnBerangkatDisplay}</td>
      <td style="font-size:0.85rem; color:var(--text-secondary);">${item.catatan || '-'}</td>
      <td style="text-align:center;">
        <button class="haji-btn-edit" onclick="openHajiModal('${item.id}')" title="Edit Data Haji">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="haji-btn-delete" onclick="deleteHajiData('${item.id}', '${item.namaLengkap.replace(/'/g, "\\'")}')" title="Hapus Data Haji">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Reset Filter di Modul Data Haji
 */
function resetHajiFilters() {
  const searchInput = document.getElementById("haji-filter-search");
  const statusSelect = document.getElementById("haji-filter-status");
  const kelompokSelect = document.getElementById("haji-filter-kelompok");

  if (searchInput) searchInput.value = "";
  if (statusSelect) statusSelect.value = "";

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const userRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";

  if (kelompokSelect) {
    if (currentUser && (userRoleClean === "operator kelompok" || userRoleClean === "pengurus kelompok") && currentUser.kelompok) {
      kelompokSelect.value = currentUser.kelompok;
    } else {
      kelompokSelect.value = "";
    }
  }

  renderHajiTable();
  if (typeof showToast === "function") showToast("Filter Data Haji dibersihkan.", "info");
}

// Expose fungsi modul haji secara global ke window untuk atribut onclick HTML
window.initHajiModule = initHajiModule;
window.openHajiModal = openHajiModal;
window.closeHajiModal = closeHajiModal;
window.saveHajiData = saveHajiData;
window.deleteHajiData = deleteHajiData;
window.renderHajiTable = renderHajiTable;
window.resetHajiFilters = resetHajiFilters;
window.toggleHajiFormFields = toggleHajiFormFields;
window.onHajiJamaahSelected = onHajiJamaahSelected;

