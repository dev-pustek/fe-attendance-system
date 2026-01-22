import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { StudentDashboardSummary } from "../../../../api/types/dashboard";

interface ArrivalHabitsChartProps {
  trends: StudentDashboardSummary["trends"];
}

export default function ArrivalHabitsChart({ trends }: ArrivalHabitsChartProps) {
  // Convert "HH:mm" to decimal hour for plotting (e.g. "07:30" -> 7.5)
  const parseTime = (timeStr: string) => {
    if (!timeStr || timeStr === "-") return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + minutes / 60;
  };

  const chartData = trends.map(t => parseTime(t.clockIn));
  const categories = trends.map(t => t.day);

  const options: ApexOptions = {
    chart: {
      type: "line",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ["#3C50E0"],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    markers: {
        size: 5,
        colors: ["#fff"],
        strokeColors: "#3C50E0",
        strokeWidth: 2,
    },
    xaxis: {
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 6, // Start Y-axis at 6 AM
      max: 9, // End Y-axis at 9 AM (adjustable)
      labels: {
        formatter: (val) => {
            const h = Math.floor(val);
            const m = Math.round((val - h) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
      },
      title: { text: "Arrival Time" }
    },
    annotations: {
      yaxis: [
        {
          y: 7, // 07:00 AM Line
          borderColor: "#EF4444",
          strokeDashArray: 4,
          label: {
            borderColor: "#EF4444",
            style: {
              color: "#fff",
              background: "#EF4444",
            },
            text: "07:00 Limit",
          },
        },
      ],
    },
    grid: {
      yaxis: { lines: { show: true } }, 
    },
    tooltip: {
        y: {
            formatter: (val) => {
                if(val === null) return "N/A";
                const h = Math.floor(val);
                const m = Math.round((val - h) * 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }
        }
    }
  };

  const series = [
    {
      name: "Arrival Time",
      data: chartData,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6 h-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
        Arrival Habits
      </h3>
      <p className="text-sm text-gray-500 mb-4">Your check-in times over the last few days.</p>
      
      <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Chart options={options} series={series} type="line" height={280} />
      </div>
    </div>
  );
}
