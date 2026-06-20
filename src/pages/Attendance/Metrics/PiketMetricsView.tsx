import React from 'react';
import { PiketMetricsData } from '../../../api/types/analytics';
import MetricCard from '../../../components/molecules/MetricCard';
import { QrCodeIcon, CheckCircleIcon, ClockIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import ComponentCard from '../../../components/molecules/ComponentCard';

interface PiketMetricsViewProps {
  data: PiketMetricsData;
}

const PiketMetricsView: React.FC<PiketMetricsViewProps> = ({ data }) => {
  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Scan Hari Ini"
          value={overview.totalScansToday.toLocaleString()}
          icon={<QrCodeIcon />}
          color="brand"
        />
        <MetricCard
          title="Hadir"
          value={overview.presentToday.toLocaleString()}
          icon={<CheckCircleIcon />}
          color="green"
        />
        <MetricCard
          title="Terlambat"
          value={overview.lateToday.toLocaleString()}
          icon={<ClockIcon />}
          color="orange"
        />
        <MetricCard
          title="Pulang Awal"
          value={overview.earlyLeaveToday.toLocaleString()}
          icon={<ArrowRightOnRectangleIcon />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ComponentCard title="Pantauan Gerbang Hari Ini">
          <div className="flex h-40 items-center justify-center text-gray-500">
            <p>Detail pantauan gerbang sedang disiapkan.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
};

export default PiketMetricsView;
