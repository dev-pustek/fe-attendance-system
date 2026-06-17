import React, { useCallback, useMemo } from "react";
import {
  GridIcon,
  PlugInIcon,
  TableIcon,
  BoltIcon,
  TimeIcon,
  CalenderIcon,
  DocsIcon,
  LockIcon,
  ShootingStarIcon,
  TaskIcon,
  UserIcon,
  PieChartIcon,
  MailIcon,
  VideoIcon,
  ListIcon,
} from "../components/atoms/Icons";
import { useAuthStore } from "../store/authStore";
import { ChartBarIcon } from "@heroicons/react/24/solid";

export type SubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  badge?: number;
  icon?: React.ReactNode;
};

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

export type NavGroup = {
  label: string;
  collapsedDot?: boolean;
  items: NavItem[];
};

export const useAppMenu = () => {
  const { user } = useAuthStore();

  const hasAnyRole = useCallback(
    (rolesToCheck: string[]) => {
      if (!user) return false;
      const roleNames = [
        ...(user.roles?.map((r) => r.name.toLowerCase()) || []),
        ...(user.userTypes?.map((t) => t.toLowerCase()) || []),
        ...(user.typeAssignments?.map((t) => t.userType?.name.toLowerCase() || "") || []),
      ].filter(Boolean);
      return rolesToCheck.some((role) =>
        roleNames.some(
          (userRole) =>
            userRole === role.toLowerCase() || userRole.includes(role.toLowerCase())
        )
      );
    },
    [user]
  );

  const isAdmin = hasAnyRole(["admin"]);
  const isSuperAdmin = hasAnyRole(["superadmin", "super admin", "admin"]);
  const isKurikulum = hasAnyRole(["kurikulum"]);
  const isKaryawan = hasAnyRole(["karyawan", "staff"]);
  const isGuru = hasAnyRole(["guru", "teacher"]);
  const isPiket = hasAnyRole(["piket"]);

  // Keeping student/parent just in case
  const isStudent = hasAnyRole(["student"]) && !isSuperAdmin;
  const isParent = hasAnyRole(["parent"]) && !isSuperAdmin;

  // Derive top-level categories
  const isHR = isAdmin || isSuperAdmin;
  const isAcademic = isAdmin || isSuperAdmin || isKurikulum;
  // A teacher or admin might see academic features
  const showAcademicFeatures = isAcademic || isGuru;

  const navGroups = useMemo<NavGroup[]>(() => {
    // ─── Main Menu ───
    const mainMenu: NavItem[] = [
      { icon: <GridIcon />, name: "Dasbor", path: "/" },
      { icon: <UserIcon />, name: "Profil", path: "/profile" },
      { icon: <MailIcon />, name: "Notifikasi", path: "/notifications" }
    ];

    if (isStudent) {
      mainMenu.push({
        icon: <CalenderIcon />,
        name: "Jadwal Saya",
        path: "/attendance/my-schedule",
      });
    }

    // ─── Attendance & Leave ───
    const attendanceItems: NavItem[] = [];

    if (isAdmin || isSuperAdmin || isPiket) {
      attendanceItems.push({
        icon: <VideoIcon />,
        name: "Absen Kehadiran",
        path: "/attendance/gate-scan",
      });
      attendanceItems.push({
        icon: <TimeIcon />,
        name: "Kehadiran Gerbang",
        subItems: [
          { name: "Monitor Piket", path: "/attendance/piket" },
          { name: "Rekam Kehadiran", path: "/attendance/records" },
          { name: "Riwayat", path: "/attendance/history" },
          { name: "Metrik", path: "/attendance/metrics", icon: <ChartBarIcon className="size-5" /> },
        ],
      });
    }

    if (isGuru) {
      attendanceItems.push({
        icon: <TaskIcon />,
        name: "Kehadiran Kelas",
        subItems: [
          { name: "Sesi Mengajar", path: "/attendance/teaching-sessions" },
          { name: "Kehadiran Mata Pelajaran", path: "/attendance/subject-attendances" },
        ],
      });
    }

    if (isAdmin || isSuperAdmin || isPiket) {
      attendanceItems.push({
        icon: <UserIcon />,
        name: "Tamu",
        subItems: [
          { name: "Daftar Tamu", path: "/guests" },
          { name: "Log Pengunjung", path: "/guests/visits" },
        ],
      });
    }

    // ─── Academic ───
    const academicItems: NavItem[] = [];

    if (isStudent || isParent) {
      academicItems.push({
        icon: <CalenderIcon />,
        name: "Jadwal Kelas Saya",
        subItems: [
          { name: "Jadwal Mata Pelajaran", path: "/student/schedule/subject" },
          { name: "Jadwal Mingguan", path: "/student/schedule/weekly" },
        ]
      });
    }

    if (showAcademicFeatures) {
      academicItems.push({
        icon: <CalenderIcon />,
        name: "Penjadwalan",
        subItems: [
          { name: "Tugas Mengajar", path: "/academic/teaching-assignments" },
          { name: "Jadwal Kelas", path: "/academic/schedules" },
          { name: "Jadwal Kerja", path: "/schedules" },
          { name: "Timpa Jadwal", path: "/academic/schedule-overrides" },
        ],
      });
    }

    if (isAcademic) {
      academicItems.push({
        icon: <DocsIcon />,
        name: "Kurikulum",
        subItems: [
          { name: "Eksplor Kurikulum", path: "/academic/curriculum" },
          { name: "Panduan Kurikulum", path: "/academic/curriculum-wizard", new: true },
          { name: "Templat Jadwal", path: "/academic/teaching-schedule-templates" },
          { name: "Kontrak Beban Kerja", path: "/academic/workload-contracts" },
        ],
      });
    }

    if (isAdmin || isSuperAdmin) {
      academicItems.push({ icon: <ShootingStarIcon />, name: "Acara", path: "/events" });
    }

    // ─── HR / Leaves / Gate Pass ───
    const hrItems: NavItem[] = [];

    // Leave Submissions Logic
    const leaveSubItems: SubItem[] = [];
    if (isStudent || isKaryawan || isGuru) {
        leaveSubItems.push({ name: "Pengajuan Cuti", path: "/leaves/requests" });
    }

    if (isHR) {
      hrItems.push({ icon: <DocsIcon />, name: "Manajemen Cuti", subItems: leaveSubItems });
      hrItems.push({
        icon: <DocsIcon />,
        name: "Izin Keluar",
        path: "/gate-passes",
      });
      hrItems.push({
        icon: <BoltIcon />,
        name: "Klaim Biaya",
        path: "/reimbursements",
      });
      hrItems.push({
        icon: <UserIcon />,
        name: "Pegawai",
        path: "/hr/employees",
      });
    }

    // ─── Admin / Settings ───
    const adminItems: NavItem[] = [];

    if (isAcademic) {
      adminItems.push({
        icon: <UserIcon />,
        name: "Manajemen Siswa",
        subItems: [
          { name: "Siswa", path: "/academic/students" },
          { name: "Orang Tua", path: "/academic/parents" },
        ],
      });

      adminItems.push({
        icon: <ListIcon />,
        name: "Struktur Akademik",
        subItems: [
          { name: "Program Studi", path: "/academic/program-studies" },
          { name: "Jurusan", path: "/academic/majors" },
          { name: "Tingkat / Grade", path: "/academic/grades" },
          { name: "Kelas", path: "/academic/classes" },
        ]
      });

      adminItems.push({ icon: <DocsIcon />, name: "Mata Pelajaran", path: "/academic/subjects" });
      adminItems.push({ icon: <CalenderIcon />, name: "Tahun Ajaran", path: "/academic/years" });
    }

    if (isHR) {
      adminItems.push({ icon: <TableIcon />, name: "Tipe Cuti", path: "/leaves/types" });
    }

    if (isAdmin || isSuperAdmin) {
      adminItems.push({
        icon: <DocsIcon />,
        name: "Aturan & Kebijakan",
        subItems: [
          { name: "Perintah Kelas", path: "/teacher/classroom" },
          { name: "Kebijakan Kehadiran", path: "/attendance/policies" },
          { name: "Kebijakan Unit Mengajar", path: "/academic/teaching-unit-policies" },
        ],
      });
      adminItems.push({
        icon: <PlugInIcon />,
        name: "Fasilitas",
        subItems: [
          { name: "Registrasi Perangkat", path: "/devices" },
          { name: "Saluran Perangkat", path: "/identity/channels" },
          { name: "Monitor CCTV", path: "/devices/live" },
          { name: "Cetak Kartu ID", path: "/users/print-ids" },
        ],
      });
      adminItems.push({
        icon: <LockIcon />,
        name: "Akses Pengguna",
        subItems: [
          /* { name: "Direktori Pengguna", path: "/users/list" }, */
          { name: "Peran Akses", path: "/roles" },
          { name: "Tipe Pengguna", path: "/users/user-types" },
          /* { name: "Kredensial", path: "/identity/credentials" }, */
        ],
      });
    }

    if (isSuperAdmin) {
      adminItems.push({
        icon: <BoltIcon />,
        name: "Pengaturan",
        subItems: [
          { name: "Pengaturan Umum", path: "/settings" },
          { name: "Penyimpanan", path: "/settings/storage" },
          { name: "Templat Notifikasi", path: "/admin/notification-templates" },
          { name: "Pengaturan Notifikasi", path: "/settings/notifications" },
          { name: "Resolusi Identitas", path: "/identity/resolutions" },
        ],
      });
      adminItems.push({
        icon: <PieChartIcon />,
        name: "Pemeliharaan & Log",
        subItems: [
          { name: "Metrik Sistem", path: "/audit/metrics" },
          { name: "Log Audit", path: "/audit/logs" },
          /* { name: "Log Identitas", path: "/identity/logs" }, */
          { name: "Cadangan", path: "/settings/backups" },
        ],
      });
    }

    // Compile final array
    const groups: NavGroup[] = [{ label: "MENU UTAMA", items: mainMenu }];

    if (attendanceItems.length > 0) {
      groups.push({ label: "KEHADIRAN & TAMU", items: attendanceItems });
    }
    if (academicItems.length > 0) {
      groups.push({ label: "AKADEMIK & JADWAL", items: academicItems });
    }
    if (hrItems.length > 0) {
      groups.push({ label: "SDM & IZIN", items: hrItems });
    }
    if (adminItems.length > 0) {
      groups.push({ label: "ADMINISTRASI", items: adminItems });
    }

    return groups;
  }, [isAdmin, isSuperAdmin, isHR, isAcademic, showAcademicFeatures, isGuru, isPiket, isStudent, isParent]);

  return { navGroups, isStudent, isHR, isAcademic, isAdmin, isSuperAdmin, isGuru };
};
