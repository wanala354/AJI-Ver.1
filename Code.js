// Google Apps Script Backend for AJI v2.1
// Hardcoded Spreadsheet ID matching user selection
const SPREADSHEET_ID = "13LPwt3117SnvksY3tY6LaEzPp_Yjufj_VHbPaPYvvC4";

// Web App entry point: Serves Index.html
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "getAllData") {
    try {
      const data = getAllDataGAS();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  // Setup database structure if sheets are missing
  try {
    initializeDatabaseIfMissing();
  } catch(err) {
    Logger.log("Setup Database failed: " + err.toString());
  }

  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('AJI v2.0 - Aplikasi Jatiwarna Info')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ----------------------------------------------------
// DATABASE INITIALIZATION & SCHEMA AUTO-GENERATION
// ----------------------------------------------------
function initializeDatabaseIfMissing() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Define sheets schema for Version 3.0 (includes master lists and upgraded Users schema + Pengajian)
  const schema = {
    "Users": ["username", "email", "role", "passwordHash", "kelompok"],
    "Jamaah": ["id", "namaLengkap", "kelompokPengajian", "tempatLahir", "tanggalLahir", "jenisKelamin", "nomorHp", "tingkatPendidikan", "statusPernikahan", "statusHubunganKeluarga", "kepalaKeluargaId", "pekerjaanUtama", "dapuan", "statusEkonomi", "kelancaranSambung"],
    "Kepala Keluarga": ["id", "namaLengkap", "kelompokPengajian"],
    "Kartu Keluarga": ["kepalaKeluargaId", "anggotaKeluargaId"],
    "Audit Log": ["timestamp", "user", "action", "description"],
    
    // Version 2.1 Dynamic Master Data Sheets
    "Kelompok": ["nama"],
    "Tingkat Pendidikan": ["nama"],
    "Dapuan": ["nama"],
    "Pekerjaan": ["nama"],
    "Status Hubungan Keluarga": ["nama"],
    
    // Version 3.0 Pengajian Sheets
    "Materi Pengajian": ["nama"],
    "Master Pengajar": ["id_pengajar", "id_jamaah"],
    "Pengajian Jadwal": ["id", "tingkat_pengajian", "jenis_pengajian", "tanggal", "waktu_mulai", "waktu_selesai", "materi_pengajar", "kelompok_pengajian", "lokasi"],
    "Pengajian Presensi": ["id", "id_pengajian", "id_jamaah", "status", "keterangan"],
    "Jenis Pengajian": ["nama", "peserta_pengajian"],
    "Tempat Kegiatan": ["nama"]
  };
  
  for (const sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    const isNew = !sheet;
    
    if (isNew) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schema[sheetName]);
      
      // Format headers
      const range = sheet.getRange(1, 1, 1, schema[sheetName].length);
      range.setFontWeight("bold");
      range.setBackground("#e2f0d9"); // Soft forest green accent
    } else {
      // Schema migrations
      if (sheetName === "Pengajian Jadwal") {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (headers.indexOf("lokasi") === -1) {
          sheet.getRange(1, headers.length + 1).setValue("lokasi");
        }
      }
    }
    
    // Schema verification and seeding for Users (works for both existing and brand new sheets)
    if (sheetName === "Users") {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (headers.indexOf("kelompok") === -1) {
        // Add kelompok header
        sheet.getRange(1, headers.length + 1).setValue("kelompok");
        // Fill default values for existing users
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          const defaultVals = [];
          for (let r = 2; r <= lastRow; r++) {
            defaultVals.push(["Semua"]);
          }
          sheet.getRange(2, headers.length + 1, lastRow - 1, 1).setValues(defaultVals);
        }
      }
      
      // Proactively verify and seed default operator & admin accounts if they are missing
      const data = sheet.getDataRange().getValues();
      const usernames = data.slice(1).map(r => r[0].toLowerCase());
      const defaultUsers = [
        ["admin", "admin@jatiwarnainfo.or.id", "Admin", "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", "Semua"],
        ["op_pm", "op_pm@jatiwarnainfo.or.id", "Operator Kelompok", "e130282bf248d2f5a54db5ef90f6b4715f019e0cfcd6c04f981e4b85c8e3ccdc", "Pondok Melati"],
        ["op_chandra", "op_chandra@jatiwarnainfo.or.id", "Operator Kelompok", "e130282bf248d2f5a54db5ef90f6b4715f019e0cfcd6c04f981e4b85c8e3ccdc", "Chandra"]
      ];
      
      defaultUsers.forEach(user => {
        if (usernames.indexOf(user[0].toLowerCase()) === -1) {
          sheet.appendRow(user);
        }
      });
    }
    
    // Seed default master options on new sheet creation
    if (isNew) {
      if (sheetName === "Tempat Kegiatan") {
        ["Masjid Al-Fatah", "Aula Serbaguna", "Masjid Baitul Makmur", "Daring (Online)"].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Kelompok") {
        ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Tingkat Pendidikan") {
        ["PAUD", "SD", "SMP", "SLTA/SMK", "Diploma", "S1", "S2", "S3"].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Dapuan") {
        ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS", "Rokyah biasa", "Lainnya"].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Pekerjaan") {
        ["Wiraswasta", "Swasta", "ASN", "TNI", "POLRI", "Guru", "IRT", "Pelajar/Mahasiswa", "Lainnya"].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Status Hubungan Keluarga") {
        ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Materi Pengajian") {
        ['Al-Quran', 'Hadis Khotbah', 'Hadis Bukhori', 'ASAD', 'Musyawaroh 5 Unsur', 'Teks', 'Dalil-dalil'].forEach(opt => sheet.appendRow([opt]));
      }
      if (sheetName === "Jenis Pengajian") {
        const seedJP = [
          ["Sambung", "Dewasa, Manula, GUM"],
          ["Ibu-ibu", "Dewasa, Manula"],
          ["5 Unsur", "Dewasa, Manula, GUM"],
          ["Muda-mudi", "GUM, GUS"],
          ["Caberawit", "PAUD, Caberawit"],
          ["Lain-lain", ""],
          ["GUS", "GUS"],
          ["GUM", "GUM"],
          ["Gabungan GUS dan GUM", "GUS, GUM"]
        ];
        seedJP.forEach(row => sheet.appendRow(row));
      }
      
      // Seed sample Jamaah
      if (sheetName === "Jamaah") {
        const seedJamaah = [
          ["J-001", "H. Budi Santoso", "Pondok Melati", "Jakarta", "1975-04-12", "Laki-laki", "081234567890", "S1", "Menikah", "Kepala Keluarga", "", "Swasta", "Pengurus Kelompok", "Menengah", "Lancar"],
          ["J-002", "Hj. Siti Aminah", "Pondok Melati", "Surabaya", "1978-08-22", "Perempuan", "081234567891", "SLTA/SMK", "Menikah", "Istri", "J-001", "IRT", "Rokyah biasa", "Menengah", "Lancar"],
          ["J-003", "Rahmat Hidayat", "Pondok Melati", "Bekasi", "2002-11-05", "Laki-laki", "081234567892", "S1", "Belum Menikah", "Anak", "J-001", "Pelajar/Mahasiswa", "Pengurus Kelompok", "Menengah", "Lancar"],
          ["J-004", "Aisyah Putri", "Pondok Melati", "Bekasi", "2010-06-15", "Perempuan", "081234567893", "SMP", "Belum Menikah", "Anak", "J-001", "Pelajar/Mahasiswa", "Rokyah biasa", "Menengah", "Lancar"],
          ["J-005", "H. Ahmad Subarjo", "Pondok Melati Selatan", "Yogyakarta", "1964-02-10", "Laki-laki", "085712345678", "Diploma", "Menikah", "Kepala Keluarga", "", "Wiraswasta", "Pengurus Desa", "Aghnia", "Lancar"],
          ["J-006", "Hj. Ratna Sari", "Pondok Melati Selatan", "Bandung", "1968-12-14", "Perempuan", "085712345679", "S1", "Menikah", "Istri", "J-005", "Guru", "MS", "Aghnia", "Lancar"],
          ["J-007", "Dwi Wahyudi", "Pondok Melati Selatan", "Bekasi", "1998-05-18", "Laki-laki", "085712345680", "S1", "Belum Menikah", "Anak", "J-005", "Swasta", "Rokyah biasa", "Aghnia", "Lancar"],
          ["J-008", "Tri Utami", "Pondok Melati Selatan", "Bekasi", "2013-09-01", "Perempuan", "", "SD", "Belum Menikah", "Anak", "J-005", "Pelajar/Mahasiswa", "Rokyah biasa", "Aghnia", "Lancar"],
          ["J-009", "Suparman", "Jatiranggon", "Solo", "1980-01-30", "Laki-laki", "089987654321", "SLTA/SMK", "Menikah", "Kepala Keluarga", "", "Lainnya", "Rokyah biasa", "Dhuafa", "Kurang Lancar"],
          ["J-010", "Sumarni", "Jatiranggon", "Semarang", "1983-05-15", "Perempuan", "", "SD", "Menikah", "Istri", "J-009", "IRT", "Rokyah biasa", "Dhuafa", "Kurang Lancar"],
          ["J-011", "Bagus Prasetyo", "Jatiranggon", "Bekasi", "2007-03-24", "Laki-laki", "089987654322", "SLTA/SMK", "Belum Menikah", "Anak", "J-009", "Pelajar/Mahasiswa", "Rokyah biasa", "Dhuafa", "Lancar"],
          ["J-012", "Cahyo Utomo", "Jatiranggon", "Bekasi", "2021-08-10", "Laki-laki", "", "PAUD", "Belum Menikah", "Anak", "J-009", "Pelajar/Mahasiswa", "Rokyah biasa", "Dhuafa", "Lancar"],
          ["J-013", "Ir. H. Hartono, M.Si", "Chandra", "Magelang", "1966-10-18", "Laki-laki", "08111222333", "S2", "Menikah", "Kepala Keluarga", "", "ASN", "Pengurus Daerah", "Menengah", "Lancar"],
          ["J-014", "Dra. Herlina", "Chandra", "Bogor", "1970-02-25", "Perempuan", "08111222334", "S1", "Menikah", "Istri", "J-013", "Guru", "MT", "Menengah", "Lancar"],
          ["J-015", "H. Joko Susilo", "Pondok Melati", "Solo", "1945-05-12", "Laki-laki", "", "SD", "Duda", "Ayah", "J-001", "Lainnya", "Rokyah biasa", "Menengah", "Lancar"],
          ["J-016", "Joko Prasetyo", "Pondok Melati", "Madiun", "1988-11-20", "Laki-laki", "081299887766", "S1", "Menikah", "Kepala Keluarga", "", "Wiraswasta", "Pengurus Kelompok", "Aghnia", "Lancar"],
          ["J-017", "Larasati", "Pondok Melati", "Kediri", "1992-03-15", "Perempuan", "081299887767", "S1", "Menikah", "Istri", "J-016", "IRT", "Rokyah biasa", "Aghnia", "Lancar"],
          ["J-018", "Fathan Prasetyo", "Pondok Melati", "Bekasi", "2019-07-22", "Laki-laki", "", "PAUD", "Belum Menikah", "Anak", "J-016", "Pelajar/Mahasiswa", "Rokyah biasa", "Aghnia", "Lancar"],
          ["J-019", "Pratama Putera", "Jatiranggon", "Surakarta", "2000-09-30", "Laki-laki", "087711223344", "Diploma", "Belum Menikah", "Kepala Keluarga", "", "Swasta", "Rokyah biasa", "Menengah", "Perlu Perhatian"],
          ["J-020", "Mbah Sumiati", "Chandra", "Purworejo", "1952-08-08", "Perempuan", "", "SD", "Janda", "Kepala Keluarga", "", "Lainnya", "Rokyah biasa", "Dhuafa", "Lancar"]
        ];
        seedJamaah.forEach(row => sheet.appendRow(row));
      }
    }
  }
  
  // Clean default empty tab
  const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch(e) {}
  }
  
  syncRelationalTablesGAS(ss);
}

