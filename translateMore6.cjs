const fs = require('fs');
const path = 'src/pages/Attendance/AttendanceList.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['>Attendance Records<', '>Data Kehadiran<'],
  ['>Filter Context<', '>Konteks Filter<'],
  ['>Academic Year<', '>Tahun Ajaran<'],
  ['>Major<', '>Jurusan<'],
  ['>Class<', '>Kelas<'],
  ['>Mode<', '>Mode<'],
  ['>Attendance Event<', '>Kegiatan / Acara<'],
  ['>Status<', '>Status<'],
  ['>Start Date<', '>Tanggal Mulai<'],
  ['>End Date<', '>Tanggal Akhir<'],
  ['>Late Minutes Threshold<', '>Batas Menit Terlambat<'],
  ['>No records found<', '>Tidak ada data yang ditemukan<'],
  ['>Active<', '>Aktif<'],
  ['>Clock In<', '>Jam Masuk<'],
  ['>Clock Out<', '>Jam Keluar<'],
  ['>Notes<', '>Catatan<'],
  ['>Select Scanning Mode<', '>Pilih Mode Pemindaian<'],
  ['>Scan User QR<', '>Pindai QR Pengguna<'],
  ['>Show Our QR<', '>Tampilkan QR Kami<'],
  ['>Scanned Identity<', '>Identitas Terpindai<'],
  ['>Active Context<', '>Konteks Aktif<'],
  ['>LATITUDE<', '>GARIS LINTANG<'],
  ['>Unlocked<', '>Terbuka<'],
  ['>Locked<', '>Terkunci<'],
  ['>LONGITUDE<', '>GARIS BUJUR<'],
  ['>Officer Notes<', '>Catatan Petugas<'],
  ['>Capture<', '>Ambil Foto<'],
  ['>Retake<', '>Ulangi Foto<'],
  ['>Existing Evidence<', '>Bukti Tersedia<'],
  ['>Take New Photo<', '>Ambil Foto Baru<'],
  ['>Take Photo<', '>Ambil Foto<'],
  ['>Required for validation<', '>Diperlukan untuk validasi<'],
  ['>Open Camera<', '>Buka Kamera<'],
  ['>Validation Rules<', '>Aturan Validasi<'],
  ['>Close<', '>Tutup<'],
  ['>Method<', '>Metode<'],
  ['>Date<', '>Tanggal<'],
  ['>Metric Status<', '>Status Metrik<'],
  ['>On Time<', '>Tepat Waktu<'],
  ['>Location Not Recorded<', '>Lokasi Tidak Tercatat<'],
  ['>Recorded Location<', '>Lokasi Tercatat<'],
  ['>GPS Coordinates<', '>Koordinat GPS<'],
  ['>Distance to School<', '>Jarak ke Sekolah<'],
  ['>meters away<', '>meter<'],
  ['>IN ZONE<', '>DALAM ZONA<'],
  ['>OUT OF ZONE<', '>LUAR ZONA<'],
  ['>Processed locally<', '>Diproses secara lokal<']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translated more content successfully!');
