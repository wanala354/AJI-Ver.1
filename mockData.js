// Master Options (Static Reference Data)
export const MASTER_KELOMPOK = ["Pondok Melati", "Pondok Melati Selatan", "Jatiranggon", "Chandra"];
export const MASTER_PENDIDIKAN = ["PAUD", "SD", "SMP", "SLTA/SMK", "Diploma", "S1", "S2", "S3"];
export const MASTER_PERNIKAHAN = ["Menikah", "Duda", "Janda", "Belum Menikah"];
export const MASTER_HUBUNGAN = ["Kepala Keluarga", "Istri", "Anak", "Ayah", "Ibu"];
export const MASTER_PEKERJAAN = ["Wiraswasta", "Swasta", "ASN", "TNI", "POLRI", "Guru", "IRT", "Pelajar/Mahasiswa", "Lainnya"];
export const MASTER_DAPUAN = ["Pengurus Daerah", "Pengurus Desa", "Pengurus Kelompok", "MT", "MS", "Rokyah biasa", "Lainnya"];
export const MASTER_EKONOMI = ["Aghnia", "Dhuafa", "Menengah"];
export const MASTER_KELANCARAN = ["Lancar", "Kurang Lancar", "Perlu Perhatian"];

// User Accounts Seed Data
export const SEED_USERS = [
  { username: "admin", email: "admin@jatiwarnainfo.or.id", role: "Admin", passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918" }, // admin123
  { username: "user", email: "user@jatiwarnainfo.or.id", role: "User", passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" } // user123
];

// Initial Jamaah Seed Data
export const SEED_JAMAAH = [
  // Family 1: Budi Santoso (Pondok Melati) - Kepala Keluarga, Swasta, Menengah
  {
    id: "J-001",
    namaLengkap: "H. Budi Santoso",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Jakarta",
    tanggalLahir: "1975-04-12", // 51 years
    jenisKelamin: "Laki-laki",
    nomorHp: "081234567890",
    tingkatPendidikan: "S1",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Kepala Keluarga",
    kepalaKeluargaId: "", // Self
    pekerjaanUtama: "Swasta",
    dapuan: "Pengurus Kelompok",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-002",
    namaLengkap: "Hj. Siti Aminah",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Surabaya",
    tanggalLahir: "1978-08-22", // 47 years
    jenisKelamin: "Perempuan",
    nomorHp: "081234567891",
    tingkatPendidikan: "SLTA/SMK",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Istri",
    kepalaKeluargaId: "J-001",
    pekerjaanUtama: "IRT",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-003",
    namaLengkap: "Rahmat Hidayat",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Bekasi",
    tanggalLahir: "2002-11-05", // 23 years (Belum Menikah) -> GUM
    jenisKelamin: "Laki-laki",
    nomorHp: "081234567892",
    tingkatPendidikan: "S1",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-001",
    pekerjaanUtama: "Pelajar/Mahasiswa",
    dapuan: "Pengurus Kelompok",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-004",
    namaLengkap: "Aisyah Putri",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Bekasi",
    tanggalLahir: "2010-06-15", // 15 years -> GUS
    jenisKelamin: "Perempuan",
    nomorHp: "081234567893",
    tingkatPendidikan: "SMP",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-001",
    pekerjaanUtama: "Pelajar/Mahasiswa",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },

  // Family 2: Ahmad Subarjo (Pondok Melati Selatan) - Kepala Keluarga, Wiraswasta, Aghnia
  {
    id: "J-005",
    namaLengkap: "H. Ahmad Subarjo",
    kelompokPengajian: "Pondok Melati Selatan",
    tempatLahir: "Yogyakarta",
    tanggalLahir: "1964-02-10", // 62 years -> Manula
    jenisKelamin: "Laki-laki",
    nomorHp: "085712345678",
    tingkatPendidikan: "Diploma",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Kepala Keluarga",
    kepalaKeluargaId: "", // Self
    pekerjaanUtama: "Wiraswasta",
    dapuan: "Pengurus Desa",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-006",
    namaLengkap: "Hj. Ratna Sari",
    kelompokPengajian: "Pondok Melati Selatan",
    tempatLahir: "Bandung",
    tanggalLahir: "1968-12-14", // 57 years -> Dewasa
    jenisKelamin: "Perempuan",
    nomorHp: "085712345679",
    tingkatPendidikan: "S1",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Istri",
    kepalaKeluargaId: "J-005",
    pekerjaanUtama: "Guru",
    dapuan: "MS",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-007",
    namaLengkap: "Dwi Wahyudi",
    kelompokPengajian: "Pondok Melati Selatan",
    tempatLahir: "Bekasi",
    tanggalLahir: "1998-05-18", // 28 years (Belum Menikah) -> GUM
    jenisKelamin: "Laki-laki",
    nomorHp: "085712345680",
    tingkatPendidikan: "S1",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-005",
    pekerjaanUtama: "Swasta",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-008",
    namaLengkap: "Tri Utami",
    kelompokPengajian: "Pondok Melati Selatan",
    tempatLahir: "Bekasi",
    tanggalLahir: "2013-09-01", // 12 years -> Caberawit
    jenisKelamin: "Perempuan",
    nomorHp: "",
    tingkatPendidikan: "SD",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-005",
    pekerjaanUtama: "Pelajar/Mahasiswa",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },

  // Family 3: Suparman (Jatiranggon) - Kepala Keluarga, Buruh/Lainnya, Dhuafa
  {
    id: "J-009",
    namaLengkap: "Suparman",
    kelompokPengajian: "Jatiranggon",
    tempatLahir: "Solo",
    tanggalLahir: "1980-01-30", // 46 years -> Dewasa
    jenisKelamin: "Laki-laki",
    nomorHp: "089987654321",
    tingkatPendidikan: "SLTA/SMK",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Kepala Keluarga",
    kepalaKeluargaId: "", // Self
    pekerjaanUtama: "Lainnya",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Dhuafa",
    kelancaranSambung: "Kurang Lancar"
  },
  {
    id: "J-010",
    namaLengkap: "Sumarni",
    kelompokPengajian: "Jatiranggon",
    tempatLahir: "Semarang",
    tanggalLahir: "1983-05-15", // 43 years -> Dewasa
    jenisKelamin: "Perempuan",
    nomorHp: "",
    tingkatPendidikan: "SD",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Istri",
    kepalaKeluargaId: "J-009",
    pekerjaanUtama: "IRT",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Dhuafa",
    kelancaranSambung: "Kurang Lancar"
  },
  {
    id: "J-011",
    namaLengkap: "Bagus Prasetyo",
    kelompokPengajian: "Jatiranggon",
    tempatLahir: "Bekasi",
    tanggalLahir: "2007-03-24", // 19 years (Belum Menikah) -> GUM
    jenisKelamin: "Laki-laki",
    nomorHp: "089987654322",
    tingkatPendidikan: "SLTA/SMK",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-009",
    pekerjaanUtama: "Pelajar/Mahasiswa",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Dhuafa",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-012",
    namaLengkap: "Cahyo Utomo",
    kelompokPengajian: "Jatiranggon",
    tempatLahir: "Bekasi",
    tanggalLahir: "2021-08-10", // 4 years -> PAUD
    jenisKelamin: "Laki-laki",
    nomorHp: "",
    tingkatPendidikan: "PAUD",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-009",
    pekerjaanUtama: "Pelajar/Mahasiswa",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Dhuafa",
    kelancaranSambung: "Lancar"
  },

  // Family 4: Hartono (Chandra) - Kepala Keluarga, ASN, Menengah
  {
    id: "J-013",
    namaLengkap: "Ir. H. Hartono, M.Si",
    kelompokPengajian: "Chandra",
    tempatLahir: "Magelang",
    tanggalLahir: "1966-10-18", // 59 years -> Dewasa (turning 60 soon)
    jenisKelamin: "Laki-laki",
    nomorHp: "08111222333",
    tingkatPendidikan: "S2",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Kepala Keluarga",
    kepalaKeluargaId: "", // Self
    pekerjaanUtama: "ASN",
    dapuan: "Pengurus Daerah",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-014",
    namaLengkap: "Dra. Herlina",
    kelompokPengajian: "Chandra",
    tempatLahir: "Bogor",
    tanggalLahir: "1970-02-25", // 56 years -> Dewasa
    jenisKelamin: "Perempuan",
    nomorHp: "08111222334",
    tingkatPendidikan: "S1",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Istri",
    kepalaKeluargaId: "J-013",
    pekerjaanUtama: "Guru",
    dapuan: "MT",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-015",
    namaLengkap: "H. Joko Susilo",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Solo",
    tanggalLahir: "1945-05-12", // 81 years -> Manula, Janda/Duda
    jenisKelamin: "Laki-laki",
    nomorHp: "",
    tingkatPendidikan: "SD",
    statusPernikahan: "Duda",
    statusHubunganKeluarga: "Ayah",
    kepalaKeluargaId: "J-001", // Living with H. Budi Santoso
    pekerjaanUtama: "Lainnya",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Lancar"
  },

  // Family 5: Joko Prasetyo (Pondok Melati) - Kepala Keluarga, Wiraswasta, Aghnia
  {
    id: "J-016",
    namaLengkap: "Joko Prasetyo",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Madiun",
    tanggalLahir: "1988-11-20", // 37 years -> Dewasa
    jenisKelamin: "Laki-laki",
    nomorHp: "081299887766",
    tingkatPendidikan: "S1",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Kepala Keluarga",
    kepalaKeluargaId: "", // Self
    pekerjaanUtama: "Wiraswasta",
    dapuan: "Pengurus Kelompok",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-017",
    namaLengkap: "Larasati",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Kediri",
    tanggalLahir: "1992-03-15", // 34 years -> Dewasa
    jenisKelamin: "Perempuan",
    nomorHp: "081299887767",
    tingkatPendidikan: "S1",
    statusPernikahan: "Menikah",
    statusHubunganKeluarga: "Istri",
    kepalaKeluargaId: "J-016",
    pekerjaanUtama: "IRT",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },
  {
    id: "J-018",
    namaLengkap: "Fathan Prasetyo",
    kelompokPengajian: "Pondok Melati",
    tempatLahir: "Bekasi",
    tanggalLahir: "2019-07-22", // 6 years -> Caberawit
    jenisKelamin: "Laki-laki",
    nomorHp: "",
    tingkatPendidikan: "PAUD",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Anak",
    kepalaKeluargaId: "J-016",
    pekerjaanUtama: "Pelajar/Mahasiswa",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Aghnia",
    kelancaranSambung: "Lancar"
  },

  // Solo Member (Belum Menikah GUM, but no family listed in app yet) - Jatiranggon
  {
    id: "J-019",
    namaLengkap: "Pratama Putera",
    kelompokPengajian: "Jatiranggon",
    tempatLahir: "Surakarta",
    tanggalLahir: "2000-09-30", // 25 years -> GUM
    jenisKelamin: "Laki-laki",
    nomorHp: "087711223344",
    tingkatPendidikan: "Diploma",
    statusPernikahan: "Belum Menikah",
    statusHubunganKeluarga: "Kepala Keluarga", // Single head of family
    kepalaKeluargaId: "", // Self
    pekerjaanUtama: "Swasta",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Menengah",
    kelancaranSambung: "Perlu Perhatian"
  },

  // Solo Member - Chandra, Janda Dhuafa
  {
    id: "J-020",
    namaLengkap: "Mbah Sumiati",
    kelompokPengajian: "Chandra",
    tempatLahir: "Purworejo",
    tanggalLahir: "1952-08-08", // 73 years -> Manula
    jenisKelamin: "Perempuan",
    nomorHp: "",
    tingkatPendidikan: "SD",
    statusPernikahan: "Janda",
    statusHubunganKeluarga: "Kepala Keluarga", // Lives alone
    kepalaKeluargaId: "", 
    pekerjaanUtama: "Lainnya",
    dapuan: "Rokyah biasa",
    statusEkonomi: "Dhuafa",
    kelancaranSambung: "Lancar"
  }
];
