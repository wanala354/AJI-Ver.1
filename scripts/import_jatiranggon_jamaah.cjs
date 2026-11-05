const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const env = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

const rawCsv = fs.readFileSync('scratch/jatiranggon_raw.csv', 'utf8');

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

const monthNames = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, agu: 8, ags: 8, aug: 8,
  september: 9, septemeber: 9, sep: 9,
  oktober: 10, oct: 10, okt: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12
};

function parseDate(rawDate, rawAge, hub) {
  if (rawDate && rawDate.trim() !== '-' && rawDate.trim() !== '') {
    const s = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD-MM-YYYY
    let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }

    // DD/MM/YYYY
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }

    // DD Month YYYY (e.g. 29 MARET 1961, 21 SEPTEMEBER 1996)
    m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const d = parseInt(m[1], 10);
      const moStr = m[2].toLowerCase();
      const mo = monthNames[moStr] || 1;
      const y = parseInt(m[3], 10);
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const ageNum = parseInt((rawAge || '').replace(/[^0-9]/g, ''), 10);
  if (ageNum && ageNum > 0 && ageNum < 120) {
    const y = 2026 - ageNum;
    return `${y}-01-01`;
  }

  const h = (hub || '').toLowerCase();
  if (h.includes('anak')) return '2015-01-01';
  if (h.includes('ibu')) return '1950-01-01';
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

function normalizeGender(rawLp, nama, hub) {
  const lp = (rawLp || '').toUpperCase().trim();
  if (lp === 'L') return 'Laki-laki';
  if (lp === 'P') return 'Perempuan';

  // Specific manual checks based on data
  const nLow = nama.toLowerCase();
  if (nLow === 'pipit') return 'Perempuan';
  if (nLow === 'arbani') return 'Laki-laki';
  if (nLow === 'kinara') return 'Perempuan';
  if (nLow === 'dimas') return 'Perempuan'; // Marked as istri
  if (nLow.includes('anak ke-1')) return 'Laki-laki';

  const hLow = (hub || '').toLowerCase();
  if (hLow.includes('istri') || hLow.includes('ibu')) return 'Perempuan';
  return 'Laki-laki';
}

function normalizeHubungan(rawHub, nama, age, gender) {
  const hLow = (rawHub || '').toLowerCase().trim();
  
  // Correction: Ezrazia Ramadhan is age 6, male, listed as 'istri' under a female head of family -> it's her child
  if (nama.toLowerCase().includes('ezrazia')) return 'Anak';

  if (hLow.includes('kepala keluarga')) return 'Kepala Keluarga';
  if (hLow.includes('istri')) return 'Istri';
  if (hLow.includes('anak')) return 'Anak';
  if (hLow.includes('ibu')) return 'Lainnya';
  return 'Lainnya';
}

function normalizeStatusNikah(hub, age, gender) {
  if (age !== null && age < 17) return 'Belum Menikah';
  if (hub === 'Anak') return 'Belum Menikah';
  if (hub === 'Istri') return 'Menikah';
  if (hub === 'Kepala Keluarga') {
    if (gender === 'Perempuan') return 'Janda';
    return 'Menikah';
  }
  if (hub === 'Lainnya') {
    if (gender === 'Perempuan' && age >= 50) return 'Janda';
  }
  return (age && age >= 25) ? 'Menikah' : 'Belum Menikah';
}

function normalizeJob(rawJob, age, gender, hub, ket) {
  const kLow = (ket || '').toLowerCase().trim();
  if (kLow.includes('pondok')) return 'Pelajar';

  const jLow = (rawJob || '').toLowerCase().trim();
  if (jLow.includes('swasta')) return 'Swasta';
  if (jLow.includes('wiraswasta')) return 'Wiraswasta';
  if (jLow.includes('pns') || jLow.includes('asn')) return 'ASN';
  if (jLow.includes('guru')) return 'Guru';

  if (age !== null && age < 5) return 'belum ada';
  if (age !== null && age >= 5 && age < 18) return 'Pelajar';
  if (age !== null && age >= 18 && age <= 24 && hub === 'Anak') return 'Mahasiswa';

  if (gender === 'Perempuan') {
    if (hub === 'Istri' || hub === 'Kepala Keluarga' || hub === 'Lainnya') return 'IRT';
    return 'Swasta';
  }

  // Adult male
  if (age !== null && age >= 65) return 'Lainnya';
  return 'Wiraswasta';
}

