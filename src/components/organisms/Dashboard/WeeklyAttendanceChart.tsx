import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { AttendanceTrend } from "../../../api/types/dashboard";

interface WeeklyAttendanceChartProps {
  trends: AttendanceTrend[];
}

export default function WeeklyAttendanceChart({ trends }: WeeklyAttendanceChartProps) {
  const options: ApexOptions = {
    colors: ["#3C50E0"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "40%",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: trends.map((t) => t.day),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
        title: { text: undefined },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      y: { formatter: (val) => `${val}` },
    },
  };

  const series = [
    {
      name: "Attendance",
      data: trends.map((t) => t.count),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Weekly Attendance Overview
      </h3>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Chart options={options} series={series} type="bar" height={250} />
      </div>
    </div>
  );
}
