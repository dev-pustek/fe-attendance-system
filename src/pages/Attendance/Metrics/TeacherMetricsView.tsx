import React from 'react';
import { TeacherMetricsData } from '../../../api/types/analytics';
import MetricCard from '../../../components/molecules/MetricCard';
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ComponentCard from '../../../components/molecules/ComponentCard';

interface TeacherMetricsViewProps {
  data: TeacherMetricsData;
}

const TeacherMetricsView: React.FC<TeacherMetricsViewProps> = ({ data }) => {
  const { overview, subjectBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Total Sesi Saya"
          value={overview.totalSessions.toLocaleString()}
          icon={<AcademicCapIcon />}
          color="brand"
        />
        <MetricCard
          title="Sesi Selesai"
          value={overview.completedSessions.toLocaleString()}
          icon={<CheckCircleIcon />}
          color="green"
        />
        <MetricCard
          title="Kehadiran Siswa"
          value={`${overview.studentAttendanceRate.toFixed(1)}%`}
          icon={<UserGroupIcon />}
          color="blue"
        />
        <MetricCard
          title="Sesi Batal"
          value={overview.cancelledSessions.toLocaleString()}
          icon={<XCircleIcon />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Subject Breakdown */}
        <ComponentCard title="Kehadiran Siswa per Mata Pelajaran">
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="subjectName" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="rate" fill="#3C50E0" radius={[4, 4, 0, 0]} name="Tingkat Hadir (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
};

export default TeacherMetricsView;
