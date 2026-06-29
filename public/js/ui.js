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

    function getKelompokPeramutan(age, maritalStatus, tingkatPendidikan) {
      const edu = tingkatPendidikan ? tingkatPendidikan.trim().toUpperCase() : "";
      if (age >= 13 && age <= 18) {
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
      const accessNote = document.getElementById("table-access-note");
      
      if (userRoleClean === "admin") {
        if (menuMaster) menuMaster.style.display = "block";
        if (menuUsers) menuUsers.style.display = "block";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "block";
        if (menuAudit) menuAudit.style.display = "block";
        if (btnAdd) btnAdd.style.display = "inline-flex";
        if (btnAddJadwal) btnAddJadwal.style.display = "inline-flex";
        accessNote.textContent = "Hak Akses: Administrator (Full CRUD Aktif)";
        accessNote.style.color = "#10b981";
      } else if (userRoleClean === "operator kelompok" || userRoleClean === "operator desa") {
        if (menuMaster) menuMaster.style.display = "none";
        if (menuUsers) menuUsers.style.display = "block";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        if (menuAudit) menuAudit.style.display = "block";
        if (btnAdd) btnAdd.style.display = "inline-flex";
        if (btnAddJadwal) btnAddJadwal.style.display = "inline-flex";
        if (userRoleClean === "operator kelompok") {
          accessNote.textContent = `Hak Akses: Operator Kelompok ${user.kelompok} (CRUD Terbatas Kelompok)`;
          accessNote.style.color = "#3b82f6";
        } else {
          accessNote.textContent = `Hak Akses: Operator Desa (CRUD Semua Tingkat)`;
          accessNote.style.color = "#10b981";
        }
      } else if (userRoleClean === "pengurus desa" || userRoleClean === "pengurus kelompok") {
        if (menuMaster) menuMaster.style.display = "none";
        if (menuUsers) menuUsers.style.display = "none";
        if (menuDatabaseSettings) menuDatabaseSettings.style.display = "none";
        if (menuAudit) menuAudit.style.display = "block";
        if (btnAdd) btnAdd.style.display = "none";
        if (btnAddJadwal) btnAddJadwal.style.display = "none";
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
        accessNote.textContent = "Hak Akses: User (Mode Read-only)";
        accessNote.style.color = "#9ca3af";
      }

      // Hide parent Pengaturan menu if no submenus are visible
      const menuPengaturanParent = document.getElementById("menu-pengaturan-parent");
      if (menuPengaturanParent) {
        const submenus = [menuMaster, menuUsers, menuDatabaseSettings, menuAudit];
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
      google.script.run
        .withSuccessHandler(function(res) {
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
        .withFailureHandler(function(err) { btn.disabled = false; btn.innerHTML = orig; showRegMsg("error", "Error: " + (err.message || err)); })
        .registerJamaahLinkedGAS({ username: username.toLowerCase(), passwordHash: sha256(pass1), jamaah_id: jamaahId, namaLengkap: jamaah ? jamaah.namaLengkap : "", kelompok: jamaah ? jamaah.kelompokPengajian : "" });
    }

    function doRegisterNew() {
      const nama = document.getElementById("reg-jamaah-search").value.trim();
      const jamaahId = document.getElementById("reg-jamaah-select").value;
      const kelompok = document.getElementById("reg-new-kelompok").value;
      const jk = document.getElementById("reg-new-jk").value;
      const tglLahir = document.getElementById("reg-new-tgl-lahir").value;
      const hp = document.getElementById("reg-new-hp").value.trim();
      const pernikahan = document.getElementById("reg-new-pernikahan").value;
      const username = document.getElementById("reg-new-username").value.trim();
      const pass1 = document.getElementById("reg-new-password").value;
      const pass2 = document.getElementById("reg-new-password2").value;

      if (!nama) { showRegMsg("warning", "Nama lengkap wajib diisi."); return; }
      if (!kelompok) { showRegMsg("warning", "Kelompok pengajian wajib dipilih."); return; }
      if (!username) { showRegMsg("warning", "Username tidak boleh kosong."); return; }
      if (pass1.length < 6) { showRegMsg("warning", "Password minimal 6 karakter."); return; }
      if (pass1 !== pass2) { showRegMsg("warning", "Konfirmasi password tidak cocok."); return; }

      const btn = document.getElementById("btn-register-new");
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';

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
            window.supabaseUploadPhotoToDrive(base64Str, newFileName).then(resolve).catch(reject);
          };
          reader.onerror = err => reject(err);
          reader.readAsDataURL(file);
        });
      }

      uploadPromise.then(fotoUrl => {
        if (jamaahId) {
          // Registrasi linked (jamaah sudah ada) -> pending approval
          google.script.run
            .withSuccessHandler(function(res) {
              btn.disabled = false; btn.innerHTML = orig;
              if (res.success && res.pending) {
                showRegMsg("success", "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan dari admin/operator kelompok " + kelompok + ".");
                btn.style.display = "none";
              } else if (res.reason === "username_taken") {
                showRegMsg("error", 'Username "' + username + '" sudah digunakan.');
              } else { showRegMsg("error", "Gagal mendaftar. Coba lagi."); }
            })
            .withFailureHandler(function(err) { btn.disabled = false; btn.innerHTML = orig; showRegMsg("error", "Error: " + (err.message || err)); })
            .registerJamaahLinkedGAS({ username: username.toLowerCase(), passwordHash: sha256(pass1), jamaah_id: jamaahId, namaLengkap: nama, kelompok: kelompok });
        } else {
          // Registrasi baru (jamaah baru) -> pending approval
          google.script.run
            .withSuccessHandler(function(res) {
              btn.disabled = false; btn.innerHTML = orig;
              if (res.success && res.pending) {
                showRegMsg("success", "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan dari admin/operator kelompok " + kelompok + ".");
                btn.style.display = "none";
              } else if (res.reason === "username_taken") {
                showRegMsg("error", 'Username "' + username + '" sudah digunakan.');
              } else { showRegMsg("error", "Gagal mendaftar. Coba lagi."); }
            })
            .withFailureHandler(function(err) { btn.disabled = false; btn.innerHTML = orig; showRegMsg("error", "Error: " + (err.message || err)); })
            .registerJamaahNewGAS({ namaLengkap: nama, kelompok, jenisKelamin: jk, tanggalLahir: tglLahir, nomorHp: hp, statusPernikahan: pernikahan, statusHubunganKeluarga: "Kepala Keluarga", username: username.toLowerCase(), passwordHash: sha256(pass1), fotoUrl: fotoUrl });
        }
      }).catch(err => {
        btn.disabled = false;
        btn.innerHTML = orig;
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
      google.script.run
        .withSuccessHandler(function(list) {
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
              const jamaah = localJamaahList.find(j => j.id === u.jamaah_id);
              const namaJamaah = jamaah ? jamaah.namaLengkap : (u.jamaah_id || "-");
              const tgl = u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "-";
              return "<tr><td><strong>" + u.username + "</strong></td><td>" + namaJamaah + "</td><td>" + (u.kelompok || "-") + "</td><td>" + tgl + "</td><td style=\"text-align:center;\"><button class=\"btn-primary\" style=\"padding:5px 12px;font-size:0.8rem;margin-right:5px;\" onclick=\"approveUser('" + u.username + "')\"><i class=\"fa-solid fa-check\"></i> Setujui</button><button style=\"padding:5px 12px;font-size:0.8rem;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;\" onclick=\"rejectUser('" + u.username + "')\"><i class=\"fa-solid fa-times\"></i> Tolak</button></td></tr>";
            }).join("") + "</tbody></table></div>";
        })
        .withFailureHandler(function(err) { container.innerHTML = '<div style="color:#ef4444;padding:15px;">Gagal memuat: ' + (err.message || err) + "</div>"; })
        .getPendingUsersGAS(opKelompok);
    };

    window.approveUser = function(username) {
      if (!confirm('Setujui pendaftaran akun "' + username + '"?')) return;
      const user = getCurrentUser();
      google.script.run
        .withSuccessHandler(function() { showToast("Akun " + username + " berhasil disetujui!", "success"); loadPendingUsers(); })
        .withFailureHandler(function(err) { showToast("Gagal: " + (err.message || err), "error"); })
        .approveUserGAS(username, user ? user.username : "admin");
    };

    window.rejectUser = function(username) {
      if (!confirm('Tolak dan hapus pendaftaran "' + username + '"?')) return;
      const user = getCurrentUser();
      google.script.run
        .withSuccessHandler(function() { showToast("Pendaftaran " + username + " ditolak.", "info"); loadPendingUsers(); })
        .withFailureHandler(function(err) { showToast("Gagal: " + (err.message || err), "error"); })
        .rejectUserGAS(username, user ? user.username : "admin");
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
        google.script.run
          .withSuccessHandler(function(result) {
            if (loginBtnEl) { loginBtnEl.disabled = false; loginBtnEl.textContent = "Masuk ke Dashboard"; }
            if (result.success) {
              sessionStorage.setItem("aji_session_user", JSON.stringify(result.user));
              fetchDatabaseFromServer(function() {
                showMainApp(result.user);
                showToast(`Selamat datang, ${result.user.username}!`, "success");
              });
            } else if (result.pending) {
              // Akun masih pending approval
              if (pendingMsg) pendingMsg.style.display = "block";
            } else {
              if (errorMsg) { errorMsg.textContent = "Username atau Password salah!"; errorMsg.style.display = "block"; }
            }
          })
          .withFailureHandler(function(err) {
            if (loginBtnEl) { loginBtnEl.disabled = false; loginBtnEl.textContent = "Masuk ke Dashboard"; }
            if (errorMsg) { errorMsg.textContent = "Terjadi kesalahan sistem: " + err.message; errorMsg.style.display = "block"; }
          })
          .authenticateUserGAS(user, hash);
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
              (localMasterKelompok || []).forEach(k => {
                const o = document.createElement("option");
                o.value = k.nama || k; o.textContent = k.nama || k;
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
          .saveMasterItemGAS(activeMasterTab, editingMasterName, value, curUser.username, pesertaValue, genderValue, dapuanValue);
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
      const isRestrictedTab = ["section-database-settings", "section-users", "section-master"].includes(sectionId);
      if (isRestrictedTab && curRoleClean !== "admin") {
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
        "section-audit": { title: "Riwayat Aktivitas & Audit Logs", icon: "fa-history" },
        "section-jamaah-dashboard": { title: "Dashboard Saya", icon: "fa-gauge-high" },
        "section-jamaah-keluarga": { title: "Keluarga Saya", icon: "fa-house-user" },
        "section-jamaah-jadwal": { title: "Jadwal Pengajian", icon: "fa-calendar-check" }
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
      } else if (sectionId === "section-jamaah-dashboard") {
        if (typeof loadJamaahDashboard === 'function') loadJamaahDashboard();
      } else if (sectionId === "section-jamaah-keluarga") {
        if (typeof loadJamaahKeluarga === 'function') loadJamaahKeluarga();
      } else if (sectionId === "section-jamaah-jadwal") {
        if (typeof initPortalCalendarFilters === 'function') initPortalCalendarFilters();
        if (typeof switchPortalJadwalTab === 'function') switchPortalJadwalTab('kalender');
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