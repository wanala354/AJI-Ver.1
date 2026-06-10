import {
  initializeDatabase,
  getJamaahList,
  getKepalaKeluargaList,
  getKartuKeluargaMappings,
  getAuditLogs,
  authenticateUser,
  getCurrentUser,
  logoutUser,
  saveJamaah,
  deleteJamaah,
  calculateAge,
  getKelompokPeramutan,
  syncRelationalTables
} from "./database.js";

import {
  MASTER_KELOMPOK,
  MASTER_PENDIDIKAN,
  MASTER_PERNIKAHAN,
  MASTER_HUBUNGAN,
  MASTER_PEKERJAAN,
  MASTER_DAPUAN,
  MASTER_EKONOMI,
  MASTER_KELANCARAN
} from "./mockData.js";

// Global Chart Instances to prevent duplication errors
let charts = {};

// Current editing state
let editingJamaahId = null;

// Document Ready
document.addEventListener("DOMContentLoaded", () => {
  initializeDatabase();
  setupEventListeners();
  checkSession();
  
  // Make demo function global so it can be called from inline HTML click
  window.fillDemoLogin = (user, pass) => {
    document.getElementById("login-username").value = user;
    document.getElementById("login-password").value = pass;
  };
});

// Check if user is logged in
function checkSession() {
  const user = getCurrentUser();
  if (user) {
    showMainApp(user);
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app-container").style.display = "none";
}

function showMainApp(user) {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app-container").style.display = "flex";
  
  // Set User Profile UI
  document.getElementById("nav-user-name").textContent = user.username;
  document.getElementById("nav-user-avatar").textContent = user.username.charAt(0).toUpperCase();
  document.getElementById("nav-user-role").textContent = user.role === "Admin" ? "ADMINISTRATOR" : "USER (LIHAT SAJA)";
  
  // Adjust write privileges based on Role
  const btnAdd = document.getElementById("btn-add-jamaah");
  const accessNote = document.getElementById("table-access-note");
  if (user.role === "Admin") {
    btnAdd.style.display = "inline-flex";
    accessNote.textContent = "Hak Akses: Administrator (Full CRUD Aktif)";
    accessNote.style.color = "#10b981";
  } else {
    btnAdd.style.display = "none";
    accessNote.textContent = "Hak Akses: User (Mode Read-only, Hubungi Admin untuk Perubahan)";
    accessNote.style.color = "#9ca3af";
  }
  
  // Navigate to Dashboard initially
  switchTab("section-dashboard");
  updateNotificationsIndicator();
}

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------
function setupEventListeners() {
  // Login Form
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;
    const errorMsg = document.getElementById("login-error-msg");
    
    const result = authenticateUser(user, pass);
    if (result.success) {
      errorMsg.style.display = "none";
      showMainApp(result.user);
    } else {
      errorMsg.textContent = result.message;
      errorMsg.style.display = "block";
    }
  });

  // Logout Button
  document.getElementById("logout-btn").addEventListener("click", () => {
    logoutUser();
    showLoginScreen();
  });

  // Sidebar Menu Items Navigation
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      const targetSection = item.getAttribute("data-target");
      switchTab(targetSection);
      // Close sidebar on mobile
      document.getElementById("app-sidebar").classList.remove("active");
    });
  });

  // Sidebar Toggle Mobile
  document.getElementById("sidebar-toggle").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("app-sidebar").classList.toggle("active");
  });

  // Close sidebar clicking outside on mobile
  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("app-sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle");
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    }
  });

  // Theme Toggle (Light/Dark Mode)
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const body = document.body;
    const themeIcon = document.getElementById("theme-icon");
    if (body.classList.contains("dark-theme")) {
      body.classList.remove("dark-theme");
      body.classList.add("light-theme");
      themeIcon.className = "fa-solid fa-moon";
    } else {
      body.classList.remove("light-theme");
      body.classList.add("dark-theme");
      themeIcon.className = "fa-solid fa-sun";
    }
    // Re-render dashboard charts to adjust gridline/font colors if active
    if (document.getElementById("section-dashboard").classList.contains("active")) {
      renderDashboardCharts();
    }
  });

  // Notification button navigates to Audit Logs
  document.getElementById("nav-notif-btn").addEventListener("click", () => {
    // find menu item for audit log and click it
    const auditMenuItem = document.querySelector(".sidebar-menu [data-target='section-audit']");
    if (auditMenuItem) {
      auditMenuItem.click();
    }
  });

  // ----------------------------------------------------
  // FILTER TRIGGERS
  // ----------------------------------------------------
  document.getElementById("filter-search").addEventListener("input", filterJamaahTable);
  document.getElementById("filter-kelompok").addEventListener("change", filterJamaahTable);
  document.getElementById("filter-peramutan").addEventListener("change", filterJamaahTable);
  document.getElementById("filter-ekonomi").addEventListener("change", filterJamaahTable);
  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    document.getElementById("filter-search").value = "";
    document.getElementById("filter-kelompok").value = "";
    document.getElementById("filter-peramutan").value = "";
    document.getElementById("filter-ekonomi").value = "";
    filterJamaahTable();
  });

  // Modul KK group filter trigger
  document.getElementById("kk-filter-kelompok").addEventListener("change", () => {
    populateKKList();
  });

  // Modul Report group filter trigger
  document.getElementById("report-filter-kelompok").addEventListener("change", () => {
    calculateAndRenderReport();
  });

  // CSV Export Trigger
  document.getElementById("btn-export-report-csv").addEventListener("click", exportReportToCSV);

  // ----------------------------------------------------
  // DATA MASTER FORM EVENTS & MODAL
  // ----------------------------------------------------
  const modal = document.getElementById("jamaah-modal");
  
  document.getElementById("btn-add-jamaah").addEventListener("click", () => {
    openJamaahModal(null);
  });
  
  document.getElementById("modal-close-btn").addEventListener("click", closeJamaahModal);
  document.getElementById("modal-cancel-btn").addEventListener("click", closeJamaahModal);
  
  // Real-time Age & Peramutan calculations in form
  document.getElementById("form-tanggal-lahir").addEventListener("change", (e) => {
    const birthdate = e.target.value;
    const age = calculateAge(birthdate);
    document.getElementById("form-umur").value = age;
    
    const maritalStatus = document.getElementById("form-pernikahan").value;
    const peramutan = getKelompokPeramutan(age, maritalStatus);
    document.getElementById("form-peramutan").value = peramutan;
  });
  
  document.getElementById("form-pernikahan").addEventListener("change", () => {
    const birthdate = document.getElementById("form-tanggal-lahir").value;
    const age = calculateAge(birthdate);
    const maritalStatus = document.getElementById("form-pernikahan").value;
    const peramutan = getKelompokPeramutan(age, maritalStatus);
    document.getElementById("form-peramutan").value = peramutan;
  });

  // Disable Kepala Keluarga field if selected status is "Kepala Keluarga"
  document.getElementById("form-hubungan").addEventListener("change", updateFormKKState);

  // Save Form Submission
  document.getElementById("jamaah-form").addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Check role again
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "Admin") {
      alert("Error: Anda tidak memiliki akses untuk menambah/mengedit data!");
      return;
    }

    // Capture kelompok radio button selection
    const selectedKelompokRadio = document.querySelector('input[name="form-kelompok"]:checked');
    if (!selectedKelompokRadio) {
      alert("Silakan pilih Kelompok Pengajian!");
      return;
    }
    
    const relationship = document.getElementById("form-hubungan").value;
    const kkId = document.getElementById("form-kepala-keluarga").value;
    if (relationship !== "Kepala Keluarga" && !kkId) {
      alert("Anggota Keluarga wajib dikaitkan dengan Kepala Keluarga!");
      return;
    }

    const jamaahData = {
      id: editingJamaahId,
      namaLengkap: document.getElementById("form-nama").value.trim(),
      kelompokPengajian: selectedKelompokRadio.value,
      jenisKelamin: document.getElementById("form-gender").value,
      tempatLahir: document.getElementById("form-tempat-lahir").value.trim(),
      tanggalLahir: document.getElementById("form-tanggal-lahir").value,
      statusPernikahan: document.getElementById("form-pernikahan").value,
      statusHubunganKeluarga: relationship,
      kepalaKeluargaId: kkId,
      nomorHp: document.getElementById("form-hp").value.trim(),
      tingkatPendidikan: document.getElementById("form-pendidikan").value,
      pekerjaanUtama: document.getElementById("form-pekerjaan").value,
      dapuan: document.getElementById("form-dapuan").value,
      statusEkonomi: document.getElementById("form-ekonomi").value,
      kelancaranSambung: document.getElementById("form-kelancaran").value
    };

    saveJamaah(jamaahData, currentUser.username);
    closeJamaahModal();
    
    // Refresh active section data
    refreshActivePage();
  });

  // ----------------------------------------------------
  // SPREADSHEET TABS CONTROL
  // ----------------------------------------------------
  const tabButtons = document.querySelectorAll("#sheet-tabs-list .sheet-tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const activeSheet = btn.getAttribute("data-sheet");
      renderSpreadsheetGrid(activeSheet);
    });
  });
}

