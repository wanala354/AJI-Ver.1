    // DATA MASTER CRUDS & VIEWS (VERSION 2.1)
    // ----------------------------------------------------
    function getSelectedMasterList() {
      if (activeMasterTab === "Kelompok") return localMasterKelompok;
      if (activeMasterTab === "Tingkat Pendidikan") return localMasterPendidikan;
      if (activeMasterTab === "Dapuan") return localMasterDapuan;
      if (activeMasterTab === "Pekerjaan") return localMasterPekerjaan;
      if (activeMasterTab === "Status Hubungan Keluarga") return localMasterHubungan;
      if (activeMasterTab === "Materi Kegiatan") return localMasterMateri;
      if (activeMasterTab === "Jenis Kegiatan") return localMasterJenisPengajian;
      if (activeMasterTab === "Peserta Kegiatan") return localMasterPesertaPengajian;
      if (activeMasterTab === "Grup Kustom") return localMasterGrupKustom;
      if (activeMasterTab === "Tempat Kegiatan") return localMasterTempatKegiatan;
      return [];
    }

    function renderMasterTable() {
      const tbody = document.getElementById("table-master-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      
      const thead = document.querySelector("#table-master thead");
      if (activeMasterTab === "Pengajar") {
        thead.innerHTML = `
          <tr>
            <th>ID Pengajar</th>
            <th>Nama Jamaah</th>
            <th>Kelompok</th>
            <th style="width: 150px; text-align:center;">Aksi</th>
          </tr>
        `;
      } else if (activeMasterTab === "Jenis Kegiatan") {
        thead.innerHTML = `
          <tr>
            <th>Nama Opsi</th>
            <th>Sasaran Peserta</th>
            <th>Batasan Gender</th>
            <th>Batasan Dapuan</th>
            <th style="width: 150px; text-align:center;">Aksi</th>
          </tr>
        `;
      } else if (activeMasterTab === "Peserta Kegiatan") {
        thead.innerHTML = `
          <tr>
            <th>ID Peserta</th>
            <th>Nama Sasaran</th>
            <th style="width: 150px; text-align:center;">Aksi</th>
          </tr>
        `;
      } else if (activeMasterTab === "Grup Kustom") {
        thead.innerHTML = `
          <tr>
            <th>Nama Grup</th>
            <th>Deskripsi</th>
            <th>Jumlah Anggota</th>
            <th style="width: 150px; text-align:center;">Aksi</th>
          </tr>
        `;
      } else {
        thead.innerHTML = `
          <tr>
            <th>Nama Opsi</th>
            <th style="width: 150px; text-align:center;">Aksi</th>
          </tr>
        `;
      }
      
      if (activeMasterTab === "Pengajar") {
        const list = getMasterPengajarList() || [];
        const jamaahList = getJamaahList() || [];
        const curUser = getCurrentUser();
        const isAdmin = curUser && curUser.role.trim().toLowerCase() === "admin";
        
        let displayList = list;
        if (!isAdmin && curUser && curUser.role.trim().toLowerCase() === "operator kelompok") {
          const targetKelompok = curUser.kelompok;
          displayList = list.filter(item => {
            const j = jamaahList.find(j => j.id === item.id_jamaah);
            return j && j.kelompokPengajian === targetKelompok;
          });
        }
        
        if (displayList.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada opsi master.</td></tr>`;
          return;
        }
        
        displayList.forEach(item => {
          const j = jamaahList.find(jamaah => jamaah.id === item.id_jamaah);
          const nama = j ? j.namaLengkap : `[ID Jamaah: ${item.id_jamaah}]`;
          const kelompok = j ? j.kelompokPengajian : "-";
          
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>P-${String(item.id_pengajar).padStart(3, '0')}</strong></td>
            <td>${nama}</td>
            <td>${kelompok}</td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon delete" data-id="${item.id_pengajar}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
        
        tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
          btn.addEventListener("click", () => deletePengajarItem(btn.getAttribute("data-id")));
        });
        return;
      }
      
      const list = getSelectedMasterList();
      if (list.length === 0) {
        let cols = 2;
        if (activeMasterTab === "Jenis Kegiatan") cols = 5;
        else if (activeMasterTab === "Peserta Kegiatan") cols = 3;
        else if (activeMasterTab === "Grup Kustom") cols = 4;
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada opsi master.</td></tr>`;
        return;
      }

      list.forEach(item => {
        const tr = document.createElement("tr");
        if (activeMasterTab === "Jenis Kegiatan") {
          const nama = typeof item === 'object' ? item.nama : item;
          const peserta = typeof item === 'object' ? (item.peserta_pengajian || '-') : '-';
          const gender = typeof item === 'object' ? (item.batasan_gender || 'Semua') : 'Semua';
          const dapuan = typeof item === 'object' ? (item.target_dapuan || 'Semua') : 'Semua';
          tr.innerHTML = `
            <td><strong>${nama}</strong></td>
            <td>${peserta}</td>
            <td>${gender}</td>
            <td style="white-space: normal; word-break: break-word; min-width: 150px;">${dapuan}</td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon edit" data-name="${nama}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" data-name="${nama}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
        } else if (activeMasterTab === "Peserta Kegiatan") {
          const id = item.id_peserta;
          const nama = item.nama;
          tr.innerHTML = `
            <td><strong>${id}</strong></td>
            <td>${nama}</td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon edit" data-name="${id}" data-display-name="${nama}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" data-name="${id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
        } else if (activeMasterTab === "Grup Kustom") {
          const nama = item.nama;
          const desc = item.deskripsi || '-';
          const count = item.daftar_id_anggota ? item.daftar_id_anggota.split(',').filter(Boolean).length : 0;
          tr.innerHTML = `
            <td><strong>${nama}</strong></td>
            <td>${desc}</td>
            <td><span class="status-badge status-active">${count} Anggota</span></td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon edit" data-name="${nama}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" data-name="${nama}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
        } else {
          const val = typeof item === 'object' ? item.nama : item;
          tr.innerHTML = `
            <td><strong>${val}</strong></td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon edit" data-name="${val}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" data-name="${val}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
        }
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
        btn.addEventListener("click", () => {
          if (activeMasterTab === "Peserta Kegiatan") {
            openMasterModal(btn.getAttribute("data-name"), btn.getAttribute("data-display-name"));
          } else {
            openMasterModal(btn.getAttribute("data-name"));
          }
        });
      });
      tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
        btn.addEventListener("click", () => deleteMasterItem(btn.getAttribute("data-name")));
      });
    }

    function openMasterModal(name = null, displayName = null) {
      editingMasterName = name;
      const modal = document.getElementById("master-modal");
      const title = document.getElementById("master-modal-title");
      const input = document.getElementById("master-form-input");
      
      const pesertaContainer = document.getElementById("master-form-peserta-container");
      const pContainer = document.getElementById("master-form-peserta-checkboxes-container");
      const genderContainer = document.getElementById("master-form-gender-container");
      const dapuanContainer = document.getElementById("master-form-dapuan-container");
      const grupKustomContainer = document.getElementById("master-form-grup-kustom-container");
      
      document.getElementById("master-form-old-name").value = name || "";
      
      // Reset form fields
      document.getElementById("master-form-gender").value = "Semua";
      document.getElementById("master-form-dapuan").innerHTML = "";
      document.getElementById("master-form-grup-kustom-desc").value = "";
      document.getElementById("master-form-grup-kustom-search").value = "";
      document.getElementById("master-form-grup-kustom-list").innerHTML = "";
      
      // Hide all conditional containers first
      pesertaContainer.style.display = "none";
      genderContainer.style.display = "none";
      dapuanContainer.style.display = "none";
      grupKustomContainer.style.display = "none";
      
      if (activeMasterTab === "Jenis Kegiatan") {
        pesertaContainer.style.display = "block";
        genderContainer.style.display = "block";
        dapuanContainer.style.display = "block";
        
        // Populate checkboxes
        pContainer.innerHTML = "";
        const pesertaList = getMasterPesertaPengajianList() || [];
        pesertaList.forEach(p => {
          const div = document.createElement("div");
          div.style.display = "flex";
          div.style.alignItems = "center";
          div.style.gap = "5px";
          div.innerHTML = `
            <input type="checkbox" name="master-form-peserta-chk" value="${p.nama}" id="chk-peserta-${p.id_peserta}">
            <label for="chk-peserta-${p.id_peserta}" style="font-size: 0.85rem; cursor: pointer;">${p.nama}</label>
          `;
          pContainer.appendChild(div);
        });
        
        // Populate dapuan select
        const dapuanSelect = document.getElementById("master-form-dapuan");
        (localMasterDapuan || []).forEach(d => {
          dapuanSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
        
        if (name) {
          const list = getSelectedMasterList();
          const item = list.find(x => x.nama === name);
          if (item) {
            if (item.peserta_pengajian) {
              const currentPeserta = item.peserta_pengajian.split(",").map(p => p.trim());
              document.querySelectorAll('input[name="master-form-peserta-chk"]').forEach(chk => {
                if (currentPeserta.includes(chk.value)) {
                  chk.checked = true;
                }
              });
            }
            document.getElementById("master-form-gender").value = item.batasan_gender || "Semua";
            const currentDapuan = item.target_dapuan ? item.target_dapuan.split(",").map(d => d.trim()) : [];
            for (let i = 0; i < dapuanSelect.options.length; i++) {
              if (currentDapuan.includes(dapuanSelect.options[i].value)) {
                dapuanSelect.options[i].selected = true;
              }
            }
          }
        }
      } else if (activeMasterTab === "Grup Kustom") {
        grupKustomContainer.style.display = "block";
        
        // Populate members list
        const listContainer = document.getElementById("master-form-grup-kustom-list");
        const jamaahList = getJamaahList() || [];
        jamaahList.forEach(j => {
          const div = document.createElement("div");
          div.className = "grup-kustom-member-item";
          div.style.display = "flex";
          div.style.alignItems = "center";
          div.style.gap = "8px";
          div.setAttribute("data-nama", j.namaLengkap.toLowerCase());
          div.innerHTML = `
            <input type="checkbox" name="master-form-grup-member-chk" value="${j.id}" id="chk-grup-mem-${j.id}">
            <label for="chk-grup-mem-${j.id}" style="font-size:0.85rem; cursor:pointer;">${j.namaLengkap} <span style="color:var(--text-muted);font-size:0.75rem;">(${j.kelompokPengajian})</span></label>
          `;
          listContainer.appendChild(div);
        });
        
        if (name) {
          const list = getSelectedMasterList();
          const item = list.find(x => x.nama === name);
          if (item) {
            document.getElementById("master-form-grup-kustom-desc").value = item.deskripsi || "";
            const currentMembers = item.daftar_id_anggota ? item.daftar_id_anggota.split(",").map(id => id.trim()) : [];
            document.querySelectorAll('input[name="master-form-grup-member-chk"]').forEach(chk => {
              if (currentMembers.includes(chk.value)) {
                chk.checked = true;
              }
            });
          }
        }
      }
      
      if (name) {
        title.innerHTML = `<i class="fa-solid fa-pen"></i> Edit Opsi ${activeMasterTab}`;
        input.value = displayName || name;
      } else {
        title.innerHTML = `<i class="fa-solid fa-plus"></i> Tambah Opsi ${activeMasterTab}`;
        input.value = "";
      }
      modal.classList.add("active");
    }

    function closeMasterModal() {
      document.getElementById("master-modal").classList.remove("active");
      editingMasterName = null;
    }

    function filterGrupKustomAnggotaList() {
      const q = document.getElementById("master-form-grup-kustom-search").value.toLowerCase();
      const items = document.querySelectorAll("#master-form-grup-kustom-list .grup-kustom-member-item");
      items.forEach(item => {
        const name = item.getAttribute("data-nama") || "";
        if (name.includes(q)) {
          item.style.display = "flex";
        } else {
          item.style.display = "none";
        }
      });
    }
    window.filterGrupKustomAnggotaList = filterGrupKustomAnggotaList;

    function deleteMasterItem(name) {
      const curUser = getCurrentUser();
      if (confirm(`Apakah Anda yakin ingin menghapus opsi "${name}" dari tabel master ${activeMasterTab}? Semua data yang terkait akan ikut dibersihkan.`)) {
        if (typeof supabaseDeleteMasterItem === 'function') {
          supabaseDeleteMasterItem(activeMasterTab, name, curUser.username)
            .then(() => {
              fetchDatabaseFromServer(function() {
                renderMasterTable();
                showToast(`Opsi ${name} berhasil dihapus dari master ${activeMasterTab}!`, "success");
              });
            })
            .catch(err => {
              showToast("Gagal menghapus opsi master: " + err.message, "error");
            });
        }
      }
    }

    function openPengajarMasterModal() {
      const modal = document.getElementById("pengajar-master-modal");
      const input = document.getElementById("pengajar-master-jamaah-select");
      const list = document.getElementById("pengajar-master-jamaah-select-list");
      
      input.value = "";
      list.innerHTML = "";
      
      const teacherJamaahIds = new Set((getMasterPengajarList() || []).map(p => p.id_jamaah));
      const candidates = (getJamaahList() || []).filter(j => (!j.statusKeaktifan || j.statusKeaktifan === "Aktif") && !teacherJamaahIds.has(j.id));
      
      candidates.forEach(j => {
        const opt = document.createElement("option");
        opt.value = `${j.namaLengkap} (${j.id})`;
        list.appendChild(opt);
      });
      
      modal.classList.add("active");
    }
    
    function closePengajarMasterModal() {
      document.getElementById("pengajar-master-modal").classList.remove("active");
      document.getElementById("pengajar-master-form").reset();
    }
    
    function savePengajarMasterForm(e) {
      e.preventDefault();
      const curUser = getCurrentUser();
      const rawVal = document.getElementById("pengajar-master-jamaah-select").value;
      const match = rawVal.match(/\((J-\d+)\)/);
      const jamaahId = match ? match[1] : null;
      if (!jamaahId) {
        showToast("Pilih jamaah terlebih dahulu!", "warning");
        return;
      }
      
      const saveBtn = document.getElementById("pengajar-master-modal-save-btn");
      const oldHtml = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
      
      const payload = {
        id_jamaah: jamaahId
      };
      
      saveMasterPengajar(payload, curUser ? curUser.username : null, function(saved) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = oldHtml;
        closePengajarMasterModal();
        showToast("Pengajar baru berhasil ditambahkan!", "success");
        renderMasterTable();
      }, function(err) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = oldHtml;
        showToast("Gagal menyimpan pengajar: " + err.message, "error");
      });
    }
    
    function deletePengajarItem(id_pengajar) {
      const curUser = getCurrentUser();
      const item = (getMasterPengajarList() || []).find(p => p.id_pengajar == id_pengajar);
      if (!item) return;
      const jamaah = (getJamaahList() || []).find(j => j.id === item.id_jamaah);
      const name = jamaah ? jamaah.namaLengkap : item.id_jamaah;
      
      if (confirm(`Apakah Anda yakin ingin menghapus "${name}" dari Daftar Pengajar?`)) {
        const deleteBtn = document.querySelector(`.btn-icon.delete[data-id="${id_pengajar}"]`);
        const oldHtml = deleteBtn ? deleteBtn.innerHTML : "";
        if (deleteBtn) {
          deleteBtn.disabled = true;
          deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        }
        
        deleteMasterPengajar(id_pengajar, curUser ? curUser.username : null, function() {
          showToast(`Pengajar "${name}" berhasil dihapus!`, "success");
          renderMasterTable();
        }, function(err) {
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = oldHtml;
          }
          showToast("Gagal menghapus pengajar: " + err.message, "error");
        });
      }
    }

    // ----------------------------------------------------
    // USER ACCOUNTS MANAGEMENT (CRUD)
    // ----------------------------------------------------
    function populateUserFilterKelompok() {
      const select = document.getElementById("user-filter-kelompok");
      if (!select || select.children.length > 1) return;
      const list = typeof localMasterKelompok !== 'undefined' ? localMasterKelompok : [];
      list.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        select.appendChild(opt);
      });
    }

    function initUserTableFilters() {
      populateUserFilterKelompok();
      
      const searchInput = document.getElementById("user-filter-search");
      const roleSelect = document.getElementById("user-filter-role");
      const kelompokSelect = document.getElementById("user-filter-kelompok");

      if (searchInput && !searchInput.dataset.filterBound) {
        searchInput.dataset.filterBound = "true";
        searchInput.addEventListener("input", renderUsersTable);
      }
      if (roleSelect && !roleSelect.dataset.filterBound) {
        roleSelect.dataset.filterBound = "true";
        roleSelect.addEventListener("change", renderUsersTable);
      }
      if (kelompokSelect && !kelompokSelect.dataset.filterBound) {
        kelompokSelect.dataset.filterBound = "true";
        kelompokSelect.addEventListener("change", renderUsersTable);
      }
    }

    function renderUsersTable() {
      const tbody = document.getElementById("table-users-body");
      if (!tbody) return;

      initUserTableFilters();

      tbody.innerHTML = "";
      
      const list = getUsersList();
      const jamaahList = typeof getJamaahList === 'function' ? getJamaahList() : (typeof localJamaahList !== 'undefined' ? localJamaahList : []);

      const searchVal = (document.getElementById("user-filter-search")?.value || "").trim().toLowerCase();
      const roleVal = (document.getElementById("user-filter-role")?.value || "").trim().toLowerCase();
      const kelompokVal = (document.getElementById("user-filter-kelompok")?.value || "").trim().toLowerCase();

      list.forEach(u => {
        let namaJamaah = "-";
        const jId = u.jamaah_id || u.jamaahId;
        if (jId) {
          const jObj = jamaahList.find(j => j.id === jId);
          if (jObj) {
            namaJamaah = jObj.namaLengkap || jObj.nama_lengkap || jObj.nama || jId;
          } else {
            namaJamaah = jId;
          }
        } else if (u.namaLengkap || u.nama_lengkap) {
          namaJamaah = u.namaLengkap || u.nama_lengkap;
        } else if (u.username) {
          const uClean = u.username.trim().toLowerCase();
          const jMatch = jamaahList.find(j => {
            const jNama = (j.namaLengkap || j.nama_lengkap || j.nama || "").trim().toLowerCase();
            if (!jNama) return false;
            return jNama === uClean || jNama.replace(/\s+/g, ".") === uClean || jNama.replace(/\s+/g, "") === uClean;
          });
          if (jMatch) {
            namaJamaah = jMatch.namaLengkap || jMatch.nama_lengkap || jMatch.nama;
          }
        }

        // Apply filters
        if (roleVal && (u.role || '').trim().toLowerCase() !== roleVal) {
          return;
        }
        if (kelompokVal && (u.kelompok || 'Semua').trim().toLowerCase() !== kelompokVal) {
          return;
        }
        if (searchVal) {
          const matchUsername = (u.username || '').toLowerCase().includes(searchVal);
          const matchEmail = (u.email || '').toLowerCase().includes(searchVal);
          const matchNama = namaJamaah.toLowerCase().includes(searchVal);
          if (!matchUsername && !matchEmail && !matchNama) {
            return;
          }
        }

        const tr = document.createElement("tr");

        const roleClean = (u.role || '').trim().toLowerCase();
        let badgeClass = 'badge-blue';
        if (roleClean === 'admin') badgeClass = 'badge-red';
        else if (roleClean === 'jamaah') badgeClass = 'badge-green';

        tr.innerHTML = `
          <td><strong>${u.username}</strong></td>
          <td>${u.email}</td>
          <td><span class="badge ${badgeClass}">${u.role}</span></td>
          <td>${u.kelompok || "Semua"}</td>
          <td>${namaJamaah}</td>
          <td style="text-align:center;">
            <div class="action-btns" style="justify-content:center;">
              <button class="btn-icon edit" data-user="${u.username}" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon delete" data-user="${u.username}" title="Hapus" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      if (tbody.children.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 20px;">Tidak ada data pengguna yang sesuai filter.</td></tr>`;
      }

      tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
        btn.addEventListener("click", () => openUserModal(btn.getAttribute("data-user")));
      });

      tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
        btn.addEventListener("click", () => deleteUserConfirm(btn.getAttribute("data-user")));
      });
    }

    function deleteUserConfirm(username) {
      const curUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      if (curUser && curUser.username && curUser.username.toLowerCase() === username.toLowerCase()) {
        showToast("Anda tidak dapat menghapus akun Anda sendiri!", "warning");
        return;
      }
      if (!confirm(`Apakah Anda yakin ingin menghapus akun pengguna "${username}"?`)) return;

      const opUsername = curUser ? curUser.username : "admin";

      deleteUser(
        username,
        opUsername,
        function() {
          renderUsersTable();
          showToast(`Akun pengguna "${username}" berhasil dihapus!`, "success");
        },
        function(err) {
          showToast("Gagal menghapus pengguna: " + (err ? (err.message || err) : "Terjadi kesalahan"), "error");
        }
      );
    }

    function populateUserKelompokDropdown() {
      const select = document.getElementById("user-form-kelompok");
      select.innerHTML = '<option value="" disabled selected>-- Pilih Kelompok --</option>';
      localMasterKelompok.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        select.appendChild(opt);
      });
    }

    function toggleUserKelompokField() {
      const role = (document.getElementById("user-form-role").value || "").trim().toLowerCase();
      const group = document.getElementById("user-form-kelompok-group");
      if (role === "operator kelompok" || role === "pengurus kelompok") {
        group.style.display = "block";
      } else {
        group.style.display = "none";
      }
    }

    function openUserModal(username = null) {
      editingUserUsername = username;
      const modal = document.getElementById("user-modal");
      const form = document.getElementById("user-form");
      form.reset();
      
      populateUserKelompokDropdown();
      
      const isEditInput = document.getElementById("user-form-is-edit");
      const usernameInput = document.getElementById("user-form-username");
      const title = document.getElementById("user-modal-title");
      
      if (username) {
        // Edit Mode
        title.innerHTML = `<i class="fa-solid fa-user-pen"></i> Edit Akun Pengguna`;
        isEditInput.value = "true";
        usernameInput.value = username;
        usernameInput.disabled = true; // Cannot edit username
        
        const userObj = getUsersList().find(u => u.username.toLowerCase() === username.toLowerCase());
        if (userObj) {
          document.getElementById("user-form-email").value = userObj.email;
          const roleSelect = document.getElementById("user-form-role");
          const targetRole = (userObj.role || "").trim().toLowerCase();
          const matchedOpt = Array.from(roleSelect.options).find(opt => opt.value.trim().toLowerCase() === targetRole);
          if (matchedOpt) {
            roleSelect.value = matchedOpt.value;
          } else {
            roleSelect.value = userObj.role || "";
          }
          toggleUserKelompokField();
          if (targetRole === "operator kelompok" || targetRole === "pengurus kelompok") {
            document.getElementById("user-form-kelompok").value = userObj.kelompok;
          }
          document.getElementById("user-form-password").placeholder = "Kosongkan jika tidak diubah";
        }
      } else {
        // Add Mode
        title.innerHTML = `<i class="fa-solid fa-user-plus"></i> Tambah Pengguna Baru`;
        isEditInput.value = "false";
        usernameInput.disabled = false;
        document.getElementById("user-form-password").placeholder = "Password minimal 6 karakter";
        toggleUserKelompokField();
      }
      
      modal.classList.add("active");
    }

    function closeUserModal() {
      document.getElementById("user-modal").classList.remove("active");
      editingUserUsername = null;
    }

    // ----------------------------------------------------