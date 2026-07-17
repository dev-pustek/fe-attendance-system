import { CheckBadgeIcon, ClockIcon, XCircleIcon, ChartPieIcon } from "@heroicons/react/24/outline";

interface Props {
  overview: {
    present: number;
    late: number;
    absent: number;
    attendanceRate: number;
  };
}

export default function StudentSummaryCards({ overview }: Props) {
  const cards = [
    {
      title: "Attendance Rate",
      value: `${overview.attendanceRate.toFixed(1)}%`,
      icon: ChartPieIcon,
      gradient: "from-blue-600 to-indigo-500",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-100",
      subtitle: `Target: 95%`,
    },
    {
      title: "Days Present",
      value: overview.present,
      icon: CheckBadgeIcon,
      gradient: "from-emerald-500 to-teal-400",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-100",
    },
    {
      title: "Times Late",
      value: overview.late,
      icon: ClockIcon,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-100",
    },
    {
      title: "Days Absent",
      value: overview.absent,
      icon: XCircleIcon,
      gradient: "from-rose-500 to-red-500",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className={`relative overflow-hidden rounded-3xl p-6 shadow-lg shadow-${card.gradient.split('-')[1]}/20 border border-white/20 dark:border-white/10 bg-gradient-to-br ${card.gradient} transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.02]`}
        >
          <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-sm mix-blend-overlay"></div>
          <card.icon className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10 transform -rotate-12" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${card.iconBg} backdrop-blur-md border border-white/10`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
            
            <p className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">{card.title}</p>
            <h3 className="text-4xl font-bold text-white tracking-tight drop-shadow-md mb-2">
              {card.value}
            </h3>
            
            {card.subtitle && (
                <div className="flex items-center mt-2">
                  <span className="text-xs font-medium text-white/90 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    {card.subtitle}
                  </span>
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