// Refresh whatever view is currently active
function refreshActivePage() {
  const activeSection = document.querySelector(".page-section.active");
  const id = activeSection.id;
  
  if (id === "section-dashboard") {
    loadDashboardKPIs();
    renderDashboardCharts();
  } else if (id === "section-jamaah") {
    populateJamaahTable();
  } else if (id === "section-kartu-keluarga") {
    populateKKList();
  } else if (id === "section-report") {
    calculateAndRenderReport();
  } else if (id === "section-sheets") {
    const activeTab = document.querySelector("#sheet-tabs-list .sheet-tab-btn.active");
    if (activeTab) {
      renderSpreadsheetGrid(activeTab.getAttribute("data-sheet"));
    }
  } else if (id === "section-audit") {
    renderAuditLogs();
  }
  
  updateNotificationsIndicator();
}

// Switch Sidebar tabs
function switchTab(sectionId) {
  // Hide all sections
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  
  // Show target
  const target = document.getElementById(sectionId);
  target.classList.add("active");
  
  // Update Navbar Title
  const titleMap = {
    "section-dashboard": { title: "Dashboard Utama", icon: "fa-chart-pie" },
    "section-jamaah": { title: "Modul Data Jamaah", icon: "fa-users" },
    "section-kartu-keluarga": { title: "Modul Kartu Keluarga Relasional", icon: "fa-file-invoice" },
    "section-report": { title: "Rekapitulasi & Laporan", icon: "fa-file-contract" },
    "section-sheets": { title: "Google Sheets Live Database", icon: "fa-database" },
    "section-audit": { title: "Riwayat Aktivitas & Audit Logs", icon: "fa-history" }
  };
  
  document.getElementById("page-nav-title").innerHTML = `<i class="fa-solid ${titleMap[sectionId].icon}"></i> ${titleMap[sectionId].title}`;
  
  // Init page-specific loaders
  if (sectionId === "section-dashboard") {
    loadDashboardKPIs();
    renderDashboardCharts();
  } else if (sectionId === "section-jamaah") {
    // Populate filter options if empty
    populateFilterOptions();
    populateJamaahTable();
  } else if (sectionId === "section-kartu-keluarga") {
    populateKKFilterOptions();
    populateKKList();
  } else if (sectionId === "section-report") {
    populateReportFilterOptions();
    calculateAndRenderReport();
  } else if (sectionId === "section-sheets") {
    const activeTab = document.querySelector("#sheet-tabs-list .sheet-tab-btn.active");
    renderSpreadsheetGrid(activeTab ? activeTab.getAttribute("data-sheet") : "sheet-jamaah");
  } else if (sectionId === "section-audit") {
    renderAuditLogs();
  }
}

