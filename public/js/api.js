// SUPABASE DATABASE CONNECTOR & ADAPTER (v2.1 Serverless)
    // ----------------------------------------------------
    let useSupabase = false;
    let supabaseUrl = "";
    let supabaseKey = "";
    let supabaseClient = null;
    const nativeGoogle = typeof google !== "undefined" ? google : null;

    function initDatabaseConnection() {
      // Automatically connect using localStorage or hardcoded fallback
      if (localStorage.getItem("aji_supabase_url") === "https://aji-mobile-one.vercel.app") {
        localStorage.removeItem("aji_supabase_url");
      }
      supabaseUrl = localStorage.getItem("aji_supabase_url") || "https://mphxkqcvcmdqafrslwti.supabase.co";
      supabaseKey = localStorage.getItem("aji_supabase_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHhrcWN2Y21kcWFmcnNsd3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjQ3NTQsImV4cCI6MjA5NjY0MDc1NH0.o2QXxuhTFwjG1RgAjBSd6JBApjtgdCE6bjTUfnWNET8";
      
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
        supabaseClient.from("master_jenis_pengajian").select("*").then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("master_peserta_pengajian").select("*").then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("master_grup_kustom").select("*").then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("master_tempat_kegiatan").select("*").then(res => res, err => ({ data: [], error: err }))
      ]).then(([resJamaah, resUsers, resKelompok, resPendidikan, resPekerjaan, resDapuan, resLogs, resMateri, resJadwal, resPresensi, resMasterPengajar, resJenisPengajian, resPesertaPengajian, resGrupKustom, resTempatKegiatan]) => {
        if (resJamaah.error) throw resJamaah.error;
        if (resUsers.error) throw resUsers.error;
        
        const rawKelompok = (resKelompok.data || []).map(r => r.nama);
        const rawPendidikan = (resPendidikan.data || []).map(r => r.nama);
        const rawDapuan = (resDapuan.data || []).map(r => r.nama);
        const rawPekerjaan = (resPekerjaan.data || []).map(r => r.nama);
        const rawHubungan = ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"];
        
        const rawMateri = (resMateri.data || []).map(r => r.nama);
        const rawJenisPengajian = (resJenisPengajian.data || []).map(r => ({
          nama: r.nama,
          peserta_pengajian: r.peserta_pengajian || "",
          batasan_gender: r.batasan_gender || "Semua",
          target_dapuan: r.target_dapuan || ""
        }));
        const rawPesertaPengajian = (resPesertaPengajian.data || []).map(r => ({
          id_peserta: r.id_peserta,
          nama: r.nama
        }));
        const rawGrupKustom = (resGrupKustom.data || []).map(r => ({
          nama: r.nama,
          deskripsi: r.deskripsi || "",
          daftar_id_anggota: r.daftar_id_anggota || ""
        }));
        const rawTempatKegiatan = (resTempatKegiatan.data || []).map(r => r.nama);
        
        const jadwalList = (resJadwal.data || []).map(j => ({
          id: j.id,
          tingkat_pengajian: j.tingkat_pengajian,
          jenis_pengajian: j.jenis_pengajian,
          tanggal: j.tanggal,
          waktu_mulai: j.waktu_mulai,
          waktu_selesai: j.waktu_selesai,
          materi_pengajar: typeof j.materi_pengajar === 'string' ? JSON.parse(j.materi_pengajar) : (j.materi_pengajar || []),
          kelompok_pengajian: j.kelompok_pengajian,
          peserta_spesifik: j.peserta_spesifik || "",
          lokasi: j.lokasi || ""
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
          kelancaranSambung: j.kelancaran_sambung,
          fotoUrl: j.foto_url || ""
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
        const isKelompokRestricted = userObj && (userObj.role.trim().toLowerCase() === "operator kelompok" || userObj.role.trim().toLowerCase() === "pengurus kelompok");
        if (isKelompokRestricted) {
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
            kepalaKeluargaId: j.kepala_keluarga_id,
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
          masterPesertaPengajian: rawPesertaPengajian,
          masterGrupKustom: rawGrupKustom,
          masterTempatKegiatan: rawTempatKegiatan.map(n => ({ nama: n })),
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
            const u = data[0];
            // Tolak login jika akun masih pending approval
            if ((u.status || 'active') === 'pending') {
              return { success: false, pending: true };
            }
            supabaseLogAction(u.username, "LOGIN", "Pengguna " + u.username + " dengan role " + u.role + " (" + u.kelompok + ") login ke Web App (Supabase).");
            return {
              success: true,
              user: {
                username: u.username,
                email: u.email || '',
                role: u.role,
                kelompok: u.kelompok,
                jamaah_id: u.jamaah_id || null,
                status: u.status || 'active'
              }
            };
          }
          return { success: false };
        });
    }

    // --- PORTAL JAMAAH: REGISTRASI (DROPDOWN / LINKED) ---
    function supabaseRegisterJamaahLinked(regData) {
      // Cek username tidak duplikat
      return supabaseClient.from("app_users").select("username").eq("username", regData.username)
        .then(({ data, error }) => {
          if (error) throw error;
          if (data && data.length > 0) return { success: false, reason: 'username_taken' };
          const payload = {
            username: regData.username,
            email: regData.email || (regData.username + '@jamaah.aji'),
            role: 'jamaah',
            password_hash: regData.passwordHash,
            kelompok: regData.kelompok || '',
            jamaah_id: regData.jamaah_id,
            status: 'active'
          };
          return supabaseClient.from("app_users").insert([payload]).then(({ error: e2 }) => {
            if (e2) throw e2;
            supabaseLogAction(regData.username, "REGISTER", "Jamaah " + regData.namaLengkap + " mendaftar akun (linked, id=" + regData.jamaah_id + ").");
            return { success: true };
          });
        });
    }

    // --- PORTAL JAMAAH: REGISTRASI BARU (FORM LENGKAP, PENDING) ---
    function supabaseRegisterJamaahNew(regData) {
      // Cek username tidak duplikat
      return supabaseClient.from("app_users").select("username").eq("username", regData.username)
        .then(({ data, error }) => {
          if (error) throw error;
          if (data && data.length > 0) return { success: false, reason: 'username_taken' };
          // Generate ID jamaah baru
          return supabaseClient.from("jamaah").select("id").then(({ data: jData }) => {
            let maxIdNum = 0;
            (jData || []).forEach(j => {
              if (j.id && j.id.indexOf("J-") === 0) {
                const num = parseInt(j.id.replace("J-", ""));
                if (num > maxIdNum) maxIdNum = num;
              }
            });
            const newJamaahId = "J-" + String(maxIdNum + 1).padStart(3, '0');
            // Insert jamaah baru
            const jamaahPayload = {
              id: newJamaahId,
              nama_lengkap: regData.namaLengkap,
              kelompok_pengajian: regData.kelompok,
              jenis_kelamin: regData.jenisKelamin || '',
              tempat_lahir: regData.tempatLahir || '',
              tanggal_lahir: regData.tanggalLahir || null,
              status_pernikahan: regData.statusPernikahan || '',
              status_hubungan_keluarga: regData.statusHubunganKeluarga || 'Kepala Keluarga',
              kepala_keluarga_id: null,
              nomor_hp: regData.nomorHp || null,
              tingkat_pendidikan: regData.tingkatPendidikan || '',
              pekerjaan_utama: regData.pekerjaanUtama || '',
              dapuan: regData.dapuan || 'Rokyah biasa',
              status_ekonomi: regData.statusEkonomi || '',
              kelancaran_sambung: regData.kelancaranSambung || '',
              foto_url: regData.fotoUrl || null
            };
            return supabaseClient.from("jamaah").insert([jamaahPayload]).then(({ error: e2 }) => {
              if (e2) throw e2;
              // Insert user baru dengan status pending
              const userPayload = {
                username: regData.username,
                email: regData.email || (regData.username + '@jamaah.aji'),
                role: 'jamaah',
                password_hash: regData.passwordHash,
                kelompok: regData.kelompok || '',
                jamaah_id: newJamaahId,
                status: 'pending'
              };
              return supabaseClient.from("app_users").insert([userPayload]).then(({ error: e3 }) => {
                if (e3) throw e3;
                supabaseLogAction('SYSTEM', "REGISTER_PENDING", "Pendaftaran jamaah baru: " + regData.namaLengkap + " (" + regData.username + ") menunggu persetujuan kelompok " + regData.kelompok + ".");
                return { success: true, pending: true };
              });
            });
          });
        });
    }

    // --- PORTAL JAMAAH: AMBIL DAFTAR PENDING ---
    function supabaseGetPendingUsers(operatorKelompok) {
      let query = supabaseClient.from("app_users").select("*").eq("status", "pending");
      return query.then(({ data, error }) => {
        if (error) throw error;
        let results = (data || []);
        // Filter per kelompok untuk operator kelompok
        if (operatorKelompok && operatorKelompok !== 'Semua') {
          results = results.filter(u => u.kelompok === operatorKelompok);
        }
        return results.map(u => ({
          username: u.username,
          email: u.email,
          kelompok: u.kelompok,
          jamaah_id: u.jamaah_id,
          created_at: u.created_at || ''
        }));
      });
    }

    // --- PORTAL JAMAAH: SETUJUI AKUN ---
    function supabaseApproveUser(username, operatorUsername) {
      return supabaseClient.from("app_users").update({ status: 'active' }).eq("username", username)
        .then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "APPROVE_USER", "Menyetujui akun jamaah: " + username);
          return true;
        });
    }

    // --- PORTAL JAMAAH: TOLAK/HAPUS AKUN PENDING ---
    function supabaseRejectUser(username, operatorUsername) {
      // Dapatkan jamaah_id dulu, lalu hapus akun + data jamaah jika baru
      return supabaseClient.from("app_users").select("*").eq("username", username).eq("status", "pending")
        .then(({ data, error }) => {
          if (error) throw error;
          const u = data && data[0];
          const jamaahId = u ? u.jamaah_id : null;
          return supabaseClient.from("app_users").delete().eq("username", username).then(({ error: e2 }) => {
            if (e2) throw e2;
            if (jamaahId) {
              // Hapus data jamaah yang dibuat saat pendaftaran baru
              return supabaseClient.from("jamaah").delete().eq("id", jamaahId).then(() => {
                supabaseLogAction(operatorUsername, "REJECT_USER", "Menolak akun jamaah: " + username + " (data jamaah " + jamaahId + " dihapus).");
                return true;
              });
            }
            supabaseLogAction(operatorUsername, "REJECT_USER", "Menolak akun jamaah: " + username);
            return true;
          });
        });
    }

    // --- PORTAL JAMAAH: SELF CHECK-IN ---
    function supabaseSelfCheckIn(idPengajian, idJamaah, status, keterangan, jamaahUsername) {
      if (!status || status === 'Alpha') {
        return supabaseClient.from("pengajian_presensi")
          .delete().eq("id_pengajian", parseInt(idPengajian)).eq("id_jamaah", idJamaah)
          .then(({ error }) => {
            if (error) throw error;
            return true;
          });
      }
      const payload = {
        id_pengajian: parseInt(idPengajian),
        id_jamaah: idJamaah,
        status: status,
        keterangan: keterangan || ''
      };
      return supabaseClient.from("pengajian_presensi")
        .upsert(payload, { onConflict: "id_pengajian,id_jamaah" })
        .then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(jamaahUsername || idJamaah, "SELF_CHECKIN", "Self check-in jamaah " + idJamaah + " untuk sesi " + idPengajian + ": " + status);
          return true;
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
          kelancaran_sambung: jamaahData.kelancaranSambung,
          foto_url: jamaahData.fotoUrl || null
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

    function supabaseUploadPhotoToDrive(fileBase64, fileName) {
      if (!useSupabase) {
        return Promise.resolve("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150");
      }
      return supabaseClient.functions.invoke('upload-foto-drive', {
        body: {
          fileName: fileName,
          fileBase64: fileBase64,
          folderId: '1md8CWZ5FSjKlwAe9CrAPN8vJ71jD4osV'
        }
      }).then(async ({ data, error }) => {
        if (error) {
          console.error("Functions Error Object:", error);
          // Try to read error body if available in context
          if (error.context && typeof error.context.json === 'function') {
            try {
              const errJson = await error.context.json();
              if (errJson && errJson.error) {
                throw new Error(errJson.error);
              }
            } catch (e) {}
          }
          throw new Error(error.message || "Edge Function returned a non-2xx status code");
        }
        if (data && data.url) {
          return data.url;
        }
      });
    }
    window.supabaseUploadPhotoToDrive = supabaseUploadPhotoToDrive;

    function supabaseDeletePhotoFromDrive(fotoUrl) {
      if (!useSupabase || !fotoUrl) return Promise.resolve(true);
      const match = fotoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (!match) return Promise.resolve(true);
      const fileId = match[1];
      return supabaseClient.functions.invoke('upload-foto-drive', {
        body: {
          action: 'delete',
          fileId: fileId
        }
      }).then(({ data, error }) => {
        if (error) {
          console.warn("Gagal menghapus file dari Google Drive:", error);
          return false;
        }
        return true;
      }).catch(err => {
        console.warn("Gagal menghapus file dari Google Drive:", err);
        return false;
      });
    }
    window.supabaseDeletePhotoFromDrive = supabaseDeletePhotoFromDrive;

    function supabaseDeleteJamaah(id, operatorUsername) {
      return supabaseClient.from("jamaah").select("nama_lengkap, foto_url").eq("id", id).then(({ data }) => {
        const item = data && data[0];
        const nama = item ? item.nama_lengkap : id;
        const fotoUrl = item ? item.foto_url : null;
        
        return supabaseClient.from("app_users").delete().eq("jamaah_id", id).then(() => {
          return supabaseDeletePhotoFromDrive(fotoUrl).then(() => {
            return supabaseClient.from("jamaah").delete().eq("id", id).then(({ error }) => {
              if (error) throw error;
              supabaseLogAction(operatorUsername, "DELETE", "Menghapus Jamaah " + nama + " (" + id + ") beserta akun user & foto Drive.");
              return true;
            });
          });
        });
      });
    }

    function supabaseSaveMasterItem(tableName, oldName, newName, operatorUsername, peserta, gender, dapuan) {
      if (tableName === "Jenis Kegiatan") tableName = "Jenis Pengajian";
      if (tableName === "Materi Kegiatan") tableName = "Materi Pengajian";
      if (tableName === "Peserta Kegiatan") tableName = "Peserta Pengajian";
      const pgTable = tableName === "Kelompok" ? "master_kelompok" :
                      tableName === "Tingkat Pendidikan" ? "master_pendidikan" :
                      tableName === "Pekerjaan" ? "master_pekerjaan" :
                      tableName === "Dapuan" ? "master_dapuan" :
                      tableName === "Status Hubungan Keluarga" ? "master_hubungan" :
                      tableName === "Materi Pengajian" ? "master_materi_pengajian" :
                      tableName === "Jenis Pengajian" ? "master_jenis_pengajian" :
                      tableName === "Grup Kustom" ? "master_grup_kustom" :
                      tableName === "Peserta Pengajian" ? "master_peserta_pengajian" :
                      tableName === "Tempat Kegiatan" ? "master_tempat_kegiatan" : "";
      
      if (!pgTable) return Promise.reject(new Error("Tabel master tidak valid"));
      
      const keyCol = tableName === "Peserta Pengajian" ? "id_peserta" : "nama";
      const payload = { nama: newName };
      
      if (tableName === "Jenis Pengajian") {
        payload.peserta_pengajian = peserta || "";
        payload.batasan_gender = gender || "Semua";
        payload.target_dapuan = dapuan || "";
      } else if (tableName === "Grup Kustom") {
        payload.deskripsi = peserta || "";
        payload.daftar_id_anggota = gender || "";
      }
      
      if (oldName) {
        return supabaseClient.from(pgTable).update(payload).eq(keyCol, oldName).then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "UPDATE_MASTER", "Mengubah opsi di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
          return true;
        });
      } else {
        if (tableName === "Peserta Pengajian") {
          return supabaseClient.from(pgTable).select("id_peserta").then(({ data }) => {
            let maxId = 0;
            (data || []).forEach(x => {
              const num = parseInt(x.id_peserta.replace("P-", ""));
              if (num > maxId) maxId = num;
            });
            payload.id_peserta = "P-" + String(maxId + 1).padStart(3, '0');
            return supabaseClient.from(pgTable).insert(payload);
          }).then(({ error }) => {
            if (error) throw error;
            supabaseLogAction(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
            return true;
          });
        }
        return supabaseClient.from(pgTable).insert(payload).then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
          return true;
        });
      }
    }

    function supabaseDeleteMasterItem(tableName, name, operatorUsername) {
      if (tableName === "Jenis Kegiatan") tableName = "Jenis Pengajian";
      if (tableName === "Materi Kegiatan") tableName = "Materi Pengajian";
      if (tableName === "Peserta Kegiatan") tableName = "Peserta Pengajian";
      const pgTable = tableName === "Kelompok" ? "master_kelompok" :
                      tableName === "Tingkat Pendidikan" ? "master_pendidikan" :
                      tableName === "Pekerjaan" ? "master_pekerjaan" :
                      tableName === "Dapuan" ? "master_dapuan" :
                      tableName === "Status Hubungan Keluarga" ? "master_hubungan" :
                      tableName === "Materi Pengajian" ? "master_materi_pengajian" :
                      tableName === "Jenis Pengajian" ? "master_jenis_pengajian" :
                      tableName === "Grup Kustom" ? "master_grup_kustom" :
                      tableName === "Peserta Pengajian" ? "master_peserta_pengajian" :
                      tableName === "Tempat Kegiatan" ? "master_tempat_kegiatan" : "";
      
      if (!pgTable) return Promise.reject(new Error("Tabel master tidak valid"));
      
      const keyCol = tableName === "Peserta Pengajian" ? "id_peserta" : "nama";
      
      return supabaseClient.from(pgTable).delete().eq(keyCol, name).then(({ error }) => {
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
        kelompok_pengajian: jadwalData.kelompok_pengajian,
        peserta_spesifik: jadwalData.peserta_spesifik || ""
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
        if (savedData) {
          savedData.peserta_spesifik = savedData.peserta_spesifik || "";
        }
        supabaseLogAction(operatorUsername, isEdit ? "UPDATE" : "CREATE", (isEdit ? "Memperbarui" : "Membuat") + " jadwal kegiatan: " + jadwalData.jenis_pengajian + " pada " + jadwalData.tanggal);
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
        if (!p.status || p.status === "Alpha") {
          return supabaseClient.from("pengajian_presensi")
            .delete()
            .eq("id_pengajian", parseInt(idPengajian))
            .eq("id_jamaah", p.id_jamaah);
        } else {
          const payload = {
            id_pengajian: parseInt(idPengajian),
            id_jamaah: p.id_jamaah,
            status: p.status,
            keterangan: p.keterangan || ""
          };
          return supabaseClient.from("pengajian_presensi")
            .upsert(payload, { onConflict: "id_pengajian,id_jamaah" });
        }
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
          saveMasterItemGAS: function(tableName, oldName, newName, operatorUsername, peserta, gender, dapuan) {
            this._call(() => supabaseSaveMasterItem(tableName, oldName, newName, operatorUsername, peserta, gender, dapuan));
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
          },
          registerJamaahLinkedGAS: function(regData) {
            this._call(() => supabaseRegisterJamaahLinked(regData));
            return this;
          },
          registerJamaahNewGAS: function(regData) {
            this._call(() => supabaseRegisterJamaahNew(regData));
            return this;
          },
          getPendingUsersGAS: function(operatorKelompok) {
            this._call(() => supabaseGetPendingUsers(operatorKelompok));
            return this;
          },
          approveUserGAS: function(username, operatorUsername) {
            this._call(() => supabaseApproveUser(username, operatorUsername));
            return this;
          },
          rejectUserGAS: function(username, operatorUsername) {
            this._call(() => supabaseRejectUser(username, operatorUsername));
            return this;
          },
          selfCheckInGAS: function(idPengajian, idJamaah, status, keterangan, jamaahUsername) {
            this._call(() => supabaseSelfCheckIn(idPengajian, idJamaah, status, keterangan, jamaahUsername));
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
              { username: "admin", email: "admin@jatiwarnainfo.or.id", role: "Admin", passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", kelompok: "Semua" },
              { username: "op_pm", email: "op_pm@jatiwarnainfo.or.id", role: "Operator Kelompok", passwordHash: "ec6e1c25258002eb1c67d15c7f45da7945fa4c58778fd7d88faa5e53e3b4698d", kelompok: "Pondok Melati" },
              { username: "op_chandra", email: "op_chandra@jatiwarnainfo.or.id", role: "Operator Kelompok", passwordHash: "ec6e1c25258002eb1c67d15c7f45da7945fa4c58778fd7d88faa5e53e3b4698d", kelompok: "Chandra" }
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
          if (!localStorage.getItem("aji_master_tempat_kegiatan")) {
            localStorage.setItem("aji_master_tempat_kegiatan", JSON.stringify(["Masjid Al-Fatah", "Aula Serbaguna", "Masjid Baitul Makmur", "Daring (Online)"]));
          }
          if (!localStorage.getItem("aji_master_jenis_pengajian")) {
            localStorage.setItem("aji_master_jenis_pengajian", JSON.stringify([
              { nama: "Sambung", peserta_pengajian: "Dewasa, Manula, GUM", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "Ibu-ibu", peserta_pengajian: "Dewasa, Manula", batasan_gender: "Perempuan", target_dapuan: "" },
              { nama: "5 Unsur", peserta_pengajian: "Dewasa, Manula, GUM", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "Muda-mudi", peserta_pengajian: "GUM, GUS", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "Caberawit", peserta_pengajian: "PAUD, Caberawit", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "Lain-lain", peserta_pengajian: "", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "GUS", peserta_pengajian: "GUS", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "GUM", peserta_pengajian: "GUM", batasan_gender: "Semua", target_dapuan: "" },
              { nama: "Gabungan GUS dan GUM", peserta_pengajian: "GUS, GUM", batasan_gender: "Semua", target_dapuan: "" }
            ]));
          }
          if (!localStorage.getItem("aji_master_peserta_pengajian")) {
            localStorage.setItem("aji_master_peserta_pengajian", JSON.stringify([
              { id_peserta: "P-001", nama: "Balita" },
              { id_peserta: "P-002", nama: "PAUD" },
              { id_peserta: "P-003", nama: "Caberawit" },
              { id_peserta: "P-004", nama: "GUS" },
              { id_peserta: "P-005", nama: "GUM" },
              { id_peserta: "P-006", nama: "Dewasa" },
              { id_peserta: "P-007", nama: "MT/MS" },
              { id_peserta: "P-008", nama: "Pengurus Kelompok" },
              { id_peserta: "P-009", nama: "Pengurus Desa" },
              { id_peserta: "P-010", nama: "4s Desa" },
              { id_peserta: "P-011", nama: "4s Kelompok" },
              { id_peserta: "P-012", nama: "Pengurus Organisasi" },
              { id_peserta: "P-013", nama: "Pengurus Yayasan" },
              { id_peserta: "P-014", nama: "Ibu-ibu" },
              { id_peserta: "P-015", nama: "Kewanitaan" }
            ]));
          }
          if (!localStorage.getItem("aji_master_grup_kustom")) {
            localStorage.setItem("aji_master_grup_kustom", JSON.stringify([]));
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
                const rawPeserta = JSON.parse(localStorage.getItem("aji_master_peserta_pengajian") || "[]");
                const rawGrupKustom = JSON.parse(localStorage.getItem("aji_master_grup_kustom") || "[]");
                const rawTK = JSON.parse(localStorage.getItem("aji_master_tempat_kegiatan") || "[]");
                const rawJ = JSON.parse(localStorage.getItem("aji_pengajian_jadwal") || "[]");
                const rawPr = JSON.parse(localStorage.getItem("aji_pengajian_presensi") || "[]");
                const rawPeng = JSON.parse(localStorage.getItem("aji_master_pengajar") || "[]");
                const auditLogs = JSON.parse(localStorage.getItem("aji_audit_logs") || "[]");
                
                const masterKelompok = rawK.map(n => ({ nama: n }));
                const masterPendidikan = rawP.map(n => ({ nama: n }));
                const masterDapuan = rawD.map(n => ({ nama: n }));
                const masterTempatKegiatan = rawTK.map(n => ({ nama: n }));
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
                    return { nama: item, peserta_pengajian: p, batasan_gender: "Semua", target_dapuan: "" };
                  }
                  return {
                    nama: item.nama,
                    peserta_pengajian: item.peserta_pengajian || "",
                    batasan_gender: item.batasan_gender || "Semua",
                    target_dapuan: item.target_dapuan || ""
                  };
                });
                
                const kepalaKeluargaList = _getKepalaKeluargaList(jamaahList);
                const kartuKeluargaMappings = _getKartuKeluargaMappings(jamaahList);
                
                let filteredJamaah = jamaahList;
                let filteredKK = kepalaKeluargaList;
                let filteredMappings = kartuKeluargaMappings;
                let filteredJadwal = rawJ.map(x => ({ ...x, peserta_spesifik: x.peserta_spesifik || "", lokasi: x.lokasi || "" }));
                let filteredPresensi = rawPr;
                let filteredLogs = auditLogs;
                
                if (operatorUsername) {
                  const userObj = usersList.find(u => u.username.toLowerCase() === operatorUsername.toLowerCase());
                  const isKelompokRestricted = userObj && (userObj.role.trim().toLowerCase() === "operator kelompok" || userObj.role.trim().toLowerCase() === "pengurus kelompok");
                  if (isKelompokRestricted) {
                    const targetKelompok = userObj.kelompok;
                    filteredJamaah = jamaahList.filter(j => j.kelompokPengajian === targetKelompok);
                    filteredKK = kepalaKeluargaList.filter(kk => kk.kelompokPengajian === targetKelompok);
                    const subKKIds = new Set(filteredKK.map(kk => kk.id));
                    filteredMappings = kartuKeluargaMappings.filter(m => subKKIds.has(m.kepalaKeluargaId));
                    
                    filteredJadwal = rawJ.filter(j => j.kelompok_pengajian === targetKelompok).map(x => ({ ...x, peserta_spesifik: x.peserta_spesifik || "", lokasi: x.lokasi || "" }));
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
                  masterTempatKegiatan,
                  masterPesertaPengajian: rawPeserta,
                  masterGrupKustom: rawGrupKustom,
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
                  if ((user.status || 'active') === 'pending') {
                    return { success: false, pending: true };
                  }
                  this.logActionGAS(user.username, "LOGIN", "Pengguna " + user.username + " dengan role " + user.role + " (" + user.kelompok + ") login ke Web App (Local Mock).");
                  return {
                    success: true,
                    user: {
                      username: user.username,
                      email: user.email,
                      role: user.role,
                      kelompok: user.kelompok,
                      jamaah_id: user.jamaah_id || null,
                      status: user.status || 'active'
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
                        saveMasterItemGAS: function(tableName, oldName, newName, operatorUsername, peserta, gender, dapuan) {
              if (tableName === "Jenis Kegiatan") tableName = "Jenis Pengajian";
              if (tableName === "Materi Kegiatan") tableName = "Materi Pengajian";
              if (tableName === "Peserta Kegiatan") tableName = "Peserta Pengajian";
              this._call(() => {
                const keyMap = {
                  "Kelompok": "aji_master_kelompok",
                  "Tingkat Pendidikan": "aji_master_pendidikan",
                  "Dapuan": "aji_master_dapuan",
                  "Pekerjaan": "aji_master_pekerjaan",
                  "Status Hubungan Keluarga": "aji_master_hubungan",
                  "Materi Pengajian": "aji_master_materi",
                  "Jenis Pengajian": "aji_master_jenis_pengajian",
                  "Grup Kustom": "aji_master_grup_kustom",
                  "Peserta Pengajian": "aji_master_peserta_pengajian",
                  "Tempat Kegiatan": "aji_master_tempat_kegiatan"
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
                      list[idx] = { nama: newName, peserta_pengajian: peserta || "", batasan_gender: gender || "Semua", target_dapuan: dapuan || "" };
                      localStorage.setItem(lsKey, JSON.stringify(list));
                      this.logActionGAS(operatorUsername, "UPDATE_MASTER", "Mengubah opsi di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
                    }
                  } else {
                    list.push({ nama: newName, peserta_pengajian: peserta || "", batasan_gender: gender || "Semua", target_dapuan: dapuan || "" });
                    localStorage.setItem(lsKey, JSON.stringify(list));
                    this.logActionGAS(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
                  }
                } else if (tableName === "Grup Kustom") {
                  if (oldName) {
                    const idx = list.findIndex(x => x.nama === oldName);
                    if (idx !== -1) {
                      list[idx] = { nama: newName, deskripsi: peserta || "", daftar_id_anggota: gender || "" };
                      localStorage.setItem(lsKey, JSON.stringify(list));
                      this.logActionGAS(operatorUsername, "UPDATE_MASTER", "Mengubah grup kustom di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
                    }
                  } else {
                    list.push({ nama: newName, deskripsi: peserta || "", daftar_id_anggota: gender || "" });
                    localStorage.setItem(lsKey, JSON.stringify(list));
                    this.logActionGAS(operatorUsername, "CREATE_MASTER", "Menambahkan grup kustom baru di tabel " + tableName + ": '" + newName + "'");
                  }
                } else if (tableName === "Peserta Pengajian") {
                  if (oldName) {
                    const idx = list.findIndex(x => x.id_peserta === oldName);
                    if (idx !== -1) {
                      list[idx] = { id_peserta: oldName, nama: newName };
                      localStorage.setItem(lsKey, JSON.stringify(list));
                      this.logActionGAS(operatorUsername, "UPDATE_MASTER", "Mengubah opsi peserta di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
                    }
                  } else {
                    let maxId = 0;
                    list.forEach(x => {
                      const num = parseInt(x.id_peserta.replace("P-", ""));
                      if (num > maxId) maxId = num;
                    });
                    const newId = "P-" + String(maxId + 1).padStart(3, '0');
                    list.push({ id_peserta: newId, nama: newName });
                    localStorage.setItem(lsKey, JSON.stringify(list));
                    this.logActionGAS(operatorUsername, "CREATE_MASTER", "Menambahkan opsi peserta baru di tabel " + tableName + ": '" + newName + "'");
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
              if (tableName === "Jenis Kegiatan") tableName = "Jenis Pengajian";
              if (tableName === "Materi Kegiatan") tableName = "Materi Pengajian";
              if (tableName === "Peserta Kegiatan") tableName = "Peserta Pengajian";
              this._call(() => {
                const keyMap = {
                  "Kelompok": "aji_master_kelompok",
                  "Tingkat Pendidikan": "aji_master_pendidikan",
                  "Dapuan": "aji_master_dapuan",
                  "Pekerjaan": "aji_master_pekerjaan",
                  "Status Hubungan Keluarga": "aji_master_hubungan",
                  "Materi Pengajian": "aji_master_materi",
                  "Jenis Pengajian": "aji_master_jenis_pengajian",
                  "Grup Kustom": "aji_master_grup_kustom",
                  "Peserta Pengajian": "aji_master_peserta_pengajian",
                  "Tempat Kegiatan": "aji_master_tempat_kegiatan"
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
                const idx = list.findIndex(x => {
                  if (typeof x === 'object') {
                    if (tableName === "Peserta Pengajian") return x.id_peserta === name;
                    return x.nama === name;
                  }
                  return x === name;
                });
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
                let list = JSON.parse(localStorage.getItem("aji_pengajian_presensi") || "[]");
                presensiList.forEach(p => {
                  const idx = list.findIndex(item => item.id_pengajian == idPengajian && item.id_jamaah == p.id_jamaah);
                  if (!p.status || p.status === "Alpha") {
                    if (idx !== -1) {
                      list.splice(idx, 1);
                    }
                  } else {
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
                  list.splice(idx, 1);
                  localStorage.setItem("aji_master_pengajar", JSON.stringify(list));
                  this.logActionGAS(operatorUsername, "DELETE_PENGAJAR", `Menghapus master pengajar mock ID ${id_pengajar}`);
                  return true;
                }
                return false;
              });
              return this;
            },
            registerJamaahLinkedGAS: function(regData) {
              this._call(() => {
                const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const exists = users.find(u => u.username.toLowerCase() === regData.username.toLowerCase());
                if (exists) return { success: false, reason: 'username_taken' };
                users.push({
                  username: regData.username,
                  email: regData.email || (regData.username + '@jamaah.aji'),
                  role: 'jamaah',
                  passwordHash: regData.passwordHash,
                  kelompok: regData.kelompok || '',
                  jamaah_id: regData.jamaah_id,
                  status: 'active'
                });
                localStorage.setItem("aji_users", JSON.stringify(users));
                this.logActionGAS(regData.username, "REGISTER", "Jamaah " + regData.namaLengkap + " mendaftar akun (linked, id=" + regData.jamaah_id + ").");
                return { success: true };
              });
              return this;
            },
            registerJamaahNewGAS: function(regData) {
              this._call(() => {
                const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const exists = users.find(u => u.username.toLowerCase() === regData.username.toLowerCase());
                if (exists) return { success: false, reason: 'username_taken' };
                const jamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                let maxIdNum = 0;
                jamaahList.forEach(j => {
                  if (j.id && j.id.indexOf("J-") === 0) {
                    const num = parseInt(j.id.replace("J-", ""));
                    if (num > maxIdNum) maxIdNum = num;
                  }
                });
                const newJamaahId = "J-" + String(maxIdNum + 1).padStart(3, '0');
                jamaahList.push({
                  id: newJamaahId,
                  namaLengkap: regData.namaLengkap,
                  kelompokPengajian: regData.kelompok,
                  jenisKelamin: regData.jenisKelamin || '',
                  tempatLahir: regData.tempatLahir || '',
                  tanggalLahir: regData.tanggalLahir || '',
                  statusPernikahan: regData.statusPernikahan || '',
                  statusHubunganKeluarga: regData.statusHubunganKeluarga || 'Kepala Keluarga',
                  kepalaKeluargaId: '',
                  nomorHp: regData.nomorHp || '',
                  tingkatPendidikan: regData.tingkatPendidikan || '',
                  pekerjaanUtama: regData.pekerjaanUtama || '',
                  dapuan: regData.dapuan || 'Rokyah biasa',
                  statusEkonomi: regData.statusEkonomi || '',
                  kelancaranSambung: regData.kelancaranSambung || ''
                });
                localStorage.setItem("aji_jamaah", JSON.stringify(jamaahList));
                users.push({
                  username: regData.username,
                  email: regData.email || (regData.username + '@jamaah.aji'),
                  role: 'jamaah',
                  passwordHash: regData.passwordHash,
                  kelompok: regData.kelompok || '',
                  jamaah_id: newJamaahId,
                  status: 'pending'
                });
                localStorage.setItem("aji_users", JSON.stringify(users));
                return { success: true, pending: true };
              });
              return this;
            },
            getPendingUsersGAS: function(operatorKelompok) {
              this._call(() => {
                let users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                users = users.filter(u => (u.status || 'active') === 'pending');
                if (operatorKelompok && operatorKelompok !== 'Semua') {
                  users = users.filter(u => u.kelompok === operatorKelompok);
                }
                return users.map(u => ({
                  username: u.username, email: u.email,
                  kelompok: u.kelompok, jamaah_id: u.jamaah_id, created_at: ''
                }));
              });
              return this;
            },
            approveUserGAS: function(username, operatorUsername) {
              this._call(() => {
                const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const idx = users.findIndex(u => u.username === username);
                if (idx !== -1) { users[idx].status = 'active'; }
                localStorage.setItem("aji_users", JSON.stringify(users));
                this.logActionGAS(operatorUsername, "APPROVE_USER", "Menyetujui akun jamaah: " + username);
                return true;
              });
              return this;
            },
            rejectUserGAS: function(username, operatorUsername) {
              this._call(() => {
                let users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                const found = users.find(u => u.username === username);
                const jamaahId = found ? found.jamaah_id : null;
                users = users.filter(u => u.username !== username);
                localStorage.setItem("aji_users", JSON.stringify(users));
                if (jamaahId) {
                  let jList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
                  jList = jList.filter(j => j.id !== jamaahId);
                  localStorage.setItem("aji_jamaah", JSON.stringify(jList));
                }
                this.logActionGAS(operatorUsername, "REJECT_USER", "Menolak akun jamaah: " + username);
                return true;
              });
              return this;
            },
            selfCheckInGAS: function(idPengajian, idJamaah, status, keterangan, jamaahUsername) {
              this._call(() => {
                let list = JSON.parse(localStorage.getItem("aji_pengajian_presensi") || "[]");
                const idx = list.findIndex(p => p.id_pengajian == idPengajian && p.id_jamaah == idJamaah);
                if (!status || status === 'Alpha') {
                  if (idx !== -1) list.splice(idx, 1);
                } else {
                  const payload = { id_pengajian: parseInt(idPengajian), id_jamaah: idJamaah, status: status, keterangan: keterangan || '' };
                  if (idx !== -1) { payload.id = list[idx].id; list[idx] = payload; }
                  else { payload.id = Date.now(); list.push(payload); }
                }
                localStorage.setItem("aji_pengajian_presensi", JSON.stringify(list));
                this.logActionGAS(jamaahUsername || idJamaah, "SELF_CHECKIN", "Self check-in jamaah " + idJamaah + " sesi " + idPengajian + ": " + status);
                return true;
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
            const peramutan = getKelompokPeramutan(age, j.statusPernikahan, j.tingkatPendidikan);
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
              return { nama: item, peserta_pengajian: p, batasan_gender: "Semua", target_dapuan: "" };
            }
            return {
              nama: item.nama,
              peserta_pengajian: item.peserta_pengajian || "",
              batasan_gender: item.batasan_gender || "Semua",
              target_dapuan: item.target_dapuan || ""
            };
          });
          localMasterPesertaPengajian = data.masterPesertaPengajian || [];
          localMasterGrupKustom = data.masterGrupKustom || [];
          localMasterPengajar = data.masterPengajar || [];
          localMasterTempatKegiatan = (data.masterTempatKegiatan || []).map(m => m.nama);
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
    function getMasterPesertaPengajianList() { return localMasterPesertaPengajian; }
    function getMasterGrupKustomList() { return localMasterGrupKustom; }
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


    window.getSupabaseClient = function() { return supabaseClient; };
    window.getUseSupabase = function() { return useSupabase; };
