import { AttendanceTrend } from "../../../../api/types/dashboard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  trends: AttendanceTrend[];
}

export default function AttendanceOverviewChart({ trends }: Props) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}></div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">Kehadiran:</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white ml-auto">{entry.value}</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-8 shadow-sm border border-white/40 dark:border-white/5 h-full group">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
      
      <div className="relative z-10 mb-6 flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Tren Kehadiran</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Jumlah kehadiran sistem harian</p>
        </div>
      </div>
      
      <div className="relative z-10 w-full mt-4 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#9CA3AF" strokeOpacity={0.2} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 500 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 500 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '4 4' }} />
            
            <Area 
                type="monotone" 
                dataKey="count" 
                name="Total Hadir" 
                stroke="#6366F1" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorCount)" 
                activeDot={{ r: 8, strokeWidth: 0, fill: '#6366F1', style: { filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.8))' } }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