// ----------------------------------------------------
// NOTIFICATION DOT MANAGEMENT
// ----------------------------------------------------
let lastCheckedLogCount = 0;
function updateNotificationsIndicator() {
  const logs = getAuditLogs();
  const currentCount = logs.length;
  const dot = document.getElementById("nav-notif-dot");
  
  if (currentCount > lastCheckedLogCount && lastCheckedLogCount !== 0) {
    dot.style.display = "block";
  } else {
    dot.style.display = "none";
  }
  
  if (document.getElementById("section-audit").classList.contains("active")) {
    lastCheckedLogCount = currentCount;
    dot.style.display = "none";
  }
}

// ----------------------------------------------------
// TAB 1: DASHBOARD LOGIC
// ----------------------------------------------------
function loadDashboardKPIs() {
  const jamaah = getJamaahList();
  const kkList = getKepalaKeluargaList();
  
  // KPI Calculations
  const totalJamaah = jamaah.length;
  const totalKK = kkList.length;
  const totalKelompok = MASTER_KELOMPOK.length;
  
  const totalAghnia = jamaah.filter(j => j.statusEkonomi === "Aghnia").length;
  const totalDhuafa = jamaah.filter(j => j.statusEkonomi === "Dhuafa").length;
  const totalCaberawit = jamaah.filter(j => j.kelompokPeramutan === "Caberawit").length;
  const totalGus = jamaah.filter(j => j.kelompokPeramutan === "GUS").length;
  const totalGum = jamaah.filter(j => j.kelompokPeramutan === "GUM").length;
  
  // Set UI
  document.getElementById("kpi-total-jamaah").textContent = totalJamaah;
  document.getElementById("kpi-total-kk").textContent = totalKK;
  document.getElementById("kpi-total-kelompok").textContent = totalKelompok;
  document.getElementById("kpi-total-caberawit").textContent = totalCaberawit;
  document.getElementById("kpi-total-gus").textContent = totalGus;
  document.getElementById("kpi-total-gum").textContent = totalGum;
  document.getElementById("kpi-total-aghnia").textContent = totalAghnia;
  document.getElementById("kpi-total-dhuafa").textContent = totalDhuafa;
}

function renderDashboardCharts() {
  const jamaah = getJamaahList();
  const isDark = document.body.classList.contains("dark-theme");
  
  const textColor = isDark ? "#9ca3af" : "#4b5563";
  const gridColor = isDark ? "rgba(16, 185, 129, 0.1)" : "#e2e8f0";
  
  // Destroy old charts to clean canvas
  Object.keys(charts).forEach(key => {
    if (charts[key]) charts[key].destroy();
  });
  
  // 1. Chart Kelompok (Bar Chart)
  const kelompokCounts = MASTER_KELOMPOK.map(k => jamaah.filter(j => j.kelompokPengajian === k).length);
  const ctxKelompok = document.getElementById("chart-kelompok").getContext("2d");
  charts.kelompok = new Chart(ctxKelompok, {
    type: "bar",
    data: {
      labels: MASTER_KELOMPOK,
      datasets: [{
        label: "Jumlah Jamaah",
        data: kelompokCounts,
        backgroundColor: "rgba(16, 185, 129, 0.65)",
        borderColor: "#10b981",
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { padding: 12 }
      },
      scales: {
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { display: false }
        }
      }
    }
  });

  // 2. Chart Ekonomi (Pie Chart)
  const ekonomiCounts = MASTER_EKONOMI.map(e => jamaah.filter(j => j.statusEkonomi === e).length);
  const ctxEkonomi = document.getElementById("chart-ekonomi").getContext("2d");
  charts.ekonomi = new Chart(ctxEkonomi, {
    type: "pie",
    data: {
      labels: MASTER_EKONOMI,
      datasets: [{
        data: ekonomiCounts,
        backgroundColor: [
          "rgba(16, 185, 129, 0.7)",  // Aghnia (Green)
          "rgba(245, 158, 11, 0.7)",  // Dhuafa (Amber)
          "rgba(59, 130, 246, 0.7)"   // Menengah (Blue)
        ],
        borderWidth: 1,
        borderColor: isDark ? "#0f251c" : "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: textColor, font: { family: "Outfit" } }
        }
      }
    }
  });

  // 3. Chart Pendidikan (Doughnut Chart)
  const pendidikanCounts = MASTER_PENDIDIKAN.map(p => jamaah.filter(j => j.tingkatPendidikan === p).length);
  const ctxPendidikan = document.getElementById("chart-pendidikan").getContext("2d");
  charts.pendidikan = new Chart(ctxPendidikan, {
    type: "doughnut",
    data: {
      labels: MASTER_PENDIDIKAN,
      datasets: [{
        data: pendidikanCounts,
        backgroundColor: [
          "#38bdf8", "#0284c7", "#34d399", "#059669", "#fbbf24", "#f59e0b", "#c084fc", "#8b5cf6"
        ],
        borderWidth: 1,
        borderColor: isDark ? "#0f251c" : "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: textColor, font: { family: "Outfit" } }
        }
      }
    }
  });

  // 4. Chart Pekerjaan (Horizontal Bar Chart)
  const pekerjaanCounts = MASTER_PEKERJAAN.map(p => jamaah.filter(j => j.pekerjaanUtama === p).length);
  const ctxPekerjaan = document.getElementById("chart-pekerjaan").getContext("2d");
  charts.pekerjaan = new Chart(ctxPekerjaan, {
    type: "bar",
    data: {
      labels: MASTER_PEKERJAAN,
      datasets: [{
        label: "Jumlah Jamaah",
        data: pekerjaanCounts,
        backgroundColor: "rgba(59, 130, 246, 0.65)",
        borderColor: "#3b82f6",
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor },
          grid: { display: false }
        }
      }
    }
  });
}

