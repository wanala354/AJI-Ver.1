# Panduan Deploy AJI v2.0 ke Google Apps Script (GAS)

Dokumen ini menjelaskan langkah-langkah memindahkan Aplikasi Jatiwarna Info (AJI) v2.0 dari versi simulator offline (`localStorage`) ke server Google Apps Script (GAS) dengan database terpusat di Google Spreadsheet.

---

## Langkah 1: Siapkan Google Spreadsheet sebagai Database
1. Buat Google Spreadsheet baru di Google Drive Anda. Beri nama, misalnya: `Database_AJI_PondokMelati`.
2. Buat **5 Tab Sheet** berikut dengan nama dan kolom header yang persis sama di baris pertama (Row 1):

### Tab 1: `Users`
| A (username) | B (email) | C (role) | D (passwordHash) |
| :--- | :--- | :--- | :--- |
| admin | admin@jatiwarnainfo.or.id | Admin | 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918 |
| user | user@jatiwarnainfo.or.id | User | 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8 |

### Tab 2: `Jamaah`
| A (id) | B (namaLengkap) | C (kelompokPengajian) | D (tempatLahir) | E (tanggalLahir) | F (jenisKelamin) | G (nomorHp) | H (tingkatPendidikan) | I (statusPernikahan) | J (statusHubunganKeluarga) | K (kepalaKeluargaId) | L (pekerjaanUtama) | M (dapuan) | N (statusEkonomi) | O (kelancaranSambung) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

### Tab 3: `Kepala Keluarga`
| A (id) | B (namaLengkap) | C (kelompokPengajian) |
| :--- | :--- | :--- |

### Tab 4: `Kartu Keluarga`
| A (kepalaKeluargaId) | B (anggotaKeluargaId) |
| :--- | :--- |

### Tab 5: `Audit Log`
| A (timestamp) | B (user) | C (action) | D (description) |
| :--- | :--- | :--- | :--- |

---

## Langkah 2: Buat Proyek Apps Script
1. Di Google Spreadsheet Anda, klik menu **Ekstensi** > **Apps Script** (Extensions > Apps Script).
2. Proyek Apps Script baru akan terbuka. Anda akan melihat file default bernama `Code.gs`.

---

## Langkah 3: Tulis Script Server-Side (`Code.gs`)
Hapus semua kode di dalam `Code.gs`, lalu salin dan tempel kode berikut yang mengimplementasikan API CRUD terhubung ke Google Spreadsheet:

```javascript
// Ganti ID dengan ID Google Spreadsheet Anda
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('AJI v2.0 - Aplikasi Jatiwarna Info')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Helper untuk membaca Sheet menjadi Array of Objects
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    headers.forEach((header, index) => {
      // Ubah Tanggal lahir ke format YYYY-MM-DD jika bertipe Date
      if (header === "tanggalLahir" && row[index] instanceof Date) {
        obj[header] = Utilities.formatDate(row[index], Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        obj[header] = row[index];
      }
    });
    data.push(obj);
  }
  return data;
}

// API: Ambil Data Jamaah
function getJamaahListGAS() {
  return getSheetData("Jamaah");
}

// API: Ambil Data Kepala Keluarga
function getKepalaKeluargaListGAS() {
  return getSheetData("Kepala Keluarga");
}

// API: Ambil Data Kartu Keluarga
function getKartuKeluargaMappingsGAS() {
  return getSheetData("Kartu Keluarga");
}

// API: Ambil Data Audit Log
function getAuditLogsGAS() {
  return getSheetData("Audit Log");
}

// API: Log Aktivitas
function logActionGAS(user, action, description) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Audit Log");
  sheet.appendRow([
    new Date().toISOString(),
    user,
    action,
    description
  ]);
}

// API: Simpan Jamaah (Create & Update)
function saveJamaahGAS(jamaahData, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Jamaah");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let isEdit = false;
  let rowIndex = -1;
  
  // Enforce ID generation if new
  if (!jamaahData.id) {
    let maxIdNum = 0;
    for (let i = 1; i < rows.length; i++) {
      const idStr = rows[i][0]; // Kolom A (id)
      const num = parseInt(idStr.replace("J-", ""));
      if (num > maxIdNum) maxIdNum = num;
    }
    jamaahData.id = "J-" + String(maxIdNum + 1).padStart(3, '0');
  } else {
    // Edit mode: cari nomor baris
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === jamaahData.id) {
        isEdit = true;
        rowIndex = i + 1; // 1-indexed dan lewati header
        break;
      }
    }
  }

  // Jika hubungan = Kepala Keluarga, kosongkan kepalaKeluargaId
  if (jamaahData.statusHubunganKeluarga === "Kepala Keluarga") {
    jamaahData.kepalaKeluargaId = "";
  }
  
  // Mapping objek data ke baris kolom sheet
  const newRowValues = headers.map(header => jamaahData[header] !== undefined ? jamaahData[header] : "");
  
  if (isEdit && rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRowValues]);
    logActionGAS(operatorUsername, "UPDATE", "Memperbarui Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + ") via Apps Script.");
  } else {
    sheet.appendRow(newRowValues);
    logActionGAS(operatorUsername, "CREATE", "Menambahkan Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + ") via Apps Script.");
  }
  
  // Trigger Sinkronisasi Relasional di Server
  syncRelationalTablesGAS();
  return jamaahData;
}

// API: Hapus Jamaah
function deleteJamaahGAS(id, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Jamaah");
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const nama = rows[i][1];
      sheet.deleteRow(i + 1);
      
      // Jika yang dihapus adalah Kepala Keluarga, bersihkan referensi anggota keluarganya
      if (rows[i][9] === "Kepala Keluarga") {
        const jamaahRows = sheet.getDataRange().getValues();
        for (let j = 1; j < jamaahRows.length; j++) {
          if (jamaahRows[j][10] === id) { // Kolom K (kepalaKeluargaId)
            sheet.getRange(j + 1, 11).setValue(""); // Kosongkan FK
          }
        }
      }
      
      logActionGAS(operatorUsername, "DELETE", "Menghapus Jamaah " + nama + " (" + id + ") via Apps Script.");
      syncRelationalTablesGAS();
      return true;
    }
  }
  return false;
}

// Sinkronisasi Relasional Otomatis (Kepala Keluarga & Kartu Keluarga)
function syncRelationalTablesGAS() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const jamaahList = getSheetData("Jamaah");
  
  // 1. Sinkronisasi Kepala Keluarga
  const kkSheet = ss.getSheetByName("Kepala Keluarga");
  kkSheet.clearContents();
  kkSheet.appendRow(["id", "namaLengkap", "kelompokPengajian"]);
  
  const kepalaKeluargaList = jamaahList.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga");
  kepalaKeluargaList.forEach(j => {
    kkSheet.appendRow([j.id, j.namaLengkap, j.kelompokPengajian]);
  });
  
  // 2. Sinkronisasi Mappings Kartu Keluarga
  const mapSheet = ss.getSheetByName("Kartu Keluarga");
  mapSheet.clearContents();
  mapSheet.appendRow(["kepalaKeluargaId", "anggotaKeluargaId"]);
  
  jamaahList.forEach(j => {
    if (j.statusHubunganKeluarga !== "Kepala Keluarga" && j.kepalaKeluargaId) {
      const kkExists = kepalaKeluargaList.some(kk => kk.id === j.kepalaKeluargaId);
      if (kkExists) {
        mapSheet.appendRow([j.kepalaKeluargaId, j.id]);
      }
    }
  });
}

// API: Login Kredensial
function authenticateUserGAS(username, passwordHash) {
  const users = getSheetData("Users");
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === passwordHash);
  if (user) {
    logActionGAS(user.username, "LOGIN", "Pengguna " + user.username + " login ke GAS Web App.");
    return { success: true, user: { username: user.username, email: user.email, role: user.role } };
  }
  return { success: false };
}
```

