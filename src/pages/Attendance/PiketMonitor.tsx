import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../../api/services/attendanceService";
import {
  GridIcon,
  UserIcon,
  TimeIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  SearchIcon,
  CheckCircleIcon,
  AlertIcon,
  GroupIcon,
  CalenderIcon,
  InfoIcon,
  AngleLeftIcon,
  ArrowUpIcon,
} from "../../components/atoms/Icons";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import Avatar from "../../components/atoms/Avatar";
import Badge from "../../components/atoms/Badge";
import Button from "../../components/atoms/Button";
import { format, parseISO } from "date-fns";
import QRCode from "react-qr-code";
import Modal from "../../components/molecules/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/atoms/Table";
import CustomSelect from "../../components/molecules/CustomSelect";
import { useClasses, useMajors } from "../../api/hooks/useAcademic";
import { useAttendanceRules } from "../../api/hooks/useRules";
import { useDebounce } from "../../hooks/useDebounce";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AttendancePolicy {
  startTime: string;
  endTime: string;
  lateTolerance: number;
  source: string;
}

interface PiketRecord {
  id: number;
  userId: string;
  studentName: string;
  studentEmail?: string;
  studentPhoto?: string | null;
  studentProfile?: { nis?: string; nisn?: string; gender?: string } | null;
  class?: { id: number; name: string; grade: string } | null;
  major?: { id: number; name: string; code: string } | null;
  attendancePolicy?: AttendancePolicy | null;
  clockIn?: string | null;
  clockOut?: string | null;
  isLate: boolean;
  lateMinutes: number;
  method?: string;
  statusLabel?: string;
  date: string;
}

// ─── Helper components ──────────────────────────────────────────────────────

