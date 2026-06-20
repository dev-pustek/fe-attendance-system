const fs = require('fs');

function replaceInFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(path, content, 'utf8');
}

// DataActionsMenu.tsx
replaceInFile('src/components/molecules/DataActionsMenu.tsx', [
    ['>Import / Export<', '>Impor / Ekspor<'],
    ['>Import<', '>Impor<'],
    ['Upload Excel File', 'Unggah File Excel'],
    ['Download Template', 'Unduh Template'],
    ['>Export<', '>Ekspor<'],
    ['Export Selected', 'Ekspor Terpilih'],
    ['Export to Excel', 'Ekspor ke Excel'],
    ['Export to PDF', 'Ekspor ke PDF']
]);

// AttendanceList.tsx
replaceInFile('src/pages/Attendance/AttendanceList.tsx', [
    ['>Monitor daily attendance logs.<', '>Pantau log kehadiran harian.<'],
    ['/> Add Record', '/> Tambah Data'],
    ['Search & Filter Attendance', 'Cari & Filter Kehadiran'],
    ['Use the criteria below to filter attendance logs based on academic year, class, and date.', 'Gunakan kriteria di bawah untuk memfilter log kehadiran berdasarkan tahun ajaran, kelas, dan tanggal.'],
    ['Academic & Class', 'Tahun Ajaran & Kelas'],
    ['Attendance Events', 'Kegiatan & Acara'],
    ['Global Search', 'Pencarian Global'],
    ['>Reset<', '>Reset Ulang<'],
    ['>Search<', '>Cari<'],
    ['Student Name / ID', 'Nama Siswa / NIS']
]);

console.log('Translated final strings successfully!');
