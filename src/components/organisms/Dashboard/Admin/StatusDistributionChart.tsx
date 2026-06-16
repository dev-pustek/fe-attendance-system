import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DashboardStats } from "../../../../api/types/dashboard";

interface Props {
  stats: DashboardStats;
}

export default function StatusDistributionChart({ stats }: Props) {
  const distribution = [
      { name: "Present", value: stats.present, color: "#10B981" },
      { name: "Late", value: stats.late, color: "#F59E0B" },
      { name: "Absent", value: stats.absent, color: "#EF4444" },
  ];

  const total = distribution.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-lg">
          <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
            {payload[0].name}: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-8 shadow-sm border border-white/40 dark:border-white/5 h-full flex flex-col group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>

      <div className="relative z-10 mb-2">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Today's Attendance</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Overall distribution</p>
      </div>
      
      <div className="relative flex-1 min-h-[250px] w-full mt-4 flex items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
            <span className="text-4xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{total.toLocaleString()}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total</span>
        </div>

        <ResponsiveContainer width="100%" height="100%" className="z-10">
          <PieChart>
            <Pie
              data={distribution}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={95}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
              cornerRadius={8}
            >
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 4px 6px ${entry.color}40)` }} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="relative z-10 flex justify-center gap-6 mt-4">
          {distribution.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{item.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white">{item.value}</span>
              </div>
          ))}
      </div>
    </div>
  );
}