const InitialsAvatar: React.FC<{ name: string; size?: "sm" | "md" | "lg" }> = ({
  name,
  size = "md",
}) => {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  // Simple deterministic color based on first char
  const colors = [
    "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  ];
  const colorClass = colors[(name.charCodeAt(0) || 0) % colors.length];

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 border border-white dark:border-gray-700 shadow-sm ${sizeMap[size]} ${colorClass}`}
    >
      {initials}
    </div>
  );
};

const MethodBadge: React.FC<{ method?: string }> = ({ method }) => {
  if (!method) return <Badge color="light" size="sm">Manual</Badge>;
  if (method === "QR_CODE")
    return (
      <Badge color="success" size="sm" startIcon={<GridIcon className="size-3" />}>
        QR Code
      </Badge>
    );
  if (method === "FACE_RECOGNITION")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20">
        <UserIcon className="size-3" />
        Face ID
      </span>
    );
  return (
    <Badge color="light" size="sm">
      {method.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
};

interface StatCardConfig {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;       // e.g. "bg-brand-50 dark:bg-brand-500/15"
  iconColor: string;    // e.g. "text-brand-500"
  borderColor: string;  // e.g. "border-brand-200 dark:border-brand-500/30"
  badge?: React.ReactNode;
}

const StatCard: React.FC<StatCardConfig> = ({
  label, value, sub, icon, iconBg, iconColor, borderColor, badge
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-all group ${borderColor}`}>
    {/* Top row: label + icon */}
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
        {label}
      </span>
      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
    {/* Value */}
    <div className="flex items-baseline gap-1.5">
      <span className="text-4xl font-extrabold text-gray-900 dark:text-white leading-none tabular-nums">
        {value}
      </span>
      {sub && (
        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{sub}</span>
      )}
    </div>
    {/* Footer badge */}
    {badge && <div className="pt-0.5 border-t border-gray-100 dark:border-white/5">{badge}</div>}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const PiketMonitor: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showQrModal, setShowQrModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkedOutFilter, setCheckedOutFilter] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 400);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch filter options
  const { data: classesResponse } = useClasses({ limit: 200 });
  const { data: majorsResponse } = useMajors({ limit: 100 });
  const allClasses = classesResponse?.data || [];
  const majors = majorsResponse?.data || [];

  // ── Cascading filter logic ───────────────────────────────────────────────
  // Classes filtered by selected major
  const filteredClasses = useMemo(() => {
    if (!majorFilter) return allClasses;
    return allClasses.filter((c) => String(c.majorId) === majorFilter);
  }, [allClasses, majorFilter]);

  // Grades derived from the (possibly major-filtered) classes
  const availableGrades = useMemo(() => {
    const source = majorFilter ? filteredClasses : allClasses;
    const gradeSet = new Map<string, string>();
    source.forEach((c) => {
      const gCode = (c as any).grade?.code ?? (c as any).gradeId;
      const gName = (c as any).grade?.name ?? `Grade ${gCode}`;
      if (gCode) gradeSet.set(String(gCode), String(gName));
    });
    return Array.from(gradeSet.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allClasses, filteredClasses, majorFilter]);

  // When major changes, reset class + grade
  const handleMajorChange = (val: string | number) => {
    setMajorFilter(String(val));
    setClassFilter("");
    setGradeFilter("");
    setPage(1);
  };

  // When grade changes, reset class
  const handleGradeChange = (val: string | number) => {
    setGradeFilter(String(val));
    setClassFilter("");
    setPage(1);
  };

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "piketMonitor",
      page,
      limit,
      debouncedSearch,
      classFilter,
      majorFilter,
      gradeFilter,
      statusFilter,
      checkedOutFilter,
    ],
    queryFn: () =>
      attendanceService.getPiketMonitorData({
        limit,
        page,
        search: debouncedSearch || undefined,
        classId: classFilter ? Number(classFilter) : undefined,
        majorId: majorFilter ? Number(majorFilter) : undefined,
        grade: gradeFilter || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        checkedOut: checkedOutFilter || undefined,
      }),
    refetchInterval: 10000,
  });

  const records = useMemo(() => (response?.data as PiketRecord[]) || [], [response?.data]);
  const total = Number(response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

  const stats = useMemo(() => {
    if (response?.metrics) {
      const m = response.metrics as any;
      return {
        total: m.totalPresent || 0,
        onTime: m.onTime || 0,
        late: m.late || 0,
        stillInSchool: m.stillInSchool || 0,
        checkedOut: m.checkedOut || 0,
        attendanceRate: m.attendanceRate || "0",
      };
    }
    const statsTotal = records.length;
    const onTime = records.filter((r) => !r.isLate).length;
    const late = records.filter((r) => r.isLate).length;
    const checkedOut = records.filter((r) => r.clockOut).length;
    return {
      total: statsTotal,
      onTime,
      late,
      stillInSchool: statsTotal - checkedOut,
      checkedOut,
      attendanceRate: statsTotal > 0 ? Math.round((onTime / statsTotal) * 100).toString() : "0",
    };
  }, [response?.metrics, records]);

  // Get a representative policy from records for the QR modal
  const representativePolicy = useMemo(
    () => records.find((r) => r.attendancePolicy)?.attendancePolicy || null,
    [records]
  );

  const { data: globalRulesResponse } = useAttendanceRules();
  const requireQrCode = useMemo(() => {
    return globalRulesResponse?.data?.some(
      (r) => r.ruleType === "REQUIRE_QR_CODE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true)
    ) ?? false;
  }, [globalRulesResponse?.data]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (val: string | number) => {
      setter(String(val));
      setPage(1);
    };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0F] font-sans overflow-x-hidden">
      <PageMeta
        title="Piket Monitor | Attendance"
        description="Real-time attendance monitor for gate piket officers."
      />
      <PageBreadcrumb pageTitle="Piket Monitor" />

      <main className="space-y-6 pb-10">
        {/* ── Stats Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label="Total Arrivals"
            value={total > 0 ? stats.total : records.length}
            sub="students"
            iconBg="bg-brand-50 dark:bg-brand-500/15"
            iconColor="text-brand-500"
            borderColor="border-brand-100 dark:border-brand-500/20"
            icon={<GroupIcon className="size-5" />}
            badge={
              <span className="text-xs text-gray-400 font-medium">Today's gate entries</span>
            }
          />
          <StatCard
            label="On Time"
            value={stats.onTime}
            iconBg="bg-emerald-50 dark:bg-emerald-500/15"
            iconColor="text-emerald-500"
            borderColor="border-emerald-100 dark:border-emerald-500/20"
            icon={<CheckCircleIcon className="size-5" />}
            badge={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpIcon className="size-3" />
                  {stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0}%
                </span>
                <span className="text-xs text-gray-400">of arrivals</span>
              </div>
            }
          />
          <StatCard
            label="Late Arrivals"
            value={stats.late}
            iconBg="bg-orange-50 dark:bg-orange-500/15"
            iconColor="text-orange-500"
            borderColor="border-orange-100 dark:border-orange-500/20"
            icon={<AlertIcon className="size-5" />}
            badge={
              stats.late > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-orange-500 dark:text-orange-400">
                    {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%
                  </span>
                  <span className="text-xs text-gray-400">of total</span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-emerald-500">All on time 🎉</span>
              )
            }
          />
          <StatCard
            label="Still In School"
            value={stats.stillInSchool}
            iconBg="bg-blue-50 dark:bg-blue-500/15"
            iconColor="text-blue-500"
            borderColor="border-blue-100 dark:border-blue-500/20"
            icon={<CalenderIcon className="size-5" />}
            badge={
              <span className="text-xs text-gray-400 font-medium">Not yet checked out</span>
            }
          />
          <StatCard
            label="Checked Out"
            value={stats.checkedOut}
            iconBg="bg-gray-100 dark:bg-white/10"
            iconColor="text-gray-500 dark:text-gray-400"
            borderColor="border-gray-200 dark:border-white/10"
            icon={<UserIcon className="size-5" />}
            badge={
              <span className="text-xs text-gray-400 font-medium">Departed today</span>
            }
          />
        </div>

        {/* ── Filter Row ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          {/* Top bar: label + search */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2 shrink-0">
              <div className="size-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                <SearchIcon className="size-3.5 text-brand-500" />
              </div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hidden sm:block">
                Filters
              </span>
            </div>
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <SearchIcon className="size-3.5" />
              </div>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by name or NIS…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-9 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:text-white transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center rounded-full bg-gray-300 dark:bg-white/20 text-gray-600 dark:text-white hover:bg-gray-400 transition-colors"
                >
                  <span className="text-[9px] font-black leading-none">✕</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom bar: dependent selects */}
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Major first — narrows classes & grades */}
            <CustomSelect
              label="Major"
              value={majorFilter}
              onChange={handleMajorChange}
              options={[
                { label: "All Majors", value: "" },
                ...majors.map((m) => ({ label: m.name, value: String(m.id) })),
              ]}
            />
            {/* 2. Grade — derived from major */}
            <CustomSelect
              label="Grade"
              value={gradeFilter}
              onChange={handleGradeChange}
              options={[
                { label: "All Grades", value: "" },
                ...availableGrades.map(([code, name]) => ({ label: name, value: code })),
              ]}
            />
            {/* 3. Class — filtered by major + grade */}
            <CustomSelect
              label="Class"
              value={classFilter}
              onChange={handleFilterChange(setClassFilter)}
              options={[
                { label: "All Classes", value: "" },
                ...filteredClasses
                  .filter((c) => !gradeFilter || String((c as any).grade?.code ?? (c as any).gradeId) === gradeFilter)
                  .map((c) => ({ label: c.name, value: String(c.id) })),
              ]}
            />
            {/* 4. Status */}
            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              options={[
                { label: "All Status", value: "all" },
                { label: "✅ On Time", value: "on-time" },
                { label: "⏰ Late", value: "late" },
              ]}
            />
            {/* 5. Check-Out */}
            <CustomSelect
              label="Check-Out"
              value={checkedOutFilter}
              onChange={handleFilterChange(setCheckedOutFilter)}
              options={[
                { label: "All", value: "" },
                { label: "🏫 In School", value: "false" },
                { label: "🚪 Checked Out", value: "true" },
              ]}
            />
          </div>
        </div>

        {/* ── Table Card ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          {/* Table toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-4 flex-wrap">
            {/* Clock + Date */}
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                <TimeIcon className="size-5 text-brand-500" />
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-gray-900 dark:text-white tracking-widest leading-none">
                  {format(currentTime, "HH:mm:ss")}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                  {format(currentTime, "EEEE, dd MMM yyyy")}
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live · 10s
              </div>

              {requireQrCode && (
                <Button
                  size="sm"
                  variant="primary"
                  startIcon={<GridIcon className="size-3.5" />}
                  onClick={() => setShowQrModal(true)}
                  className="text-xs font-bold"
                >
                  Entry QR
                </Button>
              )}

              <button
                onClick={() => refetch()}
                title="Refresh Now"
                className="size-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 text-gray-400 hover:text-brand-500 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all"
              >
                <TimeIcon
                  className={`size-4 transition-transform ${isFetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchQuery || classFilter || majorFilter || gradeFilter || statusFilter !== "all" || checkedOutFilter) && (
            <div className="px-6 py-2.5 bg-brand-50/50 dark:bg-brand-500/5 border-b border-brand-100/50 dark:border-brand-500/10 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Filters active:</span>
              {searchQuery && (
                <span className="text-xs bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                  "{searchQuery}"
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="text-xs bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full capitalize">
                  {statusFilter}
                </span>
              )}
              {gradeFilter && (
                <span className="text-xs bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                  Grade {gradeFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery(""); setClassFilter(""); setMajorFilter("");
                  setGradeFilter(""); setStatusFilter("all"); setCheckedOutFilter(""); setPage(1);
                }}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium ml-auto"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Table content */}
          {isLoading && records.length === 0 ? (
            <div className="p-12 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-16 h-4 bg-gray-200 dark:bg-white/10 rounded" />
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-white/10 rounded" />
                    <div className="h-3 w-24 bg-gray-100 dark:bg-white/5 rounded" />
                  </div>
                  <div className="w-24 h-4 bg-gray-200 dark:bg-white/10 rounded" />
                  <div className="w-16 h-6 bg-gray-200 dark:bg-white/10 rounded-full" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
              <div className="size-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-300 dark:text-white/10">
                <UserIcon className="size-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Waiting for Arrivals
                </h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs">
                  No attendance records yet for today. Students will appear here as they check in.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline"
              >
                Refresh now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      Check-In
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Student
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      Class / Major
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Method
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      Check-Out
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Status
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                  {records.map((record) => (
                    <TableRow
                      key={record.userId + record.date}
                      className={`group transition-colors relative ${
                        record.isLate
                          ? "bg-orange-50/40 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          : "hover:bg-gray-50/60 dark:hover:bg-white/[0.01]"
                      }`}
                    >
                      {/* CHECK-IN */}
                      <TableCell className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            {record.isLate && (
                              <div className="w-1 h-8 bg-orange-400 rounded-full shrink-0 -ml-3 mr-1" />
                            )}
                            <span className="text-sm font-bold font-mono text-gray-900 dark:text-white tracking-wide">
                              {record.clockIn
                                ? format(parseISO(record.clockIn), "HH:mm")
                                : "--:--"}
                            </span>
                          </div>
                          {record.attendancePolicy ? (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                              <CalenderIcon className="size-3 shrink-0" />
                              <span>
                                {record.attendancePolicy.startTime?.slice(0, 5)} –{" "}
                                {record.attendancePolicy.endTime?.slice(0, 5)}
                              </span>
                              {record.attendancePolicy.lateTolerance > 0 && (
                                <span className="text-gray-300 dark:text-gray-600">
                                  (+{record.attendancePolicy.lateTolerance}m)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">No policy</span>
                          )}
                        </div>
                      </TableCell>

                      {/* STUDENT */}
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {record.studentPhoto ? (
                            <Avatar
                              src={record.studentPhoto}
                              alt={record.studentName}
                              size="small"
                              status={record.clockOut ? undefined : "online"}
                            />
                          ) : (
                            <InitialsAvatar name={record.studentName || "?"} size="md" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                              {record.studentName || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                              {record.studentProfile?.nis || record.userId?.slice(0, 8) || "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* CLASS / MAJOR */}
                      <TableCell className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                            {record.class?.name || "—"}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {record.class?.grade && (
                              <Badge color="primary" size="sm" variant="light">
                                Gr. {record.class.grade}
                              </Badge>
                            )}
                            {record.major?.code && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded border border-gray-100 dark:border-white/10">
                                {record.major.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* METHOD */}
                      <TableCell className="px-5 py-3.5">
                        <MethodBadge method={record.method} />
                      </TableCell>

                      {/* CHECK-OUT */}
                      <TableCell className="px-5 py-3.5">
                        {record.clockOut ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                              {format(parseISO(record.clockOut), "HH:mm")}
                            </span>
                            <Badge color="info" size="sm" variant="light">
                              Departed
                            </Badge>
                          </div>
                        ) : (
                          <Badge color="success" size="sm" variant="light">
                            In School
                          </Badge>
                        )}
                      </TableCell>

                      {/* STATUS */}
                      <TableCell className="px-5 py-3.5 text-right">
                        {record.isLate ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge color="error" size="sm" variant="light">
                              LATE
                            </Badge>
                            {record.lateMinutes > 0 && (
                              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                +{record.lateMinutes}m
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge color="success" size="sm" startIcon={<CheckCircleIcon className="size-3" />}>
                            On Time
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {(page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>{" "}
                students
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <AngleLeftIcon className="size-4" />
                  Prev
                </button>
                <div className="flex items-center gap-1.5 px-3">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{page}</span>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <AngleRightIcon className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── QR Entry Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Gate Entry QR Code"
        className="max-w-3xl"
        description="Display this QR code at the school entrance for student self-check-in."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT — QR Code */}
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Bare QR on gradient background — no nested card */}
            <div className="w-full rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 flex flex-col items-center justify-center gap-4 p-8">
              {/* White QR area */}
              <div className="bg-white rounded-xl p-4">
                <QRCode value="SCHOOL_ENTRY" size={188} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-white font-black text-sm tracking-widest uppercase">
                  SCHOOL_ENTRY
                </span>
                <span className="text-brand-200 text-xs">Main Gate · Self Check-in</span>
              </div>
            </div>

            {/* Live clock below */}
            <div className="w-full flex items-center justify-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-3 border border-gray-100 dark:border-white/10">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-gray-900 dark:text-white tracking-widest">
                  {format(currentTime, "HH:mm:ss")}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {format(currentTime, "EEEE, dd MMM yyyy")}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Policy & Rules */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              Access Policy
            </p>

            {/* Check-in window */}
            {representativePolicy ? (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20">
                <TimeIcon className="size-5 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-brand-800 dark:text-brand-300">
                    Check-in Window
                  </p>
                  <p className="text-base text-brand-700 dark:text-brand-400 font-mono font-bold mt-1">
                    {representativePolicy.startTime?.slice(0, 5)}
                    <span className="mx-2 text-brand-300">→</span>
                    {representativePolicy.endTime?.slice(0, 5)}
                  </p>
                  {representativePolicy.lateTolerance > 0 && (
                    <p className="text-xs text-brand-500 dark:text-brand-400/70 mt-1.5">
                      Grace period: <strong>{representativePolicy.lateTolerance} min</strong> after open time
                    </p>
                  )}
                  {representativePolicy.source && (
                    <p className="text-[10px] text-brand-400/60 uppercase tracking-wider mt-1">
                      Source: {representativePolicy.source}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <InfoIcon className="size-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    No schedule policy detected
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Window will be resolved per-student when they scan.
                  </p>
                </div>
              </div>
            )}

            {/* Already attended */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20">
              <AlertIcon className="size-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
                  Already Attended
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  Students who checked in today <strong>will be rejected</strong> if they scan again.
                </p>
              </div>
            </div>

            {/* Outside window */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <TimeIcon className="size-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-300">
                  Outside Time Window
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Scans outside the allowed window are automatically <strong>rejected</strong>.
                </p>
              </div>
            </div>

            {/* Auto late detection */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircleIcon className="size-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Auto Late Detection
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Arrivals after the grace period are automatically marked <strong>LATE</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PiketMonitor;
