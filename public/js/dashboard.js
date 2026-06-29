    // DASHBOARD KPI STATS & CHARTS
    // ----------------------------------------------------
    function getFilteredJamaahForDashboard(jamaahList) {
      let list = jamaahList || [];
      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
      const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
      const activeKelompok = isKelompokRestricted ? currentUser.kelompok : (filterDashboardEl ? filterDashboardEl.value : "");
      
      if (activeKelompok) {
        list = list.filter(j => j.kelompokPengajian === activeKelompok);
      }
      return list;
    }

    function loadDashboardKPIs() {
      const allJamaah = getJamaahList();
      const jamaah = getFilteredJamaahForDashboard(allJamaah);
      
      const kkList = getKepalaKeluargaList().filter(kk => {
        const matchingJamaah = jamaah.find(j => j.id === kk.id);
        return !!matchingJamaah;
      });
      
      document.getElementById("kpi-total-jamaah").textContent = jamaah.length;
      document.getElementById("kpi-total-kk").textContent = kkList.length;
      const kpiTotalKelompok = document.getElementById("kpi-total-kelompok");
      if (kpiTotalKelompok) {
        kpiTotalKelompok.textContent = localMasterKelompok.length;
      }
      document.getElementById("kpi-total-caberawit").textContent = jamaah.filter(j => j.kelompokPeramutan === "Caberawit").length;
      document.getElementById("kpi-total-gus").textContent = jamaah.filter(j => j.kelompokPeramutan === "GUS").length;
      document.getElementById("kpi-total-gum").textContent = jamaah.filter(j => j.kelompokPeramutan === "GUM").length;
      document.getElementById("kpi-total-aghnia").textContent = jamaah.filter(j => j.statusEkonomi === "Aghnia").length;
      document.getElementById("kpi-total-dhuafa").textContent = jamaah.filter(j => j.statusEkonomi === "Dhuafa").length;
      
      // Dynamic KPIs added in v2.1
      document.getElementById("kpi-total-paud").textContent = jamaah.filter(j => j.kelompokPeramutan === "PAUD").length;
      document.getElementById("kpi-total-janda").textContent = jamaah.filter(j => j.statusPernikahan === "Janda").length;

      // Calculate presence in "Teks" sessions for current month
      try {
        const allJadwal = getJadwalPengajianList() || [];
        const allPresensi = getPresensiKehadiranList() || [];
        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
        const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
        const activeKelompok = isKelompokRestricted ? currentUser.kelompok : (filterDashboardEl ? filterDashboardEl.value : "");
        
        const allowedJamaahIds = new Set(
          jamaah
            .filter(j => !activeKelompok || j.kelompokPengajian === activeKelompok)
            .map(j => j.id)
        );
        
        const teksSessions = allJadwal.filter(s => {
          if (!s || !s.tanggal) return false;
          const isTeks = (s.jenis_pengajian || "").trim().toLowerCase() === "teks";
          const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
          return isTeks && isCurrentMonth;
        });
        
        const teksSessionIds = new Set(teksSessions.map(s => s.id));
        const attendeeIds = new Set();
        
        allPresensi.forEach(p => {
          if (p && teksSessionIds.has(p.id_pengajian)) {
            const statusLower = (p.status || "").trim().toLowerCase();
            const isHadir = statusLower === "hadir fisik" || statusLower === "online";
            if (isHadir && p.id_jamaah && allowedJamaahIds.has(p.id_jamaah)) {
              attendeeIds.add(p.id_jamaah);
            }
          }
        });
        
        const totalActiveJamaah = allowedJamaahIds.size;
        const pct = totalActiveJamaah > 0 ? Math.round((attendeeIds.size / totalActiveJamaah) * 100) : 0;
        const kpiTeks = document.getElementById("kpi-total-kehadiran-teks");
        if (kpiTeks) {
          kpiTeks.textContent = `${attendeeIds.size} (${pct}%)`;
        }
      } catch (err) {
        console.error("Error calculating Teks KPI:", err);
      }

      // Calculate total pengurus
      try {
        const allPengurus = getPengurusList() || [];
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
        const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
        const activeKelompok = isKelompokRestricted ? currentUser.kelompok : (filterDashboardEl ? filterDashboardEl.value : "");
        
        let filteredPengurus = allPengurus;
        if (activeKelompok) {
          const jamaahMap = new Map(jamaah.map(j => [j.id, j]));
          filteredPengurus = allPengurus.filter(p => {
            const j = jamaahMap.get(p.jamaah_id);
            return j && j.kelompokPengajian === activeKelompok;
          });
        }
        
        // Count unique pengurus by jamaah_id
        const uniquePengurusIds = new Set(filteredPengurus.map(p => p.jamaah_id).filter(Boolean));
        const kpiPengurus = document.getElementById("kpi-total-pengurus");
        if (kpiPengurus) {
          kpiPengurus.textContent = uniquePengurusIds.size;
        }
      } catch (err) {
        console.error("Error calculating Pengurus KPI:", err);
      }
    }

    function renderDashboardCharts() {
      let allJamaah = getJamaahList();
      
      const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
      if (filterDashboardEl && filterDashboardEl.options.length <= 1) {
         filterDashboardEl.innerHTML = '<option value="">Semua Kelompok</option>';
         localMasterKelompok.forEach(k => {
            filterDashboardEl.innerHTML += `<option value="${k}">${k}</option>`;
           });
           const currentUser = getCurrentUser();
           const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
           const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
           if (isKelompokRestricted) {
             filterDashboardEl.value = currentUser.kelompok;
             filterDashboardEl.disabled = true;
          }
      }
      
      let jamaah = getFilteredJamaahForDashboard(allJamaah);

      const isDark = document.body.classList.contains("dark-theme");
      const textColor = isDark ? "#9ca3af" : "#4b5563";
      const gridColor = isDark ? "rgba(16, 185, 129, 0.1)" : "#e2e8f0";
      
      Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
      });
      
      // Kelompok Charts
      const kelompokCounts = localMasterKelompok.map(k => jamaah.filter(j => j.kelompokPengajian === k).length);
      const ctxKelompok = document.getElementById("chart-kelompok").getContext("2d");
      charts.kelompok = new Chart(ctxKelompok, {
        type: "bar",
        data: {
          labels: localMasterKelompok,
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
            y: { ticks: { color: textColor }, grid: { color: gridColor } },
            x: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });

      // Ekonomi composition
      const ekonomiCounts = ["Aghnia", "Dhuafa", "Menengah"].map(e => jamaah.filter(j => j.statusEkonomi === e).length);
      const ctxEkonomi = document.getElementById("chart-ekonomi").getContext("2d");
      charts.ekonomi = new Chart(ctxEkonomi, {
        type: "pie",
        data: {
          labels: ["Aghnia", "Dhuafa", "Menengah"],
          datasets: [{
            data: ekonomiCounts,
            backgroundColor: ["rgba(16, 185, 129, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(59, 130, 246, 0.7)"],
            borderWidth: 1,
            borderColor: isDark ? "#0f251c" : "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right", labels: { color: textColor, font: { family: "Outfit" } } }
          }
        }
      });

      // Pendidikan composition
      const pendidikanCounts = localMasterPendidikan.map(p => jamaah.filter(j => j.tingkatPendidikan === p).length);
      const ctxPendidikan = document.getElementById("chart-pendidikan").getContext("2d");
      charts.pendidikan = new Chart(ctxPendidikan, {
        type: "doughnut",
        data: {
          labels: localMasterPendidikan,
          datasets: [{
            data: pendidikanCounts,
            backgroundColor: ["#38bdf8", "#0284c7", "#34d399", "#059669", "#fbbf24", "#f59e0b", "#c084fc", "#8b5cf6"],
            borderWidth: 1,
            borderColor: isDark ? "#0f251c" : "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right", labels: { color: textColor, font: { family: "Outfit" } } }
          }
        }
      });

      // Pekerjaan composition
      const jobsToShow = localMasterPekerjaan.filter(p => p !== "Lainnya").slice(0, 7).concat("Lainnya");
      const pekerjaanCounts = jobsToShow.map(p => {
        if (p === "Lainnya") {
          return jamaah.filter(j => jobsToShow.indexOf(j.pekerjaanUtama) === -1 || j.pekerjaanUtama === "Lainnya").length;
        }
        return jamaah.filter(j => j.pekerjaanUtama === p).length;
      });
      
      const ctxPekerjaan = document.getElementById("chart-pekerjaan").getContext("2d");
      charts.pekerjaan = new Chart(ctxPekerjaan, {
        type: "bar",
        data: {
          labels: jobsToShow,
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
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });

      // Peramutan composition
      const peramutanOpts = ["Balita", "PAUD", "Caberawit", "GUS", "GUM", "Dewasa", "Manula"];
      const peramutanCounts = peramutanOpts.map(p => jamaah.filter(j => j.kelompokPeramutan === p).length);
      const ctxPeramutan = document.getElementById("chart-peramutan").getContext("2d");
      charts.peramutan = new Chart(ctxPeramutan, {
        type: "bar",
        data: {
          labels: peramutanOpts,
          datasets: [{
            label: "Sebaran Peramutan",
            data: peramutanCounts,
            backgroundColor: "rgba(245, 158, 11, 0.65)",
            borderColor: "#f59e0b",
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
            x: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });

      // Sambung composition
      const kelancaranOpts = ["Lancar", "Kurang Lancar", "Perlu Perhatian"];
      const sambungCounts = kelancaranOpts.map(p => jamaah.filter(j => j.kelancaranSambung === p).length);
      const ctxSambung = document.getElementById("chart-sambung").getContext("2d");
      charts.sambung = new Chart(ctxSambung, {
        type: "bar",
        data: {
          labels: kelancaranOpts,
          datasets: [{
            label: "Tingkat Kelancaran",
            data: sambungCounts,
            backgroundColor: ["rgba(16, 185, 129, 0.65)", "rgba(245, 158, 11, 0.65)", "rgba(239, 68, 68, 0.65)"],
            borderColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
            x: { ticks: { color: textColor }, grid: { display: false } }
          }
        }
      });
      loadDashboardKPIs();
    }

    // ----------------------------------------------------
    // LAPORAN & REKAP (ECONOMIC & DAPUAN BREAKDOWN)
    // ----------------------------------------------------
    function populateReportFilterOptions() {
      const repFilter = document.getElementById("report-filter-kelompok");
      const savedVal = repFilter.value;
      repFilter.innerHTML = '<option value="">-- Semua Kelompok (PC Pondok Melati) --</option>';
      
      localMasterKelompok.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        repFilter.appendChild(opt);
      });
      
      const curUser = getCurrentUser();
      const curRoleClean = curUser ? (curUser.role || "").trim().toLowerCase() : "";
      const isKelompokRestricted = curUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
      if (isKelompokRestricted) {
        repFilter.value = curUser.kelompok;
        repFilter.disabled = true;
      } else {
        repFilter.value = savedVal;
        repFilter.disabled = false;
      }
    }

    function calculateAndRenderReport() {
      const selectedKelompok = document.getElementById("report-filter-kelompok").value;
      const jamaah = getJamaahList();
      const filtered = selectedKelompok === "" ? jamaah : jamaah.filter(j => j.kelompokPengajian === selectedKelompok);
      const totalJamaah = filtered.length;
      const totalKK = filtered.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga").length;
      const avgKKMembers = totalKK > 0 ? (totalJamaah / totalKK).toFixed(1) : "0.0";
      
      const maleCount = filtered.filter(j => j.jenisKelamin === "Laki-laki").length;
      const femaleCount = filtered.filter(j => j.jenisKelamin === "Perempuan").length;
      
      const malePct = totalJamaah > 0 ? ((maleCount / totalJamaah) * 100).toFixed(0) : 0;
      const femalePct = totalJamaah > 0 ? ((femaleCount / totalJamaah) * 100).toFixed(0) : 0;
      
      const aghnia = filtered.filter(j => j.statusEkonomi === "Aghnia").length;
      const dhuafa = filtered.filter(j => j.statusEkonomi === "Dhuafa").length;
      const menengah = filtered.filter(j => j.statusEkonomi === "Menengah").length;
      
      const aghniaPct = totalJamaah > 0 ? ((aghnia / totalJamaah) * 100).toFixed(0) : 0;
      const dhuafaPct = totalJamaah > 0 ? ((dhuafa / totalJamaah) * 100).toFixed(0) : 0;
      const menengahPct = totalJamaah > 0 ? ((menengah / totalJamaah) * 100).toFixed(0) : 0;
      
      const balita = filtered.filter(j => j.kelompokPeramutan === "Balita").length;
      const paud = filtered.filter(j => j.kelompokPeramutan === "PAUD").length;
      const caberawit = filtered.filter(j => j.kelompokPeramutan === "Caberawit").length;
      const gus = filtered.filter(j => j.kelompokPeramutan === "GUS").length;
      const gum = filtered.filter(j => j.kelompokPeramutan === "GUM").length;
      const dewasa = filtered.filter(j => j.kelompokPeramutan === "Dewasa").length;
      const manula = filtered.filter(j => j.kelompokPeramutan === "Manula").length;
      
      const getPctStr = (val) => totalJamaah > 0 ? ((val / totalJamaah) * 100).toFixed(0) + "%" : "0%";
      
      document.getElementById("rep-total-jamaah").textContent = totalJamaah;
      document.getElementById("rep-total-kk").textContent = totalKK;
      document.getElementById("rep-avg-kk").textContent = avgKKMembers;
      
      document.getElementById("rep-total-male").textContent = `${maleCount} (${malePct}%)`;
      document.getElementById("rep-pb-male").style.width = `${malePct}%`;
      document.getElementById("rep-total-female").textContent = `${femaleCount} (${femalePct}%)`;
      document.getElementById("rep-pb-female").style.width = `${femalePct}%`;
      
      document.getElementById("rep-total-aghnia").textContent = `${aghnia} (${aghniaPct}%)`;
      document.getElementById("rep-pb-aghnia").style.width = `${aghniaPct}%`;
      document.getElementById("rep-total-dhuafa").textContent = `${dhuafa} (${dhuafaPct}%)`;
      document.getElementById("rep-pb-dhuafa").style.width = `${dhuafaPct}%`;
      
      // Fixed middle-class economic status progress bar & percentage rendering (v2.1)
      document.getElementById("rep-total-menengah").textContent = `${menengah} (${menengahPct}%)`;
      document.getElementById("rep-pb-menengah").style.width = `${menengahPct}%`;
      
      document.getElementById("rep-per-balita").textContent = `${balita} (${getPctStr(balita)})`;
      document.getElementById("rep-pb-balita").style.width = getPctStr(balita);
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
      
      // Update per-group gender stats helper
      const updatePeramutanGenderStats = (groupName, groupCount, elementPrefix) => {
        const lCount = filtered.filter(j => j.kelompokPeramutan === groupName && j.jenisKelamin === "Laki-laki").length;
        const pCount = filtered.filter(j => j.kelompokPeramutan === groupName && j.jenisKelamin === "Perempuan").length;
        const lPct = groupCount > 0 ? ((lCount / groupCount) * 100).toFixed(0) : 0;
        const pPct = groupCount > 0 ? ((pCount / groupCount) * 100).toFixed(0) : 0;
        
        document.getElementById(`rep-per-${elementPrefix}-l-val`).textContent = `${lCount} (${lPct}%)`;
        document.getElementById(`rep-pb-${elementPrefix}-l`).style.width = `${lPct}%`;
        document.getElementById(`rep-per-${elementPrefix}-p-val`).textContent = `${pCount} (${pPct}%)`;
        document.getElementById(`rep-pb-${elementPrefix}-p`).style.width = `${pPct}%`;
      };

      updatePeramutanGenderStats("Balita", balita, "balita");
      updatePeramutanGenderStats("PAUD", paud, "paud");
      updatePeramutanGenderStats("Caberawit", caberawit, "caberawit");
      updatePeramutanGenderStats("GUS", gus, "gus");
      updatePeramutanGenderStats("GUM", gum, "gum");
      updatePeramutanGenderStats("Dewasa", dewasa, "dewasa");
      updatePeramutanGenderStats("Manula", manula, "manula");

      const tbodyDapuan = document.getElementById("rep-table-dapuan-body");
      tbodyDapuan.innerHTML = "";
      
      const allPengurus = getPengurusList() || [];
      const pengurusWithJamaah = allPengurus.map(p => {
        const j = jamaah.find(x => x.id === p.jamaah_id);
        return {
          ...p,
          kelompok: j ? j.kelompokPengajian : null
        };
      }).filter(p => p.kelompok !== null);

      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      const isOperator = curRoleClean.includes("operator");

      let filteredPengurusList = selectedKelompok === "" 
        ? pengurusWithJamaah 
        : pengurusWithJamaah.filter(p => p.kelompok === selectedKelompok);

      if (currentUser && isOperator) {
        filteredPengurusList = pengurusWithJamaah.filter(p => p.kelompok === currentUser.kelompok);
      }

      const totalFilteredPengurus = filteredPengurusList.length;

      // Header for Dapuan
      const headerDapuan = document.createElement("tr");
      headerDapuan.innerHTML = `
        <td colspan="3" style="background: rgba(59, 130, 246, 0.08); font-weight: bold; text-align: center; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; color: #3b82f6; border-bottom: 2px solid rgba(59, 130, 246, 0.2);">
          Rekapitulasi Berdasarkan Dapuan
        </td>
      `;
      tbodyDapuan.appendChild(headerDapuan);

      let totalDapuanCount = 0;
      localMasterDapuan.forEach(dapuan => {
        const count = filteredPengurusList.filter(p => p.dapuan === dapuan).length;
        const ratio = totalFilteredPengurus > 0 ? ((count / totalFilteredPengurus) * 100).toFixed(1) : 0;
        const isCoreRole = ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS"].includes(dapuan);
        if (count > 0 || isCoreRole) {
          totalDapuanCount += count;
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

      // Append Total Row for Dapuan (v2.2)
      const trTotalDapuan = document.createElement("tr");
      trTotalDapuan.style.fontWeight = "bold";
      trTotalDapuan.style.background = "rgba(59, 130, 246, 0.04)";
      trTotalDapuan.innerHTML = `
        <td>Total Jumlah</td>
        <td>${totalDapuanCount} Orang</td>
        <td>100.0%</td>
      `;
      tbodyDapuan.appendChild(trTotalDapuan);

      // Header for Tingkat
      const headerTingkat = document.createElement("tr");
      headerTingkat.innerHTML = `
        <td colspan="3" style="background: rgba(139, 92, 246, 0.08); font-weight: bold; text-align: center; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; color: #8b5cf6; border-bottom: 2px solid rgba(139, 92, 246, 0.2); border-top: 1px solid var(--border-color);">
          Rekapitulasi Berdasarkan Tingkat Pengurus
        </td>
      `;
      tbodyDapuan.appendChild(headerTingkat);

      const tingkatList = ["Daerah", "Desa", "Kelompok", "Organisasi", "Yayasan"];
      let totalTingkatCount = 0;
      tingkatList.forEach(tingkat => {
        const count = filteredPengurusList.filter(p => p.tingkat_pengurus === tingkat).length;
        totalTingkatCount += count;
      });

      tingkatList.forEach(tingkat => {
        const count = filteredPengurusList.filter(p => p.tingkat_pengurus === tingkat).length;
        const ratio = totalTingkatCount > 0 ? ((count / totalTingkatCount) * 100).toFixed(1) : 0;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>Tingkat ${tingkat}</strong></td>
          <td>${count} Orang</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="progress-container" style="width:70px; margin-top:0;"><div class="progress-bar" style="width: ${ratio}%; background:#8b5cf6;"></div></div>
              <span>${ratio}%</span>
            </div>
          </td>
        `;
        tbodyDapuan.appendChild(tr);
      });

      // Append Total Row for Tingkat (v2.2)
      const trTotalTingkat = document.createElement("tr");
      trTotalTingkat.style.fontWeight = "bold";
      trTotalTingkat.style.background = "rgba(139, 92, 246, 0.04)";
      trTotalTingkat.innerHTML = `
        <td>Total Jumlah</td>
        <td>${totalTingkatCount} Orang</td>
        <td>100.0%</td>
      `;
      tbodyDapuan.appendChild(trTotalTingkat);

      // --- KEHADIRAN PENGAJIAN GAUGES (Bulan Ini) - (v2.2) ---
      try {
        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
        
        const allJadwal = getJadwalPengajianList() || [];
        const allPresensi = getPresensiKehadiranList() || [];
        
        // Local self-contained copy of isJamaahEligibleForJenis to avoid ReferenceError from script order
        const localIsJamaahEligibleForJenis = (j, jenis) => {
          const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
          const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
          const match = list.find(item => {
            const name = typeof item === 'object' ? item.nama : item;
            return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
          });
          
          if (match && typeof match === 'object') {
            const genderLimit = (match.batasan_gender || "Semua").trim().toLowerCase();
            const jamaahGender = (j.jenisKelamin || "").trim().toLowerCase();
            if (genderLimit === "laki-laki" && jamaahGender !== "laki-laki") return false;
            if (genderLimit === "perempuan" && jamaahGender !== "perempuan") return false;
            
            const targetDapuanStr = (match.target_dapuan || "").trim();
            if (targetDapuanStr) {
              const allowedDapuans = targetDapuanStr.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
              if (allowedDapuans.length > 0) {
                const jamaahDapuans = [j.dapuan];
                if (typeof getPengurusList === 'function') {
                  const pList = getPengurusList() || [];
                  pList.forEach(p => {
                    if (p.jamaah_id === j.id && p.dapuan) {
                      jamaahDapuans.push(p.dapuan);
                    }
                  });
                }
                const lowerJamaahDapuans = jamaahDapuans.filter(Boolean).map(d => d.trim().toLowerCase());
                const hasMatchingDapuan = allowedDapuans.some(ad => lowerJamaahDapuans.includes(ad));
                if (!hasMatchingDapuan) return false;
              }
            }
          } else {
            const isFemaleOnly = jClean.includes("ibu") || jClean.includes("wanita") || jClean.includes("kewanitaan") || jClean.includes("akhwat");
            if (isFemaleOnly && (j.jenisKelamin || "").trim().toLowerCase() !== "perempuan") return false;
          }
          return true;
        };
        
        // --- 1. Pengajian Sambung (Tingkat Daerah, Desa, Kelompok) ---
        const calculateSambungForTingkat = (tingkatKey) => {
          const sessions = allJadwal.filter(s => {
            if (!s || !s.tanggal || !s.jenis_pengajian || !s.tingkat_pengajian) return false;
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
            let sessionTargets = jamaah.filter(j => localIsJamaahEligibleForJenis(j, session.jenis_pengajian));
            
            if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
              sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
            }
            
            if (selectedKelompok) {
              sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === selectedKelompok);
            }
            
            if (sessionTargets.length === 0) return;
            
            const sessionPresensi = allPresensi.filter(p => p.id_pengajian == session.id);
            const targetIds = new Set(sessionTargets.map(j => j.id));
            
            let hadirCount = 0;
            sessionPresensi.forEach(p => {
              if (p.id_jamaah && targetIds.has(p.id_jamaah)) {
                const statusLower = (p.status || "").trim().toLowerCase();
                if (statusLower === "hadir fisik" || statusLower === "online") {
                  hadirCount++;
                }
              }
            });
            
            totalSlots += sessionTargets.length;
            totalHadir += hadirCount;
          });
          
          return {
            percentage: totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0,
            hadir: totalHadir,
            total: totalSlots
          };
        };

        const resDaerah = calculateSambungForTingkat("daerah");
        const resDesa = calculateSambungForTingkat("desa");
        const resKelompok = calculateSambungForTingkat("kelompok");
        
        // --- 2. Pengajian Teks (Unique Attendee per Month) ---
        const teksSessions = allJadwal.filter(s => {
          if (!s || !s.tanggal || !s.jenis_pengajian) return false;
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
        
        const teksSessionIds = new Set(teksSessions.map(s => s.id));
        const attendedTeksJamaahIds = new Set();
        
        let eligibleTeksJamaah = jamaah.filter(j => localIsJamaahEligibleForJenis(j, "Teks"));
        if (selectedKelompok) {
          eligibleTeksJamaah = eligibleTeksJamaah.filter(j => j.kelompokPengajian === selectedKelompok);
        }
        
        const eligibleTeksIds = new Set(eligibleTeksJamaah.map(j => j.id));
        
        allPresensi.forEach(p => {
          if (p && p.id_jamaah && teksSessionIds.has(p.id_pengajian) && eligibleTeksIds.has(p.id_jamaah)) {
            const statusLower = (p.status || "").trim().toLowerCase();
            if (statusLower === "hadir fisik" || statusLower === "online") {
              attendedTeksJamaahIds.add(p.id_jamaah);
            }
          }
        });
        
        const totalTeksEligible = eligibleTeksJamaah.length;
        const totalTeksHadir = attendedTeksJamaahIds.size;
        const pctTeks = totalTeksEligible > 0 ? Math.round((totalTeksHadir / totalTeksEligible) * 100) : 0;
        
        // --- 3. Render Gauges ---
        const renderGauge = (containerId, value, count, total, label, color) => {
          const container = document.getElementById(containerId);
          if (!container) return;
          
          container.innerHTML = `
            <div class="gauge-card" style="text-align: center; background: var(--bg-card); padding: 15px 20px; border-radius: 12px; border: 1px solid var(--border-color); width: 220px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
              <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.92rem; font-weight: 600; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.03em;">${label}</h4>
              <div style="position: relative; width: 150px; height: 80px; margin: 0 auto 5px;">
                <svg width="150" height="80" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-color)" stroke-width="8" stroke-linecap="round"/>
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
                        stroke-dasharray="125.6" stroke-dashoffset="${125.6 - (125.6 * value / 100)}" style="transition: stroke-dashoffset 1s ease-out;"/>
                </svg>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center;">
                  <span style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${value}%</span>
                </div>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                Hadir: <strong>${count}</strong> / ${total}
              </div>
            </div>
          `;
        };
        
        renderGauge("gauge-sambung-daerah-container", resDaerah.percentage, resDaerah.hadir, resDaerah.total, "Sambung Daerah", "#0ea5e9");
        renderGauge("gauge-sambung-desa-container", resDesa.percentage, resDesa.hadir, resDesa.total, "Sambung Desa", "#10b981");
        renderGauge("gauge-sambung-kelompok-container", resKelompok.percentage, resKelompok.hadir, resKelompok.total, "Sambung Kelompok", "#f59e0b");
        renderGauge("gauge-teks-container", pctTeks, totalTeksHadir, totalTeksEligible, "Pengajian Teks", "#8b5cf6");
        
      } catch (err) {
        console.error("Error calculating reports gauges:", err);
      }
    }

    function exportReportToCSV() {
      const selectedKelompok = document.getElementById("report-filter-kelompok").value;
      const groupLabel = selectedKelompok === "" ? "Semua Kelompok" : selectedKelompok;
      const jamaah = getJamaahList();
      const filtered = selectedKelompok === "" ? jamaah : jamaah.filter(j => j.kelompokPengajian === selectedKelompok);
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `AJI V.1 REPORT - REKAPITULASI DATA JAMAAH\r\n`;
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
      
      const currUser = getCurrentUser();
      google.script.run.logActionGAS(currUser.username, "EXPORT", `Mengekspor Laporan data jamaah kelompok '${groupLabel}' ke CSV.`);
      showToast(`Laporan untuk kelompok ${groupLabel} berhasil diunduh dalam bentuk CSV!`, "success");
    }

    // ----------------------------------------------------