// ----------------------------------------------------
// TAB 2: MODUL JAMAAH - TABLES & MODAL
// ----------------------------------------------------
function populateFilterOptions() {
  const filterK = document.getElementById("filter-kelompok");
  if (filterK.options.length <= 1) {
    MASTER_KELOMPOK.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      filterK.appendChild(opt);
    });
  }
}

function populateJamaahTable() {
  filterJamaahTable();
}

function filterJamaahTable() {
  const searchVal = document.getElementById("filter-search").value.toLowerCase();
  const kelompokVal = document.getElementById("filter-kelompok").value;
  const peramutanVal = document.getElementById("filter-peramutan").value;
  const ekonomiVal = document.getElementById("filter-ekonomi").value;
  
  const list = getJamaahList();
  
  const filtered = list.filter(j => {
    const matchSearch = j.namaLengkap.toLowerCase().includes(searchVal) || j.id.toLowerCase().includes(searchVal);
    const matchKelompok = kelompokVal === "" || j.kelompokPengajian === kelompokVal;
    const matchPeramutan = peramutanVal === "" || j.kelompokPeramutan === peramutanVal;
    const matchEkonomi = ekonomiVal === "" || j.statusEkonomi === ekonomiVal;
    
    return matchSearch && matchKelompok && matchPeramutan && matchEkonomi;
  });
  
  renderJamaahTableRows(filtered);
}

function renderJamaahTableRows(jamaahList) {
  const tbody = document.getElementById("table-jamaah-body");
  tbody.innerHTML = "";
  
  const currentUser = getCurrentUser();
  const isAdmin = currentUser && currentUser.role === "Admin";
  
  if (jamaahList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 25px; color: var(--text-secondary);">
      <i class="fa-solid fa-triangle-exclamation"></i> Tidak ada data jamaah ditemukan.
    </td></tr>`;
    document.getElementById("jamaah-shown-count").textContent = 0;
    document.getElementById("jamaah-total-count").textContent = getJamaahList().length;
    return;
  }
  
  jamaahList.forEach(j => {
    const tr = document.createElement("tr");
    
    // Kelompok Peramutan badge color
    let peramutanClass = "badge-gray";
    if (j.kelompokPeramutan === "PAUD") peramutanClass = "badge-blue";
    else if (j.kelompokPeramutan === "Caberawit") peramutanClass = "badge-green";
    else if (j.kelompokPeramutan === "GUS") peramutanClass = "badge-purple";
    else if (j.kelompokPeramutan === "GUM") peramutanClass = "badge-yellow";
    else if (j.kelompokPeramutan === "Dewasa") peramutanClass = "badge-green";
    else if (j.kelompokPeramutan === "Manula") peramutanClass = "badge-red";
    
    // Status Ekonomi Badge
    let ekonomiClass = "badge-green";
    if (j.statusEkonomi === "Dhuafa") ekonomiClass = "badge-yellow";
    else if (j.statusEkonomi === "Menengah") ekonomiClass = "badge-blue";
    
    // Kelancaran Sambung Badge
    let sambungClass = "badge-green";
    if (j.kelancaranSambung === "Kurang Lancar") sambungClass = "badge-yellow";
    else if (j.kelancaranSambung === "Perlu Perhatian") sambungClass = "badge-red";
    
    // Edit & Delete Buttons (Visible to Admin, disabled/hidden to User)
    const actionButtons = isAdmin
      ? `<div class="action-btns">
           <button class="btn-icon edit" data-id="${j.id}" title="Edit Data"><i class="fa-solid fa-pen"></i></button>
           <button class="btn-icon delete" data-id="${j.id}" title="Hapus Data"><i class="fa-solid fa-trash"></i></button>
         </div>`
      : `<span style="font-size:0.75rem; color:var(--text-muted);">Read-only</span>`;
      
    tr.innerHTML = `
      <td><strong>${j.id}</strong></td>
      <td>${j.namaLengkap}</td>
      <td>${j.kelompokPengajian}</td>
      <td>${j.jenisKelamin}</td>
      <td>${j.umur} Tahun</td>
      <td><span class="badge ${peramutanClass}">${j.kelompokPeramutan}</span></td>
      <td>${j.statusHubunganKeluarga}</td>
      <td>${j.tingkatPendidikan}</td>
      <td><span class="badge ${ekonomiClass}">${j.statusEkonomi}</span></td>
      <td><span class="badge ${sambungClass}">${j.kelancaranSambung}</span></td>
      <td>${actionButtons}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Attach listeners to dynamically created edit/delete buttons
  if (isAdmin) {
    tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openJamaahModal(id);
      });
    });
    tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const list = getJamaahList();
        const item = list.find(j => j.id === id);
        if (confirm(`Apakah Anda yakin ingin menghapus data Jamaah: "${item.namaLengkap}" (${id})?`)) {
          deleteJamaah(id, currentUser.username);
          refreshActivePage();
        }
      });
    });
  }
  
  document.getElementById("jamaah-shown-count").textContent = jamaahList.length;
  document.getElementById("jamaah-total-count").textContent = getJamaahList().length;
}

