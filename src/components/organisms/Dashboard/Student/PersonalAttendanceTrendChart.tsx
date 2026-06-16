import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  trends: { date: string; day: string; status: string; clockIn: string }[];
}

export default function PersonalAttendanceTrendChart({ trends }: Props) {
  const processData = () => {
    return trends.map(t => {
        let timeVal = 0;
        if (t.clockIn) {
            const [time, modifier] = t.clockIn.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            timeVal = hours + (minutes / 60);
        }
        return {
            ...t,
            timeValue: timeVal,
        }
    }).reverse();
  };

  const data = processData();

  const formatTimeAxis = (val: number) => {
      const h = Math.floor(val);
      const m = Math.round((val - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Arrival Time Trend</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your clock-in times over the last few days</p>
      </div>
      
      <div className="h-[250px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
            <YAxis 
                domain={['auto', 'auto']} 
                tickFormatter={formatTimeAxis}
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9CA3AF', fontSize: 12 }} 
            />
            <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: number, name: string, props: any) => [props.payload.clockIn, 'Clock In Time']}
            />
            <Area 
                type="monotone" 
                dataKey="timeValue" 
                stroke="#3B82F6" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorTime)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
