import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useAuditStats } from "../../api/hooks/useAudit";
import PageMeta from "../../components/atoms/PageMeta";
import ComponentCard from "../../components/molecules/ComponentCard";
import { PageIcon } from "../../components/atoms/Icons";

const COLORS = ["#3C50E0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const STATUS_COLORS: Record<string, string> = {
  "2xx": "#10B981",
  "4xx": "#F59E0B",
  "5xx": "#EF4444",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-lg dark:border-white/[0.05] dark:bg-gray-900">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          <span className="text-brand-500">{payload[0].value}</span> Requests
        </p>
      </div>
    );
  }
  return null;
};

const AuditMetrics: React.FC = () => {
  const { data: stats, isLoading, error } = useAuditStats();

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-gray-500">
        <PageIcon className="mb-4 size-12 opacity-20" />
        <p>No statistics available at the moment.</p>
      </div>
    );
  }

  // Pre-process status data for grouping (2xx, 4xx, 5xx)
  const statusGroups = stats.statusDistribution.reduce(
    (acc, curr) => {
      const code = curr.status;
      let group = "Other";
      if (code >= 200 && code < 300) group = "2xx";
      else if (code >= 400 && code < 500) group = "4xx";
      else if (code >= 500) group = "5xx";
      
      acc[group] = (acc[group] || 0) + curr.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));

  return (
    <>
      <PageMeta
        title="Audit Metrics | Dashboard"
        description="Visual analytics for system performance and auditing."
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Intelligence</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time telemetry and resource utilization metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Traffic Over Time */}
          <div className="lg:col-span-2">
            <ComponentCard title="System Traffic Over Time">
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trafficByDay}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3C50E0" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3C50E0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "#94A3B8" }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3C50E0"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ComponentCard>
          </div>

          {/* Status Breakdown */}
          <ComponentCard title="Request Status Breakdown">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ComponentCard>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Action Distribution */}
          <ComponentCard title="Action Type Distribution">
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.actionDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="action" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 600, fill: "#64748B" }}
                    width={80}
                  />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#3C50E0" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ComponentCard>

          {/* Top Resources */}
          <ComponentCard title="Top Frequently Used Resources">
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topResources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="resource" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    width={150}
                  />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ComponentCard>
        </div>

        {/* Security Alerts / Top IPs */}
        <ComponentCard title="Security Intelligence (Failed Auth by IP)">
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.securityAlerts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis 
                  dataKey="ip" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>
      </div>
    </>
  );
};

export default AuditMetrics;
