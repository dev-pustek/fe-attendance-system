import React from 'react';
import { PersonalMetricsData } from '../../../api/types/analytics';
import MetricCard from '../../../components/molecules/MetricCard';
import { CalendarIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ComponentCard from '../../../components/molecules/ComponentCard';

interface StaffMetricsViewProps {
  data: PersonalMetricsData;
}

const StaffMetricsView: React.FC<StaffMetricsViewProps> = ({ data }) => {
  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Total Hari Kerja"
          value={overview.totalDays.toLocaleString()}
          icon={<CalendarIcon />}
          color="brand"
        />
        <MetricCard
          title="Hadir Tepat Waktu"
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
          title="Izin / Cuti"
          value={overview.excusedDays.toLocaleString()}
          icon={<EnvelopeIcon />}
          color="blue"
        />
        <MetricCard
          title="Tingkat Kehadiran"
          value={`${overview.attendanceRate.toFixed(1)}%`}
          icon={<ChartBarIcon />}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ComponentCard title="Riwayat Kehadiran Personal">
          <div className="flex h-40 items-center justify-center text-gray-500">
            <p>Detail riwayat kehadiran personal sedang disiapkan.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
};

export default StaffMetricsView;
