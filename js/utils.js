    // DATABASE INSPECTOR VIEW
    // ----------------------------------------------------
    function renderSpreadsheetGrid(sheetName) {
      const thead = document.getElementById("sheet-table-head");
      const tbody = document.getElementById("sheet-table-body");
      thead.innerHTML = "";
      tbody.innerHTML = "";
      
      if (sheetName === "sheet-jamaah") {
        const cols = ["id", "namaLengkap", "kelompokPengajian", "tempatLahir", "tanggalLahir", "jenisKelamin", "nomorHp", "tingkatPendidikan", "statusPernikahan", "statusHubunganKeluarga", "kepalaKeluargaId", "pekerjaanUtama", "dapuan", "statusEkonomi", "kelancaranSambung"];
        const trHead = document.createElement("tr");
        cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
        thead.appendChild(trHead);
        
        getJamaahList().forEach(j => {
          const tr = document.createElement("tr");
          cols.forEach(c => tr.innerHTML += `<td>${j[c] !== undefined ? j[c] : ""}</td>`);
          tbody.appendChild(tr);
        });
      } 
      else if (sheetName === "sheet-kk") {
        const cols = ["id", "namaLengkap", "kelompokPengajian"];
        const trHead = document.createElement("tr");
        cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
        thead.appendChild(trHead);
        
        getKepalaKeluargaList().forEach(kk => {
          const tr = document.createElement("tr");
          cols.forEach(c => tr.innerHTML += `<td>	ext{${kk[c] || ""}}</td>`);
          tbody.appendChild(tr);
        });
      }
      else if (sheetName === "sheet-mapping") {
        const cols = ["kepalaKeluargaId", "anggotaKeluargaId"];
        const trHead = document.createElement("tr");
        cols.forEach(c => trHead.innerHTML += `<th>	ext{${c}}</th>`);
        thead.appendChild(trHead);
        
        getKartuKeluargaMappings().forEach(map => {
          const tr = document.createElement("tr");
          cols.forEach(c => tr.innerHTML += `<td>	ext{${map[c] || ""}}</td>`);
          tbody.appendChild(tr);
        });
      }
      else if (sheetName === "sheet-users") {
        const cols = ["username", "email", "role", "passwordHash", "kelompok"];
        const trHead = document.createElement("tr");
        cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
        thead.appendChild(trHead);
        
        getUsersList().forEach(u => {
          const tr = document.createElement("tr");
          cols.forEach(c => {
            let val = u[c] || "";
            if (c === "passwordHash") val = val.substring(0, 8) + "...";
            tr.innerHTML += `<td style="font-family:monospace;">${val}</td>`;
          });
          tbody.appendChild(tr);
        });
      }
      else if (sheetName === "sheet-logs") {
        const cols = ["timestamp", "user", "action", "description"];
        const trHead = document.createElement("tr");
        cols.forEach(c => trHead.innerHTML += `<th>${c}</th>`);
        thead.appendChild(trHead);
        
        getAuditLogs().forEach(log => {
          const tr = document.createElement("tr");
          cols.forEach(c => tr.innerHTML += `<td>${log[c] || ""}</td>`);
          tbody.appendChild(tr);
        });
      }
    }

    // ----------------------------------------------------
    // AUDIT TRAIL LOG VIEWER
    // ----------------------------------------------------
    function renderAuditLogs() {
      const container = document.getElementById("audit-logs-container");
      container.innerHTML = "";
      const logs = getAuditLogs();
      
      if (logs.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-secondary);"><i class="fa-solid fa-history" style="font-size:2rem; margin-bottom:10px; display:block;"></i> Belum ada aktivitas.</div>`;
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
        else if (log.action.indexOf("MASTER") !== -1) actionBadge = "badge-purple";
        else if (log.action.indexOf("USER") !== -1) actionBadge = "badge-blue";
        
        item.innerHTML = `
          <div class="audit-meta-row">
            <span><span class="actor">${log.user}</span> memicu <span class="badge ${actionBadge}" style="font-size:0.65rem; padding: 2px 6px;">${log.action}</span></span>
            <span>${formattedTime}</span>
          </div>
          <div class="audit-description">${log.description}</div>
        `;
        container.appendChild(item);
      });
    }
  
      // --- PENGURUS FUNCTIONS ---
      function populateKelompokFilterPengurus() {
        const filter = document.getElementById('filter-kelompok-pengurus');
        if (!filter) return;
        filter.innerHTML = '<option value="">Semua Kelompok Pengajian</option>';
        (localMasterKelompok || []).forEach(k => {
          filter.innerHTML += `<option value="${k}">${k}</option>`;
        });
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        if (currentUser && isOperator) {
          filter.value = currentUser.kelompok;
          filter.disabled = true;
        } else {
          filter.disabled = false;
        }
      }
