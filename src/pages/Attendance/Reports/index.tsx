import React, { useState } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import ExportFilterModal, { ExportPayload, ExportType } from "./ExportFilterModal";
import { attendanceService } from "../../../api/services/attendanceService";
import { analyticsService } from "../../../api/services/analyticsService";
import { DocumentTextIcon, AcademicCapIcon, ChartBarIcon, ArrowRightIcon } from "@heroicons/react/24/solid";

export default function AttendanceReports() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ExportType>("attendance");

  const openFilterModal = (type: ExportType) => {
    setSelectedReportType(type);
    setIsExportModalOpen(true);
  };

  const executeExportCSV = async (payload: ExportPayload) => {
    setIsExporting(true);
    try {
      if (payload.type === "attendance") {
        const blob = await attendanceService.exportAttendanceExcel(payload.params);
        if (!blob || blob.size === 0) {
          alert("Tidak ada data kehadiran untuk diekspor.");
          setIsExporting(false);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Laporan_Kehadiran_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

      } else if (payload.type === "teaching_session") {
        const blob = await attendanceService.exportTeachingSessionExcel(payload.params);
        if (!blob || blob.size === 0) {
          alert("Tidak ada data JP/Sesi Mengajar untuk diekspor.");
          setIsExporting(false);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Laporan_Sesi_Mengajar_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

      } else if (payload.type === "performance") {
        const blob = await analyticsService.exportBenchmarkExcel(payload.params);
        
        if (!blob || blob.size === 0) {
          alert("Tidak ada data Benchmarking untuk diekspor.");
          setIsExporting(false);
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Laporan_Kinerja_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      setIsExportModalOpen(false);
    } catch (error: any) {
      console.error("Export failed", error);
      let errMsg = error?.message || "Unknown error";
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.message || errMsg;
        } catch (e) {
          // ignore
        }
      } else if (error?.response?.data?.message) {
        errMsg = error.response.data.message;
      }
      alert(`Gagal mengekspor data: ${errMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const reportCategories = [
    {
      id: "attendance" as ExportType,
      title: "Laporan Kehadiran",
      description: "Ekspor riwayat kehadiran harian/bulanan dengan filter.",
      icon: <DocumentTextIcon className="size-6" />,
      color: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
      bgGradient: "from-brand-500 to-indigo-600",
      hoverBorder: "hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-brand-500/10"
    },
    {
      id: "teaching_session" as ExportType,
      title: "Sesi Mengajar (JP)",
      description: "Rekapitulasi JP aktual dan kalkulasi pencapaian KPI guru.",
      icon: <AcademicCapIcon className="size-6" />,
      color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
      bgGradient: "from-purple-500 to-fuchsia-600",
      hoverBorder: "hover:border-purple-300 dark:hover:border-purple-500/50 hover:shadow-purple-500/10"
    },
    {
      id: "performance" as ExportType,
      title: "Kinerja / Benchmark",
      description: "Metrik performa kedisiplinan guru & karyawan.",
      icon: <ChartBarIcon className="size-6" />,
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      bgGradient: "from-emerald-500 to-teal-600",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-emerald-500/10"
    }
  ];

  return (
    <>
      <PageMeta title="Laporan | Attendance System" description="Pusat unduhan laporan dan rekapitulasi data" />
      <div className="hidden sm:block">
        <PageBreadcrumb pageTitle="Pusat Laporan" />
      </div>

      <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-500 mt-2 sm:mt-0">
        <div className="flex flex-col gap-2 px-2 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Pusat Laporan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pilih jenis laporan yang ingin Anda unduh. Anda dapat menyesuaikan filter tanggal dan spesifikasi data lainnya setelah memilih kategori.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {reportCategories.map((report) => (
            <button
              key={report.id}
              onClick={() => openFilterModal(report.id)}
              className={`group relative flex items-center gap-4 p-5 rounded-2xl border bg-white dark:bg-white/[0.02] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${report.hoverBorder} dark:border-white/10 text-left overflow-hidden z-10`}
            >
              {/* Background gradient effect on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.08] transition-opacity duration-300 -z-10 bg-gradient-to-br ${report.bgGradient}`} />
              
              {/* Icon */}
              <div className={`shrink-0 p-3.5 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${report.color}`}>
                {report.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1 tracking-tight group-hover:text-gray-800 transition-colors">{report.title}</h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>
              </div>
              
              {/* Action Arrow */}
              <div className="shrink-0 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
                <div className={`size-8 rounded-full flex items-center justify-center ${report.color} shadow-sm border border-current/10`}>
                  <ArrowRightIcon className="size-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <ExportFilterModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onExport={executeExportCSV} 
        isExporting={isExporting} 
        initialTab={selectedReportType}
      />
    </>
  );
}
