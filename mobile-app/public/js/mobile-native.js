/* CAPACITOR NATIVE PLUGINS INTEGRATION (AJI MOBILE) */

// Global variable to track if native preferences have been synced to localStorage
window.preferencesLoaded = false;

document.addEventListener("DOMContentLoaded", () => {
  initNativeWrapper();
});

async function initNativeWrapper() {
  const isCapacitor = typeof Capacitor !== "undefined";
  if (!isCapacitor) {
    console.log("Not running inside Capacitor. Native wrapper bypassed.");
    return;
  }

  console.log("AJI Native Wrapper Initializing...");

  try {
    const { Preferences, SplashScreen, StatusBar, App } = Capacitor.Plugins;

    // 1. Bridge Preferences (Async) -> localStorage (Sync)
    if (Preferences) {
      const url = await Preferences.get({ key: "aji_supabase_url" });
      const key = await Preferences.get({ key: "aji_supabase_key" });
      const session = await Preferences.get({ key: "aji_session" });
      
      if (url.value) localStorage.setItem("aji_supabase_url", url.value);
      if (key.value) localStorage.setItem("aji_supabase_key", key.value);
      if (session.value) localStorage.setItem("aji_session", session.value);

      console.log("Capacitor Preferences synced to localStorage");
      
      // Override storage setters to keep them in sync
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(k, v) {
        originalSetItem.apply(this, arguments);
        if (k === "aji_supabase_url" || k === "aji_supabase_key" || k === "aji_session") {
          Preferences.set({ key: k, value: v });
        }
      };

      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = function(k) {
        originalRemoveItem.apply(this, arguments);
        if (k === "aji_supabase_url" || k === "aji_supabase_key" || k === "aji_session") {
          Preferences.remove({ key: k });
        }
      };
    }

    // Mark preferences as loaded and trigger initializations
    window.preferencesLoaded = true;
    if (typeof window.initDatabaseConnection === "function") {
      window.initDatabaseConnection();
    }
    if (typeof window.setupDatabaseMockOrSupabase === "function") {
      window.setupDatabaseMockOrSupabase();
    }
    if (typeof window.checkSession === "function") {
      window.checkSession();
    }

    // 2. Hide Splash Screen after session check
    if (SplashScreen) {
      setTimeout(async () => {
        await SplashScreen.hide();
        console.log("Capacitor Splash Screen hidden");
      }, 500);
    }

    // 3. Customize Status Bar Color (Emerald #10b981)
    if (StatusBar) {
      try {
        await StatusBar.setBackgroundColor({ color: "#10b981" });
        await StatusBar.setStyle({ style: "DARK" }); // Dark background, light text icons
        console.log("Capacitor Status Bar styled");
      } catch (e) {
        console.warn("StatusBar style not supported on this platform:", e);
      }
    }

    // 4. Handle Android Hardware Back Button
    if (App) {
      App.addListener("backButton", (info) => {
        // A. Close open bottom sheet modal
        const activeOverlay = document.querySelector(".sheet-overlay.active");
        if (activeOverlay) {
          activeOverlay.classList.remove("active");
          const activeSheet = document.querySelector(".bottom-sheet.active");
          if (activeSheet) activeSheet.classList.remove("active");
          return;
        }

        // B. Close web app overlay modals
        const activeModal = document.querySelector(".modal-overlay[style*='display: flex'], .modal-overlay[style*='display:block']");
        if (activeModal) {
          activeModal.style.display = "none";
          return;
        }

        // C. Close Drawer if active
        const drawer = document.getElementById("mobile-drawer");
        if (drawer && drawer.classList.contains("active")) {
          document.getElementById("drawer-overlay").classList.remove("active");
          drawer.classList.remove("active");
          return;
        }

        // D. Handle screen navigation back, or exit
        const loginScreen = document.getElementById("login-screen");
        const dashboardScreen = document.getElementById("section-dashboard");
        const jamaahDashboard = document.getElementById("section-jamaah-dashboard");
        
        const onLogin = loginScreen && loginScreen.style.display !== "none";
        const onDashboard = (dashboardScreen && dashboardScreen.classList.contains("active")) || 
                            (jamaahDashboard && jamaahDashboard.classList.contains("active"));

        if (onLogin || onDashboard) {
          // Exit App if on critical screens
          App.exitApp();
        } else {
          // Navigate to dashboard
          const currentUser = getCurrentUser();
          if (currentUser) {
            const roleClean = (currentUser.role || "").trim().toLowerCase();
            if (roleClean === "jamaah") {
              switchTab("section-jamaah-dashboard");
            } else {
              switchTab("section-dashboard");
            }
          } else {
            App.exitApp();
          }
        }
      });
    }

    // 5. Setup Native Camera Picker Interceptor
    setupCameraPicker();

    // 6. Setup Biometrics Login option
    setupBiometrics();

    // 7. Setup Push Notifications
    setupPushNotifications();

  } catch (err) {
    console.error("Error in Capacitor Native wrapper initializations:", err);
  }
}