// Open Form modal
function openJamaahModal(jamaahId = null) {
  const modal = document.getElementById("jamaah-modal");
  const form = document.getElementById("jamaah-form");
  form.reset();
  
  editingJamaahId = jamaahId;
  
  // Populate dropdown lists in modal
  populateFormDropdowns();
  
  if (jamaahId) {
    // Edit Mode
    document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Data Jamaah (${jamaahId})`;
    
    const list = getJamaahList();
    const item = list.find(j => j.id === jamaahId);
    
    if (item) {
      document.getElementById("form-id").value = item.id;
      document.getElementById("form-nama").value = item.namaLengkap;
      
      // Select Radio Button for Kelompok Pengajian
      const radio = document.querySelector(`input[name="form-kelompok"][value="${item.kelompokPengajian}"]`);
      if (radio) radio.checked = true;
      
      document.getElementById("form-gender").value = item.jenisKelamin;
      document.getElementById("form-tempat-lahir").value = item.tempatLahir;
      document.getElementById("form-tanggal-lahir").value = item.tanggalLahir;
      document.getElementById("form-umur").value = item.umur;
      document.getElementById("form-pernikahan").value = item.statusPernikahan;
      document.getElementById("form-peramutan").value = item.kelompokPeramutan;
      document.getElementById("form-hubungan").value = item.statusHubunganKeluarga;
      
      // Filter KK Dropdown depending on selected group first, then select value
      populateFormKKDropdown(item.kelompokPengajian);
      document.getElementById("form-kepala-keluarga").value = item.kepalaKeluargaId || "";
      
      document.getElementById("form-hp").value = item.nomorHp || "";
      document.getElementById("form-pendidikan").value = item.tingkatPendidikan;
      document.getElementById("form-pekerjaan").value = item.pekerjaanUtama;
      document.getElementById("form-dapuan").value = item.dapuan;
      document.getElementById("form-ekonomi").value = item.statusEkonomi;
      document.getElementById("form-kelancaran").value = item.kelancaranSambung;
      
      // Update disabled state initially on edit
      updateFormKKState();
    }
  } else {
    // Create Mode
    document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-user-plus"></i> Tambah Data Jamaah Baru`;
    document.getElementById("form-id").value = "";
    document.getElementById("form-umur").value = "0";
    document.getElementById("form-peramutan").value = "-";
    
    // Select first kelompok radio button
    const firstRadio = document.querySelector('input[name="form-kelompok"]');
    if (firstRadio) {
      firstRadio.checked = true;
      // Populate KK dropdown initially based on this kelompok
      populateFormKKDropdown(firstRadio.value);
    }
    
    // Update disabled state initially on create
    updateFormKKState();
  }
  
  // Show Modal Overlay
  modal.classList.add("active");
}

function closeJamaahModal() {
  document.getElementById("jamaah-modal").classList.remove("active");
  editingJamaahId = null;
}

// Populate Static options inside modal fields
function populateFormDropdowns() {
  const perSelect = document.getElementById("form-pernikahan");
  const hubSelect = document.getElementById("form-hubungan");
  const eduSelect = document.getElementById("form-pendidikan");
  const jobSelect = document.getElementById("form-pekerjaan");
  const dapSelect = document.getElementById("form-dapuan");
  const ekoSelect = document.getElementById("form-ekonomi");
  const kelSelect = document.getElementById("form-kelancaran");
  
  // Fill options only if they are empty
  fillSelectOptions(perSelect, MASTER_PERNIKAHAN);
  fillSelectOptions(hubSelect, MASTER_HUBUNGAN);
  fillSelectOptions(eduSelect, MASTER_PENDIDIKAN);
  fillSelectOptions(jobSelect, MASTER_PEKERJAAN);
  fillSelectOptions(dapSelect, MASTER_DAPUAN);
  fillSelectOptions(ekoSelect, MASTER_EKONOMI);
  fillSelectOptions(kelSelect, MASTER_KELANCARAN);

  // Group Radio button generation
  const radioGroup = document.getElementById("form-kelompok-group");
  radioGroup.innerHTML = "";
  MASTER_KELOMPOK.forEach((k, idx) => {
    const label = document.createElement("label");
    label.className = "radio-label";
    label.innerHTML = `<input type="radio" name="form-kelompok" value="${k}" ${idx === 0 ? "checked" : ""}> ${k}`;
    radioGroup.appendChild(label);
    
    // Add trigger on change to update KK list filter
    label.querySelector("input").addEventListener("change", (e) => {
      populateFormKKDropdown(e.target.value);
    });
  });
}

function fillSelectOptions(selectElement, optionsArray) {
  if (selectElement.options.length <= 1) {
    selectElement.innerHTML = "";
    optionsArray.forEach(optVal => {
      const opt = document.createElement("option");
      opt.value = optVal;
      opt.textContent = optVal;
      selectElement.appendChild(opt);
    });
  }
}

// Populate Kepala Keluarga dropdown filtered by selected Kelompok Pengajian
function populateFormKKDropdown(kelompokPengajian) {
  const kkSelect = document.getElementById("form-kepala-keluarga");
  kkSelect.innerHTML = `<option value="">-- Pilih Kepala Keluarga --</option>`;
  
  const kkList = getKepalaKeluargaList();
  
  // Filter by selected Kelompok AND exclude the current editing user to prevent cyclical relations
  const filteredKK = kkList.filter(kk => kk.kelompokPengajian === kelompokPengajian && kk.id !== editingJamaahId);
  
  filteredKK.forEach(kk => {
    const opt = document.createElement("option");
    opt.value = kk.id;
    opt.textContent = `${kk.namaLengkap} (${kk.id})`;
    kkSelect.appendChild(opt);
  });
}

// ----------------------------------------------------
// TAB 3: MODUL KARTU KELUARGA
// ----------------------------------------------------
function populateKKFilterOptions() {
  const kkFilter = document.getElementById("kk-filter-kelompok");
  if (kkFilter.options.length <= 1) {
    kkFilter.innerHTML = `<option value="">Semua Kelompok</option>`;
    MASTER_KELOMPOK.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      kkFilter.appendChild(opt);
    });
  }
}