async function runImport() {
  console.log('=== MEMULAI IMPORT DATA JAMAAH KELOMPOK JATIRANGGON ===');

  const allRows = parseCsvRows(rawCsv);
  const dataRows = allRows.slice(1).filter(r => r.length > 2 && r[2].trim().length > 0);

  console.log(`Jumlah baris data dari CSV: ${dataRows.length}`);

  // Query database to find current max ID
  const { data: dbData, error: dbErr } = await supabase.from('jamaah').select('id');
  if (dbErr) {
    console.error('Error fetching database:', dbErr);
    process.exit(1);
  }

  let maxId = 457;
  dbData.forEach(d => {
    const m = d.id && d.id.match(/^J-(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxId) maxId = num;
    }
  });

  let nextIdNum = maxId + 1;
  console.log(`Max ID saat ini di Supabase: J-${maxId}. ID baru mulai dari: J-${nextIdNum}`);

  const records = [];
  let currentAlamat = '';

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const no = r[0];
    const nama = r[2].trim();
    const rawHub = r[3];
    const tempatLahir = r[4].trim() || 'belum ada';
    const rawTgl = r[5];
    const rawAge = r[6];
    const rawLp = r[7];
    const rawJob = r[8];
    const rawHp = r[9];
    const rawAddr = r[11] ? r[11].trim() : '';
    const rawKet = r[12] ? r[12].trim() : '';

    const gender = normalizeGender(rawLp, nama, rawHub);
    const tglLahir = parseDate(rawTgl, rawAge, rawHub);
    const birthYear = parseInt(tglLahir.substring(0, 4), 10);
    const age = isNaN(birthYear) ? (parseInt(rawAge, 10) || null) : (2026 - birthYear);

    const hub = normalizeHubungan(rawHub, nama, age, gender);
    const nikah = normalizeStatusNikah(hub, age, gender);
    const pek = normalizeJob(rawJob, age, gender, hub, rawKet);
    const hp = cleanPhone(rawHp);

    const id = `J-${String(nextIdNum).padStart(3, '0')}`;
    nextIdNum++;

    if (rawAddr) currentAlamat = rawAddr;
    const alamat = rawAddr || currentAlamat || null;

    let kelancaran = 'Lancar';
    if (rawKet.toLowerCase().includes('kurang lancar')) {
      kelancaran = 'Kurang Lancar';
    }

    records.push({
      id,
      nama_lengkap: nama,
      kelompok_pengajian: 'Jatiranggon',
      jenis_kelamin: gender,
      tempat_lahir: tempatLahir,
      tanggal_lahir: tglLahir,
      status_pernikahan: nikah,
      status_hubungan_keluarga: hub,
      nomor_hp: hp,
      tingkat_pendidikan: 'belum ada',
      pekerjaan_utama: pek,
      dapuan: 'Rokyah biasa',
      status_ekonomi: 'Menengah',
      kelancaran_sambung: kelancaran,
      status_keaktifan: 'Aktif',
      keterangan_status: rawKet || null,
      alamat: alamat
    });
  }

  // Assign kepala_keluarga_id
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

  console.log(`Total data terstruktur: ${records.length} orang.`);

  // Pass 1: Insert all Kepala Keluarga
  const kkRecords = records.filter(r => r.status_hubungan_keluarga === 'Kepala Keluarga');
  const nonKkRecords = records.filter(r => r.status_hubungan_keluarga !== 'Kepala Keluarga');

  console.log(`Pass 1: Mengirim ${kkRecords.length} data Kepala Keluarga...`);
  for (let i = 0; i < kkRecords.length; i += 50) {
    const chunk = kkRecords.slice(i, i + 50);
    const { error } = await supabase.from('jamaah').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Error saat insert Kepala Keluarga:', error);
      process.exit(1);
    }
  }
  console.log(`Pass 1 Sukses: ${kkRecords.length} Kepala Keluarga tersimpan.`);

  // Pass 2: Insert all Non-KK (Istri, Anak, Lainnya)
  console.log(`Pass 2: Mengirim ${nonKkRecords.length} data Anggota Keluarga...`);
  for (let i = 0; i < nonKkRecords.length; i += 50) {
    const chunk = nonKkRecords.slice(i, i + 50);
    const { error } = await supabase.from('jamaah').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Error saat insert Anggota Keluarga:', error);
      process.exit(1);
    }
  }
  console.log(`Pass 2 Sukses: ${nonKkRecords.length} Anggota Keluarga tersimpan.`);

  // Verification
  console.log('--- Verifikasi Hasil Import ---');
  const { data: jatiranggonAll, error: verErr } = await supabase
    .from('jamaah')
    .select('id, jenis_kelamin, status_pernikahan, status_hubungan_keluarga, kelancaran_sambung')
    .eq('kelompok_pengajian', 'Jatiranggon');

  if (verErr) {
    console.error('Verifikasi error:', verErr);
  } else {
    console.log(`Total jamaah kelompok Jatiranggon di DB: ${jatiranggonAll.length}`);
    const genderCount = {};
    const nikahCount = {};
    const hubCount = {};
    const lancarCount = {};
    jatiranggonAll.forEach(j => {
      genderCount[j.jenis_kelamin] = (genderCount[j.jenis_kelamin] || 0) + 1;
      nikahCount[j.status_pernikahan] = (nikahCount[j.status_pernikahan] || 0) + 1;
      hubCount[j.status_hubungan_keluarga] = (hubCount[j.status_hubungan_keluarga] || 0) + 1;
      lancarCount[j.kelancaran_sambung] = (lancarCount[j.kelancaran_sambung] || 0) + 1;
    });
    console.log('Gender:', genderCount);
    console.log('Status Pernikahan:', nikahCount);
    console.log('Hubungan Keluarga:', hubCount);
    console.log('Kelancaran Sambung:', lancarCount);
  }

  const { count: totalDb } = await supabase.from('jamaah').select('*', { count: 'exact', head: true });
  console.log(`Total keseluruhan jamaah di database saat ini: ${totalDb}`);
}

runImport().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
