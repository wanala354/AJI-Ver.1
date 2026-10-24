
// --- BEGIN FILE: js/state.js ---
    // GLOBAL STATE VARIABLES (VERSION 2.1)
    // ----------------------------------------------------
    let localJamaahList = [];
    let localPengurusList = [];
    let localKepalaKeluargaList = [];
    let localKartuKeluargaMappings = [];
    let localAuditLogs = [];
    let localUsersList = [];
    let localDataHaji = [];

    // Portal Jamaah State
    let localCurrentJamaahId = null;   // ID jamaah dari user yang sedang login (role=jamaah)
    let localPendingUsers = [];        // Daftar akun yang menunggu persetujuan admin
    
    // Constants for static master lists (v2.1)
    const MASTER_PERNIKAHAN = ["Belum Menikah", "Menikah", "Janda", "Duda"];
    const MASTER_EKONOMI = ["Aghnia", "Dhuafa", "Menengah"];
    const MASTER_KELANCARAN = ["Lancar", "Kurang Lancar", "Tidak Lancar", "Perlu Perhatian"];
    const MASTER_STATUS_KEAKTIFAN = ["Aktif", "Meninggal", "Pindah Sambung", "Sekolah/Kuliah Luar Daerah", "Non-Aktif Lainnya"];
    
    // Loaded dynamically from database / Google Sheets
    let localMasterKelompok = ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"];
    let localMasterPendidikan = [];
    let localMasterDapuan = [];
    let localMasterPekerjaan = [];
    let localMasterHubungan = [];
    let localMasterMateri = [];
    let localMasterPengajar = [];
    let localMasterJenisPengajian = [];
    let localMasterPesertaPengajian = [];
    let localMasterGrupKustom = [];
    let localMasterTempatKegiatan = [];
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
        supabaseClient.from("data_haji").select("*").limit(50000).then(res => res, err => ({ data: [], error: err })),
        supabaseClient.from("pengurus").select("*").limit(50000).then(res => res, err => ({ data: [], error: err }))
      ]).then(([resJamaah, resUsers, resKelompok, resPendidikan, resPekerjaan, resDapuan, resLogs, resMateri, resJadwal, resPresensi, resMasterPengajar, resJenisPengajian, resPesertaPengajian, resGrupKustom, resTempatKegiatan, resDataHaji, resPengurus]) => {
        if (resJamaah.error) throw resJamaah.error;
        if (resUsers.error) throw resUsers.error;
        
        const rawKelompok = (resKelompok.data || []).map(r => typeof r === 'object' && r !== null ? (r.nama || r.name || r.kelompok || String(r)) : String(r));
        const rawPendidikan = (resPendidikan.data || []).map(r => typeof r === 'object' && r !== null ? (r.nama || r.name || String(r)) : String(r));
        const rawDapuan = (resDapuan.data || []).map(r => typeof r === 'object' && r !== null ? (r.nama || r.name || String(r)) : String(r));
        const rawPekerjaan = (resPekerjaan.data || []).map(r => typeof r === 'object' && r !== null ? (r.nama || r.name || String(r)) : String(r));
        const rawHubungan = ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"];
        
        const rawMateri = (resMateri.data || []).map(r => typeof r === 'object' && r !== null ? (r.nama || r.name || String(r)) : String(r));
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
        const rawTempatKegiatan = (resTempatKegiatan.data || []).map(r => typeof r === 'object' && r !== null ? (r.nama || r.name || String(r)) : String(r));
        
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

        const pengurusList = (resPengurus.data || []).map(p => ({
          id: p.id,
          jamaah_id: p.jamaah_id,
          dapuan: p.dapuan,
          tingkat_pengurus: p.tingkat_pengurus,
          bidang: p.bidang || "",
          keterangan: p.keterangan || ""
        }));
        
        let filteredJamaah = jamaahList;
        let filteredLogs = auditLogs;
        let filteredJadwal = jadwalList;
        let filteredPresensi = presensiList;
        let filteredPengurus = pengurusList;
        
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

          const allowedJamaahIds = new Set(filteredJamaah.map(j => j.id));
          filteredPengurus = pengurusList.filter(p => allowedJamaahIds.has(p.jamaah_id));
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
          const allowedJamaahIds = filteredJamaah.map(j => j.id);
          filteredHaji = hajiList.filter(h => allowedJamaahIds.includes(h.jamaahId));
        }

        return {
          jamaahList: filteredJamaah,
          pengurusList: filteredPengurus,
          kepalaKeluargaList: filteredJamaah.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga"),
          kartuKeluargaMappings: filteredJamaah.filter(j => j.statusHubunganKeluarga !== "Kepala Keluarga" && j.kepalaKeluargaId).map(j => ({
            kepalaKeluargaId: j.kepala_keluarga_id,
            anggotaKeluargaId: j.id
          })),
          auditLogs: filteredLogs,
          usersList: usersList,
          dataHaji: filteredHaji,
          masterKelompok: rawKelompok,
          masterPendidikan: rawPendidikan,
          masterDapuan: rawDapuan,
          masterPekerjaan: rawPekerjaan,
          masterHubungan: rawHubungan,
          masterMateri: rawMateri,
          masterJenisPengajian: rawJenisPengajian,
          masterPesertaPengajian: rawPesertaPengajian,
          masterGrupKustom: rawGrupKustom,
          masterTempatKegiatan: rawTempatKegiatan,
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
    function sanitizeMasterList(arr, defaultFallback = []) {
      const clean = (arr || [])
        .map(k => typeof k === 'object' && k !== null ? (k.nama || k.name || k.kelompok || '') : String(k || ''))
        .map(s => String(s).trim())
        .filter(s => s && s !== 'undefined' && s !== 'null' && s !== '[object Object]');
      const unique = [...new Set(clean)];
      return unique.length > 0 ? unique : defaultFallback;
    }

    function fetchDatabaseFromServer(callback) {
      const user = getCurrentUser();
      const operatorUsername = user ? user.username : null;
      
      const applyData = (data) => {
        if (!data) return;
        localJamaahList = (data.jamaahList || []).map(j => {
          const age = calculateAge ? calculateAge(j.tanggalLahir) : 0;
          const peramutan = getKelompokPeramutan ? getKelompokPeramutan(age, j.statusPernikahan, j.tingkatPendidikan) : "";
          return { ...j, umur: age, kelompokPeramutan: peramutan };
        });
        localKepalaKeluargaList = data.kepalaKeluargaList || [];
        localKartuKeluargaMappings = data.kartuKeluargaMappings || [];
        localPengurusList = data.pengurusList || [];
        localDataHaji = data.dataHaji || [];
        localAuditLogs = data.auditLogs || [];
        localUsersList = data.usersList || [];
        localMasterKelompok = sanitizeMasterList(data.masterKelompok, ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"]);
        localMasterPendidikan = sanitizeMasterList(data.masterPendidikan, ["PAUD", "SD", "SMP", "SLTA/SMK", "Diploma", "S1", "S2", "S3"]);
        localMasterDapuan = sanitizeMasterList(data.masterDapuan, ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS", "Rokyah biasa", "Lainnya"]);
        localMasterPekerjaan = sanitizeMasterList(data.masterPekerjaan, ["Wiraswasta", "Swasta", "ASN", "TNI", "POLRI", "Guru", "IRT", "Pelajar/Mahasiswa", "Lainnya"]);
        localMasterHubungan = sanitizeMasterList(data.masterHubungan, ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"]);
        localMasterMateri = sanitizeMasterList(data.masterMateri, ["Al-Quran", "Hadis Khotbah", "Hadis Bukhori", "ASAD", "Musyawaroh 5 Unsur", "Teks", "Dalil-dalil"]);
        localMasterJenisPengajian = data.masterJenisPengajian || [];
        localMasterPesertaPengajian = data.masterPesertaPengajian || [];
        localMasterGrupKustom = data.masterGrupKustom || [];
        localMasterPengajar = data.masterPengajar || [];
        localMasterTempatKegiatan = sanitizeMasterList(data.masterTempatKegiatan, ["Masjid Al-Fatah", "Aula Serbaguna", "Masjid Baitul Makmur", "Daring (Online)"]);
        localJadwalPengajian = data.jadwalPengajian || [];
        localPresensiKehadiran = data.presensiKehadiran || [];
      };

      if (useSupabase && supabaseClient) {
        supabaseGetAllData(operatorUsername).then(data => {
          applyData(data);
          if (typeof renderMonitoringKetertiban === 'function') {
            try { renderMonitoringKetertiban(); } catch(e) {}
          }
          if (callback) callback();
        }).catch(err => {
          console.error("Gagal sinkronisasi data dari Supabase:", err);
          if (callback) callback();
        });
      } else {
        try {
          const rawK = JSON.parse(localStorage.getItem("aji_master_kelompok") || "[]");
          localMasterKelompok = sanitizeMasterList(rawK, ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"]);
          localJamaahList = JSON.parse(localStorage.getItem("aji_jamaah") || "[]");
          localUsersList = JSON.parse(localStorage.getItem("aji_users") || "[]");
        } catch(e) {}
        if (callback) callback();
      }
    }

    function getJamaahList() { return localJamaahList; }
    function getPengurusList() { return localPengurusList; }
    function getKepalaKeluargaList() { return localKepalaKeluargaList; }
    function getKartuKeluargaMappings() { return localKartuKeluargaMappings; }
    function getAuditLogs() { return localAuditLogs; }
    function getUsersList() { return localUsersList; }
    function getKelompokList() {
      const clean = sanitizeMasterList(localMasterKelompok);
      if (clean.length > 0) return clean;
      if (typeof localJamaahList !== 'undefined' && Array.isArray(localJamaahList) && localJamaahList.length > 0) {
        const fromJamaah = localJamaahList
          .map(j => String(j.kelompokPengajian || '').trim())
          .filter(s => s && s !== 'undefined' && s !== 'null' && s !== 'Semua');
        const unique = [...new Set(fromJamaah)];
        if (unique.length > 0) return unique;
      }
      try {
        const stored = localStorage.getItem("aji_master_kelompok");
        if (stored) {
          const fromStored = sanitizeMasterList(JSON.parse(stored));
          if (fromStored.length > 0) return fromStored;
        }
      } catch(e) {}
      return ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"];
    }
    function getPendidikanList() { return sanitizeMasterList(localMasterPendidikan, ["PAUD", "SD", "SMP", "SLTA/SMK", "Diploma", "S1", "S2", "S3"]); }
    function getDapuanList() { return sanitizeMasterList(localMasterDapuan, ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS", "Rokyah biasa", "Lainnya"]); }
    function getPekerjaanList() { return sanitizeMasterList(localMasterPekerjaan, ["Wiraswasta", "Swasta", "ASN", "TNI", "POLRI", "Guru", "IRT", "Pelajar/Mahasiswa", "Lainnya"]); }
    function getHubunganList() { return sanitizeMasterList(localMasterHubungan, ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"]); }
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

// --- END FILE: js/api.js ---

// --- BEGIN FILE: js/ui.js ---
    // DOM CARRIER LOADER
    // ----------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
      initDatabaseConnection();
      setupDatabaseMockOrSupabase();
      setupEventListeners();
      checkSession();
      initAutoRefresh();
    });

    function initAutoRefresh() {
      setInterval(() => {
        const user = getCurrentUser();
        if (user && useSupabase && typeof fetchDatabaseFromServer === 'function') {
          // Skip auto-refresh if the user is actively editing a presensi sheet
          const isEditingPresensi = document.getElementById("presensi-sheet-area") && 
                                    document.getElementById("presensi-sheet-area").style.display === "block";
          if (isEditingPresensi) return;

          fetchDatabaseFromServer(function() {
            // Re-render active subtab if applicable
            const activeSubtab = document.querySelector("#section-pengajian .card-panel-tabs .tab-btn.active") || document.querySelector(".tab-btn.active");
            if (activeSubtab) {
              const subtabName = activeSubtab.getAttribute("data-subtab");
              if (typeof refreshSubtabData === 'function') {
                refreshSubtabData(subtabName);
              }
            }
            // Re-render active main tab if dashboard
            const activeTab = document.querySelector(".menu-item.active");
            if (activeTab) {
              const tabName = activeTab.getAttribute("data-tab");
              if (tabName === "dashboard" && typeof initDashboardData === 'function') {
                initDashboardData();
              }
            }
          });
        }
      }, 30000); // Polling every 30 seconds
    }


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

    function getKelompokPeramutan(age, maritalStatus, tingkatPendidikan) {
      const edu = tingkatPendidikan ? tingkatPendidikan.trim().toUpperCase() : "";
      if ((age >= 13 && age <= 18) || (age <= 18 && (edu === "SMP" || edu === "SLTA/SMK"))) {
        return "GUS";
      }
      if (age <= 3) return "Balita";
      if (age <= 5) return "PAUD";
      if (age <= 12) return "Caberawit";
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
      function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
      }
      var mathPow = Math.pow;
      var maxWord = mathPow(2, 32);
      var lengthProperty = 'length';
      var i, j;
      var result = '';
      var words = [];
      var asciiLength = ascii[lengthProperty];
      var hash = [];
      var k = [];
      var primeCounter = 0;
      
      var getSharedDigest = function (candidate) {
        var isPrime = 1, divisor;
        for (divisor = 2; divisor * divisor <= candidate; divisor++) {
          if (candidate % divisor === 0) {
            isPrime = 0;
            break;
          }
        }
        return isPrime;
      };
      
      for (var candidate = 2; primeCounter < 64; candidate++) {
        if (getSharedDigest(candidate)) {
          if (primeCounter < 8) {
            hash[primeCounter] = (((mathPow(candidate, .5) % 1) * maxWord) | 0);
          }
          k[primeCounter] = (((mathPow(candidate, 1 / 3) % 1) * maxWord) | 0);
          primeCounter++;
        }
      }
      
      ascii += '\x80';
      while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
      
      for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
      }
      words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
      words[words[lengthProperty]] = (asciiLength * 8);
      
      for (j = 0; j < words[lengthProperty]; j += 16) {
        var w = Array(64);
        var a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
        for (i = 0; i < 64; i++) {
          if (i < 16) {
            w[i] = words[j + i];
          } else {
            var s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            var s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
          }
          var temp1 = (h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
          var temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
          h = g;
          g = f;
          f = e;
          e = (d + temp1) | 0;
          d = c;
          c = b;
          b = a;
          a = (temp1 + temp2) | 0;
        }
        hash[0] = (hash[0] + a) | 0;
        hash[1] = (hash[1] + b) | 0;
        hash[2] = (hash[2] + c) | 0;
        hash[3] = (hash[3] + d) | 0;
        hash[4] = (hash[4] + e) | 0;
        hash[5] = (hash[5] + f) | 0;
        hash[6] = (hash[6] + g) | 0;
        hash[7] = (hash[7] + h) | 0;
      }
      for (i = 0; i < 8; i++) {
        var hex = (hash[i] >>> 0).toString(16);
        while (hex.length < 8) hex = '0' + hex;
        result += hex;
      }
      return result;
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

    function updateUserAvatarUI(user) {
      const navAvatar = document.getElementById("nav-user-avatar");
      const profileCardAvatar = document.getElementById("profile-card-avatar");
      
      let fotoUrl = null;
      if (user && user.jamaah_id) {
        const jItem = getJamaahList().find(j => j.id === user.jamaah_id);
        if (jItem && jItem.fotoUrl) {
          fotoUrl = jItem.fotoUrl;
        }
      }
      
      if (navAvatar) {
        if (fotoUrl) {
          navAvatar.innerHTML = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
          navAvatar.innerHTML = "";
          navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
      }
      
      if (profileCardAvatar) {
        if (fotoUrl) {
          profileCardAvatar.innerHTML = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
          profileCardAvatar.innerHTML = "";
          profileCardAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
      }
    }

    function showMainApp(user) {
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("register-screen").style.display = "none";
      document.getElementById("app-container").style.display = "flex";
      
      document.getElementById("nav-user-name").textContent = user.username;
      updateUserAvatarUI(user);
      
      const userRoleClean = (user.role || "").trim().toLowerCase();

      // =====================================
      // PORTAL JAMAAH — Layout khusus
      // =====================================
      if (userRoleClean === "jamaah") {
        document.getElementById("nav-user-role").textContent = "JAMAAH PORTAL";
        // Sembunyikan semua admin menu, tampilkan portal menu
        document.getElementById("sidebar-menu-admin").style.display = "none";
        document.getElementById("sidebar-menu-jamaah").style.display = "block";
        // Set jamaah_id di state
        localCurrentJamaahId = user.jamaah_id || null;
        // Sembunyikan semua page-section admin, tampilkan portal sections
        document.querySelectorAll(".page-section:not(.portal-section)").forEach(s => s.classList.remove("active"));
        document.querySelectorAll(".portal-section").forEach(s => s.classList.remove("active"));
        const dash = document.getElementById("section-jamaah-dashboard");
        if (dash) dash.classList.add("active");
        // Init portal
        if (typeof initJamaahPortal === "function") initJamaahPortal();
        return;
      }

      // =====================================
      // LAYOUT ADMIN / OPERATOR / PENGURUS
      // =====================================
      document.getElementById("sidebar-menu-admin").style.display = "block";
      document.getElementById("sidebar-menu-jamaah").style.display = "none";
      
      let roleLabel = "USER (LIHAT SAJA)";
      if (userRoleClean === "admin") roleLabel = "SUPER ADMINISTRATOR";
      else if (userRoleClean === "operator kelompok") roleLabel = `OPERATOR KELOMPOK (${user.kelompok})`;
      else if (userRoleClean === "operator desa") roleLabel = "OPERATOR DESA";
      else if (userRoleClean === "pengurus desa") roleLabel = "PENGURUS DESA (VIEWER)";
      else if (userRoleClean === "pengurus kelompok") roleLabel = `PENGURUS KELOMPOK (${user.kelompok}) (VIEWER)`;
      
      document.getElementById("nav-user-role").textContent = roleLabel;
      
      const menuMaster = document.getElementById("menu-master");
      const menuUsers = document.getElementById("menu-users");
      const menuDatabaseSettings = document.getElementById("menu-database-settings");
      const menuAudit = document.getElementById("menu-audit");
      const btnAdd = document.getElementById("btn-add-jamaah");
      const btnAddJadwal = document.getElementById("btn-add-jadwal");
      const btnAddHaji = document.getElementById("btn-add-haji");
      const accessNote = document.getElementById("table-access-note");
      
      if (userRoleClean === "admin") {
        if (menuMaster) menuMaster.style.display = "block";
        if (menuUsers) menuUsers.style.display = "block";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "block";
        if (menuAudit) menuAudit.style.display = "block";
        if (btnAdd) btnAdd.style.display = "inline-flex";
        if (btnAddJadwal) btnAddJadwal.style.display = "inline-flex";
        if (btnAddHaji) btnAddHaji.style.display = "inline-flex";
        accessNote.textContent = "Hak Akses: Administrator (Full CRUD Aktif)";
        accessNote.style.color = "#10b981";
      } else if (userRoleClean === "operator kelompok" || userRoleClean === "operator desa") {
        if (menuMaster) menuMaster.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        if (menuAudit) menuAudit.style.display = "block";
        if (btnAdd) btnAdd.style.display = "inline-flex";
        if (btnAddJadwal) btnAddJadwal.style.display = "inline-flex";
        if (btnAddHaji) btnAddHaji.style.display = "inline-flex";

        const menuOpUserMgmt = document.getElementById("menu-operator-user-mgmt");

        if (userRoleClean === "operator kelompok") {
          // Operator Kelompok: gunakan halaman khusus (profil + approve jamaah)
          if (menuUsers) menuUsers.style.display = "none";
          if (menuOpUserMgmt) menuOpUserMgmt.style.display = "block";
          accessNote.textContent = `Hak Akses: Operator Kelompok ${user.kelompok} (CRUD Terbatas Kelompok)`;
          accessNote.style.color = "#3b82f6";
        } else {
          // Operator Desa: gunakan halaman manajemen user penuh
          if (menuUsers) menuUsers.style.display = "block";
          if (menuOpUserMgmt) menuOpUserMgmt.style.display = "none";
          accessNote.textContent = `Hak Akses: Operator Desa (CRUD Semua Tingkat)`;
          accessNote.style.color = "#10b981";
        }
      } else if (userRoleClean === "pendidik ppg") {
        roleLabel = `PENDIDIK PPG (${user.kelompok})`;
        if (menuMaster) menuMaster.style.display = "none";
        if (menuUsers) menuUsers.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        if (menuAudit) menuAudit.style.display = "none";
        if (btnAdd) btnAdd.style.display = "none";
        if (btnAddJadwal) btnAddJadwal.style.display = "none";
        if (btnAddHaji) btnAddHaji.style.display = "none";
        accessNote.textContent = `Hak Akses: Pendidik PPG ${user.kelompok} (Monitoring & Evaluasi Keilmuan)`;
        accessNote.style.color = "#10b981";
      } else if (userRoleClean === "pengurus desa" || userRoleClean === "pengurus kelompok") {
        if (menuMaster) menuMaster.style.display = "none";
        if (menuUsers) menuUsers.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        if (menuAudit) menuAudit.style.display = "block";
        if (btnAdd) btnAdd.style.display = "none";
        if (btnAddJadwal) btnAddJadwal.style.display = "none";
        if (btnAddHaji) btnAddHaji.style.display = "none";
        if (userRoleClean === "pengurus desa") {
          accessNote.textContent = "Hak Akses: Pengurus Desa (Mode Read-only Semua Tingkat)";
        } else {
          accessNote.textContent = `Hak Akses: Pengurus Kelompok ${user.kelompok} (Mode Read-only Kelompok)`;
        }
        accessNote.style.color = "#f59e0b";
      } else {
        if (menuMaster) menuMaster.style.display = "none";
        if (menuUsers) menuUsers.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        if (menuAudit) menuAudit.style.display = "none";
        if (btnAdd) btnAdd.style.display = "none";
        if (btnAddJadwal) btnAddJadwal.style.display = "none";
        if (btnAddHaji) btnAddHaji.style.display = "none";
        accessNote.textContent = "Hak Akses: User (Mode Read-only)";
        accessNote.style.color = "#9ca3af";
      }

      // Hide parent Pengaturan menu if no submenus are visible
      const menuPengaturanParent = document.getElementById("menu-pengaturan-parent");
      if (menuPengaturanParent) {
        const menuOpUserMgmt2 = document.getElementById("menu-operator-user-mgmt");
        const submenus = [menuMaster, menuUsers, menuOpUserMgmt2, menuDatabaseSettings, menuAudit];
        const hasVisible = submenus.some(m => m && m.style.display !== "none");
        menuPengaturanParent.style.display = hasVisible ? "block" : "none";
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
       updateUserAvatarUI(user);
      if (cRole) {
        let roleLabel = "User (Lihat Saja)";
        const r = (user.role || "").trim().toLowerCase();
        if (r === "admin") {
          roleLabel = "Super Administrator";
          cRole.className = "badge badge-green";
        } else if (r === "operator kelompok") {
          roleLabel = "Operator Kelompok";
          cRole.className = "badge badge-warning";
        } else if (r === "pendidik ppg") {
          roleLabel = "Pendidik PPG";
          cRole.className = "badge badge-green";
        } else {
          cRole.className = "badge badge-blue";
        }
        cRole.textContent = roleLabel;
      }
      if (cEmail) cEmail.textContent = user.email || "-";
      if (cKelompok) cKelompok.textContent = user.kelompok || "Semua";
    }

    // ============================================================
    // PORTAL JAMAAH: HELPER FUNCTIONS (Registration & Approval)
    // ============================================================
    function populateJamaahSearchDropdown(query) {
      const sel = document.getElementById("reg-jamaah-select");
      const dropdown = document.getElementById("reg-jamaah-dropdown");
      if (!sel || !dropdown) return;
      const q = (query || "").toLowerCase().trim();
      const filtered = (localJamaahList || []).filter(j => !q || (j.namaLengkap || "").toLowerCase().includes(q));
      
      // Update hidden select for compatibility
      sel.innerHTML = '<option value="">-- Pilih nama Anda --</option>';
      filtered.slice(0, 50).forEach(j => {
        const o = document.createElement("option");
        o.value = j.id;
        o.textContent = j.namaLengkap + " (" + j.kelompokPengajian + ")";
        sel.appendChild(o);
      });
      if (!filtered.length) {
        sel.innerHTML = '<option value="">Tidak ada hasil ditemukan</option>';
      }

      // Populate custom dropdown list
      dropdown.innerHTML = "";
      if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding:15px; color:var(--text-secondary); text-align:center; font-size:0.9rem;"><i class="fa-solid fa-user-slash" style="margin-right:5px;"></i>Tidak ada hasil ditemukan</div>';
        dropdown.style.display = "block";
        return;
      }
      
      filtered.slice(0, 50).forEach(j => {
        const item = document.createElement("div");
        item.className = "reg-dropdown-item";
        item.style.padding = "12px 15px";
        item.style.borderBottom = "1px solid var(--border-color)";
        item.style.cursor = "pointer";
        item.style.transition = "background-color 0.2s";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "2px";
        
        const nameDiv = document.createElement("div");
        nameDiv.style.fontWeight = "700";
        nameDiv.style.fontSize = "0.95rem";
        nameDiv.style.color = "var(--text-primary)";
        nameDiv.style.textTransform = "uppercase";
        nameDiv.textContent = j.namaLengkap;
        
        const subDiv = document.createElement("div");
        subDiv.style.fontSize = "0.78rem";
        subDiv.style.color = "var(--text-secondary)";
        const dapuanVal = j.dapuan || "Jamaah";
        subDiv.textContent = `${dapuanVal} · Kelompok ${j.kelompokPengajian}`;
        
        item.appendChild(nameDiv);
        item.appendChild(subDiv);
        
        item.addEventListener("mouseenter", () => {
          item.style.backgroundColor = "var(--primary-soft)";
        });
        item.addEventListener("mouseleave", () => {
          item.style.backgroundColor = "transparent";
        });
        
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          document.getElementById("reg-jamaah-search").value = j.namaLengkap;
          sel.value = j.id;
          
          // Memicu event change
          const changeEvent = new Event('change');
          sel.dispatchEvent(changeEvent);
          
          dropdown.style.display = "none";
        });
        
        dropdown.appendChild(item);
      });
      
      dropdown.style.display = "block";
    }

    function doRegisterLinked() {
      const jamaahId = document.getElementById("reg-jamaah-select").value;
      const username = document.getElementById("reg-username").value.trim();
      const pass1 = document.getElementById("reg-password").value;
      const pass2 = document.getElementById("reg-password2").value;
      if (!jamaahId) { showRegMsg("warning", "Pilih nama Anda dari dropdown."); return; }
      if (!username) { showRegMsg("warning", "Username tidak boleh kosong."); return; }
      if (pass1.length < 6) { showRegMsg("warning", "Password minimal 6 karakter."); return; }
      if (pass1 !== pass2) { showRegMsg("warning", "Konfirmasi password tidak cocok."); return; }
      const jamaah = localJamaahList.find(j => j.id === jamaahId);
      const btn = document.getElementById("btn-register-linked");
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mendaftar...';
      supabaseRegisterJamaahLinked({ username: username.toLowerCase(), passwordHash: sha256(pass1), jamaah_id: jamaahId, namaLengkap: jamaah ? jamaah.namaLengkap : "", kelompok: jamaah ? jamaah.kelompokPengajian : "" })
        .then(function(res) {
          btn.disabled = false; btn.innerHTML = orig;
          if (res.success) {
            const newUser = { username: username.toLowerCase(), email: username + "@jamaah.aji", role: "jamaah", kelompok: jamaah ? jamaah.kelompokPengajian : "", jamaah_id: jamaahId, status: "active" };
            sessionStorage.setItem("aji_session_user", JSON.stringify(newUser));
            document.getElementById("register-screen").style.display = "none";
            fetchDatabaseFromServer(function() { showMainApp(newUser); showToast("Registrasi berhasil! Selamat datang, " + username + ".", "success"); });
          } else if (res.reason === "username_taken") {
            showRegMsg("error", 'Username "' + username + '" sudah digunakan.');
          } else { showRegMsg("error", "Registrasi gagal. Coba lagi."); }
        })
        .catch(function(err) { btn.disabled = false; btn.innerHTML = orig; showRegMsg("error", "Error: " + (err.message || err)); });
    }

    function doRegisterNew() {
      const nama = document.getElementById("reg-jamaah-search") ? document.getElementById("reg-jamaah-search").value.trim() : "";
      const jamaahId = document.getElementById("reg-jamaah-select") ? document.getElementById("reg-jamaah-select").value : "";
      const kelompok = document.getElementById("reg-new-kelompok") ? document.getElementById("reg-new-kelompok").value : "";
      const jk = document.getElementById("reg-new-jk") ? document.getElementById("reg-new-jk").value : "";
      const tglLahir = document.getElementById("reg-new-tgl-lahir") ? document.getElementById("reg-new-tgl-lahir").value : "";
      const hp = document.getElementById("reg-new-hp") ? document.getElementById("reg-new-hp").value.trim() : "";
      const pernikahan = document.getElementById("reg-new-pernikahan") ? document.getElementById("reg-new-pernikahan").value : "";
      const username = document.getElementById("reg-new-username") ? document.getElementById("reg-new-username").value.trim() : "";
      const pass1 = document.getElementById("reg-new-password") ? document.getElementById("reg-new-password").value : "";
      const pass2 = document.getElementById("reg-new-password2") ? document.getElementById("reg-new-password2").value : "";

      if (!nama) { showRegMsg("warning", "Nama lengkap wajib diisi."); return; }
      if (!kelompok) { showRegMsg("warning", "Kelompok pengajian wajib dipilih."); return; }
      if (!username) { showRegMsg("warning", "Username tidak boleh kosong."); return; }
      if (pass1.length < 6) { showRegMsg("warning", "Password minimal 6 karakter."); return; }
      if (pass1 !== pass2) { showRegMsg("warning", "Konfirmasi password tidak cocok."); return; }

      const btn = document.getElementById("btn-register-new");
      const orig = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...'; }

      const fotoInput = document.getElementById("reg-new-foto");
      let uploadPromise = Promise.resolve(null);
      if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        const file = fotoInput.files[0];
        const ext = file.name.split('.').pop();
        const newFileName = `foto_${username.toLowerCase()}_${Date.now()}.${ext}`;
        uploadPromise = new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = function(e) {
            const base64Str = e.target.result.split(',')[1];
            if (typeof window.supabaseUploadPhotoToDrive === "function") {
              window.supabaseUploadPhotoToDrive(base64Str, newFileName).then(resolve).catch(reject);
            } else {
              resolve(null);
            }
          };
          reader.onerror = err => reject(err);
          reader.readAsDataURL(file);
        });
      }

      uploadPromise.then(fotoUrl => {
        if (jamaahId) {
          supabaseRegisterJamaahLinked({ username: username.toLowerCase(), passwordHash: sha256(pass1), jamaah_id: jamaahId, namaLengkap: nama, kelompok: kelompok })
            .then(function(res) {
              if (btn) { btn.disabled = false; btn.innerHTML = orig; }
              if (res.success && res.pending) {
                showRegMsg("success", "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan dari admin/operator kelompok " + kelompok + ".");
                if (btn) btn.style.display = "none";
              } else if (res.reason === "username_taken") {
                showRegMsg("error", 'Username "' + username + '" sudah digunakan.');
              } else { showRegMsg("error", "Gagal mendaftar. Coba lagi."); }
            })
            .catch(function(err) { if (btn) { btn.disabled = false; btn.innerHTML = orig; } showRegMsg("error", "Error: " + (err.message || err)); });
        } else {
          supabaseRegisterJamaahNew({ namaLengkap: nama, kelompok, jenisKelamin: jk, tanggalLahir: tglLahir, nomorHp: hp, statusPernikahan: pernikahan, statusHubunganKeluarga: "Kepala Keluarga", username: username.toLowerCase(), passwordHash: sha256(pass1), fotoUrl: fotoUrl })
            .then(function(res) {
              if (btn) { btn.disabled = false; btn.innerHTML = orig; }
              if (res.success && res.pending) {
                showRegMsg("success", "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan dari admin/operator kelompok " + kelompok + ".");
                if (btn) btn.style.display = "none";
              } else if (res.reason === "username_taken") {
                showRegMsg("error", 'Username "' + username + '" sudah digunakan.');
              } else { showRegMsg("error", "Gagal mendaftar. Coba lagi."); }
            })
            .catch(function(err) { if (btn) { btn.disabled = false; btn.innerHTML = orig; } showRegMsg("error", "Error: " + (err.message || err)); });
        }
      }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        showRegMsg("error", "Gagal mendaftar: " + (err.message || err));
      });
    }

    function showRegMsg(type, msg) {
      const el = document.getElementById("register-msg");
      if (!el) return;
      const colors = { success: "#10b981", error: "#ef4444", warning: "#f59e0b" };
      const icons = { success: "fa-circle-check", error: "fa-circle-xmark", warning: "fa-triangle-exclamation" };
      const rgba = type === "success" ? "16,185,129" : type === "error" ? "239,68,68" : "245,158,11";
      el.innerHTML = '<div style="padding:12px;border-radius:8px;margin-bottom:12px;font-size:0.9rem;background:rgba(' + rgba + ',0.1);border:1px solid ' + colors[type] + ';color:' + colors[type] + ';"><i class="fa-solid ' + icons[type] + '"></i> ' + msg + "</div>";
    }

    window.loadPendingUsers = function() {
      const user = getCurrentUser();
      const container = document.getElementById("pending-users-container");
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>';
      const opKelompok = (user && (user.role || "").toLowerCase() === "operator kelompok") ? user.kelompok : "Semua";
      supabaseGetPendingUsers(opKelompok)
        .then(function(list) {
          if (!list || !list.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-check-circle" style="font-size:2rem;color:#10b981;display:block;margin-bottom:10px;"></i>Tidak ada pendaftaran yang menunggu persetujuan.</div>';
            const badge = document.getElementById("pending-count-badge");
            if (badge) badge.style.display = "none";
            return;
          }
          const badge = document.getElementById("pending-count-badge");
          if (badge) { badge.textContent = list.length; badge.style.display = "inline"; }
          container.innerHTML = '<div class="table-responsive"><table class="table-custom"><thead><tr><th>Username</th><th>Nama Jamaah</th><th>Kelompok</th><th>Tgl Daftar</th><th style="text-align:center;">Aksi</th></tr></thead><tbody>' +
            list.map(u => {
              const jamaah = (typeof localJamaahList !== "undefined" ? localJamaahList : []).find(j => j.id === u.jamaah_id);
              const namaJamaah = jamaah ? jamaah.namaLengkap : (u.jamaah_id || "-");
              const tgl = u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "-";
              return "<tr><td><strong>" + u.username + "</strong></td><td>" + namaJamaah + "</td><td>" + (u.kelompok || "-") + "</td><td>" + tgl + "</td><td style=\"text-align:center;\"><button class=\"btn-primary\" style=\"padding:5px 12px;font-size:0.8rem;margin-right:5px;\" onclick=\"approveUser('" + u.username + "')\"><i class=\"fa-solid fa-check\"></i> Setujui</button><button style=\"padding:5px 12px;font-size:0.8rem;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;\" onclick=\"rejectUser('" + u.username + "')\"><i class=\"fa-solid fa-times\"></i> Tolak</button></td></tr>";
            }).join("") + "</tbody></table></div>";
        })
        .catch(function(err) { container.innerHTML = '<div style="color:#ef4444;padding:15px;">Gagal memuat: ' + (err.message || err) + "</div>"; });
    };

    window.approveUser = function(username) {
      if (!confirm('Setujui pendaftaran akun "' + username + '"?')) return;
      const user = getCurrentUser();
      supabaseApproveUser(username, user ? user.username : "admin")
        .then(function() { showToast("Akun " + username + " berhasil disetujui!", "success"); loadPendingUsers(); })
        .catch(function(err) { showToast("Gagal: " + (err.message || err), "error"); });
    };

    window.rejectUser = function(username) {
      if (!confirm('Tolak dan hapus pendaftaran "' + username + '"?')) return;
      const user = getCurrentUser();
      supabaseRejectUser(username, user ? user.username : "admin")
        .then(function() { showToast("Pendaftaran " + username + " ditolak.", "info"); loadPendingUsers(); })
        .catch(function(err) { showToast("Gagal: " + (err.message || err), "error"); });
    };

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
        fetchDatabaseFromServer(function(data) {
          processImportData(data || {}, log, finish);
        });
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

      // Profile Link Click in Sidebar Panel
      const navProfileLink = document.getElementById("nav-profile-link");
      if (navProfileLink) {
        navProfileLink.addEventListener("click", (e) => {
          e.preventDefault();
          document.querySelectorAll(".sidebar-menu .menu-item, .sidebar-menu .submenu-item").forEach(i => i.classList.remove("active"));
          switchTab("section-profile");
          document.getElementById("app-sidebar").classList.remove("active");
        });
      }

      // Login Form Submission
      document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const user = document.getElementById("login-username").value.trim().toLowerCase();
        const pass = document.getElementById("login-password").value;
        const errorMsg = document.getElementById("login-error-msg");
        const pendingMsg = document.getElementById("login-pending-msg");
        const loginBtn = document.querySelector("#login-form ~ div, .login-btn") || document.querySelector(".login-btn");
        const loginBtnEl = document.querySelector("#login-form .login-btn");
        
        if (loginBtnEl) { loginBtnEl.disabled = true; loginBtnEl.textContent = "Mengautentikasi..."; }
        if (errorMsg) errorMsg.style.display = "none";
        if (pendingMsg) pendingMsg.style.display = "none";
        
        // Temporary admin bypass
        if (user === "admin_bypass" && pass === "bypass123") {
          if (loginBtnEl) { loginBtnEl.disabled = false; loginBtnEl.textContent = "Masuk ke Dashboard"; }
          const bypassUser = { username: "admin_bypass", email: "admin_bypass@jatiwarnainfo.or.id", role: "Admin", kelompok: "Semua" };
          sessionStorage.setItem("aji_session_user", JSON.stringify(bypassUser));
          fetchDatabaseFromServer(function() { showMainApp(bypassUser); showToast("Login bypass Admin berhasil!", "success"); });
          return;
        }
        
        const hash = sha256(pass);
        supabaseAuthenticateUser(user, hash)
          .then(function(result) {
            if (loginBtnEl) { loginBtnEl.disabled = false; loginBtnEl.textContent = "Masuk ke Dashboard"; }
            if (result.success) {
              sessionStorage.setItem("aji_session_user", JSON.stringify(result.user));
              fetchDatabaseFromServer(function() {
                showMainApp(result.user);
                showToast(`Selamat datang, ${result.user.username}!`, "success");
              });
            } else if (result.pending) {
              if (pendingMsg) pendingMsg.style.display = "block";
            } else {
              if (errorMsg) { errorMsg.textContent = "Username atau Password salah!"; errorMsg.style.display = "block"; }
            }
          })
          .catch(function(err) {
            if (loginBtnEl) { loginBtnEl.disabled = false; loginBtnEl.textContent = "Masuk ke Dashboard"; }
            if (errorMsg) { errorMsg.textContent = "Terjadi kesalahan sistem: " + (err.message || err); errorMsg.style.display = "block"; }
          });
      });

      // Link: buka halaman registrasi
      const linkToRegister = document.getElementById("link-to-register");
      if (linkToRegister) {
        linkToRegister.addEventListener("click", (e) => {
          e.preventDefault();
          const origText = linkToRegister.innerHTML;
          linkToRegister.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat Data...';
          linkToRegister.style.pointerEvents = "none";

          fetchDatabaseFromServer(function() {
            linkToRegister.innerHTML = origText;
            linkToRegister.style.pointerEvents = "auto";
            
            document.getElementById("login-screen").style.display = "none";
            const regScreen = document.getElementById("register-screen");
            regScreen.style.display = "flex";
            
            // Isi dropdown kelompok
            const selKelompok = document.getElementById("reg-new-kelompok");
            if (selKelompok) {
              selKelompok.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
              const rawList = typeof getKelompokList === 'function' ? getKelompokList() : (Array.isArray(localMasterKelompok) ? localMasterKelompok : []);
              const list = Array.from(new Set(
                rawList
                  .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
                  .map(k => k.trim())
                  .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]')
              ));
              list.forEach(k => {
                const o = document.createElement("option");
                o.value = k;
                o.textContent = k;
                selKelompok.appendChild(o);
              });
            }
            // Isi search dropdown jamaah
            populateJamaahSearchDropdown("");
          });
        });
      }

      // Link: kembali ke login dari register
      const linkToLogin = document.getElementById("link-to-login");
      if (linkToLogin) {
        linkToLogin.addEventListener("click", (e) => {
          e.preventDefault();
          document.getElementById("register-screen").style.display = "none";
          document.getElementById("login-screen").style.display = "flex";
        });
      }

      // Registrasi: search dropdown jamaah
      const regSearch = document.getElementById("reg-jamaah-search");
      if (regSearch) {
        regSearch.addEventListener("input", () => {
          const sel = document.getElementById("reg-jamaah-select");
          if (sel) sel.value = "";
          populateJamaahSearchDropdown(regSearch.value);
        });
        regSearch.addEventListener("focus", () => populateJamaahSearchDropdown(regSearch.value));
      }

      // Close dropdown click outside
      document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("reg-jamaah-dropdown");
        const searchInput = document.getElementById("reg-jamaah-search");
        if (dropdown && searchInput && e.target !== searchInput && !dropdown.contains(e.target)) {
          dropdown.style.display = "none";
        }
      });
      // Registrasi: pilih dari dropdown
      const regSelect = document.getElementById("reg-jamaah-select");
      if (regSelect) {
        regSelect.addEventListener("change", () => {
          const selectedId = regSelect.value;
          if (selectedId) {
            const jamaah = localJamaahList.find(j => j.id === selectedId);
            if (jamaah) {
              if (document.getElementById("reg-new-kelompok")) document.getElementById("reg-new-kelompok").value = jamaah.kelompokPengajian || "";
              if (document.getElementById("reg-new-jk")) document.getElementById("reg-new-jk").value = jamaah.jenisKelamin || "";
              if (document.getElementById("reg-new-tgl-lahir")) document.getElementById("reg-new-tgl-lahir").value = jamaah.tanggalLahir || "";
              if (document.getElementById("reg-new-hp")) document.getElementById("reg-new-hp").value = jamaah.nomorHp || "";
              if (document.getElementById("reg-new-pernikahan")) document.getElementById("reg-new-pernikahan").value = jamaah.statusPernikahan || "";
            }
          }
        });
      }

      // Foto preview untuk registrasi baru
      const regFotoInput = document.getElementById("reg-new-foto");
      if (regFotoInput) {
        regFotoInput.addEventListener("change", function(e) {
          const file = e.target.files[0];
          const previewImg = document.getElementById("reg-new-foto-preview");
          const placeholder = document.getElementById("reg-new-foto-placeholder");
          if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
              previewImg.src = evt.target.result;
              previewImg.style.display = "block";
              placeholder.style.display = "none";
            };
            reader.readAsDataURL(file);
          } else {
            previewImg.style.display = "none";
            placeholder.style.display = "block";
          }
        });
      }

      // Foto preview untuk edit/add jamaah
      const formFotoInput = document.getElementById("form-foto");
      if (formFotoInput) {
        formFotoInput.addEventListener("change", function(e) {
          const file = e.target.files[0];
          const previewImg = document.getElementById("form-foto-preview");
          const placeholder = document.getElementById("form-foto-placeholder");
          if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
              previewImg.src = evt.target.result;
              previewImg.style.display = "block";
              placeholder.style.display = "none";
            };
            reader.readAsDataURL(file);
          } else {
            previewImg.style.display = "none";
            placeholder.style.display = "block";
          }
        });
      }

      // Registrasi baru (form lengkap)
      const btnRegNew = document.getElementById("btn-register-new");
      if (btnRegNew) {
        btnRegNew.addEventListener("click", () => doRegisterNew());
      }

      // Section Users: tab switcher
      document.querySelectorAll("[data-usertab]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tab = btn.getAttribute("data-usertab");
          document.querySelectorAll("[data-usertab]").forEach(b => {
            b.style.borderBottom = "3px solid transparent";
            b.style.color = "var(--text-secondary)";
          });
          btn.style.borderBottom = "3px solid var(--primary)";
          btn.style.color = "var(--primary)";
          document.getElementById("users-panel-active").style.display = tab === "active" ? "block" : "none";
          document.getElementById("users-panel-pending").style.display = tab === "pending" ? "block" : "none";
          if (tab === "pending") loadPendingUsers();
        });
      });

      // Logout button click
      document.getElementById("logout-btn").addEventListener("click", (e) => {
        if (e) e.preventDefault();
        logoutUser();
        sessionStorage.setItem("logout_success", "true");
        window.location.reload();
      });

      // Navigation routing
      const menuItems = document.querySelectorAll(".sidebar-menu > .menu-item");
      menuItems.forEach(item => {
        const toggleLink = item.querySelector(".menu-toggle");
        if (toggleLink) {
          toggleLink.addEventListener("click", (e) => {
            e.preventDefault();
            item.classList.toggle("open");
          });
        } else {
          item.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".sidebar-menu .menu-item, .sidebar-menu .submenu-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            const targetSection = item.getAttribute("data-target");
            if (targetSection) switchTab(targetSection);
            document.getElementById("app-sidebar").classList.remove("active");
          });
        }
      });

      // Submenu item click routing
      const submenuItems = document.querySelectorAll(".sidebar-menu .submenu-item");
      submenuItems.forEach(subItem => {
        subItem.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          document.querySelectorAll(".sidebar-menu .menu-item, .sidebar-menu .submenu-item").forEach(i => i.classList.remove("active"));
          subItem.classList.add("active");
          
          // Mark parent as active
          const parentItem = subItem.closest(".menu-item");
          if (parentItem) {
            parentItem.classList.add("active");
          }
          
          const targetSection = subItem.getAttribute("data-target");
          if (targetSection) switchTab(targetSection);
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
      const filterStatusEl = document.getElementById("filter-status-keaktifan");
      if (filterStatusEl) filterStatusEl.addEventListener("change", () => { currentPage = 1; filterJamaahTable(); });
      
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
        if (filterStatusEl) filterStatusEl.value = "Aktif";
        
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
      document.getElementById("report-filter-bulan").addEventListener("change", calculateAndRenderReport);
      document.getElementById("btn-export-report-csv").addEventListener("click", exportReportToCSV);

      // Jamaah Save Form Modal
      document.getElementById("btn-add-jamaah").addEventListener("click", () => openJamaahModal(null));
      const btnAddHajiEl = document.getElementById("btn-add-haji");
      if (btnAddHajiEl) {
        btnAddHajiEl.addEventListener("click", (e) => {
          if (e) e.preventDefault();
          if (typeof openHajiModal === "function") openHajiModal(null);
        });
      }
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
        const education = document.getElementById("form-pendidikan").value;
        const peramutan = getKelompokPeramutan(age, maritalStatus, education);
        document.getElementById("form-peramutan").value = peramutan;
      });
      
      document.getElementById("form-pernikahan").addEventListener("change", () => {
        const birthdate = document.getElementById("form-tanggal-lahir").value;
        const age = calculateAge(birthdate);
        const maritalStatus = document.getElementById("form-pernikahan").value;
        const education = document.getElementById("form-pendidikan").value;
        const peramutan = getKelompokPeramutan(age, maritalStatus, education);
        document.getElementById("form-peramutan").value = peramutan;
      });

      document.getElementById("form-pendidikan").addEventListener("change", () => {
        const birthdate = document.getElementById("form-tanggal-lahir").value;
        const age = calculateAge(birthdate);
        const maritalStatus = document.getElementById("form-pernikahan").value;
        const education = document.getElementById("form-pendidikan").value;
        const peramutan = getKelompokPeramutan(age, maritalStatus, education);
        document.getElementById("form-peramutan").value = peramutan;
      });

      document.getElementById("form-hubungan").addEventListener("change", updateFormKKState);

      // Submit Form Jamaah
      document.getElementById("jamaah-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        if (!currentUser) {
          showToast("Error: Anda tidak memiliki akses menulis!", "error");
          return;
        }

        // Kelompok checking (read radio or operator lock value)
        let selectedKelompok = "";
        if (curRoleClean === "operator kelompok") {
          selectedKelompok = currentUser.kelompok;
        } else if (curRoleClean === "jamaah") {
          const myJ = getJamaahList().find(j => j.id === localCurrentJamaahId);
          selectedKelompok = myJ ? myJ.kelompokPengajian : "";
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

        const namaLengkapClean = document.getElementById("form-nama").value.trim();
        const fotoInput = document.getElementById("form-foto");
        const existingFotoUrl = document.getElementById("form-foto-url").value;
        let uploadPromise = Promise.resolve(existingFotoUrl);

        if (fotoInput && fotoInput.files && fotoInput.files[0]) {
          const file = fotoInput.files[0];
          const ext = file.name.split('.').pop();
          const cleanName = namaLengkapClean.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const newFileName = `foto_${cleanName}_${Date.now()}.${ext}`;
          
          const saveBtn = document.getElementById("modal-save-btn");
          const oldHtml = saveBtn.innerHTML;
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah Foto...`;

          uploadPromise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(evt) {
              const base64Str = evt.target.result.split(',')[1];
              window.supabaseUploadPhotoToDrive(base64Str, newFileName)
                .then(resolve)
                .catch(err => {
                  saveBtn.disabled = false;
                  saveBtn.innerHTML = oldHtml;
                  reject(err);
                });
            };
            reader.onerror = err => {
              saveBtn.disabled = false;
              saveBtn.innerHTML = oldHtml;
              reject(err);
            };
            reader.readAsDataURL(file);
          });
        }

        uploadPromise.then(fotoUrl => {
          const jamaahData = {
            id: editingJamaahId,
            namaLengkap: namaLengkapClean,
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
            kelancaranSambung: document.getElementById("form-kelancaran").value,
            statusKeaktifan: document.getElementById("form-status-keaktifan") ? document.getElementById("form-status-keaktifan").value : "Aktif",
            keteranganStatus: document.getElementById("form-keterangan-status") ? document.getElementById("form-keterangan-status").value.trim() : "",
            fotoUrl: fotoUrl
          };
          saveJamaah(jamaahData, currentUser.username);
        }).catch(err => {
          showToast("Gagal mengunggah foto profil: " + (err.message || err), "error");
        });
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
        let genderValue = "";
        let dapuanValue = "";
        
        if (activeMasterTab === "Jenis Kegiatan") {
          const checkedPeserta = Array.from(document.querySelectorAll('input[name="master-form-peserta-chk"]:checked'))
            .map(chk => chk.value);
          pesertaValue = checkedPeserta.join(", ");
          
          genderValue = document.getElementById("master-form-gender").value;
          
          const dapuanSelect = document.getElementById("master-form-dapuan");
          const selectedDapuan = [];
          for (let i = 0; i < dapuanSelect.options.length; i++) {
            if (dapuanSelect.options[i].selected) {
              selectedDapuan.push(dapuanSelect.options[i].value);
            }
          }
          dapuanValue = selectedDapuan.join(", ");
        } else if (activeMasterTab === "Grup Kustom") {
          pesertaValue = document.getElementById("master-form-grup-kustom-desc").value.trim();
          
          const checkedMembers = Array.from(document.querySelectorAll('input[name="master-form-grup-member-chk"]:checked'))
            .map(chk => chk.value);
          genderValue = checkedMembers.join(", ");
        }
        
        const saveBtn = document.getElementById("master-modal-save-btn");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        
        supabaseSaveMasterItem(activeMasterTab, editingMasterName, value, curUser.username, pesertaValue, genderValue, dapuanValue)
          .then(function() {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan`;
            closeMasterModal();
            fetchDatabaseFromServer(function() {
              renderMasterTable();
              showToast(`Data Master ${activeMasterTab} berhasil diperbarui!`, "success");
            });
          })
          .catch(function(err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan`;
            showToast("Gagal menyimpan opsi master: " + err.message, "error");
          });
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
        const kelompok = (role === "Operator Kelompok" || role === "Pengurus Kelompok") ? document.getElementById("user-form-kelompok").value : "Semua";
        const password = document.getElementById("user-form-password").value;
        
        if (!isEdit && !password) {
          showToast("Password wajib diisi untuk pengguna baru!", "warning");
          return;
        }
        if (password && password.length < 6) {
          showToast("Password minimal berjumlah 6 karakter!", "warning");
          return;
        }
        if ((role === "Operator Kelompok" || role === "Pengurus Kelompok") && !kelompok) {
          showToast("Kelompok otoritas wajib dipilih untuk role Kelompok!", "warning");
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

        saveUser(
          userData,
          curUser ? curUser.username : "admin",
          function() {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan User`;
            closeUserModal();
            renderUsersTable();
            showToast(`Akun pengguna ${username} berhasil disimpan!`, "success");
          },
          function(err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-save"></i> Simpan User`;
            showToast("Gagal menyimpan akun: " + (err ? (err.message || err) : "Terjadi kesalahan"), "error");
          }
        );
      });

      // Profile settings form submission
      const profileForm = document.getElementById("profile-form");
      if (profileForm) {
        profileForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const curUser = getCurrentUser();
          if (!curUser) return;
          
          const newUsername = document.getElementById("profile-username").value.trim();
          const newEmail = document.getElementById("profile-email").value.trim();
          const newPass = document.getElementById("profile-new-password").value;
          const confirmPass = document.getElementById("profile-confirm-password").value;
          const oldPass = document.getElementById("profile-old-password").value;
          
          if (!newUsername) {
            showToast("Nama Pengguna wajib diisi!", "warning");
            return;
          }
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
          supabaseAuthenticateUser(curUser.username, oldHash)
            .then(function(authResult) {
              if (authResult.success) {
                const isUsernameChanged = newUsername.toLowerCase() !== curUser.username.toLowerCase();
                
                const performProfileUpdate = () => {
                  const userData = {
                    username: newUsername,
                    email: newEmail,
                    role: curUser.role,
                    kelompok: curUser.kelompok
                  };
                  if (newPass) {
                    userData.passwordHash = sha256(newPass);
                  }
                  
                  if (typeof getUseSupabase !== "undefined" && getUseSupabase()) {
                    const pgUser = {
                      username: newUsername,
                      email: newEmail
                    };
                    if (newPass) {
                      pgUser.password_hash = sha256(newPass);
                    }
                    
                    getSupabaseClient().from("app_users")
                      .update(pgUser)
                      .eq("username", curUser.username)
                      .then(({ error }) => {
                        if (error) {
                          saveBtn.disabled = false;
                          saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                          showToast("Gagal memperbarui profil: " + error.message, "error");
                        } else {
                          if (typeof supabaseLogAction === "function") {
                            supabaseLogAction(curUser.username, "UPDATE_PROFILE", "Memperbarui profil sendiri. Username: " + curUser.username + " -> " + newUsername);
                          }
                          
                          curUser.username = newUsername;
                          curUser.email = newEmail;
                          sessionStorage.setItem("aji_session_user", JSON.stringify(curUser));
                          
                          document.getElementById("profile-old-password").value = "";
                          document.getElementById("profile-new-password").value = "";
                          document.getElementById("profile-confirm-password").value = "";
                          
                          document.getElementById("nav-user-name").textContent = curUser.username;
                          document.getElementById("nav-user-avatar").textContent = curUser.username.charAt(0).toUpperCase();
                          populateUserProfileData();
                          
                          saveBtn.disabled = false;
                          saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                          showToast("Profil dan keamanan berhasil diperbarui!", "success");
                        }
                      });
                  } else {
                    const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                    const idx = users.findIndex(u => u.username.toLowerCase() === curUser.username.toLowerCase());
                    if (idx !== -1) {
                      users[idx].username = newUsername;
                      users[idx].email = newEmail;
                      if (newPass) {
                        users[idx].passwordHash = sha256(newPass);
                      }
                      localStorage.setItem("aji_users", JSON.stringify(users));
                      
                      if (typeof supabaseLogAction === "function") {
                        supabaseLogAction(curUser.username, "UPDATE_PROFILE", "Memperbarui profil sendiri.");
                      }
                      
                      curUser.username = newUsername;
                      curUser.email = newEmail;
                      sessionStorage.setItem("aji_session_user", JSON.stringify(curUser));
                      
                      document.getElementById("profile-old-password").value = "";
                      document.getElementById("profile-new-password").value = "";
                      document.getElementById("profile-confirm-password").value = "";
                      
                      document.getElementById("nav-user-name").textContent = curUser.username;
                      document.getElementById("nav-user-avatar").textContent = curUser.username.charAt(0).toUpperCase();
                      populateUserProfileData();
                      
                      saveBtn.disabled = false;
                      saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                      showToast("Profil dan keamanan berhasil diperbarui (Local Mock)!", "success");
                    } else {
                      saveBtn.disabled = false;
                      saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                      showToast("User tidak ditemukan di database lokal!", "error");
                    }
                  }
                };
                
                if (isUsernameChanged) {
                  if (typeof getUseSupabase !== "undefined" && getUseSupabase()) {
                    getSupabaseClient().from("app_users")
                      .select("username")
                      .eq("username", newUsername)
                      .then(({ data, error }) => {
                        if (error) {
                          saveBtn.disabled = false;
                          saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                          showToast("Gagal memvalidasi nama pengguna: " + error.message, "error");
                        } else if (data && data.length > 0) {
                          saveBtn.disabled = false;
                          saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                          showToast("Nama Pengguna (Username) sudah digunakan!", "warning");
                        } else {
                          performProfileUpdate();
                        }
                      });
                  } else {
                    const users = JSON.parse(localStorage.getItem("aji_users") || "[]");
                    const exist = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase());
                    if (exist) {
                      saveBtn.disabled = false;
                      saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                      showToast("Nama Pengguna (Username) sudah digunakan!", "warning");
                    } else {
                      performProfileUpdate();
                    }
                  }
                } else {
                  performProfileUpdate();
                }
              } else {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
                showToast("Password saat ini salah!", "error");
              }
            })
            .catch(function(err) {
              saveBtn.disabled = false;
              saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
              showToast("Verifikasi password gagal: " + (err.message || err), "error");
            });
        });
      }

    }

    // ----------------------------------------------------
    // TAB LAYOUT SWITCHER
    // ----------------------------------------------------
    function switchTab(sectionId) {
      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      const isRestrictedTab = ["section-database-settings", "section-users", "section-master"].includes(sectionId);
      if (isRestrictedTab && curRoleClean !== "admin" && curRoleClean !== "operator desa") {
        sectionId = "section-dashboard";
      }

      document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
      const target = document.getElementById(sectionId);
      if (target) target.classList.add("active");

      
      const titleMap = {
        "section-dashboard": { title: "Dashboard Utama", icon: "fa-chart-pie" },
        "section-jamaah": { title: "Modul Data Jamaah", icon: "fa-users" },
        "section-kartu-keluarga": { title: "Modul Kartu Keluarga Relasional", icon: "fa-file-invoice" },
        "section-haji": { title: "Modul Data Haji Jamaah", icon: "fa-kaaba" },
        "section-report": { title: "Rekapitulasi & Laporan", icon: "fa-file-contract" },
        "section-master": { title: "Pengaturan Data Master", icon: "fa-folder-tree" },
        "section-users": { title: "Manajemen Akun Pengguna", icon: "fa-users-gear" },
        "section-operator-user-mgmt": { title: "Manajemen User & Profil", icon: "fa-users-gear" },
        "section-pengurus": { title: "Manajemen Data Pengurus", icon: "fa-sitemap" },
        "section-pengajian": { title: "Manajemen Pengajian", icon: "fa-book-open-reader" },
        "section-profile": { title: "Profil Saya & Keamanan", icon: "fa-user-circle" },
        "section-database-settings": { title: "Koneksi Database Supabase", icon: "fa-database" },
        "section-audit": { title: "Riwayat Aktivitas & Audit Logs", icon: "fa-history" },
        "section-ppg": { title: "Modul PPG (Penggerak Pembina Generus)", icon: "fa-graduation-cap" },
        "section-jamaah-dashboard": { title: "Dashboard Saya", icon: "fa-gauge-high" },
        "section-jamaah-keluarga": { title: "Keluarga Saya", icon: "fa-house-user" },
        "section-jamaah-jadwal": { title: "Jadwal Pengajian", icon: "fa-calendar-check" },
        "section-jamaah-rapor-ppg": { title: "Rapor Keilmuan PPG", icon: "fa-graduation-cap" }
      };
      
      const titleInfo = titleMap[sectionId] || { title: "Modul AJI", icon: "fa-mosque" };
      const pageNavTitleEl = document.getElementById("page-nav-title");
      if (pageNavTitleEl) {
        pageNavTitleEl.innerHTML = `<i class="fa-solid ${titleInfo.icon}"></i> ${titleInfo.title}`;
      }
      
      if (sectionId === "section-dashboard") {
        loadDashboardKPIs();
        renderDashboardCharts();
      } else if (sectionId === "section-jamaah") {
        populateFilterOptions();
        populateJamaahTable();
      } else if (sectionId === "section-kartu-keluarga") {
        populateKKFilterOptions();
        populateKKList();
      } else if (sectionId === "section-haji") {
        if (typeof initHajiModule === 'function') initHajiModule();
      } else if (sectionId === "section-report") {
        populateReportFilterOptions();
        calculateAndRenderReport();
        if (typeof initLaporanBulananModule === 'function') initLaporanBulananModule();
      } else if (sectionId === "section-master") {
        renderMasterTable();
      } else if (sectionId === "section-pengurus") { 
        populateKelompokFilterPengurus();
        renderPengurusTable();
      } else if (sectionId === "section-pengajian") {
        if (typeof initPengajianModule === 'function') initPengajianModule();
      } else if (sectionId === "section-users") {
        renderUsersTable();
      } else if (sectionId === "section-operator-user-mgmt") {
        initOperatorUserMgmt();
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
      } else if (sectionId === "section-ppg") {
        if (typeof initPpgModule === 'function') initPpgModule();
      } else if (sectionId === "section-jamaah-dashboard") {
        if (typeof loadJamaahDashboard === 'function') loadJamaahDashboard();
      } else if (sectionId === "section-jamaah-keluarga") {
        if (typeof loadJamaahKeluarga === 'function') loadJamaahKeluarga();
      } else if (sectionId === "section-jamaah-jadwal") {
        if (typeof initPortalCalendarFilters === 'function') initPortalCalendarFilters();
        if (typeof switchPortalJadwalTab === 'function') switchPortalJadwalTab('kalender');
      } else if (sectionId === "section-jamaah-rapor-ppg") {
        if (typeof initJamaahPortalPpgRapor === 'function') initJamaahPortalPpgRapor();
      }
    }

    function refreshActivePage() {
      const activeSection = document.querySelector(".page-section.active");
      if (activeSection) {
        switchTab(activeSection.id);
      }
    }

    function openImagePreviewModal(url) {
      const modal = document.getElementById("image-preview-modal");
      const img = document.getElementById("large-profile-image");
      const downloadLink = document.getElementById("download-profile-image");
      if (modal && img && downloadLink) {
        img.src = url;
        downloadLink.href = url;
        modal.classList.add("active");
      }
    }
    function closeImagePreviewModal() {
      const modal = document.getElementById("image-preview-modal");
      if (modal) modal.classList.remove("active");
    }
    window.openImagePreviewModal = openImagePreviewModal;
    window.closeImagePreviewModal = closeImagePreviewModal;

    // Attach click events to avatars
    document.addEventListener("click", (e) => {
      // 1. Profile card avatar
      const pAvatar = e.target.closest("#profile-card-avatar");
      if (pAvatar) {
        const img = pAvatar.querySelector("img");
        if (img && img.src) {
          openImagePreviewModal(img.src);
        }
        return;
      }
      
      // 2. View details modal avatar
      if (e.target.id === "view-j-avatar-img" && e.target.src) {
        openImagePreviewModal(e.target.src);
        return;
      }

      // 3. Portal Dashboard Avatar
      const portalAvatar = e.target.closest("#portal-jamaah-avatar");
      if (portalAvatar) {
        const img = portalAvatar.querySelector("img");
        if (img && img.src) {
          openImagePreviewModal(img.src);
        }
        return;
      }
    });

    // Make elements visually clickable
    setTimeout(() => {
      const elIds = ["profile-card-avatar", "view-j-avatar-img", "portal-jamaah-avatar"];
      elIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.cursor = "pointer";
      });
    }, 1000);

    // ----------------------------------------------------

    // ============================================================
    // OPERATOR KELOMPOK: USER MANAGEMENT PAGE (Profile + Approve)
    // ============================================================

    function initOperatorUserMgmt() {
      const user = getCurrentUser();
      if (!user) return;

      // Populate profile cards & form fields
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "-"; };

      setVal("op-profile-username", user.username);
      setVal("op-profile-email", user.email || "");
      setVal("op-profile-role", user.role || "");
      setVal("op-profile-kelompok", user.kelompok || "Semua");

      setText("op-profile-card-username", user.username);
      setText("op-profile-card-email", user.email || "-");
      setText("op-profile-card-kelompok", user.kelompok || "Semua");

      const avatarEl = document.getElementById("op-profile-avatar");
      if (avatarEl) {
        // Check if there's a profile image
        if (user.profileImageUrl) {
          avatarEl.innerHTML = `<img src="${user.profileImageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
          avatarEl.textContent = (user.username || "U").charAt(0).toUpperCase();
        }
      }

      const roleEl = document.getElementById("op-profile-card-role");
      if (roleEl) {
        const r = (user.role || "").trim().toLowerCase();
        roleEl.textContent = r === "operator kelompok" ? "Operator Kelompok" : (user.role || "User");
        roleEl.className = r === "operator kelompok" ? "badge badge-warning" : "badge badge-blue";
      }

      // Tab switching
      document.querySelectorAll(".op-user-tab-btn").forEach(btn => {
        btn.onclick = function() { opSwitchUserTab(this.dataset.optab); };
      });

      // Form submit handler (attach once)
      const form = document.getElementById("op-profile-form");
      if (form && !form.dataset.handlerAttached) {
        form.dataset.handlerAttached = "true";
        form.addEventListener("submit", function(e) {
          e.preventDefault();
          opSaveProfile();
        });
      }

      // Default to profile tab
      opSwitchUserTab("profile");

      // Load pending count in background for badge
      opLoadPendingUsers(true); // true = badge-only mode
    }

    function opSwitchUserTab(tab) {
      const profilePanel = document.getElementById("op-panel-profile");
      const approvePanel = document.getElementById("op-panel-approve");
      document.querySelectorAll(".op-user-tab-btn").forEach(btn => {
        const isActive = btn.dataset.optab === tab;
        btn.style.borderBottom = isActive ? "3px solid var(--primary)" : "3px solid transparent";
        btn.style.color = isActive ? "var(--primary)" : "var(--text-secondary)";
        btn.style.fontWeight = isActive ? "600" : "500";
      });
      if (profilePanel) profilePanel.style.display = tab === "profile" ? "block" : "none";
      if (approvePanel) {
        approvePanel.style.display = tab === "approve" ? "block" : "none";
        if (tab === "approve") opLoadPendingUsers(false);
      }
    }

    window.opLoadPendingUsers = function(badgeOnly) {
      const user = getCurrentUser();
      if (!user) return;
      const container = document.getElementById("op-pending-users-container");
      if (!badgeOnly && container) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>';
      }
      const opKelompok = user.kelompok || "Semua";

      supabaseGetPendingUsers(opKelompok)
        .then(function(list) {
            const badge = document.getElementById("op-pending-badge");
            if (!list || !list.length) {
              if (badge) badge.style.display = "none";
              if (!badgeOnly && container) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-check-circle" style="font-size:2rem;color:#10b981;display:block;margin-bottom:10px;"></i>Tidak ada pendaftaran yang menunggu persetujuan.</div>';
              }
              return;
            }
            if (badge) { badge.textContent = list.length; badge.style.display = "inline"; }
            if (badgeOnly) return;
            if (container) {
              container.innerHTML = '<div class="table-responsive"><table class="table-custom"><thead><tr><th>Username</th><th>Nama Jamaah</th><th>Kelompok</th><th>Tgl Daftar</th><th style="text-align:center;">Aksi</th></tr></thead><tbody>' +
                list.map(u => {
                  const jamaah = (typeof localJamaahList !== "undefined" ? localJamaahList : []).find(j => j.id === u.jamaah_id);
                  const namaJamaah = jamaah ? jamaah.namaLengkap : (u.jamaah_id || "-");
                  const tgl = u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "-";
                  return `<tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${namaJamaah}</td>
                    <td><span class="badge badge-blue">${u.kelompok || "-"}</span></td>
                    <td>${tgl}</td>
                    <td style="text-align:center;">
                      <button class="btn-primary" style="padding:5px 12px;font-size:0.8rem;margin-right:5px;" onclick="opApproveUser('${u.username}')"><i class="fa-solid fa-check"></i> Setujui</button>
                      <button style="padding:5px 12px;font-size:0.8rem;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;" onclick="opRejectUser('${u.username}')"><i class="fa-solid fa-times"></i> Tolak</button>
                    </td>
                  </tr>`;
                }).join("") +
                "</tbody></table></div>";
            }
        })
        .catch(function(err) {
            if (!badgeOnly && container) {
              container.innerHTML = '<div style="color:#ef4444;padding:15px;">Gagal memuat: ' + (err.message || err) + "</div>";
            }
        });
    };

    window.opApproveUser = function(username) {
      if (!confirm('Setujui pendaftaran akun "' + username + '"?')) return;
      const user = getCurrentUser();
      supabaseApproveUser(username, user ? user.username : "admin")
        .then(function() {
          showToast("Akun " + username + " berhasil disetujui!", "success");
          opLoadPendingUsers(false);
        })
        .catch(function(err) { showToast("Gagal: " + (err.message || err), "error"); });
    };

    window.opRejectUser = function(username) {
      if (!confirm('Tolak dan hapus pendaftaran "' + username + '"?')) return;
      const user = getCurrentUser();
      supabaseRejectUser(username, user ? user.username : "admin")
        .then(function() {
          showToast("Pendaftaran " + username + " ditolak.", "info");
          opLoadPendingUsers(false);
        })
        .catch(function(err) { showToast("Gagal: " + (err.message || err), "error"); });
    };

    function opSaveProfile() {
      const user = getCurrentUser();
      if (!user) return;

      const newUsername = (document.getElementById("op-profile-username")?.value || "").trim();
      const newEmail = (document.getElementById("op-profile-email")?.value || "").trim();
      const oldPassword = (document.getElementById("op-profile-old-password")?.value || "").trim();
      const newPassword = (document.getElementById("op-profile-new-password")?.value || "").trim();
      const confirmPassword = (document.getElementById("op-profile-confirm-password")?.value || "").trim();

      const msgEl = document.getElementById("op-profile-msg");
      const showMsg = (type, text) => {
        if (!msgEl) return;
        const colors = { success: "#10b981", error: "#ef4444", info: "#3b82f6" };
        const rgba = type === "success" ? "16,185,129" : type === "error" ? "239,68,68" : "59,130,246";
        msgEl.innerHTML = `<div style="padding:10px;border-radius:8px;font-size:0.88rem;background:rgba(${rgba},0.1);border:1px solid ${colors[type]};color:${colors[type]};"><i class="fa-solid fa-circle-info"></i> ${text}</div>`;
      };

      if (!newUsername || !newEmail) { showMsg("error", "Username dan email wajib diisi."); return; }
      if (!oldPassword) { showMsg("error", "Password saat ini wajib diisi untuk menyimpan perubahan."); return; }
      if (newPassword && newPassword !== confirmPassword) { showMsg("error", "Konfirmasi password baru tidak cocok."); return; }

      const btn = document.getElementById("op-profile-save-btn");
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; }

      if (typeof supabaseSaveUser === "function") {
        supabaseSaveUser({ username: newUsername, email: newEmail, role: user.role, kelompok: user.kelompok, passwordHash: newPassword ? sha256(newPassword) : null }, user.username)
          .then(function() {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan'; }
            showMsg("success", "Profil berhasil diperbarui!");
            if (typeof setCurrentUser === "function") {
              setCurrentUser({ ...user, username: newUsername, email: newEmail });
            }
            if (document.getElementById("op-profile-card-username")) document.getElementById("op-profile-card-username").textContent = newUsername;
            if (document.getElementById("op-profile-card-email")) document.getElementById("op-profile-card-email").textContent = newEmail;
            if (document.getElementById("op-profile-old-password")) document.getElementById("op-profile-old-password").value = "";
            if (document.getElementById("op-profile-new-password")) document.getElementById("op-profile-new-password").value = "";
            if (document.getElementById("op-profile-confirm-password")) document.getElementById("op-profile-confirm-password").value = "";
          })
          .catch(function(err) {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan'; }
            showMsg("error", "Gagal: " + (err.message || err));
          });
      } else {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan'; }
        showMsg("success", "Profil diperbarui.");
      }
    }
// --- END FILE: js/ui.js ---

// --- BEGIN FILE: js/dashboard.js ---
    // DASHBOARD KPI STATS & CHARTS
    // ----------------------------------------------------
    function getFilteredJamaahForDashboard(jamaahList) {
      let list = jamaahList || [];
      // Exclude non-active Jamaah (Meninggal, Pindah Sambung, Sekolah Luar Daerah, Non-Aktif Lainnya)
      list = list.filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");

      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
      const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
      const activeKelompok = isKelompokRestricted ? currentUser.kelompok : (filterDashboardEl ? filterDashboardEl.value : "");
      
      if (activeKelompok) {
        list = list.filter(j => j.kelompokPengajian === activeKelompok);
      }
      return list;
    }

    function localIsJamaahEligibleForJenis(j, jenis) {
      const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
      const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
      const match = list.find(item => {
        const name = typeof item === 'object' ? item.nama : item;
        return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
      });
      
      if (match && typeof match === 'object') {
        const genderLimit = (match.batasan_gender || "Semua").trim().toLowerCase();
        const jamaahGender = (j.jenisKelamin || "").trim().toLowerCase();
        if (genderLimit === "laki-laki" && jamaahGender !== "laki-laki") return false;
        if (genderLimit === "perempuan" && jamaahGender !== "perempuan") return false;
        
        const targetDapuanStr = (match.target_dapuan || "").trim();
        if (targetDapuanStr) {
          const allowedDapuans = targetDapuanStr.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
          if (allowedDapuans.length > 0) {
            const jamaahDapuans = [j.dapuan];
            if (typeof getPengurusList === 'function') {
              const pList = getPengurusList() || [];
              pList.forEach(p => {
                if (p.jamaah_id === j.id && p.dapuan) {
                  jamaahDapuans.push(p.dapuan);
                }
              });
            }
            const lowerJamaahDapuans = jamaahDapuans.filter(Boolean).map(d => d.trim().toLowerCase());
            const hasMatchingDapuan = allowedDapuans.some(ad => lowerJamaahDapuans.includes(ad));
            if (!hasMatchingDapuan) return false;
          }
        }
      } else {
        const isFemaleOnly = jClean.includes("ibu") || jClean.includes("wanita") || jClean.includes("kewanitaan") || jClean.includes("akhwat");
        if (isFemaleOnly && (j.jenisKelamin || "").trim().toLowerCase() !== "perempuan") return false;
      }

      const allowedPeramutan = typeof getEligiblePeramutanForJenis === 'function' ? getEligiblePeramutanForJenis(jenis) : null;
      if (allowedPeramutan && allowedPeramutan.length > 0) {
        const peramutan = (j.kelompokPeramutan || "").trim().toLowerCase();
        return allowedPeramutan.some(p => {
          const pClean = p.toLowerCase().trim();
          if (pClean.includes("pengurus")) {
            if (typeof getPengurusList === 'function') {
              const pList = getPengurusList() || [];
              if (pClean === "pengurus") {
                return pList.some(pr => pr.jamaah_id === j.id);
              } else {
                const tingkat = pClean.replace("pengurus", "").trim();
                return pList.some(pr => pr.jamaah_id === j.id && (pr.tingkat_pengurus || "").toLowerCase() === tingkat);
              }
            }
            return false;
          }
          const isFemale = (j.jenisKelamin || "").trim().toLowerCase() === "perempuan";
          if (pClean === "ibu-ibu" || pClean === "ibuibu") {
            return isFemale && (peramutan === "dewasa" || peramutan === "manula");
          }
          if (pClean === "kewanitaan") {
            return isFemale && ["dewasa", "manula", "gus", "gum"].includes(peramutan);
          }
          return pClean === peramutan;
        });
      }

      return true;
    }

    function populateMonthFilterOptions(selectId, onChangeCallback, type = "dashboard") {
      const monthSelect = document.getElementById(selectId);
      if (!monthSelect) return;
      
      const allJadwal = getJadwalPengajianList() || [];
      
      // Get current year
      const now = new Date();
      const currentYear = now.getFullYear();
      const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Determine which years to populate (always include current year)
      const years = new Set([currentYear]);
      allJadwal.forEach(j => {
        if (j.tanggal && j.tanggal.length >= 4) {
          const y = parseInt(j.tanggal.substring(0, 4), 10);
          if (!isNaN(y)) {
            years.add(y);
          }
        }
      });
      
      // Sort years descending
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      
      // Generate options
      let htmlContent = "";
      const optionKeysParts = [];
      
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      
      if (type === "presensi") {
        htmlContent += `<option value="today">Hari Ini</option>`;
        htmlContent += `<option value="1week">1 Minggu Terakhir</option>`;
        htmlContent += `<option value="all">Semua Periode</option>`;
        optionKeysParts.push("today", "1week", "all");
      } else if (type === "monitor") {
        htmlContent += `<option value="weekly">Periode Mingguan</option>`;
        htmlContent += `<option value="">Semua Periode</option>`;
        optionKeysParts.push("weekly", "");
      }
      
      sortedYears.forEach(yr => {
        // Add "Semua Bulan [Year]" option
        htmlContent += `<option value="${yr}">Semua Bulan ${yr}</option>`;
        optionKeysParts.push(String(yr));
        
        // Add 12 months descending (Desember to Januari)
        for (let mVal = 12; mVal >= 1; mVal--) {
          const mCode = `${yr}-${String(mVal).padStart(2, '0')}`;
          const mName = monthNames[mVal - 1];
          htmlContent += `<option value="${mCode}">${mName} ${yr}</option>`;
          optionKeysParts.push(mCode);
        }
      });
      
      const optionKeys = optionKeysParts.join('|');
      
      if (monthSelect.dataset.optionKeys !== optionKeys) {
        let defaultValue = todayStr;
        if (type === "presensi") defaultValue = "today";
        
        const savedValue = monthSelect.value || defaultValue;
        
        monthSelect.innerHTML = htmlContent;
        monthSelect.dataset.optionKeys = optionKeys;
        
        if (optionKeysParts.includes(savedValue)) {
          monthSelect.value = savedValue;
        } else {
          monthSelect.value = defaultValue;
        }
        
        if (!monthSelect.dataset.listenerAdded) {
          monthSelect.addEventListener('change', onChangeCallback);
          monthSelect.dataset.listenerAdded = "true";
        }
      }
    }

    function loadDashboardKPIs() {
      populateMonthFilterOptions("dashboard-bulan-filter", () => {
        loadDashboardKPIs();
        renderDashboardCharts();
      });

      const allJamaah = getJamaahList();
      const jamaah = getFilteredJamaahForDashboard(allJamaah);
      
      const kkList = getKepalaKeluargaList().filter(kk => {
        const matchingJamaah = jamaah.find(j => j.id === kk.id);
        return !!matchingJamaah;
      });
      
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
      document.getElementById("kpi-total-paud").textContent = jamaah.filter(j => j.kelompokPeramutan === "PAUD" || j.kelompokPeramutan === "Balita").length;
      document.getElementById("kpi-total-janda").textContent = jamaah.filter(j => j.statusPernikahan === "Janda").length;

      // Calculate presence in "Teks" sessions for selected month
      try {
        const allJadwal = getJadwalPengajianList() || [];
        const allPresensi = getPresensiKehadiranList() || [];
        const monthFilterEl = document.getElementById("dashboard-bulan-filter");
        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        const currentYearMonth = monthFilterEl && monthFilterEl.value ? monthFilterEl.value : todayStr.substring(0, 7);
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
        const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
        const activeKelompok = isKelompokRestricted ? currentUser.kelompok : (filterDashboardEl ? filterDashboardEl.value : "");
        
        const eligibleTeksJamaah = jamaah.filter(j => {
          const matchesKelompok = !activeKelompok || j.kelompokPengajian === activeKelompok;
          return matchesKelompok && localIsJamaahEligibleForJenis(j, "Teks");
        });
        const eligibleTeksIds = new Set(eligibleTeksJamaah.map(j => j.id));
        
        const isConductedSessionKPI = (s) => {
          if (!s || !s.tanggal) return false;
          if (s.tanggal < todayStr) return true;
          const now = new Date();
          const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
          if (s.tanggal === todayStr) {
            return timeNow >= (s.waktu_selesai || "23:59") || allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
          }
          return allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
        };

        const teksSessions = allJadwal.filter(s => {
          if (!s || !s.tanggal) return false;
          if (!isConductedSessionKPI(s)) return false;
          const isTeks = (s.jenis_pengajian || "").trim().toLowerCase() === "teks";
          const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
          return isTeks && isCurrentMonth;
        });
        
        const teksSessionIds = new Set(teksSessions.map(s => s.id));
        const attendeeIds = new Set();
        
        allPresensi.forEach(p => {
          if (p && teksSessionIds.has(p.id_pengajian)) {
            const statusLower = (p.status || "").trim().toLowerCase();
            const isHadir = statusLower === "hadir fisik" || statusLower === "online";
            if (isHadir && p.id_jamaah && eligibleTeksIds.has(p.id_jamaah)) {
              attendeeIds.add(p.id_jamaah);
            }
          }
        });
        
        const totalTeksEligible = eligibleTeksJamaah.length;
        const pct = totalTeksEligible > 0 ? Math.round((attendeeIds.size / totalTeksEligible) * 100) : 0;
        const kpiTeks = document.getElementById("kpi-total-kehadiran-teks");
        if (kpiTeks) {
          kpiTeks.textContent = `${attendeeIds.size} (${pct}%)`;
        }
        const kpiTeksLabel = document.getElementById("kpi-label-kehadiran-teks");
        if (kpiTeksLabel) {
          const selectedOptionText = monthFilterEl && monthFilterEl.options[monthFilterEl.selectedIndex] 
            ? monthFilterEl.options[monthFilterEl.selectedIndex].text 
            : "Bulan Ini";
          kpiTeksLabel.textContent = `Kehadiran Teks (${selectedOptionText})`;
        }
      } catch (err) {
        console.error("Error calculating Teks KPI:", err);
      }

      // Calculate total pengurus
      try {
        const allPengurus = getPengurusList() || [];
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
        const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
        const activeKelompok = isKelompokRestricted ? currentUser.kelompok : (filterDashboardEl ? filterDashboardEl.value : "");
        
        let filteredPengurus = allPengurus;
        if (activeKelompok) {
          const jamaahMap = new Map(jamaah.map(j => [j.id, j]));
          filteredPengurus = allPengurus.filter(p => {
            const j = jamaahMap.get(p.jamaah_id);
            return j && j.kelompokPengajian === activeKelompok;
          });
        }
        
        // Count unique pengurus by jamaah_id
        const uniquePengurusIds = new Set(filteredPengurus.map(p => p.jamaah_id).filter(Boolean));
        const kpiPengurus = document.getElementById("kpi-total-pengurus");
        if (kpiPengurus) {
          kpiPengurus.textContent = uniquePengurusIds.size;
        }
      } catch (err) {
        console.error("Error calculating Pengurus KPI:", err);
      }
    }

    function renderDashboardCharts() {
      populateMonthFilterOptions("dashboard-bulan-filter", () => {
        loadDashboardKPIs();
        renderDashboardCharts();
      });
      let allJamaah = getJamaahList();
      
      const filterDashboardEl = document.getElementById("dashboard-kelompok-filter");
      if (filterDashboardEl && filterDashboardEl.options.length <= 1) {
         filterDashboardEl.innerHTML = '<option value="">Semua Kelompok</option>';
         const kelList = typeof getKelompokList === 'function' ? getKelompokList() : (localMasterKelompok || []);
         kelList.forEach(k => {
            const val = typeof k === 'object' && k !== null ? (k.nama || k.name || k.kelompok || String(k)) : String(k || '');
            const cleanVal = val.trim();
            if (cleanVal && cleanVal !== '[object Object]' && cleanVal !== 'undefined' && cleanVal !== 'null') {
              filterDashboardEl.innerHTML += `<option value="${cleanVal}">${cleanVal}</option>`;
            }
         });
         const currentUser = getCurrentUser();
         const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
         const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
         if (isKelompokRestricted && currentUser.kelompok) {
           filterDashboardEl.value = currentUser.kelompok;
           filterDashboardEl.disabled = true;
         }
      }
      
      let jamaah = getFilteredJamaahForDashboard(allJamaah);

      const isDark = document.body.classList.contains("dark-theme");
      const textColor = isDark ? "#9ca3af" : "#4b5563";
      const gridColor = isDark ? "rgba(16, 185, 129, 0.1)" : "#e2e8f0";
      
      const destroyChartIfExists = (canvasId) => {
        if (typeof Chart !== "undefined" && Chart.getChart) {
          const existing = Chart.getChart(canvasId);
          if (existing) {
            try { existing.destroy(); } catch (e) {}
          }
        }
      };

      // 1. Kelompok Chart
      destroyChartIfExists("chart-kelompok");
      try {
        const kelompokLabels = typeof getKelompokList === 'function' ? getKelompokList() : ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"];
        const kelompokCounts = kelompokLabels.map(k => jamaah.filter(j => String(j.kelompokPengajian || '').trim().toLowerCase() === String(k).trim().toLowerCase()).length);
        const elKelompok = document.getElementById("chart-kelompok");
        if (elKelompok) {
          charts.kelompok = new Chart(elKelompok.getContext("2d"), {
            type: "bar",
            data: {
              labels: kelompokLabels,
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
        }
      } catch (err) {
        console.error("Error rendering chart-kelompok:", err);
      }

      // 2. Ekonomi composition
      destroyChartIfExists("chart-ekonomi");
      try {
        const ekonomiCounts = ["Aghnia", "Dhuafa", "Menengah"].map(e => jamaah.filter(j => j.statusEkonomi === e).length);
        const elEkonomi = document.getElementById("chart-ekonomi");
        if (elEkonomi) {
          charts.ekonomi = new Chart(elEkonomi.getContext("2d"), {
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
        }
      } catch (err) {
        console.error("Error rendering chart-ekonomi:", err);
      }

      // 3. Pendidikan composition
      destroyChartIfExists("chart-pendidikan");
      try {
        const pendidikanLabels = (localMasterPendidikan || []).map(p => typeof p === 'object' && p !== null ? (p.nama || p.name || '') : String(p));
        const pendidikanCounts = pendidikanLabels.map(p => jamaah.filter(j => j.tingkatPendidikan === p).length);
        const elPendidikan = document.getElementById("chart-pendidikan");
        if (elPendidikan) {
          charts.pendidikan = new Chart(elPendidikan.getContext("2d"), {
            type: "doughnut",
            data: {
              labels: pendidikanLabels,
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
        }
      } catch (err) {
        console.error("Error rendering chart-pendidikan:", err);
      }

      // 4. Pekerjaan composition
      destroyChartIfExists("chart-pekerjaan");
      try {
        const pekerjaanList = (localMasterPekerjaan || []).map(p => typeof p === 'object' && p !== null ? (p.nama || p.name || '') : String(p));
        const jobsToShow = pekerjaanList.filter(p => p !== "Lainnya").slice(0, 7).concat("Lainnya");
        const pekerjaanCounts = jobsToShow.map(p => {
          if (p === "Lainnya") {
            return jamaah.filter(j => jobsToShow.indexOf(j.pekerjaanUtama) === -1 || j.pekerjaanUtama === "Lainnya").length;
          }
          return jamaah.filter(j => j.pekerjaanUtama === p).length;
        });
        
        const elPekerjaan = document.getElementById("chart-pekerjaan");
        if (elPekerjaan) {
          charts.pekerjaan = new Chart(elPekerjaan.getContext("2d"), {
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
        }
      } catch (err) {
        console.error("Error rendering chart-pekerjaan:", err);
      }

      // 5. Peramutan composition
      destroyChartIfExists("chart-peramutan");
      try {
        const peramutanOpts = ["Balita", "PAUD", "Caberawit", "GUS", "GUM", "Dewasa", "Manula"];
        const peramutanCounts = peramutanOpts.map(p => jamaah.filter(j => j.kelompokPeramutan === p).length);
        const elPeramutan = document.getElementById("chart-peramutan");
        if (elPeramutan) {
          charts.peramutan = new Chart(elPeramutan.getContext("2d"), {
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
        }
      } catch (err) {
        console.error("Error rendering chart-peramutan:", err);
      }

      // 6. Sambung composition (Tingkat Kelancaran Sambung berdasarkan rekap kehadiran 1 bulan)
      // Kategori: 51% - 100% = Lancar, 21% - 50% = Kurang Lancar, 1% - 20% / <=20% = Tidak Lancar
      destroyChartIfExists("chart-sambung");
      try {
        const kelancaranOpts = ["Lancar", "Kurang Lancar", "Tidak Lancar"];
        
        const allJadwal = typeof getJadwalPengajianList === 'function' ? (getJadwalPengajianList() || []) : (typeof localJadwalPengajian !== 'undefined' ? localJadwalPengajian : []);
        const allPresensi = typeof getPresensiKehadiranList === 'function' ? (getPresensiKehadiranList() || []) : (typeof localPresensiKehadiran !== 'undefined' ? localPresensiKehadiran : []);
        
        const monthFilterEl = document.getElementById("dashboard-bulan-filter");
        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        const now = new Date();
        const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
        const currentYearMonth = monthFilterEl && monthFilterEl.value ? monthFilterEl.value : todayStr.substring(0, 7);

        const isConductedSessionChart = (s) => {
          if (!s || !s.tanggal) return false;
          if (s.tanggal < todayStr) return true;
          if (s.tanggal === todayStr) {
            return timeNow >= (s.waktu_selesai || "23:59") || allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
          }
          return allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
        };

        const monthSessions = allJadwal.filter(s => s && s.tanggal && s.tanggal.startsWith(currentYearMonth) && isConductedSessionChart(s));

        // Build presensi lookup set: key = `${id_pengajian}_${id_jamaah}`
        const presensiSet = new Set();
        allPresensi.forEach(p => {
          if (p && p.id_pengajian && p.id_jamaah) {
            const statusLower = (p.status || "").trim().toLowerCase();
            if (statusLower === "hadir fisik" || statusLower === "online" || statusLower === "hadir") {
              presensiSet.add(`${String(p.id_pengajian).trim()}_${String(p.id_jamaah).trim()}`);
            }
          }
        });

        let countLancar = 0;
        let countKurangLancar = 0;
        let countTidakLancar = 0;

        jamaah.forEach(j => {
          // Find sessions in month filter that apply to this jamaah
          const eligibleSessions = monthSessions.filter(s => {
            if (!localIsJamaahEligibleForJenis(j, s.jenis_pengajian)) return false;

            const sessionKelompok = (s.kelompok_pengajian || "").trim();
            if (sessionKelompok && sessionKelompok !== "Semua" && sessionKelompok !== "Desa" && sessionKelompok !== "Daerah") {
              if (j.kelompokPengajian !== sessionKelompok) return false;
            }
            return true;
          });

          if (eligibleSessions.length === 0) {
            // Jika tidak ada sesi dalam bulan ini untuk jamaah tersebut
            countTidakLancar++;
          } else {
            let attendedCount = 0;
            eligibleSessions.forEach(s => {
              if (presensiSet.has(`${String(s.id).trim()}_${String(j.id).trim()}`)) {
                attendedCount++;
              }
            });

            const pct = Math.round((attendedCount / eligibleSessions.length) * 100);

            if (pct > 50) {
              countLancar++;
            } else if (pct >= 21) {
              countKurangLancar++;
            } else {
              countTidakLancar++;
            }
          }
        });

        const sambungCounts = [countLancar, countKurangLancar, countTidakLancar];

        const elSambung = document.getElementById("chart-sambung");
        if (elSambung) {
          charts.sambung = new Chart(elSambung.getContext("2d"), {
            type: "bar",
            data: {
              labels: kelancaranOpts,
              datasets: [{
                label: "Jumlah Jamaah",
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
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const val = context.raw || 0;
                      const total = sambungCounts.reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                      return ` ${val} Jamaah (${pct}%)`;
                    }
                  }
                }
              },
              scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
                x: { ticks: { color: textColor }, grid: { display: false } }
              }
            }
          });
        }
      } catch (err) {
        console.error("Error rendering chart-sambung:", err);
      }
      loadDashboardKPIs();
    }

    // ----------------------------------------------------
    // LAPORAN & REKAP (ECONOMIC & DAPUAN BREAKDOWN)
    // ----------------------------------------------------
    function populateReportFilterOptions() {
      const repFilter = document.getElementById("report-filter-kelompok");
      if (!repFilter) return;
      const savedVal = repFilter.value;
      repFilter.innerHTML = '<option value="">-- Semua Kelompok (PC Pondok Melati) --</option>';
      
      const kelList = (typeof getKelompokList === 'function' ? getKelompokList() : (Array.isArray(localMasterKelompok) ? localMasterKelompok : []))
        .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
        .map(k => k.trim())
        .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]');
      
      const uniqueList = Array.from(new Set(kelList));
      uniqueList.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        repFilter.appendChild(opt);
      });
      
      const curUser = getCurrentUser();
      const curRoleClean = curUser ? (curUser.role || "").trim().toLowerCase() : "";
      const isKelompokRestricted = curUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
      if (isKelompokRestricted) {
        repFilter.value = curUser.kelompok;
        repFilter.disabled = true;
      } else {
        if (savedVal && uniqueList.includes(savedVal)) {
          repFilter.value = savedVal;
        } else {
          repFilter.value = "";
        }
        repFilter.disabled = false;
      }
      
      populateMonthFilterOptions("report-filter-bulan", () => {
        calculateAndRenderReport();
      });
    }

    function calculateAndRenderReport() {
      populateMonthFilterOptions("report-filter-bulan", () => {
        calculateAndRenderReport();
      });
      const repFilterEl = document.getElementById("report-filter-kelompok");
      const selectedKelompok = repFilterEl ? (repFilterEl.value || "").trim().toLowerCase() : "";
      const jamaah = getJamaahList().filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
      const filtered = selectedKelompok === "" ? jamaah : jamaah.filter(j => String(j.kelompokPengajian || "").trim().toLowerCase() === selectedKelompok);
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
      
      const allPengurus = getPengurusList() || [];
      const pengurusWithJamaah = allPengurus.map(p => {
        const j = jamaah.find(x => x.id === p.jamaah_id);
        return {
          ...p,
          kelompok: j ? j.kelompokPengajian : null
        };
      }).filter(p => p.kelompok !== null);

      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      const isOperator = curRoleClean.includes("operator");

      let filteredPengurusList = selectedKelompok === "" 
        ? pengurusWithJamaah 
        : pengurusWithJamaah.filter(p => p.kelompok === selectedKelompok);

      if (currentUser && isOperator) {
        filteredPengurusList = pengurusWithJamaah.filter(p => p.kelompok === currentUser.kelompok);
      }

      const totalFilteredPengurus = filteredPengurusList.length;

      // Header for Dapuan
      const headerDapuan = document.createElement("tr");
      headerDapuan.innerHTML = `
        <td colspan="3" style="background: rgba(59, 130, 246, 0.08); font-weight: bold; text-align: center; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; color: #3b82f6; border-bottom: 2px solid rgba(59, 130, 246, 0.2);">
          Rekapitulasi Berdasarkan Dapuan
        </td>
      `;
      tbodyDapuan.appendChild(headerDapuan);

      let totalDapuanCount = 0;
      localMasterDapuan.forEach(dapuan => {
        const count = filteredPengurusList.filter(p => p.dapuan === dapuan).length;
        const ratio = totalFilteredPengurus > 0 ? ((count / totalFilteredPengurus) * 100).toFixed(1) : 0;
        const isCoreRole = ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS"].includes(dapuan);
        if (count > 0 || isCoreRole) {
          totalDapuanCount += count;
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

      // Append Total Row for Dapuan (v2.2)
      const trTotalDapuan = document.createElement("tr");
      trTotalDapuan.style.fontWeight = "bold";
      trTotalDapuan.style.background = "rgba(59, 130, 246, 0.04)";
      trTotalDapuan.innerHTML = `
        <td>Total Jumlah</td>
        <td>${totalDapuanCount} Orang</td>
        <td>100.0%</td>
      `;
      tbodyDapuan.appendChild(trTotalDapuan);

      // Header for Tingkat
      const headerTingkat = document.createElement("tr");
      headerTingkat.innerHTML = `
        <td colspan="3" style="background: rgba(139, 92, 246, 0.08); font-weight: bold; text-align: center; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; color: #8b5cf6; border-bottom: 2px solid rgba(139, 92, 246, 0.2); border-top: 1px solid var(--border-color);">
          Rekapitulasi Berdasarkan Tingkat Pengurus
        </td>
      `;
      tbodyDapuan.appendChild(headerTingkat);

      const tingkatList = ["Daerah", "Desa", "Kelompok", "Organisasi", "Yayasan"];
      let totalTingkatCount = 0;
      tingkatList.forEach(tingkat => {
        const count = filteredPengurusList.filter(p => p.tingkat_pengurus === tingkat).length;
        totalTingkatCount += count;
      });

      tingkatList.forEach(tingkat => {
        const count = filteredPengurusList.filter(p => p.tingkat_pengurus === tingkat).length;
        const ratio = totalTingkatCount > 0 ? ((count / totalTingkatCount) * 100).toFixed(1) : 0;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>Tingkat ${tingkat}</strong></td>
          <td>${count} Orang</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="progress-container" style="width:70px; margin-top:0;"><div class="progress-bar" style="width: ${ratio}%; background:#8b5cf6;"></div></div>
              <span>${ratio}%</span>
            </div>
          </td>
        `;
        tbodyDapuan.appendChild(tr);
      });

      // Append Total Row for Tingkat (v2.2)
      const trTotalTingkat = document.createElement("tr");
      trTotalTingkat.style.fontWeight = "bold";
      trTotalTingkat.style.background = "rgba(139, 92, 246, 0.04)";
      trTotalTingkat.innerHTML = `
        <td>Total Jumlah</td>
        <td>${totalTingkatCount} Orang</td>
        <td>100.0%</td>
      `;
      tbodyDapuan.appendChild(trTotalTingkat);

      // --- KEHADIRAN PENGAJIAN GAUGES (Bulan Ini) - (v2.2) ---
      try {
        const monthFilterEl = document.getElementById("report-filter-bulan");
        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        const now = new Date();
        const timeNow = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
        const currentYearMonth = monthFilterEl && monthFilterEl.value ? monthFilterEl.value : todayStr.substring(0, 7);
        
        const allJadwal = getJadwalPengajianList() || [];
        const allPresensi = getPresensiKehadiranList() || [];

        const isConductedSessionGauge = (s) => {
          if (!s || !s.tanggal) return false;
          if (s.tanggal < todayStr) return true;
          if (s.tanggal === todayStr) {
            return timeNow >= (s.waktu_selesai || "23:59") || allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
          }
          return allPresensi.some(p => p && String(p.id_pengajian) === String(s.id));
        };
        
        // --- 1. Pengajian Sambung (Tingkat Daerah, Desa, Kelompok) ---
        const calculateSambungForTingkat = (tingkatKey) => {
          const sessions = allJadwal.filter(s => {
            if (!s || !s.tanggal || !s.jenis_pengajian || !s.tingkat_pengajian) return false;
            if (!isConductedSessionGauge(s)) return false;
            const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
            const isSambung = s.jenis_pengajian.trim().toLowerCase() === "sambung";
            const tkLower = s.tingkat_pengajian.toLowerCase();
            const isTargetTingkat = tkLower.includes(tingkatKey);
            
            if (selectedKelompok) {
              const isDaerahOrDesa = tkLower.includes("daerah") || tkLower.includes("desa");
              const matchesKelompok = s.kelompok_pengajian === selectedKelompok || s.kelompok_pengajian === "Semua";
              return isCurrentMonth && isSambung && isTargetTingkat && (isDaerahOrDesa || matchesKelompok);
            }
            return isCurrentMonth && isSambung && isTargetTingkat;
          });
          
          let totalSlots = 0;
          let totalHadir = 0;
          
          sessions.forEach(session => {
            let sessionTargets = jamaah.filter(j => localIsJamaahEligibleForJenis(j, session.jenis_pengajian));
            
            if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
              sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
            }
            
            if (selectedKelompok) {
              sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === selectedKelompok);
            }
            
            if (sessionTargets.length === 0) return;
            
            const sessionPresensi = allPresensi.filter(p => p.id_pengajian == session.id);
            const targetIds = new Set(sessionTargets.map(j => j.id));
            
            let hadirCount = 0;
            sessionPresensi.forEach(p => {
              if (p.id_jamaah && targetIds.has(p.id_jamaah)) {
                const statusLower = (p.status || "").trim().toLowerCase();
                if (statusLower === "hadir fisik" || statusLower === "online") {
                  hadirCount++;
                }
              }
            });
            
            totalSlots += sessionTargets.length;
            totalHadir += hadirCount;
          });
          
          return {
            percentage: totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0,
            hadir: totalHadir,
            total: totalSlots,
            sessionsCount: sessions.length
          };
        };

        const calculateKehadiranForJenis = (jenisKey) => {
          const cleanTarget = jenisKey.toLowerCase().replace(/[^a-z0-9]/g, '');
          const sessions = allJadwal.filter(s => {
            if (!s || !s.tanggal || !s.jenis_pengajian) return false;
            if (!isConductedSessionGauge(s)) return false;
            const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
            const cleanJenis = s.jenis_pengajian.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const isTargetJenis = cleanJenis === cleanTarget;
            
            if (selectedKelompok) {
              const tkLower = (s.tingkat_pengajian || "").toLowerCase();
              const isDaerahOrDesa = tkLower.includes("daerah") || tkLower.includes("desa");
              const matchesKelompok = s.kelompok_pengajian === selectedKelompok || s.kelompok_pengajian === "Semua";
              return isCurrentMonth && isTargetJenis && (isDaerahOrDesa || matchesKelompok);
            }
            return isCurrentMonth && isTargetJenis;
          });
          
          let totalSlots = 0;
          let totalHadir = 0;
          
          sessions.forEach(session => {
            let sessionTargets = jamaah.filter(j => localIsJamaahEligibleForJenis(j, session.jenis_pengajian));
            
            if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
              sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
            }
            
            if (selectedKelompok) {
              sessionTargets = sessionTargets.filter(j => j.kelompokPengajian === selectedKelompok);
            }
            
            if (sessionTargets.length === 0) return;
            
            const sessionPresensi = allPresensi.filter(p => p.id_pengajian == session.id);
            const targetIds = new Set(sessionTargets.map(j => j.id));
            
            let hadirCount = 0;
            sessionPresensi.forEach(p => {
              if (p.id_jamaah && targetIds.has(p.id_jamaah)) {
                const statusLower = (p.status || "").trim().toLowerCase();
                if (statusLower === "hadir fisik" || statusLower === "online") {
                  hadirCount++;
                }
              }
            });
            
            totalSlots += sessionTargets.length;
            totalHadir += hadirCount;
          });
          
          return {
            percentage: totalSlots > 0 ? Math.round((totalHadir / totalSlots) * 100) : 0,
            hadir: totalHadir,
            total: totalSlots,
            sessionsCount: sessions.length
          };
        };

        const resDaerah = calculateSambungForTingkat("daerah");
        const resDesa = calculateSambungForTingkat("desa");
        const resKelompok = calculateSambungForTingkat("kelompok");
        
        // --- 2. Pengajian Teks (Unique Attendee per Month) ---
        const teksSessions = allJadwal.filter(s => {
          if (!s || !s.tanggal || !s.jenis_pengajian) return false;
          if (!isConductedSessionGauge(s)) return false;
          const isCurrentMonth = s.tanggal.startsWith(currentYearMonth);
          const isTeks = s.jenis_pengajian.trim().toLowerCase() === "teks";
          
          if (selectedKelompok) {
            const tkLower = (s.tingkat_pengajian || "").toLowerCase();
            const isDaerahOrDesa = tkLower.includes("daerah") || tkLower.includes("desa");
            const matchesKelompok = s.kelompok_pengajian === selectedKelompok || s.kelompok_pengajian === "Semua";
            return isCurrentMonth && isTeks && (isDaerahOrDesa || matchesKelompok);
          }
          return isCurrentMonth && isTeks;
        });
        
        const teksSessionIds = new Set(teksSessions.map(s => s.id));
        const attendedTeksJamaahIds = new Set();
        
        let eligibleTeksJamaah = jamaah.filter(j => localIsJamaahEligibleForJenis(j, "Teks"));
        if (selectedKelompok) {
          eligibleTeksJamaah = eligibleTeksJamaah.filter(j => j.kelompokPengajian === selectedKelompok);
        }
        
        const eligibleTeksIds = new Set(eligibleTeksJamaah.map(j => j.id));
        
        allPresensi.forEach(p => {
          if (p && p.id_jamaah && teksSessionIds.has(p.id_pengajian) && eligibleTeksIds.has(p.id_jamaah)) {
            const statusLower = (p.status || "").trim().toLowerCase();
            if (statusLower === "hadir fisik" || statusLower === "online") {
              attendedTeksJamaahIds.add(p.id_jamaah);
            }
          }
        });
        
        const totalTeksEligible = eligibleTeksJamaah.length;
        const totalTeksHadir = attendedTeksJamaahIds.size;
        const pctTeks = totalTeksEligible > 0 ? Math.round((totalTeksHadir / totalTeksEligible) * 100) : 0;
        
        // --- 3. Render Gauges ---
        const renderGauge = (containerId, value, count, total, label, color, sessionsCount) => {
          const container = document.getElementById(containerId);
          if (!container) return;
          
          container.innerHTML = `
            <div class="gauge-card" style="text-align: center; background: var(--bg-card); padding: 15px 20px; border-radius: 12px; border: 1px solid var(--border-color); width: 220px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
              <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.92rem; font-weight: 600; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.03em;">${label}</h4>
              <div style="position: relative; width: 150px; height: 80px; margin: 0 auto 5px;">
                <svg width="150" height="80" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-color)" stroke-width="8" stroke-linecap="round"/>
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
                        stroke-dasharray="125.6" stroke-dashoffset="${125.6 - (125.6 * value / 100)}" style="transition: stroke-dashoffset 1s ease-out;"/>
                </svg>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center;">
                  <span style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${value}%</span>
                </div>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                Hadir: <strong>${count}</strong> / ${total}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                Sesi: <strong>${sessionsCount || 0} Sesi</strong>
              </div>
            </div>
          `;
        };
        
        const resGUM = calculateKehadiranForJenis("GUM");
        const resCaberawit = calculateKehadiranForJenis("Caberawit");
        const resGUS = calculateKehadiranForJenis("GUS");
        const resIbuIbu = calculateKehadiranForJenis("Ibu-ibu");
        const resPengurus = calculateKehadiranForJenis("Pengurus");
        const res5Unsur = calculateKehadiranForJenis("5 Unsur");

        const selectedOptionText = monthFilterEl && monthFilterEl.options[monthFilterEl.selectedIndex] 
          ? monthFilterEl.options[monthFilterEl.selectedIndex].text 
          : "Bulan Berjalan";
        const kpiTitleRekapKehadiran = document.getElementById("kpi-title-rekap-kehadiran");
        if (kpiTitleRekapKehadiran) {
          kpiTitleRekapKehadiran.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Rekap Kehadiran Pengajian (${selectedOptionText})`;
        }

        renderGauge("gauge-sambung-daerah-container", resDaerah.percentage, resDaerah.hadir, resDaerah.total, "Sambung Daerah", "#0ea5e9", resDaerah.sessionsCount);
        renderGauge("gauge-sambung-desa-container", resDesa.percentage, resDesa.hadir, resDesa.total, "Sambung Desa", "#10b981", resDesa.sessionsCount);
        renderGauge("gauge-sambung-kelompok-container", resKelompok.percentage, resKelompok.hadir, resKelompok.total, "Sambung Kelompok", "#f59e0b", resKelompok.sessionsCount);
        renderGauge("gauge-teks-container", pctTeks, totalTeksHadir, totalTeksEligible, "Pengajian Teks", "#8b5cf6", teksSessions.length);
        renderGauge("gauge-gum-container", resGUM.percentage, resGUM.hadir, resGUM.total, "Pengajian GUM", "#ec4899", resGUM.sessionsCount);
        renderGauge("gauge-caberawit-container", resCaberawit.percentage, resCaberawit.hadir, resCaberawit.total, "Pengajian Caberawit", "#14b8a6", resCaberawit.sessionsCount);
        renderGauge("gauge-gus-container", resGUS.percentage, resGUS.hadir, resGUS.total, "Pengajian GUS", "#f43f5e", resGUS.sessionsCount);
        renderGauge("gauge-ibu-ibu-container", resIbuIbu.percentage, resIbuIbu.hadir, resIbuIbu.total, "Pengajian Ibu-Ibu", "#a855f7", resIbuIbu.sessionsCount);
        renderGauge("gauge-pengurus-container", resPengurus.percentage, resPengurus.hadir, resPengurus.total, "Pengajian Pengurus", "#3b82f6", resPengurus.sessionsCount);
        renderGauge("gauge-5-unsur-container", res5Unsur.percentage, res5Unsur.hadir, res5Unsur.total, "Pengajian 5 Unsur", "#ef4444", res5Unsur.sessionsCount);
        
      } catch (err) {
        console.error("Error calculating reports gauges:", err);
      }
    }

    function exportReportToCSV() {
      const repFilterEl = document.getElementById("report-filter-kelompok");
      const selectedKelompok = repFilterEl ? (repFilterEl.value || "").trim() : "";
      const groupLabel = selectedKelompok === "" ? "Semua Kelompok" : selectedKelompok;
      const jamaah = getJamaahList();
      const filtered = selectedKelompok === "" ? jamaah : jamaah.filter(j => String(j.kelompokPengajian || '').trim().toLowerCase() === selectedKelompok.toLowerCase());
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `AJI V.1 REPORT - REKAPITULASI DATA JAMAAH\r\n`;
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
      if (!filterK) return;
      const savedSelK = filterK.value;
      filterK.innerHTML = '<option value="">-- Semua Kelompok --</option>';
      
      const kelList = typeof getKelompokList === 'function' ? getKelompokList() : (localMasterKelompok || []);
      kelList.forEach(k => {
        const val = typeof k === 'object' && k !== null ? (k.nama || k.name || k.kelompok || String(k)) : String(k || '');
        const cleanVal = val.trim();
        if (cleanVal && cleanVal !== '[object Object]' && cleanVal !== 'undefined' && cleanVal !== 'null') {
          const opt = document.createElement("option");
          opt.value = cleanVal;
          opt.textContent = cleanVal;
          filterK.appendChild(opt);
        }
      });
      
      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      if (currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok") && currentUser.kelompok) {
        filterK.value = currentUser.kelompok;
        filterK.disabled = true; // Lock down groups selection
      } else {
        if (savedSelK) filterK.value = savedSelK;
        filterK.disabled = false;
      }
      
      // Dapuan Filter
      const filterD = document.getElementById("filter-dapuan");
      const savedSelD = filterD.value;
      filterD.innerHTML = `
        <option value="">Semua Jamaah</option>
        <option value="Semua Tingkat">Semua Tingkat (Pengurus)</option>
        <option value="Tingkat Daerah">Tingkat Daerah</option>
        <option value="Tingkat Desa">Tingkat Desa</option>
        <option value="Tingkat Kelompok">Tingkat Kelompok</option>
        <option value="Tingkat Organisasi">Tingkat Organisasi</option>
        <option value="Tingkat Yayasan">Tingkat Yayasan</option>
      `;
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
      const statusKeaktifanEl = document.getElementById("filter-status-keaktifan");
      const statusKeaktifanVal = statusKeaktifanEl ? statusKeaktifanEl.value : "Aktif";
      
      const list = getJamaahList();
      filteredJamaahList = list.filter(j => {
        const matchSearch = j.namaLengkap.toLowerCase().includes(searchVal) || j.id.toLowerCase().includes(searchVal);
        const matchKelompok = kelompokVal === "" || String(j.kelompokPengajian || '').trim().toLowerCase() === String(kelompokVal || '').trim().toLowerCase();
        let matchPeramutan = true;
        if (peramutanVal !== "") {
          if (peramutanVal === "PAUD & Balita" || peramutanVal === "PAUD dan Balita" || peramutanVal === "PAUD" || peramutanVal === "Balita" || peramutanVal === "PAUD_BALITA") {
            matchPeramutan = j.kelompokPeramutan === "PAUD" || j.kelompokPeramutan === "Balita";
          } else {
            matchPeramutan = j.kelompokPeramutan === peramutanVal;
          }
        }
        const matchEkonomi = ekonomiVal === "" || j.statusEkonomi === ekonomiVal;
        let matchDapuan = true;
        if (dapuanVal) {
          const allPengurus = getPengurusList() || [];
          if (dapuanVal === "Semua Tingkat") {
            const pengurusIds = new Set(allPengurus.map(p => p.jamaah_id).filter(Boolean));
            matchDapuan = pengurusIds.has(j.id);
          } else {
            const tingkat = dapuanVal.replace("Tingkat ", "");
            const pengurusIds = new Set(
              allPengurus
                .filter(p => p.tingkat_pengurus === tingkat)
                .map(p => p.jamaah_id)
                .filter(Boolean)
            );
            matchDapuan = pengurusIds.has(j.id);
          }
        }
        
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

        let matchStatusKeaktifan = true;
        if (statusKeaktifanVal !== "") {
          const curStatus = (j.statusKeaktifan || "Aktif").trim();
          matchStatusKeaktifan = curStatus.toLowerCase() === statusKeaktifanVal.toLowerCase();
        }
        
        return matchSearch && matchKelompok && matchPeramutan && matchEkonomi && matchDapuan && matchKelancaran && matchStatusKeaktifan;
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
          
        const statusKeaktifan = j.statusKeaktifan || "Aktif";
        let statusBadgeHtml = "";
        if (statusKeaktifan !== "Aktif") {
          let bClass = "badge-gray";
          if (statusKeaktifan === "Meninggal") bClass = "badge-red";
          else if (statusKeaktifan === "Pindah Sambung") bClass = "badge-yellow";
          else if (statusKeaktifan === "Sekolah/Kuliah Luar Daerah") bClass = "badge-blue";
          
          const ketText = j.keteranganStatus ? ` (${j.keteranganStatus})` : "";
          statusBadgeHtml = `<br><span class="badge ${bClass}" style="font-size:0.68rem; margin-top:3px; display:inline-block;" title="${statusKeaktifan}${ketText}"><i class="fa-solid fa-user-slash"></i> ${statusKeaktifan}</span>`;
        }

        tr.innerHTML = `
          <td><strong>${j.id}</strong></td>
          <td>${j.namaLengkap}${statusBadgeHtml}</td>
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

          // Status Keaktifan edit fields (Only visible on EDIT mode)
          const grpStatus = document.getElementById("form-group-status-keaktifan");
          const grpKet = document.getElementById("form-group-keterangan-status");
          if (grpStatus) grpStatus.style.display = "";
          if (grpKet) grpKet.style.display = "";
          const elStatus = document.getElementById("form-status-keaktifan");
          const elKet = document.getElementById("form-keterangan-status");
          if (elStatus) elStatus.value = item.statusKeaktifan || "Aktif";
          if (elKet) elKet.value = item.keteranganStatus || "";

          document.getElementById("form-foto-url").value = item.fotoUrl || "";
          const previewImg = document.getElementById("form-foto-preview");
          const placeholder = document.getElementById("form-foto-placeholder");
          document.getElementById("form-foto").value = "";
          if (item.fotoUrl) {
            previewImg.src = item.fotoUrl;
            previewImg.style.display = "block";
            placeholder.style.display = "none";
          } else {
            previewImg.style.display = "none";
            placeholder.style.display = "block";
          }

          updateFormKKState();
        }
      } else {
        document.getElementById("modal-title").innerHTML = `<i class="fa-solid fa-user-plus"></i> Tambah Data Jamaah Baru`;
        document.getElementById("form-id").value = "";
        document.getElementById("form-umur").value = "0";
        document.getElementById("form-peramutan").value = "-";
        
        // Hide Status Keaktifan on NEW creation mode (Default is 'Aktif')
        const grpStatus = document.getElementById("form-group-status-keaktifan");
        const grpKet = document.getElementById("form-group-keterangan-status");
        if (grpStatus) grpStatus.style.display = "none";
        if (grpKet) grpKet.style.display = "none";
        const elStatus = document.getElementById("form-status-keaktifan");
        const elKet = document.getElementById("form-keterangan-status");
        if (elStatus) elStatus.value = "Aktif";
        if (elKet) elKet.value = "";
        
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
        document.getElementById("form-foto-url").value = "";
        document.getElementById("form-foto").value = "";
        document.getElementById("form-foto-preview").style.display = "none";
        document.getElementById("form-foto-placeholder").style.display = "block";

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
      fillSelectWithOptions(document.getElementById("form-dapuan"), ["Pengurus", "MT", "MS", "Rokyah Biasa"], "Dapuan");
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
        const kelList = typeof getKelompokList === 'function' ? getKelompokList() : (localMasterKelompok || []);
        let idx = 0;
        kelList.forEach(k => {
          const val = typeof k === 'object' && k !== null ? (k.nama || k.name || k.kelompok || String(k)) : String(k || '');
          const cleanVal = val.trim();
          if (cleanVal && cleanVal !== '[object Object]' && cleanVal !== 'undefined' && cleanVal !== 'null') {
            const label = document.createElement("label");
            label.className = "radio-label";
            label.innerHTML = `<input type="radio" name="form-kelompok" value="${cleanVal}" ${idx === 0 ? "checked" : ""}> ${cleanVal}`;
            radioGroup.appendChild(label);
            label.querySelector("input").addEventListener("change", (e) => {
              populateFormKKDropdown(e.target.value);
            });
            idx++;
          }
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
      if (!kkFilter) return;
      const savedVal = kkFilter.value;
      kkFilter.innerHTML = `<option value="">-- Pilih Kelompok --</option>`;
      
      const kelList = typeof getKelompokList === 'function' ? getKelompokList() : (localMasterKelompok || []);
      kelList.forEach(k => {
        const val = typeof k === 'object' && k !== null ? (k.nama || k.name || k.kelompok || String(k)) : String(k || '');
        const cleanVal = val.trim();
        if (cleanVal && cleanVal !== '[object Object]' && cleanVal !== 'undefined' && cleanVal !== 'null') {
          const opt = document.createElement("option");
          opt.value = cleanVal;
          opt.textContent = cleanVal;
          kkFilter.appendChild(opt);
        }
      });
      
      const curUser = getCurrentUser();
      const curRoleClean = curUser ? (curUser.role || "").trim().toLowerCase() : "";
      if (curUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok") && curUser.kelompok) {
        kkFilter.value = curUser.kelompok;
        kkFilter.disabled = true;
      } else {
        if (savedVal) kkFilter.value = savedVal;
        kkFilter.disabled = false;
      }
    }

    function populateKKList() {
      const selectedKelompok = document.getElementById("kk-filter-kelompok").value;
      const list = getKepalaKeluargaList();
      const filtered = selectedKelompok === "" ? list : list.filter(kk => String(kk.kelompokPengajian || '').trim().toLowerCase() === String(selectedKelompok).trim().toLowerCase());
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
      
      // 0. Populate photo
      const avatarImg = document.getElementById("view-j-avatar-img");
      const avatarPlaceholder = document.getElementById("view-j-avatar-placeholder");
      if (item.fotoUrl) {
        avatarImg.src = item.fotoUrl;
        avatarImg.style.display = "block";
        avatarPlaceholder.style.display = "none";
      } else {
        avatarImg.style.display = "none";
        avatarPlaceholder.style.display = "block";
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
        if (typeof isJamaahEligibleForSchedule === 'function') {
          return isJamaahEligibleForSchedule(jamaah, session);
        }
        
        // Fallback
        if (session.tingkat_pengajian === "Kelompok" && session.kelompok_pengajian !== jamaah.kelompokPengajian) {
          return false;
        }
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
          if (allowed.length > 0 && !allowed.includes((jamaah.kelompokPeramutan || "").toLowerCase())) {
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
      if (!select) return;
      const savedVal = select.value;
      select.innerHTML = '<option value="">Semua Kelompok</option>';
      const rawList = typeof getKelompokList === 'function' ? getKelompokList() : (Array.isArray(localMasterKelompok) ? localMasterKelompok : []);
      const list = Array.from(new Set(
        rawList
          .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
          .map(k => k.trim())
          .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]')
      ));
      list.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        select.appendChild(opt);
      });
      if (savedVal && list.includes(savedVal)) {
        select.value = savedVal;
      } else {
        select.value = "";
      }
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
        if (kelompokVal && String(u.kelompok || '').trim().toLowerCase() !== kelompokVal) {
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
      if (!select) return;
      select.innerHTML = '<option value="" disabled selected>-- Pilih Kelompok --</option>';
      const rawList = typeof getKelompokList === 'function' ? getKelompokList() : (Array.isArray(localMasterKelompok) ? localMasterKelompok : []);
      const list = Array.from(new Set(
        rawList
          .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
          .map(k => k.trim())
          .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]')
      ));
      list.forEach(k => {
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
        const curVal = filter.value;
        filter.innerHTML = '<option value="">Semua Kelompok Pengajian</option>';
        const rawList = typeof getKelompokList === 'function' ? getKelompokList() : (Array.isArray(localMasterKelompok) ? localMasterKelompok : []);
        const list = Array.from(new Set(
          rawList
            .map(k => typeof k === 'object' && k !== null ? (k.nama || k.name || k.kelompok || String(k)) : String(k || ''))
            .map(k => k.trim())
            .filter(val => val && val !== 'undefined' && val !== 'null' && val !== '[object Object]')
        ));
        list.forEach(val => {
          filter.innerHTML += `<option value="${val}">${val}</option>`;
        });
        
        const currentUser = getCurrentUser();
        const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
        const isOperator = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";
        if (currentUser && isOperator && currentUser.kelompok) {
          filter.value = currentUser.kelompok;
          filter.disabled = true;
        } else {
          if (curVal && list.includes(curVal)) {
            filter.value = curVal;
          } else {
            filter.value = "";
          }
          filter.disabled = false;
        }
      }

window.getEligiblePeramutanForJenis = function(jenis) {
  const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
  
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  const match = list.find(item => {
    const name = typeof item === 'object' ? item.nama : item;
    return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
  });
  
  if (match && typeof match === 'object') {
    if (match.peserta_pengajian) {
      return match.peserta_pengajian.split(",").map(p => p.trim()).filter(Boolean);
    }
    return [];
  }
  
  if (jClean === "ibu-ibu" || jClean === "ibu--ibu" || jClean === "ibuibu") {
    return ["Dewasa", "Manula"];
  }
  if (jClean === "kewanitaan") {
    return ["Dewasa", "Manula", "GUS", "GUM"];
  }
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
  
  return null;
};

window.getScheduleParticipantText = function(sched) {
  if (!sched) return "";
  if (sched.peserta_spesifik) {
    const ids = sched.peserta_spesifik.split(",").map(x => x.trim()).filter(Boolean);
    if (ids.length > 0) {
      const allJ = typeof getJamaahList === 'function' ? getJamaahList() : [];
      const names = ids.map(id => {
        const jObj = allJ.find(x => x.id === id);
        return jObj ? jObj.namaLengkap : id;
      });
      return `Undangan: ${names.join(", ")}`;
    }
  }
  
  const jClean = (sched.jenis_pengajian || "").trim().toLowerCase().replace(/\s+/g, '');
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  const match = list.find(item => {
    const name = typeof item === 'object' ? item.nama : item;
    return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
  });
  
  let parts = [];
  if (match && typeof match === 'object') {
    if (match.peserta_pengajian) {
      parts.push(match.peserta_pengajian);
    }
    if (match.batasan_gender && match.batasan_gender !== "Semua") {
      parts.push(match.batasan_gender);
    }
    if (match.target_dapuan) {
      parts.push(`Dapuan: ${match.target_dapuan}`);
    }
  } else {
    const peramutans = window.getEligiblePeramutanForJenis(sched.jenis_pengajian);
    if (peramutans && peramutans.length > 0) {
      parts.push(peramutans.join(", "));
    }
  }
  
  if (parts.length > 0) {
    return parts.join(" (") + (parts.length > 1 ? ")" : "");
  }
  return "Semua Jamaah";
};

window.isJamaahEligibleForSchedule = function(j, s) {
  if (!j || !s) return false;
  
  const tk = String(s.tingkat_pengajian || '').toLowerCase();
  const isKelompok = tk.includes('kelompok') || (!tk.includes('desa') && !tk.includes('daerah'));
  if (isKelompok) {
    const sk = String(s.kelompok_pengajian || '').trim().toLowerCase();
    const jk = String(j.kelompokPengajian || '').trim().toLowerCase();
    if (sk !== jk) {
      return false;
    }
  }
  
  if (s.peserta_spesifik) {
    const allowedIds = s.peserta_spesifik.split(",").map(id => id.trim()).filter(Boolean);
    if (allowedIds.length > 0) {
      return allowedIds.includes(j.id);
    }
  }
  
  if (typeof isJamaahEligibleForJenis === 'function') {
    return isJamaahEligibleForJenis(j, s.jenis_pengajian);
  }
  return true;
};


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
                  <button class="btn-icon edit" style="padding: 2px 6px; font-size: 0.75rem;" title="Edit Dapuan" onclick="showEditPengurusModal('${role.id}')"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn-icon delete" style="padding: 2px 6px; font-size: 0.75rem;" title="Hapus Dapuan" onclick="deletePengurus('${role.id}')"><i class="fa-solid fa-trash"></i></button>
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
        let availableJamaah = getJamaahList().filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
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
              
              fetchDatabaseFromServer(function() {
                if (document.getElementById("section-pengurus") && document.getElementById("section-pengurus").classList.contains("active")) {
                  renderPengurusTable();
                }
              });
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
              
              fetchDatabaseFromServer(function() {
                if (document.getElementById("section-pengurus") && document.getElementById("section-pengurus").classList.contains("active")) {
                  renderPengurusTable();
                }
              });
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
              <thead><tr><th style="width: 25%;">Tingkat</th><th style="width: 35%;">Dapuan</th><th style="width: 40%;">Nama Jamaah</th></tr></thead>
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
let attendanceTrendChart = null;

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
  }
  
  if (monthSelect) {
    const currentMonth = new Date().getMonth();
    monthSelect.value = currentMonth;
  }

  // Populate Kelompok Filter for Kalender Jadwal
  const jadwalKelompokSelect = document.getElementById("filter-jadwal-kelompok");
  if (jadwalKelompokSelect) {
    const curVal = jadwalKelompokSelect.value;
    jadwalKelompokSelect.innerHTML = '<option value="">Semua Kelompok</option>';
    const rawKel = typeof getKelompokList === 'function' ? getKelompokList() : (typeof localMasterKelompok !== 'undefined' ? localMasterKelompok : []);
    const masterKel = Array.from(new Set(
      rawKel
        .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
        .map(k => k.trim())
        .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]')
    ));
    masterKel.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      jadwalKelompokSelect.appendChild(opt);
    });
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
    if (isKelompokRestricted && currentUser.kelompok) {
      jadwalKelompokSelect.value = currentUser.kelompok;
      jadwalKelompokSelect.disabled = true;
    } else {
      if (curVal && masterKel.includes(curVal)) {
        jadwalKelompokSelect.value = curVal;
      } else {
        jadwalKelompokSelect.value = "";
      }
      jadwalKelompokSelect.disabled = false;
    }
  }

  // Populate Year, Month and Kelompok Filters for Kehadiran Teks
  const teksYearSelect = document.getElementById("teks-filter-tahun");
  const teksMonthSelect = document.getElementById("teks-filter-bulan");
  const teksKelompokSelect = document.getElementById("teks-filter-kelompok");

  if (teksYearSelect && teksYearSelect.options.length === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      teksYearSelect.appendChild(opt);
    }
  }

  if (teksMonthSelect) {
    const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
    teksMonthSelect.value = currentMonthStr;
  }

  if (teksKelompokSelect) {
    const curVal = teksKelompokSelect.value;
    teksKelompokSelect.innerHTML = '<option value="">Semua Kelompok</option>';
    const rawKel = typeof getKelompokList === 'function' ? getKelompokList() : (typeof localMasterKelompok !== 'undefined' ? localMasterKelompok : []);
    const masterKel = Array.from(new Set(
      rawKel
        .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
        .map(k => k.trim())
        .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]')
    ));
    masterKel.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      teksKelompokSelect.appendChild(opt);
    });
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    const isKelompokRestricted = currentUser && (curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok");
    if (isKelompokRestricted && currentUser.kelompok) {
      teksKelompokSelect.value = currentUser.kelompok;
      teksKelompokSelect.disabled = true;
    } else {
      if (curVal && masterKel.includes(curVal)) {
        teksKelompokSelect.value = curVal;
      } else {
        teksKelompokSelect.value = "";
      }
      teksKelompokSelect.disabled = false;
    }
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
  } else if (subtabName === "pengajian-kehadiran-teks") {
    loadKehadiranTeksTable();
  } else if (subtabName === "pengajian-cetak-qr") {
    loadQRCetakDropdowns();
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
  let schedules = getJadwalPengajianList() || [];
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isRestricted = ["operator kelompok", "pengurus kelompok", "user", "jamaah"].includes(curRoleClean);
  if (isRestricted && currentUser && currentUser.kelompok) {
    schedules = schedules.filter(s => {
      const tk = String(s.tingkat_pengajian || "").toLowerCase();
      const sk = String(s.kelompok_pengajian || "").trim().toLowerCase();
      const uk = String(currentUser.kelompok || "").trim().toLowerCase();
      return sk === uk ||
             tk.includes("desa") ||
             tk.includes("daerah");
    });
  }

  const filterTingkatSelect = document.getElementById("filter-jadwal-tingkat");
  const filterKelompokSelect = document.getElementById("filter-jadwal-kelompok");
  const filterTingkatVal = filterTingkatSelect ? filterTingkatSelect.value.trim().toLowerCase() : "";
  const filterKelompokVal = filterKelompokSelect ? filterKelompokSelect.value.trim().toLowerCase() : "";

  if (filterTingkatVal) {
    schedules = schedules.filter(s => {
      const tk = String(s.tingkat_pengajian || "").trim().toLowerCase();
      return tk === filterTingkatVal || tk.includes(filterTingkatVal.replace("tingkat ", "")) || filterTingkatVal.includes(tk);
    });
  }

  if (filterKelompokVal) {
    schedules = schedules.filter(s => {
      const tk = String(s.tingkat_pengajian || "").trim().toLowerCase();
      const sk = String(s.kelompok_pengajian || "").trim().toLowerCase();
      const isDesaOrDaerah = tk.includes("desa") || tk.includes("daerah");
      return sk === filterKelompokVal || isDesaOrDaerah;
    });
  }

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
      
      const tingkat = (sched.tingkat_pengajian || "").trim().toLowerCase();
      const kelompok = (sched.kelompok_pengajian || "").trim().toLowerCase();
      let bgColor = "rgba(59, 130, 246, 0.15)";
      let borderCol = "#3b82f6";
      let textCol = "#60a5fa";
      
      if (kelompok.includes("chandra")) {
        bgColor = "rgba(59, 130, 246, 0.15)";
        borderCol = "#3b82f6";
        textCol = "#60a5fa";
      } else if (kelompok.includes("pondok melati selatan")) {
        bgColor = "rgba(236, 72, 153, 0.15)";
        borderCol = "#ec4899";
        textCol = "#f472b6";
      } else if (kelompok.includes("pondok melati")) {
        bgColor = "rgba(139, 92, 246, 0.15)";
        borderCol = "#8b5cf6";
        textCol = "#a78bfa";
      } else if (kelompok.includes("jatiranggon")) {
        bgColor = "rgba(120, 53, 4, 0.15)";
        borderCol = "#78350f";
        textCol = "#d97706";
      } else if (tingkat.includes("desa")) {
        bgColor = "rgba(16, 185, 129, 0.15)";
        borderCol = "#10b981";
        textCol = "#34d399";
      } else if (tingkat.includes("daerah")) {
        bgColor = "rgba(245, 158, 11, 0.15)";
        borderCol = "#f59e0b";
        textCol = "#fbbf24";
      }
      
      badge.style.background = bgColor;
      badge.style.borderLeft = `3px solid ${borderCol}`;
      badge.style.color = textCol;
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
      const pesertaTxt = getScheduleParticipantText(sched);
      badge.textContent = `${timeStr} - ${sched.jenis_pengajian}`;
      const materiList = (sched.materi_pengajar || []).map(m => m.materi).join(', ');
      const pengajarList = (sched.materi_pengajar || []).map(m => m.pengajar_nama).join(', ');
      badge.title = `Tingkat: ${sched.tingkat_pengajian || '-'}\nKelompok Pembuat: ${sched.kelompok_pengajian || '-'}\nPeserta: ${pesertaTxt}\nMateri: ${materiList || '-'}\nPengajar: ${pengajarList || '-'}`;
      
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
  
  const allowedWrite = ["admin", "operator desa", "operator kelompok"].includes(curRoleClean);
  if (!allowedWrite) {
    showToast("Anda tidak memiliki hak akses untuk menambah jadwal!", "error");
    return;
  }
  
  const tingkatSelect = document.getElementById("jadwal-form-tingkat");
  tingkatSelect.value = "Tingkat Kelompok";
  tingkatSelect.disabled = isOperator;
  
  // Populate Jenis Pengajian
  populateJadwalJenisDropdown();
  
  // Populate Kelompok
  populateJadwalKelompokDropdown();
  
  // Populate Lokasi Datalist
  populateLokasiDatalist();
  const lokasiInput = document.getElementById("jadwal-form-lokasi");
  if (lokasiInput) lokasiInput.value = "";
  
  // Reset Materi-Pengajar Container and add 1 default empty row
  document.getElementById("jadwal-materi-pengajar-container").innerHTML = "";
  
  setJadwalFormReadOnly(false);
  onJadwalTingkatChange();
  
  addMateriPengajarRow();
  
  if (typeof populateJadwalPesertaSpesifikFields === 'function') {
    populateJadwalPesertaSpesifikFields(null);
  }
  
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
  const isPengurusKelompok = curRoleClean === "pengurus kelompok";
  const isKelompokRestricted = isOperator || isPengurusKelompok;
  
  // Check ownership/access
  if (isKelompokRestricted) {
    const tk = String(sched.tingkat_pengajian || "").toLowerCase();
    const sk = String(sched.kelompok_pengajian || "").trim().toLowerCase();
    const uk = String(currentUser.kelompok || "").trim().toLowerCase();
    if (!isDesaOrDaerah && sk !== uk) {
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
  
  // Populate Lokasi Datalist
  populateLokasiDatalist();
  const lokasiInput = document.getElementById("jadwal-form-lokasi");
  if (lokasiInput) lokasiInput.value = sched.lokasi || "";
  
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
  const tk = String(sched.tingkat_pengajian || "").toLowerCase();
  const isReadOnly = ["user", "pengurus desa", "pengurus kelompok"].includes(curRoleClean) || 
                     (isOperator && (tk.includes("desa") || tk.includes("daerah")));
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
  
  if (typeof populateJadwalPesertaSpesifikFields === 'function') {
    populateJadwalPesertaSpesifikFields(sched.peserta_spesifik || null);
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

function populateLokasiDatalist() {
  const datalist = document.getElementById("lokasi-datalist");
  if (!datalist) return;
  datalist.innerHTML = "";
  
  const list = (typeof localMasterTempatKegiatan !== 'undefined' && localMasterTempatKegiatan) ? localMasterTempatKegiatan : [];
  list.forEach(loc => {
    const opt = document.createElement("option");
    opt.value = loc;
    datalist.appendChild(opt);
  });
}

function populateJadwalKelompokDropdown() {
  const select = document.getElementById("jadwal-form-kelompok");
  if (!select) return;
  
  select.innerHTML = "";
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";
  
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
    
    const groups = getMasterKelompokList();
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });
  }
}

function getMasterKelompokList() {
  const raw = typeof getKelompokList === 'function' ? getKelompokList() : (typeof localMasterKelompok !== 'undefined' ? localMasterKelompok : []);
  return Array.from(new Set(
    raw
      .map(k => typeof k === 'object' && k ? (k.nama || k.name || '') : String(k || ''))
      .map(k => k.trim())
      .filter(k => k && k !== 'undefined' && k !== 'null' && k !== '[object Object]')
  ));
}

function setJadwalFormReadOnly(isReadOnly) {
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";

  document.getElementById("jadwal-form-tingkat").disabled = isReadOnly || isOperator;
  document.getElementById("jadwal-form-jenis").disabled = isReadOnly;
  document.getElementById("jadwal-form-tanggal").disabled = isReadOnly;
  document.getElementById("jadwal-form-waktu-mulai").disabled = isReadOnly;
  document.getElementById("jadwal-form-waktu-selesai").disabled = isReadOnly;
  const lokasiInput = document.getElementById("jadwal-form-lokasi");
  if (lokasiInput) lokasiInput.disabled = isReadOnly;
  
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
    // If it looks like a jamaah ID (e.g. starts with J-), show not found. Otherwise, show as-is since it was manually typed.
    if (/^J-\d+$/.test(selectedId)) {
      inputEl.value = `Ustadz ID ${selectedId} (Tidak Ditemukan)`;
    } else {
      inputEl.value = selectedId;
    }
  }
}

