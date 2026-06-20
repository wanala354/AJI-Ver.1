    // DATA MASTER CRUDS & VIEWS (VERSION 2.1)
    // ----------------------------------------------------
    function getSelectedMasterList() {
      if (activeMasterTab === "Kelompok") return localMasterKelompok;
      if (activeMasterTab === "Tingkat Pendidikan") return localMasterPendidikan;
      if (activeMasterTab === "Dapuan") return localMasterDapuan;
      if (activeMasterTab === "Pekerjaan") return localMasterPekerjaan;
      if (activeMasterTab === "Status Hubungan Keluarga") return localMasterHubungan;
      if (activeMasterTab === "Materi Pengajian") return localMasterMateri;
      if (activeMasterTab === "Jenis Pengajian") return localMasterJenisPengajian;
      return [];
    }

    function renderMasterTable() {
      const tbody = document.getElementById("table-master-body");
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
        
        // Filter list based on operator kelompok (only show teachers belonging to their kelompok)
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
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada opsi master.</td></tr>`;
        return;
      }

      list.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${item}</strong></td>
          <td style="text-align:center;">
            <div class="action-btns" style="justify-content:center;">
              <button class="btn-icon edit" data-name="${item}" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon delete" data-name="${item}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
        btn.addEventListener("click", () => openMasterModal(btn.getAttribute("data-name")));
      });
      tbody.querySelectorAll(".btn-icon.delete").forEach(btn => {
        btn.addEventListener("click", () => deleteMasterItem(btn.getAttribute("data-name")));
      });
    }

    function openMasterModal(name = null) {
      editingMasterName = name;
      const modal = document.getElementById("master-modal");
      const title = document.getElementById("master-modal-title");
      const input = document.getElementById("master-form-input");
      document.getElementById("master-form-old-name").value = name || "";
      
      if (name) {
        title.innerHTML = `<i class="fa-solid fa-pen"></i> Edit Opsi ${activeMasterTab}`;
        input.value = name;
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

    function deleteMasterItem(name) {
      const curUser = getCurrentUser();
      if (confirm(`Apakah Anda yakin ingin menghapus opsi "${name}" dari tabel master ${activeMasterTab}? Semua data jamaah yang terkait akan ikut dibersihkan.`)) {
        google.script.run
          .withSuccessHandler(function() {
            fetchDatabaseFromServer(function() {
              renderMasterTable();
              showToast(`Opsi ${name} berhasil dihapus dari master ${activeMasterTab}!`, "success");
            });
          })
          .withFailureHandler(function(err) {
            showToast("Gagal menghapus opsi master: " + err.message, "error");
          })
          .deleteMasterItemGAS(activeMasterTab, name, curUser.username);
      }
    }

    function openPengajarMasterModal() {
      const modal = document.getElementById("pengajar-master-modal");
      const input = document.getElementById("pengajar-master-jamaah-select");
      const list = document.getElementById("pengajar-master-jamaah-select-list");
      
      input.value = "";
      list.innerHTML = "";
      
      const teacherJamaahIds = new Set((getMasterPengajarList() || []).map(p => p.id_jamaah));
      const candidates = (getJamaahList() || []).filter(j => !teacherJamaahIds.has(j.id));
      
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
    function renderUsersTable() {
      const tbody = document.getElementById("table-users-body");
      tbody.innerHTML = "";
      
      const list = getUsersList();
      list.forEach(u => {
        const tr = document.createElement("tr");
        const passDisplay = u.passwordHash.substring(0, 8) + "...";
        
        tr.innerHTML = `
          <td><strong>${u.username}</strong></td>
          <td>${u.email}</td>
          <td><span class="badge ${(u.role || '').trim().toLowerCase() === 'admin' ? 'badge-red' : 'badge-blue' }">${u.role}</span></td>
          <td>${u.kelompok || "Semua"}</td>
          <td style="text-align:center;">
            <div class="action-btns" style="justify-content:center;">
              <button class="btn-icon edit" data-user="${u.username}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll(".btn-icon.edit").forEach(btn => {
        btn.addEventListener("click", () => openUserModal(btn.getAttribute("data-user")));
      });
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
      const role = document.getElementById("user-form-role").value;
      const group = document.getElementById("user-form-kelompok-group");
      if (role === "Operator Kelompok") {
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
          document.getElementById("user-form-role").value = userObj.role;
          toggleUserKelompokField();
          if ((userObj.role || "").trim().toLowerCase() === "operator kelompok") {
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