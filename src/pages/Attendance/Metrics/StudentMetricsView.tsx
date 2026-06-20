import React from 'react';
import { StudentMetricsData } from '../../../api/types/analytics';
import MetricCard from '../../../components/molecules/MetricCard';
import { AcademicCapIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ComponentCard from '../../../components/molecules/ComponentCard';

interface StudentMetricsViewProps {
  data: StudentMetricsData;
}

const StudentMetricsView: React.FC<StudentMetricsViewProps> = ({ data }) => {
  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Total Hari Sekolah"
          value={overview.totalDays.toLocaleString()}
          icon={<AcademicCapIcon />}
          color="brand"
        />
        <MetricCard
          title="Hadir"
          value={overview.presentDays.toLocaleString()}
          icon={<CheckCircleIcon />}
          color="green"
        />
        <MetricCard
          title="Terlambat"
          value={overview.lateDays.toLocaleString()}
          icon={<ClockIcon />}
          color="orange"
        />
        <MetricCard
          title="Tidak Hadir"
          value={overview.absentDays.toLocaleString()}
          icon={<XCircleIcon />}
          color="red"
        />
        <MetricCard
          title="Kehadiran Mapel"
          value={`${overview.subjectAttendanceRate.toFixed(1)}%`}
          icon={<ChartBarIcon />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ComponentCard title="Kehadiran Siswa Personal">
          <div className="flex h-40 items-center justify-center text-gray-500">
            <p>Detail kehadiran siswa sedang disiapkan.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
};

export default StudentMetricsView;