window.onJadwalTingkatChange = function() {
  const tingkat = document.getElementById("jadwal-form-tingkat").value;
  const kelompokSel = document.getElementById("jadwal-form-kelompok");
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";

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
  
  // Populate datalist if not already populated
  const datalist = document.getElementById("materi-datalist");
  if (datalist && datalist.children.length === 0) {
    const masterMateri = getMasterMateriList() || [];
    masterMateri.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      datalist.appendChild(opt);
    });
  }
  
  // Materi Input (Pick from list or type manually)
  const materiSelect = document.createElement("input");
  materiSelect.type = "text";
  materiSelect.className = "materi-select";
  materiSelect.setAttribute("list", "materi-datalist");
  materiSelect.required = true;
  materiSelect.style.flex = "1";
  materiSelect.placeholder = "Cari/Ketik Materi...";
  materiSelect.value = materi;
  
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
  
  const allowedWrite = ["admin", "operator desa", "operator kelompok"].includes(curRoleClean);
  if (!currentUser || !allowedWrite) {
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
  
  const sk = String(kelompok_pengajian || "").trim().toLowerCase();
  const uk = String(currentUser.kelompok || "").trim().toLowerCase();
  if (curRoleClean === "operator kelompok" && sk !== uk) {
    showToast("Operator Kelompok hanya bisa menyimpan jadwal kelompok sendiri!", "error");
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
  
  let peserta_spesifik = "";
  const isSpesifikChk = document.getElementById("jadwal-form-is-spesifik");
  if (isSpesifikChk && isSpesifikChk.checked) {
    const checkedCheckboxes = Array.from(document.querySelectorAll('input[name="jadwal-form-peserta-chk"]:checked'));
    peserta_spesifik = checkedCheckboxes.map(chk => chk.value).join(", ");
  }

  const lokasi = document.getElementById("jadwal-form-lokasi").value.trim();

  const jadwalData = {
    id: id || null,
    tingkat_pengajian,
    jenis_pengajian,
    tanggal,
    waktu_mulai: waktu_mulai + ":00",
    waktu_selesai: waktu_selesai + ":00",
    materi_pengajar,
    kelompok_pengajian,
    peserta_spesifik,
    lokasi
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
window.selectPresensiSession = function(id) {
  const select = document.getElementById("presensi-jadwal-select");
  if (select) {
    select.value = id;
  }
  
  const cards = document.querySelectorAll(".session-card");
  cards.forEach(card => {
    if (card.getAttribute("data-id") == id) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });
  
  loadPresensiSheet();
};

window.loadPresensiSesiDropdown = function() {
  const select = document.getElementById("presensi-jadwal-select");
  if (!select) return;
  
  if (typeof populateMonthFilterOptions === "function") {
    populateMonthFilterOptions("presensi-filter-periode", () => {
      loadPresensiSesiDropdown();
    }, "presensi");
  }
  
  select.innerHTML = '<option value="">-- Pilih Sesi Pengajian --</option>';
  select.value = "";
  if (typeof loadPresensiSheet === "function") {
    loadPresensiSheet();
  }
  
  const listContainer = document.getElementById("presensi-sessions-list");
  if (listContainer) {
    listContainer.innerHTML = "";
  }
  
  const schedules = getJadwalPengajianList() || [];
  if (schedules.length === 0) {
    if (listContainer) {
      listContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px; background: rgba(16, 185, 129, 0.01);">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px; display: block;"></i>
          Belum ada sesi pengajian terjadwal.
        </div>
      `;
    }
    return;
  }
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isRestricted = ["operator kelompok", "pengurus kelompok", "user", "jamaah"].includes(curRoleClean);
  
  let filtered = schedules;
  if (isRestricted && currentUser && currentUser.kelompok) {
    filtered = schedules.filter(s => {
      const tk = String(s.tingkat_pengajian || "").toLowerCase();
      const sk = String(s.kelompok_pengajian || "").trim().toLowerCase();
      const uk = String(currentUser.kelompok || "").trim().toLowerCase();
      return sk === uk ||
             tk.includes("desa") ||
             tk.includes("daerah");
    });
  }
  
  const filterTingkat = document.getElementById("presensi-filter-tingkat") ? document.getElementById("presensi-filter-tingkat").value : "";
  const filterPeriode = document.getElementById("presensi-filter-periode") ? document.getElementById("presensi-filter-periode").value : "today";
  
  if (filterTingkat) {
    filtered = filtered.filter(s => s.tingkat_pengajian === filterTingkat);
  }
  
  if (filterPeriode === "today") {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const todayStr = `${year}-${month}-${day}`;
    filtered = filtered.filter(s => s.tanggal === todayStr);
  } else if (filterPeriode === "1week") {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    filtered = filtered.filter(s => new Date(s.tanggal) >= oneWeekAgo);
  } else if (filterPeriode === "" || filterPeriode === "all") {
    // Semua Periode
  } else {
    // YYYY-MM or YYYY
    filtered = filtered.filter(s => s.tanggal && s.tanggal.startsWith(filterPeriode));
  }
  
  filtered.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    
    const dateStr = formatDateIndo(s.tanggal);
    opt.textContent = `${dateStr} - ${s.jenis_pengajian} [${s.kelompok_pengajian}]`;
    select.appendChild(opt);
  });
  
  if (listContainer) {
    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 12px; background: rgba(16, 185, 129, 0.01);">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px; display: block;"></i>
          Belum ada sesi pengajian terjadwal untuk filter ini.
        </div>
      `;
    } else {
      filtered.forEach(s => {
        const div = document.createElement("div");
        const tingkatClass = s.tingkat_pengajian.toLowerCase().replace(/\s+/g, '-');
        
        div.className = `session-card ${tingkatClass}`;
        div.setAttribute("data-id", s.id);
        div.onclick = function() {
          selectPresensiSession(s.id);
        };
        
        const dateStr = formatDateIndo(s.tanggal);
        const timeStr = `${s.waktu_mulai.substring(0, 5)} - ${s.waktu_selesai.substring(0, 5)}`;
        const labelTingkat = s.tingkat_pengajian;
        
        const materiHtml = (s.materi_pengajar || []).map(m => `
          <div class="session-materi-item" style="margin-top: 4px;">
            <i class="fa-solid fa-book-open"></i> <strong>${m.materi}</strong> <span class="session-ustadz">(Ustadz: ${m.pengajar_nama})</span>
          </div>
        `).join('');
        
        div.innerHTML = `
          <div class="session-card-header">
            <span class="session-badge badge-${tingkatClass}">${labelTingkat}</span>
            <span class="session-type" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">${s.jenis_pengajian}</span>
          </div>
          <div class="session-card-body" style="display: flex; flex-direction: column; gap: 6px;">
            <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-secondary);">
              <i class="fa-regular fa-calendar"></i>
              <span>${dateStr}</span>
            </div>
            <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-secondary);">
              <i class="fa-regular fa-clock"></i>
              <span>${timeStr}</span>
            </div>
            <div class="session-info-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-secondary);">
              <i class="fa-solid fa-users"></i>
              <span>${s.kelompok_pengajian || 'Semua Kelompok'}</span>
            </div>
            <div class="session-materi-list" style="border-top: 1px dashed var(--border-color); padding-top: 6px; margin-top: 4px;">
              ${materiHtml}
            </div>
          </div>
        `;
        listContainer.appendChild(div);
      });
    }
  }
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

let presensiSheetReadOnly = false;
let currentPresensiList = []; // Kept in memory to track changes

function renderPresensiTable(session) {
  const tbody = document.getElementById("presensi-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  const allJamaah = (getJamaahList() || []).filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isKelompokRestricted = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";
  
  let targetJamaah = allJamaah;
  if (isKelompokRestricted) {
    targetJamaah = allJamaah.filter(j => j.kelompokPengajian === currentUser.kelompok);
  } else {
    if (session.kelompok_pengajian && session.kelompok_pengajian !== "Semua" && session.kelompok_pengajian !== "Desa" && session.kelompok_pengajian !== "Daerah") {
      targetJamaah = allJamaah.filter(j => j.kelompokPengajian === session.kelompok_pengajian);
    }
  }
  
  const isPresensiReadOnly = ["user", "pengurus desa", "pengurus kelompok"].includes(curRoleClean);
  presensiSheetReadOnly = isPresensiReadOnly;
  
  const saveBtn = document.getElementById("btn-save-presensi");
  if (saveBtn) {
    saveBtn.style.display = presensiSheetReadOnly ? "none" : "inline-flex";
  }
  
  // Apply automatic filtering based on jenis_pengajian and peserta_spesifik (undangan)
  if (session.peserta_spesifik) {
    const allowedIds = session.peserta_spesifik.split(",").map(id => id.trim()).filter(Boolean);
    if (allowedIds.length > 0) {
      targetJamaah = targetJamaah.filter(j => allowedIds.includes(j.id));
    }
  } else {
    targetJamaah = targetJamaah.filter(j => isJamaahEligibleForJenis(j, session.jenis_pengajian));
  }
  
  if (targetJamaah.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tidak ada jamaah yang memenuhi kriteria untuk jenis kegiatan ini.</td></tr>';
    return;
  }
  
  const presensiDb = getPresensiKehadiranList() || [];
  const sessionPresensi = presensiDb.filter(p => p.id_pengajian == session.id);
  
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const isFuture = session.tanggal > todayStr;
  const defaultStatus = isFuture ? "BELUM WAKTUNYA" : "Alpha";
  
  currentPresensiList = targetJamaah.map(j => {
    const exist = sessionPresensi.find(p => p.id_jamaah === j.id);
    return {
      id_jamaah: j.id,
      nama: j.namaLengkap,
      gender: j.jenisKelamin,
      peramutan: j.kelompokPeramutan,
      status: exist ? exist.status : defaultStatus,
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
    
    const statuses = ["Hadir Fisik", "Online", "Izin"];
    let statusRadioHtml = `<div style="display: flex; gap: 16px; justify-content: center; align-items: center; width: 100%;">`;
    
    statuses.forEach(st => {
      const isChecked = p.status === st;
      const color = st === "Hadir Fisik" ? "#10b981" : st === "Online" ? "#3b82f6" : "#f59e0b";
      statusRadioHtml += `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 1rem; cursor: pointer; font-weight: 600;">
          <input type="radio" name="status-${p.id_jamaah}" value="${st}" ${isChecked ? 'checked' : ''} ${presensiSheetReadOnly ? 'disabled' : ''} onchange="updatePresensiStatusInMem('${p.id_jamaah}', '${st}')" style="width: 18px; height: 18px; margin: 0; cursor: pointer;">
          <span style="color: ${color};">${st}</span>
        </label>
      `;
    });
    const resetStyle = presensiSheetReadOnly ? 'display: none;' : 'margin-left: 10px; color: var(--text-muted); background: transparent; border: none; padding: 4px; cursor: pointer; font-size: 0.9rem; transition: color 0.2s;';
    statusRadioHtml += `
      <button class="btn-icon reset-btn" title="Reset Status Kehadiran" onclick="resetPresensiStatus('${p.id_jamaah}')" style="${resetStyle}" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text-muted)'">
        <i class="fa-solid fa-rotate-left"></i>
      </button>
    `;
    statusRadioHtml += `</div>`;
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${p.nama}</strong><span style="display:block; font-size:0.75rem; color:var(--text-secondary);">${p.id_jamaah}</span></td>
      <td>${p.gender === "Laki-laki" ? "L" : "P"}</td>
      <td><span class="status-badge status-active" style="font-size:0.75rem; background:rgba(255,255,255,0.05); color:var(--text-secondary); border: 1px solid var(--border-color);">${p.peramutan}</span></td>
      <td>${statusRadioHtml}</td>
      <td><input type="text" value="${p.keterangan}" class="form-control" style="width: 100%; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px;" placeholder="Isi alasan..." ${presensiSheetReadOnly ? 'disabled' : ''} onchange="updatePresensiKetInMem('${p.id_jamaah}', this.value)"></td>
    `;
    
    tbody.appendChild(tr);
  });
}

window.updatePresensiStatusInMem = function(jamaahId, status) {
  const item = currentPresensiList.find(x => x.id_jamaah === jamaahId);
  if (item) item.status = status;
};

window.resetPresensiStatus = function(jamaahId) {
  const item = currentPresensiList.find(x => x.id_jamaah === jamaahId);
  if (item) {
    item.status = "";
    fillPresensiDOM();
  }
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
  
  const allowedWrite = ["admin", "operator desa", "operator kelompok"].includes(curRoleClean);
  if (!currentUser || !allowedWrite) {
    showToast("Anda tidak memiliki hak akses untuk menyimpan presensi!", "error");
    return;
  }
  
  const id_pengajian = document.getElementById("presensi-jadwal-select").value;
  if (!id_pengajian) return;
  
  const schedules = getJadwalPengajianList() || [];
  const session = schedules.find(s => s.id == id_pengajian);
  if (curRoleClean === "operator kelompok") {
    if (session) {
      const tk = String(session.tingkat_pengajian || "").toLowerCase();
      const isDesaOrDaerah = tk.includes("desa") || tk.includes("daerah");
      const sk = String(session.kelompok_pengajian || "").trim().toLowerCase();
      const uk = String(currentUser.kelompok || "").trim().toLowerCase();
      if (!isDesaOrDaerah && sk !== uk) {
        showToast("Operator Kelompok hanya bisa menyimpan presensi kelompok sendiri!", "error");
        return;
      }
    }
  }
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
  
  if (selectKelompok) {
    const curVal = selectKelompok.value;
    selectKelompok.innerHTML = "";
    
    const currentUser = getCurrentUser();
    const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
    const isOperator = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";
    
    if (isOperator && currentUser.kelompok) {
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
      selectKelompok.appendChild(defOpt);
      
      const groups = getMasterKelompokList();
      groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        selectKelompok.appendChild(opt);
      });
      if (curVal && groups.includes(curVal)) {
        selectKelompok.value = curVal;
      } else {
        selectKelompok.value = "";
      }
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
  if (typeof populateMonthFilterOptions === "function") {
    populateMonthFilterOptions("monitor-periode", () => {
      calculateAndRenderMonitoring(false);
    }, "monitor");
  }
  
  initMonitoringFilters();
  
  const filterTingkat = document.getElementById("monitor-tingkat").value;
  const filterJenis = document.getElementById("monitor-jenis").value;
  const filterPeriod = document.getElementById("monitor-periode").value;
  
  const schedules = getJadwalPengajianList() || [];
  const presensiDb = getPresensiKehadiranList() || [];
  const jamaah = (getJamaahList() || []).filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isRestricted = ["operator kelompok", "pengurus kelompok", "user", "jamaah"].includes(curRoleClean);
  
  // Filter schedules by tingkat, jenis, period
  let periodSchedules = schedules;
  if (isRestricted && currentUser && currentUser.kelompok) {
    periodSchedules = periodSchedules.filter(s => {
      const tk = String(s.tingkat_pengajian || "").toLowerCase();
      const sk = String(s.kelompok_pengajian || "").trim().toLowerCase();
      const uk = String(currentUser.kelompok || "").trim().toLowerCase();
      return sk === uk ||
             tk.includes("desa") ||
             tk.includes("daerah");
    });
  }
  if (filterTingkat) {
    periodSchedules = periodSchedules.filter(s => s.tingkat_pengajian === filterTingkat);
  }
  if (filterJenis) {
    periodSchedules = periodSchedules.filter(s => s.jenis_pengajian === filterJenis);
  }
  
  // Time period filter
  const tzDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const formatDateForCompare = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };
  
  if (filterPeriod === "weekly") {
    const monday = new Date(tzDate);
    monday.setDate(tzDate.getDate() + (tzDate.getDay() === 0 ? -6 : 1 - tzDate.getDay()));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const mondayStr = formatDateForCompare(monday);
    const sundayStr = formatDateForCompare(sunday);
    
    periodSchedules = periodSchedules.filter(s => s.tanggal >= mondayStr && s.tanggal <= sundayStr);
  } else if (filterPeriod) {
    // Specific month (YYYY-MM) or year (YYYY)
    periodSchedules = periodSchedules.filter(s => s.tanggal && s.tanggal.startsWith(filterPeriod));
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
  
  const todayStr = formatDateForCompare(tzDate);
  const timeNowStr = String(tzDate.getHours()).padStart(2, '0') + ":" + String(tzDate.getMinutes()).padStart(2, '0');

  const isConductedSession = (s) => {
    if (!s || !s.tanggal) return false;
    if (s.tanggal < todayStr) return true;
    if (s.tanggal === todayStr) {
      if (timeNowStr >= (s.waktu_selesai || "23:59")) return true;
      return presensiDb.some(p => p && String(p.id_pengajian) === String(s.id));
    }
    return presensiDb.some(p => p && String(p.id_pengajian) === String(s.id));
  };

  const selectedSesiId = sesiSelect ? sesiSelect.value : "";
  let filteredSchedules = periodSchedules;
  if (selectedSesiId) {
    filteredSchedules = periodSchedules.filter(s => s.id == selectedSesiId);
  } else {
    filteredSchedules = periodSchedules.filter(isConductedSession);
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
  const targetJamaahForStats = isRestricted && currentUser && currentUser.kelompok ? jamaah.filter(j => j.kelompokPengajian === currentUser.kelompok) : jamaah;

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
    targetJamaahForStats.forEach(j => {
      if (isJamaahEligibleForSchedule(j, s)) {
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

  // Render Attendance Trend Chart
  updateAttendanceTrendChart();
};

window.updateAttendanceTrendChart = function() {
  const groupingEl = document.getElementById("monitor-trend-grouping");
  const grouping = groupingEl ? groupingEl.value : "week";
  const schedules = getJadwalPengajianList() || [];
  const presensiDb = getPresensiKehadiranList() || [];
  const jamaah = (getJamaahList() || []).filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isRestricted = ["operator kelompok", "pengurus kelompok", "user", "jamaah"].includes(curRoleClean);
  
  let targetSchedules = [...schedules];
  if (isRestricted && currentUser && currentUser.kelompok) {
    targetSchedules = targetSchedules.filter(s => {
      const tk = String(s.tingkat_pengajian || "").toLowerCase();
      const sk = String(s.kelompok_pengajian || "").trim().toLowerCase();
      const uk = String(currentUser.kelompok || "").trim().toLowerCase();
      return sk === uk ||
             tk.includes("desa") ||
             tk.includes("daerah");
    });
  } else {
    const filterTingkat = document.getElementById("monitor-tingkat").value;
    if (filterTingkat) {
      targetSchedules = targetSchedules.filter(s => s.tingkat_pengajian === filterTingkat);
    }
  }
  
  const filterJenis = document.getElementById("monitor-jenis").value;
  if (filterJenis) {
    targetSchedules = targetSchedules.filter(s => s.jenis_pengajian === filterJenis);
  }

  const tzDateTrend = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const y = tzDateTrend.getFullYear();
  const m = String(tzDateTrend.getMonth() + 1).padStart(2, '0');
  const day = String(tzDateTrend.getDate()).padStart(2, '0');
  const todayStrTrend = y + '-' + m + '-' + day;
  const timeNowTrend = String(tzDateTrend.getHours()).padStart(2, '0') + ":" + String(tzDateTrend.getMinutes()).padStart(2, '0');

  targetSchedules = targetSchedules.filter(s => {
    if (!s || !s.tanggal) return false;
    if (s.tanggal < todayStrTrend) return true;
    if (s.tanggal === todayStrTrend) {
      if (timeNowTrend >= (s.waktu_selesai || "23:59")) return true;
      return presensiDb.some(p => p && String(p.id_pengajian) === String(s.id));
    }
    return presensiDb.some(p => p && String(p.id_pengajian) === String(s.id));
  });
  
  // Sort schedules by date ascending for chronological order
  targetSchedules.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  
  const targetJamaahForStats = isRestricted && currentUser && currentUser.kelompok ? jamaah.filter(j => j.kelompokPengajian === currentUser.kelompok) : jamaah;
  
  const presensiMap = {};
  presensiDb.forEach(p => {
    presensiMap[`${p.id_pengajian}_${p.id_jamaah}`] = p.status;
  });
  
  // Compute attendance stats per schedule
  const scheduleData = targetSchedules.map(s => {
    let eligible = 0;
    let present = 0;
    
    targetJamaahForStats.forEach(j => {
      if (isJamaahEligibleForSchedule(j, s)) {
        eligible++;
        const status = presensiMap[`${s.id}_${j.id}`] || "Alpha";
        if (status === "Hadir Fisik" || status === "Online") {
          present++;
        }
      }
    });
    
    return {
      id: s.id,
      tanggal: s.tanggal,
      present,
      eligible
    };
  }).filter(item => item.eligible > 0);
  
  // Grouping
  const groups = {};
  const monthsIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  
  scheduleData.forEach(item => {
    let groupKey = "";
    let groupLabel = "";
    
    const d = new Date(item.tanggal);
    if (grouping === "day") {
      groupKey = item.tanggal;
      groupLabel = formatDateIndoShort(item.tanggal);
    } else if (grouping === "week") {
      // Get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1 - day);
      const monday = new Date(d.setDate(diff));
      const mondayStr = monday.toISOString().substring(0, 10);
      groupKey = mondayStr;
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      groupLabel = `${monday.getDate()} ${monthsIndo[monday.getMonth()]} - ${sunday.getDate()} ${monthsIndo[sunday.getMonth()]}`;
    } else { // month
      const y = d.getFullYear();
      const m = d.getMonth();
      groupKey = `${y}-${String(m+1).padStart(2, '0')}`;
      groupLabel = `${monthsIndo[m]} ${y}`;
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        label: groupLabel,
        present: 0,
        eligible: 0,
        key: groupKey
      };
    }
    
    groups[groupKey].present += item.present;
    groups[groupKey].eligible += item.eligible;
  });
  
  const sortedGroups = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
  
  const labels = sortedGroups.map(g => g.label);
  const dataValues = sortedGroups.map(g => g.eligible > 0 ? Math.round((g.present / g.eligible) * 100) : 0);
  
  const canvas = document.getElementById("attendance-trend-chart");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const isDark = document.body.classList.contains("dark-theme");
  const textColor = isDark ? "#9ca3af" : "#4b5563";
  const gridColor = isDark ? "rgba(16, 185, 129, 0.1)" : "#e2e8f0";
  
  if (attendanceTrendChart) {
    attendanceTrendChart.destroy();
  }
  
  attendanceTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Tingkat Kehadiran (%)",
        data: dataValues,
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        borderColor: "#10b981",
        borderWidth: 2.5,
        pointBackgroundColor: "#10b981",
        pointBorderColor: isDark ? "#1f2937" : "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 12,
          callbacks: {
            label: function(context) {
              return `Kehadiran: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: textColor,
            callback: function(value) {
              return value + "%";
            }
          },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { display: false }
        }
      }
    }
  });
};

function formatDateIndoShort(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

let currentMonitoringTableData = [];

// Helper: returns list of kelompok_peramutan that are eligible for a given jenis_pengajian
function getEligiblePeramutanForJenis(jenis) {
  const jClean = (jenis || "").trim().toLowerCase().replace(/\s+/g, '');
  
  // Dynamic lookup first
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  const match = list.find(item => {
    const name = typeof item === 'object' ? item.nama : item;
    return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
  });
  
  if (match && typeof match === 'object') {
    if (match.peserta_pengajian) {
      return match.peserta_pengajian.split(",").map(p => p.trim()).filter(Boolean);
    }
    return [];
  }
  
  // Fallbacks if not found dynamically
  if (jClean === "ibu-ibu" || jClean === "ibu--ibu" || jClean === "ibuibu") {
    return ["Dewasa", "Manula"];
  }
  if (jClean === "kewanitaan") {
    return ["Dewasa", "Manula", "GUS", "GUM"];
  }
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
  
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  const match = list.find(item => {
    const name = typeof item === 'object' ? item.nama : item;
    return (name || "").trim().toLowerCase().replace(/\s+/g, '') === jClean;
  });
  
  if (match && typeof match === 'object') {
    // 1. Gender restriction
    const genderLimit = (match.batasan_gender || "Semua").trim().toLowerCase();
    const jamaahGender = (j.jenisKelamin || "").trim().toLowerCase();
    if (genderLimit === "laki-laki" && jamaahGender !== "laki-laki") {
      return false;
    }
    if (genderLimit === "perempuan" && jamaahGender !== "perempuan") {
      return false;
    }
    
    // 2. Dapuan restriction
    const targetDapuanStr = (match.target_dapuan || "").trim();
    if (targetDapuanStr) {
      const allowedDapuans = targetDapuanStr.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
      if (allowedDapuans.length > 0) {
        const jamaahDapuans = [j.dapuan];
        if (typeof getPengurusList === 'function') {
          const pList = getPengurusList() || [];
          pList.forEach(p => {
            if (p.jamaah_id === j.id && p.dapuan) {
              jamaahDapuans.push(p.dapuan);
            }
          });
        }
        const lowerJamaahDapuans = jamaahDapuans.filter(Boolean).map(d => d.trim().toLowerCase());
        const hasMatchingDapuan = allowedDapuans.some(ad => lowerJamaahDapuans.includes(ad));
        if (!hasMatchingDapuan) {
          return false;
        }
      }
    }
  } else {
    // Fallback gender check
    const isFemaleOnly = jClean.includes("ibu") || jClean.includes("wanita") || jClean.includes("kewanitaan") || jClean.includes("akhwat");
    if (isFemaleOnly) {
      if ((j.jenisKelamin || "").trim().toLowerCase() !== "perempuan") {
        return false;
      }
    }
  }
  
  // 3. Demographic restriction
  const allowedPeramutan = getEligiblePeramutanForJenis(jenis);
  if (allowedPeramutan === null || allowedPeramutan.length === 0) return true; // no restriction
  
  const peramutan = (j.kelompokPeramutan || "").trim().toLowerCase();
  return allowedPeramutan.some(p => {
    const pClean = p.toLowerCase().trim();
    if (pClean.includes("pengurus")) {
      if (typeof getPengurusList === 'function') {
        const pList = getPengurusList() || [];
        if (pClean === "pengurus") {
          return pList.some(pr => pr.jamaah_id === j.id);
        } else {
          const tingkat = pClean.replace("pengurus", "").trim();
          return pList.some(pr => pr.jamaah_id === j.id && (pr.tingkat_pengurus || "").toLowerCase() === tingkat);
        }
      }
      return false;
    }
    const isFemale = (j.jenisKelamin || "").trim().toLowerCase() === "perempuan";
    if (pClean === "ibu-ibu" || pClean === "ibuibu") {
      return isFemale && (peramutan === "dewasa" || peramutan === "manula");
    }
    if (pClean === "kewanitaan") {
      return isFemale && ["dewasa", "manula", "gus", "gum"].includes(peramutan);
    }
    return pClean === peramutan;
  });
}

function renderIndividualMonitoringTable(filteredSchedules, presensiMap) {
  const jamaah = getJamaahList() || [];
  
  const currentUser = getCurrentUser();
  const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
  const isOperator = curRoleClean === "operator kelompok" || curRoleClean === "pengurus kelompok";
  
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
      targetJamaah.forEach(j => {
        if (isJamaahEligibleForSchedule(j, s)) {
          relevantJamaahIds.add(j.id);
        }
      });
    });
    displayJamaah = targetJamaah.filter(j => relevantJamaahIds.size === 0 || relevantJamaahIds.has(j.id));
  }
  
  currentMonitoringTableData = displayJamaah.map(j => {
    // Total sessions this jamaah was eligible to attend
    const relevantSessions = filteredSchedules.filter(s => isJamaahEligibleForSchedule(j, s));
    
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
      gender: j.jenisKelamin,
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
  const filterPeramutan = document.getElementById("monitor-filter-peramutan") ? document.getElementById("monitor-filter-peramutan").value : "";
  const filterGender = document.getElementById("monitor-filter-gender") ? document.getElementById("monitor-filter-gender").value : "";
  const filterStatus = document.getElementById("monitor-filter-status") ? document.getElementById("monitor-filter-status").value : "";
  
  let filtered = currentMonitoringTableData;
  if (search) {
    filtered = filtered.filter(p => p.nama.toLowerCase().includes(search));
  }
  if (filterKelompok) {
    filtered = filtered.filter(p => String(p.kelompokPengajian || '').trim().toLowerCase() === String(filterKelompok).trim().toLowerCase());
  }
  if (filterPeramutan) {
    if (filterPeramutan === "PAUD & Balita" || filterPeramutan === "PAUD dan Balita" || filterPeramutan === "PAUD" || filterPeramutan === "Balita") {
      filtered = filtered.filter(p => p.peramutan === "PAUD" || p.peramutan === "Balita");
    } else {
      filtered = filtered.filter(p => p.peramutan === filterPeramutan);
    }
  }
  if (filterGender) {
    filtered = filtered.filter(p => p.gender === filterGender);
  }
  if (filterStatus) {
    if (filterStatus === "Hadir Fisik") {
      filtered = filtered.filter(p => p.fisik > 0);
    } else if (filterStatus === "Online") {
      filtered = filtered.filter(p => p.online > 0);
    } else if (filterStatus === "Izin") {
      filtered = filtered.filter(p => p.izin > 0);
    } else if (filterStatus === "Alpha") {
      filtered = filtered.filter(p => p.alpha > 0);
    }
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

// Target Selection & Custom Group helpers for Scheduling Form
window.toggleJadwalPesertaSpesifik = function() {
  const isSpesifik = document.getElementById("jadwal-form-is-spesifik").checked;
  const container = document.getElementById("jadwal-form-peserta-spesifik-container");
  if (isSpesifik) {
    container.style.display = "block";
  } else {
    container.style.display = "none";
    document.querySelectorAll('input[name="jadwal-form-peserta-chk"]').forEach(chk => {
      chk.checked = false;
    });
  }
};

window.filterJadwalPesertaList = function() {
  const q = document.getElementById("jadwal-form-peserta-search").value.toLowerCase();
  const items = document.querySelectorAll("#jadwal-form-peserta-list .jadwal-peserta-item");
  items.forEach(item => {
    const name = item.getAttribute("data-nama") || "";
    if (name.includes(q)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
};

window.applyGrupKustomToJadwal = function() {
  const select = document.getElementById("jadwal-form-pilih-grup-kustom");
  const groupName = select.value;
  if (!groupName) return;
  
  const groups = getMasterGrupKustomList() || [];
  const group = groups.find(g => g.nama === groupName);
  if (group && group.daftar_id_anggota) {
    const memberIds = group.daftar_id_anggota.split(",").map(id => id.trim()).filter(Boolean);
    const checkboxes = document.querySelectorAll('input[name="jadwal-form-peserta-chk"]');
    checkboxes.forEach(chk => {
      if (memberIds.includes(chk.value)) {
        chk.checked = true;
      }
    });
  }
  select.value = "";
};

function matchJamaahToCategory(j, category) {
  const cat = category.toLowerCase().trim();
  if (j.kelompokPeramutan.toLowerCase() === cat) return true;
  if (cat === "ibu-ibu" || cat === "kewanitaan") {
    return j.jenisKelamin === "Perempuan" && (j.kelompokPeramutan === "Dewasa" || j.kelompokPeramutan === "Manula");
  }
  if (cat.includes("pengurus")) {
    const isRokyah = (j.dapuan || "").toLowerCase().includes("rokyah");
    const hasPengurusRecord = typeof getPengurusList === 'function' && (getPengurusList() || []).some(p => p.jamaah_id === j.id);
    return !isRokyah || hasPengurusRecord;
  }
  return false;
}

window.quickSelectJadwalPeserta = function(category) {
  const jamaahList = getJamaahList() || [];
  const targetIds = jamaahList.filter(j => matchJamaahToCategory(j, category)).map(j => j.id);
  
  const checkboxes = Array.from(document.querySelectorAll('input[name="jadwal-form-peserta-chk"]'));
  const targetCheckboxes = checkboxes.filter(chk => targetIds.includes(chk.value));
  const allChecked = targetCheckboxes.every(chk => chk.checked);
  
  targetCheckboxes.forEach(chk => {
    chk.checked = !allChecked;
  });
};

window.populateJadwalPesertaSpesifikFields = function(existingSpesifik = null) {
  const groupSelect = document.getElementById("jadwal-form-pilih-grup-kustom");
  if (groupSelect) {
    groupSelect.innerHTML = '<option value="">-- Pilih Grup Kustom --</option>';
    const groups = getMasterGrupKustomList() || [];
    groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.nama;
      opt.textContent = g.nama;
      groupSelect.appendChild(opt);
    });
  }
  
  const quickSelectContainer = document.getElementById("jadwal-form-quick-select-buttons");
  if (quickSelectContainer) {
    quickSelectContainer.innerHTML = "";
    const categories = getMasterPesertaPengajianList() || [];
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary";
      btn.style.fontSize = "0.75rem";
      btn.style.padding = "4px 8px";
      btn.style.background = "rgba(16,185,129,0.1)";
      btn.style.border = "1px solid rgba(16,185,129,0.3)";
      btn.style.color = "var(--primary)";
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";
      btn.textContent = cat.nama;
      btn.onclick = () => quickSelectJadwalPeserta(cat.nama);
      quickSelectContainer.appendChild(btn);
    });
  }
  
  const listContainer = document.getElementById("jadwal-form-peserta-list");
  if (listContainer) {
    listContainer.innerHTML = "";
    const jamaahList = (getJamaahList() || []).filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
    const sortedList = [...jamaahList].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    sortedList.forEach(j => {
      const div = document.createElement("div");
      div.className = "jadwal-peserta-item";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "6px";
      div.setAttribute("data-nama", j.namaLengkap.toLowerCase());
      div.innerHTML = `
        <input type="checkbox" name="jadwal-form-peserta-chk" value="${j.id}" id="chk-jadwal-peserta-${j.id}">
        <label for="chk-jadwal-peserta-${j.id}" style="font-size: 0.8rem; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${j.namaLengkap} (${j.kelompokPengajian})">${j.namaLengkap}</label>
      `;
      listContainer.appendChild(div);
    });
  }
  
  const checkboxIsSpesifik = document.getElementById("jadwal-form-is-spesifik");
  const container = document.getElementById("jadwal-form-peserta-spesifik-container");
  
  if (existingSpesifik) {
    if (checkboxIsSpesifik) checkboxIsSpesifik.checked = true;
    if (container) container.style.display = "block";
    const selectedIds = existingSpesifik.split(",").map(id => id.trim()).filter(Boolean);
    document.querySelectorAll('input[name="jadwal-form-peserta-chk"]').forEach(chk => {
      if (selectedIds.includes(chk.value)) {
        chk.checked = true;
      }
    });
  } else {
    if (checkboxIsSpesifik) checkboxIsSpesifik.checked = false;
    if (container) container.style.display = "none";
  }
};

window.loadKehadiranTeksTable = function() {
  const tbody = document.getElementById("teks-kehadiran-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</td></tr>';
  
  const selectedYear = document.getElementById("teks-filter-tahun").value;
  const selectedMonthStr = document.getElementById("teks-filter-bulan").value;
  const selectedKelompok = document.getElementById("teks-filter-kelompok").value;
  const selectedYearMonth = `${selectedYear}-${selectedMonthStr}`;
  
  const allJadwal = getJadwalPengajianList() || [];
  const allPresensi = getPresensiKehadiranList() || [];
  const jamaahList = (getJamaahList() || []).filter(j => !j.statusKeaktifan || j.statusKeaktifan === "Aktif");
  
  // 1. Get all Teks sessions in the selected month & year
  const teksSessions = allJadwal.filter(s => {
    if (!s || !s.tanggal) return false;
    const isTeks = (s.jenis_pengajian || "").trim().toLowerCase() === "teks";
    const isSelectedMonth = s.tanggal.startsWith(selectedYearMonth);
    return isTeks && isSelectedMonth;
  });
  
  if (teksSessions.length === 0) {
    const monthName = document.getElementById("teks-filter-bulan").options[document.getElementById("teks-filter-bulan").selectedIndex].text;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);"><i class="fa-solid fa-calendar-xmark" style="font-size:1.5rem;margin-bottom:8px;display:block;"></i>Tidak ada jadwal pengajian Teks pada bulan ${monthName} ${selectedYear}</td></tr>`;
    return;
  }
  
  // Sort sessions by date
  teksSessions.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  
  // 2. Filter jamaah who are obliged (eligible) for at least one of these Teks sessions
  let obligedJamaah = jamaahList.filter(j => {
    // If kelompok filter is active, jamaah must match the filter
    if (selectedKelompok && String(j.kelompokPengajian || '').trim().toLowerCase() !== String(selectedKelompok).trim().toLowerCase()) {
      return false;
    }
    // Must be eligible for at least one Teks session
    return teksSessions.some(s => isJamaahEligibleForSchedule(j, s));
  });
  
  if (obligedJamaah.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Tidak ada jamaah yang berkewajiban hadir pada periode ini.</td></tr>`;
    return;
  }
  
  obligedJamaah.sort((a, b) => (a.namaLengkap || "").localeCompare(b.namaLengkap || ""));
  
  // 3. Map details and compute overall presence status
  const mappedObliged = obligedJamaah.map(j => {
    let attendedAny = false;
    
    const details = teksSessions.map(s => {
      const isEligible = isJamaahEligibleForSchedule(j, s);
      if (!isEligible) return null;
      
      const pr = allPresensi.find(p => p && p.id_pengajian == s.id && p.id_jamaah === j.id);
      const status = pr ? pr.status : 'Belum Absen';
      const isHadir = status === 'Hadir Fisik' || status === 'Online';
      if (isHadir) attendedAny = true;
      
      let badgeClass = 'badge-danger';
      if (isHadir) badgeClass = 'badge-green';
      else if (status === 'Izin') badgeClass = 'badge-warning';
      else if (status === 'Belum Absen') badgeClass = 'badge-gray';
      
      const dateLabel = s.tanggal.substring(8, 10) + "/" + s.tanggal.substring(5, 7);
      return `<span class="badge ${badgeClass}" style="margin: 2px; font-size: 0.7rem;" title="${s.jenis_pengajian} (${s.tingkat_pengajian}) - Status: ${status}">${dateLabel}: ${status}</span>`;
    }).filter(Boolean).join(" ");

    return {
      jamaah: j,
      attendedAny: attendedAny,
      detailsHtml: details
    };
  });
  
  // Apply Status filter (Sudah / Belum)
  const selectedStatus = document.getElementById("teks-filter-status") ? document.getElementById("teks-filter-status").value : "";
  let finalObliged = mappedObliged;
  if (selectedStatus === "sudah") {
    finalObliged = mappedObliged.filter(x => x.attendedAny);
  } else if (selectedStatus === "belum") {
    finalObliged = mappedObliged.filter(x => !x.attendedAny);
  }
  
  if (finalObliged.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Tidak ada jamaah dengan status tersebut pada periode ini.</td></tr>`;
    return;
  }
  
  // 4. Render table content
  tbody.innerHTML = finalObliged.map((item, index) => {
    const j = item.jamaah;
    const overallStatusHtml = item.attendedAny 
      ? `<span class="badge badge-green" style="font-weight: 700;">Sudah</span>`
      : `<span class="badge badge-danger" style="font-weight: 700;">Belum</span>`;
      
    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${j.namaLengkap}</strong></td>
        <td>${j.kelompokPengajian || "-"}</td>
        <td>${j.kelompokPeramutan || "-"}</td>
        <td style="text-align: center;">${overallStatusHtml}</td>
        <td><div style="display: flex; flex-wrap: wrap; gap: 4px;">${item.detailsHtml || "-"}</div></td>
      </tr>
    `;
  }).join("");
};

window.loadQRCetakDropdowns = function() {
  const selectJenis = document.getElementById("qr-jenis");
  if (!selectJenis) return;
  selectJenis.innerHTML = "";
  
  const list = typeof getMasterJenisPengajianList === 'function' ? getMasterJenisPengajianList() : (typeof localMasterJenisPengajian !== 'undefined' ? localMasterJenisPengajian : []);
  list.forEach(item => {
    const name = typeof item === 'object' ? item.nama : item;
    if (name) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      selectJenis.appendChild(opt);
    }
  });
};

window.generateStaticQRCode = function() {
  const tingkat = document.getElementById("qr-tingkat").value;
  const jenis = document.getElementById("qr-jenis").value;
  
  if (!tingkat || !jenis) {
    alert("Harap pilih tingkat dan jenis pengajian!");
    return;
  }
  
  const qrData = `AJI_PRESENSI:${tingkat}:${jenis}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  
  document.getElementById("qr-print-title").textContent = `${tingkat.toUpperCase()} - ${jenis.toUpperCase()}`;
  document.getElementById("qr-print-image").src = qrCodeUrl;
  document.getElementById("qr-print-area").style.display = "flex";
  document.getElementById("btn-print-qr").style.display = "flex";
};

window.generateGeneralQRCode = function() {
  const qrData = `AJI_PRESENSI_UMUM`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  
  document.getElementById("qr-print-title").textContent = "QR CODE ABSENSI UMUM (1 UNTUK SEMUA)";
  document.getElementById("qr-print-image").src = qrCodeUrl;
  document.getElementById("qr-print-area").style.display = "flex";
  document.getElementById("btn-print-qr").style.display = "flex";
};

window.printStaticQRCode = function() {
  const printContent = document.getElementById("qr-print-area").innerHTML;
  
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Cetak QR Code Absensi Dinding</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            color: black;
            background: white;
            text-align: center;
          }
          h2 { margin: 0 0 10px 0; font-size: 2.2rem; font-weight: 800; letter-spacing: 0.5px; }
          #qr-print-title { font-size: 1.6rem; font-weight: 800; margin-bottom: 25px; text-transform: uppercase; color: #047857; border-bottom: 3px solid #047857; padding-bottom: 8px; }
          img { width: 350px; height: 350px; border: 1px solid #ddd; padding: 15px; background: white; }
          p { margin-top: 25px; font-size: 1.15rem; color: #374151; max-width: 450px; line-height: 1.6; font-weight: 500; }
          strong { color: #111827; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div style="display: flex; flex-direction: column; align-items: center;">
          ${printContent}
        </div>
      </body>
    </html>
  `);
  win.document.close();
};

// --- END FILE: js/pengajian.js ---

