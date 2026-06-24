      function renderPengurusTable() {
        const tbody = document.getElementById('pengurusTableBody');
        const filterTingkat = document.getElementById('filter-tingkat-pengurus').value;
        const filterKel = document.getElementById('filter-kelompok-pengurus');
        const filterKelompok = filterKel ? filterKel.value : '';
        if(!tbody) return;
        tbody.innerHTML = '';
        
        let filtered = getPengurusList() || [];
        if(filterTingkat) filtered = filtered.filter(p => p.tingkat_pengurus === filterTingkat);
        
        const pData = filtered.map(p => {
          const j = getJamaahList().find(x => x.id === p.jamaah_id);
          return {
            ...p,
            nama: j ? j.namaLengkap : 'Jamaah Terhapus',
            kel: j ? j.kelompokPengajian : '-'
          };
        });
        
        let finalData = pData;
        if(filterKelompok) finalData = finalData.filter(p => p.kel === filterKelompok);
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        if (currentUser && isOperator) {
          finalData = finalData.filter(p => p.kel === currentUser.kelompok);
        }
        
        const grouped = {};
        finalData.forEach(p => {
          if (!p.jamaah_id) return;
          if (!grouped[p.jamaah_id]) {
            grouped[p.jamaah_id] = {
              jamaah_id: p.jamaah_id,
              nama: p.nama,
              kel: p.kel,
              roles: []
            };
          }
          grouped[p.jamaah_id].roles.push({
            id: p.id,
            tingkat_pengurus: p.tingkat_pengurus,
            dapuan: p.dapuan
          });
        });
        
        const sortedGroups = Object.values(grouped).sort((a, b) => a.nama.localeCompare(b.nama));
        
        if (sortedGroups.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada data pengurus ditemukan</td></tr>';
          return;
        }
        
        sortedGroups.forEach((group, idx) => {
          let tingkatHtml = '';
          let dapuanHtml = '';
          let aksiHtml = '';
          
          const hasWriteAccess = currentUser && (curRoleClean === 'admin' || isOperator);
          
          group.roles.forEach(role => {
            tingkatHtml += `<div style="min-height: 32px; display: flex; align-items: center; margin-bottom: 4px;"><span class="status-badge status-active">${role.tingkat_pengurus}</span></div>`;
            dapuanHtml += `<div style="min-height: 32px; display: flex; align-items: center; margin-bottom: 4px;">${role.dapuan}</div>`;
            
            let actionButtons = '';
            if (hasWriteAccess) {
              actionButtons = `
                <div class="action-btns" style="justify-content: center; gap: 4px;">
                  <button class="btn-icon edit" style="padding: 2px 6px; font-size: 0.75rem;" title="Edit Jabatan" onclick="showEditPengurusModal('${role.id}')"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn-icon delete" style="padding: 2px 6px; font-size: 0.75rem; background: #ef4444;" title="Hapus Jabatan" onclick="deletePengurus('${role.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            } else {
              actionButtons = `<span style="color: var(--text-secondary); font-size:0.85rem;">-</span>`;
            }
            
            aksiHtml += `<div style="min-height: 32px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">${actionButtons}</div>`;
          });
          
          tbody.innerHTML += `<tr>
            <td>${idx + 1}</td>
            <td><strong>${group.nama}</strong><span style="display:block; font-size:0.72rem; color:var(--text-secondary);">${group.jamaah_id}</span></td>
            <td>${group.kel}</td>
            <td>${tingkatHtml}</td>
            <td>${dapuanHtml}</td>
            <td style="text-align: center;">
              ${aksiHtml}
            </td>
          </tr>`;
        });
        
        renderPengurusReport();
      }

      function showAddPengurusModal() {
        document.getElementById('pengurusForm').reset();
        document.getElementById('pengurus-id').value = '';
        document.getElementById('pengurusModalTitle').innerHTML = '<i class="fa-solid fa-sitemap"></i> Tambah Pengurus';
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        let availableJamaah = getJamaahList();
        if (currentUser && isOperator) {
           availableJamaah = availableJamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
        }
        
        const inputJamaah = document.getElementById('pengurus-jamaah-id');
        const listJamaah = document.getElementById('pengurus-jamaah-id-list');
        inputJamaah.value = '';
        listJamaah.innerHTML = '';
        availableJamaah.forEach(j => { 
          const opt = document.createElement('option');
          opt.value = `${j.namaLengkap} (${j.id})`;
          listJamaah.appendChild(opt);
        });
        
        const selectDapuan = document.getElementById('pengurus-dapuan');
        selectDapuan.innerHTML = '<option value="">-- Pilih Dapuan --</option>';
        (localMasterDapuan || []).forEach(d => {
          selectDapuan.innerHTML += `<option value="${d}">${d}</option>`;
        });
        
        document.getElementById('pengurusModal').classList.add('active');
      }

      function showEditPengurusModal(id) {
        const p = (getPengurusList() || []).find(x => x.id === id);
        if (!p) {
          showToast('Data pengurus tidak ditemukan!', 'error');
          return;
        }
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        if (currentUser && isOperator) {
          const j = getJamaahList().find(x => x.id === p.jamaah_id);
          if (j && j.kelompokPengajian !== currentUser.kelompok) {
            showToast('Anda tidak memiliki akses untuk mengedit data ini!', 'error');
            return;
          }
        }
        
        showAddPengurusModal();
        
        document.getElementById('pengurusModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Pengurus';
        document.getElementById('pengurus-id').value = p.id;
        const j = getJamaahList().find(x => x.id === p.jamaah_id);
        document.getElementById('pengurus-jamaah-id').value = j ? `${j.namaLengkap} (${j.id})` : "";
        document.getElementById('pengurus-tingkat').value = p.tingkat_pengurus;
        document.getElementById('pengurus-dapuan').value = p.dapuan;
      }

      function savePengurus() {
        const id = document.getElementById('pengurus-id').value;
        const rawVal = document.getElementById('pengurus-jamaah-id').value;
        const match = rawVal.match(/\((J-\d+)\)/);
        const jId = match ? match[1] : null;
        const tingkat = document.getElementById('pengurus-tingkat').value;
        const dapuan = document.getElementById('pengurus-dapuan').value;
        
        if(!jId || !tingkat || !dapuan) { 
          showToast('Semua kolom wajib diisi!', 'warning'); 
          return; 
        }
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        if (currentUser && isOperator) {
          if (id) {
            const originalPengurus = (getPengurusList() || []).find(p => p.id === id);
            if (originalPengurus) {
              const originalJamaah = getJamaahList().find(j => j.id === originalPengurus.jamaah_id);
              if (originalJamaah && originalJamaah.kelompokPengajian !== currentUser.kelompok) {
                showToast('Anda tidak memiliki akses untuk mengubah data ini!', 'error');
                return;
              }
            }
          }
          const selectedJamaah = getJamaahList().find(j => j.id === jId);
          if (selectedJamaah && selectedJamaah.kelompokPengajian !== currentUser.kelompok) {
            showToast('Anda hanya bisa mengelola pengurus dari kelompok Anda sendiri!', 'error');
            return;
          }
        }
        
        const saveBtn = document.getElementById('pengurus-modal-save-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Pengurus';
          showToast('Koneksi database (Supabase) belum dikonfigurasi!', 'error');
          return;
        }

        try {
          const promise = id 
            ? supabaseClient.from('pengurus').update({ jamaah_id: jId, tingkat_pengurus: tingkat, dapuan: dapuan }).eq('id', id)
            : supabaseClient.from('pengurus').insert([{ jamaah_id: jId, tingkat_pengurus: tingkat, dapuan: dapuan }]);

          promise.then((response) => {
            const error = response && response.error ? response.error : null;
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Pengurus';
            
            if(error) {
              showToast('Gagal menyimpan pengurus: ' + error.message, 'error');
            } else { 
              document.getElementById('pengurusModal').classList.remove('active'); 
              showToast(id ? 'Data Pengurus berhasil diperbarui' : 'Data Pengurus berhasil disimpan', 'success');
              
              if (typeof google !== 'undefined' && google && google.script) {
                fetchDatabaseFromServer(function() {
                  if (document.getElementById("section-pengurus").classList.contains("active")) {
                    renderPengurusTable();
                  }
                });
              } else {
                // If local/mock testing, just refresh manually
                supabaseClient.from("pengurus").select("*").then(({ data }) => { 
                  if(data) localPengurusList = data; 
                  if (document.getElementById("section-pengurus").classList.contains("active")) {
                    renderPengurusTable();
                  }
                });
              }
            }
          })
          .catch(err => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Pengurus';
            showToast('Terjadi kesalahan jaringan/sistem: ' + (err.message || err), 'error');
          });
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Pengurus';
          showToast('Terjadi kesalahan tidak terduga: ' + (err.message || err), 'error');
        }
      }

      function deletePengurus(id) {
        if(!confirm('Apakah Anda yakin ingin menghapus data pengurus ini?')) return;
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        if (currentUser && isOperator) {
          const p = (getPengurusList() || []).find(x => x.id === id);
          if (p) {
            const j = getJamaahList().find(x => x.id === p.jamaah_id);
            if (j && j.kelompokPengajian !== currentUser.kelompok) {
              showToast('Anda hanya bisa menghapus pengurus dari kelompok Anda sendiri!', 'error');
              return;
            }
          }
        }
        
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
          showToast('Koneksi database (Supabase) belum dikonfigurasi!', 'error');
          return;
        }
        
        try {
          supabaseClient.from('pengurus').delete().eq('id', id).then((response) => {
            const error = response && response.error ? response.error : null;
            if(error) {
              showToast('Gagal menghapus pengurus: ' + error.message, 'error');
            } else { 
              showToast('Data Pengurus berhasil dihapus', 'success');
              
              if (typeof google !== 'undefined' && google && google.script) {
                fetchDatabaseFromServer(function() {
                  if (document.getElementById("section-pengurus").classList.contains("active")) {
                    renderPengurusTable();
                  }
                });
              } else {
                supabaseClient.from("pengurus").select("*").then(({ data }) => { 
                  if(data) localPengurusList = data; 
                  if (document.getElementById("section-pengurus").classList.contains("active")) {
                    renderPengurusTable();
                  }
                });
              }
            }
          })
          .catch(err => {
            showToast('Terjadi kesalahan jaringan/sistem: ' + (err.message || err), 'error');
          });
        } catch (err) {
          showToast('Terjadi kesalahan tidak terduga: ' + (err.message || err), 'error');
        }
      }

      function renderPengurusReport() {
        let pListTotal = getPengurusList() || [];
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean.includes("operator");
        if (currentUser && isOperator) {
          pListTotal = pListTotal.filter(p => {
            const j = getJamaahList().find(x => x.id === p.jamaah_id);
            return j && j.kelompokPengajian === currentUser.kelompok;
          });
        }
        
        document.getElementById('count-desa').textContent = pListTotal.filter(p => p.tingkat_pengurus === 'Desa').length;
        document.getElementById('count-kelompok').textContent = pListTotal.filter(p => p.tingkat_pengurus === 'Kelompok').length;
        document.getElementById('count-organisasi').textContent = pListTotal.filter(p => p.tingkat_pengurus === 'Organisasi').length;
        document.getElementById('count-yayasan').textContent = pListTotal.filter(p => p.tingkat_pengurus === 'Yayasan').length;
        
        const container = document.getElementById('pengurus-report-container');
        if(!container) return;
        container.innerHTML = '';
        
        const kelompokMap = {};
        pListTotal.forEach(p => {
          const j = getJamaahList().find(x => x.id === p.jamaah_id);
          const kel = j ? j.kelompokPengajian : 'Tanpa Kelompok';
          if (!kelompokMap[kel]) kelompokMap[kel] = [];
          kelompokMap[kel].push({ ...p, nama: j ? j.namaLengkap : '-' });
        });
        
        const kelKeys = Object.keys(kelompokMap).sort();
        
        if (kelKeys.length === 0) {
           container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Belum ada data pengurus untuk dilaporkan</div>';
           return;
        }
        
        let reportHtml = '';
        kelKeys.forEach(kel => {
          reportHtml += `<div style="margin-bottom: 25px;">
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 10px; color: var(--primary);"><i class="fa-solid fa-users-rectangle"></i> Kelompok Pengajian: ${kel}</div>
            <table class="table-custom" style="margin-top:0;">
              <thead><tr><th style="width: 25%;">Tingkat</th><th style="width: 35%;">Dapuan / Jabatan</th><th style="width: 40%;">Nama Jamaah</th></tr></thead>
              <tbody>`;
              
          kelompokMap[kel].sort((a,b) => a.tingkat_pengurus.localeCompare(b.tingkat_pengurus)).forEach(p => {
            reportHtml += `<tr>
              <td><span class="status-badge status-active">${p.tingkat_pengurus}</span></td>
              <td>${p.dapuan}</td>
              <td style="font-weight: 500;">${p.nama}</td>
            </tr>`;
          });
          reportHtml += `</tbody></table></div>`;
        });
        
        container.innerHTML = reportHtml;
      }