// ----------------------------------------------------
// GAS FILE & SHEET DATA SERVICES
// ----------------------------------------------------
function getSheetData(sheetName, ss) {
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    headers.forEach((header, index) => {
      // Date conversion to ISO string YYYY-MM-DD
      if (header === "tanggalLahir" && row[index] instanceof Date) {
        obj[header] = Utilities.formatDate(row[index], "GMT+7", "yyyy-MM-dd");
      } else {
        obj[header] = row[index];
      }
    });
    data.push(obj);
  }
  return data;
}

// ----------------------------------------------------
// SERVER API ENDPOINTS (CALLED FROM CLIENT-SIDE)
// ----------------------------------------------------
function getAllDataGAS(operatorUsername) {
  try {
    initializeDatabaseIfMissing();
  } catch(e) {}

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const allData = {
    jamaahList: getSheetData("Jamaah", ss),
    kepalaKeluargaList: getSheetData("Kepala Keluarga", ss),
    kartuKeluargaMappings: getSheetData("Kartu Keluarga", ss),
    auditLogs: getSheetData("Audit Log", ss),
    usersList: getSheetData("Users", ss),
    
    // Version 2.1 dynamic master lists loaded from sheets
    masterKelompok: getSheetData("Kelompok", ss),
    masterPendidikan: getSheetData("Tingkat Pendidikan", ss),
    masterDapuan: getSheetData("Dapuan", ss),
    masterPekerjaan: getSheetData("Pekerjaan", ss),
    masterHubungan: getSheetData("Status Hubungan Keluarga", ss),
    
    // Version 3.0 Pengajian data
    masterMateri: getSheetData("Materi Pengajian", ss),
    masterPengajar: getSheetData("Master Pengajar", ss),
    jadwalPengajian: getSheetData("Pengajian Jadwal", ss),
    presensiKehadiran: getSheetData("Pengajian Presensi", ss),
    masterJenisPengajian: getSheetData("Jenis Pengajian", ss),
    masterTempatKegiatan: getSheetData("Tempat Kegiatan", ss)
  };
  
  // Enforce Row-Level Security (RLS) if operatorUsername is provided and is a group operator
  if (operatorUsername) {
    const user = allData.usersList.find(u => u.username.toLowerCase() === operatorUsername.toLowerCase());
    if (user && user.role && user.role.trim().toLowerCase() === "operator kelompok") {
      const targetKelompok = user.kelompok;
      
      // Filter Jamaah & KK
      allData.jamaahList = allData.jamaahList.filter(j => j.kelompokPengajian === targetKelompok);
      allData.kepalaKeluargaList = allData.kepalaKeluargaList.filter(kk => kk.kelompokPengajian === targetKelompok);
      
      // Filter Kartu Keluarga mappings
      const kkIds = allData.kepalaKeluargaList.map(kk => kk.id);
      allData.kartuKeluargaMappings = allData.kartuKeluargaMappings.filter(m => kkIds.indexOf(m.kepalaKeluargaId) !== -1);
      
      // Filter Jadwal Pengajian & Presensi
      allData.jadwalPengajian = allData.jadwalPengajian.filter(j => j.kelompok_pengajian === targetKelompok);
      const jadwalIds = allData.jadwalPengajian.map(s => s.id);
      allData.presensiKehadiran = allData.presensiKehadiran.filter(p => jadwalIds.indexOf(p.id_pengajian) !== -1);
      
      // Filter Audit Logs to logs by the operator OR logs relating to their kelompok's members
      allData.auditLogs = allData.auditLogs.filter(log => {
        return log.user.toLowerCase() === operatorUsername.toLowerCase() || 
               log.description.indexOf("di Kelompok " + targetKelompok) !== -1 ||
               log.description.indexOf("kelompokPengajian: '" + targetKelompok + "'") !== -1;
      });
    }
  }
  
  return allData;
}

