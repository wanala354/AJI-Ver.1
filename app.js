
// --- BEGIN FILE: js/state.js ---
    // GLOBAL STATE VARIABLES (VERSION 2.1)
    // ----------------------------------------------------
    let localJamaahList = [];
    let localPengurusList = [];
    let localKepalaKeluargaList = [];
    let localKartuKeluargaMappings = [];
    let localAuditLogs = [];
    let localUsersList = [];
    
    // Constants for static master lists (v2.1)
    const MASTER_PERNIKAHAN = ["Belum Menikah", "Menikah", "Janda", "Duda"];
    const MASTER_EKONOMI = ["Aghnia", "Dhuafa", "Menengah"];
    const MASTER_KELANCARAN = ["Lancar", "Kurang Lancar", "Perlu Perhatian"];
    
    // Loaded dynamically from Google Sheets master sheets
    let localMasterKelompok = [];
    let localMasterPendidikan = [];
    let localMasterDapuan = [];
    let localMasterPekerjaan = [];
    let localMasterHubungan = [];
    let localMasterMateri = [];
    let localMasterPengajar = [];
    let localMasterJenisPengajian = [];
    let localJadwalPengajian = [];
    let localPresensiKehadiran = [];

    // Pagination & View state
    let currentPage = 1;
    const pageSize = 15;
    let filteredJamaahList = [];
    let activeMasterTab = "Kelompok";
    let editingUserUsername = null;
    let editingMasterName = null;
    let charts = {};
    let editingJamaahId = null;

    // ----------------------------------------------------
// --- END FILE: js/state.js ---

