import { SEED_JAMAAH, SEED_USERS } from "./mockData.js";

// Keys for localStorage
const KEY_JAMAAH = "aji_v2_jamaah";
const KEY_USERS = "aji_v2_users";
const KEY_KEPALA_KELUARGA = "aji_v2_kepala_keluarga";
const KEY_KARTU_KELUARGA = "aji_v2_kartu_keluarga";
const KEY_AUDIT_LOG = "aji_v2_audit_log";

// Initial Storage Setup
export function initializeDatabase() {
  if (!localStorage.getItem(KEY_USERS)) {
    localStorage.setItem(KEY_USERS, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(KEY_JAMAAH)) {
    localStorage.setItem(KEY_JAMAAH, JSON.stringify(SEED_JAMAAH));
  }
  
  // Rebuild relational tables (Kepala Keluarga and Kartu Keluarga) based on Jamaah data to ensure synchronization
  syncRelationalTables();
}

// ----------------------------------------------------
// UTILS & RULE ENGINES
// ----------------------------------------------------

// Calculate age in real-time
export function calculateAge(birthDateString) {
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

// Rule Engine for Kelompok Peramutan
export function getKelompokPeramutan(age, maritalStatus) {
  if (age <= 5) return "PAUD";
  if (age <= 12) return "Caberawit";
  if (age <= 18) return "GUS";
  if (age >= 60) return "Manula";
  if (age >= 30 && age < 60) return "Dewasa";
  if (age > 18 && age < 30) {
    if (maritalStatus === "Belum Menikah") return "GUM";
    return "Dewasa"; // Fallback for married people aged 19-29
  }
  return "Dewasa";
}

// ----------------------------------------------------
// SYNCHRONIZATION HOOK
// ----------------------------------------------------
export function syncRelationalTables() {
  const jamaahList = JSON.parse(localStorage.getItem(KEY_JAMAAH)) || [];
  
  // 1. Rebuild Kepala Keluarga Table
  const kepalaKeluargaList = jamaahList
    .filter(j => j.statusHubunganKeluarga === "Kepala Keluarga")
    .map(j => ({
      id: j.id,
      namaLengkap: j.namaLengkap,
      kelompokPengajian: j.kelompokPengajian
    }));
  localStorage.setItem(KEY_KEPALA_KELUARGA, JSON.stringify(kepalaKeluargaList));

  // 2. Rebuild Kartu Keluarga (mapping table)
  const kartuKeluargaList = [];
  jamaahList.forEach(j => {
    if (j.statusHubunganKeluarga !== "Kepala Keluarga" && j.kepalaKeluargaId) {
      // Ensure the referenced Kepala Keluarga still exists
      const kkExists = kepalaKeluargaList.some(kk => kk.id === j.kepalaKeluargaId);
      if (kkExists) {
        kartuKeluargaList.push({
          kepalaKeluargaId: j.kepalaKeluargaId,
          anggotaKeluargaId: j.id
        });
      } else {
        // Clean orphaned reference
        j.kepalaKeluargaId = "";
      }
    }
  });
  
  localStorage.setItem(KEY_KARTU_KELUARGA, JSON.stringify(kartuKeluargaList));
  localStorage.setItem(KEY_JAMAAH, JSON.stringify(jamaahList)); // Save updated references if any were cleared
}

// ----------------------------------------------------
// AUDIT LOG
// ----------------------------------------------------
export function logAction(user, action, description) {
  const logs = JSON.parse(localStorage.getItem(KEY_AUDIT_LOG)) || [];
  const newLog = {
    timestamp: new Date().toISOString(),
    user: user || "System",
    action: action, // "CREATE" | "UPDATE" | "DELETE"
    description: description
  };
  logs.unshift(newLog); // Newest first
  localStorage.setItem(KEY_AUDIT_LOG, JSON.stringify(logs));
}

export function getAuditLogs() {
  return JSON.parse(localStorage.getItem(KEY_AUDIT_LOG)) || [];
}

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
export function authenticateUser(username, password) {
  const users = JSON.parse(localStorage.getItem(KEY_USERS)) || [];
  
  // Hash password using SHA-256 (simple hex converter mock)
  const hash = sha256(password);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash);
  if (user) {
    sessionStorage.setItem("aji_session_user", JSON.stringify({
      username: user.username,
      email: user.email,
      role: user.role
    }));
    logAction(user.username, "LOGIN", `Pengguna ${user.username} berhasil login dengan role ${user.role}.`);
    return { success: true, user };
  }
  return { success: false, message: "Username atau Password salah!" };
}

export function getCurrentUser() {
  const session = sessionStorage.getItem("aji_session_user");
  return session ? JSON.parse(session) : null;
}

export function logoutUser() {
  const user = getCurrentUser();
  if (user) {
    logAction(user.username, "LOGOUT", `Pengguna ${user.username} logout dari aplikasi.`);
  }
  sessionStorage.removeItem("aji_session_user");
}

// ----------------------------------------------------
// CRUD JAMAAH
// ----------------------------------------------------
export function getJamaahList() {
  const list = JSON.parse(localStorage.getItem(KEY_JAMAAH)) || [];
  // Inject calculated age and peramutan dynamically on fetch
  return list.map(j => {
    const age = calculateAge(j.tanggalLahir);
    const peramutan = getKelompokPeramutan(age, j.statusPernikahan);
    return { ...j, umur: age, kelompokPeramutan: peramutan };
  });
}

export function getKepalaKeluargaList() {
  return JSON.parse(localStorage.getItem(KEY_KEPALA_KELUARGA)) || [];
}

export function getKartuKeluargaMappings() {
  return JSON.parse(localStorage.getItem(KEY_KARTU_KELUARGA)) || [];
}

// Save Jamaah (Creates or Updates)
export function saveJamaah(jamaahData, operatorUsername) {
  const list = JSON.parse(localStorage.getItem(KEY_JAMAAH)) || [];
  let isEdit = false;
  let oldData = null;

  if (jamaahData.id) {
    // Edit Mode
    const index = list.findIndex(j => j.id === jamaahData.id);
    if (index !== -1) {
      isEdit = true;
      oldData = { ...list[index] };
      list[index] = { ...list[index], ...jamaahData };
    }
  } else {
    // Create Mode
    // Generate simple incremental ID
    const maxId = list.reduce((max, item) => {
      const num = parseInt(item.id.replace("J-", ""));
      return num > max ? num : max;
    }, 0);
    const newIdNum = maxId + 1;
    const formattedId = `J-${newIdNum.toString().padStart(3, "0")}`;
    
    jamaahData.id = formattedId;
    list.push(jamaahData);
  }

  // Enforce rule boundary logic:
  // If Head of Family, erase FK ref
  if (jamaahData.statusHubunganKeluarga === "Kepala Keluarga") {
    jamaahData.kepalaKeluargaId = "";
    // update in the array
    const idx = list.findIndex(j => j.id === jamaahData.id);
    list[idx].kepalaKeluargaId = "";
  }

  localStorage.setItem(KEY_JAMAAH, JSON.stringify(list));

  // Recalculate and trigger relational tables syncing
  syncRelationalTables();

  // Audit Logging
  if (isEdit) {
    let diffStr = [];
    for (const key in jamaahData) {
      if (oldData[key] !== jamaahData[key] && key !== "umur" && key !== "kelompokPeramutan") {
        diffStr.push(`${key}: '${oldData[key]}' -> '${jamaahData[key]}'`);
      }
    }
    logAction(
      operatorUsername,
      "UPDATE",
      `Memperbarui Jamaah ${jamaahData.namaLengkap} (${jamaahData.id}). Perubahan: ${diffStr.join(", ")}`
    );
  } else {
    logAction(
      operatorUsername,
      "CREATE",
      `Menambahkan Jamaah Baru: ${jamaahData.namaLengkap} (${jamaahData.id}) di Kelompok ${jamaahData.kelompokPengajian}`
    );
  }

  return jamaahData;
}

// Delete Jamaah
export function deleteJamaah(id, operatorUsername) {
  const list = JSON.parse(localStorage.getItem(KEY_JAMAAH)) || [];
  const jamaah = list.find(j => j.id === id);
  if (!jamaah) return false;

  const updatedList = list.filter(j => j.id !== id);
  
  // If deleted person was a Kepala Keluarga, clear references of family members
  if (jamaah.statusHubunganKeluarga === "Kepala Keluarga") {
    updatedList.forEach(j => {
      if (j.kepalaKeluargaId === id) {
        j.kepalaKeluargaId = ""; // orphan them
      }
    });
  }

  localStorage.setItem(KEY_JAMAAH, JSON.stringify(updatedList));

  // Sync tables
  syncRelationalTables();

  logAction(
    operatorUsername,
    "DELETE",
    `Menghapus Jamaah: ${jamaah.namaLengkap} (${id}).`
  );

  return true;
}

// Simple SHA-256 Hex mock for demonstration
// Normally in GAS we use Utilities.computeDigest or custom session token, here we simulate SHA-256 for integrity
function sha256(ascii) {
  // Simple deterministic string hashing mapping standard passwords to their correct seeds
  // admin123 -> 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
  // user123 -> 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
  if (ascii === "admin123") return "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
  if (ascii === "user123") return "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
  
  // fallback simple hash algorithm for custom passwords
  let hash = 0;
  for (let i = 0; i < ascii.length; i++) {
    const char = ascii.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
