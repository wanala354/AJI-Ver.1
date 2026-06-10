const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  
  // Collect logs and errors
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`[PAGE ERROR] ${err.stack || err.toString()}`);
  });
  
  try {
    console.log("Navigating to local site...");
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    
    // Login as admin
    console.log("Attempting to login...");
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'admin123');
    await page.click('.login-btn'); // Click login
    
    // Wait for the app-container to show
    await page.waitForSelector('#app-container', { visible: true, timeout: 5000 });
    console.log("Logged in successfully!");
    
    // --- TEST 1: ADD JAMAAH ---
    console.log("Navigating to Modul Jamaah...");
    await page.evaluate(() => {
      const container = document.getElementById('app-container');
      const loginScreen = document.getElementById('login-screen');
      console.log(`[DIAGNOSTICS] Body size: ${document.body.clientWidth}x${document.body.clientHeight}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        console.log(`[DIAGNOSTICS] Container display: ${container.style.display}, actual rect: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
      }
      if (loginScreen) {
        const rect = loginScreen.getBoundingClientRect();
        console.log(`[DIAGNOSTICS] LoginScreen display: ${loginScreen.style.display}, actual rect: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
      }
      const sb = document.getElementById('app-sidebar');
      if (sb) {
        const rect = sb.getBoundingClientRect();
        console.log(`[DIAGNOSTICS-SB] Sidebar: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
      }
      const el = document.querySelector('[data-target="section-jamaah"]');
      console.log(`[DIAGNOSTICS] Element exists: ${!!el}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        console.log(`[DIAGNOSTICS] BoundingRect: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
      }
    });
    // Click Modul Jamaah menu
    await page.click('[data-target="section-jamaah"]');
    await page.waitForSelector('#btn-add-jamaah', { visible: true });
    
    console.log("Opening Tambah Jamaah Modal...");
    await page.click('#btn-add-jamaah');
    await page.waitForSelector('#jamaah-modal.active', { timeout: 3000 });
    
    console.log("Filling in Jamaah Form...");
    await page.type('#form-nama', 'Test Jamaah Baru');
    await page.select('#form-gender', 'Laki-laki');
    await page.type('#form-tempat-lahir', 'Bekasi');
    
    // Set Date of Birth (YYYY-MM-DD format)
    await page.type('#form-tanggal-lahir', '1995-05-12');
    
    // Wait for dropdown selections
    await page.select('#form-pernikahan', 'Menikah');
    await page.select('#form-hubungan', 'Kepala Keluarga');
    
    await page.type('#form-hp', '081234567890');
    await page.select('#form-pendidikan', 'S1');
    await page.select('#form-pekerjaan', 'Swasta');
    await page.select('#form-dapuan', 'Rokyah biasa');
    await page.select('#form-ekonomi', 'Menengah');
    await page.select('#form-kelancaran', 'Lancar');
    
    console.log("Submitting Jamaah Form...");
    await page.click('#modal-save-btn');
    
    // Wait for 2 seconds to see if it processes or fails
    await new Promise(r => setTimeout(r, 2000));
    
    // --- TEST 2: ADD USER ---
    console.log("Navigating to Manajemen User...");
    await page.click('[data-target="section-users"]');
    await page.waitForSelector('#btn-add-user', { visible: true });
    
    console.log("Opening Tambah User Modal...");
    await page.click('#btn-add-user');
    await page.waitForSelector('#user-modal.active', { timeout: 3000 });
    
    console.log("Filling in User Form...");
    await page.type('#user-form-username', 'testoperator');
    await page.type('#user-form-email', 'testop@example.com');
    await page.select('#user-form-role', 'Operator Kelompok');
    
    // Wait for kelompok dropdown to show and select
    await page.waitForSelector('#user-form-kelompok', { visible: true });
    await page.select('#user-form-kelompok', 'Pondok Melati');
    
    await page.type('#user-form-password', 'operator123');
    
    console.log("Submitting User Form...");
    await page.click('#user-modal-save-btn');
    
    // Wait for 2 seconds
    await new Promise(r => setTimeout(r, 2000));
    
    // Verify LocalStorage data
    const storageData = await page.evaluate(() => {
      return {
        jamaah: JSON.parse(localStorage.getItem("aji_jamaah") || "[]"),
        users: JSON.parse(localStorage.getItem("aji_users") || "[]")
      };
    });
    
    console.log("=== VERIFICATION ===");
    console.log("Total Jamaah in LocalStorage:", storageData.jamaah.length);
    console.log("Last Jamaah:", storageData.jamaah[storageData.jamaah.length - 1]);
    console.log("Total Users in LocalStorage:", storageData.users.length);
    console.log("Last User:", storageData.users[storageData.users.length - 1]);
    console.log("====================");
    
    console.log("Test finished.");
  } catch (err) {
    console.error("Test encountered an exception:", err);
  } finally {
    await browser.close();
  }
})();