// --- BEGIN FILE: js/api.js ---
// SUPABASE DATABASE CONNECTOR & ADAPTER (v2.1 Serverless)
    // ----------------------------------------------------
    let useSupabase = false;
    let supabaseUrl = "";
    let supabaseKey = "";
    let supabaseClient = null;
    const nativeGoogle = typeof google !== "undefined" ? google : null;

    function initDatabaseConnection() {
      // Automatically connect using hardcoded or env variables
      supabaseUrl = "https://mphxkqcvcmdqafrslwti.supabase.co";
      supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHhrcWN2Y21kcWFmcnNsd3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjQ3NTQsImV4cCI6MjA5NjY0MDc1NH0.o2QXxuhTFwjG1RgAjBSd6JBApjtgdCE6bjTUfnWNET8";
      
      
      if (supabaseUrl && supabaseKey) {
        try {
          supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
          useSupabase = true;
          updateDbStatusUI(true);
        } catch (e) {
          console.error("Gagal menginisialisasi client Supabase:", e);
          useSupabase = false;
          updateDbStatusUI(false);
        }
      } else {
        useSupabase = false;
        updateDbStatusUI(false);
      }
    }

    function updateDbStatusUI(isConnected) {
      setTimeout(() => {
        const box = document.getElementById("db-status-box");
        const icon = document.getElementById("db-status-icon");
        const title = document.getElementById("db-status-title");
        const desc = document.getElementById("db-status-desc");
        
        if (box && icon && title && desc) {
          if (isConnected) {
            box.style.background = "rgba(16, 185, 129, 0.15)";
            box.style.borderColor = "rgba(16, 185, 129, 0.25)";
            icon.className = "fa-solid fa-circle-check";
            icon.style.color = "#10b981";
            title.textContent = "Terhubung ke Supabase";
            desc.textContent = "Koneksi database aktif dan aman (" + (supabaseUrl.split("//")[1] || "").split(".")[0] + ").";
          } else {
            box.style.background = "rgba(239, 68, 68, 0.1)";
            box.style.borderColor = "rgba(239, 68, 68, 0.2)";
            icon.className = "fa-solid fa-circle-exclamation";
            icon.style.color = "#ef4444";
            title.textContent = "Belum Terhubung";
            desc.textContent = "Menggunakan Demo Offline (Mock Storage).";
          }
        }
      }, 50);
    }

    // Supabase Backend Redirections
    function supabaseLogAction(user, action, description) {
      return supabaseClient.from("audit_logs").insert({
        operator_username: user || "System",
        action: action,
        description: description
      }).then(({ error }) => {
        if (error) throw error;
        return true;
      }).catch(err => {
        console.warn("Gagal menulis audit log ke Supabase:", err);
        return false;
      });
    }

    function supabaseGetAllData(operatorUsername) {
      return Promise.all([
        supabaseClient.from("jamaah").select("*").order("created_at", { ascending: false }),
        supabaseClient.from("app_users").select("*"),
        supabaseClient.from("master_kelompok").select("*"),
        supabaseClient.from("master_pendidikan").select("*"),
        supabaseClient.from("master_pekerjaan").select("*"),
        supabaseClient.from("master_dapuan").select("*"),
        supabaseClient.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(200),
        supabaseClient.from("master_materi_pengajian").select("*"),
        supabaseClient.from("pengajian_jadwal").select("*").order("tanggal", { ascending: false }),
        supabaseClient.from("pengajian_presensi").select("*"),
        supabaseClient.from("master_pengajar").select("*"),
        supabaseClient.from("master_jenis_pengajian").select("*").then(res => res, err => ({ data: [], error: err }))
      ]).then(([resJamaah, resUsers, resKelompok, resPendidikan, resPekerjaan, resDapuan, resLogs, resMateri, resJadwal, resPresensi, resMasterPengajar, resJenisPengajian]) => {
        if (resJamaah.error) throw resJamaah.error;
        if (resUsers.error) throw resUsers.error;
        
        const rawKelompok = (resKelompok.data || []).map(r => r.nama);
        const rawPendidikan = (resPendidikan.data || []).map(r => r.nama);
        const rawDapuan = (resDapuan.data || []).map(r => r.nama);
        const rawPekerjaan = (resPekerjaan.data || []).map(r => r.nama);
        const rawHubungan = ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"];
        
        const rawMateri = (resMateri.data || []).map(r => r.nama);
        const rawJenisPengajian = (resJenisPengajian.data || []).map(r => ({ nama: r.nama, peserta_pengajian: r.peserta_pengajian || "" }));
        const jadwalList = (resJadwal.data || []).map(j => ({
          id: j.id,
          tingkat_pengajian: j.tingkat_pengajian,
          jenis_pengajian: j.jenis_pengajian,
          tanggal: j.tanggal,
          waktu_mulai: j.waktu_mulai,
          waktu_selesai: j.waktu_selesai,
          materi_pengajar: typeof j.materi_pengajar === 'string' ? JSON.parse(j.materi_pengajar) : (j.materi_pengajar || []),
          kelompok_pengajian: j.kelompok_pengajian
        }));
        const presensiList = (resPresensi.data || []).map(p => ({
          id: p.id,
          id_pengajian: p.id_pengajian,
          id_jamaah: p.id_jamaah,
          status: p.status,
          keterangan: p.keterangan || ""
        }));
        
        const jamaahList = (resJamaah.data || []).map(j => ({
          id: j.id,
          namaLengkap: j.nama_lengkap,
          kelompokPengajian: j.kelompok_pengajian,
          jenisKelamin: j.jenis_kelamin,
          tempatLahir: j.tempat_lahir,
          tanggalLahir: j.tanggal_lahir,
          statusPernikahan: j.status_pernikahan,
          statusHubunganKeluarga: j.status_hubungan_keluarga,
          kepalaKeluargaId: j.kepala_keluarga_id || "",
          nomorHp: j.nomor_hp || "",
          tingkatPendidikan: j.tingkat_pendidikan,
          pekerjaanUtama: j.pekerjaan_utama,
          dapuan: j.dapuan,
          statusEkonomi: j.status_ekonomi,
          kelancaranSambung: j.kelancaran_sambung
        }));
        
        const usersList = (resUsers.data || []).map(u => ({
          username: u.username,
          email: u.email,
          role: u.role,
          passwordHash: u.password_hash,
          kelompok: u.kelompok
        }));
        
        const auditLogs = (resLogs.data || []).map(l => ({
          timestamp: l.timestamp,
          user: l.operator_username,
          action: l.action,
          description: l.description
        }));
        
        let filteredJamaah = jamaahList;
        let filteredLogs = auditLogs;
        let filteredJadwal = jadwalList;
        let filteredPresensi = presensiList;
        
        const userObj = usersList.find(u => u.username.toLowerCase() === (operatorUsername || "").toLowerCase());
        if (userObj && userObj.role.trim().toLowerCase() === "operator kelompok") {
          const targetKelompok = userObj.kelompok;
          filteredJamaah = jamaahList.filter(j => j.kelompokPengajian === targetKelompok);
          filteredJadwal = jadwalList.filter(j => j.kelompok_pengajian === targetKelompok);
          const sIds = filteredJadwal.map(s => s.id);
          filteredPresensi = presensiList.filter(p => sIds.indexOf(p.id_pengajian) !== -1);
          
          filteredLogs = auditLogs.filter(log => {
            return log.user.toLowerCase() === (operatorUsername || "").toLowerCase() ||
                   log.description.indexOf("di Kelompok " + targetKelompok) !== -1 ||
                   log.description.indexOf("kelompokPengajian: '" + targetKelompok + "'") !== -1;
          });
        }
        
        return {
          jamaahList: filteredJamaah,
          kepalaKeluargaList: filteredJamaah.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga"),
          kartuKeluargaMappings: filteredJamaah.filter(j => j.statusHubunganKeluarga !== "Kepala Keluarga" && j.kepalaKeluargaId).map(j => ({
            kepalaKeluargaId: j.kepalaKeluargaId,
            anggotaKeluargaId: j.id
          })),
          auditLogs: filteredLogs,
          usersList: usersList,
          masterKelompok: rawKelompok.map(n => ({ nama: n })),
          masterPendidikan: rawPendidikan.map(n => ({ nama: n })),
          masterDapuan: rawDapuan.map(n => ({ nama: n })),
          masterPekerjaan: rawPekerjaan.map(n => ({ nama: n })),
          masterHubungan: rawHubungan.map(n => ({ nama: n })),
          masterMateri: rawMateri.map(n => ({ nama: n })),
          masterJenisPengajian: rawJenisPengajian,
          masterPengajar: (resMasterPengajar.data || []).map(p => ({
            id_pengajar: p.id,
            id_jamaah: p.id_jamaah
          })),
          jadwalPengajian: filteredJadwal,
          presensiKehadiran: filteredPresensi
        };
      });
    }

    function supabaseAuthenticateUser(username, passwordHash) {
      return supabaseClient.from("app_users")
        .select("*")
        .eq("username", username)
        .eq("password_hash", passwordHash)
        .then(({ data, error }) => {
          if (error) throw error;
          if (data && data.length > 0) {
            supabaseLogAction(data[0].username, "LOGIN", "Pengguna " + data[0].username + " dengan role " + data[0].role + " (" + data[0].kelompok + ") login ke Web App (Supabase).");
            return {
              success: true,
              user: {
                username: data[0].username,
                email: data[0].email,
                role: data[0].role,
                kelompok: data[0].kelompok
              }
            };
          }
          return { success: false };
        });
    }

    function supabaseSaveJamaah(jamaahData, operatorUsername) {
      let idPromise;
      if (!jamaahData.id) {
        idPromise = supabaseClient.from("jamaah").select("id").then(({ data }) => {
          let maxIdNum = 0;
          (data || []).forEach(j => {
            if (j.id && j.id.indexOf("J-") === 0) {
              const num = parseInt(j.id.replace("J-", ""));
              if (num > maxIdNum) maxIdNum = num;
            }
          });
          return "J-" + String(maxIdNum + 1).padStart(3, '0');
        });
      } else {
        idPromise = Promise.resolve(jamaahData.id);
      }
      
      return idPromise.then(finalId => {
        jamaahData.id = finalId;
        const pgData = {
          id: jamaahData.id,
          nama_lengkap: jamaahData.namaLengkap,
          kelompok_pengajian: jamaahData.kelompokPengajian,
          jenis_kelamin: jamaahData.jenisKelamin,
          tempat_lahir: jamaahData.tempatLahir,
          tanggal_lahir: jamaahData.tanggalLahir || null,
          status_pernikahan: jamaahData.statusPernikahan,
          status_hubungan_keluarga: jamaahData.statusHubunganKeluarga,
          kepala_keluarga_id: jamaahData.kepalaKeluargaId || null,
          nomor_hp: jamaahData.nomorHp || null,
          tingkat_pendidikan: jamaahData.tingkatPendidikan,
          pekerjaan_utama: jamaahData.pekerjaanUtama,
          dapuan: jamaahData.dapuan,
          status_ekonomi: jamaahData.statusEkonomi,
          kelancaran_sambung: jamaahData.kelancaranSambung
        };
        
        return supabaseClient.from("jamaah").select("id").eq("id", finalId).then(({ data }) => {
          const isEdit = data && data.length > 0;
          return supabaseClient.from("jamaah").upsert(pgData).then(({ error }) => {
            if (error) throw error;
            const description = isEdit 
              ? "Memperbarui Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + ")"
              : "Menambahkan Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + ") di Kelompok " + jamaahData.kelompokPengajian;
            
            supabaseLogAction(operatorUsername, isEdit ? "UPDATE" : "CREATE", description);
            return jamaahData;
          });
        });
      });
    }

    function supabaseDeleteJamaah(id, operatorUsername) {
      return supabaseClient.from("jamaah").select("nama_lengkap").eq("id", id).then(({ data }) => {
        const nama = data && data.length > 0 ? data[0].nama_lengkap : id;
        return supabaseClient.from("jamaah").delete().eq("id", id).then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "DELETE", "Menghapus Jamaah " + nama + " (" + id + ").");
          return true;
        });
      });
    }

    function supabaseSaveMasterItem(tableName, oldName, newName, operatorUsername, peserta) {
      const pgTable = tableName === "Kelompok" ? "master_kelompok" :
                      tableName === "Tingkat Pendidikan" ? "master_pendidikan" :
                      tableName === "Pekerjaan" ? "master_pekerjaan" :
                      tableName === "Dapuan" ? "master_dapuan" :
                      tableName === "Status Hubungan Keluarga" ? "master_hubungan" :
                      tableName === "Materi Pengajian" ? "master_materi_pengajian" :
                      tableName === "Jenis Pengajian" ? "master_jenis_pengajian" : "";
      
      if (!pgTable) return Promise.reject(new Error("Tabel master tidak valid"));
      
      if (oldName) {
        const payload = { nama: newName };
        if (tableName === "Jenis Pengajian") {
          payload.peserta_pengajian = peserta;
        }
        return supabaseClient.from(pgTable).update(payload).eq("nama", oldName).then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "UPDATE_MASTER", "Mengubah opsi di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
          return true;
        });
      } else {
        const payload = { nama: newName };
        if (tableName === "Jenis Pengajian") {
          payload.peserta_pengajian = peserta;
        }
        return supabaseClient.from(pgTable).insert(payload).then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
          return true;
        });
      }
    }

    function supabaseDeleteMasterItem(tableName, name, operatorUsername) {
      const pgTable = tableName === "Kelompok" ? "master_kelompok" :
                      tableName === "Tingkat Pendidikan" ? "master_pendidikan" :
                      tableName === "Pekerjaan" ? "master_pekerjaan" :
                      tableName === "Dapuan" ? "master_dapuan" :
                      tableName === "Status Hubungan Keluarga" ? "master_hubungan" :
                      tableName === "Materi Pengajian" ? "master_materi_pengajian" :
                      tableName === "Jenis Pengajian" ? "master_jenis_pengajian" : "";
      
      if (!pgTable) return Promise.reject(new Error("Tabel master tidak valid"));
      
      return supabaseClient.from(pgTable).delete().eq("nama", name).then(({ error }) => {
        if (error) throw error;
        supabaseLogAction(operatorUsername, "DELETE_MASTER", "Menghapus opsi dari tabel " + tableName + ": '" + name + "'");
        return true;
      });
    }

    function supabaseSaveUser(userData, operatorUsername) {
      const pgUser = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        kelompok: userData.kelompok
      };
      if (userData.passwordHash) {
        pgUser.password_hash = userData.passwordHash;
      }
      
      return supabaseClient.from("app_users").select("username").eq("username", userData.username).then(({ data }) => {
        const isEdit = data && data.length > 0;
        let req;
        if (isEdit) {
            req = supabaseClient.from("app_users").update(pgUser).eq("username", pgUser.username);
        } else {
            req = supabaseClient.from("app_users").insert([pgUser]);
        }
        return req.then(({ error }) => {
          if (error) throw error;
          const action = isEdit ? "UPDATE_USER" : "CREATE_USER";
          const desc = isEdit 
            ? "Memperbarui akun pengguna: " + userData.username + " (" + userData.role + ")"
            : "Membuat akun pengguna baru: " + userData.username + " (" + userData.role + ")";
          supabaseLogAction(operatorUsername, action, desc);
          return true;
        });
      });
    }

    function supabaseChangePassword(targetUsername, newPasswordHash, operatorUsername) {
      return supabaseClient.from("app_users")
        .update({ password_hash: newPasswordHash })
        .eq("username", targetUsername)
        .then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "CHANGE_PASSWORD", "Mengubah password untuk pengguna: " + targetUsername);
          return true;
        });
    }

    function supabaseSaveJadwalPengajian(jadwalData, operatorUsername) {
      const isEdit = !!jadwalData.id;
      const dataPayload = {
        tingkat_pengajian: jadwalData.tingkat_pengajian,
        jenis_pengajian: jadwalData.jenis_pengajian,
        tanggal: jadwalData.tanggal,
        waktu_mulai: jadwalData.waktu_mulai ? (jadwalData.waktu_mulai.includes(":") && jadwalData.waktu_mulai.split(":").length === 2 ? jadwalData.waktu_mulai + ":00" : jadwalData.waktu_mulai) : '20:00:00',
        waktu_selesai: jadwalData.waktu_selesai ? (jadwalData.waktu_selesai.includes(":") && jadwalData.waktu_selesai.split(":").length === 2 ? jadwalData.waktu_selesai + ":00" : jadwalData.waktu_selesai) : '21:30:00',
        materi_pengajar: typeof jadwalData.materi_pengajar === "object" ? JSON.stringify(jadwalData.materi_pengajar) : (jadwalData.materi_pengajar || "[]"),
        kelompok_pengajian: jadwalData.kelompok_pengajian
      };
      
      let query;
      if (isEdit) {
        query = supabaseClient.from("pengajian_jadwal").update(dataPayload).eq("id", jadwalData.id).select();
      } else {
        query = supabaseClient.from("pengajian_jadwal").insert(dataPayload).select();
      }
      
      return query.then(({ data, error }) => {
        if (error) throw error;
        const savedData = data && data.length > 0 ? data[0] : jadwalData;
        if (savedData && typeof savedData.materi_pengajar === 'string') {
          savedData.materi_pengajar = JSON.parse(savedData.materi_pengajar);
        }
        supabaseLogAction(operatorUsername, isEdit ? "UPDATE" : "CREATE", (isEdit ? "Memperbarui" : "Membuat") + " jadwal pengajian: " + jadwalData.jenis_pengajian + " pada " + jadwalData.tanggal);
        return savedData;
      });
    }

    function supabaseDeleteJadwalPengajian(id, operatorUsername) {
      return supabaseClient.from("pengajian_jadwal")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "DELETE", "Menghapus jadwal pengajian id: " + id);
          return true;
        });
    }

    function supabaseSavePresensiKehadiran(idPengajian, presensiList, operatorUsername) {
      const promises = presensiList.map(p => {
        const payload = {
          id_pengajian: parseInt(idPengajian),
          id_jamaah: p.id_jamaah,
          status: p.status,
          keterangan: p.keterangan || ""
        };
        return supabaseClient.from("pengajian_presensi")
          .upsert(payload, { onConflict: "id_pengajian,id_jamaah" });
      });
      
          return Promise.all(promises).then(results => {
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) {
          throw new Error("Gagal menyimpan beberapa data presensi: " + errors.map(e => e.message).join(", "));
        }
        supabaseLogAction(operatorUsername, "SAVE_PRESENSI", "Menyimpan data presensi untuk sesi pengajian ID " + idPengajian);
        return true;
      });
    }

    function supabaseSaveMasterPengajar(pengajarData, operatorUsername) {
      const dbData = {
        id_jamaah: pengajarData.id_jamaah
      };
      if (pengajarData.id_pengajar) {
        dbData.id = parseInt(pengajarData.id_pengajar);
      }
      return supabaseClient.from("master_pengajar")
        .upsert(dbData)
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          const saved = data[0];
          const jamaahObj = getJamaahList().find(j => j.id === saved.id_jamaah);
          const nama = jamaahObj ? jamaahObj.namaLengkap : saved.id_jamaah;
          supabaseLogAction(operatorUsername, pengajarData.id_pengajar ? "UPDATE_PENGAJAR" : "CREATE_PENGAJAR", 
            `Menyimpan master pengajar ID ${saved.id} untuk jamaah ${nama}`);
          return {
            id_pengajar: saved.id,
            id_jamaah: saved.id_jamaah
          };
        });
    }

    function supabaseDeleteMasterPengajar(id_pengajar, operatorUsername) {
      return supabaseClient.from("master_pengajar")
        .delete()
        .eq("id", parseInt(id_pengajar))
        .then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "DELETE_PENGAJAR", `Menghapus master pengajar ID ${id_pengajar}`);
          return true;
        });
    }

    // Intercept Window Google Script Run Calls
    function setupDatabaseMockOrSupabase() {
      if (useSupabase) {
        const supabaseRun = {
          _successHandler: null,
          _failureHandler: null,
          withSuccessHandler: function(h) { this._successHandler = h; return this; },
          withFailureHandler: function(h) { this._failureHandler = h; return this; },
          _call: function(promiseFunc) {
            setTimeout(() => {
              try {
                promiseFunc().then(res => {
                  if (this._successHandler) this._successHandler(res);
                }).catch(err => {
                  if (this._failureHandler) this._failureHandler(err);
                  else console.error(err);
                });
              } catch (err) {
                if (this._failureHandler) this._failureHandler(err);
                else console.error(err);
              }
            }, 50);
          },
          logActionGAS: function(user, action, description) {
            this._call(() => supabaseLogAction(user, action, description));
            return this;
          },
          getAllDataGAS: function(operatorUsername) {
            this._call(() => supabaseGetAllData(operatorUsername));
            return this;
          },
          authenticateUserGAS: function(username, passwordHash) {
            this._call(() => supabaseAuthenticateUser(username, passwordHash));
            return this;
          },
          saveJamaahGAS: function(jamaahData, operatorUsername) {
            this._call(() => supabaseSaveJamaah(jamaahData, operatorUsername));
            return this;
          },
          deleteJamaahGAS: function(id, operatorUsername) {
            this._call(() => supabaseDeleteJamaah(id, operatorUsername));
            return this;
          },
          saveMasterItemGAS: function(tableName, oldName, newName, operatorUsername, peserta) {
            this._call(() => supabaseSaveMasterItem(tableName, oldName, newName, operatorUsername, peserta));
            return this;
          },
          deleteMasterItemGAS: function(tableName, name, operatorUsername) {
            this._call(() => supabaseDeleteMasterItem(tableName, name, operatorUsername));
            return this;
          },
          saveUserGAS: function(userData, operatorUsername) {
            this._call(() => supabaseSaveUser(userData, operatorUsername));
            return this;
          },
          changePasswordGAS: function(targetUsername, newPasswordHash, operatorUsername) {
            this._call(() => supabaseChangePassword(targetUsername, newPasswordHash, operatorUsername));
            return this;
          },
          saveJadwalPengajianGAS: function(jadwalData, operatorUsername) {
            this._call(() => supabaseSaveJadwalPengajian(jadwalData, operatorUsername));
            return this;
          },
          deleteJadwalPengajianGAS: function(id, operatorUsername) {
            this._call(() => supabaseDeleteJadwalPengajian(id, operatorUsername));
            return this;
          },
          savePresensiKehadiranGAS: function(idPengajian, presensiList, operatorUsername) {
            this._call(() => supabaseSavePresensiKehadiran(idPengajian, presensiList, operatorUsername));
            return this;
          },
          saveMasterPengajarGAS: function(pengajarData, operatorUsername) {
            this._call(() => supabaseSaveMasterPengajar(pengajarData, operatorUsername));
            return this;
          },
          deleteMasterPengajarGAS: function(id_pengajar, operatorUsername) {
            this._call(() => supabaseDeleteMasterPengajar(id_pengajar, operatorUsername));
            return this;
          }
        };
        
        window.google = {
          script: {
            run: supabaseRun
          }
        };
      } else {
        if (nativeGoogle) {
          window.google = nativeGoogle;
        } else {
          // Fallback to local storage mock
          if (!localStorage.getItem("aji_users")) {
            localStorage.setItem("aji_users", JSON.stringify([
              { username: "admin", email: "admin@jatiwarnainfo.or.id", role: "Admin", passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", kelompok: "Semua" },
              { username: "op_pm", email: "op_pm@jatiwarnainfo.or.id", role: "Operator Kelompok", passwordHash: "e130282bf248d2f5a54db5ef90f6b4715f019e0cfcd6c04f981e4b85c8e3ccdc", kelompok: "Pondok Melati" },
              { username: "op_chandra", email: "op_chandra@jatiwarnainfo.or.id", role: "Operator Kelompok", passwordHash: "e130282bf248d2f5a54db5ef90f6b4715f019e0cfcd6c04f981e4b85c8e3ccdc", kelompok: "Chandra" }
            ]));
          }
          if (!localStorage.getItem("aji_jamaah")) {
            localStorage.setItem("aji_jamaah", JSON.stringify([
              { id: "J-001", namaLengkap: "H. Budi Santoso", kelompokPengajian: "Pondok Melati", tempatLahir: "Jakarta", tanggalLahir: "1975-04-12", jenisKelamin: "Laki-laki", nomorHp: "081234567890", tingkatPendidikan: "S1", statusPernikahan: "Menikah", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "Swasta", dapuan: "Pengurus Kelompok", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-002", namaLengkap: "Hj. Siti Aminah", kelompokPengajian: "Pondok Melati", tempatLahir: "Surabaya", tanggalLahir: "1978-08-22", jenisKelamin: "Perempuan", nomorHp: "081234567891", tingkatPendidikan: "SLTA/SMK", statusPernikahan: "Menikah", statusHubunganKeluarga: "Istri", kepalaKeluargaId: "J-001", pekerjaanUtama: "IRT", dapuan: "Rokyah biasa", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-003", namaLengkap: "Rahmat Hidayat", kelompokPengajian: "Pondok Melati", tempatLahir: "Bekasi", tanggalLahir: "2002-11-05", jenisKelamin: "Laki-laki", nomorHp: "081234567892", tingkatPendidikan: "S1", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-001", pekerjaanUtama: "Pelajar/Mahasiswa", dapuan: "Pengurus Kelompok", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-004", namaLengkap: "Aisyah Putri", kelompokPengajian: "Pondok Melati", tempatLahir: "Bekasi", tanggalLahir: "2010-06-15", jenisKelamin: "Perempuan", nomorHp: "081234567893", tingkatPendidikan: "SMP", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-001", pekerjaanUtama: "Pelajar/Mahasiswa", dapuan: "Rokyah biasa", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-005", namaLengkap: "H. Ahmad Subarjo", kelompokPengajian: "Pondok Melati Selatan", tempatLahir: "Yogyakarta", tanggalLahir: "1964-02-10", jenisKelamin: "Laki-laki", nomorHp: "085712345678", tingkatPendidikan: "Diploma", statusPernikahan: "Menikah", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "Wiraswasta", dapuan: "Pengurus Desa", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-006", namaLengkap: "Hj. Ratna Sari", kelompokPengajian: "Pondok Melati Selatan", tempatLahir: "Bandung", tanggalLahir: "1968-12-14", jenisKelamin: "Perempuan", nomorHp: "085712345679", tingkatPendidikan: "S1", statusPernikahan: "Menikah", statusHubunganKeluarga: "Istri", kepalaKeluargaId: "J-005", pekerjaanUtama: "Guru", dapuan: "MS", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-007", namaLengkap: "Dwi Wahyudi", kelompokPengajian: "Pondok Melati Selatan", tempatLahir: "Bekasi", tanggalLahir: "1998-05-18", jenisKelamin: "Laki-laki", nomorHp: "085712345680", tingkatPendidikan: "S1", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-005", pekerjaanUtama: "Swasta", dapuan: "Rokyah biasa", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-008", namaLengkap: "Tri Utami", kelompokPengajian: "Pondok Melati Selatan", tempatLahir: "Bekasi", tanggalLahir: "2013-09-01", jenisKelamin: "Perempuan", nomorHp: "", tingkatPendidikan: "SD", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-005", pekerjaanUtama: "Pelajar/Mahasiswa", dapuan: "Rokyah biasa", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-009", namaLengkap: "Suparman", kelompokPengajian: "Jatiranggon", tempatLahir: "Solo", tanggalLahir: "1980-01-30", jenisKelamin: "Laki-laki", nomorHp: "089987654321", tingkatPendidikan: "SLTA/SMK", statusPernikahan: "Menikah", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "Lainnya", dapuan: "Rokyah biasa", statusEkonomi: "Dhuafa", kelancaranSambung: "Kurang Lancar" },
              { id: "J-010", namaLengkap: "Sumarni", kelompokPengajian: "Jatiranggon", tempatLahir: "Semarang", tanggalLahir: "1983-05-15", jenisKelamin: "Perempuan", nomorHp: "", tingkatPendidikan: "SD", statusPernikahan: "Menikah", statusHubunganKeluarga: "Istri", kepalaKeluargaId: "J-009", pekerjaanUtama: "IRT", dapuan: "Rokyah biasa", statusEkonomi: "Dhuafa", kelancaranSambung: "Kurang Lancar" },
              { id: "J-011", namaLengkap: "Bagus Prasetyo", kelompokPengajian: "Jatiranggon", tempatLahir: "Bekasi", tanggalLahir: "2007-03-24", jenisKelamin: "Laki-laki", nomorHp: "089987654322", tingkatPendidikan: "SLTA/SMK", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-009", pekerjaanUtama: "Pelajar/Mahasiswa", dapuan: "Rokyah biasa", statusEkonomi: "Dhuafa", kelancaranSambung: "Lancar" },
              { id: "J-012", namaLengkap: "Cahyo Utomo", kelompokPengajian: "Jatiranggon", tempatLahir: "Bekasi", tanggalLahir: "2021-08-10", jenisKelamin: "Laki-laki", nomorHp: "", tingkatPendidikan: "PAUD", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-009", pekerjaanUtama: "Pelajar/Mahasiswa", dapuan: "Rokyah biasa", statusEkonomi: "Dhuafa", kelancaranSambung: "Lancar" },
              { id: "J-013", namaLengkap: "Ir. H. Hartono, M.Si", kelompokPengajian: "Chandra", tempatLahir: "Magelang", tanggalLahir: "1966-10-18", jenisKelamin: "Laki-laki", nomorHp: "08111222333", tingkatPendidikan: "S2", statusPernikahan: "Menikah", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "ASN", dapuan: "Pengurus Daerah", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-014", namaLengkap: "Dra. Herlina", "kelompokPengajian": "Chandra", tempatLahir: "Bogor", tanggalLahir: "1970-02-25", jenisKelamin: "Perempuan", nomorHp: "08111222334", tingkatPendidikan: "S1", statusPernikahan: "Menikah", statusHubunganKeluarga: "Istri", kepalaKeluargaId: "J-013", pekerjaanUtama: "Guru", dapuan: "MT", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-015", namaLengkap: "H. Joko Susilo", "kelompokPengajian": "Pondok Melati", tempatLahir: "Solo", tanggalLahir: "1945-05-12", jenisKelamin: "Laki-laki", nomorHp: "", tingkatPendidikan: "SD", statusPernikahan: "Duda", statusHubunganKeluarga: "Ayah", kepalaKeluargaId: "J-001", pekerjaanUtama: "Lainnya", dapuan: "Rokyah biasa", statusEkonomi: "Menengah", kelancaranSambung: "Lancar" },
              { id: "J-016", namaLengkap: "Joko Prasetyo", "kelompokPengajian": "Pondok Melati", tempatLahir: "Madiun", tanggalLahir: "1988-11-20", jenisKelamin: "Laki-laki", nomorHp: "081299887766", tingkatPendidikan: "S1", statusPernikahan: "Menikah", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "Wiraswasta", dapuan: "Pengurus Kelompok", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-017", namaLengkap: "Larasati", "kelompokPengajian": "Pondok Melati", tempatLahir: "Kediri", tanggalLahir: "1992-03-15", jenisKelamin: "Perempuan", nomorHp: "081299887767", tingkatPendidikan: "S1", statusPernikahan: "Menikah", statusHubunganKeluarga: "Istri", kepalaKeluargaId: "J-016", pekerjaanUtama: "IRT", dapuan: "Rokyah biasa", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-018", namaLengkap: "Fathan Prasetyo", "kelompokPengajian": "Pondok Melati", tempatLahir: "Bekasi", tanggalLahir: "2019-07-22", jenisKelamin: "Laki-laki", nomorHp: "", tingkatPendidikan: "PAUD", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Anak", kepalaKeluargaId: "J-016", pekerjaanUtama: "Pelajar/Mahasiswa", dapuan: "Rokyah biasa", statusEkonomi: "Aghnia", kelancaranSambung: "Lancar" },
              { id: "J-019", namaLengkap: "Pratama Putera", "kelompokPengajian": "Jatiranggon", tempatLahir: "Surakarta", tanggalLahir: "2000-09-30", jenisKelamin: "Laki-laki", nomorHp: "087711223344", tingkatPendidikan: "Diploma", statusPernikahan: "Belum Menikah", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "Swasta", dapuan: "Rokyah biasa", statusEkonomi: "Menengah", kelancaranSambung: "Perlu Perhatian" },
              { id: "J-020", namaLengkap: "Mbah Sumiati", "kelompokPengajian": "Chandra", tempatLahir: "Purworejo", tanggalLahir: "1952-08-08", jenisKelamin: "Perempuan", nomorHp: "", tingkatPendidikan: "SD", statusPernikahan: "Janda", statusHubunganKeluarga: "Kepala Keluarga", kepalaKeluargaId: "", pekerjaanUtama: "Lainnya", dapuan: "Rokyah biasa", statusEkonomi: "Dhuafa", kelancaranSambung: "Lancar" }
            ]));
          }
          if (!localStorage.getItem("aji_master_kelompok")) {
            localStorage.setItem("aji_master_kelompok", JSON.stringify(["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"]));
          }
          if (!localStorage.getItem("aji_master_pendidikan")) {
            localStorage.setItem("aji_master_pendidikan", JSON.stringify(["PAUD", "SD", "SMP", "SLTA/SMK", "Diploma", "S1", "S2", "S3"]));
          }
          if (!localStorage.getItem("aji_master_dapuan")) {
            localStorage.setItem("aji_master_dapuan", JSON.stringify(["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS", "Rokyah biasa", "Lainnya"]));
          }
          if (!localStorage.getItem("aji_master_pekerjaan")) {
            localStorage.setItem("aji_master_pekerjaan", JSON.stringify(["Wiraswasta", "Swasta", "ASN", "TNI", "POLRI", "Guru", "IRT", "Pelajar/Mahasiswa", "Lainnya"]));
          }
          if (!localStorage.getItem("aji_master_hubungan")) {
            localStorage.setItem("aji_master_hubungan", JSON.stringify(["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"]));
          }
          if (!localStorage.getItem("aji_master_materi")) {
            localStorage.setItem("aji_master_materi", JSON.stringify(["Al-Quran", "Hadis Khotbah", "Hadis Bukhori", "ASAD", "Musyawaroh 5 Unsur", "Teks", "Dalil-dalil"]));
          }
          if (!localStorage.getItem("aji_master_jenis_pengajian")) {
            localStorage.setItem("aji_master_jenis_pengajian", JSON.stringify([
              { nama: "Sambung", peserta_pengajian: "Dewasa, Manula, GUM" },
              { nama: "Ibu-ibu", peserta_pengajian: "Dewasa, Manula" },
              { nama: "5 Unsur", peserta_pengajian: "Dewasa, Manula, GUM" },
              { nama: "Muda-mudi", peserta_pengajian: "GUM, GUS" },
              { nama: "Caberawit", peserta_pengajian: "PAUD, Caberawit" },
              { nama: "Lain-lain", peserta_pengajian: "" },
              { nama: "GUS", peserta_pengajian: "GUS" },
              { nama: "GUM", peserta_pengajian: "GUM" },
              { nama: "Gabungan GUS dan GUM", peserta_pengajian: "GUS, GUM" }
            ]));
          }
          if (!localStorage.getItem("aji_master_pengajar")) {
            localStorage.setItem("aji_master_pengajar", JSON.stringify([
              { id_pengajar: 1, id_jamaah: "J-001" },
              { id_pengajar: 2, id_jamaah: "J-003" },
              { id_pengajar: 3, id_jamaah: "J-005" },
              { id_pengajar: 4, id_jamaah: "J-013" }
            ]));
          }
          if (!localStorage.getItem("aji_pengajian_jadwal")) {
            localStorage.setItem("aji_pengajian_jadwal", JSON.stringify([]));
          }
          if (!localStorage.getItem("aji_pengajian_presensi")) {
            localStorage.setItem("aji_pengajian_presensi", JSON.stringify([]));
          }
          if (!localStorage.getItem("aji_audit_logs")) {
            localStorage.setItem("aji_audit_logs", JSON.stringify([]));
          }

          const mockRun = {
            _successHandler: null,
            _failureHandler: null,
            withSuccessHandler: function(h) { this._successHandler = h; return this; },
            withFailureHandler: function(h) { this._failureHandler = h; return this; },
            _call: function(action) {
              setTimeout(() => {
                try {
                  const res = action();
                  if (this._successHandler) this._successHandler(res);
                } catch(err) {
                  if (this._failureHandler) this._failureHandler(err);
                  else console.error(err);
                }
              }, 50);
            },
            logActionGAS: function(user, action, description) {
              const logs = JSON.parse(localStorage.getItem("aji_audit_logs") || "[]");
              logs.unshift({
                timestamp: new Date().toISOString(),
                user: user || "System",
                action: action,
                description: description
              });
              localStorage.setItem("aji_audit_logs", JSON.stringify(logs));
              return this;
            },
            getAllDataGAS: function(operatorUsername) {
              this._call(() => {
                const jamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                const usersList = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const rawK = JSON.parse(localStorage.getItem("aji_master_kelompok") || "[]");
                const rawP = JSON.parse(localStorage.getItem("aji_master_pendidikan") || "[]");
                const rawD = JSON.parse(localStorage.getItem("aji_master_dapuan") || "[]");
                const rawW = JSON.parse(localStorage.getItem("aji_master_pekerjaan") || "[]");
                const rawH = JSON.parse(localStorage.getItem("aji_master_hubungan") || "[]");
                const rawM = JSON.parse(localStorage.getItem("aji_master_materi") || "[]");
                const rawJP = JSON.parse(localStorage.getItem("aji_master_jenis_pengajian") || "[]");
                const rawJ = JSON.parse(localStorage.getItem("aji_pengajian_jadwal") || "[]");
                const rawPr = JSON.parse(localStorage.getItem("aji_pengajian_presensi") || "[]");
                const rawPeng = JSON.parse(localStorage.getItem("aji_master_pengajar") || "[]");
                const auditLogs = JSON.parse(localStorage.getItem("aji_audit_logs") || "[]");
                
                const masterKelompok = rawK.map(n => ({ nama: n }));
                const masterPendidikan = rawP.map(n => ({ nama: n }));
                const masterDapuan = rawD.map(n => ({ nama: n }));
                const masterPekerjaan = rawW.map(n => ({ nama: n }));
                const masterHubungan = rawH.map(n => ({ nama: n }));
                const masterMateri = rawM.map(n => ({ nama: n }));
                const masterJenisPengajian = rawJP.map(item => {
                  if (typeof item === 'string') {
                    let p = '';
                    const j = item.trim().toLowerCase();
                    if (j === "sambung" || j === "5 unsur") p = "Dewasa, Manula, GUM";
                    else if (j === "gus") p = "GUS";
                    else if (j === "gum") p = "GUM";
                    else if (j === "gabungan gus dan gum") p = "GUS, GUM";
                    else if (j === "caberawit") p = "PAUD, Caberawit";
                    else if (j === "ibu-ibu" || j === "ibu - ibu") p = "Dewasa, Manula";
                    else if (j === "kewanitaan") p = "Dewasa, Manula, GUM";
                    else if (j === "teks" || j === "turba desa" || j === "turba daerah") p = "Dewasa, Manula, GUM, GUS";
                    return { nama: item, peserta_pengajian: p };
                  }
                  return { nama: item.nama, peserta_pengajian: item.peserta_pengajian || "" };
                });
                
                const kepalaKeluargaList = _getKepalaKeluargaList(jamaahList);
                const kartuKeluargaMappings = _getKartuKeluargaMappings(jamaahList);
                
                let filteredJamaah = jamaahList;
                let filteredKK = kepalaKeluargaList;
                let filteredMappings = kartuKeluargaMappings;
                let filteredJadwal = rawJ;
                let filteredPresensi = rawPr;
                let filteredLogs = auditLogs;
                
                if (operatorUsername) {
                  const userObj = usersList.find(u => u.username.toLowerCase() === operatorUsername.toLowerCase());
                  if (userObj && userObj.role.trim().toLowerCase() === "operator kelompok") {
                    const targetKelompok = userObj.kelompok;
                    filteredJamaah = jamaahList.filter(j => j.kelompokPengajian === targetKelompok);
                    filteredKK = kepalaKeluargaList.filter(kk => kk.kelompokPengajian === targetKelompok);
                    const subKKIds = new Set(filteredKK.map(kk => kk.id));
                    filteredMappings = kartuKeluargaMappings.filter(m => subKKIds.has(m.kepalaKeluargaId));
                    
                    filteredJadwal = rawJ.filter(j => j.kelompok_pengajian === targetKelompok);
                    const jIds = new Set(filteredJadwal.map(j => j.id));
                    filteredPresensi = rawPr.filter(p => jIds.has(p.id_pengajian));
                    
                    filteredLogs = auditLogs.filter(log => {
                      return log.user.toLowerCase() === operatorUsername.toLowerCase() ||
                             log.description.indexOf("di Kelompok " + targetKelompok) !== -1 ||
                             log.description.indexOf("kelompokPengajian: '" + targetKelompok + "'") !== -1;
                    });
                  }
                }
                
                return {
                  jamaahList: filteredJamaah,
                  kepalaKeluargaList: filteredKK,
                  kartuKeluargaMappings: filteredMappings,
                  auditLogs: filteredLogs,
                  usersList: usersList,
                  masterKelompok,
                  masterPendidikan,
                  masterDapuan,
                  masterPekerjaan,
                  masterHubungan,
                  masterMateri,
                  masterJenisPengajian,
                  masterPengajar: rawPeng,
                  jadwalPengajian: filteredJadwal,
                  presensiKehadiran: filteredPresensi
                };
              });
              return this;
            },
            authenticateUserGAS: function(username, passwordHash) {
              this._call(() => {
                const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === passwordHash);
                if (user) {
                  this.logActionGAS(user.username, "LOGIN", "Pengguna " + user.username + " dengan role " + user.role + " (" + user.kelompok + ") login ke Web App (Local Mock).");
                  return {
                    success: true,
                    user: {
                      username: user.username,
                      email: user.email,
                      role: user.role,
                      kelompok: user.kelompok
                    }
                  };
                }
                return { success: false };
              });
              return this;
            },
            saveJamaahGAS: function(jamaahData, operatorUsername) {
              this._call(() => {
                const jamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                let isEdit = false;
                let oldData = {};
                
                if (!jamaahData.id) {
                  let maxIdNum = 0;
                  jamaahList.forEach(j => {
                    if (j.id && j.id.indexOf("J-") === 0) {
                      const num = parseInt(j.id.replace("J-", ""));
                      if (num > maxIdNum) maxIdNum = num;
                    }
                  });
                  jamaahData.id = "J-" + String(maxIdNum + 1).padStart(3, '0');
                } else {
                  const idx = jamaahList.findIndex(j => j.id === jamaahData.id);
                  if (idx !== -1) {
                    isEdit = true;
                    oldData = Object.assign({}, jamaahList[idx]);
                    jamaahList.splice(idx, 1);
                  }
                }
                
                if (jamaahData.statusHubunganKeluarga === "Kepala Keluarga") {
                  jamaahData.kepalaKeluargaId = "";
                }
                
                jamaahList.push(jamaahData);
                localStorage.setItem("aji_jamaah", JSON.stringify(jamaahList));
                
                if (isEdit) {
                  let diffStr = [];
                  for (const key in jamaahData) {
                    if (oldData[key] !== jamaahData[key] && key !== "umur" && key !== "kelompokPeramutan") {
                      diffStr.push(`${key}: '${oldData[key]}' -> '${jamaahData[key]}'`);
                    }
                  }
                  this.logActionGAS(operatorUsername, "UPDATE", "Memperbarui Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + "). Perubahan: " + diffStr.join(", "));
                } else {
                  this.logActionGAS(operatorUsername, "CREATE", "Menambahkan Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + ") di Kelompok " + jamaahData.kelompokPengajian);
                }
                
                return jamaahData;
              });
              return this;
            },
            deleteJamaahGAS: function(id, operatorUsername) {
              this._call(() => {
                const jamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                const idx = jamaahList.findIndex(j => j.id === id);
                if (idx !== -1) {
                  const nama = jamaahList[idx].namaLengkap;
                  const hub = jamaahList[idx].statusHubunganKeluarga;
                  jamaahList.splice(idx, 1);
                  
                  if (hub === "Kepala Keluarga") {
                    jamaahList.forEach(j => {
                      if (j.kepalaKeluargaId === id) {
                        j.kepalaKeluargaId = "";
                      }
                    });
                  }
                  
                  localStorage.setItem("aji_jamaah", JSON.stringify(jamaahList));
                  this.logActionGAS(operatorUsername, "DELETE", "Menghapus Jamaah " + nama + " (" + id + ").");
                  return true;
                }
                return false;
              });
              return this;
            },
                        saveMasterItemGAS: function(tableName, oldName, newName, operatorUsername, peserta) {
              this._call(() => {
                const keyMap = {
                  "Kelompok": "aji_master_kelompok",
                  "Tingkat Pendidikan": "aji_master_pendidikan",
                  "Dapuan": "aji_master_dapuan",
                  "Pekerjaan": "aji_master_pekerjaan",
                  "Status Hubungan Keluarga": "aji_master_hubungan",
                  "Materi Pengajian": "aji_master_materi",
                  "Jenis Pengajian": "aji_master_jenis_pengajian"
                };
                const colMap = {
                  "Kelompok": "kelompokPengajian",
                  "Tingkat Pendidikan": "tingkatPendidikan",
                  "Dapuan": "dapuan",
                  "Pekerjaan": "pekerjaanUtama",
                  "Status Hubungan Keluarga": "statusHubunganKeluarga"
                };
                
                const lsKey = keyMap[tableName];
                if (!lsKey) throw new Error("Table master not supported: " + tableName);
                
                const list = JSON.parse(localStorage.getItem(lsKey) || "[]");
                
                if (tableName === "Jenis Pengajian") {
                  if (oldName) {
                    const idx = list.findIndex(x => (typeof x === 'object' ? x.nama : x) === oldName);
                    if (idx !== -1) {
                      list[idx] = { nama: newName, peserta_pengajian: peserta || "" };
                      localStorage.setItem(lsKey, JSON.stringify(list));
                      this.logActionGAS(operatorUsername, "UPDATE_MASTER", "Mengubah opsi di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
                    }
                  } else {
                    list.push({ nama: newName, peserta_pengajian: peserta || "" });
                    localStorage.setItem(lsKey, JSON.stringify(list));
                    this.logActionGAS(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
                  }
                } else {
                  if (oldName) {
                    const idx = list.indexOf(oldName);
                    if (idx !== -1) {
                      list[idx] = newName;
                      localStorage.setItem(lsKey, JSON.stringify(list));
                      this.logActionGAS(operatorUsername, "UPDATE_MASTER", "Mengubah opsi di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
                      
                      const jamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                      const colName = colMap[tableName];
                      let changedCount = 0;
                      if (colName) {
                        jamaahList.forEach(j => {
                          if (j[colName] === oldName) {
                            j[colName] = newName;
                            changedCount++;
                          }
                        });
                        if (changedCount > 0) {
                          localStorage.setItem("aji_jamaah", JSON.stringify(jamaahList));
                        }
                      }
                    }
                  } else {
                    list.push(newName);
                    localStorage.setItem(lsKey, JSON.stringify(list));
                    this.logActionGAS(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
                  }
                }
                return true;
              });
              return this;
            },
                        deleteMasterItemGAS: function(tableName, name, operatorUsername) {
              this._call(() => {
                const keyMap = {
                  "Kelompok": "aji_master_kelompok",
                  "Tingkat Pendidikan": "aji_master_pendidikan",
                  "Dapuan": "aji_master_dapuan",
                  "Pekerjaan": "aji_master_pekerjaan",
                  "Status Hubungan Keluarga": "aji_master_hubungan",
                  "Materi Pengajian": "aji_master_materi",
                  "Jenis Pengajian": "aji_master_jenis_pengajian"
                };
                const colMap = {
                  "Kelompok": "kelompokPengajian",
                  "Tingkat Pendidikan": "tingkatPendidikan",
                  "Dapuan": "dapuan",
                  "Pekerjaan": "pekerjaanUtama",
                  "Status Hubungan Keluarga": "statusHubunganKeluarga"
                };
                
                const lsKey = keyMap[tableName];
                if (!lsKey) throw new Error("Table master not supported: " + tableName);
                
                const list = JSON.parse(localStorage.getItem(lsKey) || "[]");
                const idx = list.findIndex(x => (typeof x === 'object' ? x.nama : x) === name);
                if (idx !== -1) {
                  list.splice(idx, 1);
                  localStorage.setItem(lsKey, JSON.stringify(list));
                  this.logActionGAS(operatorUsername, "DELETE_MASTER", "Menghapus opsi dari tabel " + tableName + ": '" + name + "'");
                  
                  const jamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                  const colName = colMap[tableName];
                  let changedCount = 0;
                  if (colName) {
                    jamaahList.forEach(j => {
                      if (j[colName] === name) {
                        j[colName] = "";
                        changedCount++;
                      }
                    });
                    if (changedCount > 0) {
                      localStorage.setItem("aji_jamaah", JSON.stringify(jamaahList));
                    }
                  }
                }
                return true;
              });
              return this;
            },
            saveUserGAS: function(userData, operatorUsername) {
              this._call(() => {
                const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const idx = users.findIndex(u => u.username.toLowerCase() === userData.username.toLowerCase());
                
                if (idx !== -1) {
                  if (!userData.passwordHash) {
                    userData.passwordHash = users[idx].passwordHash;
                  }
                  users[idx] = userData;
                  localStorage.setItem("aji_users", JSON.stringify(users));
                  this.logActionGAS(operatorUsername, "UPDATE_USER", "Memperbarui akun pengguna: " + userData.username + " (" + userData.role + ")");
                } else {
                  users.push(userData);
                  localStorage.setItem("aji_users", JSON.stringify(users));
                  this.logActionGAS(operatorUsername, "CREATE_USER", "Membuat akun pengguna baru: " + userData.username + " (" + userData.role + ")");
                }
                return true;
              });
              return this;
            },
            changePasswordGAS: function(targetUsername, newPasswordHash, operatorUsername) {
              this._call(() => {
                const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const idx = users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());
                if (idx !== -1) {
                  users[idx].passwordHash = newPasswordHash;
                  localStorage.setItem("aji_users", JSON.stringify(users));
                  this.logActionGAS(operatorUsername, "CHANGE_PASSWORD", "Mengubah password untuk pengguna: " + targetUsername);
                  return true;
                }
                return false;
              });
              return this;
            },
            saveJadwalPengajianGAS: function(jadwalData, operatorUsername) {
              this._call(() => {
                const list = JSON.parse(localStorage.getItem("aji_pengajian_jadwal") || "[]");
                let isEdit = false;
                if (jadwalData.id) {
                  const idx = list.findIndex(j => j.id == jadwalData.id);
                  if (idx !== -1) {
                    isEdit = true;
                    list[idx] = jadwalData;
                  }
                } else {
                  let maxId = 0;
                  list.forEach(j => {
                    if (j.id > maxId) maxId = j.id;
                  });
                  jadwalData.id = maxId + 1;
                  list.push(jadwalData);
                }
                localStorage.setItem("aji_pengajian_jadwal", JSON.stringify(list));
                this.logActionGAS(operatorUsername, isEdit ? "UPDATE" : "CREATE", (isEdit ? "Memperbarui" : "Membuat") + " jadwal pengajian mock: " + jadwalData.jenis_pengajian);
                return jadwalData;
              });
              return this;
            },
            deleteJadwalPengajianGAS: function(id, operatorUsername) {
              this._call(() => {
                const list = JSON.parse(localStorage.getItem("aji_pengajian_jadwal") || "[]");
                const idx = list.findIndex(j => j.id == id);
                if (idx !== -1) {
                  list.splice(idx, 1);
                  localStorage.setItem("aji_pengajian_jadwal", JSON.stringify(list));
                  
                  // Cascading delete mock presensi
                  const presensi = JSON.parse(localStorage.getItem("aji_pengajian_presensi") || "[]");
                  const filtered = presensi.filter(p => p.id_pengajian != id);
                  localStorage.setItem("aji_pengajian_presensi", JSON.stringify(filtered));
                  
                  this.logActionGAS(operatorUsername, "DELETE", "Menghapus jadwal pengajian mock id: " + id);
                  return true;
                }
                return false;
              });
              return this;
            },
            savePresensiKehadiranGAS: function(idPengajian, presensiList, operatorUsername) {
              this._call(() => {
                const list = JSON.parse(localStorage.getItem("aji_pengajian_presensi") || "[]");
                presensiList.forEach(p => {
                  const idx = list.findIndex(item => item.id_pengajian == idPengajian && item.id_jamaah == p.id_jamaah);
                  const payload = {
                    id_pengajian: parseInt(idPengajian),
                    id_jamaah: p.id_jamaah,
                    status: p.status,
                    keterangan: p.keterangan || ""
                  };
                  if (idx !== -1) {
                    payload.id = list[idx].id;
                    list[idx] = payload;
                  } else {
                    let maxId = 0;
                    list.forEach(item => {
                      if (item.id > maxId) maxId = item.id;
                    });
                    payload.id = maxId + 1;
                    list.push(payload);
                  }
                });
                localStorage.setItem("aji_pengajian_presensi", JSON.stringify(list));
                this.logActionGAS(operatorUsername, "SAVE_PRESENSI", "Menyimpan data presensi mock untuk sesi pengajian ID " + idPengajian);
                return true;
              });
              return this;
            },
            saveMasterPengajarGAS: function(pengajarData, operatorUsername) {
              this._call(() => {
                const list = JSON.parse(localStorage.getItem("aji_master_pengajar") || "[]");
                let isEdit = false;
                if (!pengajarData.id_pengajar) {
                  let maxId = 0;
                  list.forEach(item => {
                    const idVal = parseInt(item.id_pengajar);
                    if (!isNaN(idVal) && idVal > maxId) maxId = idVal;
                  });
                  pengajarData.id_pengajar = maxId + 1;
                } else {
                  const idx = list.findIndex(item => item.id_pengajar == pengajarData.id_pengajar);
                  if (idx !== -1) {
                    isEdit = true;
                    list[idx] = pengajarData;
                  }
                }
                if (!isEdit) {
                  list.push(pengajarData);
                }
                localStorage.setItem("aji_master_pengajar", JSON.stringify(list));
                const jObj = JSON.parse(localStorage.getItem("aji_jamaah") || "[]").find(j => j.id === pengajarData.id_jamaah);
                const name = jObj ? jObj.namaLengkap : pengajarData.id_jamaah;
                this.logActionGAS(operatorUsername, isEdit ? "UPDATE_PENGAJAR" : "CREATE_PENGAJAR", 
                  `Menyimpan master pengajar mock ID ${pengajarData.id_pengajar} untuk jamaah ${name}`);
                return pengajarData;
              });
              return this;
            },
            deleteMasterPengajarGAS: function(id_pengajar, operatorUsername) {
              this._call(() => {
                const list = JSON.parse(localStorage.getItem("aji_master_pengajar") || "[]");
                const idx = list.findIndex(item => item.id_pengajar == id_pengajar);
                if (idx !== -1) {
                  const item = list[idx];
                  list.splice(idx, 1);
                  localStorage.setItem("aji_master_pengajar", JSON.stringify(list));
                  this.logActionGAS(operatorUsername, "DELETE_PENGAJAR", `Menghapus master pengajar mock ID ${id_pengajar}`);
                  return true;
                }
                return false;
              });
              return this;
            }
          };
          
          window.google = {
            script: {
              run: mockRun
            }
          };
        }
      }
    }
    
    // UI trigger helpers for Supabase connection setup
    window.showSetupScreen = function() {
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("setup-screen").style.display = "flex";
      document.getElementById("setup-url").value = localStorage.getItem("aji_supabase_url") || "";
      document.getElementById("setup-key").value = localStorage.getItem("aji_supabase_key") || "";
    };
    
    window.runDemoOffline = function() {
      localStorage.removeItem("aji_supabase_url");
      localStorage.removeItem("aji_supabase_key");
      useSupabase = false;
      setupDatabaseMockOrSupabase();
      document.getElementById("setup-screen").style.display = "none";
      showLoginScreen();
      showToast("Menjalankan dalam mode Demo Offline (Mock Storage).", "info");
    };
    
    window.disconnectSupabase = function() {
      if (confirm("Apakah Anda yakin ingin memutuskan koneksi Supabase? Aplikasi akan beralih ke Demo Offline.")) {
        localStorage.removeItem("aji_supabase_url");
        localStorage.removeItem("aji_supabase_key");
        useSupabase = false;
        setupDatabaseMockOrSupabase();
        document.getElementById("settings-url").value = "";
        document.getElementById("settings-key").value = "";
        showToast("Koneksi Supabase diputuskan.", "info");
        
        const currentUser = getCurrentUser();
        if (!currentUser) {
          showLoginScreen();
        } else {
          refreshActivePage();
        }
      }
    };

    function _getKepalaKeluargaList(jList) {
      return jList.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga");
    }
    
    function _getKartuKeluargaMappings(jList) {
      return jList.filter(j => j.statusHubunganKeluarga !== "Kepala Keluarga" && j.kepalaKeluargaId).map(j => ({
        kepalaKeluargaId: j.kepalaKeluargaId,
        anggotaKeluargaId: j.id
      }));
    }

    // ----------------------------------------------------
    // GAS SERVER CLIENT-SIDE DATA BRIDGE
    // ----------------------------------------------------
    function fetchDatabaseFromServer(callback) {
      const user = getCurrentUser();
      const operatorUsername = user ? user.username : null;
      

      // Load Pengurus
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient.from("pengurus").select("*").then(({ data }) => { 
            if(data) localPengurusList = data; 
            if (document.getElementById("section-pengurus") && document.getElementById("section-pengurus").style.display !== "none") {
              if (typeof renderPengurusTable === 'function') renderPengurusTable();
            }
        });
      }

          google.script.run
        .withSuccessHandler(function(data) {
          localJamaahList = (data.jamaahList || []).map(j => {
            const age = calculateAge(j.tanggalLahir);
            const peramutan = getKelompokPeramutan(age, j.statusPernikahan);
            return { ...j, umur: age, kelompokPeramutan: peramutan };
          });
          localKepalaKeluargaList = data.kepalaKeluargaList || [];
          localKartuKeluargaMappings = data.kartuKeluargaMappings || [];
          localAuditLogs = data.auditLogs || [];
          localUsersList = data.usersList || [];
          
          // Populate dynamic master lists from sheets
          localMasterKelompok = (data.masterKelompok || []).map(m => m.nama);
          localMasterPendidikan = (data.masterPendidikan || []).map(m => m.nama);
          localMasterDapuan = (data.masterDapuan || []).map(m => m.nama);
          localMasterPekerjaan = (data.masterPekerjaan || []).map(m => m.nama);
          localMasterHubungan = (data.masterHubungan || []).map(m => m.nama);
          localMasterMateri = (data.masterMateri || []).map(m => m.nama);
          localMasterJenisPengajian = (data.masterJenisPengajian || []).map(item => {
            if (typeof item === 'string') {
              let p = '';
              const j = item.trim().toLowerCase();
              if (j === "sambung" || j === "5 unsur") p = "Dewasa, Manula, GUM";
              else if (j === "gus") p = "GUS";
              else if (j === "gum") p = "GUM";
              else if (j === "gabungan gus dan gum") p = "GUS, GUM";
              else if (j === "caberawit") p = "PAUD, Caberawit";
              else if (j === "ibu-ibu" || j === "ibu - ibu") p = "Dewasa, Manula";
              else if (j === "kewanitaan") p = "Dewasa, Manula, GUM";
              else if (j === "teks" || j === "turba desa" || j === "turba daerah") p = "Dewasa, Manula, GUM, GUS";
              return { nama: item, peserta_pengajian: p };
            }
            return { nama: item.nama, peserta_pengajian: item.peserta_pengajian || "" };
          });
          localMasterPengajar = data.masterPengajar || [];
          localJadwalPengajian = data.jadwalPengajian || [];
          localPresensiKehadiran = data.presensiKehadiran || [];
          
          if (callback) callback();
        })
        .withFailureHandler(function(err) {
          console.error("Gagal sinkronisasi data dari Google Sheets:", err);
          showToast("Gagal menyinkronkan data database: " + err.message, "error");
        })
        .getAllDataGAS(operatorUsername);
    }

    function getJamaahList() { return localJamaahList; }
    function getPengurusList() { return localPengurusList; }
    function getKepalaKeluargaList() { return localKepalaKeluargaList; }
    function getKartuKeluargaMappings() { return localKartuKeluargaMappings; }
    function getAuditLogs() { return localAuditLogs; }
    function getUsersList() { return localUsersList; }
    function getMasterMateriList() { return localMasterMateri; }
    function getMasterPengajarList() { return localMasterPengajar; }
    function getMasterJenisPengajianList() { return localMasterJenisPengajian; }
    function getJadwalPengajianList() { return localJadwalPengajian; }
    function getPresensiKehadiranList() { return localPresensiKehadiran; }

    function getCurrentUser() {
      const session = sessionStorage.getItem("aji_session_user");
      return session ? JSON.parse(session) : null;
    }

    function logoutUser() {
      const user = getCurrentUser();
      if (user) {
        try {
          if (typeof google !== "undefined" && google.script && google.script.run && typeof google.script.run.logActionGAS === "function") {
            google.script.run.logActionGAS(user.username, "LOGOUT", `Pengguna ${user.username} logout dari aplikasi.`);
          }
        } catch (e) {
          console.warn("Gagal mencatat log logout:", e);
        }
      }
      sessionStorage.removeItem("aji_session_user");
    }

    function saveJamaah(jamaahData, operatorUsername) {
      const saveBtn = document.getElementById("modal-save-btn");
      const oldHtml = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
      
      google.script.run
        .withSuccessHandler(function(savedItem) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = oldHtml;
          closeJamaahModal();
          fetchDatabaseFromServer(function() {
            refreshActivePage();
            showToast(`Data jamaah ${jamaahData.namaLengkap} berhasil disimpan ke Google Sheets!`, "success");
          });
        })
        .withFailureHandler(function(err) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = oldHtml;
          showToast("Gagal menyimpan data ke Google Sheets: " + err.message, "error");
        })
        .saveJamaahGAS(jamaahData, operatorUsername);
    }

    function deleteJamaah(id, operatorUsername) {
      const item = getJamaahList().find(j => j.id === id);
      if (!item) return;
      if (confirm(`Apakah Anda yakin ingin menghapus Jamaah: "${item.namaLengkap}" (${id})?`)) {
        google.script.run
          .withSuccessHandler(function() {
            fetchDatabaseFromServer(function() {
              refreshActivePage();
              showToast(`Data jamaah ${item.namaLengkap} berhasil dihapus dari Google Sheets!`, "success");
            });
          })
          .withFailureHandler(function(err) {
            showToast("Gagal menghapus data: " + err.message, "error");
          })
          .deleteJamaahGAS(id, operatorUsername);
      }
    }

    function saveJadwalPengajian(jadwalData, operatorUsername, callback, errorCallback) {
      google.script.run
        .withSuccessHandler(function(savedItem) {
          fetchDatabaseFromServer(function() {
            if (callback) callback(savedItem);
          });
        })
        .withFailureHandler(function(err) {
          if (errorCallback) errorCallback(err);
        })
        .saveJadwalPengajianGAS(jadwalData, operatorUsername);
    }

    function deleteJadwalPengajian(id, operatorUsername, callback, errorCallback) {
      google.script.run
        .withSuccessHandler(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .withFailureHandler(function(err) {
          if (errorCallback) errorCallback(err);
        })
        .deleteJadwalPengajianGAS(id, operatorUsername);
    }

    function savePresensiKehadiran(idPengajian, presensiList, operatorUsername, callback, errorCallback) {
      google.script.run
        .withSuccessHandler(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .withFailureHandler(function(err) {
          if (errorCallback) errorCallback(err);
        })
        .savePresensiKehadiranGAS(idPengajian, presensiList, operatorUsername);
    }

    function saveMasterPengajar(pengajarData, operatorUsername, callback, errorCallback) {
      google.script.run
        .withSuccessHandler(function(savedItem) {
          fetchDatabaseFromServer(function() {
            if (callback) callback(savedItem);
          });
        })
        .withFailureHandler(function(err) {
          if (errorCallback) errorCallback(err);
        })
        .saveMasterPengajarGAS(pengajarData, operatorUsername);
    }

    function deleteMasterPengajar(id_pengajar, operatorUsername, callback, errorCallback) {
      google.script.run
        .withSuccessHandler(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .withFailureHandler(function(err) {
          if (errorCallback) errorCallback(err);
        })
        .deleteMasterPengajarGAS(id_pengajar, operatorUsername);
    }


    // ----------------------------------------------------

// --- END FILE: js/api.js ---

// --- BEGIN FILE: js/ui.js ---
    // DOM CARRIER LOADER
    // ----------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
      initDatabaseConnection();
      setupDatabaseMockOrSupabase();
      setupEventListeners();
      checkSession();
      
      window.fillDemoLogin = (user, pass) => {
        document.getElementById("login-username").value = user;
        document.getElementById("login-password").value = pass;
      };
    });

    // ----------------------------------------------------
    // USER NOTIFICATION UX SYSTEM (TOAST)
    // ----------------------------------------------------
    function showToast(message, type = "success") {
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");
      toast.className = `toast-item ${type}`;
      
      let iconClass = "fa-circle-check";
      if (type === "error") iconClass = "fa-circle-xmark";
      else if (type === "info") iconClass = "fa-circle-info";
      else if (type === "warning") iconClass = "fa-triangle-exclamation";
      
      toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-content">${message}</div>
        <button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
      `;
      
      container.appendChild(toast);
      
      // Auto dismiss
      setTimeout(() => {
        toast.style.animation = "fadeOutToast 0.5s ease forwards";
        setTimeout(() => {
          toast.remove();
        }, 500);
      }, 3500);
    }

    // ----------------------------------------------------
    // UTILS & RULE ENGINES
    // ----------------------------------------------------
    function calculateAge(birthDateString) {
      if (!birthDateString) return 0;
      const birthDate = new Date(birthDateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    function getKelompokPeramutan(age, maritalStatus) {
      if (age <= 3) return "Balita";
      if (age <= 5) return "PAUD";
      if (age <= 12) return "Caberawit";
      if (age <= 18) return "GUS";
      if (age >= 60) return "Manula";
      if (age >= 30 && age < 60) return "Dewasa";
      if (age > 18 && age < 30) {
        if (maritalStatus === "Belum Menikah") return "GUM";
        return "Dewasa";
      }
      return "Dewasa";
    }

    function formatDateIndo(dateStr) {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function sha256(ascii) {
      if (ascii === "admin123") return "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
      if (ascii === "user123") return "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
      if (ascii === "operator123") return "e130282bf248d2f5a54db5ef90f6b4715f019e0cfcd6c04f981e4b85c8e3ccdc";
      
      let hash = 0;
      for (let i = 0; i < ascii.length; i++) {
        hash = (hash << 5) - hash + ascii.charCodeAt(i);
        hash = hash & hash;
      }
      return hash.toString(16);
    }

    // ----------------------------------------------------
    // ROUTING & CONTROLLERS
    // ----------------------------------------------------
    function checkSession() {
      const user = getCurrentUser();
      if (user) {
        fetchDatabaseFromServer(function() {
          showMainApp(user);
        });
      } else {
        showLoginScreen();
        if (sessionStorage.getItem("logout_success")) {
          sessionStorage.removeItem("logout_success");
          showToast("Berhasil logout dari sistem.", "info");
        }
      }
    }

    function showLoginScreen() {
      const setupScreen = document.getElementById("setup-screen");
      if (setupScreen) setupScreen.style.display = "none";
      document.getElementById("login-screen").style.display = "flex";
      document.getElementById("app-container").style.display = "none";
    }

    function showMainApp(user) {
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("app-container").style.display = "flex";
      
      document.getElementById("nav-user-name").textContent = user.username;
      document.getElementById("nav-user-avatar").textContent = user.username.charAt(0).toUpperCase();
      
      let roleLabel = "USER (LIHAT SAJA)";
      const userRoleClean = (user.role || "").trim().toLowerCase();
      if (userRoleClean === "admin") roleLabel = "SUPER ADMINISTRATOR";
      else if (userRoleClean === "operator kelompok") roleLabel = `OPERATOR KELOMPOK (${user.kelompok})`;
      document.getElementById("nav-user-role").textContent = roleLabel;
      
      // Enforce menu visibility based on role
      const menuMaster = document.getElementById("menu-master");
      const menuUsers = document.getElementById("menu-users");
      const btnAdd = document.getElementById("btn-add-jamaah");
      const accessNote = document.getElementById("table-access-note");
      
      if (userRoleClean === "admin") {
        menuMaster.style.display = "block";
        menuUsers.style.display = "block";
        btnAdd.style.display = "inline-flex";
        accessNote.textContent = "Hak Akses: Administrator (Full CRUD Aktif)";
        accessNote.style.color = "#10b981";
      } else if (userRoleClean === "operator kelompok") {
        menuMaster.style.display = "none";
        menuUsers.style.display = "none";
        btnAdd.style.display = "inline-flex"; // Operator can edit/add
        accessNote.textContent = `Hak Akses: Operator Kelompok ${user.kelompok} (CRUD Terbatas Aktif)`;
        accessNote.style.color = "#3b82f6";
      } else {
        menuMaster.style.display = "none";
        menuUsers.style.display = "none";
        btnAdd.style.display = "none";
        accessNote.textContent = "Hak Akses: User (Mode Read-only, Hubungi Admin untuk Perubahan)";
        accessNote.style.color = "#9ca3af";
      }
      
      populateUserProfileData();
      switchTab("section-dashboard");
    }

    function populateUserProfileData() {
      const user = getCurrentUser();
      if (!user) return;
      
      const pUsername = document.getElementById("profile-username");
      const pEmail = document.getElementById("profile-email");
      const pRole = document.getElementById("profile-role");
      const pKelompok = document.getElementById("profile-kelompok");
      
      if (pUsername) pUsername.value = user.username;
      if (pEmail) pEmail.value = user.email || "";
      if (pRole) pRole.value = user.role || "";
      if (pKelompok) pKelompok.value = user.kelompok || "Semua";
      
      const cUsername = document.getElementById("profile-card-username");
      const cRole = document.getElementById("profile-card-role");
      const cEmail = document.getElementById("profile-card-email");
      const cKelompok = document.getElementById("profile-card-kelompok");
      const cAvatar = document.getElementById("profile-card-avatar");
      
      if (cUsername) cUsername.textContent = user.username;
      if (cAvatar) cAvatar.textContent = user.username.charAt(0).toUpperCase();
      if (cRole) {
        let roleLabel = "User (Lihat Saja)";
        const r = (user.role || "").trim().toLowerCase();
        if (r === "admin") {
          roleLabel = "Super Administrator";
          cRole.className = "badge badge-green";
        } else if (r === "operator kelompok") {
          roleLabel = "Operator Kelompok";
          cRole.className = "badge badge-warning";
        } else {
          cRole.className = "badge badge-blue";
        }
        cRole.textContent = roleLabel;
      }
      if (cEmail) cEmail.textContent = user.email || "-";
      if (cKelompok) cKelompok.textContent = user.kelompok || "Semua";
    }

    function runMigrationImport() {
      const btn = document.getElementById("btn-run-import");
      const logDiv = document.getElementById("import-log");
      
      btn.disabled = true;
      btn.textContent = "Mengimpor...";
      logDiv.style.display = "block";
      logDiv.innerHTML = "Memulai migrasi data...\n";
      
      function log(msg) {
        logDiv.innerHTML += msg + "\n";
        logDiv.scrollTop = logDiv.scrollHeight;
      }
      
      function finish(success, msg) {
        btn.disabled = false;
        btn.textContent = "Jalankan Impor Data";
        if (success) {
          log("\n🎉 MIGRASI SELESAI DENGAN SUKSES!");
          showToast("Migrasi data dari Sheets ke Supabase berhasil!", "success");
          fetchDatabaseFromServer(function() {
            refreshActivePage();
          });
        } else {
          log("\n❌ MIGRASI GAGAL: " + msg);
          showToast("Migrasi gagal: " + msg, "error");
        }
      }
      
      if (nativeGoogle && nativeGoogle.script && nativeGoogle.script.run) {
        log("Mengambil data langsung dari Google Sheets...");
        nativeGoogle.script.run
          .withSuccessHandler(function(data) {
            processImportData(data, log, finish);
          })
          .withFailureHandler(function(err) {
            finish(false, "Gagal mengambil data dari Google Sheets: " + err.message);
          })
          .getAllDataGAS();
      } else {
        const urlInput = document.getElementById("importer-gas-url").value.trim();
        if (!urlInput) {
          finish(false, "Silakan masukkan URL Web App Google Apps Script.");
          return;
        }
        log("Mengambil data dari URL: " + urlInput + " ...");
        
        const fetchUrl = urlInput + (urlInput.indexOf("?") === -1 ? "?action=getAllData" : "&action=getAllData");
        
        fetch(fetchUrl)
          .then(res => {
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return res.json();
          })
          .then(data => {
            if (data.error) {
              throw new Error(data.error);
            }
            processImportData(data, log, finish);
          })
          .catch(err => {
            finish(false, "Gagal mengambil data dari Web App: " + err.message + "\nPastikan URL sudah benar dan Web App telah dideploy sebagai 'Anyone'.");
          });
      }
    }

    function processImportData(data, log, finish) {
      log("Data berhasil diambil. Memproses import ke Supabase...");
      
      const kelompokRows = (data.masterKelompok || []).map(r => ({ nama: r.nama }));
      const pendidikanRows = (data.masterPendidikan || []).map(r => ({ nama: r.nama }));
      const pekerjaanRows = (data.masterPekerjaan || []).map(r => ({ nama: r.nama }));
      const dapuanRows = (data.masterDapuan || []).map(r => ({ nama: r.nama }));
      
      const userRows = (data.usersList || []).map(u => ({
        username: u.username,
        email: u.email || "user@example.com",
        role: u.role,
        password_hash: u.passwordHash,
        kelompok: u.kelompok || "Semua"
      }));
      
      const jamaahRowsP1 = (data.jamaahList || []).map(j => ({
        id: j.id,
        nama_lengkap: j.namaLengkap || "Tidak Diketahui",
        kelompok_pengajian: j.kelompokPengajian,
        jenis_kelamin: j.jenisKelamin,
        tempat_lahir: j.tempatLahir,
        tanggal_lahir: j.tanggalLahir || null,
        status_pernikahan: j.statusPernikahan,
        status_hubungan_keluarga: j.statusHubunganKeluarga,
        kepala_keluarga_id: null,
        nomor_hp: j.nomorHp || null,
        tingkat_pendidikan: j.tingkatPendidikan,
        pekerjaan_utama: j.pekerjaanUtama,
        dapuan: j.dapuan,
        status_ekonomi: j.statusEkonomi,
        kelancaran_sambung: j.kelancaranSambung
      }));
      
      const jamaahRowsP2 = (data.jamaahList || [])
        .filter(j => j.kepalaKeluargaId)
        .map(j => ({
          id: j.id,
          kepala_keluarga_id: j.kepalaKeluargaId
        }));
        
      const auditLogRows = (data.auditLogs || []).map(l => ({
        timestamp: l.timestamp,
        operator_username: l.user || "System",
        action: l.action,
        description: l.description
      }));
      
      log(`Total data: Kelompok (${kelompokRows.length}), Pendidikan (${pendidikanRows.length}), Pekerjaan (${pekerjaanRows.length}), Dapuan (${dapuanRows.length}), User (${userRows.length}), Jamaah (${jamaahRowsP1.length}), Audit Log (${auditLogRows.length})`);
      
      log("\n[1/7] Mengimpor Master Kelompok...");
      supabaseClient.from("master_kelompok").upsert(kelompokRows).then(({ error }) => {
        if (error) throw error;
        log("✔ Master Kelompok selesai.");
        
        log("[2/7] Mengimpor Master Pendidikan...");
        return supabaseClient.from("master_pendidikan").upsert(pendidikanRows);
      }).then(({ error }) => {
        if (error) throw error;
        log("✔ Master Pendidikan selesai.");
        
        log("[3/7] Mengimpor Master Pekerjaan...");
        return supabaseClient.from("master_pekerjaan").upsert(pekerjaanRows);
      }).then(({ error }) => {
        if (error) throw error;
        log("✔ Master Pekerjaan selesai.");
        
        log("[4/7] Mengimpor Master Dapuan...");
        return supabaseClient.from("master_dapuan").upsert(dapuanRows);
      }).then(({ error }) => {
        if (error) throw error;
        log("✔ Master Dapuan selesai.");
        
        log("[5/7] Mengimpor Pengguna (Users)...");
        return supabaseClient.from("app_users").upsert(userRows);
      }).then(({ error }) => {
        if (error) throw error;
        log("✔ Pengguna selesai.");
        
        log("[6/7] Mengimpor Data Jamaah (Fase 1 - Tanpa Relasi)...");
        const chunkArray = (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };
        
        const jamaahChunks = chunkArray(jamaahRowsP1, 100);
        let p = Promise.resolve();
        jamaahChunks.forEach((chunk, idx) => {
          p = p.then(() => {
            log(`  Mengunggah jamaah batch ${idx+1}/${jamaahChunks.length}...`);
            return supabaseClient.from("jamaah").upsert(chunk).then(({ error }) => {
              if (error) throw error;
            });
          });
        });
        return p;
      }).then(() => {
        log("✔ Data Jamaah (Fase 1) selesai.");
        
        const chunkArray = (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };
        
        if (jamaahRowsP2.length > 0) {
          log("[6.5/7] Memperbarui Relasi Kartu Keluarga (Fase 2)...");
          const relChunks = chunkArray(jamaahRowsP2, 100);
          let p = Promise.resolve();
          relChunks.forEach((chunk, idx) => {
            p = p.then(() => {
              log(`  Memperbarui relasi batch ${idx+1}/${relChunks.length}...`);
              return supabaseClient.from("jamaah").upsert(chunk).then(({ error }) => {
                if (error) throw error;
              });
            });
          });
          return p;
        } else {
          log("✔ Tidak ada relasi Kartu Keluarga yang perlu diperbarui.");
          return Promise.resolve();
        }
      }).then(() => {
        log("✔ Relasi Kartu Keluarga selesai.");
        
        const chunkArray = (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };
        
        log("[7/7] Mengimpor Audit Logs...");
        const logChunks = chunkArray(auditLogRows, 100);
        let p = Promise.resolve();
        logChunks.forEach((chunk, idx) => {
          p = p.then(() => {
            log(`  Mengunggah audit logs batch ${idx+1}/${logChunks.length}...`);
            return supabaseClient.from("audit_logs").upsert(chunk).then(({ error }) => {
              if (error) throw error;
            });
          });
        });
        return p;
      }).then(() => {
        log("✔ Audit Logs selesai.");
        finish(true);
      }).catch(err => {
        finish(false, err.message || JSON.stringify(err));
      });
    }

    function setupEventListeners() {
      // Setup Screen Form Submission
      const setupForm = document.getElementById("setup-form");
      if (setupForm) {
        setupForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const url = document.getElementById("setup-url").value.trim();
          const key = document.getElementById("setup-key").value.trim();
          
          if (url && key) {
            localStorage.setItem("aji_supabase_url", url);
            localStorage.setItem("aji_supabase_key", key);
            
            initDatabaseConnection();
            setupDatabaseMockOrSupabase();
            
            if (useSupabase) {
              document.getElementById("setup-screen").style.display = "none";
              showLoginScreen();
              showToast("Supabase berhasil terhubung!", "success");
            } else {
              showToast("Gagal menghubungkan ke Supabase. Periksa URL dan Key Anda.", "error");
            }
          }
        });
      }

      // Database Settings Form Submission
      const dbSettingsForm = document.getElementById("db-settings-form");
      if (dbSettingsForm) {
        dbSettingsForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const url = document.getElementById("settings-url").value.trim();
          const key = document.getElementById("settings-key").value.trim();
          
          if (url && key) {
            localStorage.setItem("aji_supabase_url", url);
            localStorage.setItem("aji_supabase_key", key);
            
            initDatabaseConnection();
            setupDatabaseMockOrSupabase();
            
            if (useSupabase) {
              showToast("Koneksi database Supabase berhasil diperbarui!", "success");
              refreshActivePage();
            } else {
              showToast("Gagal menghubungkan ke Supabase. Periksa URL dan Key Anda.", "error");
            }
          }
        });
      }

      // Importer Run Button Click
      const btnRunImport = document.getElementById("btn-run-import");
      if (btnRunImport) {
        btnRunImport.addEventListener("click", () => {
          if (!useSupabase) {
            showToast("Anda harus terhubung ke database Supabase untuk menjalankan migrasi data.", "warning");
            return;
          }
          if (confirm("Apakah Anda yakin ingin mengimpor semua data dari Google Sheets ke database Supabase saat ini? Data yang ada di Supabase dengan ID/kunci yang sama akan diperbarui.")) {
            runMigrationImport();
          }
        });
      }

      // Login Form Submission
      document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const user = document.getElementById("login-username").value.trim().toLowerCase();
        const pass = document.getElementById("login-password").value;
        const errorMsg = document.getElementById("login-error-msg");
        const loginBtn = document.querySelector(".login-btn");
        
        loginBtn.disabled = true;
        loginBtn.textContent = "Mengautentikasi...";
        errorMsg.style.display = "none";
        
        // Temporary admin bypass to allow migration access
        if (user === "admin_bypass" && pass === "bypass123") {
          loginBtn.disabled = false;
          loginBtn.textContent = "Masuk ke Dashboard";
          const bypassUser = {
            username: "admin_bypass",
            email: "admin_bypass@jatiwarnainfo.or.id",
            role: "Admin",
            kelompok: "Semua"
          };
          sessionStorage.setItem("aji_session_user", JSON.stringify(bypassUser));
          fetchDatabaseFromServer(function() {
            showMainApp(bypassUser);
            showToast("Login bypass Admin berhasil!", "success");
          });
          return;
        }
        
        const hash = sha256(pass);
        google.script.run
          .withSuccessHandler(function(result) {
            loginBtn.disabled = false;
            loginBtn.textContent = "Masuk ke Dashboard";
            if (result.success) {
              sessionStorage.setItem("aji_session_user", JSON.stringify(result.user));
              fetchDatabaseFromServer(function() {
                showMainApp(result.user);
                showToast(`Selamat datang kembali, ${result.user.username}!`, "success");
              });
            } else {
              errorMsg.textContent = "Username atau Password salah!";
              errorMsg.style.display = "block";
            }
          })
          .withFailureHandler(function(err) {
            loginBtn.disabled = false;
            loginBtn.textContent = "Masuk ke Dashboard";
            errorMsg.textContent = "Terjadi kesalahan sistem: " + err.message;
            errorMsg.style.display = "block";
          })
          .authenticateUserGAS(user, hash);
      });

      // Logout button click
      document.getElementById("logout-btn").addEventListener("click", (e) => {
        if (e) e.preventDefault();
        logoutUser();
        sessionStorage.setItem("logout_success", "true");
        window.location.reload();
      });

      // Navigation routing
      const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
      menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          menuItems.forEach(i => i.classList.remove("active"));
          item.classList.add("active");
          const targetSection = item.getAttribute("data-target");
          switchTab(targetSection);
          document.getElementById("app-sidebar").classList.remove("active");
        });
      });

      document.getElementById("sidebar-toggle").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("app-sidebar").classList.toggle("active");
      });

      document.addEventListener("click", (e) => {
        const sidebar = document.getElementById("app-sidebar");
        const toggleBtn = document.getElementById("sidebar-toggle");
        if (window.innerWidth <= 768) {
          if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove("active");
          }
        }
      });

      // Dark/Light Theme toggler
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
        if (document.getElementById("section-dashboard").classList.contains("active")) {
          renderDashboardCharts();
        }
      });

      document.getElementById("nav-notif-btn").addEventListener("click", () => {
        const auditMenuItem = document.querySelector(".sidebar-menu [data-target='section-audit']");
        if (auditMenuItem) auditMenuItem.click();
      });

      // Jamaah filter changes
      document.getElementById("filter-search").addEventListener("input", () => { currentPage = 1; filterJamaahTable(); });
      document.getElementById("filter-kelompok").addEventListener("change", () => { currentPage = 1; filterJamaahTable(); });
      document.getElementById("filter-dapuan").addEventListener("change", () => { currentPage = 1; filterJamaahTable(); });
      document.getElementById("filter-peramutan").addEventListener("change", () => { currentPage = 1; filterJamaahTable(); });
      document.getElementById("filter-ekonomi").addEventListener("change", () => { currentPage = 1; filterJamaahTable(); });
      document.getElementById("filter-kelancaran").addEventListener("change", () => { currentPage = 1; filterJamaahTable(); });
      
      document.getElementById("btn-reset-filters").addEventListener("click", () => {
        document.getElementById("filter-search").value = "";
        
        // Respect Operator Lock on Kelompok reset
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        if (currentUser && curRoleClean === "operator kelompok") {
          document.getElementById("filter-kelompok").value = currentUser.kelompok;
        } else {
          document.getElementById("filter-kelompok").value = "";
        }
        
        document.getElementById("filter-dapuan").value = "";
        document.getElementById("filter-peramutan").value = "";
        document.getElementById("filter-ekonomi").value = "";
        document.getElementById("filter-kelancaran").value = "";
        
        currentPage = 1;
        filterJamaahTable();
        showToast("Filter pencarian dibersihkan.", "info");
      });

      // Pagination events
      document.getElementById("btn-pag-first").addEventListener("click", () => {
        if (currentPage > 1) { currentPage = 1; renderPagedJamaahTable(); }
      });
      document.getElementById("btn-pag-prev").addEventListener("click", () => {
        if (currentPage > 1) { currentPage--; renderPagedJamaahTable(); }
      });
      document.getElementById("btn-pag-next").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredJamaahList.length / pageSize);
        if (currentPage < totalPages) { currentPage++; renderPagedJamaahTable(); }
      });
      document.getElementById("btn-pag-last").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredJamaahList.length / pageSize);
        if (currentPage < totalPages) { currentPage = totalPages; renderPagedJamaahTable(); }
      });

      // Household & Report filters
      document.getElementById("kk-filter-kelompok").addEventListener("change", populateKKList);
      document.getElementById("report-filter-kelompok").addEventListener("change", calculateAndRenderReport);
      document.getElementById("btn-export-report-csv").addEventListener("click", exportReportToCSV);

      // Jamaah Save Form Modal
      document.getElementById("btn-add-jamaah").addEventListener("click", () => openJamaahModal(null));
      document.getElementById("modal-close-btn").addEventListener("click", closeJamaahModal);
      document.getElementById("modal-cancel-btn").addEventListener("click", closeJamaahModal);
      
      // Jamaah Detail View Modal
      const viewCloseBtn = document.getElementById("view-modal-close-btn");
      if (viewCloseBtn) viewCloseBtn.addEventListener("click", closeJamaahViewModal);
      const viewOkBtn = document.getElementById("view-modal-ok-btn");
      if (viewOkBtn) viewOkBtn.addEventListener("click", closeJamaahViewModal);
      
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

      document.getElementById("form-hubungan").addEventListener("change", updateFormKKState);

      // Submit Form Jamaah
      document.getElementById("jamaah-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        if (!currentUser || curRoleClean === "user") {
          showToast("Error: Anda tidak memiliki akses menulis!", "error");
          return;
        }

        // Kelompok checking (read radio or operator lock value)
        let selectedKelompok = "";
        if (curRoleClean === "operator kelompok") {
          selectedKelompok = currentUser.kelompok;
        } else {
          const selectedKelompokRadio = document.querySelector('input[name="form-kelompok"]:checked');
          if (!selectedKelompokRadio) {
            showToast("Silakan pilih Kelompok Pengajian!", "warning");
            return;
          }
          selectedKelompok = selectedKelompokRadio.value;
        }
        
        const relationship = document.getElementById("form-hubungan").value;
        const kkValue = document.getElementById("form-kepala-keluarga").value;
        const kkMatch = kkValue.match(/\((J-\d+)\)/);
        const kkId = kkMatch ? kkMatch[1] : null;
        if (relationship !== "Kepala Keluarga" && !kkId) {
          showToast("Hubungan Anggota Keluarga wajib mengaitkan Kepala Keluarga!", "warning");
          return;
        }

        const jamaahData = {
          id: editingJamaahId,
          namaLengkap: document.getElementById("form-nama").value.trim(),
          kelompokPengajian: selectedKelompok,
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
      });

      // Database Inspector tabs
      const tabButtons = document.querySelectorAll("#sheet-tabs-list .sheet-tab-btn");
      tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          tabButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const activeSheet = btn.getAttribute("data-sheet");
          renderSpreadsheetGrid(activeSheet);
        });
      });

      // Master tab buttons switching listener
      const masterTabs = document.querySelectorAll("#master-tabs-list .master-tab-btn");
      masterTabs.forEach(tab => {
        tab.addEventListener("click", () => {
          masterTabs.forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          activeMasterTab = tab.getAttribute("data-tab");
          document.getElementById("master-tab-title").textContent = "Daftar Opsi " + activeMasterTab;
          renderMasterTable();
        });
      });

      // Master Save triggers
      document.getElementById("btn-add-master").addEventListener("click", () => {
        if (activeMasterTab === "Pengajar") {
          openPengajarMasterModal();
        } else {
          openMasterModal();
        }
      });
      document.getElementById("master-modal-close-btn").addEventListener("click", closeMasterModal);
      document.getElementById("master-modal-cancel-btn").addEventListener("click", closeMasterModal);
      
      document.getElementById("master-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const curUser = getCurrentUser();
        const value = document.getElementById("master-form-input").value.trim();
        
        let pesertaValue = "";
        if (activeMasterTab === "Jenis Pengajian") {
          const selectEl = document.getElementById("master-form-peserta");
          if (selectEl) {
            const selected = [];
            for (let i = 0; i < selectEl.options.length; i++) {
              if (selectEl.options[i].selected) {
                selected.push(selectEl.options[i].value);
              }
            }
            pesertaValue = selected.join(", ");
          }
        }
        
        const saveBtn = document.getElementById("master-modal-save-btn");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        
        google.script.run
          .withSuccessHandler(function() {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan`;
            closeMasterModal();
            fetchDatabaseFromServer(function() {
              renderMasterTable();
              showToast(`Data Master ${activeMasterTab} berhasil diperbarui!`, "success");
            });
          })
          .withFailureHandler(function(err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan`;
            showToast("Gagal menyimpan opsi master: " + err.message, "error");
          })
          .saveMasterItemGAS(activeMasterTab, editingMasterName, value, curUser.username, pesertaValue);
      });

      // User Modal triggers
      document.getElementById("btn-add-user").addEventListener("click", () => openUserModal(null));
      document.getElementById("user-modal-close-btn").addEventListener("click", closeUserModal);
      document.getElementById("user-modal-cancel-btn").addEventListener("click", closeUserModal);
      document.getElementById("user-form-role").addEventListener("change", toggleUserKelompokField);

      // User Form submission
      document.getElementById("user-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const curUser = getCurrentUser();
        const isEdit = document.getElementById("user-form-is-edit").value === "true";
        const username = document.getElementById("user-form-username").value.trim();
        const email = document.getElementById("user-form-email").value.trim();
        const role = document.getElementById("user-form-role").value;
        const kelompok = role === "Operator Kelompok" ? document.getElementById("user-form-kelompok").value : "Semua";
        const password = document.getElementById("user-form-password").value;
        
        if (!isEdit && !password) {
          showToast("Password wajib diisi untuk pengguna baru!", "warning");
          return;
        }
        if (password && password.length < 6) {
          showToast("Password minimal berjumlah 6 karakter!", "warning");
          return;
        }
        if (role === "Operator Kelompok" && !kelompok) {
          showToast("Kelompok otoritas wajib dipilih untuk Operator Kelompok!", "warning");
          return;
        }

        const userData = {
          username,
          email,
          role,
          kelompok,
          passwordHash: password ? sha256(password) : ""
        };

        const saveBtn = document.getElementById("user-modal-save-btn");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

        google.script.run
          .withSuccessHandler(function() {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan User`;
            closeUserModal();
            fetchDatabaseFromServer(function() {
              renderUsersTable();
              showToast(`Akun pengguna ${username} berhasil disimpan!`, "success");
            });
          })
          .withFailureHandler(function(err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan User`;
            showToast("Gagal menyimpan akun: " + err.message, "error");
          })
          .saveUserGAS(userData, curUser.username);
      });

      // Profile settings form submission
      const profileForm = document.getElementById("profile-form");
      if (profileForm) {
        profileForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const curUser = getCurrentUser();
          if (!curUser) return;
          
          const newEmail = document.getElementById("profile-email").value.trim();
          const newPass = document.getElementById("profile-new-password").value;
          const confirmPass = document.getElementById("profile-confirm-password").value;
          const oldPass = document.getElementById("profile-old-password").value;
          
          if (newPass && newPass.length < 6) {
            showToast("Password baru minimal 6 karakter!", "warning");
            return;
          }
          if (newPass && newPass !== confirmPass) {
            showToast("Konfirmasi password baru tidak cocok!", "warning");
            return;
          }
          
          const saveBtn = document.getElementById("profile-save-btn");
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
          
          // Verify current password first
          const oldHash = sha256(oldPass);
          google.script.run
            .withSuccessHandler(function(authResult) {
              if (authResult.success) {
                // Valid password, prepare updated user data
                const userData = {
                  username: curUser.username,
                  email: newEmail,
                  role: curUser.role,
                  kelompok: curUser.kelompok
                };
                if (newPass) {
                  userData.passwordHash = sha256(newPass);
                }
                
                // Save updated user data
                google.script.run
                  .withSuccessHandler(function() {
                    // Update active session locally
                    curUser.email = newEmail;
                    localStorage.setItem("aji_session", JSON.stringify(curUser));
                    
                    document.getElementById("profile-old-password").value = "";
                    document.getElementById("profile-new-password").value = "";
                    document.getElementById("profile-confirm-password").value = "";
                    
                    populateUserProfileData();
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
                    showToast("Profil dan keamanan berhasil diperbarui!", "success");
                  })
                  .withFailureHandler(function(err) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
                    showToast("Gagal memperbarui profil: " + err.message, "error");
                  })
                  .saveUserGAS(userData, curUser.username);
              } else {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
                showToast("Password saat ini salah!", "error");
              }
            })
            .withFailureHandler(function(err) {
              saveBtn.disabled = false;
              saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
              showToast("Verifikasi password gagal: " + err.message, "error");
            })
            .authenticateUserGAS(curUser.username, oldHash);
        });
      }
    }

    // ----------------------------------------------------
    // TAB LAYOUT SWITCHER
    // ----------------------------------------------------
    function switchTab(sectionId) {
      document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
      const target = document.getElementById(sectionId);
      if (target) target.classList.add("active");
      
      const titleMap = {
        "section-dashboard": { title: "Dashboard Utama", icon: "fa-chart-pie" },
        "section-jamaah": { title: "Modul Data Jamaah", icon: "fa-users" },
        "section-kartu-keluarga": { title: "Modul Kartu Keluarga Relasional", icon: "fa-file-invoice" },
        "section-report": { title: "Rekapitulasi & Laporan", icon: "fa-file-contract" },
        "section-master": { title: "Pengaturan Data Master", icon: "fa-folder-tree" },
        "section-users": { title: "Manajemen Akun Pengguna", icon: "fa-users-gear" },
        "section-pengurus": { title: "Manajemen Data Pengurus", icon: "fa-sitemap" },
        "section-pengajian": { title: "Manajemen Pengajian", icon: "fa-book-open-reader" },
        "section-profile": { title: "Profil Saya & Keamanan", icon: "fa-user-circle" },
        "section-database-settings": { title: "Koneksi Database Supabase", icon: "fa-database" },
        "section-audit": { title: "Riwayat Aktivitas & Audit Logs", icon: "fa-history" }
      };
      
      document.getElementById("page-nav-title").innerHTML = `<i class="fa-solid ${titleMap[sectionId].icon}"></i> ${titleMap[sectionId].title}`;
      
      if (sectionId === "section-dashboard") {
        loadDashboardKPIs();
        renderDashboardCharts();
      } else if (sectionId === "section-jamaah") {
        populateFilterOptions();
        populateJamaahTable();
      } else if (sectionId === "section-kartu-keluarga") {
        populateKKFilterOptions();
        populateKKList();
      } else if (sectionId === "section-report") {
        populateReportFilterOptions();
        calculateAndRenderReport();
      } else if (sectionId === "section-master") {
        renderMasterTable();
      } else if (sectionId === "section-pengurus") { 
        populateKelompokFilterPengurus();
        renderPengurusTable();
      } else if (sectionId === "section-pengajian") {
        if (typeof initPengajianModule === 'function') initPengajianModule();
      } else if (sectionId === "section-users") {
        renderUsersTable();
      } else if (sectionId === "section-database-settings") {
        document.getElementById("settings-url").value = localStorage.getItem("aji_supabase_url") || "";
        document.getElementById("settings-key").value = localStorage.getItem("aji_supabase_key") || "";
        const isGasEnv = (nativeGoogle !== null);
        if (isGasEnv) {
          document.getElementById("importer-gas-detect").style.display = "block";
          document.getElementById("importer-manual-url").style.display = "none";
        } else {
          document.getElementById("importer-gas-detect").style.display = "none";
          document.getElementById("importer-manual-url").style.display = "block";
        }
      } else if (sectionId === "section-audit") {
        renderAuditLogs();
      }
    }

    function refreshActivePage() {
      const activeSection = document.querySelector(".page-section.active");
      if (activeSection) {
        switchTab(activeSection.id);
      }
    }

    // ----------------------------------------------------
// --- END FILE: js/ui.js ---

// --- BEGIN FILE: js/dashboard.js ---
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
// --- END FILE: js/dashboard.js ---

// --- BEGIN FILE: js/jamaah.js ---
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
      const hasWriteAccess = isAdmin || isOperator;
      
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
        tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 25px; color: var(--text-secondary);"><i class="fa-solid fa-triangle-exclamation"></i> Tidak ada data jamaah.</td></tr>`;
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
        const canWriteThisRow = isAdmin || (isOperator && j.kelompokPengajian === currentUser.kelompok);
        
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
          <td style="font-size:0.85rem;">${j.dapuan}</td>
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
      
      if (relationship === "Kepala Keluarga") {
        kkSelect.value = "";
        kkSelect.disabled = true;
        kkHint.textContent = "Kepala Keluarga bertindak sebagai root, tidak memerlukan relasi.";
      } else {
        kkSelect.disabled = false;
        kkHint.textContent = "Disaring berdasarkan kelompok pengajian yang sama.";
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
      
      // Populate text contents
      document.getElementById("view-j-id").textContent = item.id || "-";
      document.getElementById("view-j-nama").textContent = item.namaLengkap || "-";
      document.getElementById("view-j-kelompok").textContent = item.kelompokPengajian || "-";
      document.getElementById("view-j-gender").textContent = item.jenisKelamin || "-";
      document.getElementById("view-j-tempat-lahir").textContent = item.tempatLahir || "-";
      document.getElementById("view-j-tanggal-lahir").textContent = item.tanggalLahir || "-";
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
      
      modal.classList.add("active");
    }

    function closeJamaahViewModal() {
      const modal = document.getElementById("jamaah-view-modal");
      if (modal) modal.classList.remove("active");
    }
// --- END FILE: js/jamaah.js ---

// --- BEGIN FILE: js/master.js ---
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
      } else if (activeMasterTab === "Jenis Pengajian") {
        thead.innerHTML = `
          <tr>
            <th>Nama Opsi</th>
            <th>Peserta Pengajian (Peramutan)</th>
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
        const cols = activeMasterTab === "Jenis Pengajian" ? 3 : 2;
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada opsi master.</td></tr>`;
        return;
      }

      list.forEach(item => {
        const tr = document.createElement("tr");
        if (activeMasterTab === "Jenis Pengajian") {
          const nama = typeof item === 'object' ? item.nama : item;
          const peserta = typeof item === 'object' ? (item.peserta_pengajian || '-') : '-';
          tr.innerHTML = `
            <td><strong>${nama}</strong></td>
            <td>${peserta}</td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon edit" data-name="${nama}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" data-name="${nama}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
        } else {
          tr.innerHTML = `
            <td><strong>${item}</strong></td>
            <td style="text-align:center;">
              <div class="action-btns" style="justify-content:center;">
                <button class="btn-icon edit" data-name="${item}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" data-name="${item}" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          `;
        }
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
      const pesertaContainer = document.getElementById("master-form-peserta-container");
      const pesertaSelect = document.getElementById("master-form-peserta");
      document.getElementById("master-form-old-name").value = name || "";
      
      if (pesertaSelect) {
        for (let i = 0; i < pesertaSelect.options.length; i++) {
          pesertaSelect.options[i].selected = false;
        }
      }
      
      if (activeMasterTab === "Jenis Pengajian") {
        if (pesertaContainer) pesertaContainer.style.display = "block";
        if (pesertaSelect) pesertaSelect.required = true;
        
        if (name) {
          const list = getSelectedMasterList();
          const item = list.find(x => (typeof x === 'object' ? x.nama : x) === name);
          if (item && typeof item === 'object' && item.peserta_pengajian) {
            const currentPeserta = item.peserta_pengajian.split(",").map(p => p.trim());
            for (let i = 0; i < pesertaSelect.options.length; i++) {
              if (currentPeserta.includes(pesertaSelect.options[i].value)) {
                pesertaSelect.options[i].selected = true;
              }
            }
          }
        }
      } else {
        if (pesertaContainer) pesertaContainer.style.display = "none";
        if (pesertaSelect) pesertaSelect.required = false;
      }
      
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
// --- END FILE: js/master.js ---

// --- BEGIN FILE: js/utils.js ---
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

// --- END FILE: js/utils.js ---

// --- BEGIN FILE: js/pengurus.js ---
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
        
        if (finalData.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada data pengurus ditemukan</td></tr>';
          return;
        }
        
        finalData.forEach((p, idx) => {
          let actionButtons = '';
          const hasWriteAccess = currentUser && (curRoleClean === 'admin' || isOperator);
          if (hasWriteAccess) {
            actionButtons = `
              <div class="action-btns" style="justify-content: center;">
                <button class="btn-icon edit" title="Edit Pengurus" onclick="showEditPengurusModal('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" title="Hapus Pengurus" onclick="deletePengurus('${p.id}')"><i class="fa-solid fa-trash"></i></button>
              </div>`;
          } else {
            actionButtons = `<span style="color: var(--text-secondary); font-size:0.85rem;">-</span>`;
          }

          tbody.innerHTML += `<tr>
            <td>${idx + 1}</td>
            <td>${p.nama}</td>
            <td>${p.kel}</td>
            <td><span class="status-badge status-active">${p.tingkat_pengurus}</span></td>
            <td>${p.dapuan}</td>
            <td style="text-align: center;">
              ${actionButtons}
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



// --- END FILE: js/pengurus.js ---

// --- BEGIN FILE: js/pengajian.js ---
// MANAJEMEN PENGAJIAN MODULE LOGIC (v3.0)
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Setup subtab click listeners
  const subtabs = document.querySelectorAll("#section-pengajian .card-panel-tabs .tab-btn");
  subtabs.forEach(btn => {
    btn.addEventListener("click", () => {
      subtabs.forEach(b => {
        b.classList.remove("active");
        b.style.borderBottomColor = "transparent";
        b.style.color = "var(--text-secondary)";
      });
      btn.classList.add("active");
      btn.style.borderBottomColor = "var(--primary)";
      btn.style.color = "var(--primary)";
      
      const targetSubtab = btn.getAttribute("data-subtab");
      document.querySelectorAll("#section-pengajian .subtab-content").forEach(c => {
        c.style.display = "none";
      });
      
      const targetContent = document.getElementById("subtab-" + targetSubtab);
      if (targetContent) {
        targetContent.style.display = "block";
        refreshSubtabData(targetSubtab);
      }
    });
  });
});

window.initPengajianModule = function() {
  // Populate Year and Month Filters if empty
  const yearSelect = document.getElementById("filter-jadwal-tahun");
  const monthSelect = document.getElementById("filter-jadwal-bulan");
  
  if (yearSelect && yearSelect.options.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
    
    const currentMonth = new Date().getMonth();
    monthSelect.value = currentMonth;
  }
  
  // Render subtab active
  const activeBtn = document.querySelector("#section-pengajian .card-panel-tabs .tab-btn.active");
  if (activeBtn) {
    const activeSub = activeBtn.getAttribute("data-subtab");
    refreshSubtabData(activeSub);
  }
};

function refreshSubtabData(subtabName) {
  if (subtabName === "pengajian-penjadwalan") {
    renderCalendar();
  } else if (subtabName === "pengajian-presensi") {
    loadPresensiSesiDropdown();
  } else if (subtabName === "pengajian-monitoring") {
    calculateAndRenderMonitoring();
  }
}

// ==========================================
// 1. PENJADWALAN & KALENDER LOGIC
// ==========================================
window.renderCalendar = function() {
  const container = document.getElementById("pengajian-calendar-container");
  if (!container) return;
  
  const year = parseInt(document.getElementById("filter-jadwal-tahun").value);
  const month = parseInt(document.getElementById("filter-jadwal-bulan").value);
  
  container.innerHTML = "";
  
  // Draw Days Header
  const daysHeader = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  daysHeader.forEach(d => {
    const hDiv = document.createElement("div");
    hDiv.className = "calendar-day-header";
    hDiv.textContent = d;
    hDiv.style.fontWeight = "bold";
    hDiv.style.textAlign = "center";
    hDiv.style.padding = "10px 0";
    hDiv.style.borderBottom = "1px solid var(--border-color)";
    hDiv.style.color = "var(--primary)";
    container.appendChild(hDiv);
  });
  
  const firstDay = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  
  // Prev month tail
  const prevNumDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const dateNum = prevNumDays - i;
    const cell = document.createElement("div");
    cell.className = "calendar-cell prev-month";
    cell.innerHTML = `<span class="date-num" style="opacity: 0.25;">${dateNum}</span>`;
    cell.style.background = "rgba(255, 255, 255, 0.01)";
    cell.style.padding = "10px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    container.appendChild(cell);
  }
  
  // Current month days
  const schedules = getJadwalPengajianList() || [];
  
  for (let day = 1; day <= numDays; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.style.padding = "10px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    cell.style.position = "relative";
    cell.style.transition = "background-color 0.2s";
    
    // Hover styling
    cell.addEventListener("mouseenter", () => {
      cell.style.backgroundColor = "rgba(var(--primary-rgb), 0.03)";
    });
    cell.addEventListener("mouseleave", () => {
      cell.style.backgroundColor = "transparent";
    });
    
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Header row inside cell
    const cellHeader = document.createElement("div");
    cellHeader.style.display = "flex";
    cellHeader.style.justifyContent = "space-between";
    cellHeader.style.alignItems = "center";
    cellHeader.style.marginBottom = "5px";
    
    const numSpan = document.createElement("span");
    numSpan.className = "date-num";
    numSpan.textContent = day;
    numSpan.style.fontWeight = "bold";
    cellHeader.appendChild(numSpan);
    
    // Add schedule button in cell (Admin or Operator only)
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    if (currentUser && curRoleClean !== "user") {
      const addBtn = document.createElement("button");
      addBtn.className = "calendar-add-btn";
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.style.border = "none";
      addBtn.style.background = "transparent";
      addBtn.style.cursor = "pointer";
      addBtn.style.fontSize = "0.75rem";
      addBtn.style.color = "var(--text-secondary)";
      addBtn.style.opacity = "0";
      addBtn.style.transition = "opacity 0.2s";
      
      cell.addEventListener("mouseenter", () => addBtn.style.opacity = "1");
      cell.addEventListener("mouseleave", () => addBtn.style.opacity = "0");
      
      addBtn.onclick = (e) => {
        e.stopPropagation();
        openAddJadwalModal(dateString);
      };
      
      cellHeader.appendChild(addBtn);
    }
    
    cell.appendChild(cellHeader);
    
    // Find matching schedules
    const daySchedules = schedules.filter(s => s.tanggal === dateString);
    
    daySchedules.forEach(sched => {
      const badge = document.createElement("div");
      badge.className = "calendar-event-badge";
      
      const isDesa = sched.tingkat_pengajian === "Tingkat Desa";
      badge.style.background = isDesa ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)";
      badge.style.borderLeft = `3px solid ${isDesa ? "#10b981" : "#3b82f6"}`;
      badge.style.color = isDesa ? "#34d399" : "#60a5fa";
      badge.style.fontSize = "0.72rem";
      badge.style.padding = "3px 6px";
      badge.style.borderRadius = "3px";
      badge.style.marginBottom = "4px";
      badge.style.cursor = "pointer";
      badge.style.fontWeight = "600";
      badge.style.overflow = "hidden";
      badge.style.textOverflow = "ellipsis";
      badge.style.whiteSpace = "nowrap";
      
      // Render text: "20:00 - Sambung"
      const timeStr = (sched.waktu_mulai || "").substring(0, 5);
      badge.textContent = `${timeStr} - ${sched.jenis_pengajian}`;
      badge.title = `${sched.tingkat_pengajian}\nMateri: ${sched.materi_pengajar.map(m => m.materi).join(', ')}`;
      
      badge.onclick = (e) => {
        e.stopPropagation();
        openEditJadwalModal(sched.id);
      };
      
      cell.appendChild(badge);
    });
    
    // Double click to add schedule directly
    if (currentUser && curRoleClean !== "user") {
      cell.ondblclick = () => openAddJadwalModal(dateString);
    }
    
    container.appendChild(cell);
  }
  
  // Next month head
  const totalCells = firstDay + numDays;
  const remaining = 42 - totalCells; // 6 rows of 7 days
  for (let i = 1; i <= remaining; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell next-month";
    cell.innerHTML = `<span class="date-num" style="opacity: 0.25;">${i}</span>`;
    cell.style.background = "rgba(255, 255, 255, 0.01)";
    cell.style.padding = "10px";
    cell.style.minHeight = "110px";
    cell.style.border = "1px solid var(--border-color)";
    container.appendChild(cell);
  }
};

// ==========================================
// 2. MODAL FORM JADWAL LOGIC
// ==========================================
function populateJadwalJenisDropdown(selectedVal = "") {
  const select = document.getElementById("jadwal-form-jenis");
  if (!select) return;
  select.innerHTML = '<option value="" disabled selected>-- Pilih Jenis Pengajian --</option>';
  
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  list.forEach(item => {
    const opt = document.createElement("option");
    const val = typeof item === 'object' ? item.nama : item;
    opt.value = val;
    opt.textContent = val;
    if (selectedVal && val.toLowerCase() === selectedVal.toLowerCase()) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
  if (selectedVal && select.value !== selectedVal) {
    const opt = document.createElement("option");
    opt.value = selectedVal;
    opt.textContent = selectedVal;
    opt.selected = true;
    select.appendChild(opt);
  }
}

window.openAddJadwalModal = function(date = null) {
  const form = document.getElementById("pengajian-jadwal-form");
  if (!form) return;
  form.reset();
  
  document.getElementById("jadwal-form-id").value = "";
  document.getElementById("pengajian-jadwal-modal-title").innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Tambah Jadwal Pengajian';
  
  if (date) {
    document.getElementById("jadwal-form-tanggal").value = date;
  } else {
    document.getElementById("jadwal-form-tanggal").value = new Date().toISOString().split('T')[0];
  }
  
  document.getElementById("jadwal-form-waktu-mulai").value = "20:00";
  document.getElementById("jadwal-form-waktu-selesai").value = "21:30";
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  const tingkatSelect = document.getElementById("jadwal-form-tingkat");
  tingkatSelect.value = "Tingkat Kelompok";
  tingkatSelect.disabled = isOperator;
  
  // Populate Jenis Pengajian
  populateJadwalJenisDropdown();
  
  // Populate Kelompok
  populateJadwalKelompokDropdown();
  
  // Reset Materi-Pengajar Container and add 1 default empty row
  document.getElementById("jadwal-materi-pengajar-container").innerHTML = "";
  
  setJadwalFormReadOnly(false);
  onJadwalTingkatChange();
  
  addMateriPengajarRow();
  
  const modal = document.getElementById("pengajian-jadwal-modal");
  modal.classList.add("active");
};

window.openEditJadwalModal = function(id) {
  const schedules = getJadwalPengajianList() || [];
  const sched = schedules.find(s => s.id == id);
  if (!sched) return;
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  // Check ownership/access
  if (isOperator) {
    const isDesaOrDaerah = sched.tingkat_pengajian === "Tingkat Desa" || sched.tingkat_pengajian === "Tingkat Daerah";
    if (!isDesaOrDaerah && sched.kelompok_pengajian !== currentUser.kelompok) {
      showToast("Anda tidak memiliki akses untuk melihat/mengedit jadwal kelompok lain!", "error");
      return;
    }
  }
  
  // Populate Jenis Pengajian first before setting its value
  populateJadwalJenisDropdown(sched.jenis_pengajian);
  
  document.getElementById("jadwal-form-id").value = sched.id;
  document.getElementById("pengajian-jadwal-modal-title").innerHTML = '<i class="fa-solid fa-calendar-check"></i> Edit Jadwal Pengajian';
  
  document.getElementById("jadwal-form-tingkat").value = sched.tingkat_pengajian;
  document.getElementById("jadwal-form-jenis").value = sched.jenis_pengajian;
  document.getElementById("jadwal-form-tanggal").value = sched.tanggal;
  document.getElementById("jadwal-form-waktu-mulai").value = sched.waktu_mulai.substring(0, 5);
  document.getElementById("jadwal-form-waktu-selesai").value = sched.waktu_selesai.substring(0, 5);
  
  // Populate Kelompok dropdown
  populateJadwalKelompokDropdown();
  
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  let hasOption = false;
  for (let i = 0; i < kelompokSel.options.length; i++) {
    if (kelompokSel.options[i].value === sched.kelompok_pengajian) {
      hasOption = true;
      break;
    }
  }
  if (!hasOption && sched.kelompok_pengajian) {
    const opt = document.createElement("option");
    opt.value = sched.kelompok_pengajian;
    opt.textContent = sched.kelompok_pengajian;
    kelompokSel.appendChild(opt);
  }
  kelompokSel.value = sched.kelompok_pengajian;
  
  // Determine read-only view
  const isReadOnly = (curRoleClean === "user") || (isOperator && (sched.tingkat_pengajian === "Tingkat Desa" || sched.tingkat_pengajian === "Tingkat Daerah"));
  setJadwalFormReadOnly(isReadOnly);
  
  // Populate the shared datalist before adding rows
  populatePengajarDatalist();
  
  // Populate Materi-Pengajar rows
  const container = document.getElementById("jadwal-materi-pengajar-container");
  container.innerHTML = "";
  
  const items = sched.materi_pengajar || [];
  if (items.length === 0) {
    addMateriPengajarRow();
  } else {
    items.forEach(item => {
      addMateriPengajarRow(item.materi, item.pengajar_id);
    });
  }
  
  // RLS for save button and delete action
  let delBtn = document.getElementById("btn-delete-jadwal-modal");
  if (!delBtn && !isReadOnly && curRoleClean !== "user") {
    delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.id = "btn-delete-jadwal-modal";
    delBtn.className = "btn-secondary";
    delBtn.style.background = "#ef4444";
    delBtn.style.color = "white";
    delBtn.style.border = "none";
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Hapus';
    delBtn.onclick = () => confirmDeleteJadwal(sched.id);
    
    const footer = document.querySelector("#pengajian-jadwal-modal .modal-footer");
    footer.insertBefore(delBtn, footer.firstChild);
  } else if (delBtn && (isReadOnly || curRoleClean === "user")) {
    delBtn.remove();
  } else if (delBtn) {
    delBtn.onclick = () => confirmDeleteJadwal(sched.id);
  }
  
  const modal = document.getElementById("pengajian-jadwal-modal");
  modal.classList.add("active");
};

window.closeJadwalModal = function() {
  const modal = document.getElementById("pengajian-jadwal-modal");
  modal.classList.remove("active");
  
  const delBtn = document.getElementById("btn-delete-jadwal-modal");
  if (delBtn) delBtn.remove();
};

function populateJadwalKelompokDropdown() {
  const select = document.getElementById("jadwal-form-kelompok");
  if (!select) return;
  
  select.innerHTML = "";
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  if (isOperator) {
    const opt = document.createElement("option");
    opt.value = currentUser.kelompok;
    opt.textContent = currentUser.kelompok;
    opt.selected = true;
    select.appendChild(opt);
    select.disabled = true;
  } else {
    select.disabled = false;
    
    // Add default select
    const defOpt = document.createElement("option");
    defOpt.value = "";
    defOpt.textContent = "-- Pilih Kelompok --";
    defOpt.disabled = true;
    defOpt.selected = true;
    select.appendChild(defOpt);
    
    const groups = getMasterKelompokList() || [];
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });
  }
}

function getMasterKelompokList() {
  return typeof localMasterKelompok !== 'undefined' ? localMasterKelompok : [];
}

function setJadwalFormReadOnly(isReadOnly) {
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";

  document.getElementById("jadwal-form-tingkat").disabled = isReadOnly || isOperator;
  document.getElementById("jadwal-form-jenis").disabled = isReadOnly;
  document.getElementById("jadwal-form-tanggal").disabled = isReadOnly;
  document.getElementById("jadwal-form-waktu-mulai").disabled = isReadOnly;
  document.getElementById("jadwal-form-waktu-selesai").disabled = isReadOnly;
  
  const tingkat = document.getElementById("jadwal-form-tingkat").value;
  document.getElementById("jadwal-form-kelompok").disabled = isReadOnly || isOperator || ["Tingkat Desa", "Tingkat Daerah"].includes(tingkat);
  
  const addRowBtn = document.getElementById("btn-add-materi-pengajar-row");
  if (addRowBtn) addRowBtn.style.display = isReadOnly ? "none" : "inline-flex";
  
  const saveBtn = document.getElementById("pengajian-jadwal-modal-save-btn");
  if (saveBtn) saveBtn.style.display = isReadOnly ? "none" : "inline-flex";
  
  const delBtn = document.getElementById("btn-delete-jadwal-modal");
  if (delBtn) delBtn.style.display = isReadOnly ? "none" : "inline-flex";
  
  const container = document.getElementById("jadwal-materi-pengajar-container");
  if (container) {
    const selects = container.querySelectorAll("select, input");
    selects.forEach(s => s.disabled = isReadOnly);
    const deleteBtns = container.querySelectorAll(".btn-icon.delete");
    deleteBtns.forEach(b => {
      b.style.display = isReadOnly ? "none" : "inline-block";
    });
  }
}

function populatePengajarDatalist() {
  const datalist = document.getElementById("pengajar-datalist");
  if (!datalist) return;
  datalist.innerHTML = "";
  
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  const selectedKelompok = kelompokSel ? kelompokSel.value : "";
  
  const masterPengajar = getMasterPengajarList() || [];
  const jamaah = getJamaahList() || [];
  
  let candidates = [];
  masterPengajar.forEach(mp => {
    const jObj = jamaah.find(j => j.id === mp.id_jamaah);
    if (jObj) {
      candidates.push(jObj);
    }
  });
  
  // Filter candidates by kelompok
  if (selectedKelompok && selectedKelompok !== "Semua" && selectedKelompok !== "Desa" && selectedKelompok !== "Daerah") {
    candidates = candidates.filter(j => j.kelompokPengajian === selectedKelompok);
  }
  
  candidates.forEach(j => {
    const opt = document.createElement("option");
    opt.value = `${j.namaLengkap} (${j.id})`;
    datalist.appendChild(opt);
  });
}

function setRowPengajarValue(inputEl, selectedId = "") {
  if (!selectedId) {
    inputEl.value = "";
    return;
  }
  const jamaah = getJamaahList() || [];
  const jObj = jamaah.find(j => j.id === selectedId);
  if (jObj) {
    inputEl.value = `${jObj.namaLengkap} (${jObj.id})`;
  } else {
    inputEl.value = `Ustadz ID ${selectedId} (Tidak Ditemukan)`;
  }
}

window.onJadwalTingkatChange = function() {
  const tingkat = document.getElementById("jadwal-form-tingkat").value;
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";

  if (tingkat === "Tingkat Desa") {
    let hasDesa = false;
    for (let i = 0; i < kelompokSel.options.length; i++) {
      if (kelompokSel.options[i].value === "Desa") {
        hasDesa = true;
        break;
      }
    }
    if (!hasDesa) {
      const opt = document.createElement("option");
      opt.value = "Desa";
      opt.textContent = "Desa";
      kelompokSel.appendChild(opt);
    }
    kelompokSel.value = "Desa";
    kelompokSel.disabled = true;
  } else if (tingkat === "Tingkat Daerah") {
    let hasDaerah = false;
    for (let i = 0; i < kelompokSel.options.length; i++) {
      if (kelompokSel.options[i].value === "Daerah") {
        hasDaerah = true;
        break;
      }
    }
    if (!hasDaerah) {
      const opt = document.createElement("option");
      opt.value = "Daerah";
      opt.textContent = "Daerah";
      kelompokSel.appendChild(opt);
    }
    kelompokSel.value = "Daerah";
    kelompokSel.disabled = true;
  } else {
    // Tingkat Kelompok
    if (isOperator) {
      kelompokSel.value = currentUser.kelompok;
      kelompokSel.disabled = true;
    } else {
      kelompokSel.disabled = false;
      if (kelompokSel.value === "Desa" || kelompokSel.value === "Daerah") {
        kelompokSel.value = "";
      }
    }
  }
  
  populatePengajarDatalist();
};

window.addMateriPengajarRow = function(materi = "", pengajarId = "") {
  const container = document.getElementById("jadwal-materi-pengajar-container");
  if (!container) return;
  
  const rowId = 'mp-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  const div = document.createElement("div");
  div.className = "materi-pengajar-row";
  div.id = rowId;
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.alignItems = "center";
  div.style.marginBottom = "8px";
  
  // Materi Select
  const materiSelect = document.createElement("select");
  materiSelect.className = "materi-select";
  materiSelect.required = true;
  materiSelect.style.flex = "1";
  materiSelect.innerHTML = '<option value="" disabled selected>-- Pilih Materi --</option>';
  
  const masterMateri = getMasterMateriList() || [];
  masterMateri.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    if (m === materi) opt.selected = true;
    materiSelect.appendChild(opt);
  });
  
  // Pengajar Datalist Input
  const pengajarInput = document.createElement("input");
  pengajarInput.type = "text";
  pengajarInput.className = "pengajar-select";
  pengajarInput.setAttribute("list", "pengajar-datalist");
  pengajarInput.required = true;
  pengajarInput.style.flex = "1";
  pengajarInput.placeholder = "Cari Pengajar...";
  setRowPengajarValue(pengajarInput, pengajarId);
  
  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-icon delete";
  removeBtn.style.padding = "6px 10px";
  removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  removeBtn.onclick = function() {
    div.remove();
  };
  
  div.appendChild(materiSelect);
  div.appendChild(pengajarInput);
  div.appendChild(removeBtn);
  container.appendChild(div);
  
  // Disable if form is read-only
  const isReadOnly = document.getElementById("jadwal-form-jenis").disabled;
  if (isReadOnly) {
    materiSelect.disabled = true;
    pengajarInput.disabled = true;
    removeBtn.style.display = "none";
  }
};

window.onJadwalKelompokChange = function() {
  populatePengajarDatalist();
};

window.saveJadwalPengajianForm = function() {
  const currentUser = getCurrentUser();
  const operatorUsername = currentUser ? currentUser.username : null;
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  
  if (!currentUser || curRoleClean === "user") {
    showToast("Anda tidak memiliki hak akses menyimpan jadwal!", "error");
    return;
  }
  
  const id = document.getElementById("jadwal-form-id").value;
  const tingkat_pengajian = document.getElementById("jadwal-form-tingkat").value;
  const jenis_pengajian = document.getElementById("jadwal-form-jenis").value;
  const tanggal = document.getElementById("jadwal-form-tanggal").value;
  const waktu_mulai = document.getElementById("jadwal-form-waktu-mulai").value;
  const waktu_selesai = document.getElementById("jadwal-form-waktu-selesai").value;
  const kelompok_pengajian = document.getElementById("jadwal-form-kelompok").value;
  
  if (!kelompok_pengajian) {
    showToast("Kelompok pengajian harus diisi!", "warning");
    return;
  }
  
  // Construct materi_pengajar objects
  const materiRows = document.querySelectorAll("#jadwal-materi-pengajar-container .materi-pengajar-row");
  const materi_pengajar = [];
  
  for (const row of materiRows) {
    const materiSelect = row.querySelector(".materi-select");
    const pengajarSelect = row.querySelector(".pengajar-select");
    
    if (materiSelect.value && pengajarSelect.value) {
      const val = pengajarSelect.value;
      const match = val.match(/\((J-\d+)\)/);
      const pId = match ? match[1] : null;
      if (pId) {
        const jObj = getJamaahList().find(j => j.id === pId);
        materi_pengajar.push({
          materi: materiSelect.value,
          pengajar_id: pId,
          pengajar_nama: jObj ? jObj.namaLengkap : "Unknown"
        });
      } else {
        materi_pengajar.push({
          materi: materiSelect.value,
          pengajar_id: val,
          pengajar_nama: val
        });
      }
    }
  }
  
  if (materi_pengajar.length === 0) {
    showToast("Tambahkan minimal satu pasang Materi & Pengajar!", "warning");
    return;
  }
  
  const jadwalData = {
    id: id || null,
    tingkat_pengajian,
    jenis_pengajian,
    tanggal,
    waktu_mulai: waktu_mulai + ":00",
    waktu_selesai: waktu_selesai + ":00",
    materi_pengajar,
    kelompok_pengajian
  };
  
  const saveBtn = document.getElementById("pengajian-jadwal-modal-save-btn");
  const oldText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  
  saveJadwalPengajian(jadwalData, operatorUsername, 
    function(savedItem) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      closeJadwalModal();
      showToast(`Jadwal pengajian ${jenis_pengajian} berhasil disimpan!`, "success");
      renderCalendar();
    },
    function(err) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      showToast("Gagal menyimpan jadwal: " + err.message, "error");
    }
  );
};

