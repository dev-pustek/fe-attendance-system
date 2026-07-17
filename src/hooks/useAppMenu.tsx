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
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  ComputerDesktopIcon, 
  ClipboardDocumentCheckIcon, 
  AcademicCapIcon 
} from "@heroicons/react/24/solid";
import { UserGroupIcon } from "@heroicons/react/24/outline";

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

  // ─── Base role flags ───
  const isAdmin = hasAnyRole(["admin"]);
  const isSuperAdmin = hasAnyRole(["superadmin", "super admin", "super_admin"]);
  const isKurikulum = hasAnyRole(["kurikulum"]);
  const isKaryawan = hasAnyRole(["karyawan", "staff"]);
  const isGuru = hasAnyRole(["guru", "teacher"]);
  const isPiket = hasAnyRole(["piket", "security"]);
  // const isStudent = hasAnyRole(["student"]) && !isSuperAdmin;
  const isStudent = false; // Hidden as per request
  // const isParent = hasAnyRole(["parent"]) && !isSuperAdmin;
  const isParent = false; // Hidden as per request

  // ─── Derived access flags (ORDER MATTERS — define dependencies first) ───
  // HR features: manage leaves, gate passes, reimbursements, employees
  const isHR = isAdmin || isSuperAdmin || hasAnyRole(["hr"]);

  // Academic admin: curriculum editing, workload, structure, teaching assignments
  const isAcademicAdmin = isAdmin || isSuperAdmin || isKurikulum;

  // Academic viewer: teachers can view schedules, students in their class
  const isAcademic = isAcademicAdmin || isGuru;
  const showAcademicFeatures = isAcademicAdmin || isGuru;

  // Event management: only admin-level roles can manage events
  const canManageEvents = isAdmin || isSuperAdmin || isKurikulum;

  // Gate access: piket, admin, superadmin
  const hasGateAccess = isAdmin || isSuperAdmin || isPiket;

  const navGroups = useMemo<NavGroup[]>(() => {
    // ═══════════════════════════════════════════
    // ─── MENU UTAMA (everyone) ───
    // ═══════════════════════════════════════════
    const mainMenu: NavItem[] = [
      { icon: <GridIcon />, name: "Dasbor", path: "/" },
      { icon: <UserIcon />, name: "Profil", path: "/profile" },
      { icon: <MailIcon />, name: "Notifikasi", path: "/notifications" }
    ];

    // Teacher: daily teaching schedule
    if (isGuru) {
      mainMenu.push({
        icon: <CalenderIcon />,
        name: "Jadwal Saya",
        path: "/attendance/my-schedule",
      });
    }

    // Employee (non-teacher): work schedule
    if (isKaryawan && !isGuru && !isAdmin && !isSuperAdmin) {
      mainMenu.push({
        icon: <CalenderIcon />,
        name: "Jadwal Kerja",
        path: "/schedules",
      });
    }

    // ═══════════════════════════════════════════
    // ─── KEHADIRAN & TAMU ───
    // ═══════════════════════════════════════════
    const attendanceItems: NavItem[] = [];

    // Everyone gets "Absen Kehadiran" to perform self-scans
    attendanceItems.push({
      icon: <VideoIcon />,
      name: "Absen Kehadiran",
      path: "/attendance/gate-scan",
    });

    // Gate staff: piket monitor, attendance records, history, metrics
    if (hasGateAccess) {
      attendanceItems.push({
        icon: <TimeIcon />,
        name: "Kehadiran Gerbang",
        subItems: [
          { name: "Monitor Piket", path: "/attendance/piket", icon: <ComputerDesktopIcon className="size-5" /> },
          { name: "Rekam Kehadiran", path: "/attendance/records" },
          { name: "Riwayat", path: "/attendance/history", icon: <ClockIcon className="size-5" /> },
          { name: "Metrik", path: "/attendance/metrics", icon: <ChartBarIcon className="size-5" /> },
          { name: "Laporan", path: "/attendance/reports", icon: <DocumentTextIcon className="size-5" /> },
        ],
      });
    }

    // Teacher, Admin, Super Admin, and Piket: class attendance (teaching sessions, subject attendances)
    if (isGuru || hasGateAccess) {
      attendanceItems.push({
        icon: <TaskIcon />,
        name: "Kehadiran Kelas",
        subItems: [
          { name: "Perintah Kelas", path: "/attendance/classroom-command", icon: <ComputerDesktopIcon className="size-5" /> },
          { name: "Sesi Mengajar", path: "/attendance/teaching-sessions", icon: <AcademicCapIcon className="size-5" /> },
          { name: "Kehadiran Mata Pelajaran", path: "/attendance/subject-attendances" },
        ],
      });
    }

    // Gate staff: guest management
    if (hasGateAccess) {
      attendanceItems.push({
        icon: <UserIcon />,
        name: "Tamu",
        subItems: [
          { name: "Daftar Tamu", path: "/guests" },
          { name: "Log Pengunjung", path: "/guests/visits" },
        ],
      });
    }

    // ═══════════════════════════════════════════
    // ─── AKADEMIK & JADWAL ───
    // ═══════════════════════════════════════════
    const academicItems: NavItem[] = [];

    // Student / Parent: their own class schedules
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

    // Student: events & ID card
    if (isStudent) {
      academicItems.push({ icon: <ShootingStarIcon />, name: "Acara", path: "/student/events" });
      academicItems.push({ icon: <UserIcon />, name: "Kartu ID Saya", path: "/student/id-card" });
    }

    // Academic features: scheduling
    if (showAcademicFeatures) {
      const scheduleSubItems: SubItem[] = [];

      // Only academic admins can manage teaching assignments & overrides
      if (isAcademicAdmin) {
        scheduleSubItems.push({ name: "Tugas Mengajar", path: "/academic/teaching-assignments" });
      }

      // Class schedule ("Jadwal Kelas") — super admin only per request
      if (isSuperAdmin) {
        scheduleSubItems.push({ name: "Jadwal Kelas", path: "/academic/schedules" });
      }

      // Work schedules (shift calendar) — visible to teachers and academic admins
      scheduleSubItems.push({ name: "Jadwal Kerja", path: "/schedules" });

      // Only academic admins can manage schedule overrides
      if (isAcademicAdmin) {
        scheduleSubItems.push({ name: "Timpa Jadwal", path: "/academic/schedule-overrides" });
      }

      academicItems.push({
        icon: <CalenderIcon />,
        name: "Penjadwalan",
        subItems: scheduleSubItems,
      });
    }

    // Academic admin only: curriculum management
    if (isAcademicAdmin) {
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

    // Event management: admin, super_admin, kurikulum only
    if (canManageEvents) {
      academicItems.push({ icon: <ShootingStarIcon />, name: "Acara", path: "/events" });
    }

    // ═══════════════════════════════════════════
    // ─── SDM & IZIN ───
    // ═══════════════════════════════════════════
    const hrItems: NavItem[] = [];

    // Leave requests: staff, teachers, students can submit their own
    if (isStudent) {
      hrItems.push({ icon: <DocsIcon />, name: "Cuti Siswa", path: "/student/leaves" });
    }

    // Cuti, Izin Keluar, Klaim Biaya — super admin only per request
    if (isSuperAdmin) {
      hrItems.push({
        icon: <DocsIcon />,
        name: "Cuti",
        subItems: [
          { name: "Pengajuan Cuti", path: "/leaves/requests" },
        ],
      });
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
    }
    if (isHR || isKurikulum) {
      hrItems.push({
        icon: <UserGroupIcon className="size-5" />,
        name: "Pegawai",
        path: "/hr/employees",
      });
    }

    // ═══════════════════════════════════════════
    // ─── ADMINISTRASI ───
    // ═══════════════════════════════════════════
    const adminItems: NavItem[] = [];

    // Student management: only super admin
    if (isSuperAdmin) {
      adminItems.push({
        icon: <UserIcon />,
        name: "Manajemen Siswa",
        subItems: [
          { name: "Siswa", path: "/academic/students" },
          { name: "Orang Tua", path: "/academic/parents" },
        ],
      });
    }

    // Academic structure: admin/kurikulum only
    if (isAcademicAdmin) {
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

    // Leave types: super admin only per request
    if (isSuperAdmin) {
      adminItems.push({ icon: <TableIcon />, name: "Tipe Cuti", path: "/leaves/types" });
    }

    const policySubItems: SubItem[] = [];
    if (isAdmin || isSuperAdmin || isKurikulum) {
      policySubItems.push({ name: "Kebijakan Kehadiran", path: "/attendance/policies", icon: <ClipboardDocumentCheckIcon className="size-5" /> });
      policySubItems.push({ name: "Kebijakan Unit Mengajar", path: "/academic/teaching-unit-policies" });
    }
    
    if (policySubItems.length > 0) {
      adminItems.push({
        icon: <DocsIcon />,
        name: "Aturan & Kebijakan",
        subItems: policySubItems,
      });
    }

    // Super admin only: system management
    if (isSuperAdmin) {
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
          { name: "Direktori Pengguna", path: "/users/list" },
          { name: "Peran Akses", path: "/roles" },
          { name: "Tipe Pengguna", path: "/users/user-types" },
          { name: "Kredensial", path: "/identity/credentials" },
        ],
      });
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
          { name: "Log Identitas", path: "/identity/logs" },
          { name: "Cadangan", path: "/settings/backups" },
        ],
      });
    }

    // ═══════════════════════════════════════════
    // Compile final array — only add groups that have items
    // ═══════════════════════════════════════════
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
  }, [isAdmin, isSuperAdmin, isHR, isAcademic, showAcademicFeatures, isAcademicAdmin, canManageEvents, isGuru, isPiket, isStudent, isParent, isKaryawan, isKurikulum, hasGateAccess]);

  return { navGroups, isStudent, isHR, isAcademic, isAdmin, isSuperAdmin, isGuru };
};
