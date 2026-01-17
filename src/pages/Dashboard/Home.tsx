import EcommerceMetrics from "../../components/organisms/Ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/organisms/Ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/organisms/Ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/organisms/Ecommerce/MonthlyTarget";
import RecentOrders from "../../components/organisms/Ecommerce/RecentOrders";
import DemographicCard from "../../components/organisms/Ecommerce/DemographicCard";
import PageMeta from "../../components/atoms/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Sistem Absen | Modern Management System"
        description="Sistem Management Absensi Modern & Efisien dengan fitur tracking real-time, integrasi CCTV, dan analitik karyawan."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </>
  );
}