function confirmDeleteJadwal(id) {
  if (confirm("Apakah Anda yakin ingin menghapus jadwal pengajian ini? Semua data presensi terkait juga akan dihapus.")) {
    const currentUser = getCurrentUser();
    const operatorUsername = currentUser ? currentUser.username : null;
    
    deleteJadwalPengajian(id, operatorUsername,
      function() {
        closeJadwalModal();
        showToast("Jadwal pengajian berhasil dihapus!", "success");
        renderCalendar();
      },
      function(err) {
        showToast("Gagal menghapus jadwal: " + err.message, "error");
      }
    );
  }
}

// ==========================================
// 3. PRESENSI KEHADIRAN LOGIC
// ==========================================
window.loadPresensiSesiDropdown = function() {
  const select = document.getElementById("presensi-jadwal-select");
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Pilih Sesi Pengajian --</option>';
  
  const schedules = getJadwalPengajianList() || [];
  if (schedules.length === 0) return;
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  let filtered = schedules;
  if (isOperator) {
    filtered = schedules.filter(s => {
      return s.kelompok_pengajian === currentUser.kelompok ||
             s.tingkat_pengajian === "Tingkat Desa" ||
             s.tingkat_pengajian === "Tingkat Daerah";
    });
  }
  
  const filterTingkat = document.getElementById("presensi-filter-tingkat") ? document.getElementById("presensi-filter-tingkat").value : "";
  const filterPeriode = document.getElementById("presensi-filter-periode") ? document.getElementById("presensi-filter-periode").value : "";
  
  if (filterTingkat) {
    filtered = filtered.filter(s => s.tingkat_pengajian === filterTingkat);
  }
  
  if (filterPeriode === "1week") {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    filtered = filtered.filter(s => new Date(s.tanggal) >= oneWeekAgo);
  }
  
  filtered.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    
    const dateStr = formatDateIndo(s.tanggal);
    opt.textContent = `${dateStr} - ${s.jenis_pengajian} [${s.kelompok_pengajian}]`;
    select.appendChild(opt);
  });
};

