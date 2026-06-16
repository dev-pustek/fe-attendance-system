import React from "react";
import PageMeta from "../../components/atoms/PageMeta";

const AttendanceMetrics: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <PageMeta title="Metrik Kehadiran | SIAPUS" description="Attendance metrics and analytics" />
      <div className="w-24 h-24 bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-100 dark:border-brand-500/20">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Fitur Segera Hadir</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
        Halaman Metrik Kehadiran ini masih dalam tahap pengembangan. Fitur ini akan digunakan untuk benchmarking kehadiran pengguna.
      </p>
      <div className="mt-8 px-6 py-2 bg-gray-100 dark:bg-slate-800 rounded-full inline-block">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Tahap Pengembangan</span>
      </div>
    </div>
  );
};

export default AttendanceMetrics;
