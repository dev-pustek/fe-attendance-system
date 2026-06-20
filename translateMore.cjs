const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Unknown User"', '"Pengguna Tidak Diketahui"'],
  ['"Unknown"', '"Tidak Diketahui"'],
  ['"Late Minutes Threshold"', '"Batas Menit Terlambat"'],
  ['"Late "', '"Terlambat "']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