window.loadPresensiSheet = function() {
  const id = document.getElementById("presensi-jadwal-select").value;
  const infoCard = document.getElementById("presensi-jadwal-info");
  const sheetArea = document.getElementById("presensi-sheet-area");
  
  if (!id) {
    infoCard.style.display = "none";
    sheetArea.style.display = "none";
    return;
  }
  
  const schedules = getJadwalPengajianList() || [];
  const sched = schedules.find(s => s.id == id);
  if (!sched) return;
  
  // Render Info
  infoCard.style.display = "block";
  sheetArea.style.display = "block";
  
  const dateStr = formatDateIndo(sched.tanggal);
  const timeStr = `${sched.waktu_mulai.substring(0, 5)} - ${sched.waktu_selesai.substring(0, 5)}`;
  const materiStr = sched.materi_pengajar.map(m => `<strong>${m.materi}</strong> (Ustadz: ${m.pengajar_nama})`).join(", ");
  
  infoCard.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.88rem; line-height: 1.5;">
      <div><strong>Tingkat:</strong> ${sched.tingkat_pengajian}</div>
      <div><strong>Jenis:</strong> ${sched.jenis_pengajian}</div>
      <div><strong>Waktu:</strong> ${dateStr}, Jam ${timeStr} WIB</div>
      <div><strong>Kelompok Pembuat:</strong> ${sched.kelompok_pengajian}</div>
      <div style="grid-column: span 12; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 5px;">
        <strong>Detail Materi & Pengajar:</strong> ${materiStr}
      </div>
    </div>
  `;
  
  renderPresensiTable(sched);
};

let currentPresensiList = []; // Kept in memory to track changes

function renderPresensiTable(session) {
  const tbody = document.getElementById("presensi-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  const allJamaah = getJamaahList() || [];
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  let targetJamaah = allJamaah;
  if (isOperator) {
    targetJamaah = allJamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
  } else {
    if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
      targetJamaah = allJamaah.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
    }
  }
  
  // Apply automatic filtering based on jenis_pengajian
  const jenis = (session.jenis_pengajian || "").trim().toLowerCase();
  targetJamaah = targetJamaah.filter(j => {
    const peramutan = (j.kelompokPeramutan || "").trim();
    const gender = (j.jenisKelamin || "").trim();
    
    if (jenis === "sambung") {
      return ["Dewasa", "Manula", "GUM"].includes(peramutan);
    } else if (jenis === "5 unsur") {
      return ["Dewasa", "Manula", "GUM"].includes(peramutan);
    } else if (jenis === "gus") {
      return peramutan === "GUS";
    } else if (jenis === "gum") {
      return peramutan === "GUM";
    } else if (jenis === "gabungan gus dan gum") {
      return ["GUS", "GUM"].includes(peramutan);
    } else if (jenis === "caberawit") {
      return ["PAUD", "Caberawit"].includes(peramutan);
    } else if (jenis === "ibu-ibu" || jenis === "ibu - ibu") {
      return ["Dewasa", "Manula"].includes(peramutan) && gender === "Perempuan";
    } else {
      return true;
    }
  });
  
  if (targetJamaah.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada jamaah yang memenuhi kriteria untuk jenis pengajian ini.</td></tr>';
    return;
  }
  
  const presensiDb = getPresensiKehadiranList() || [];
  const sessionPresensi = presensiDb.filter(p => p.id_pengajian == session.id);
  
  currentPresensiList = targetJamaah.map(j => {
    const exist = sessionPresensi.find(p => p.id_jamaah === j.id);
    return {
      id_jamaah: j.id,
      nama: j.namaLengkap,
      gender: j.jenisKelamin,
      peramutan: j.kelompokPeramutan,
      status: exist ? exist.status : "Alpha",
      keterangan: exist ? exist.keterangan || "" : ""
    };
  });
  
  currentPresensiList.sort((a, b) => a.nama.localeCompare(b.nama));
  
  fillPresensiDOM();
}

function fillPresensiDOM() {
  const tbody = document.getElementById("presensi-table-body");
  tbody.innerHTML = "";
  
  const searchQuery = document.getElementById("presensi-search").value.trim().toLowerCase();
  const genderFilter = document.getElementById("presensi-gender-filter").value;
  
  let filtered = currentPresensiList;
  if (searchQuery) filtered = filtered.filter(p => p.nama.toLowerCase().includes(searchQuery));
  if (genderFilter) filtered = filtered.filter(p => p.gender === genderFilter);
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada jamaah yang cocok dengan filter pencarian.</td></tr>';
    return;
  }
  
  filtered.forEach((p, index) => {
    const tr = document.createElement("tr");
    
    const statuses = ["Hadir Fisik", "Online", "Izin", "Alpha"];
    let statusRadioHtml = `<div style="display: flex; gap: 16px; justify-content: center; align-items: center; width: 100%;">`;
    
    statuses.forEach(st => {
      const isChecked = p.status === st;
      const color = st === "Hadir Fisik" ? "#10b981" : st === "Online" ? "#3b82f6" : st === "Izin" ? "#f59e0b" : "#ef4444";
      statusRadioHtml += `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 1rem; cursor: pointer; font-weight: 600;">
          <input type="radio" name="status-${p.id_jamaah}" value="${st}" ${isChecked ? 'checked' : ''} onchange="updatePresensiStatusInMem('${p.id_jamaah}', '${st}')" style="width: 18px; height: 18px; margin: 0; cursor: pointer;">
          <span style="color: ${color};">${st}</span>
        </label>
      `;
    });
    statusRadioHtml += `</div>`;
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${p.nama}</strong><span style="display:block; font-size:0.75rem; color:var(--text-secondary);">${p.id_jamaah}</span></td>
      <td>${p.gender === "Laki-laki" ? "L" : "P"}</td>
      <td><span class="status-badge status-active" style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); border: 1px solid var(--border-color);">${p.peramutan}</span></td>
      <td>${statusRadioHtml}</td>
      <td><input type="text" value="${p.keterangan}" class="form-control" style="width: 100%; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px;" placeholder="Isi alasan..." onchange="updatePresensiKetInMem('${p.id_jamaah}', this.value)"></td>
    `;
    
    tbody.appendChild(tr);
  });
}