/**
 * Intercept profile photo clicks and trigger native Camera Plugin
 */
function setupCameraPicker() {
  const isCapacitor = typeof Capacitor !== "undefined";
  if (!isCapacitor) return;

  // We wait a bit to ensure elements are fully rendered in the DOM
  setTimeout(() => {
    // Look for registration profile preview wrapper and bind camera click
    const regPreviewWrapper = document.getElementById("reg-new-foto-preview-wrapper");
    if (regPreviewWrapper) {
      regPreviewWrapper.style.cursor = "pointer";
      regPreviewWrapper.addEventListener("click", () => {
        triggerNativeCamera(async (base64String) => {
          const previewImg = document.getElementById("reg-new-foto-preview");
          const placeholder = document.getElementById("reg-new-foto-placeholder");
          
          if (previewImg && placeholder) {
            previewImg.src = `data:image/jpeg;base64,${base64String}`;
            previewImg.style.display = "block";
            placeholder.style.display = "none";
            
            // Store base64 data for upload reference on registration form
            window.tempRegisteredPhotoBase64 = base64String;
          }
        });
      });
    }
    
    // In ui.js, there is also an edit profile picture feature
    // Monkeypatch uploadFotoProfil (if defined) or bind click on avatar elements
    // ...
  }, 1500);
}

/**
 * Capture photo via Capacitor Camera
 */
async function triggerNativeCamera(callback) {
  const { Camera } = Capacitor.Plugins;
  if (!Camera) {
    alert("Camera plugin not available");
    return;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: "base64", // Get base64 string for direct upload/rendering
      source: "PROMPT" // Prompt user to take a new photo or select from library
    });
    
    if (image && image.base64String) {
      callback(image.base64String);
    }
  } catch (err) {
    console.warn("User cancelled or camera error:", err);
  }
}

/**
 * Biometric authentication logic
 */
async function setupBiometrics() {
  const isCapacitor = typeof Capacitor !== "undefined";
  if (!isCapacitor) return;
  
  const NativeBiometric = window.Capacitor?.Plugins?.NativeBiometric;
  if (!NativeBiometric) {
    console.log("NativeBiometric plugin not loaded");
    return;
  }

  try {
    const available = await NativeBiometric.isAvailable();
    if (!available.isAvailable) return;
    
    console.log("Native biometrics available on device");
    
    // Add biometric login button or auto-trigger it on login screen
    const loginCard = document.querySelector(".login-card");
    if (loginCard) {
      // Check if biometric option was enabled previously
      const hasBiometricSet = localStorage.getItem("aji_biometric_enabled") === "true";
      
      const bioBtnContainer = document.createElement("div");
      bioBtnContainer.style.textAlign = "center";
      bioBtnContainer.style.marginTop = "15px";
      bioBtnContainer.innerHTML = `
        <button type="button" id="biometric-login-btn" class="btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; border: 1px solid var(--border-color); background: transparent;">
          <i class="fa-solid fa-fingerprint" style="font-size: 1.1rem; color: var(--primary);"></i>
          <span>Masuk dengan Sidik Jari / Wajah</span>
        </button>
      `;
      
      const loginForm = document.getElementById("login-form");
      if (loginForm) {
        loginForm.after(bioBtnContainer);
        
        document.getElementById("biometric-login-btn").addEventListener("click", () => {
          triggerBiometricAuth();
        });
        
        // Auto trigger if already enabled and we have credentials cached
        if (hasBiometricSet && localStorage.getItem("aji_biometric_user") && localStorage.getItem("aji_biometric_pass")) {
          setTimeout(() => {
            triggerBiometricAuth();
          }, 800);
        }
      }
    }
  } catch (err) {
    console.warn("Biometrics error:", err);
  }
}

