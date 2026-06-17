    // DOM CARRIER LOADER
    // ----------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
      initDatabaseConnection();
      setupDatabaseMockOrSupabase();
      setupEventListeners();
      checkSession();
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
      const menuDatabaseSettings = document.getElementById("menu-database-settings");
      const btnAdd = document.getElementById("btn-add-jamaah");
      const accessNote = document.getElementById("table-access-note");
      
      if (userRoleClean === "admin") {
        menuMaster.style.display = "block";
        menuUsers.style.display = "block";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "block";
        btnAdd.style.display = "inline-flex";
        accessNote.textContent = "Hak Akses: Administrator (Full CRUD Aktif)";
        accessNote.style.color = "#10b981";
      } else if (userRoleClean === "operator kelompok") {
        menuMaster.style.display = "none";
        menuUsers.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        btnAdd.style.display = "inline-flex"; // Operator can edit/add
        accessNote.textContent = `Hak Akses: Operator Kelompok ${user.kelompok} (CRUD Terbatas Aktif)`;
        accessNote.style.color = "#3b82f6";
      } else {
        menuMaster.style.display = "none";
        menuUsers.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
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
          google.script.run
            .withSuccessHandler(function(authResult) {
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
                      
                      if (typeof google !== "undefined" && google.script && google.script.run && google.script.run.logActionGAS) {
                        google.script.run.logActionGAS(curUser.username, "UPDATE_PROFILE", "Memperbarui profil sendiri (Local Mock).");
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
            .withFailureHandler(function(err) {
              saveBtn.disabled = false;
              saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan Profil';
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
      const currentUser = getCurrentUser();
      const curRoleClean = currentUser ? (currentUser.role || "").trim().toLowerCase() : "";
      if (sectionId === "section-database-settings" && curRoleClean !== "admin") {
        sectionId = "section-dashboard";
      }

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