// Authenticate user credentials
function authenticateUserGAS(username, passwordHash) {
  const users = getSheetData("Users");
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === passwordHash);
  if (user) {
    logActionGAS(user.username, "LOGIN", "Pengguna " + user.username + " dengan role " + user.role + " (" + user.kelompok + ") login ke Web App.");
    return { 
      success: true, 
      user: { 
        username: user.username, 
        email: user.email, 
        role: user.role, 
        kelompok: user.kelompok 
      } 
    };
  }
  return { success: false };
}

// Logger helper
function logActionGAS(user, action, description) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Audit Log");
    if (sheet) {
      sheet.appendRow([
        new Date().toISOString(),
        user || "System",
        action,
        description
      ]);
    }
  } catch(e) {
    Logger.log("Logger failed: " + e.toString());
  }
}

// Save Jamaah record
function saveJamaahGAS(jamaahData, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Jamaah");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let isEdit = false;
  let rowIndex = -1;
  let oldData = {};
  
  if (!jamaahData.id) {
    // Generate new incremental ID
    let maxIdNum = 0;
    for (let i = 1; i < rows.length; i++) {
      const idStr = rows[i][0];
      if (idStr && idStr.indexOf("J-") === 0) {
        const num = parseInt(idStr.replace("J-", ""));
        if (num > maxIdNum) maxIdNum = num;
      }
    }
    jamaahData.id = "J-" + String(maxIdNum + 1).padStart(3, '0');
  } else {
    // Find index of editing row
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === jamaahData.id) {
        isEdit = true;
        rowIndex = i + 1;
        
        // Save old values for detailed audit log
        headers.forEach((header, idx) => {
          if (header === "tanggalLahir" && rows[i][idx] instanceof Date) {
            oldData[header] = Utilities.formatDate(rows[i][idx], "GMT+7", "yyyy-MM-dd");
          } else {
            oldData[header] = rows[i][idx];
          }
        });
        break;
      }
    }
  }

  // Enforce validation constraints
  if (jamaahData.statusHubunganKeluarga === "Kepala Keluarga") {
    jamaahData.kepalaKeluargaId = "";
  }
  
  const newRowValues = headers.map(h => jamaahData[h] !== undefined ? jamaahData[h] : "");
  
  if (isEdit && rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRowValues]);
    
    // Build audit trails diff
    let diffStr = [];
    for (const key in jamaahData) {
      if (oldData[key] !== jamaahData[key] && key !== "umur" && key !== "kelompokPeramutan") {
        diffStr.push(`${key}: '${oldData[key]}' -> '${jamaahData[key]}'`);
      }
    }
    logActionGAS(operatorUsername, "UPDATE", "Memperbarui Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + "). Perubahan: " + diffStr.join(", "));
  } else {
    sheet.appendRow(newRowValues);
    logActionGAS(operatorUsername, "CREATE", "Menambahkan Jamaah " + jamaahData.namaLengkap + " (" + jamaahData.id + ") di Kelompok " + jamaahData.kelompokPengajian);
  }
  
  syncRelationalTablesGAS(ss);
  return jamaahData;
}