window.updatePresensiStatusInMem = function(jamaahId, status) {
  const item = currentPresensiList.find(x => x.id_jamaah === jamaahId);
  if (item) item.status = status;
};

window.updatePresensiKetInMem = function(jamaahId, val) {
  const item = currentPresensiList.find(x => x.id_jamaah === jamaahId);
  if (item) item.keterangan = val;
};

window.filterPresensiTable = function() {
  fillPresensiDOM();
};

window.submitPresensiKehadiran = function() {
  const currentUser = getCurrentUser();
  const operatorUsername = currentUser ? currentUser.username : null;
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  
  if (!currentUser || curRoleClean === "user") {
    showToast("Anda tidak memiliki hak akses untuk menyimpan presensi!", "error");
    return;
  }
  
  const id_pengajian = document.getElementById("presensi-jadwal-select").value;
  if (!id_pengajian) return;
  
  const dataToSubmit = currentPresensiList.map(p => ({
    id_pengajian: id_pengajian,
    id_jamaah: p.id_jamaah,
    status: p.status,
    keterangan: p.keterangan
  }));
  
  const saveBtn = document.getElementById("btn-save-presensi");
  const oldText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Presensi...';
  
  savePresensiKehadiran(id_pengajian, dataToSubmit, operatorUsername,
    function() {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      showToast("Presensi pengajian berhasil disimpan!", "success");
      fetchDatabaseFromServer(function() {
        loadPresensiSheet();
      });
    },
    function(err) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldText;
      showToast("Gagal menyimpan presensi: " + err.message, "error");
    }
  );
};

