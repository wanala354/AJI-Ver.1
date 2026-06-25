    // JAMAAH TABLE POPULATION & FILTERS (PAGINATED)
    // ----------------------------------------------------
    function populateFilterOptions() {
      // Kelompok Filter
      const filterK = document.getElementById("filter-kelompok");
      const savedSelK = filterK.value;
      filterK.innerHTML = '<option value="">-- Semua Kelompok --</option>';
      
      localMasterKelompok.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        filterK.appendChild(opt);
      });
      
      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      if (currentUser && curRoleClean === "operator kelompok") {
        filterK.value = currentUser.kelompok;
        filterK.disabled = true; // Lock down groups selection
      } else {
        filterK.value = savedSelK;
        filterK.disabled = false;
      }
      
      // Dapuan Filter
      const filterD = document.getElementById("filter-dapuan");
      const savedSelD = filterD.value;
      filterD.innerHTML = '<option value="">-- Semua Dapuan --</option>';
      localMasterDapuan.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        filterD.appendChild(opt);
      });
      filterD.value = savedSelD;
    }

    function populateJamaahTable() {
      filterJamaahTable();
    }

    function filterJamaahTable() {
      const searchVal = document.getElementById("filter-search").value.toLowerCase();
      const kelompokVal = document.getElementById("filter-kelompok").value;
      const peramutanVal = document.getElementById("filter-peramutan").value;
      const ekonomiVal = document.getElementById("filter-ekonomi").value;
      const dapuanVal = document.getElementById("filter-dapuan").value;
      const kelancaranVal = document.getElementById("filter-kelancaran").value;
      
      const list = getJamaahList();
      filteredJamaahList = list.filter(j => {
        const matchSearch = j.namaLengkap.toLowerCase().includes(searchVal) || j.id.toLowerCase().includes(searchVal);
        const matchKelompok = kelompokVal === "" || j.kelompokPengajian === kelompokVal;
        const matchPeramutan = peramutanVal === "" || j.kelompokPeramutan === peramutanVal;
        const matchEkonomi = ekonomiVal === "" || j.statusEkonomi === ekonomiVal;
        const matchDapuan = dapuanVal === "" || j.dapuan === dapuanVal;
        
        let matchKelancaran = true;
        if (kelancaranVal !== "") {
          const ks = (j.kelancaranSambung || "").trim();
          if (kelancaranVal === "Kurang Lancar") {
            matchKelancaran = ks === "Kurang Lancar" || ks === "Kurang Tertib" || ks.toLowerCase().includes("kurang");
          } else if (kelancaranVal === "Perlu Perhatian") {
            matchKelancaran = ks === "Perlu Perhatian" || ks === "Tidak Pernah" || ks.toLowerCase().includes("perhatian") || ks.toLowerCase().includes("tidak");
          } else {
            matchKelancaran = ks.toLowerCase() === kelancaranVal.toLowerCase();
          }
        }
        
        return matchSearch && matchKelompok && matchPeramutan && matchEkonomi && matchDapuan && matchKelancaran;
      });
      
      renderPagedJamaahTable();
    }

    function renderPagedJamaahTable() {
      const tbody = document.getElementById("table-jamaah-body");
      tbody.innerHTML = "";
      
      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      const isAdmin = currentUser && curRoleClean === "admin";
      const isOperator = currentUser && curRoleClean === "operator kelompok";
      const isOperatorDesa = currentUser && curRoleClean === "operator desa";
      const hasWriteAccess = isAdmin || isOperator || isOperatorDesa;
      
      const totalRecords = filteredJamaahList.length;
      const totalPages = Math.ceil(totalRecords / pageSize) || 1;
      
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;
      
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, totalRecords);
      const pageData = filteredJamaahList.slice(startIdx, endIdx);
      
      // Update pagination bar
      document.getElementById("pag-start").textContent = totalRecords > 0 ? startIdx + 1 : 0;
      document.getElementById("pag-end").textContent = endIdx;
      document.getElementById("pag-total").textContent = totalRecords;
      document.getElementById("pag-page-num").textContent = `Halaman ${currentPage} dari ${totalPages}`;
      
      document.getElementById("btn-pag-first").disabled = currentPage === 1;
      document.getElementById("btn-pag-prev").disabled = currentPage === 1;
      document.getElementById("btn-pag-next").disabled = currentPage === totalPages;
      document.getElementById("btn-pag-last").disabled = currentPage === totalPages;
      
      if (totalRecords === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 25px; color: var(--text-secondary);"><i class="fa-solid fa-triangle-exclamation"></i> Tidak ada data jamaah.</td></tr>`;
        document.getElementById("jamaah-shown-count").textContent = 0;
        document.getElementById("jamaah-total-count").textContent = getJamaahList().length;
        return;
      }
      
      pageData.forEach(j => {
        const tr = document.createElement("tr");
        let peramutanClass = "badge-gray";
        if (j.kelompokPeramutan === "Balita") peramutanClass = "badge-purple";
        else if (j.kelompokPeramutan === "PAUD") peramutanClass = "badge-blue";
        else if (j.kelompokPeramutan === "Caberawit") peramutanClass = "badge-green";
        else if (j.kelompokPeramutan === "GUS") peramutanClass = "badge-purple";
        else if (j.kelompokPeramutan === "GUM") peramutanClass = "badge-yellow";
        else if (j.kelompokPeramutan === "Dewasa") peramutanClass = "badge-green";
        else if (j.kelompokPeramutan === "Manula") peramutanClass = "badge-red";
        
        let ekonomiClass = "badge-green";
        if (j.statusEkonomi === "Dhuafa") ekonomiClass = "badge-yellow";
        else if (j.statusEkonomi === "Menengah") ekonomiClass = "badge-blue";
        
        let sambungClass = "badge-green";
        const ks = (j.kelancaranSambung || "").trim();
        if (ks === "Kurang Lancar" || ks === "Kurang Tertib" || ks.toLowerCase().includes("kurang")) {
          sambungClass = "badge-yellow";
        } else if (ks === "Perlu Perhatian" || ks === "Tidak Pernah" || ks.toLowerCase().includes("perhatian") || ks.toLowerCase().includes("tidak")) {
          sambungClass = "badge-red";
        }
        
        // RLS: Operator only can edit their own kelompok members
        const canWriteThisRow = isAdmin || isOperatorDesa || (isOperator && j.kelompokPengajian === currentUser.kelompok);
        
        let actionButtons = `<div class="action-btns">
          <button class="btn-icon view" data-id="${j.id}" title="Lihat Detail"><i class="fa-solid fa-eye"></i></button>`;
        if (canWriteThisRow) {
          actionButtons += `
          <button class="btn-icon edit" data-id="${j.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon delete" data-id="${j.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>`;
        }
        actionButtons += `</div>`;
          
        tr.innerHTML = `
          <td><strong>${j.id}</strong></td>
          <td>${j.namaLengkap}</td>
          <td>${j.kelompokPengajian}</td>
          <td>${j.jenisKelamin}</td>
          <td>${j.umur} Tahun</td>
          <td><span class="badge ${peramutanClass}">${j.kelompokPeramutan}</span></td>
          <td>${j.tingkatPendidikan}</td>
          <td><span class="badge ${ekonomiClass}">${j.statusEkonomi}</span></td>
          <td><span class="badge ${sambungClass}">${j.kelancaranSambung}</span></td>
          <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
      });
      
      // Attach view click listener (available to all roles)
      tbody.querySelectorAll(".btn-icon.view").forEach(btn => {
        btn.addEventListener("click", () => openJamaahViewModal(btn.getAttribute("data-id")));
      });
      
      if (hasWriteAccess) {
        tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
          btn.addEventListener("click", () => openJamaahModal(btn.getAttribute("data-id")));
        });
        tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            deleteJamaah(id, currentUser.username);
          });
        });
      }
      
      document.getElementById("jamaah-shown-count").textContent = filteredJamaahList.length;
      document.getElementById("jamaah-total-count").textContent = getJamaahList().length;
    }

    // ----------------------------------------------------
    // JAMAAH FORM ENTRY MODAL
    // ----------------------------------------------------
    function openJamaahModal(jamaahId = null) {
      const modal = document.getElementById("jamaah-modal");
      const form = document.getElementById("jamaah-form");
      form.reset();
      editingJamaahId = jamaahId;
      
      populateFormDropdowns();
      const currentUser = getCurrentUser();
      
      if (jamaahId) {
        document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Data Jamaah (${jamaahId})`;
        const item = getJamaahList().find(j => j.id === jamaahId);
        if (item) {
          document.getElementById("form-id").value = item.id;
          document.getElementById("form-nama").value = item.namaLengkap;
          
          // Prefill Kelompok (Radio / Locked display)
          const curRoleClean = (currentUser.role || "").trim().toLowerCase();
          if (curRoleClean === "operator kelompok") {
            // Locked
            populateFormKKDropdown(currentUser.kelompok);
          } else {
            const radio = document.querySelector(`input[name="form-kelompok"][value="${item.kelompokPengajian}"]`);
            if (radio) radio.checked = true;
            populateFormKKDropdown(item.kelompokPengajian);
          }
          
          document.getElementById("form-gender").value = item.jenisKelamin;
          document.getElementById("form-tempat-lahir").value = item.tempatLahir;
          document.getElementById("form-tanggal-lahir").value = item.tanggalLahir;
          document.getElementById("form-umur").value = item.umur;
          document.getElementById("form-pernikahan").value = item.statusPernikahan;
          document.getElementById("form-peramutan").value = item.kelompokPeramutan;
          document.getElementById("form-hubungan").value = item.statusHubunganKeluarga;
          
          const kkId = item.kepalaKeluargaId;
          const kkItem = getJamaahList().find(j => j.id === kkId);
          document.getElementById("form-kepala-keluarga").value = kkItem ? `${kkItem.namaLengkap} (${kkItem.id})` : "";
          document.getElementById("form-hp").value = item.nomorHp || "";
          document.getElementById("form-pendidikan").value = item.tingkatPendidikan;
          document.getElementById("form-pekerjaan").value = item.pekerjaanUtama;
          document.getElementById("form-dapuan").value = item.dapuan;
          document.getElementById("form-ekonomi").value = item.statusEkonomi;
          document.getElementById("form-kelancaran").value = item.kelancaranSambung;

          updateFormKKState();
        }
      } else {
        document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-user-plus"></i> Tambah Data Jamaah Baru`;
        document.getElementById("form-id").value = "";
        document.getElementById("form-umur").value = "0";
        document.getElementById("form-peramutan").value = "-";
        
        const curRoleClean = (currentUser.role || "").trim().toLowerCase();
        if (curRoleClean === "operator kelompok") {
          populateFormKKDropdown(currentUser.kelompok);
        } else {
          const firstRadio = document.querySelector('input[name="form-kelompok"]');
          if (firstRadio) {
            firstRadio.checked = true;
            populateFormKKDropdown(firstRadio.value);
          }
        }
        updateFormKKState();
      }

      const roleClean = (currentUser.role || "").trim().toLowerCase();
      const dapuanInput = document.getElementById("form-dapuan");
      const ekonomiInput = document.getElementById("form-ekonomi");
      const kelancaranInput = document.getElementById("form-kelancaran");
      if (roleClean === "user" || roleClean === "jamaah") {
        if (dapuanInput) { dapuanInput.closest(".form-group").style.display = "none"; dapuanInput.removeAttribute("required"); }
        if (ekonomiInput) { ekonomiInput.closest(".form-group").style.display = "none"; ekonomiInput.removeAttribute("required"); }
        if (kelancaranInput) { kelancaranInput.closest(".form-group").style.display = "none"; kelancaranInput.removeAttribute("required"); }
      } else {
        if (dapuanInput) { dapuanInput.closest(".form-group").style.display = ""; dapuanInput.setAttribute("required", "required"); }
        if (ekonomiInput) { ekonomiInput.closest(".form-group").style.display = ""; ekonomiInput.setAttribute("required", "required"); }
        if (kelancaranInput) { kelancaranInput.closest(".form-group").style.display = ""; kelancaranInput.setAttribute("required", "required"); }
      }

      modal.classList.add("active");
    }

    function closeJamaahModal() {
      document.getElementById("jamaah-modal").classList.remove("active");
      editingJamaahId = null;
    }

    function populateFormDropdowns() {
      const curUser = getCurrentUser();
      
      // Default choice option placeholder generator
      const fillSelectWithOptions = (element, arr, label) => {
        element.innerHTML = `<option value="" disabled selected>-- Pilih ${label} --</option>`;
        arr.forEach(val => {
          const opt = document.createElement("option");
          opt.value = val;
          opt.textContent = val;
          element.appendChild(opt);
        });
      };

      fillSelectWithOptions(document.getElementById("form-pernikahan"), MASTER_PERNIKAHAN, "Status Pernikahan");
      fillSelectWithOptions(document.getElementById("form-hubungan"), localMasterHubungan, "Hubungan Keluarga");
      fillSelectWithOptions(document.getElementById("form-pendidikan"), localMasterPendidikan, "Pendidikan");
      fillSelectWithOptions(document.getElementById("form-pekerjaan"), localMasterPekerjaan, "Pekerjaan");
      fillSelectWithOptions(document.getElementById("form-dapuan"), localMasterDapuan, "Dapuan");
      fillSelectWithOptions(document.getElementById("form-ekonomi"), MASTER_EKONOMI, "Status Ekonomi");
      fillSelectWithOptions(document.getElementById("form-kelancaran"), MASTER_KELANCARAN, "Kelancaran Sambung");

      // Kelompok options (radios or pre-selected single value)
      const radioGroup = document.getElementById("form-kelompok-group");
      radioGroup.innerHTML = "";
      
      const curRoleClean = curUser ? (curUser.role || "").trim().toLowerCase() : "";
      if (curUser && curRoleClean === "operator kelompok") {
        const p = document.createElement("p");
        p.style.fontWeight = "bold";
        p.style.color = "var(--primary)";
        p.innerHTML = `<i class="fa-solid fa-lock"></i> Kelompok Otoritas Anda: ${curUser.kelompok}`;
        radioGroup.appendChild(p);
      } else if (curUser && curRoleClean === "jamaah") {
        const myJ = getJamaahList().find(j => j.id === localCurrentJamaahId);
        const myKelompok = myJ ? myJ.kelompokPengajian : "-";
        const p = document.createElement("p");
        p.style.fontWeight = "bold";
        p.style.color = "var(--primary)";
        p.innerHTML = `<i class="fa-solid fa-lock"></i> Kelompok Anda: ${myKelompok}`;
        radioGroup.appendChild(p);
      } else {
        localMasterKelompok.forEach((k, idx) => {
          const label = document.createElement("label");
          label.className = "radio-label";
          label.innerHTML = `<input type="radio" name="form-kelompok" value="${k}" ${idx === 0 ? "checked" : ""}> ${k}`;
          radioGroup.appendChild(label);
          label.querySelector("input").addEventListener("change", (e) => {
            populateFormKKDropdown(e.target.value);
          });
        });
      }
    }

    function populateFormKKDropdown(kelompokPengajian) {
      const kkListEl = document.getElementById("form-kepala-keluarga-list");
      if (!kkListEl) return;
      kkListEl.innerHTML = "";
      
      const kkList = getKepalaKeluargaList();
      const filteredKK = kkList.filter(kk => kk.kelompokPengajian === kelompokPengajian && kk.id !== editingJamaahId);
      
      filteredKK.forEach(kk => {
        const opt = document.createElement("option");
        opt.value = `${kk.namaLengkap} (${kk.id})`;
        kkListEl.appendChild(opt);
      });
    }

    function updateFormKKState() {
      const relationship = document.getElementById("form-hubungan").value;
      const kkSelect = document.getElementById("form-kepala-keluarga");
      const kkHint = document.getElementById("form-kk-hint");
      
      const curUser = getCurrentUser();
      const curRoleClean = curUser ? (curUser.role || "").trim().toLowerCase() : "";

      if (relationship === "Kepala Keluarga") {
        kkSelect.value = "";
        kkSelect.disabled = true;
        kkHint.textContent = "Kepala Keluarga bertindak sebagai root, tidak memerlukan relasi.";
      } else {
        kkSelect.disabled = false;
        kkHint.textContent = "Disaring berdasarkan kelompok pengajian yang sama.";
      }

      if (curRoleClean === "jamaah") {
        const myJ = getJamaahList().find(j => j.id === localCurrentJamaahId);
        if (myJ && relationship !== "Kepala Keluarga") {
          const myKkId = myJ.statusHubunganKeluarga === "Kepala Keluarga" ? myJ.id : myJ.kepalaKeluargaId;
          const kkItem = getJamaahList().find(j => j.id === myKkId);
          if (kkItem) {
            kkSelect.value = `${kkItem.namaLengkap} (${kkItem.id})`;
          }
          kkSelect.disabled = true;
          kkHint.textContent = "Kepala keluarga terkunci pada data keluarga Anda.";
        }
      }
    }

    // ----------------------------------------------------
    // KARTU KELUARGA DISPATCHER
    // ----------------------------------------------------
    function populateKKFilterOptions() {
      const kkFilter = document.getElementById("kk-filter-kelompok");
      const savedVal = kkFilter.value;
      kkFilter.innerHTML = `<option value="">-- Pilih Kelompok --</option>`;
      
      localMasterKelompok.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        kkFilter.appendChild(opt);
      });
      
      const curUser = getCurrentUser();
      const curRoleClean = curUser ? (curUser.role || "").trim().toLowerCase() : "";
      if (curUser && curRoleClean === "operator kelompok") {
        kkFilter.value = curUser.kelompok;
        kkFilter.disabled = true;
      } else {
        kkFilter.value = savedVal;
        kkFilter.disabled = false;
      }
    }

    function populateKKList() {
      const selectedKelompok = document.getElementById("kk-filter-kelompok").value;
      const list = getKepalaKeluargaList();
      const filtered = selectedKelompok === "" ? list : list.filter(kk => kk.kelompokPengajian === selectedKelompok);
      const listContainer = document.getElementById("kk-sidebar-list");
      listContainer.innerHTML = "";
      
      if (filtered.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.85rem;">Tidak ada KK.</div>`;
        document.getElementById("kk-details-container").innerHTML = `<div style="text-align: center; padding: 40px 0; color: var(--text-secondary);"><i class="fa-solid fa-folder-open" style="font-size:3rem; margin-bottom:15px; display:block;"></i>Tidak ada data Kartu Keluarga.</div>`;
        return;
      }
      
      filtered.forEach((kk, idx) => {
        const item = document.createElement("div");
        item.className = "kk-item";
        item.innerHTML = `<h4>${kk.namaLengkap}</h4><p>ID: ${kk.id} | Kelompok: ${kk.kelompokPengajian}</p>`;
        item.addEventListener("click", () => {
          document.querySelectorAll(".kk-item").forEach(i => i.classList.remove("active"));
          item.classList.add("active");
          renderKKDetails(kk.id);
        });
        listContainer.appendChild(item);
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
      const familyMembers = jamaah.filter(j => j.kepalaKeluargaId === kkId && j.id !== kkId);
      const container = document.getElementById("kk-details-container");
      container.innerHTML = "";
      
      const kkNumberMock = `327508${kkId.replace("J-", "00")}${Math.floor(1000 + Math.random() * 9000)}`;
      let membersRows = `
        <tr>
          <td>1</td>
          <td><strong>${kkHead.namaLengkap}</strong></td>
          <td>Laki-laki</td>
          <td>${kkHead.tempatLahir}, ${formatDateIndo(kkHead.tanggalLahir)}</td>
          <td>${kkHead.umur}</td>
          <td>Kepala Keluarga</td>
          <td>${kkHead.pekerjaanUtama}</td>
          <td>${kkHead.tingkatPendidikan}</td>
        </tr>
      `;
      
      familyMembers.forEach((m, idx) => {
        membersRows += `
          <tr>
            <td>${idx + 2}</td>
            <td>${m.namaLengkap}</td>
            <td>${m.jenisKelamin}</td>
            <td>${m.tempatLahir}, ${formatDateIndo(m.tanggalLahir)}</td>
            <td>${m.umur}</td>
            <td>${m.statusHubunganKeluarga}</td>
            <td>${m.pekerjaanUtama}</td>
            <td>${m.tingkatPendidikan}</td>
          </tr>
        `;
      });
      
      container.innerHTML = `
        <div class="kk-cert-header">
          <h3>KARTU KELUARGA</h3>
          <p>No. ${kkNumberMock}</p>
        </div>
        <div class="kk-cert-meta">
          <div class="kk-meta-item"><span class="label">Nama Kepala Keluarga:</span><span class="val">${kkHead.namaLengkap}</span></div>
          <div class="kk-meta-item"><span class="label">Kelompok Pengajian:</span><span class="val">${kkHead.kelompokPengajian}</span></div>
          <div class="kk-meta-item"><span class="label">Status Ekonomi KK:</span><span class="val" style="color: ${kkHead.statusEkonomi === 'Aghnia' ? '#10b981' : kkHead.statusEkonomi === 'Dhuafa' ? '#f59e0b' : '#3b82f6' }">${kkHead.statusEkonomi}</span></div>
          <div class="kk-meta-item"><span class="label">Alamat / Wilayah:</span><span class="val">Pondok Melati, Bekasi</span></div>
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
              </tr>
            </thead>
            <tbody>
              ${membersRows}
            </tbody>
          </table>
        </div>
      `;
    }

    // ----------------------------------------------------
    // JAMAAH VIEW DETAILS MODAL
    // ----------------------------------------------------
    function openJamaahViewModal(id) {
      const modal = document.getElementById("jamaah-view-modal");
      if (!modal) return;
      
      const item = getJamaahList().find(j => j.id === id);
      if (!item) {
        showToast("Data jamaah tidak ditemukan!", "error");
        return;
      }
      
      // Look up Kepala Keluarga name if they are not KK themselves
      let kkName = "-";
      if (item.statusHubunganKeluarga === "Kepala Keluarga") {
        kkName = "(Dirinya Sendiri)";
      } else if (item.kepalaKeluargaId) {
        const kkItem = getJamaahList().find(j => j.id === item.kepalaKeluargaId);
        kkName = kkItem ? `${kkItem.namaLengkap} (${item.kepalaKeluargaId})` : `ID: ${item.kepalaKeluargaId}`;
      }
      
      // 1. Populate text contents for Profile
      document.getElementById("view-j-id").textContent = item.id || "-";
      document.getElementById("view-j-nama").textContent = item.namaLengkap || "-";
      document.getElementById("view-j-kelompok").textContent = item.kelompokPengajian || "-";
      document.getElementById("view-j-gender").textContent = item.jenisKelamin || "-";
      document.getElementById("view-j-birth").textContent = `${item.tempatLahir || "-"}, ${item.tanggalLahir ? formatDateIndo(item.tanggalLahir) : "-"}`;
      document.getElementById("view-j-umur").textContent = item.umur ? `${item.umur} Tahun` : "-";
      document.getElementById("view-j-pernikahan").textContent = item.statusPernikahan || "-";
      document.getElementById("view-j-peramutan").textContent = item.kelompokPeramutan || "-";
      document.getElementById("view-j-hubungan").textContent = item.statusHubunganKeluarga || "-";
      document.getElementById("view-j-kk").textContent = kkName;
      document.getElementById("view-j-hp").textContent = item.nomorHp || "-";
      document.getElementById("view-j-pendidikan").textContent = item.tingkatPendidikan || "-";
      document.getElementById("view-j-pekerjaan").textContent = item.pekerjaanUtama || "-";
      document.getElementById("view-j-dapuan").textContent = item.dapuan || "-";
      document.getElementById("view-j-ekonomi").textContent = item.statusEkonomi || "-";
      document.getElementById("view-j-kelancaran").textContent = item.kelancaranSambung || "-";
      
      // 2. Populate Family Members
      const kkId = (item.statusHubunganKeluarga === "Kepala Keluarga") ? item.id : item.kepalaKeluargaId;
      let familyHtml = "";
      if (kkId) {
        const members = getJamaahList().filter(j => j.kepalaKeluargaId === kkId || j.id === kkId);
        
        // Sort family members: KK, Istri, Anak, then others
        const hubOrder = { "Kepala Keluarga": 1, "Istri": 2, "Anak": 3, "Ayah": 4, "Ibu": 5 };
        members.sort((a, b) => (hubOrder[a.statusHubunganKeluarga] || 99) - (hubOrder[b.statusHubunganKeluarga] || 99));
        
        members.forEach(m => {
          const isSelf = m.id === item.id;
          familyHtml += `
            <tr style="${isSelf ? 'background: rgba(16, 185, 129, 0.15); font-weight: bold;' : ''}">
              <td>${m.namaLengkap} ${isSelf ? '<span class="badge badge-green" style="font-size:0.65rem; padding: 2px 4px; margin-left: 4px;">Anda</span>' : ''}</td>
              <td>${m.statusHubunganKeluarga}</td>
              <td>${m.umur} Thn</td>
            </tr>
          `;
        });
      }
      
      if (familyHtml === "") {
        familyHtml = `<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-secondary);">Tidak ada relasi anggota keluarga.</td></tr>`;
      }
      document.getElementById("view-family-members-body").innerHTML = familyHtml;

      // 3. Populate Attendance Recaps
      const schedules = getJadwalPengajianList();
      const presences = getPresensiKehadiranList();
      const masterJenis = getMasterJenisPengajianList();
      const pengurusList = getPengurusList();
      
      // Helper function to check relevance
      const isSessionRelevant = (session, jamaah) => {
        // Kelompok check
        if (session.tingkat_pengajian === "Kelompok" && session.kelompok_pengajian !== jamaah.kelompokPengajian) {
          return false;
        }
        
        // Participant rules
        const jenisName = session.jenis_pengajian;
        const jenisNameClean = (jenisName || "").trim().toLowerCase();
        const genderClean = (jamaah.jenisKelamin || "").trim().toLowerCase();
        if (genderClean === "laki-laki" && (jenisNameClean === "ibu-ibu" || jenisNameClean === "ibu - ibu" || jenisNameClean === "kewanitaan")) {
          return false;
        }
        
        if (jenisName === "Pengurus") {
          const isPengurus = (pengurusList || []).some(p => p.jamaah_id === jamaah.id);
          if (!isPengurus) return false;
        }
        
        const jenisObj = (masterJenis || []).find(j => j.nama === jenisName);
        if (jenisObj && jenisObj.peserta_pengajian) {
          const allowed = jenisObj.peserta_pengajian.split(",").map(x => x.trim().toLowerCase());
          if (allowed.length > 0 && !allowed.includes(jamaah.kelompokPeramutan.toLowerCase())) {
            return false;
          }
        }
        
        return true;
      };

      // Group sessions by (tingkat, jenis)
      const groups = {};
      const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
      schedules.forEach(session => {
        if (!isSessionRelevant(session, item)) return;
        
        // Only include sessions that are today or in the past
        if (session.tanggal > todayStr) return;
        
        // Only include sessions that have actually been marked/filled (have at least one record in database)
        const isFilled = presences.some(p => p.id_pengajian === session.id);
        if (!isFilled) return;
        
        const key = `${session.tingkat_pengajian} - ${session.jenis_pengajian}`;
        if (!groups[key]) {
          groups[key] = {
            tingkat: session.tingkat_pengajian,
            jenis: session.jenis_pengajian,
            sessions: []
          };
        }
        groups[key].sessions.push(session);
      });
      
      let presensiHtml = "";
      Object.values(groups).forEach(g => {
        let hadirFisik = 0;
        let online = 0;
        let izin = 0;
        let alpha = 0;
        const totalSesi = g.sessions.length;
        
        g.sessions.forEach(session => {
          const pRecord = presences.find(p => p.id_pengajian === session.id && p.id_jamaah === item.id);
          if (pRecord) {
            if (pRecord.status === "Hadir Fisik") hadirFisik++;
            else if (pRecord.status === "Online") online++;
            else if (pRecord.status === "Izin") izin++;
            else alpha++;
          } else {
            alpha++;
          }
        });
        
        const totalHadir = hadirFisik + online;
        const percentage = totalSesi > 0 ? Math.round((totalHadir / totalSesi) * 100) : 0;
        
        let badgeClass = "badge-red";
        let statusText = "Kurang";
        if (percentage >= 85) {
          badgeClass = "badge-green";
          statusText = "Sangat Baik";
        } else if (percentage >= 70) {
          badgeClass = "badge-blue";
          statusText = "Baik";
        }
        
        presensiHtml += `
          <tr>
            <td><span class="badge ${g.tingkat === 'Kelompok' ? 'badge-green' : g.tingkat === 'Desa' ? 'badge-blue' : 'badge-yellow'}">${g.tingkat}</span></td>
            <td><strong>${g.jenis}</strong></td>
            <td>${totalHadir} <span style="font-size:0.75rem; color:var(--text-muted);">(${hadirFisik} F / ${online} O)</span></td>
            <td>${izin}</td>
            <td>${alpha}</td>
            <td><strong>${totalSesi}</strong></td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="width:35px; text-align:right;">${percentage}%</strong>
                <div style="flex-grow:1; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; width:80px;">
                  <div style="height:100%; width:${percentage}%; background:${percentage >= 85 ? '#10b981' : percentage >= 70 ? '#3b82f6' : '#ef4444'}; border-radius:3px;"></div>
                </div>
              </div>
            </td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
          </tr>
        `;
      });
      
      if (presensiHtml === "") {
        presensiHtml = `<tr><td colspan="8" style="text-align:center; padding:15px; color:var(--text-secondary);">Tidak ada sesi jadwal pengajian yang diikuti.</td></tr>`;
      }
      document.getElementById("view-presensi-recap-body").innerHTML = presensiHtml;
      
      modal.classList.add("active");
    }

    function closeJamaahViewModal() {
      const modal = document.getElementById("jamaah-view-modal");
      if (modal) modal.classList.remove("active");
    }
    
    window.openJamaahViewModal = openJamaahViewModal;
    window.closeJamaahViewModal = closeJamaahViewModal;