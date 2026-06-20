import React from 'react';
import { CurriculumMetricsData } from '../../../api/types/analytics';
import MetricCard from '../../../components/molecules/MetricCard';
import { BookOpenIcon, CheckBadgeIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ComponentCard from '../../../components/molecules/ComponentCard';

interface CurriculumMetricsViewProps {
  data: CurriculumMetricsData;
}

const CurriculumMetricsView: React.FC<CurriculumMetricsViewProps> = ({ data }) => {
  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sesi Terjadwal"
          value={overview.totalSessions.toLocaleString()}
          icon={<BookOpenIcon />}
          color="brand"
        />
        <MetricCard
          title="Tingkat Pelaksanaan"
          value={`${overview.executionRate.toFixed(1)}%`}
          icon={<CheckBadgeIcon />}
          color="green"
        />
        <MetricCard
          title="Guru Pengganti"
          value={overview.substitutionCount.toLocaleString()}
          icon={<ArrowPathIcon />}
          color="orange"
        />
        <MetricCard
          title="Sesi Dibatalkan"
          value={overview.cancelledSessions.toLocaleString()}
          icon={<XCircleIcon />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ComponentCard title="Status Pelaksanaan Kurikulum">
          <div className="flex h-40 items-center justify-center text-gray-500">
            <p>Detail metrik kurikulum sedang disiapkan.</p>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
};

export default CurriculumMetricsView;
