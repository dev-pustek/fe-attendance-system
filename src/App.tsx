import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import StudentSignIn from "./pages/AuthPages/StudentSignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
// Actually lint said UserProfiles is unused. But I removed the route using it.
// So I should remove the import.
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AuditLogs from "./pages/AuditLogs";
import AuditMetrics from "./pages/AuditLogs/AuditMetrics";
import AcademicYears from "./pages/Academic/AcademicYears";
import Classes from "./pages/Academic/Classes";
import ClassEnrollments from "./pages/Academic/ClassEnrollments";
import EducationLevels from "./pages/Academic/EducationLevels";
import Majors from "./pages/Academic/Majors";
import Grades from "./pages/Academic/Grades";
import ProgramStudies from "./pages/Academic/ProgramStudies";
import Subjects from "./pages/Academic/Subjects";
import TeacherSubjects from "./pages/Academic/TeacherSubjects";
import ClassSubjects from "./pages/Academic/ClassSubjects";
import TeachingAssignments from "./pages/Academic/TeachingAssignments";
import TeachingUnitPolicies from "./pages/Academic/TeachingUnitPolicies";
import { lazy } from "react";
const WorkloadContracts = lazy(() => import("./pages/Academic/WorkloadContracts"));
const TeachingScheduleTemplates = lazy(() => import("./pages/Academic/TeachingScheduleTemplates"));
const ClassSchedules = lazy(() => import("./pages/Academic/ClassSchedules"));
const CurriculumExplorer = lazy(() => import("./pages/Academic/CurriculumExplorer"));
const CurriculumWizard = lazy(() => import("./pages/Academic/CurriculumConfigurator"));
const ClassroomCommand = lazy(() => import("./pages/Teacher/Classroom"));
const StudentProfile = lazy(() => import("./pages/Student/StudentProfile"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const ClassScheduleOverrides = lazy(() => import("./pages/Academic/ClassSchedules/Overrides"));
const StudentManagement = lazy(() => import("./pages/Profiles/Students"));
const ClassPromotion = lazy(() => import("./pages/Academic/ClassPromotion"));
const EmployeeManagement = lazy(() => import("./pages/Profiles/Employees"));
const ParentManagement = lazy(() => import("./pages/Profiles/Parents"));
const CctvDashboard = lazy(() => import("./pages/Devices/CctvDashboard"));

const ClassCockpit = lazy(() => import("./pages/Academic/ClassCockpit"));
const TeacherCockpit = lazy(() => import("./pages/Academic/TeacherCockpit"));
const IdentityChannels = lazy(() => import("./pages/Identity/Channels"));
const IdentityCredentials = lazy(() => import("./pages/Identity/Credentials"));
const IdentityCaptureLogs = lazy(() => import("./pages/Identity/CaptureLogs"));
const IdentityResolutions = lazy(() => import("./pages/Identity/Resolutions"));
const IdentityDeviceCapabilities = lazy(() => import("./pages/Identity/DeviceCapabilities"));

const LeaveRequests = lazy(() => import("./pages/Leaves/Requests"));
const LeaveTypes = lazy(() => import("./pages/Leaves/LeaveTypes"));
const AttendanceList = lazy(() => import("./pages/Attendance/AttendanceList"));
const TeachingSessions = lazy(() => import("./pages/Attendance/TeachingSessions"));
const SubjectAttendances = lazy(() => import("./pages/Attendance/SubjectAttendances"));
const AttendanceEvents = lazy(() => import("./pages/Attendance/AttendanceEvents"));
const TeacherSchedule = lazy(() => import("./pages/Attendance/ScheduleWrapper"));
const StudentTodaySchedule = lazy(() => import("./pages/Attendance/Student/StudentTodaySchedule"));
const StudentWeeklySchedule = lazy(() => import("./pages/Attendance/Student/StudentWeeklySchedule"));
const StudentEvents = lazy(() => import("./pages/Attendance/Student/StudentEvents"));
const MyIdCardPage = lazy(() => import("./pages/Attendance/Student/MyIdCardPage"));
const StudentLeaveRequest = lazy(() => import("./pages/Student/LeaveRequest"));
const GateScan = lazy(() => import("./pages/Attendance/Student/GateScan"));
const AttendancePolicies = lazy(() => import("./pages/Attendance/AttendancePolicies"));
const PiketMonitor = lazy(() => import("./pages/Attendance/PiketMonitor"));
const AttendanceHistory = lazy(() => import("./pages/Attendance/History"));
const NotificationTemplateList = lazy(() => import("./pages/Notifications/Templates/NotificationTemplateList"));
const NotificationSettings = lazy(() => import("./pages/Settings/NotificationSettings"));
const NotificationInbox = lazy(() => import("./pages/Notifications/Inbox/NotificationInbox"));
import Devices from "./pages/Devices";
import Settings from "./pages/Settings";
import LocationSettings from "./pages/Settings/LocationSettings";
import Backups from "./pages/Settings/Backups";
import AccessControlRoles from "./pages/AccessControl/Roles";
import UserTypes from "./pages/AccessControl/UserTypes";
import UserList from "./pages/Users/List";
import IdCardPrint from "./pages/Users/IdCardPrint";
import StorageSettings from "./pages/Settings/StorageSettings";
import StorageCallback from "./pages/Settings/StorageCallback";

import ShiftTemplates from "./pages/Scheduling/ShiftTemplates";
import ShiftAssignments from "./pages/Scheduling/ShiftAssignments";
import WorkSchedules from "./pages/Scheduling/WorkSchedules";
import Events from "./pages/Events";
import EventInvitations from "./pages/Events/Invitations";
import EventInvitationPaper from "./pages/Events/InvitationPaper";
import Guests from "./pages/Guests";
import GuestVisits from "./pages/Guests/Visits";
import AppLayout from "./components/templates/AppTemplate";
import { ScrollToTop } from "./components/atoms/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/organisms/ProtectedRoute";
import PublicRoute from "./components/organisms/PublicRoute";
import { Toaster } from "react-hot-toast";




export default function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          top: 80,
          right: 20,
          zIndex: 999999,
        }}
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout - Protected */}
          <Route element={<ProtectedRoute />}>
             {/* Full Screen Pages without Layout */}
             <Route path="/attendance/gate-scan" element={<GateScan />} />

            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              {/* Others Page */}
              <Route path="/profile" element={<MyProfile />} />
              {/* <Route path="/profile/picture" element={<ProfilePicture />} /> */}
              <Route path="/calendar" element={<Calendar />} />
              {/* Profile Picture sub-route removed or kept as alias? User wants profile page at /profile mainly. */}
              {/* <Route path="/profile/picture" element={<ProfilePicture />} />  -- Removing this as it's superseded */}
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/audit/logs" element={<AuditLogs />} />
              <Route path="/audit/metrics" element={<AuditMetrics />} />
              <Route path="/academic/years" element={<AcademicYears />} />
              <Route path="/academic/classes" element={<Classes />} />
              <Route path="/academic/curriculum" element={<CurriculumExplorer />} />
              <Route path="/academic/curriculum-wizard" element={<CurriculumWizard />} />
              <Route path="/academic/classes/:classId/manage" element={<ClassCockpit />} />
              <Route path="/academic/schedules" element={<ClassSchedules />} />
              <Route path="/academic/schedule-overrides" element={<ClassScheduleOverrides />} />
              <Route path="/academic/enrollments" element={<ClassEnrollments />} />
              <Route path="/academic/education-levels" element={<EducationLevels />} />
              <Route path="/academic/majors" element={<Majors />} />
              <Route path="/academic/grades" element={<Grades />} />
              <Route path="/academic/program-studies" element={<ProgramStudies />} />
              <Route path="/academic/subjects" element={<Subjects />} />
              <Route path="/academic/teacher-subjects" element={<TeacherSubjects />} />
              <Route path="/academic/class-subjects" element={<ClassSubjects />} />
              <Route path="/academic/teaching-assignments" element={<TeachingAssignments />} />
              <Route path="/academic/teaching-unit-policies" element={<TeachingUnitPolicies />} />
              <Route path="/academic/workload-contracts" element={<WorkloadContracts />} />
              <Route path="/academic/teaching-schedule-templates" element={<TeachingScheduleTemplates />} />
              <Route path="/academic/class-promotion" element={<ClassPromotion />} />
              <Route path="/academic/students" element={<StudentManagement />} />
              <Route path="/students/:userId" element={<StudentProfile />} />
              <Route path="/hr/employees" element={<EmployeeManagement />} />
              <Route path="/hr/employees/:employeeId/academic-profile" element={<TeacherCockpit />} />
              <Route path="/academic/parents" element={<ParentManagement />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/devices/live" element={<CctvDashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/location" element={<LocationSettings />} />
              <Route path="/settings/storage" element={<StorageSettings />} />
              <Route path="/settings/storage/callback" element={<StorageCallback />} />
              <Route path="/settings/backups" element={<Backups />} />
              <Route path="/roles" element={<AccessControlRoles />} />
              <Route path="/users/list" element={<UserList />} />
              <Route path="/users/print-ids" element={<IdCardPrint />} />
              
              {/* Identity Management - Modular */}
              <Route path="/identity/channels" element={<IdentityChannels />} />
              <Route path="/identity/credentials" element={<IdentityCredentials />} />
              <Route path="/identity/logs" element={<IdentityCaptureLogs />} />
              <Route path="/identity/resolutions" element={<IdentityResolutions />} />
              <Route path="/identity/capabilities" element={<IdentityDeviceCapabilities />} />
              <Route path="/teacher/classroom" element={<ClassroomCommand />} />
              {/* Attendance */}
              <Route path="/attendance/records" element={<AttendanceList />} />
              <Route path="/attendance/teaching-sessions" element={<TeachingSessions />} />
              <Route path="/attendance/subject-attendances" element={<SubjectAttendances />} />
              <Route path="/attendance/my-schedule" element={<TeacherSchedule />} />
              <Route path="/student/schedule/subject" element={<StudentTodaySchedule />} />
              <Route path="/student/schedule/weekly" element={<StudentWeeklySchedule />} />
              <Route path="/student/events" element={<StudentEvents />} />
              <Route path="/student/id-card" element={<MyIdCardPage />} />
              <Route path="/student/leaves" element={<StudentLeaveRequest />} />
              <Route path="/attendance/events" element={<AttendanceEvents />} />
              <Route path="/attendance/rules" element={<AttendancePolicies />} />
              <Route path="/attendance/policies" element={<AttendancePolicies />} />
              <Route path="/attendance/piket" element={<PiketMonitor />} />
              <Route path="/attendance/history" element={<AttendanceHistory />} />
              
              {/* Notification System */}
              <Route path="/admin/notification-templates" element={<NotificationTemplateList />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/notifications" element={<NotificationInbox />} />

              <Route path="/users/user-types" element={<UserTypes />} />

              <Route path="leaves/requests" element={<LeaveRequests />} />
              <Route path="leaves/types" element={<LeaveTypes />} />
              <Route path="/scheduling/templates" element={<ShiftTemplates />} />
              <Route path="/scheduling/assignments" element={<ShiftAssignments />} />
              <Route path="/schedules" element={<WorkSchedules />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id/invitations" element={<EventInvitations />} />
              <Route path="/events/:id/invitation-paper" element={<EventInvitationPaper />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/guests/visits" element={<GuestVisits />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>

          {/* Auth Layout - Public Only */}
          <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
          <Route path="/student/login" element={<PublicRoute><StudentSignIn /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
