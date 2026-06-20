const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['> View Details<', '> Lihat Detail<'],
  ['> Edit Record<', '> Edit Data<'],
  ['> Delete Record<', '> Hapus Data<'],
  ['`Delete ${selectedIds.size} Records`', '`Hapus ${selectedIds.size} Data`'],
  ['>Records Selected<', '>Data Terpilih<'],
  ['>Delete Selected<', '>Hapus Terpilih<'],
  ['>Cancel<', '>Batal<'],
  ['>Delete<', '>Hapus<'],
  ['>Edit Record<', '>Edit Data<']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
