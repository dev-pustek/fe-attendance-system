import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../../api/services/attendanceService";
import {
  GridIcon,
  UserIcon,
  TimeIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  SearchIcon,
  FilterIcon,
} from "../../components/atoms/Icons";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
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
import { useClasses } from "../../api/hooks/useAcademic";
import { useMajors } from "../../api/hooks/useAcademic";
import { useDebounce } from "../../hooks/useDebounce";

const PiketMonitor: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showQrModal, setShowQrModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkedOutFilter, setCheckedOutFilter] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 500);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch filter options
  const { data: classesResponse } = useClasses({ limit: 100 });
  const { data: majorsResponse } = useMajors({ limit: 100 });

  const classes = classesResponse?.data || [];
  const majors = majorsResponse?.data || [];

  const {
    data: response,
    isLoading,
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
        isLate:
          statusFilter === "late"
            ? true
            : statusFilter === "on-time"
            ? false
            : undefined,
        // Note: checkedOut filter may need backend support
      }),
    refetchInterval: 10000,
  });

  const records = useMemo(() => response?.data || [], [response?.data]);
  const total = Number(response?.meta?.total ?? 0);
  const totalPages = Number(
    response?.meta?.totalPages ?? Math.ceil(total / limit)
  );

  // -- Real-time Stats from API metrics --
  const stats = useMemo(() => {
    if (response?.metrics) {
      return {
        total: response.metrics.totalPresent || 0,
        present: response.metrics.onTime || 0,
        late: response.metrics.late || 0,
      };
    }
    // Fallback to calculating from records
    const statsTotal = records.length;
    const present = records.filter((r) => !r.isLate).length;
    const late = records.filter((r) => r.isLate).length;
    return { total: statsTotal, present, late };
  }, [response?.metrics, records]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans overflow-x-hidden">
      <PageMeta
        title="Piket Monitor | Attendance"
        description="Real-time attendance monitor."
      />
      <PageBreadcrumb pageTitle="Piket Monitor" />

      <main className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <GridIcon className="size-24 text-brand-500" />
            </div>
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Total Arrivals
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {total}
              </span>
              <span className="text-sm text-gray-500">students</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <GridIcon className="size-24 text-success-500" />
            </div>
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              On Time
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-success-600 dark:text-white">
                {stats.present}
              </span>
              <span className="text-sm text-success-600 bg-success-50 px-2 py-0.5 rounded-full font-bold">
                {stats.total > 0
                  ? Math.round((stats.present / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <TimeIcon className="size-24 text-warning-500" />
            </div>
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Late Arrivals
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-warning-600 dark:text-white">
                {stats.late}
              </span>
              <span className="text-sm text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full font-bold">
                {stats.total > 0
                  ? Math.round((stats.late / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon className="size-4" />
            </div>
            <input
              type="text"
              placeholder="Search by student name or NIS..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              showFilters
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
          >
            <FilterIcon className="size-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Collapsible Filter Row */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
            <CustomSelect
              label="Class"
              value={classFilter}
              onChange={(val: string | number) => {
                setClassFilter(String(val));
                setPage(1);
              }}
              options={[
                { label: "All Classes", value: "" },
                ...classes.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                })),
              ]}
            />

            <CustomSelect
              label="Major"
              value={majorFilter}
              onChange={(val: string | number) => {
                setMajorFilter(String(val));
                setPage(1);
              }}
              options={[
                { label: "All Majors", value: "" },
                ...majors.map((m) => ({
                  label: m.name,
                  value: String(m.id),
                })),
              ]}
            />

            <CustomSelect
              label="Grade"
              value={gradeFilter}
              onChange={(val: string | number) => {
                setGradeFilter(String(val));
                setPage(1);
              }}
              options={[
                { label: "All Grades", value: "" },
                { label: "Grade 10", value: "10" },
                { label: "Grade 11", value: "11" },
                { label: "Grade 12", value: "12" },
              ]}
            />

            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={(val: string | number) => {
                setStatusFilter(String(val));
                setPage(1);
              }}
              options={[
                { label: "All Status", value: "all" },
                { label: "On Time", value: "on-time" },
                { label: "Late", value: "late" },
              ]}
            />

            <CustomSelect
              label="Check-Out"
              value={checkedOutFilter}
              onChange={(val: string | number) => {
                setCheckedOutFilter(String(val));
                setPage(1);
              }}
              options={[
                { label: "All", value: "" },
                { label: "Still in School", value: "false" },
                { label: "Checked Out", value: "true" },
              ]}
            />
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <div className="text-lg font-mono font-bold text-gray-900 dark:text-white tracking-widest">
                    {format(currentTime, "HH:mm:ss")}
                  </div>
                  <div className="text-[9px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                    {format(currentTime, "EEEE, dd MMM yyyy")}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="hidden sm:inline">Live (10s)</span>
              </div>
              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-all"
              >
                <GridIcon className="size-3.5" />
                <span className="hidden sm:inline">QR</span>
              </button>
              <button
                onClick={() => refetch()}
                className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-all"
                title="Refresh Now"
              >
                <TimeIcon
                  className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {isLoading && records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Loading stream...
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="size-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-gray-400">
                <UserIcon className="size-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Waiting for Students
              </h3>
              <p className="text-gray-500">
                No attendance records have been captured today yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-4"
                  >
                    <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check-In</span>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-4"
                  >
                    <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</span>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-4"
                  >
                    <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</span>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-4"
                  >
                    <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</span>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-4"
                  >
                    <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check-Out</span>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-4 text-theme-xs font-medium text-gray-500 uppercase text-right"
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {records.map((record) => (
                  <TableRow
                    key={record.userId}
                    className={`transition-colors ${
                      record.isLate
                        ? "bg-yellow-50 hover:bg-yellow-100/50 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20"
                        : "hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"
                    }`}
                  >
                    <TableCell className="px-5 py-4">
                      <div>
                        <div className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                          {record.clockIn
                            ? format(parseISO(record.clockIn), "HH:mm")
                            : "--:--"}
                        </div>
                        {record.attendancePolicy && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            Policy:{" "}
                            {record.attendancePolicy.startTime?.slice(0, 5)} -{" "}
                            {record.attendancePolicy.endTime?.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                          <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">
                            {record.studentName?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {record.studentName || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {record.studentProfile?.nis || record.studentProfile?.studentIdentificationNumber || record.userId?.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      {record.class?.name || "No Class"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-gray-700 dark:text-gray-300 capitalize text-sm flex items-center gap-1.5">
                        {record.method === "QR_CODE" && (
                          <GridIcon className="size-3.5" />
                        )}
                        {record.method?.replace("_", " ").toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {record.clockOut ? (
                        <div>
                          <div className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                            {format(parseISO(record.clockOut), "HH:mm")}
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold uppercase tracking-wide mt-1">
                            Checked Out
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase tracking-wide">
                          In School
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      {record.isLate ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold uppercase tracking-wide">
                          Late (+{record.lateMinutes}m)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase tracking-wide">
                          On Time
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * limit + 1}</span> to <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" /> Previous
              </button>
              <span className="text-sm font-semibold dark:text-gray-300">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                Next <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* QR Modal using standard component */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Checkpoint QR"
        className="max-w-sm"
      >
        <div className="flex flex-col items-center">
          <div className="p-4 bg-white rounded-2xl shadow-inner mb-6">
            <QRCode value="SCHOOL_ENTRY" size={200} className="w-full h-auto" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Main Gate Checkpoint
          </h3>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Ask students to open their app and scan this QR code for
            self-check-in.
          </p>

          <div className="w-full bg-gray-50 dark:bg-white/[0.02] py-3 px-4 rounded-xl text-center border border-gray-100 dark:border-white/5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
              Checkpoint ID: SCHOOL_ENTRY
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PiketMonitor;
