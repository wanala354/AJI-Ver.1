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
        if (currentUser && curRoleClean === "operator kelompok") {
          finalData = finalData.filter(p => p.kel === currentUser.kelompok);
        }
        
        if (finalData.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada data pengurus ditemukan</td></tr>';
          return;
        }
        
        finalData.forEach((p, idx) => {
          tbody.innerHTML += `<tr>
            <td>${idx + 1}</td>
            <td>${p.nama}</td>
            <td>${p.kel}</td>
            <td><span class="status-badge status-active">${p.tingkat_pengurus}</span></td>
            <td>${p.dapuan}</td>
            <td style="text-align: center;">
              <div class="action-buttons" style="justify-content: center;">
                <button class="btn-action btn-delete" title="Hapus Pengurus" onclick="deletePengurus('${p.id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>`;
        });
        renderPengurusReport();
      }

      function showAddPengurusModal() {
        document.getElementById('pengurusForm').reset();
        document.getElementById('pengurus-id').value = '';
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        let availableJamaah = getJamaahList();
        if (currentUser && curRoleClean === "operator kelompok") {
           availableJamaah = availableJamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
        }
        
        const selectJamaah = document.getElementById('pengurus-jamaah-id');
        selectJamaah.innerHTML = '<option value="">-- Pilih Jamaah --</option>';
        availableJamaah.forEach(j => { 
          selectJamaah.innerHTML += `<option value="${j.id}">${j.namaLengkap} (${j.kelompokPengajian})</option>`; 
        });
        
        const selectDapuan = document.getElementById('pengurus-dapuan');
        selectDapuan.innerHTML = '<option value="">-- Pilih Dapuan --</option>';
        (localMasterDapuan || []).forEach(d => {
          selectDapuan.innerHTML += `<option value="${d}">${d}</option>`;
        });
        
        document.getElementById('pengurusModal').classList.add('active');
      }

      function savePengurus() {
        const jId = document.getElementById('pengurus-jamaah-id').value;
        const tingkat = document.getElementById('pengurus-tingkat').value;
        const dapuan = document.getElementById('pengurus-dapuan').value;
        
        if(!jId || !tingkat || !dapuan) { 
          showToast('Semua kolom wajib diisi!', 'warning'); 
          return; 
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
          supabaseClient.from('pengurus').insert([{ jamaah_id: jId, tingkat_pengurus: tingkat, dapuan: dapuan }])
          .then((response) => {
            const error = response && response.error ? response.error : null;
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Pengurus';
            
            if(error) {
              showToast('Gagal menyimpan pengurus: ' + error.message, 'error');
            } else { 
              document.getElementById('pengurusModal').classList.remove('active'); 
              showToast('Data Pengurus berhasil disimpan', 'success');
              
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
        const pListTotal = getPengurusList() || [];
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


