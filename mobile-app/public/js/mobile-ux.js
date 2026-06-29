/* MOBILE USER EXPERIENCE HANDLER (AJI MOBILE) */

document.addEventListener("DOMContentLoaded", () => {
  initMobileUX();
});

function initMobileUX() {
  const isMobile = window.innerWidth <= 768 || typeof Capacitor !== "undefined";
  if (!isMobile) return;

  console.log("AJI Mobile UX Handler Initialized");

  // 1. Theme Auto Alignment
  alignThemeWithSystemPreference();

  // 2. Setup Pull-to-Refresh
  setupPullToRefresh();

  // 3. Setup Button Ripple/Feedback Effects
  setupTouchFeedback();
}

/**
 * Automatically syncs the app theme with the system preferences
 */
function alignThemeWithSystemPreference() {
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (!themeToggleBtn) return;

  const currentTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";
  
  // Listen to system preference change
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  
  // Set initial based on preference if no storage exists
  if (!localStorage.getItem("theme")) {
    if (systemPrefersDark.matches) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
      const icon = document.getElementById("theme-icon");
      if (icon) {
        icon.className = "fa-solid fa-moon";
      }
    } else {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      const icon = document.getElementById("theme-icon");
      if (icon) {
        icon.className = "fa-solid fa-sun";
      }
    }
  }
  
  systemPrefersDark.addEventListener("change", (e) => {
    if (localStorage.getItem("theme")) return; // Respect manual overrides
    
    if (e.matches) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
      const icon = document.getElementById("theme-icon");
      if (icon) icon.className = "fa-solid fa-moon";
    } else {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      const icon = document.getElementById("theme-icon");
      if (icon) icon.className = "fa-solid fa-sun";
    }
  });
}

/**
 * Setup Pull-To-Refresh on scrollable content body
 */
function setupPullToRefresh() {
  const contentBody = document.querySelector(".content-body");
  if (!contentBody) return;

  // Add PRT components
  contentBody.classList.add("pull-to-refresh-container");
  
  const ptrIndicator = document.createElement("div");
  ptrIndicator.className = "ptr-indicator";
  ptrIndicator.innerHTML = `
    <div class="spinner" style="margin-right: 8px;"></div>
    <span>Memperbarui data...</span>
  `;
  contentBody.prepend(ptrIndicator);

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  const pullThreshold = 80; // px

  contentBody.addEventListener("touchstart", (e) => {
    // Only allow pull-to-refresh when scrolled to top
    if (contentBody.scrollTop === 0) {
      startY = e.touches[0].pageY;
      isPulling = true;
    }
  }, { passive: true });

  contentBody.addEventListener("touchmove", (e) => {
    if (!isPulling) return;
    
    currentY = e.touches[0].pageY;
    const diff = currentY - startY;
    
    if (diff > 0) {
      // Pull down gesture
      ptrIndicator.style.opacity = Math.min(diff / pullThreshold, 1);
      
      if (diff < pullThreshold) {
        contentBody.style.transform = `translateY(${diff}px)`;
        ptrIndicator.style.transform = `translateY(${diff}px)`;
      } else {
        // Exceeded threshold, cap physics damping
        const damp = pullThreshold + (diff - pullThreshold) * 0.3;
        contentBody.style.transform = `translateY(${damp}px)`;
        ptrIndicator.style.transform = `translateY(${damp}px)`;
      }
    }
  }, { passive: true });

  contentBody.addEventListener("touchend", () => {
    if (!isPulling) return;
    isPulling = false;
    
    const diff = currentY - startY;
    
    contentBody.style.transition = "transform 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)";
    ptrIndicator.style.transition = "transform 0.3s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.3s ease";
    
    if (diff >= pullThreshold) {
      // Trigger refresh
      contentBody.style.transform = `translateY(50px)`;
      ptrIndicator.style.transform = `translateY(50px)`;
      contentBody.classList.add("ptr-loading");
      
      // Perform database refresh
      if (typeof window.fetchDatabaseFromServer === "function") {
        window.fetchDatabaseFromServer(() => {
          setTimeout(() => {
            contentBody.style.transform = "translateY(0)";
            ptrIndicator.style.transform = "translateY(0)";
            contentBody.classList.remove("ptr-loading");
            
            // Re-render active page to reflect fresh database state
            if (typeof window.refreshActivePage === "function") {
              window.refreshActivePage();
            }
            if (typeof window.showToast === "function") {
              window.showToast("Data berhasil diperbarui!", "success");
            }
          }, 600); // Smooth completion lag
        });
      } else {
        // Fallback if db refresh is missing
        setTimeout(() => {
          contentBody.style.transform = "translateY(0)";
          ptrIndicator.style.transform = "translateY(0)";
          contentBody.classList.remove("ptr-loading");
        }, 1000);
      }
    } else {
      // Pull back
      contentBody.style.transform = "translateY(0)";
      ptrIndicator.style.transform = "translateY(0)";
      ptrIndicator.style.opacity = 0;
    }
    
    // Clear styles after transition
    setTimeout(() => {
      contentBody.style.transition = "";
      ptrIndicator.style.transition = "";
    }, 300);
  });
}

/**
 * Setup standard Material touch ripples on clickables
 */
function setupTouchFeedback() {
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("button, .btn-primary, .btn-secondary, .bottom-nav-item, .drawer-menu-item a");
    if (!target) return;
    
    // Add ripple element
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    // Ensure position relative
    const originalPos = window.getComputedStyle(target).position;
    if (originalPos === "static") {
      target.style.position = "relative";
    }
    
    target.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
      if (originalPos === "static") {
        target.style.position = "";
      }
    }, 600);
  });
}

/**
 * Helper to display loading Skeleton cards in a container while fetching data
 */
window.showSkeletonLoader = function(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let skeletonsHtml = `<div class="skeleton-list">`;
  for (let i = 0; i < count; i++) {
    skeletonsHtml += `
      <div class="skeleton-card">
        <div class="skeleton-loader skeleton-title"></div>
        <div class="skeleton-loader skeleton-text" style="width: 85%;"></div>
        <div class="skeleton-loader skeleton-text" style="width: 70%;"></div>
        <div class="skeleton-loader skeleton-text" style="width: 40%; margin-top: 10px;"></div>
      </div>
    `;
  }
  skeletonsHtml += `</div>`;
  
  container.innerHTML = skeletonsHtml;
};