// Delete Jamaah record
function deleteJamaahGAS(id, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Jamaah");
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const nama = rows[i][1];
      const hub = rows[i][9];
      sheet.deleteRow(i + 1);
      
      // Cascade clear head of family reference if deleting a Kepala Keluarga
      if (hub === "Kepala Keluarga") {
        const freshRows = sheet.getDataRange().getValues();
        for (let j = 1; j < freshRows.length; j++) {
          if (freshRows[j][10] === id) { // kepalaKeluargaId matches
            sheet.getRange(j + 1, 11).setValue(""); // clear family link
          }
        }
      }
      
      logActionGAS(operatorUsername, "DELETE", "Menghapus Jamaah " + nama + " (" + id + ").");
      syncRelationalTablesGAS(ss);
      return true;
    }
  }
  return false;
}

// Server side cascade sync for relation tables (Optimized with Batch writes)
function syncRelationalTablesGAS(ss) {
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const jamaahList = getSheetData("Jamaah", ss);
  
  // 1. Sync Kepala Keluarga list
  let kkSheet = ss.getSheetByName("Kepala Keluarga");
  if (!kkSheet) {
    kkSheet = ss.insertSheet("Kepala Keluarga");
  } else {
    kkSheet.clearContents();
  }
  
  const kkRows = [["id", "namaLengkap", "kelompokPengajian"]];
  const kepalaKeluargaList = jamaahList.filter(j => j.statusHubunganKeluarga === "Kepala Keluarga");
  kepalaKeluargaList.forEach(j => {
    kkRows.push([j.id, j.namaLengkap, j.kelompokPengajian]);
  });
  
  kkSheet.getRange(1, 1, kkRows.length, 3).setValues(kkRows);
  kkSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#e2f0d9");

  // 2. Sync Kartu Keluarga mappings
  let mapSheet = ss.getSheetByName("Kartu Keluarga");
  if (!mapSheet) {
    mapSheet = ss.insertSheet("Kartu Keluarga");
  } else {
    mapSheet.clearContents();
  }
  
  const mapRows = [["kepalaKeluargaId", "anggotaKeluargaId"]];
  jamaahList.forEach(j => {
    if (j.statusHubunganKeluarga !== "Kepala Keluarga" && j.kepalaKeluargaId) {
      const kkExists = kepalaKeluargaList.some(kk => kk.id === j.kepalaKeluargaId);
      if (kkExists) {
        mapRows.push([j.kepalaKeluargaId, j.id]);
      }
    }
  });
  
  mapSheet.getRange(1, 1, mapRows.length, 2).setValues(mapRows);
  mapSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e2f0d9");
}