function populateKKList() {
  const selectedKelompok = document.getElementById("kk-filter-kelompok").value;
  const list = getKepalaKeluargaList();
  
  const filtered = selectedKelompok === "" ? list : list.filter(kk => kk.kelompokPengajian === selectedKelompok);
  
  const listContainer = document.getElementById("kk-sidebar-list");
  listContainer.innerHTML = "";
  
  if (filtered.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.85rem;">Tidak ada Kepala Keluarga.</div>`;
    document.getElementById("kk-details-container").innerHTML = `
      <div style="text-align: center; padding: 40px 0; color: var(--text-secondary);">
        <i class="fa-solid fa-folder-open" style="font-size:3rem; margin-bottom:15px; display:block;"></i>
        Tidak ada data Kartu Keluarga untuk kelompok terpilih.
      </div>`;
    return;
  }
  
  filtered.forEach((kk, idx) => {
    const item = document.createElement("div");
    item.className = "kk-item";
    item.innerHTML = `
      <h4>${kk.namaLengkap}</h4>
      <p>ID: ${kk.id} | Kelompok: ${kk.kelompokPengajian}</p>
    `;
    
    item.addEventListener("click", () => {
      document.querySelectorAll(".kk-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      renderKKDetails(kk.id);
    });
    
    listContainer.appendChild(item);
    
    // Auto-select first item in list
    if (idx === 0) {
      item.classList.add("active");
      renderKKDetails(kk.id);
    }
  });
}

function renderKKDetails(kkId) {
  const jamaah = getJamaahList();
  const kkHead = jamaah.find(j => j.id === kkId);
  if (!kkHead) return;
  
  // Find all family members (where kepalaKeluargaId matches this head ID)
  const familyMembers = jamaah.filter(j => j.kepalaKeluargaId === kkId && j.id !== kkId);
  
  const container = document.getElementById("kk-details-container");
  container.innerHTML = "";
  
  // Build meta details rows
  const kkNumberMock = `327508${kkId.replace("J-", "00")}${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Check if Admin to render Add Member quick actions
  const currentUser = getCurrentUser();
  const isAdmin = currentUser && currentUser.role === "Admin";
  
  let membersRows = "";
  
  // Row for Kepala Keluarga
  membersRows += `
    <tr>
      <td>1</td>
      <td><strong>${kkHead.namaLengkap}</strong></td>
      <td>Laki-laki</td>
      <td>${kkHead.tempatLahir}, ${formatDateIndo(kkHead.tanggalLahir)}</td>
      <td>${kkHead.umur}</td>
      <td>Kepala Keluarga</td>
      <td>${kkHead.pekerjaanUtama}</td>
      <td>${kkHead.tingkatPendidikan}</td>
      <td><span class="badge badge-green">${kkHead.kelancaranSambung}</span></td>
    </tr>
  `;
  
  // Rows for other family members
  familyMembers.forEach((m, idx) => {
    let relationshipBadge = m.statusHubunganKeluarga;
    membersRows += `
      <tr>
        <td>${idx + 2}</td>
        <td>${m.namaLengkap}</td>
        <td>${m.jenisKelamin}</td>
        <td>${m.tempatLahir}, ${formatDateIndo(m.tanggalLahir)}</td>
        <td>${m.umur}</td>
        <td>${relationshipBadge}</td>
        <td>${m.pekerjaanUtama}</td>
        <td>${m.tingkatPendidikan}</td>
        <td><span class="badge ${m.kelancaranSambung === 'Lancar' ? 'badge-green' : m.kelancaranSambung === 'Kurang Lancar' ? 'badge-yellow' : 'badge-red'}">${m.kelancaranSambung}</span></td>
      </tr>
    `;
  });
  
  container.innerHTML = `
    <div class="kk-cert-header">
      <h3>KARTU KELUARGA</h3>
      <p>No. ${kkNumberMock}</p>
    </div>
    
    <div class="kk-cert-meta">
      <div class="kk-meta-item">
        <span class="label">Nama Kepala Keluarga:</span>
        <span class="val">${kkHead.namaLengkap}</span>
      </div>
      <div class="kk-meta-item">
        <span class="label">Kelompok Pengajian:</span>
        <span class="val">${kkHead.kelompokPengajian}</span>
      </div>
      <div class="kk-meta-item">
        <span class="label">Status Ekonomi KK:</span>
        <span class="val" style="color: ${kkHead.statusEkonomi === 'Aghnia' ? '#10b981' : kkHead.statusEkonomi === 'Dhuafa' ? '#f59e0b' : '#3b82f6'}">${kkHead.statusEkonomi}</span>
      </div>
      <div class="kk-meta-item">
        <span class="label">Alamat / Wilayah:</span>
        <span class="val">Pondok Melati, Bekasi</span>
      </div>
    </div>
    
    <div class="kk-cert-title-table">DAFTAR ANGGOTA KELUARGA</div>
    
    <div class="table-responsive">
      <table class="table-custom" style="font-size: 0.85rem;">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Lengkap</th>
            <th>J. Kelamin</th>
            <th>Tempat, Tgl Lahir</th>
            <th>Umur</th>
            <th>Hubungan</th>
            <th>Pekerjaan</th>
            <th>Pendidikan</th>
            <th>Sambung</th>
          </tr>
        </thead>
        <tbody>
          ${membersRows}
        </tbody>
      </table>
    </div>
    
    ${isAdmin ? `
    <div style="margin-top: 20px; text-align: right; display:none;" class="print-hide">
      <button class="btn-secondary" onclick="alert('Buka Modul Jamaah untuk mengubah relasi keluarga.')">
        <i class="fa-solid fa-users-gear"></i> Kelola Relasi Anggota
      </button>
    </div>` : ""}
  `;
}

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ----------------------------------------------------
// TAB 4: RECAPITULATION & REPORTING (REVISED)
// ----------------------------------------------------
function populateReportFilterOptions() {
  const repFilter = document.getElementById("report-filter-kelompok");
  if (repFilter.options.length <= 1) {
    MASTER_KELOMPOK.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      repFilter.appendChild(opt);
    });
  }
}

function calculateAndRenderReport() {
  const selectedKelompok = document.getElementById("report-filter-kelompok").value;
  const jamaah = getJamaahList();
  
  // Filter jamaah based on chosen kelompok pengajian
  const filteredJamaah = selectedKelompok === "" ? jamaah : jamaah.filter(j => j.kelompokPengajian === selectedKelompok);
  
  const totalJamaah = filteredJamaah.length;
  
  // Count Heads of Family in the selected group
  const totalKK = filteredJamaah.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga").length;
  
  // Average member per KK
  const avgKKMembers = totalKK > 0 ? (totalJamaah / totalKK).toFixed(1) : "0.0";
  
  // Economic breakdown
  const aghnia = filteredJamaah.filter(j => j.statusEkonomi === "Aghnia").length;
  const dhuafa = filteredJamaah.filter(j => j.statusEkonomi === "Dhuafa").length;
  const menengah = filteredJamaah.filter(j => j.statusEkonomi === "Menengah").length;
  
  const aghniaPct = totalJamaah > 0 ? ((aghnia / totalJamaah) * 100).toFixed(0) : 0;
  const dhuafaPct = totalJamaah > 0 ? ((dhuafa / totalJamaah) * 100).toFixed(0) : 0;
  
  // Peramutan breakdown
  const paud = filteredJamaah.filter(j => j.kelompokPeramutan === "PAUD").length;
  const caberawit = filteredJamaah.filter(j => j.kelompokPeramutan === "Caberawit").length;
  const gus = filteredJamaah.filter(j => j.kelompokPeramutan === "GUS").length;
  const gum = filteredJamaah.filter(j => j.kelompokPeramutan === "GUM").length;
  const dewasa = filteredJamaah.filter(j => j.kelompokPeramutan === "Dewasa").length;
  const manula = filteredJamaah.filter(j => j.kelompokPeramutan === "Manula").length;
  
  // Progress percentages for peramutan
  const getPctStr = (val) => totalJamaah > 0 ? ((val / totalJamaah) * 100).toFixed(0) + "%" : "0%";
  
  // Set UI Labels
  document.getElementById("rep-total-jamaah").textContent = totalJamaah;
  document.getElementById("rep-total-kk").textContent = totalKK;
  document.getElementById("rep-avg-kk").textContent = avgKKMembers;
  
  document.getElementById("rep-total-aghnia").textContent = `${aghnia} (${aghniaPct}%)`;
  document.getElementById("rep-pb-aghnia").style.width = `${aghniaPct}%`;
  document.getElementById("rep-total-dhuafa").textContent = `${dhuafa} (${dhuafaPct}%)`;
  document.getElementById("rep-pb-dhuafa").style.width = `${dhuafaPct}%`;
  document.getElementById("rep-total-menengah").textContent = menengah;
  
  document.getElementById("rep-per-paud").textContent = `${paud} (${getPctStr(paud)})`;
  document.getElementById("rep-pb-paud").style.width = getPctStr(paud);
  
  document.getElementById("rep-per-caberawit").textContent = `${caberawit} (${getPctStr(caberawit)})`;
  document.getElementById("rep-pb-caberawit").style.width = getPctStr(caberawit);
  
  document.getElementById("rep-per-gus").textContent = `${gus} (${getPctStr(gus)})`;
  document.getElementById("rep-pb-gus").style.width = getPctStr(gus);
  
  document.getElementById("rep-per-gum").textContent = `${gum} (${getPctStr(gum)})`;
  document.getElementById("rep-pb-gum").style.width = getPctStr(gum);
  
  document.getElementById("rep-per-dewasa").textContent = `${dewasa} (${getPctStr(dewasa)})`;
  document.getElementById("rep-pb-dewasa").style.width = getPctStr(dewasa);
  
  document.getElementById("rep-per-manula").textContent = `${manula} (${getPctStr(manula)})`;
  document.getElementById("rep-pb-manula").style.width = getPctStr(manula);
  
  // Dapuan breakdown rows
  const tbodyDapuan = document.getElementById("rep-table-dapuan-body");
  tbodyDapuan.innerHTML = "";
  
  // Count pengurus based on Dapuan
  MASTER_DAPUAN.forEach(dapuan => {
    const count = filteredJamaah.filter(j => j.dapuan === dapuan).length;
    const ratio = totalJamaah > 0 ? ((count / totalJamaah) * 100).toFixed(1) : 0;
    
    // Skip rendering if count is 0 to keep reporting clean, but always show MT/MS/Pengurus
    const isCoreRole = ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS"].includes(dapuan);
    if (count > 0 || isCoreRole) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${dapuan}</strong></td>
        <td>${count} Orang</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="progress-container" style="width:70px; margin-top:0;"><div class="progress-bar" style="width: ${ratio}%; background:#3b82f6;"></div></div>
            <span>${ratio}%</span>
          </div>
        </td>
      `;
      tbodyDapuan.appendChild(tr);
    }
  });
}

