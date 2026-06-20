const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Add context for this scan..."', '"Tambahkan keterangan untuk pindaian ini..."'],
  ['"Why is this record being modified?"', '"Mengapa data ini diubah?"']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