// ----------------------------------------------------
// VERSION 2.1 UPGRADE ENDPOINTS: MASTER DATA CRUD
// ----------------------------------------------------
function saveMasterItemGAS(tableName, oldName, newName, operatorUsername, peserta) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error("Tabel master " + tableName + " tidak ditemukan.");
  
  const rows = sheet.getDataRange().getValues();
  let found = false;
  
  if (oldName) {
    // Edit mode
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === oldName) {
        sheet.getRange(i + 1, 1).setValue(newName);
        if (tableName === "Jenis Pengajian") {
          sheet.getRange(i + 1, 2).setValue(peserta || "");
        }
        found = true;
        break;
      }
    }
    
    if (found) {
      logActionGAS(operatorUsername, "UPDATE_MASTER", "Mengubah opsi di tabel " + tableName + ": '" + oldName + "' -> '" + newName + "'");
      // Cascade update all referencing cells in Jamaah
      cascadeUpdateMasterReferences(tableName, oldName, newName);
    }
  } else {
    // Add mode
    if (tableName === "Jenis Pengajian") {
      sheet.appendRow([newName, peserta || ""]);
    } else {
      sheet.appendRow([newName]);
    }
    logActionGAS(operatorUsername, "CREATE_MASTER", "Menambahkan opsi baru di tabel " + tableName + ": '" + newName + "'");
  }
  return true;
}