// ==========================================
// 4. MONITORING KEHADIRAN LOGIC
// ==========================================
function initMonitoringFilters() {
  const selectKelompok = document.getElementById("monitor-kelompok");
  const selectJenis = document.getElementById("monitor-jenis");
  
  if (selectKelompok && selectKelompok.children.length === 0) {
    selectKelompok.innerHTML = "";
    
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    const isOperator = curRoleClean === "operator kelompok";
    
    if (isOperator) {
      const opt = document.createElement("option");
      opt.value = currentUser.kelompok;
      opt.textContent = currentUser.kelompok;
      opt.selected = true;
      selectKelompok.appendChild(opt);
      selectKelompok.disabled = true;
    } else {
      selectKelompok.disabled = false;
      const defOpt = document.createElement("option");
      defOpt.value = "";
      defOpt.textContent = "Semua Kelompok";
      defOpt.selected = true;
      selectKelompok.appendChild(defOpt);
      
      const groups = getMasterKelompokList() || [];
      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        selectKelompok.appendChild(opt);
      });
    }
  }

  if (selectJenis && selectJenis.children.length <= 1) {
    const currentVal = selectJenis.value;
    selectJenis.innerHTML = '<option value="">Semua Jenis Pengajian</option>';
    const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
    list.forEach(item => {
      const opt = document.createElement("option");
      const val = typeof item === 'object' ? item.nama : item;
      opt.value = val;
      opt.textContent = val;
      selectJenis.appendChild(opt);
    });
    if (currentVal) {
      selectJenis.value = currentVal;
    }
  }
}

