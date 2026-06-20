const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Search & Filter Attendance"', '"Cari & Filter Kehadiran"'],
  ['"Global Search"', '"Pencarian Global"'],
  ['"Using global filters (Date, Status, Search). Click a context tab to filter by specific criteria."', '"Menggunakan filter global (Tanggal, Status, Pencarian). Klik tab konteks untuk memfilter berdasarkan kriteria spesifik."'],
  ['>Clear<', '>Hapus<'],
  ['"Hapus Filter"', '"Hapus Filter"']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