function deleteMasterItemGAS(tableName, name, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error("Tabel master " + tableName + " tidak ditemukan.");
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === name) {
      sheet.deleteRow(i + 1);
      logActionGAS(operatorUsername, "DELETE_MASTER", "Menghapus opsi dari tabel " + tableName + ": '" + name + "'");
      // Cascade update: clear reference in Jamaah
      cascadeUpdateMasterReferences(tableName, name, "");
      break;
    }
  }
  return true;
}

function cascadeUpdateMasterReferences(tableName, oldName, newName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Jamaah");
  if (!sheet) return;
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  // Mapping master sheet name to column name in Jamaah
  const mapping = {
    "Kelompok": "kelompokPengajian",
    "Tingkat Pendidikan": "tingkatPendidikan",
    "Pekerjaan": "pekerjaanUtama",
    "Dapuan": "dapuan",
    "Status Hubungan Keluarga": "statusHubunganKeluarga"
  };
  
  const targetHeader = mapping[tableName];
  if (!targetHeader) return;
  
  const colIndex = headers.indexOf(targetHeader);
  if (colIndex === -1) return;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colIndex] === oldName) {
      sheet.getRange(i + 1, colIndex + 1).setValue(newName);
    }
  }
  
  // Re-sync relation tables
  syncRelationalTablesGAS(ss);
}