---

## Langkah 4: Buat File `Index.html` di GAS Editor
1. Di panel kiri Apps Script Editor, klik tanda **`+`** (Tambah file) > **HTML**.
2. Beri nama file: **`Index`** (tanpa ekstensi `.html`).
3. Salin dan tempel seluruh kode dari file **`index_standalone.html`** yang sudah kami buat di workspace Anda ke file `Index.html` ini.

### Modifikasi Client-Side Bridge di `Index.html`:
Agar aplikasi membaca data langsung dari Google Spreadsheet dan bukan lagi dari `localStorage`, ganti blok fungsi database lokal di bagian bawah `<script>` Index.html Anda:

Cari fungsi JavaScript yang memanggil `localStorage` (seperti `getJamaahList()`, `saveJamaah()`, dll) dan hubungkan menggunakan API `google.script.run`.

Berikut adalah contoh pemetaan pemanggilannya:

```javascript
// GANTI LOGIKA DATABASE SIMULATOR ANDA DENGAN INI:

// Ambil List Jamaah dari GAS
function getJamaahList() {
  // Karena GAS asynchronous, kita gunakan callback:
  google.script.run.withSuccessHandler(function(data) {
    // Inject penghitungan umur & peramutan client-side
    window.currentJamaahData = data.map(j => {
      const age = calculateAge(j.tanggalLahir);
      const peramutan = getKelompokPeramutan(age, j.statusPernikahan);
      return { ...j, umur: age, kelompokPeramutan: peramutan };
    });
    // Triger refresh tabel/grafik
    refreshActivePage(); 
  }).getJamaahListGAS();
}

// Simpan data ke GAS
function saveJamaah(jamaahData, operatorUsername) {
  google.script.run.withSuccessHandler(function() {
    alert("Data berhasil disimpan ke Google Sheets!");
    switchTab("section-jamaah"); // refresh
  }).saveJamaahGAS(jamaahData, operatorUsername);
}

// Hapus data dari GAS
function deleteJamaah(id, operatorUsername) {
  google.script.run.withSuccessHandler(function() {
    alert("Data berhasil dihapus dari Google Sheets!");
    refreshActivePage();
  }).deleteJamaahGAS(id, operatorUsername);
}
```

---

## Langkah 5: Deploy Web App ke Publik
1. Di pojok kanan atas Apps Script Editor, klik **Terapkan** (Deploy) > **Terapkan Baru** (New deployment).
2. Klik ikon gir (Jenis Penerapan) di sebelah tulisan "Pilih Jenis", lalu pilih **Aplikasi Web** (Web app).
3. Isi konfigurasi sebagai berikut:
   * **Deskripsi:** `AJI v2.0 Production`
   * **Jalankan sebagai:** **Saya (email Anda@gmail.com)** *(Langkah krusial agar aplikasi memiliki izin mengedit Spreadsheet atas nama Anda).*
   * **Siapa yang memiliki akses:** **Siapa saja** (Anyone) *(Ini memungkinkan user/admin membuka halaman login dashboard).*
4. Klik **Terapkan** (Deploy).
5. Anda akan diminta memberikan izin keamanan (**Otorisasi Akses**). Setujui dan berikan izin ke akun Google Anda.
6. Setelah selesai, Google akan memberikan **URL Aplikasi Web**. Salin URL tersebut.
7. Aplikasi Jatiwarna Info Anda sekarang aktif di internet dan dapat dibuka oleh siapa pun melalui link tersebut, dengan autentikasi keamanan melalui form login yang sudah kita rancang!
