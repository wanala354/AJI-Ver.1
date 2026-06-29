    // GLOBAL STATE VARIABLES (VERSION 2.1)
    // ----------------------------------------------------
    let localJamaahList = [];
    let localPengurusList = [];
    let localKepalaKeluargaList = [];
    let localKartuKeluargaMappings = [];
    let localAuditLogs = [];
    let localUsersList = [];

    // Portal Jamaah State
    let localCurrentJamaahId = null;   // ID jamaah dari user yang sedang login (role=jamaah)
    let localPendingUsers = [];        // Daftar akun yang menunggu persetujuan admin
    
    // Constants for static master lists (v2.1)
    const MASTER_PERNIKAHAN = ["Belum Menikah", "Menikah", "Janda", "Duda"];
    const MASTER_EKONOMI = ["Aghnia", "Dhuafa", "Menengah"];
    const MASTER_KELANCARAN = ["Lancar", "Kurang Lancar", "Perlu Perhatian"];
    
    // Loaded dynamically from Google Sheets master sheets
    let localMasterKelompok = [];
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