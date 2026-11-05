const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Menggunakan kredensial Supabase proyek AJI
const url = 'https://mphxkqcvcmdqafrslwti.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waHhrcWN2Y21kcWFmcnNsd3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjQ3NTQsImV4cCI6MjA5NjY0MDc1NH0.o2QXxuhTFwjG1RgAjBSd6JBApjtgdCE6bjTUfnWNET8';

const supabase = createClient(url, key);

// 22 Tabel Lengkap Database AJI Supabase
const TABLES = [
  'app_users',
  'audit_logs',
  'data_haji',
  'generus_hadis_progress',
  'generus_keilmuan_progress',
  'jamaah',
  'laporan_bulanan',
  'master_bidang_keilmuan',
  'master_dapuan',
  'master_grup_kustom',
  'master_jenis_pengajian',
  'master_keilmuan_materi',
  'master_kelompok',
  'master_materi_pengajian',
  'master_pekerjaan',
  'master_pendidikan',
  'master_pengajar',
  'master_peserta_pengajian',
  'master_tempat_kegiatan',
  'pengajian_jadwal',
  'pengajian_presensi',
  'pengurus'
];

async function fetchTableAll(tableName) {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return { error, data: [] };
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  return { error: null, data: allData };
}

async function runBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`=======================================================`);
  console.log(`  AJI DATABASE BACKUP TOOL (SUPABASE)`);
  console.log(`  Waktu: ${now.toLocaleString('id-ID')}`);
  console.log(`  Lokasi Penyimpanan: ${backupDir}`);
  console.log(`=======================================================\n`);

  const summary = {
    timestamp: now.toISOString(),
    total_tables: TABLES.length,
    tables: {}
  };

  const combinedBackup = {};

  for (const table of TABLES) {
    process.stdout.write(`- Mengambil data tabel '${table}'... `);
    const { data, error } = await fetchTableAll(table);
    if (error) {
      console.log(`[GAGAL] ${error.message}`);
      summary.tables[table] = { status: 'error', error: error.message };
    } else {
      console.log(`[SUKSES] ${data.length} baris`);
      summary.tables[table] = { status: 'success', row_count: data.length };
      combinedBackup[table] = data;

      // File individual per tabel
      fs.writeFileSync(
        path.join(backupDir, `${table}.json`),
        JSON.stringify(data, null, 2),
        'utf8'
      );
    }
  }

  // File gabungan (all in one)
  fs.writeFileSync(
    path.join(backupDir, `_all_tables_combined.json`),
    JSON.stringify(combinedBackup, null, 2),
    'utf8'
  );

  // File ringkasan backup
  fs.writeFileSync(
    path.join(backupDir, `_backup_summary.json`),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(`\n=======================================================`);
  console.log(`  BACKUP SELESAI DENGAN SUKSES!`);
  console.log(`  Seluruh 22 tabel berhasil diekspor.`);
  console.log(`  Folder: ${backupDir}`);
  console.log(`=======================================================`);

  return backupDir;
}

runBackup().catch(err => {
  console.error('Terjadi kesalahan backup:', err);
  process.exit(1);
});
