import { useEffect, useState } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import { useDashboardSummary } from "../../api/hooks/useDashboard";
import TopUsersChart from "../../components/organisms/Dashboard/Admin/TopUsersChart";
import RecentLogs from "../../components/organisms/Dashboard/RecentLogs";

export default function TeacherDashboard() {
  const { data, isLoading: loading } = useDashboardSummary();

  if (loading) return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
  );
  if (!data) return <div className="text-center text-red-500 p-8">Failed to load data</div>;

  return (
    <div className="min-h-screen bg-transparent animate-in fade-in duration-700 pb-10">
      <PageMeta title="Teacher Dashboard | SIAPUS" description="Class overview" />
      
      <div className="mb-8 relative z-10">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2 tracking-tight">
          School Classes Overview
        </h1>
        <p className="text-base font-medium text-gray-500 dark:text-gray-400">
          Monitor real-time class attendance across the school.
        </p>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="grid grid-cols-12 gap-8 items-stretch">
          <div className="col-span-12 xl:col-span-12 h-[350px]">
            <TopUsersChart users={data.topUsers || (data as any).classLeaderboard || []} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 items-stretch">
          <div className="col-span-12 xl:col-span-12">
            <RecentLogs logs={data.recentLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}
