import EcommerceMetrics from "../../components/organisms/Ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/organisms/Ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/organisms/Ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/organisms/Ecommerce/MonthlyTarget";
import RecentOrders from "../../components/organisms/Ecommerce/RecentOrders";
import DemographicCard from "../../components/organisms/Ecommerce/DemographicCard";
import PageMeta from "../../components/atoms/PageMeta";
import { useAuthStore } from "../../store/authStore";
import { Navigate } from "react-router";

export default function Home() {
  const { user } = useAuthStore();
  
  // Student - Redirect to Schedule as their Dashboard
  // Only if they are strictly a student (or based on preference)
  // Assuming Admin can see Dashboard, but Student cannot.
  // Assuming Admin can see Dashboard, but Student cannot.
  const roles = user?.roles?.map(r => r.name.toLowerCase()) || [];
  const userTypes = user?.userTypes?.map(t => t.toLowerCase()) || [];
  const typeAssignments = user?.typeAssignments?.map(t => t.userType?.name.toLowerCase()) || [];

  const allRoles = [...roles, ...userTypes, ...typeAssignments].filter((r): r is string => !!r);

  const isStudent = allRoles.some(r => r === 'student' || r.includes('student'));
  const isAdminOrStaff = allRoles.some(r => r.includes('admin') || r.includes('staff') || r.includes('teacher'));

  if (isStudent && !isAdminOrStaff) {
    return <Navigate to="/student/my-schedule" replace />;
  }

  return (
    <>
      <PageMeta
        title="Visia | Modern Management System"
        description="Visia - Sistem Management Absensi Modern & Efisien dengan fitur tracking real-time, integrasi CCTV, dan analitik karyawan."
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
