import PageMeta from "../../components/atoms/PageMeta";
import { useAuthStore } from "../../store/authStore";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import { useIsMobile } from "../../hooks/useIsMobile";

export default function Home() {
  const { user } = useAuthStore();
  const isMobile = useIsMobile(1024); // lg breakpoint
  
  const roles = user?.roles?.map(r => r.name.toLowerCase()) || [];
  const userTypes = user?.userTypes?.map(t => t.toLowerCase()) || [];
  const typeAssignments = user?.typeAssignments?.map(t => t.userType?.name.toLowerCase()) || [];

  const allRoles = [...roles, ...userTypes, ...typeAssignments].filter((r): r is string => !!r);

  const isAdminOrStaff = allRoles.some(r => r.includes('admin') || r.includes('staff') || r.includes('piket') || r.includes('security'));
  const isTeacher = allRoles.some(r => r.includes('teacher'));
  // Default to student if no other role matches, or explicitly student
  const isStudent = allRoles.some(r => r === 'student' || r.includes('student')) || (!isAdminOrStaff && !isTeacher);

  // For testing purposes, if you want to force a view:
  // const isAdminOrStaff = true;
  // const isTeacher = false;
  // const isStudent = false;

  // Show StudentDashboard (which contains MobileStudentDashboard) for all users on mobile
  if (isMobile) {
    return <StudentDashboard />;
  }

  if (isAdminOrStaff) {
    return <AdminDashboard />;
  }

  if (isTeacher) {
    return <TeacherDashboard />;
  }

  if (isStudent) {
    return <StudentDashboard />;
  }

  return (
    <>
      <PageMeta
        title="Dashboard | SIAPUS"
        description="SIAPUS - Intelligent Attendance Dashboard"
      />
      <div className="p-8 text-center text-gray-500">
          No dashboard available for your role. Please contact administrator.
      </div>
    </>
  );
}