async function triggerBiometricAuth() {
  const NativeBiometric = window.Capacitor?.Plugins?.NativeBiometric;
  if (!NativeBiometric) return;
  
  try {
    const verified = await NativeBiometric.verifyIdentity({
      reason: "Konfirmasi sidik jari / wajah Anda untuk masuk ke dashboard AJI.",
      title: "Autentikasi Biometrik",
      subtitle: "Gunakan sensor biometrik perangkat Anda",
      description: "Verifikasi identitas Anda untuk masuk"
    });
    
    if (verified) {
      const user = localStorage.getItem("aji_biometric_user");
      const pass = localStorage.getItem("aji_biometric_pass");
      
      if (user && pass) {
        // Fill login fields
        const loginUserEl = document.getElementById("login-username");
        const loginPassEl = document.getElementById("login-password");
        if (loginUserEl && loginPassEl) {
          loginUserEl.value = user;
          loginPassEl.value = pass;
          
          // Submit login form
          const loginForm = document.getElementById("login-form");
          if (loginForm) {
            loginForm.dispatchEvent(new Event("submit"));
          }
        }
      } else {
        alert("Autentikasi biometrik berhasil, silakan lakukan login manual sekali untuk mengaktifkan login biometrik selanjutnya.");
      }
    }
  } catch (err) {
    console.warn("Biometric verification failed/cancelled:", err);
  }
}

/**
 * Call this when a login is successful to prompt user to enable biometrics
 */
window.enableBiometricShortcut = async function(username, password) {
  const isCapacitor = typeof Capacitor !== "undefined";
  if (!isCapacitor) return;
  
  const NativeBiometric = window.Capacitor?.Plugins?.NativeBiometric;
  if (!NativeBiometric) return;

  try {
    const available = await NativeBiometric.isAvailable();
    if (!available.isAvailable) return;
    
    const hasBiometricSet = localStorage.getItem("aji_biometric_enabled") === "true";
    if (hasBiometricSet) return; // Already enabled
    
    if (confirm("Apakah Anda ingin mengaktifkan login dengan Sidik Jari / Wajah untuk perangkat ini di login berikutnya?")) {
      localStorage.setItem("aji_biometric_enabled", "true");
      localStorage.setItem("aji_biometric_user", username);
      localStorage.setItem("aji_biometric_pass", password);
      
      if (typeof window.showToast === "function") {
        window.showToast("Login biometrik berhasil diaktifkan!", "success");
      }
    }
  } catch (e) {
    console.warn("Biometric enable prompt cancelled or error:", e);
  }
};

/**
 * Setup Firebase Push Notifications and listener hooks
 */
async function setupPushNotifications() {
  const isCapacitor = typeof Capacitor !== "undefined";
  if (!isCapacitor) return;

  const { PushNotifications } = Capacitor.Plugins;
  if (!PushNotifications) {
    console.log("PushNotifications plugin not available");
    return;
  }

  try {
    // Request permission to show notifications
    let permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive === "granted") {
      // Register with FCM/APNS services
      await PushNotifications.register();
      console.log("Push Notification service registered");
    }

    // Success registration token handler
    PushNotifications.addListener("registration", (token) => {
      console.log("FCM Registration Token received:", token.value);
      localStorage.setItem("aji_push_token", token.value);
      
      // Upload token to Supabase database if logged in
      savePushTokenToSupabase(token.value);
    });

    // Handle token registration failures
    PushNotifications.addListener("registrationError", (error) => {
      console.error("FCM Token registration error:", error);
    });

    // Handle incoming notifications while app is active (foreground)
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Foreground push notification received:", notification);
      if (typeof window.showToast === "function") {
        window.showToast(`${notification.title}: ${notification.body}`, "info");
      }
    });

    // Handle actions on notification click (launch app / open tab)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push Notification clicked by user:", action);
      const data = action.notification.data || {};
      if (data.targetTab) {
        setTimeout(() => {
          if (typeof window.switchTab === "function") {
            window.switchTab(data.targetTab);
          }
        }, 1000);
      }
    });

  } catch (err) {
    console.warn("FCM push registration setup failed:", err);
  }
}

/**
 * Save Firebase registration token back to Supabase user table
 */
async function savePushTokenToSupabase(token) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || typeof useSupabase === "undefined" || !useSupabase || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from("app_users")
      .update({ push_token: token })
      .eq("username", user.username);
      
    if (error) {
      console.warn("Failed to upload push token (table column might be missing):", error.message);
    } else {
      console.log("Push token successfully synchronized to Supabase app_users table.");
    }
  } catch (e) {
    console.warn("Error uploading token to Supabase:", e);
  }
}