// ----------------------------------------------------
// VERSION 2.1 UPGRADE ENDPOINTS: USER MANAGEMENT
// ----------------------------------------------------
function saveUserGAS(userData, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Users");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let isEdit = false;
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toLowerCase() === userData.username.toLowerCase()) {
      isEdit = true;
      rowIndex = i + 1;
      break;
    }
  }
  
  const newRowValues = headers.map(header => {
    if (header === "passwordHash" && isEdit && !userData.passwordHash) {
      // Keep old password hash
      return rows[rowIndex - 1][headers.indexOf("passwordHash")];
    }
    return userData[header] !== undefined ? userData[header] : "";
  });
  
  if (isEdit && rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRowValues]);
    logActionGAS(operatorUsername, "UPDATE_USER", "Memperbarui akun pengguna: " + userData.username + " (" + userData.role + ")");
  } else {
    sheet.appendRow(newRowValues);
    logActionGAS(operatorUsername, "CREATE_USER", "Membuat akun pengguna baru: " + userData.username + " (" + userData.role + ")");
  }
  return true;
}

function changePasswordGAS(targetUsername, newPasswordHash, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Users");
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toLowerCase() === targetUsername.toLowerCase()) {
      sheet.getRange(i + 1, 4).setValue(newPasswordHash); // Column D (passwordHash)
      logActionGAS(operatorUsername, "CHANGE_PASSWORD", "Mengubah password untuk pengguna: " + targetUsername);
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------
// VERSION 3.0 ENDPOINTS: MANAJEMEN PENGAJIAN
// ----------------------------------------------------
function saveJadwalPengajianGAS(jadwalData, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Pengajian Jadwal");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let isEdit = false;
  let rowIndex = -1;
  
  if (!jadwalData.id) {
    let maxIdNum = 0;
    for (let i = 1; i < rows.length; i++) {
      const idVal = parseInt(rows[i][0]);
      if (!isNaN(idVal) && idVal > maxIdNum) maxIdNum = idVal;
    }
    jadwalData.id = maxIdNum + 1;
  } else {
    const searchId = parseInt(jadwalData.id);
    for (let i = 1; i < rows.length; i++) {
      if (parseInt(rows[i][0]) === searchId) {
        isEdit = true;
        rowIndex = i + 1;
        break;
      }
    }
  }
  
  const newRowValues = headers.map(header => {
    if (header === "materi_pengajar" && typeof jadwalData[header] === "object") {
      return JSON.stringify(jadwalData[header]);
    }
    return jadwalData[header] !== undefined ? jadwalData[header] : "";
  });
  
  if (isEdit && rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRowValues]);
    logActionGAS(operatorUsername, "UPDATE_JADWAL", "Memperbarui jadwal pengajian: " + jadwalData.jenis_pengajian + " pada " + jadwalData.tanggal);
  } else {
    sheet.appendRow(newRowValues);
    logActionGAS(operatorUsername, "CREATE_JADWAL", "Membuat jadwal pengajian baru: " + jadwalData.jenis_pengajian + " pada " + jadwalData.tanggal);
  }
  return jadwalData;
}

function deleteJadwalPengajianGAS(id, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Pengajian Jadwal");
  const rows = sheet.getDataRange().getValues();
  const searchId = parseInt(id);
  
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === searchId) {
      const jenis = rows[i][2];
      const tanggal = rows[i][3];
      sheet.deleteRow(i + 1);
      
      // Cascade delete presensi
      const presensiSheet = ss.getSheetByName("Pengajian Presensi");
      const presensiRows = presensiSheet.getDataRange().getValues();
      for (let j = presensiRows.length - 1; j >= 1; j--) {
        if (parseInt(presensiRows[j][1]) === searchId) {
          presensiSheet.deleteRow(j + 1);
        }
      }
      
      logActionGAS(operatorUsername, "DELETE_JADWAL", "Menghapus jadwal pengajian: " + jenis + " pada " + tanggal);
      return true;
    }
  }
  return false;
}

