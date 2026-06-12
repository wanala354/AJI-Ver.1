    // DASHBOARD KPI STATS & CHARTS
    // ----------------------------------------------------
    function loadDashboardKPIs() {
      const jamaah = getJamaahList();
      const kkList = getKepalaKeluargaList();
      
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
    }

    function renderDashboardCharts() {
      let jamaah = getJamaahList();
      
      const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
      if (filterDashboardEl && filterDashboardEl.options.length <= 1) {
         filterDashboardEl.innerHTML = '<option value="">Semua Kelompok</option>';
         localMasterKelompok.forEach(k => {
           filterDashboardEl.innerHTML += `<option value="${k}">${k}</option>`;
         });
         const currentUser = getCurrentUser();
         if (currentUser && (currentUser.role || "").trim().toLowerCase() === "operator kelompok") {
           filterDashboardEl.value = currentUser.kelompok;
           filterDashboardEl.disabled = true;
         }
      }
      if (filterDashboardEl && filterDashboardEl.value) {
        jamaah = jamaah.filter(j => j.kelompokPengajian === filterDashboardEl.value);
      }

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
      const peramutanOpts = ["PAUD", "Caberawit", "GUS", "GUM", "Dewasa", "Manula"];
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
      if (curUser && curRoleClean === "operator kelompok") {
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
      
      const aghnia = filtered.filter(j => j.statusEkonomi === "Aghnia").length;
      const dhuafa = filtered.filter(j => j.statusEkonomi === "Dhuafa").length;
      const menengah = filtered.filter(j => j.statusEkonomi === "Menengah").length;
      
      const aghniaPct = totalJamaah > 0 ? ((aghnia / totalJamaah) * 100).toFixed(0) : 0;
      const dhuafaPct = totalJamaah > 0 ? ((dhuafa / totalJamaah) * 100).toFixed(0) : 0;
      const menengahPct = totalJamaah > 0 ? ((menengah / totalJamaah) * 100).toFixed(0) : 0;
      
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
      
      document.getElementById("rep-total-aghnia").textContent = `${aghnia} (${aghniaPct}%)`;
      document.getElementById("rep-pb-aghnia").style.width = `${aghniaPct}%`;
      document.getElementById("rep-total-dhuafa").textContent = `${dhuafa} (${dhuafaPct}%)`;
      document.getElementById("rep-pb-dhuafa").style.width = `${dhuafaPct}%`;
      
      // Fixed middle-class economic status progress bar & percentage rendering (v2.1)
      document.getElementById("rep-total-menengah").textContent = `${menengah} (${menengahPct}%)`;
      document.getElementById("rep-pb-menengah").style.width = `${menengahPct}%`;
      
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
      
      const tbodyDapuan = document.getElementById("rep-table-dapuan-body");
      tbodyDapuan.innerHTML = "";
      
      localMasterDapuan.forEach(dapuan => {
        const count = filtered.filter(j => j.dapuan === dapuan).length;
        const ratio = totalJamaah > 0 ? ((count / totalJamaah) * 100).toFixed(1) : 0;
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

    function exportReportToCSV() {
      const selectedKelompok = document.getElementById("report-filter-kelompok").value;
      const groupLabel = selectedKelompok === "" ? "Semua Kelompok" : selectedKelompok;
      const jamaah = getJamaahList();
      const filtered = selectedKelompok === "" ? jamaah : jamaah.filter(j => j.kelompokPengajian === selectedKelompok);
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `AJI VERSION 2.1 REPORT - REKAPITULASI DATA JAMAAH\r\n`;
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