const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceRecordCard.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Unknown ID"', '"ID Tidak Diketahui"'],
  ['"Unknown User"', '"Pengguna Tidak Diketahui"'],
  ['"Unknown"', '"Tidak Diketahui"'],
  ['"Details"', '"Detail"'],
  ['"Edit"', '"Edit"'],
  ['"Delete"', '"Hapus"'],
  ['"Present"', '"Hadir"'],
  ['"Late"', '"Terlambat"'],
  ['"Absent"', '"Tidak Hadir / Alpha"'],
  ['"Sick"', '"Sakit"'],
  ['"Excused"', '"Izin"']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated card successfully!');
