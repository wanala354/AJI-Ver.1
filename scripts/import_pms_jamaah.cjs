const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
let url='', key='';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

const raw = fs.readFileSync('scratch/pms_raw.csv', 'utf8');

function parseCsvRows(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  
  for (const line of lines) {
    const row = [];
    let inQuotes = false;
    let current = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

const monthMap = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6,
  jul: 7, aug: 8, agu: 8, ags: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12
};

function parseDate(rawDate, rawAge, rawJob, rawHub) {
  if (rawDate) {
    const s = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }
    const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mStr = m[2].toLowerCase();
      let y = parseInt(m[3], 10);
      if (y < 100) {
        y += (y <= 30 ? 2000 : 1900);
      }
      const mo = monthMap[mStr] || 1;
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const ageNum = parseInt((rawAge || '').replace(/[^0-9]/g, ''), 10);
  if (ageNum && ageNum > 0 && ageNum < 115) {
    const y = 2026 - ageNum;
    return `${y}-01-01`;
  }

  const jobLow = (rawJob || '').toLowerCase();
  const hubLow = (rawHub || '').toLowerCase();
  if (jobLow.includes('balita')) return '2022-01-01';
  if (jobLow.includes('pelajar') || hubLow.includes('anak')) return '2012-01-01';
  if (hubLow.includes('istri')) return '1982-01-01';
  if (hubLow.includes('kepala keluarga')) return '1975-01-01';
  return '1985-01-01';
}

function cleanPhone(raw) {
  if (!raw) return 'belum ada';
  let s = raw.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (s.toLowerCase().includes('tdk') || s.toLowerCase().includes('belum') || s === '-') return 'belum ada';
  if (s.includes('E+')) return 'belum ada';
  let digits = s.replace(/[^0-9]/g, '');
  if (!digits) return 'belum ada';
  if (!digits.startsWith('0')) digits = '0' + digits;
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return 'belum ada';
}

function normalizeJob(rawJob, age, gender, hub) {
  const jLow = (rawJob || '').toLowerCase().trim();
  if (age !== null && age < 5) return 'belum ada';
  if (jLow.includes('balita')) return 'belum ada';
  if (jLow.includes('jobless')) return 'belum ada';
  if (age !== null && age >= 5 && age < 18) return 'Pelajar';
  if (jLow.includes('pelajar')) return (age && age >= 19 && age <= 24) ? 'Mahasiswa' : 'Pelajar';
  if (jLow.includes('mahasiswa')) return 'Mahasiswa';
  if (jLow.includes('wiraswasta')) return 'Wiraswasta';
  if (jLow.includes('swasta')) return 'Swasta';
  if (jLow.includes('ibu rumah tangga') || jLow === 'irt') return 'IRT';
  if (jLow.includes('pns') || jLow.includes('asn')) return 'ASN';
  if (jLow.includes('guru')) return 'Guru';
  if (jLow.includes('mubaligh') || jLow.includes('marbo') || jLow.includes('lepas')) return 'Lainnya';
  
  if (gender === 'Perempuan' && (hub === 'Istri' || hub === 'Kepala Keluarga')) return 'IRT';
  if (gender === 'Laki-laki' && hub === 'Kepala Keluarga') return 'Wiraswasta';
  return 'belum ada';
}

function normalizeHubungan(rawHub, gender, status, isFirstInFam) {
  const hLow = (rawHub || '').toLowerCase().trim();
  if (hLow.includes('kepala keluarga')) return 'Kepala Keluarga';
  if (hLow.includes('istri')) return 'Istri';
  if (hLow.includes('anak') || hLow.includes('ianak')) return 'Anak';
  if (hLow.includes('keponakan') || hLow.includes('lajang')) return 'Lainnya';
  
  if (isFirstInFam) return 'Kepala Keluarga';
  if (gender === 'Perempuan' && status === 'Menikah') return 'Istri';
  return 'Anak';
}

function normalizeStatusNikah(rawStatus, age, hub) {
  const sLow = (rawStatus || '').toLowerCase().trim();
  if (age !== null && age < 17) return 'Belum Menikah';
  if (sLow.includes('pernah kawin') || sLow.includes('janda') || sLow.includes('duda')) return 'Janda';
  if (sLow.includes('kawin') || sLow.includes('menikah')) return 'Menikah';
  if (sLow.includes('belum')) return 'Belum Menikah';
  
  if (hub === 'Kepala Keluarga' || hub === 'Istri') return 'Menikah';
  if (hub === 'Anak') return 'Belum Menikah';
  return (age && age >= 25) ? 'Menikah' : 'Belum Menikah';
}

async function runImport() {
  console.log('--- Mempersiapkan Data Pondok Melati Selatan ---');
  const dataRows = parseCsvRows(raw).filter(r => /^\d+$/.test(r[0]));

  // Get max ID from DB
  const { data: dbData } = await supabase.from('jamaah').select('id');
  let maxId = 322;
  dbData.forEach(d => {
    const m = d.id && d.id.match(/^J-(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxId) maxId = num;
    }
  });

  let nextIdNum = maxId + 1;
  console.log(`Max ID saat ini di database: J-${maxId}. ID baru mulai dari: J-${nextIdNum}`);

  const records = [];
  let currentAlamat = '';

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const no = r[0];
    const nama = r[1].trim();
    let rawLp = r[2].trim().toUpperCase();
    const rawHub = r[6].trim().toUpperCase();

    let gender = rawLp === 'P' ? 'Perempuan' : 'Laki-laki';
    if (!rawLp) {
      if (rawHub.includes('ISTRI') || nama.toLowerCase().startsWith('ibu ') || nama.toLowerCase().includes('nur') || nama.toLowerCase().includes('indah')) {
        gender = 'Perempuan';
      } else {
        gender = 'Laki-laki';
      }
    }

    const tempatLahir = r[3].trim() || 'belum ada';
    const rawTgl = r[4];
    const rawAge = r[5];
    const tglLahir = parseDate(rawTgl, rawAge, r[15], rawHub);
    const age = 2026 - parseInt(tglLahir.substring(0, 4), 10);

    const rawStatus = r[13];
    const nikah = normalizeStatusNikah(rawStatus, age, rawHub);
    const hub = normalizeHubungan(rawHub, gender, nikah, rawHub === 'KEPALA KELUARGA');
    const pek = normalizeJob(r[15], age, gender, hub);
    const hp = cleanPhone(r[17]);
    const rawAddr = r[16].trim();

    let id = '';
    if (nama.toLowerCase() === 'yulianto' && tempatLahir.toLowerCase().includes('jakarta')) {
      id = 'J-150';
    } else {
      id = `J-${String(nextIdNum).padStart(3, '0')}`;
      nextIdNum++;
    }

    if (rawAddr) {
      currentAlamat = rawAddr;
    }
    const alamat = rawAddr || currentAlamat || null;

    records.push({
      id,
      nama_lengkap: nama,
      kelompok_pengajian: 'Pondok Melati Selatan',
      jenis_kelamin: gender,
      tempat_lahir: tempatLahir,
      tanggal_lahir: tglLahir,
      status_pernikahan: nikah,
      status_hubungan_keluarga: hub,
      nomor_hp: hp,
      tingkat_pendidikan: r[14].trim() || 'belum ada',
      pekerjaan_utama: pek,
      dapuan: 'Rokyah biasa',
      status_ekonomi: 'Menengah',
      kelancaran_sambung: 'Lancar',
      status_keaktifan: 'Aktif',
      keterangan_status: null,
      alamat: alamat
    });
  }

  // Link kepala_keluarga_id
  let activeKKId = null;
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.status_hubungan_keluarga === 'Kepala Keluarga') {
      activeKKId = rec.id;
      rec.kepala_keluarga_id = rec.id;
    } else {
      rec.kepala_keluarga_id = activeKKId || rec.id;
    }
  }

  console.log(`Total data siap diinsert: ${records.length} orang.`);

  // Pass 1: Insert all Kepala Keluarga
  const kkRecords = records.filter(r => r.status_hubungan_keluarga === 'Kepala Keluarga');
  const nonKkRecords = records.filter(r => r.status_hubungan_keluarga !== 'Kepala Keluarga');

  console.log(`Mengirim ${kkRecords.length} data Kepala Keluarga...`);
  for (let i = 0; i < kkRecords.length; i += 50) {
    const chunk = kkRecords.slice(i, i + 50);
    const { error } = await supabase.from('jamaah').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Error saat insert KK:', error);
      process.exit(1);
    }
  }
  console.log(`Selesai menyimpan ${kkRecords.length} Kepala Keluarga.`);

  // Pass 2: Insert all non-KK members
  console.log(`Mengirim ${nonKkRecords.length} data Anggota Keluarga...`);
  for (let i = 0; i < nonKkRecords.length; i += 50) {
    const chunk = nonKkRecords.slice(i, i + 50);
    const { error } = await supabase.from('jamaah').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Error saat insert Anggota:', error);
      process.exit(1);
    }
  }
  console.log(`Selesai menyimpan ${nonKkRecords.length} Anggota Keluarga.`);

  // Verifikasi Hasil
  console.log('\n--- Verifikasi Database Setelah Insert ---');
  const { data: pmsData, error: pmsErr } = await supabase
    .from('jamaah')
    .select('id, nama_lengkap, jenis_kelamin, status_pernikahan, status_hubungan_keluarga, pekerjaan_utama')
    .eq('kelompok_pengajian', 'Pondok Melati Selatan');

  const { count: totalAll } = await supabase
    .from('jamaah')
    .select('*', { count: 'exact', head: true });

  const { data: allKelompok } = await supabase
    .from('jamaah')
    .select('kelompok_pengajian');

  const breakdown = {};
  allKelompok.forEach(d => {
    breakdown[d.kelompok_pengajian] = (breakdown[d.kelompok_pengajian] || 0) + 1;
  });

  console.log(`Total seluruh jamaah di database: ${totalAll}`);
  console.log('Breakdown jamaah per kelompok pengajian:');
  console.table(breakdown);

  const genderStats = { 'Laki-laki': 0, 'Perempuan': 0 };
  const jobStats = {};
  const statusStats = {};
  const hubStats = {};

  pmsData.forEach(j => {
    genderStats[j.jenis_kelamin] = (genderStats[j.jenis_kelamin] || 0) + 1;
    jobStats[j.pekerjaan_utama] = (jobStats[j.pekerjaan_utama] || 0) + 1;
    statusStats[j.status_pernikahan] = (statusStats[j.status_pernikahan] || 0) + 1;
    hubStats[j.status_hubungan_keluarga] = (hubStats[j.status_hubungan_keluarga] || 0) + 1;
  });

  console.log('\nStatistik Gender Pondok Melati Selatan:');
  console.table(genderStats);
  console.log('Statistik Pekerjaan Pondok Melati Selatan:');
  console.table(jobStats);
  console.log('Statistik Status Hubungan Keluarga Pondok Melati Selatan:');
  console.table(hubStats);
}

runImport().catch(err => {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
});