function savePresensiKehadiranGAS(idPengajian, presensiList, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Pengajian Presensi");
  const rows = sheet.getDataRange().getValues();
  const searchIdPengajian = parseInt(idPengajian);
  
  // Create a map of existing presensi for this pengajian to update them
  const existingMap = {};
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][1]) === searchIdPengajian) {
      const idJamaah = rows[i][2];
      existingMap[idJamaah] = i + 1; // row number (1-indexed)
    }
  }
  
  let maxIdNum = 0;
  for (let i = 1; i < rows.length; i++) {
    const idVal = parseInt(rows[i][0]);
    if (!isNaN(idVal) && idVal > maxIdNum) maxIdNum = idVal;
  }
  
  const rowsToDelete = [];
  presensiList.forEach(p => {
    const rowIdx = existingMap[p.id_jamaah];
    const isReset = !p.status || p.status === "Alpha" || p.status === "";
    if (isReset) {
      if (rowIdx) {
        rowsToDelete.push(rowIdx);
      }
    } else {
      if (rowIdx) {
        // Update
        sheet.getRange(rowIdx, 4).setValue(p.status); // Column D: status
        sheet.getRange(rowIdx, 5).setValue(p.keterangan || ""); // Column E: keterangan
      } else {
        // Insert
        maxIdNum++;
        sheet.appendRow([maxIdNum, searchIdPengajian, p.id_jamaah, p.status, p.keterangan || ""]);
      }
    }
  });
  
  // Delete rows in descending order to avoid index shifts
  rowsToDelete.sort((a, b) => b - a);
  rowsToDelete.forEach(rowIdx => {
    sheet.deleteRow(rowIdx);
  });
  
  logActionGAS(operatorUsername, "SAVE_PRESENSI", "Menyimpan data presensi kehadiran untuk sesi pengajian ID " + idPengajian);
  return true;
}

function saveMasterPengajarGAS(pengajarData, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Master Pengajar");
  const rows = sheet.getDataRange().getValues();
  
  let isEdit = false;
  let rowIndex = -1;
  
  if (!pengajarData.id_pengajar) {
    let maxIdNum = 0;
    for (let i = 1; i < rows.length; i++) {
      const idVal = parseInt(rows[i][0]);
      if (!isNaN(idVal) && idVal > maxIdNum) maxIdNum = idVal;
    }
    pengajarData.id_pengajar = maxIdNum + 1;
  } else {
    const searchId = parseInt(pengajarData.id_pengajar);
    for (let i = 1; i < rows.length; i++) {
      if (parseInt(rows[i][0]) === searchId) {
        isEdit = true;
        rowIndex = i + 1;
        break;
      }
    }
  }
  
  const newRowValues = [pengajarData.id_pengajar, pengajarData.id_jamaah];
  
  if (isEdit && rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, 2).setValues([newRowValues]);
    logActionGAS(operatorUsername, "UPDATE_PENGAJAR", "Memperbarui pengajar ID " + pengajarData.id_pengajar);
  } else {
    sheet.appendRow(newRowValues);
    logActionGAS(operatorUsername, "CREATE_PENGAJAR", "Menambahkan pengajar baru ID " + pengajarData.id_pengajar + " (Jamaah: " + pengajarData.id_jamaah + ")");
  }
  return pengajarData;
}

function deleteMasterPengajarGAS(id_pengajar, operatorUsername) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Master Pengajar");
  const rows = sheet.getDataRange().getValues();
  const searchId = parseInt(id_pengajar);
  
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0]) === searchId) {
      sheet.deleteRow(i + 1);
      logActionGAS(operatorUsername, "DELETE_PENGAJAR", "Menghapus pengajar ID " + id_pengajar);
      return true;
    }
  }
  return false;
}

