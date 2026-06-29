/* MOBILE NAVIGATION CONTROLLER (AJI MOBILE) */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNavigation();
});

function initMobileNavigation() {
  const isMobile = window.innerWidth <= 768 || typeof Capacitor !== "undefined";
  if (!isMobile) return;

  console.log("AJI Mobile Navigation Initialized");

  // Sync sessionStorage user to localStorage for persistent mobile session
  const originalSessionStorageSetItem = sessionStorage.setItem;
  sessionStorage.setItem = function(key, value) {
    originalSessionStorageSetItem.apply(this, arguments);
    if (key === "aji_session_user") {
      localStorage.setItem("aji_session_user", value);
    }
  };

  const originalSessionStorageRemoveItem = sessionStorage.removeItem;
  sessionStorage.removeItem = function(key) {
    originalSessionStorageRemoveItem.apply(this, arguments);
    if (key === "aji_session_user") {
      localStorage.removeItem("aji_session_user");
    }
  };

  // 1. Hook into showMainApp to adapt views
  const originalShowMainApp = window.showMainApp;
  window.showMainApp = function(user) {
    if (originalShowMainApp) originalShowMainApp(user);
    
    const userRoleClean = (user.role || "").trim().toLowerCase();
    
    // Hide desktop elements
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) sidebar.style.display = "none";
    
    // Setup mobile views based on role
    if (userRoleClean === "jamaah") {
      document.getElementById("bottom-nav-jamaah").style.display = "flex";
      document.getElementById("bottom-nav-admin").style.display = "none";
      
      // Hide Hamburger drawer trigger on mobile header for jamaah portal
      const hamburger = document.getElementById("sidebar-toggle");
      if (hamburger) hamburger.style.display = "none";
    } else {
      document.getElementById("bottom-nav-jamaah").style.display = "none";
      document.getElementById("bottom-nav-admin").style.display = "flex";
      
      // Show Hamburger drawer trigger on mobile header for admin/operators
      const hamburger = document.getElementById("sidebar-toggle");
      if (hamburger) hamburger.style.display = "block";
      
      // Set user profile details in Drawer
      document.getElementById("drawer-user-name").textContent = user.username;
      
      let roleLabel = "LIHAT SAJA";
      if (userRoleClean === "admin") roleLabel = "ADMIN";
      else if (userRoleClean === "operator kelompok") roleLabel = "OP KELOMPOK";
      else if (userRoleClean === "operator desa") roleLabel = "OP DESA";
      else if (userRoleClean === "pengurus desa") roleLabel = "PG DESA";
      else if (userRoleClean === "pengurus kelompok") roleLabel = "PG KELOMPOK";
      
      document.getElementById("drawer-user-role").textContent = roleLabel;
      
      // Setup avatar initial
      const avatar = document.getElementById("drawer-user-avatar");
      if (avatar) {
        let fotoUrl = null;
        if (user.jamaah_id) {
          const jItem = getJamaahList().find(j => j.id === user.jamaah_id);
          if (jItem && jItem.fotoUrl) {
            fotoUrl = jItem.fotoUrl;
          }
        }
        if (fotoUrl) {
          avatar.innerHTML = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
          avatar.innerHTML = "";
          avatar.textContent = user.username.charAt(0).toUpperCase();
        }
      }
      
      // Toggle menu items inside Drawer based on access rights
      const isSuperAdmin = userRoleClean === "admin";
      document.getElementById("drawer-menu-master").style.display = isSuperAdmin ? "block" : "none";
      document.getElementById("drawer-menu-db").style.display = isSuperAdmin ? "block" : "none";
      document.getElementById("drawer-menu-users").style.display = 
        (userRoleClean === "admin" || userRoleClean === "operator kelompok" || userRoleClean === "operator desa") ? "block" : "none";
    }
  };

  // 2. Hook into switchTab to update Bottom Nav / Drawer items active state
  const originalSwitchTab = window.switchTab;
  window.switchTab = function(sectionId) {
    if (originalSwitchTab) originalSwitchTab(sectionId);
    
    // Sync bottom navigation active state
    document.querySelectorAll(".bottom-nav-item").forEach(item => {
      if (item.getAttribute("data-target") === sectionId) {
        item.classList.add("active");
      } else if (item.id !== "bottom-nav-toggle-drawer") {
        item.classList.remove("active");
      }
    });
    
    // Sync drawer menu active state
    document.querySelectorAll(".drawer-menu-item").forEach(item => {
      if (item.getAttribute("data-target") === sectionId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  };

  // 3. Setup Bottom Nav Tab Switch Listeners
  document.querySelectorAll(".bottom-nav-item").forEach(item => {
    item.addEventListener("click", function(e) {
      e.preventDefault();
      
      // If it's the drawer toggle button
      if (this.id === "bottom-nav-toggle-drawer") {
        toggleDrawer(true);
        return;
      }
      
      const targetSection = this.getAttribute("data-target");
      if (targetSection) {
        switchTab(targetSection);
      }
    });
  });

  // 4. Setup Drawer Menu Click Listeners
  document.querySelectorAll(".drawer-menu-item").forEach(item => {
    item.addEventListener("click", function(e) {
      e.preventDefault();
      const targetSection = this.getAttribute("data-target");
      if (targetSection) {
        switchTab(targetSection);
        toggleDrawer(false);
      }
    });
  });

  // 5. Drawer overlay & Hamburg-button toggle handlers
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("mobile-drawer");
  const hamburgerBtn = document.getElementById("sidebar-toggle");

  if (hamburgerBtn) {
    // Intercept click to open mobile drawer instead of web sidebar toggle
    hamburgerBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopImmediatePropagation(); // Prevent original ui.js listener
      toggleDrawer(true);
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => toggleDrawer(false));
  }

  function toggleDrawer(open) {
    if (open) {
      overlay.classList.add("active");
      drawer.classList.add("active");
    } else {
      overlay.classList.remove("active");
      drawer.classList.remove("active");
    }
  }

  // 6. Handle specific menu links inside bottom-nav & drawer
  // Jamaah profile button click
  const jamaahProfileBtn = document.getElementById("bottom-nav-jamaah-profile");
  if (jamaahProfileBtn) {
    jamaahProfileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("section-profile");
    });
  }

  // Drawer profile button click
  const drawerProfileBtn = document.getElementById("drawer-menu-profile");
  if (drawerProfileBtn) {
    drawerProfileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("section-profile");
      toggleDrawer(false);
    });
  }

  // Drawer logout button click
  const drawerLogoutBtn = document.getElementById("drawer-logout-btn");
  if (drawerLogoutBtn) {
    drawerLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleDrawer(false);
      // Trigger original logout button logic
      const webLogoutBtn = document.getElementById("logout-btn");
      if (webLogoutBtn) {
        webLogoutBtn.click();
      }
    });
  }
}
