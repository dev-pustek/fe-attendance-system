const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['"Error accessing camera:"', '"Kesalahan mengakses kamera:"'],
  ['"Failed to access camera"', '"Gagal mengakses kamera"'],
  ['"Export to Excel is not yet implemented on the backend."', '"Ekspor ke Excel belum diimplementasikan di backend."'],
  ['"Export to PDF is not yet implemented on the backend."', '"Ekspor ke PDF belum diimplementasikan di backend."'],
  ['"Template download is not yet implemented on the backend."', '"Unduhan template belum diimplementasikan di backend."'],
  ['"Error fetching context details:"', '"Kesalahan mengambil detail konteks:"'],
  ['"Failed to search users"', '"Gagal mencari pengguna"'],
  ['"Please select a user"', '"Harap pilih pengguna"'],
  ['"Record created/updated manually by admin"', '"Data dibuat/diperbarui secara manual oleh admin"'],
  ['"Failed to create manual record"', '"Gagal membuat data manual"'],
  ['"Failed to update record"', '"Gagal memperbarui data"'],
  ['"Quick Checkout Clicked for:"', '"Check-out Cepat Diklik untuk:"'],
  ['"Quick Check-out"', '"Check-out Cepat"'],
  ['"Check Out"', '"Check-out"'],
  ['"Failed to check out user"', '"Gagal melakukan check-out pengguna"'],
  ['"Please enter QR data"', '"Harap masukkan data QR"'],
  ['"Attendance processed via QR scan (Automated)"', '"Kehadiran diproses melalui pindai QR (Otomatis)"'],
  ['"Failed to process QR scan"', '"Gagal memproses pindai QR"'],
  ['"Delete Attendance Record"', '"Hapus Data Kehadiran"'],
  ['"Delete failed"', '"Gagal menghapus"'],
  ['"Bulk delete failed"', '"Hapus massal gagal"'],
  ['"Failed to delete some records"', '"Gagal menghapus beberapa data"'],
  ['"Bulk update status failed"', '"Perbarui status massal gagal"'],
  ['"Failed to update status for some records"', '"Gagal memperbarui status untuk beberapa data"'],
  ['"Specific Event"', '"Acara Spesifik"'],
  ['"Regular Class"', '"Kelas Reguler"'],
  ['"Assigned Shift"', '"Shift yang Ditugaskan"'],
  ['"Gate Entry"', '"Gerbang Masuk"'],
  ['"Attendance List | Attendance"', '"Daftar Kehadiran | Kehadiran"'],
  ['"View attendance records"', '"Lihat data kehadiran"'],
  ['"Daily Attendance"', '"Kehadiran Harian"'],
  ['"Class Attendance"', '"Kehadiran Kelas"']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
