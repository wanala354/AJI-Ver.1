const fs = require('fs');

const filePath = 'C:/Users/HP/OneDrive/Documents/2026/App_Proj/AJI/index.html';
let content = fs.readFileSync(filePath, 'utf8');

const target = `      const jamaahRowsP1 = (data.jamaahList || []).map(j => ({
        id: j.id,
        nama_lengkap: j.namaLengkap,`;

const replacement = `      const jamaahRowsP1 = (data.jamaahList || []).map(j => ({
        id: j.id,
        nama_lengkap: j.namaLengkap || "Tidak Diketahui",`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Replaced successfully!');
} else {
    console.log('Target not found!');
}