// Export Report Metrics to CSV
function exportReportToCSV() {
  const selectedKelompok = document.getElementById("report-filter-kelompok").value;
  const groupLabel = selectedKelompok === "" ? "Semua Kelompok" : selectedKelompok;
  
  const jamaah = getJamaahList();
  const filtered = selectedKelompok === "" ? jamaah : jamaah.filter(j => j.kelompokPengajian === selectedKelompok);
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `AJI VERSION 2.0 REPORT - REKAPITULASI DATA JAMAAH\r\n`;
  csvContent += `Kelompok Pengajian: ${groupLabel}\r\n`;
  csvContent += `Tanggal Export: ${new Date().toLocaleString()}\r\n\r\n`;
  
  csvContent += `ID,Nama Lengkap,Kelompok,Gender,Umur,Kelompok Peramutan,Hub. Keluarga,Pendidikan,Pekerjaan,Dapuan,Ekonomi,Sambung\r\n`;
  
  filtered.forEach(j => {
    const row = [
      j.id,
      `"${j.namaLengkap}"`,
      j.kelompokPengajian,
      j.jenisKelamin,
      j.umur,
      j.kelompokPeramutan,
      j.statusHubunganKeluarga,
      j.tingkatPendidikan,
      j.pekerjaanUtama,
      j.dapuan,
      j.statusEkonomi,
      j.kelancaranSambung
    ].join(",");
    csvContent += row + "\r\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `laporan_aji_${groupLabel.toLowerCase().replace(" ", "_")}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  
  // Log this export action
  const currUser = getCurrentUser();
  logAction(currUser.username, "EXPORT", `Mengekspor Laporan data jamaah kelompok '${groupLabel}' ke CSV.`);
}

// ----------------------------------------------------
// TAB 5: GOOGLE SHEETS LIVE DB DISPLAY
// ----------------------------------------------------
function renderSpreadsheetGrid(sheetName) {
  const thead = document.getElementById("sheet-table-head");
  const tbody = document.getElementById("sheet-table-body");
  thead.innerHTML = "";
  tbody.innerHTML = "";
  
  if (sheetName === "sheet-jamaah") {
    // Columns mapping
    const cols = ["id", "namaLengkap", "kelompokPengajian", "tempatLahir", "tanggalLahir", "jenisKelamin", "nomorHp", "tingkatPendidikan", "statusPernikahan", "statusHubunganKeluarga", "kepalaKeluargaId", "pekerjaanUtama", "dapuan", "statusEkonomi", "kelancaranSambung"];
    
    // Draw Header
    const trHead = document.createElement("tr");
    cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
    thead.appendChild(trHead);
    
    // Draw Rows from DB source
    const rawList = getJamaahList();
    rawList.forEach(j => {
      const tr = document.createElement("tr");
      cols.forEach(c => {
        tr.innerHTML += `<td>${j[c] !== undefined ? j[c] : ""}</td>`;
      });
      tbody.appendChild(tr);
    });
  } 
  else if (sheetName === "sheet-kk") {
    const cols = ["id", "namaLengkap", "kelompokPengajian"];
    const trHead = document.createElement("tr");
    cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
    thead.appendChild(trHead);
    
    const rawList = getKepalaKeluargaList();
    rawList.forEach(kk => {
      const tr = document.createElement("tr");
      cols.forEach(c => {
        tr.innerHTML += `<td>${kk[c] || ""}</td>`;
      });
      tbody.appendChild(tr);
    });
  }
  else if (sheetName === "sheet-mapping") {
    const cols = ["kepalaKeluargaId", "anggotaKeluargaId"];
    const trHead = document.createElement("tr");
    cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
    thead.appendChild(trHead);
    
    const rawList = getKartuKeluargaMappings();
    rawList.forEach(map => {
      const tr = document.createElement("tr");
      cols.forEach(c => {
        tr.innerHTML += `<td>${map[c] || ""}</td>`;
      });
      tbody.appendChild(tr);
    });
  }
  else if (sheetName === "sheet-users") {
    const cols = ["username", "email", "role", "passwordHash"];
    const trHead = document.createElement("tr");
    cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
    thead.appendChild(trHead);
    
    const rawList = JSON.parse(localStorage.getItem("aji_v2_users")) || [];
    rawList.forEach(u => {
      const tr = document.createElement("tr");
      cols.forEach(c => {
        tr.innerHTML += `<td style="font-family:monospace;">${u[c] || ""}</td>`;
      });
      tbody.appendChild(tr);
    });
  }
  else if (sheetName === "sheet-logs") {
    const cols = ["timestamp", "user", "action", "description"];
    const trHead = document.createElement("tr");
    cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
    thead.appendChild(trHead);
    
    const rawList = getAuditLogs();
    rawList.forEach(log => {
      const tr = document.createElement("tr");
      cols.forEach(c => {
        tr.innerHTML += `<td>${log[c] || ""}</td>`;
      });
      tbody.appendChild(tr);
    });
  }
}

// ----------------------------------------------------
// TAB 6: AUDIT TRAIL LOGS
// ----------------------------------------------------
function renderAuditLogs() {
  const container = document.getElementById("audit-logs-container");
  container.innerHTML = "";
  
  const logs = getAuditLogs();
  
  if (logs.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-secondary);"><i class="fa-solid fa-history" style="font-size:2rem; margin-bottom:10px; display:block;"></i> Belum ada catatan aktivitas.</div>`;
    return;
  }
  
  logs.forEach(log => {
    const item = document.createElement("div");
    item.className = "audit-log-item";
    
    const formattedTime = new Date(log.timestamp).toLocaleString("id-ID");
    
    let actionBadge = "badge-gray";
    if (log.action === "CREATE") actionBadge = "badge-green";
    else if (log.action === "UPDATE") actionBadge = "badge-blue";
    else if (log.action === "DELETE") actionBadge = "badge-red";
    else if (log.action === "LOGIN") actionBadge = "badge-purple";
    else if (log.action === "EXPORT") actionBadge = "badge-yellow";
    
    item.innerHTML = `
      <div class="audit-meta-row">
        <span><span class="actor">${log.user}</span> memicu aksi <span class="badge ${actionBadge}" style="font-size:0.65rem; padding: 2px 6px;">${log.action}</span></span>
        <span>${formattedTime}</span>
      </div>
      <div class="audit-description">${log.description}</div>
    `;
    
    container.appendChild(item);
  });
}

// Helper to update Kepala Keluarga dropdown disabled state
function updateFormKKState() {
  const relationship = document.getElementById("form-hubungan").value;
  const kkSelect = document.getElementById("form-kepala-keluarga");
  const kkHint = document.getElementById("form-kk-hint");
  if (relationship === "Kepala Keluarga") {
    kkSelect.value = "";
    kkSelect.disabled = true;
    kkHint.textContent = "Kepala Keluarga bertindak sebagai root, tidak memerlukan relasi KK lain.";
  } else {
    kkSelect.disabled = false;
    kkHint.textContent = "Disaring berdasarkan kelompok pengajian yang sama.";
  }
}
