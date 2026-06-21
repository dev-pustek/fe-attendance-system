import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TopUserItem } from "../../../../api/types/dashboard";

interface Props {
  users: TopUserItem[];
}

export default function TopUsersChart({ users = [] }: Props) {
  const dataWithSymbols = users.map((user, index) => ({
    ...user,
    symbol: `#${index + 1}`
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-lg">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">{data.name}</p>
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></span>
            <span className="text-gray-600 dark:text-gray-400">Total Hadir:</span>
            <span className="font-bold text-gray-900 dark:text-white">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-8 shadow-sm border border-white/40 dark:border-white/5 h-full flex flex-col group">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-500"></div>

      <div className="relative z-10 mb-6">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Peringkat Kehadiran Teratas</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Pengguna dengan tingkat kehadiran tertinggi</p>
      </div>
      
      <div className="relative z-10 flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataWithSymbols} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#9CA3AF" strokeOpacity={0.2} />
            <XAxis type="number" hide />
            <YAxis 
                dataKey="symbol" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 13, fontWeight: 600 }} 
                width={60} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#9CA3AF', opacity: 0.1 }} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
              {dataWithSymbols.map((entry, index) => {
                const fill = index === 0 ? '#14B8A6' : index === 1 ? '#3B82F6' : '#6366F1';
                return (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={fill} 
                        style={{ filter: `drop-shadow(2px 0px 4px ${fill}60)` }}
                    />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="relative z-10 mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-wrap gap-4 text-xs">
        {dataWithSymbols.map((user, index) => {
          const fill = index === 0 ? '#14B8A6' : index === 1 ? '#3B82F6' : '#6366F1';
          return (
            <div key={index} className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: fill }}></span>
              <span className="font-bold text-gray-700 dark:text-gray-300">{user.symbol}</span>
              <span className="text-gray-600 dark:text-gray-400 max-w-[120px] truncate" title={user.name}>{user.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
