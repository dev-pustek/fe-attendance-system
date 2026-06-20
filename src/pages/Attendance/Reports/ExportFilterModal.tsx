import React, { useState } from "react";
import Modal from "../../../components/molecules/Modal";
import Label from "../../../components/atoms/Label";
import DatePicker from "../../../components/molecules/DatePicker";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { useAcademicYears, useClasses, useMajors } from "../../../api/hooks/useAcademic";
import { useUsers } from "../../../api/hooks/useUsers";
import { AttendanceParams } from "../../../api/types/attendance";
import { UserIcon, DocsIcon } from "../../../components/atoms/Icons";

export type ExportType = "attendance" | "teaching_session" | "performance";

export interface ExportPayload {
  type: ExportType;
  params: any;
}

interface ExportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (payload: ExportPayload) => void;
  isExporting: boolean;
}

export default function ExportFilterModal({ isOpen, onClose, onExport, isExporting }: ExportFilterModalProps) {
  // Tabs
  const [exportType, setExportType] = useState<ExportType>("attendance");

  // Fetch Dropdown Data
  const { data: acaYearsData } = useAcademicYears({ limit: 100 });
  const { data: classesData } = useClasses({ limit: 1000 });
  const { data: majorsData } = useMajors({ limit: 100 });
  const { data: teachersData } = useUsers({ limit: 1000, roles: "guru" }); // Or some equivalent fetch for teachers

  // Shared Filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Attendance Specific
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [acaYearFilter, setAcaYearFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [majorFilter, setMajorFilter] = useState<string>("all");
  const [isLateFilter, setIsLateFilter] = useState<string>("all");
  const [isEarlyLeaveFilter, setIsEarlyLeaveFilter] = useState<string>("all");

  // JP Specific
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [validationStatusFilter, setValidationStatusFilter] = useState<string>("all");

  const handleExport = () => {
    let params: any = {};
    const commonParams = {
      limit: 10000,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    if (exportType === "attendance") {
      params = {
        ...commonParams,
        academicYearId: acaYearFilter !== "all" ? acaYearFilter : undefined,
        classId: classFilter !== "all" ? classFilter : undefined,
        majorId: majorFilter !== "all" ? majorFilter : undefined,
        method: methodFilter !== "all" ? methodFilter : undefined,
        isLate: isLateFilter === "yes" ? true : isLateFilter === "no" ? false : undefined,
        isEarlyLeave: isEarlyLeaveFilter === "yes" ? true : isEarlyLeaveFilter === "no" ? false : undefined,
        ...(statusFilter !== "all" && statusFilter === "late" && { isLate: true }),
        ...(statusFilter !== "all" && statusFilter === "present" && { isPresent: true }),
      };
    } else if (exportType === "teaching_session") {
      params = {
        ...commonParams,
        teacherId: teacherFilter !== "all" ? teacherFilter : undefined,
        validationStatus: validationStatusFilter !== "all" ? validationStatusFilter : undefined,
      };
    } else if (exportType === "performance") {
      params = {
        ...commonParams,
        // performance might have different params, but mostly needs date range
      };
    }

    onExport({ type: exportType, params });
  };

  const tabs = [
    { id: "attendance", label: "Harian", icon: <UserIcon className="size-4" /> },
    { id: "teaching_session", label: "Jam Pelajaran", icon: <DocsIcon className="size-4" /> },
    { id: "performance", label: "Kinerja", icon: <DocsIcon className="size-4" /> }, // fallback to DocsIcon
  ];

  const renderFooter = () => (
    <div className="flex justify-end gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
      >
        Batal
      </button>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
      >
        {isExporting ? "Memproses..." : (exportType === "performance" ? "Download Excel" : "Download CSV")}
      </button>
    </div>
  );

  const renderSubHeader = () => (
    <div className="px-6 py-3 bg-gray-50/50 dark:bg-white/[0.01]">
      <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-xl dark:bg-gray-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setExportType(tab.id as ExportType)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              exportType === tab.id
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Pusat Komando Export Data" 
      description="Tentukan spesifikasi data laporan yang ingin Anda unduh (ekspor ke CSV)."
      className="max-w-2xl"
      subHeader={renderSubHeader()}
      footer={renderFooter()}
    >
      <div className="space-y-6">
        {/* Global Filters (Dates) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 dark:bg-white/[0.02] dark:border-white/[0.05]">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tanggal Mulai</Label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Pilih tanggal" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tanggal Akhir</Label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="Pilih tanggal" />
          </div>
        </div>

        {/* Dynamic Filters depending on Tab */}
        {exportType === "attendance" && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">Filter Spesifik Kehadiran</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tahun Ajaran</Label>
                <CustomSelect
                  value={acaYearFilter}
                  onChange={(val) => setAcaYearFilter(val ? String(val) : "all")}
                  onClear={() => setAcaYearFilter("all")}
                  placeholder="Semua Tahun Ajaran"
                  options={acaYearsData?.data?.map((y) => ({ label: y.name, value: String(y.id) })) || []}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jurusan</Label>
                <CustomSelect
                  value={majorFilter}
                  onChange={(val) => setMajorFilter(val ? String(val) : "all")}
                  onClear={() => setMajorFilter("all")}
                  placeholder="Semua Jurusan"
                  options={majorsData?.data?.map((m) => ({ label: m.name, value: String(m.id) })) || []}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Kelas</Label>
                <CustomSelect
                  value={classFilter}
                  onChange={(val) => setClassFilter(val ? String(val) : "all")}
                  onClear={() => setClassFilter("all")}
                  placeholder="Semua Kelas"
                  options={classesData?.data?.map((c) => ({ label: c.name, value: String(c.id) })) || []}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Metode Absen</Label>
                <CustomSelect
                  value={methodFilter === "all" ? "" : methodFilter}
                  onChange={(val) => setMethodFilter(val ? String(val) : "all")}
                  onClear={() => setMethodFilter("all")}
                  placeholder="Semua Metode"
                  options={[
                    { label: "Wajah / CCTV", value: "face" },
                    { label: "Kartu RFID", value: "rfid" },
                    { label: "Aplikasi Mobile", value: "mobile" },
                    { label: "Manual Piket", value: "manual" },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Filter Terlambat</Label>
                <CustomSelect
                  value={isLateFilter === "all" ? "" : isLateFilter}
                  onChange={(val) => setIsLateFilter(val ? String(val) : "all")}
                  onClear={() => setIsLateFilter("all")}
                  placeholder="Semua"
                  options={[
                    { label: "Hanya Terlambat", value: "yes" },
                    { label: "Tepat Waktu", value: "no" }
                  ]}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Kehadiran</Label>
                <CustomSelect
                  value={statusFilter === "all" ? "" : statusFilter}
                  onChange={(val) => setStatusFilter(val ? String(val) : "all")}
                  onClear={() => setStatusFilter("all")}
                  placeholder="Semua Status"
                  options={[
                    { label: "Hadir", value: "present" },
                    { label: "Terlambat", value: "late" },
                    { label: "Absen/Alpha", value: "absent" },
                    { label: "Dispensasi", value: "excused" },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {exportType === "teaching_session" && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">Filter Sesi Mengajar (JP)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Guru (Opsional)</Label>
                <CustomSelect
                  value={teacherFilter}
                  onChange={(val) => setTeacherFilter(val ? String(val) : "all")}
                  onClear={() => setTeacherFilter("all")}
                  placeholder="Semua Guru"
                  options={teachersData?.data?.map((t) => ({ label: t.name, value: String(t.id) })) || []}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Validasi</Label>
                <CustomSelect
                  value={validationStatusFilter === "all" ? "" : validationStatusFilter}
                  onChange={(val) => setValidationStatusFilter(val ? String(val) : "all")}
                  onClear={() => setValidationStatusFilter("all")}
                  placeholder="Semua"
                  options={[
                    { label: "Valid", value: "valid" },
                    { label: "Pending", value: "pending" },
                    { label: "Tidak Valid", value: "invalid" },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {exportType === "performance" && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">Filter Analitik Kinerja</h4>
            <p className="text-sm text-gray-500">
              Laporan kinerja hanya mengandalkan rentang tanggal untuk merangkum agregat KPI performa (Tingkat kehadiran, persentase keterlambatan, dll).
            </p>
          </div>
        )}

      </div>
    </Modal>
  );
}
