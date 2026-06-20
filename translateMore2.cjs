const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Location fetching error:"', '"Kesalahan mengambil lokasi:"'],
  ['"Select user..."', '"Pilih pengguna..."'],
  ['"Switch Camera"', '"Ganti Kamera"'],
  ['"Take New Photo"', '"Ambil Foto Baru"'],
  ['"Open Camera"', '"Buka Kamera"'],
  ['"Activate Scanner"', '"Aktifkan Pemindai"'],
  ['"Generate QR Point"', '"Buat Titik QR"'],
  ['"Scan User QR"', '"Pindai QR Pengguna"'],
  ['"Select Scanning Mode"', '"Pilih Mode Pemindaian"'],
  ['"Scanned Identity"', '"Identitas Terpindai"'],
  ['"QR Scan Data"', '"Data Pindai QR"'],
  ['"Delete Selected"', '"Hapus Pilihan"'],
  ['"Records Selected"', '"Data Terpilih"'],
  ['"Delete Selected Records"', '"Hapus Data Terpilih"'],
  ['"Update Status for Selected Records"', '"Perbarui Status untuk Data Terpilih"'],
  ['"Update Status"', '"Perbarui Status"'],
  ['"Location access denied. Coordinates set to 0."', '"Akses lokasi ditolak. Koordinat diatur ke 0."'],
  ['"User checked out successfully"', '"Pengguna berhasil melakukan check-out"']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