window.calculateAndRenderMonitoring = function(isSesiChange = false) {
  initMonitoringFilters();
  
  const filterTingkat = document.getElementById("monitor-tingkat").value;
  const filterJenis = document.getElementById("monitor-jenis").value;
  const filterPeriod = document.getElementById("monitor-periode").value;
  
  const schedules = getJadwalPengajianList() || [];
  const presensiDb = getPresensiKehadiranList() || [];
  const jamaah = getJamaahList() || [];
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  // Filter schedules by tingkat, jenis, period
  let periodSchedules = schedules;
  if (filterTingkat) {
    periodSchedules = periodSchedules.filter(s => s.tingkat_pengajian === filterTingkat);
  }
  if (filterJenis) {
    periodSchedules = periodSchedules.filter(s => s.jenis_pengajian === filterJenis);
  }
  
  // Time period filter
  const today = new Date();
  if (filterPeriod === "weekly") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    periodSchedules = periodSchedules.filter(s => new Date(s.tanggal) >= sevenDaysAgo);
  } else if (filterPeriod === "monthly") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    periodSchedules = periodSchedules.filter(s => new Date(s.tanggal) >= thirtyDaysAgo);
  }
  
  // Update session filter select options if not triggered by it
  const sesiSelect = document.getElementById("monitor-sesi");
  if (!isSesiChange && sesiSelect) {
    const currentVal = sesiSelect.value;
    sesiSelect.innerHTML = '<option value="">Semua Sesi</option>';
    periodSchedules.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.jenis_pengajian} - ${formatDateIndo(s.tanggal)} (${s.kelompok_pengajian})`;
      sesiSelect.appendChild(opt);
    });
    if (periodSchedules.some(s => s.id == currentVal)) {
      sesiSelect.value = currentVal;
    } else {
      sesiSelect.value = "";
    }
  }
  
  const selectedSesiId = sesiSelect ? sesiSelect.value : "";
  let filteredSchedules = periodSchedules;
  if (selectedSesiId) {
    filteredSchedules = periodSchedules.filter(s => s.id == selectedSesiId);
  }
  
  const totalSesi = filteredSchedules.length;
  document.getElementById("monitor-total-sesi").textContent = totalSesi;
  
  if (totalSesi === 0) {
    document.getElementById("monitor-avg-kehadiran").textContent = "0%";
    document.getElementById("monitor-stat-fisik-val").textContent = "0 (0%)";
    document.getElementById("monitor-stat-online-val").textContent = "0 (0%)";
    document.getElementById("monitor-stat-izin-val").textContent = "0 (0%)";
    document.getElementById("monitor-stat-alpha-val").textContent = "0 (0%)";
    document.getElementById("monitor-pb-fisik").style.width = "0%";
    document.getElementById("monitor-pb-online").style.width = "0%";
    document.getElementById("monitor-pb-izin").style.width = "0%";
    document.getElementById("monitor-pb-alpha").style.width = "0%";
    document.getElementById("monitor-gender-l-val").textContent = "0 (0%)";
    document.getElementById("monitor-gender-p-val").textContent = "0 (0%)";
    document.getElementById("monitor-pb-gender-l").style.width = "0%";
    document.getElementById("monitor-pb-gender-p").style.width = "0%";
    
    const tbody = document.getElementById("monitor-table-body");
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Belum ada data sesi pengajian.</td></tr>';
    return;
  }
  
  // Gather active presensi records and compute overall statistics
  const targetJamaahForStats = isOperator ? jamaah.filter(j => j.kelompokPengajian === currentUser.kelompok) : jamaah;

  // Build a lookup map for presensi
  const presensiMap = {};
  presensiDb.forEach(p => {
    presensiMap[`${p.id_pengajian}_${p.id_jamaah}`] = p.status;
  });

  // Kehadiran Stats
  let countFisik = 0;
  let countOnline = 0;
  let countIzin = 0;
  let countAlpha = 0;
  let grandTotal = 0;

  // Keaktifan per Gender
  let totalMaleMarked = 0;
  let presentMaleMarked = 0;
  let totalFemaleMarked = 0;
  let presentFemaleMarked = 0;

  filteredSchedules.forEach(s => {
    const jenis = s.jenis_pengajian || "";
    targetJamaahForStats.forEach(j => {
      if (isJamaahEligibleForJenis(j, jenis)) {
        const inKelompok = s.tingkat_pengajian === "Tingkat Desa" ||
                           s.tingkat_pengajian === "Tingkat Daerah" ||
                           s.kelompok_pengajian === j.kelompokPengajian;
        if (inKelompok) {
          grandTotal++;
          const status = presensiMap[`${s.id}_${j.id}`] || "Alpha";

          if (status === "Hadir Fisik") countFisik++;
          else if (status === "Online") countOnline++;
          else if (status === "Izin") countIzin++;
          else if (status === "Alpha") countAlpha++;

          if (j.jenisKelamin === "Laki-laki") {
            totalMaleMarked++;
            if (status === "Hadir Fisik" || status === "Online") presentMaleMarked++;
          } else if (j.jenisKelamin === "Perempuan") {
            totalFemaleMarked++;
            if (status === "Hadir Fisik" || status === "Online") presentFemaleMarked++;
          }
        }
      }
    });
  });

  const pctFisik = grandTotal > 0 ? Math.round((countFisik / grandTotal) * 100) : 0;
  const pctOnline = grandTotal > 0 ? Math.round((countOnline / grandTotal) * 100) : 0;
  const pctIzin = grandTotal > 0 ? Math.round((countIzin / grandTotal) * 100) : 0;
  const pctAlpha = grandTotal > 0 ? Math.round((countAlpha / grandTotal) * 100) : 0;
  
  // Avg presence (Fisik + Online)
  const totalPresence = countFisik + countOnline;
  const avgKehadiran = grandTotal > 0 ? Math.round((totalPresence / grandTotal) * 100) : 0;
  
  document.getElementById("monitor-avg-kehadiran").textContent = avgKehadiran + "%";
  
  document.getElementById("monitor-stat-fisik-val").textContent = `${countFisik} (${pctFisik}%)`;
  document.getElementById("monitor-stat-online-val").textContent = `${countOnline} (${pctOnline}%)`;
  document.getElementById("monitor-stat-izin-val").textContent = `${countIzin} (${pctIzin}%)`;
  document.getElementById("monitor-stat-alpha-val").textContent = `${countAlpha} (${pctAlpha}%)`;
  
  document.getElementById("monitor-pb-fisik").style.width = pctFisik + "%";
  document.getElementById("monitor-pb-online").style.width = pctOnline + "%";
  document.getElementById("monitor-pb-izin").style.width = pctIzin + "%";
  document.getElementById("monitor-pb-alpha").style.width = pctAlpha + "%";
  
  const pctGenderL = totalMaleMarked > 0 ? Math.round((presentMaleMarked / totalMaleMarked) * 100) : 0;
  const pctGenderP = totalFemaleMarked > 0 ? Math.round((presentFemaleMarked / totalFemaleMarked) * 100) : 0;
  
  document.getElementById("monitor-gender-l-val").textContent = `${presentMaleMarked}/${totalMaleMarked} (${pctGenderL}%)`;
  document.getElementById("monitor-gender-p-val").textContent = `${presentFemaleMarked}/${totalFemaleMarked} (${pctGenderP}%)`;
  
  document.getElementById("monitor-pb-gender-l").style.width = pctGenderL + "%";
  document.getElementById("monitor-pb-gender-p").style.width = pctGenderP + "%";
  
  // Render Individual keaktifan table
  renderIndividualMonitoringTable(filteredSchedules, presensiMap);
};

let currentMonitoringTableData = [];

// Helper: returns list of kelompok_peramutan that are eligible for a given jenis_pengajian
function getEligiblePeramutanForJenis(jenis) {
  const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
  
  // Special cases override
  if (jClean === "ibu-ibu" || jClean === "ibu--ibu" || jClean === "ibuibu") {
    return ["Dewasa", "Manula"];
  }
  if (jClean === "kewanitaan") {
    return ["Dewasa", "Manula", "GUS", "GUM"];
  }
  
  // Dynamic lookup
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  const match = list.find(item => {
    const name = typeof item === 'object' ? item.nama : item;
    return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
  });
  
  if (match && typeof match === 'object' && match.peserta_pengajian) {
    return match.peserta_pengajian.split(",").map(p => p.trim()).filter(Boolean);
  }
  
  // Fallback to static mapping if not found dynamically
  if (jClean === "sambung" || jClean === "5unsur") {
    return ["Dewasa", "Manula", "GUM"];
  } else if (jClean === "gus") {
    return ["GUS"];
  } else if (jClean === "gum") {
    return ["GUM"];
  } else if (jClean === "gabungangusdangum") {
    return ["GUS", "GUM"];
  } else if (jClean === "caberawit") {
    return ["PAUD", "Caberawit"];
  } else if (jClean === "teks" || jClean === "turbadesa" || jClean === "turbadaerah") {
    return ["Dewasa", "Manula", "GUM", "GUS"];
  }
  
  return null; // no restriction
}

// Returns true if jamaah j is eligible to attend a session with given jenis_pengajian
function isJamaahEligibleForJenis(j, jenis) {
  const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
  
  // Gender restriction for Ibu-ibu & Kewanitaan
  if (jClean === "ibu-ibu" || jClean === "ibu--ibu" || jClean === "ibuibu" || jClean === "kewanitaan") {
    if ((j.jenisKelamin || "").trim() !== "Perempuan") {
      return false;
    }
  }
  
  const allowedPeramutan = getEligiblePeramutanForJenis(jenis);
  if (allowedPeramutan === null) return true; // no restriction
  
  const peramutan = (j.kelompokPeramutan || "").trim().toLowerCase();
  return allowedPeramutan.some(p => p.toLowerCase() === peramutan);
}

function renderIndividualMonitoringTable(filteredSchedules, presensiMap) {
  const jamaah = getJamaahList() || [];
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok";
  
  // Full jamaah list (optionally filtered by operator's kelompok)
  let targetJamaah = jamaah;
  if (isOperator) {
    targetJamaah = jamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
  }
  
  const filterJenis = document.getElementById("monitor-jenis") ? document.getElementById("monitor-jenis").value : "";
  
  // Only include jamaah relevant to filterJenis or at least one session in the schedules
  let displayJamaah = targetJamaah;
  if (filterJenis) {
    displayJamaah = targetJamaah.filter(j => isJamaahEligibleForJenis(j, filterJenis));
  } else {
    const relevantJamaahIds = new Set();
    filteredSchedules.forEach(s => {
      const jenis = s.jenis_pengajian || "";
      targetJamaah.forEach(j => {
        if (isJamaahEligibleForJenis(j, jenis)) {
          // Eligible for this session's kelompok too
          const inKelompok = s.tingkat_pengajian === "Tingkat Desa" ||
                             s.tingkat_pengajian === "Tingkat Daerah" ||
                             s.kelompok_pengajian === j.kelompokPengajian;
          if (inKelompok) relevantJamaahIds.add(j.id);
        }
      });
    });
    displayJamaah = targetJamaah.filter(j => relevantJamaahIds.size === 0 || relevantJamaahIds.has(j.id));
  }
  
  currentMonitoringTableData = displayJamaah.map(j => {
    // Total sessions this jamaah was eligible to attend
    const relevantSessions = filteredSchedules.filter(s => {
      const inKelompok = s.tingkat_pengajian === "Tingkat Desa" ||
                         s.tingkat_pengajian === "Tingkat Daerah" ||
                         s.kelompok_pengajian === j.kelompokPengajian;
      return inKelompok && isJamaahEligibleForJenis(j, s.jenis_pengajian);
    });
    
    const jTotalSesi = relevantSessions.length;
    
    let fisik = 0;
    let online = 0;
    let izin = 0;
    let alpha = 0;
    
    relevantSessions.forEach(s => {
      const status = presensiMap[`${s.id}_${j.id}`] || "Alpha";
      if (status === "Hadir Fisik") fisik++;
      else if (status === "Online") online++;
      else if (status === "Izin") izin++;
      else if (status === "Alpha") alpha++;
    });
    
    const attended = fisik + online;
    const pct = jTotalSesi > 0 ? Math.round((attended / jTotalSesi) * 100) : 0;
    
    return {
      id: j.id,
      nama: j.namaLengkap,
      peramutan: j.kelompokPeramutan,
      kelompokPengajian: j.kelompokPengajian,
      totalSesi: jTotalSesi,
      fisik,
      online,
      izin,
      alpha,
      pct
    };
  });
  
  currentMonitoringTableData.sort((a, b) => b.pct - a.pct);
  
  fillMonitoringDOM();
}

function fillMonitoringDOM() {
  const tbody = document.getElementById("monitor-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const search = document.getElementById("monitor-search").value.trim().toLowerCase();
  const filterKelompok = document.getElementById("monitor-kelompok") ? document.getElementById("monitor-kelompok").value : "";
  
  let filtered = currentMonitoringTableData;
  if (search) {
    filtered = filtered.filter(p => p.nama.toLowerCase().includes(search));
  }
  if (filterKelompok) {
    filtered = filtered.filter(p => p.kelompokPengajian === filterKelompok);
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada data keaktifan jamaah ditemukan.</td></tr>';
    return;
  }
  
  filtered.forEach((p, index) => {
    const tr = document.createElement("tr");
    
    let pctColor = "#ef4444";
    if (p.pct >= 80) pctColor = "#10b981";
    else if (p.pct >= 50) pctColor = "#f59e0b";
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${p.nama}</strong><span style="display:block; font-size:0.75rem; color:var(--text-secondary);">${p.id}</span></td>
      <td><span class="status-badge status-active" style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); border: 1px solid var(--border-color);">${p.peramutan}</span></td>
      <td style="text-align: center;">${p.totalSesi} Sesi</td>
      <td style="text-align: center; color:#10b981; font-weight: 600;">${p.fisik}</td>
      <td style="text-align: center; color:#3b82f6; font-weight: 600;">${p.online}</td>
      <td style="text-align: center; color:#f59e0b; font-weight: 600;">${p.izin}</td>
      <td style="text-align: center; color:#ef4444; font-weight: 600;">${p.alpha}</td>
      <td style="text-align: center;">
        <div style="font-weight: 800; color: ${pctColor};">${p.pct}%</div>
        <div class="progress-container" style="height: 4px; margin-top: 5px; background: rgba(255,255,255,0.05);"><div class="progress-bar" style="width: ${p.pct}%; background: ${pctColor};"></div></div>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

window.filterMonitoringTable = function() {
  fillMonitoringDOM();
};

// --- END FILE: js/pengajian.js ---
