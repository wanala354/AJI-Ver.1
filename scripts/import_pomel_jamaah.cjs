const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
let url='', key='';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity/brain/59a2dc43-99e8-45b4-8738-544c98e7826c/.user_uploaded/media_1793860279844_219a1937.csv', 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('TOTAL') && !l.startsWith('nama_lengkap'));

const monthMap = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
  jul: 7, agu: 8, ags: 8, sep: 9, okt: 10, nov: 11, des: 12
};

function parseDate(raw) {
  if (!raw) return null;
  let s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s || s === 'belumada' || s === '-' || s === 'tdkada') return null;

  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let p0 = parts[0], p1 = parts[1], p2 = parts[2];

    if (isNaN(p1) && monthMap[p1.substring(0, 3)]) {
      let m = monthMap[p1.substring(0, 3)];
      let d = parseInt(p0, 10);
      let y = parseInt(p2, 10);
      if (y < 100) y += (y < 30 ? 2000 : 1900);
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    let d = parseInt(p0, 10);
    let m = parseInt(p1, 10);
    let y = parseInt(p2, 10);

    if (m > 12 && d <= 12) {
      const temp = d;
      d = m;
      m = temp;
    }

    if (y < 100) y += (y < 30 ? 2000 : 1900);

    if (y > 1900 && y < 2030 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
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

function buildCleanRecords() {
  let nextIdNum = 170;
  const rawRecords = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(';').map(p => p.trim());
    const rawName = parts[0];
    const kelompok = 'Pondok Melati';

    let rawGender = parts[2];
    let gender = rawGender;
    const nLow = rawName.toLowerCase();
    if (!gender) {
      if (nLow.startsWith('istri') || nLow.startsWith('bu ') || ['anisa', 'dini', 'neika', 'safira', 'aisyah', 'ayu', 'viona', 'sarni'].includes(nLow)) {
        gender = 'Perempuan';
      } else {
        gender = 'Laki-laki';
      }
    }

    const tempatLahir = parts[3] || 'belum ada';
    let tglLahir = parseDate(parts[4]);
    const rawPek = parts[11] || '';
    const pekLow = rawPek.toLowerCase();

    // Fallback date if birthdate is missing
    if (!tglLahir) {
      if (pekLow.includes('balita')) {
        tglLahir = '2023-01-01';
      } else if (nLow.startsWith('anak')) {
        tglLahir = '2015-01-01';
      } else if (pekLow.includes('mahasiswa')) {
        tglLahir = '2003-01-01';
      } else if (parts[5] === 'Menikah' || nLow.startsWith('istri') || nLow.startsWith('bu ')) {
        tglLahir = '1985-01-01';
      } else if (parts[5] === 'Belum Menikah') {
        tglLahir = '2005-01-01';
      } else {
        tglLahir = '1990-01-01';
      }
    }

    let age = 2026 - parseInt(tglLahir.substring(0, 4), 10);

    // Marital status
    let nikah = parts[5];
    if (nLow.startsWith('istri') || nLow.startsWith('bu ')) {
      nikah = 'Menikah';
    } else if (nLow.startsWith('anak')) {
      nikah = 'Belum Menikah';
    } else if (age !== null && age < 17) {
      nikah = 'Belum Menikah';
    } else if (!nikah) {
      if (age !== null && age >= 25) nikah = 'Menikah';
      else if (age !== null && age < 25) nikah = 'Belum Menikah';
      else nikah = 'Menikah';
    }

    // Harmonize gender & occupation
    let pek = rawPek;
    if (nLow.startsWith('anak')) {
      pek = 'Pelajar';
    } else if (nLow.startsWith('istri') || nLow.startsWith('bu ')) {
      pek = 'IRT';
    } else if (age !== null && age < 5) {
      pek = 'belum ada';
    } else if (age !== null && age >= 5 && age < 18) {
      pek = 'Pelajar';
    } else if (gender === 'Laki-laki') {
      if (pekLow.includes('ibu rumah tangga') || pekLow === 'irt' || pekLow.includes('balita')) {
        pek = 'Wiraswasta';
      } else if (pekLow.includes('wiraswasta')) {
        pek = 'Wiraswasta';
      } else if (pekLow.includes('swasta')) {
        pek = 'Swasta';
      } else if (pekLow.includes('guru')) {
        pek = 'Guru';
      } else if (pekLow.includes('pns') || pekLow.includes('asn')) {
        pek = 'ASN';
      } else if (pekLow.includes('pelajar')) {
        pek = (age && age >= 19 && age <= 24) ? 'Mahasiswa' : 'Wiraswasta';
      } else if (pekLow.includes('mubaligh') || pekLow.includes('marbo') || pekLow.includes('lepas')) {
        pek = 'Lainnya';
      } else {
        pek = 'Wiraswasta';
      }
    } else {
      // Perempuan
      if (pekLow.includes('balita') && age !== null && age >= 18) {
        pek = 'IRT';
      } else if (pekLow.includes('ibu rumah tangga') || pekLow === 'irt') {
        pek = 'IRT';
      } else if (pekLow.includes('wiraswasta')) {
        pek = 'Wiraswasta';
      } else if (pekLow.includes('swasta')) {
        pek = 'Swasta';
      } else if (pekLow.includes('pns') || pekLow.includes('asn')) {
        pek = 'ASN';
      } else if (pekLow.includes('guru')) {
        pek = 'Guru';
      } else if (pekLow.includes('pelajar')) {
        pek = (age && age >= 19 && age <= 24) ? 'Mahasiswa' : 'IRT';
      } else if (pekLow.includes('lepas')) {
        pek = 'Lainnya';
      } else {
        pek = 'IRT';
      }
    }

    let id = null;
    if (nLow === 'edi sutikno') {
      id = 'J-160';
    } else if (nLow === 'fattah hadi saputro') {
      id = 'J-165';
    } else {
      id = `J-${String(nextIdNum).padStart(3, '0')}`;
      nextIdNum++;
    }

    rawRecords.push({
      id,
      nama_lengkap: rawName,
      kelompok_pengajian: kelompok,
      jenis_kelamin: gender,
      tempat_lahir: tempatLahir,
      tanggal_lahir: tglLahir,
      age,
      status_pernikahan: nikah,
      nomor_hp: cleanPhone(parts[9]),
      tingkat_pendidikan: 'belum ada',
      pekerjaan_utama: pek,
      dapuan: 'Rokyah biasa',
      status_ekonomi: 'Menengah',
      kelancaran_sambung: 'Lancar',
      status_keaktifan: 'Aktif',
      keterangan_status: null,
      alamat: parts[18] || null,
      rawAddress: parts[18] || ''
    });
  }

  // Group into households
  const households = [];
  let currentHH = [];
  let currentAddr = '';

  for (let i = 0; i < rawRecords.length; i++) {
    const r = rawRecords[i];
    const nLow = r.nama_lengkap.toLowerCase();

    let isNewHH = false;
    if (i === 0) {
      isNewHH = true;
    } else if (r.rawAddress && r.rawAddress.length > 5 && r.rawAddress !== currentAddr) {
      isNewHH = true;
    } else if (nLow.startsWith('anak') || nLow.startsWith('istri') || nLow.startsWith('bu ')) {
      isNewHH = false;
    } else if (r.jenis_kelamin === 'Laki-laki' && r.status_pernikahan === 'Menikah' && (r.age === null || r.age >= 20)) {
      if (currentHH.some(m => m.jenis_kelamin === 'Laki-laki' && m.status_pernikahan === 'Menikah')) {
        isNewHH = true;
      }
    }

    if (isNewHH && currentHH.length > 0) {
      households.push(currentHH);
      currentHH = [];
    }

    if (r.rawAddress) currentAddr = r.rawAddress;
    currentHH.push(r);
  }
  if (currentHH.length > 0) households.push(currentHH);

  const finalRecords = [];
  households.forEach(hh => {
    const hhAddress = hh.find(m => m.alamat)?.alamat || null;

    let kk = hh.find(m => m.jenis_kelamin === 'Laki-laki' && m.status_pernikahan === 'Menikah' && (m.age === null || m.age >= 18) && !m.nama_lengkap.toLowerCase().startsWith('anak'));
    if (!kk) {
      kk = hh.find(m => m.jenis_kelamin === 'Laki-laki' && (m.age === null || m.age >= 18) && !m.nama_lengkap.toLowerCase().startsWith('anak'));
    }
    if (!kk) {
      kk = hh.find(m => m.jenis_kelamin === 'Perempuan' && (m.age === null || m.age >= 18) && !m.nama_lengkap.toLowerCase().startsWith('anak'));
    }
    if (!kk) {
      kk = hh.slice().sort((a, b) => (b.age || 0) - (a.age || 0))[0];
    }

    hh.forEach(m => {
      if (m === kk) {
        m.status_hubungan_keluarga = 'Kepala Keluarga';
        m.kepala_keluarga_id = kk.id;
      } else {
        const nLow = m.nama_lengkap.toLowerCase();
        if (nLow.startsWith('istri') || nLow.startsWith('bu ') || (m.jenis_kelamin === 'Perempuan' && m.status_pernikahan === 'Menikah' && kk.jenis_kelamin === 'Laki-laki')) {
          m.status_hubungan_keluarga = 'Istri';
        } else if (nLow.startsWith('anak') || (m.age !== null && m.age < 18) || (m.status_pernikahan === 'Belum Menikah' && (m.age === null || m.age <= 25))) {
          m.status_hubungan_keluarga = 'Anak';
        } else {
          m.status_hubungan_keluarga = 'Lainnya';
        }
        m.kepala_keluarga_id = kk.id;
      }

      if (!m.alamat && hhAddress) {
        m.alamat = hhAddress;
      }

      delete m.age;
      delete m.rawAddress;
      finalRecords.push(m);
    });
  });

  return finalRecords;
}

module.exports = { buildCleanRecords };

if (require.main === module) {
  console.log('--- Mempersiapkan 155 Data Pondok Melati Bersih ---');
  const records = buildCleanRecords();
  console.log(`Total data: ${records.length} orang.`);
}
