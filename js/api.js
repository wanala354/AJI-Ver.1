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
          supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
            global: {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          });
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

    function fetchTablePaginated(tableName, orderCol = null, ascending = false) {
      return new Promise((resolve) => {
        let allData = [];
        function fetchPage(from) {
          if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            resolve({ data: [], error: new Error("Supabase client not initialized") });
            return;
          }
          let query = supabaseClient.from(tableName).select("*").range(from, from + 999);
          if (orderCol) {
            query = query.order(orderCol, { ascending });
          }
          query.then(({ data, error }) => {
            if (error) {
              resolve({ data: [], error });
              return;
            }
            if (!data || data.length === 0) {
              resolve({ data: allData, error: null });
              return;
            }
            allData = allData.concat(data);
            if (data.length < 1000) {
              resolve({ data: allData, error: null });
            } else {
              fetchPage(from + 1000);
            }
          }).catch(err => {
            resolve({ data: [], error: err });
          });
        }
        fetchPage(0);
      });
    }

    function supabaseGetAllData(operatorUsername) {
      return Promise.all([
        fetchTablePaginated("jamaah", "created_at", false),
        supabaseClient.from("app_users").select("*").limit(50000),
        supabaseClient.from("master_kelompok").select("*").limit(1000),
        supabaseClient.from("master_pendidikan").select("*").limit(1000),
        supabaseClient.from("master_pekerjaan").select("*").limit(1000),
        supabaseClient.from("master_dapuan").select("*").limit(1000),
        supabaseClient.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(200),
        supabaseClient.from("master_materi_pengajian").select("*").limit(1000),
        fetchTablePaginated("pengajian_jadwal", "tanggal", false),
        fetchTablePaginated("pengajian_presensi"),
        supabaseClient.from("master_pengajar").select("*").limit(50000),
        supabaseClient.from("master_jenis_pengajian").select("*").limit(1000).then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("master_peserta_pengajian").select("*").limit(1000).then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("master_grup_kustom").select("*").limit(1000).then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("master_tempat_kegiatan").select("*").limit(1000).then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("data_haji").select("*").limit(50000).then(res => res, err => ({ data: [], error: err }))
      ]).then(([resJamaah, resUsers, resKelompok, resPendidikan, resPekerjaan, resDapuan, resLogs, resMateri, resJadwal, resPresensi, resMasterPengajar, resJenisPengajian, resPesertaPengajian, resGrupKustom, resTempatKegiatan, resDataHaji]) => {
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
          statusKeaktifan: j.status_keaktifan || "Aktif",
          keteranganStatus: j.keterangan_status || "",
          fotoUrl: j.foto_url || ""
        }));
        
        const usersList = (resUsers.data || []).map(u => ({
          username: u.username,
          email: u.email,
          role: u.role,
          passwordHash: u.password_hash,
          kelompok: u.kelompok,
          jamaah_id: u.jamaah_id || u.jamaahId || null,
          jamaahId: u.jamaah_id || u.jamaahId || null,
          status: u.status || 'active'
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
          filteredJadwal = jadwalList.filter(j => {
            const tk = String(j.tingkat_pengajian || "").toLowerCase();
            return j.kelompok_pengajian === targetKelompok ||
                   tk.includes("desa") ||
                   tk.includes("daerah");
          });
          const sIds = filteredJadwal.map(s => s.id);
          filteredPresensi = presensiList.filter(p => sIds.indexOf(p.id_pengajian) !== -1);
          
          filteredLogs = auditLogs.filter(log => {
            return log.user.toLowerCase() === (operatorUsername || "").toLowerCase() ||
                   log.description.indexOf("di Kelompok " + targetKelompok) !== -1 ||
                   log.description.indexOf("kelompokPengajian: '" + targetKelompok + "'") !== -1;
          });
        }
        
        const hajiList = (resDataHaji.data || []).map(h => ({
          id: h.id,
          jamaahId: h.jamaah_id,
          statusHaji: h.status_haji,
          nomorKursi: h.nomor_kursi || "",
          rencanaTahunBerangkat: h.rencana_tahun_berangkat ? parseInt(h.rencana_tahun_berangkat) : null,
          tahunBerangkat: h.tahun_berangkat ? parseInt(h.tahun_berangkat) : null,
          catatan: h.catatan || "",
          createdAt: h.created_at
        }));

        let filteredHaji = hajiList;
        if (isKelompokRestricted) {
          const targetKelompok = userObj.kelompok;
          const allowedJamaahIds = filteredJamaah.map(j => j.id);
          filteredHaji = hajiList.filter(h => allowedJamaahIds.includes(h.jamaahId));
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
          dataHaji: filteredHaji,
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
            email: regData.email || (regData.username + '@linked.aji'),
            role: 'jamaah',
            password_hash: regData.passwordHash,
            kelompok: regData.kelompok || '',
            jamaah_id: regData.jamaah_id,
            status: 'pending'
          };
          return supabaseClient.from("app_users").insert([payload]).then(({ error: e2 }) => {
            if (e2) throw e2;
            supabaseLogAction('SYSTEM', "REGISTER_PENDING", "Pendaftaran akun linked: " + regData.namaLengkap + " (" + regData.username + ") menunggu persetujuan kelompok " + regData.kelompok + ".");
            return { success: true, pending: true };
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
          const isLinked = u && u.email && u.email.endsWith('@linked.aji');
          
          return supabaseClient.from("app_users").delete().eq("username", username).then(({ error: e2 }) => {
            if (e2) throw e2;
            if (jamaahId && !isLinked) {
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
      if (!status || status === 'Alpha' || status === 'BELUM WAKTUNYA' || status === 'Belum Absen') {
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

    // --- DATA HAJI SUPABASE API ---
    function supabaseSaveDataHaji(hajiData, operatorUsername) {
      const payload = {
        jamaah_id: hajiData.jamaahId,
        status_haji: hajiData.statusHaji,
        nomor_kursi: hajiData.nomorKursi || null,
        rencana_tahun_berangkat: hajiData.rencanaTahunBerangkat ? parseInt(hajiData.rencanaTahunBerangkat) : null,
        tahun_berangkat: hajiData.tahunBerangkat ? parseInt(hajiData.tahunBerangkat) : null,
        catatan: hajiData.catatan || null,
        updated_at: new Date().toISOString()
      };

      if (hajiData.id) {
        payload.id = hajiData.id;
        return supabaseClient.from("data_haji").upsert(payload).then(({ data, error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "UPDATE_HAJI", "Memperbarui data haji jamaah: " + hajiData.jamaahId);
          return { success: true };
        });
      } else {
        return supabaseClient.from("data_haji").insert([payload]).then(({ data, error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "CREATE_HAJI", "Menambahkan data haji jamaah: " + hajiData.jamaahId);
          return { success: true };
        });
      }
    }

    function supabaseDeleteDataHaji(id, jamaahId, operatorUsername) {
      return supabaseClient.from("data_haji").delete().eq("id", id).then(({ error }) => {
        if (error) throw error;
        supabaseLogAction(operatorUsername, "DELETE_HAJI", "Menghapus data haji jamaah: " + jamaahId);
        return { success: true };
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
          status_keaktifan: jamaahData.statusKeaktifan || "Aktif",
          keterangan_status: jamaahData.keteranganStatus || null,
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

    function supabaseDeleteUser(username, operatorUsername) {
      return supabaseClient.from("app_users")
        .delete()
        .eq("username", username)
        .then(({ error }) => {
          if (error) throw error;
          supabaseLogAction(operatorUsername, "DELETE_USER", "Menghapus akun pengguna: " + username);
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
        if (!p.status || p.status === "Alpha" || p.status === "BELUM WAKTUNYA" || p.status === "Belum Absen") {
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
        // Supabase direct mode
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
          
          window.google = {
            script: {
              run: {}
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
    // SERVER CLIENT-SIDE DATA BRIDGE
    // ----------------------------------------------------
    function fetchDatabaseFromServer(callback) {
      const user = getCurrentUser();
      const operatorUsername = user ? user.username : null;
      
      if (useSupabase && supabaseClient) {
        supabaseGetAllData(operatorUsername).then(data => {
          if (data) {
            localJamaahList = (data.jamaahList || []).map(j => {
              const age = calculateAge ? calculateAge(j.tanggalLahir) : 0;
              const peramutan = getKelompokPeramutan ? getKelompokPeramutan(age, j.statusPernikahan, j.tingkatPendidikan) : "";
              return { ...j, umur: age, kelompokPeramutan: peramutan };
            });
            localKepalaKeluargaList = data.kepalaKeluargaList || [];
            localKartuKeluargaMappings = data.kartuKeluargaMappings || [];
            localAuditLogs = data.auditLogs || [];
            localUsersList = data.usersList || [];
            localMasterKelompok = data.masterKelompok || [];
            localMasterPendidikan = data.masterPendidikan || [];
            localMasterDapuan = data.masterDapuan || [];
            localMasterPekerjaan = data.masterPekerjaan || [];
            localMasterHubungan = data.masterHubungan || [];
            localMasterMateri = data.masterMateri || [];
            localMasterJenisPengajian = data.masterJenisPengajian || [];
            localMasterPesertaPengajian = data.masterPesertaPengajian || [];
            localMasterGrupKustom = data.masterGrupKustom || [];
            localMasterPengajar = data.masterPengajar || [];
            localMasterTempatKegiatan = data.masterTempatKegiatan || [];
            localJadwalPengajian = data.jadwalPengajian || [];
            localPresensiKehadiran = data.presensiKehadiran || [];
          }
          if (typeof renderMonitoringKetertiban === 'function') {
            try { renderMonitoringKetertiban(); } catch(e) {}
          }
          if (callback) callback();
        }).catch(err => {
          console.error("Gagal sinkronisasi data dari Supabase:", err);
          if (callback) callback();
        });
      } else {
        if (callback) callback();
      }
    }

    function getJamaahList() { return localJamaahList; }
    function getPengurusList() { return localPengurusList; }
    function getKepalaKeluargaList() { return localKepalaKeluargaList; }
    function getKartuKeluargaMappings() { return localKartuKeluargaMappings; }
    function getAuditLogs() { return localAuditLogs; }
    function getUsersList() { return localUsersList; }
    function getKelompokList() { return localMasterKelompok; }
    function getPendidikanList() { return localMasterPendidikan; }
    function getDapuanList() { return localMasterDapuan; }
    function getPekerjaanList() { return localMasterPekerjaan; }
    function getHubunganList() { return localMasterHubungan; }
    function getMasterMateriList() { return localMasterMateri; }
    function getMasterPengajarList() { return localMasterPengajar; }
    function getMasterJenisPengajianList() { return localMasterJenisPengajian; }
    function getMasterPesertaPengajianList() { return localMasterPesertaPengajian; }
    function getMasterGrupKustomList() { return localMasterGrupKustom; }
    function getTempatKegiatanList() { return localMasterTempatKegiatan; }
    function getJadwalPengajianList() { return localJadwalPengajian; }
    function getPresensiKehadiranList() { return localPresensiKehadiran; }

    function getCurrentUser() {
      const session = sessionStorage.getItem("aji_session_user");
      return session ? JSON.parse(session) : null;
    }

    function logoutUser() {
      const user = getCurrentUser();
      if (user && typeof supabaseLogAction === "function") {
        supabaseLogAction(user.username, "LOGOUT", `Pengguna ${user.username} logout dari aplikasi.`);
      }
      sessionStorage.removeItem("aji_session_user");
    }

    function saveJamaah(jamaahData, operatorUsername) {
      const saveBtn = document.getElementById("modal-save-btn");
      const oldHtml = saveBtn ? saveBtn.innerHTML : "";
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`; }
      
      supabaseSaveJamaah(jamaahData, operatorUsername)
        .then(function(savedItem) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = oldHtml; }
          closeJamaahModal();
          fetchDatabaseFromServer(function() {
            refreshActivePage();
            showToast(`Data jamaah ${jamaahData.namaLengkap} berhasil disimpan!`, "success");
          });
        })
        .catch(function(err) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = oldHtml; }
          showToast("Gagal menyimpan data: " + err.message, "error");
        });
    }

    function deleteJamaah(id, operatorUsername) {
      const item = getJamaahList().find(j => j.id === id);
      if (!item) return;
      if (confirm(`Apakah Anda yakin ingin menghapus Jamaah: "${item.namaLengkap}" (${id})?`)) {
        supabaseDeleteJamaah(id, operatorUsername)
          .then(function() {
            fetchDatabaseFromServer(function() {
              refreshActivePage();
              showToast(`Data jamaah ${item.namaLengkap} berhasil dihapus!`, "success");
            });
          })
          .catch(function(err) {
            showToast("Gagal menghapus data: " + err.message, "error");
          });
      }
    }

    function saveUser(userData, operatorUsername, callback, errorCallback) {
      supabaseSaveUser(userData, operatorUsername)
        .then(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    function deleteUser(username, operatorUsername, callback, errorCallback) {
      supabaseDeleteUser(username, operatorUsername)
        .then(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    window.saveUser = saveUser;
    window.deleteUser = deleteUser;
    window.supabaseSaveUser = supabaseSaveUser;
    window.supabaseDeleteUser = supabaseDeleteUser;

    function saveJadwalPengajian(jadwalData, operatorUsername, callback, errorCallback) {
      supabaseSaveJadwalPengajian(jadwalData, operatorUsername)
        .then(function(savedItem) {
          fetchDatabaseFromServer(function() {
            if (callback) callback(savedItem);
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    function deleteJadwalPengajian(id, operatorUsername, callback, errorCallback) {
      supabaseDeleteJadwalPengajian(id, operatorUsername)
        .then(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    function savePresensiKehadiran(idPengajian, presensiList, operatorUsername, callback, errorCallback) {
      supabaseSavePresensiKehadiran(idPengajian, presensiList, operatorUsername)
        .then(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    function saveMasterPengajar(pengajarData, operatorUsername, callback, errorCallback) {
      supabaseSaveMasterPengajar(pengajarData, operatorUsername)
        .then(function(savedItem) {
          fetchDatabaseFromServer(function() {
            if (callback) callback(savedItem);
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    function deleteMasterPengajar(id_pengajar, operatorUsername, callback, errorCallback) {
      supabaseDeleteMasterPengajar(id_pengajar, operatorUsername)
        .then(function() {
          fetchDatabaseFromServer(function() {
            if (callback) callback();
          });
        })
        .catch(function(err) {
          if (errorCallback) errorCallback(err);
        });
    }

    window.getJamaahList = getJamaahList;
    window.getPengurusList = getPengurusList;
    window.getKepalaKeluargaList = getKepalaKeluargaList;
    window.getKartuKeluargaMappings = getKartuKeluargaMappings;
    window.getAuditLogs = getAuditLogs;
    window.getUsersList = getUsersList;
    window.getKelompokList = getKelompokList;
    window.getPendidikanList = getPendidikanList;
    window.getDapuanList = getDapuanList;
    window.getPekerjaanList = getPekerjaanList;
    window.getHubunganList = getHubunganList;
    window.getMasterMateriList = getMasterMateriList;
    window.getMasterPengajarList = getMasterPengajarList;
    window.getMasterJenisPengajianList = getMasterJenisPengajianList;
    window.getMasterPesertaPengajianList = getMasterPesertaPengajianList;
    window.getMasterGrupKustomList = getMasterGrupKustomList;
    window.getMasterTempatKegiatanList = getTempatKegiatanList;
    window.getJadwalPengajianList = getJadwalPengajianList;
    window.getPresensiKehadiranList = getPresensiKehadiranList;
    window.getCurrentUser = getCurrentUser;
    window.logoutUser = logoutUser;
    window.saveJamaah = saveJamaah;
    window.deleteJamaah = deleteJamaah;
    window.saveJadwalPengajian = saveJadwalPengajian;
    window.deleteJadwalPengajian = deleteJadwalPengajian;
    window.savePresensiKehadiran = savePresensiKehadiran;
    window.saveMasterPengajar = saveMasterPengajar;
    window.deleteMasterPengajar = deleteMasterPengajar;
    window.fetchDatabaseFromServer = fetchDatabaseFromServer;
    window.getSupabaseClient = function() { return supabaseClient; };
    window.getUseSupabase = function() { return useSupabase; };
