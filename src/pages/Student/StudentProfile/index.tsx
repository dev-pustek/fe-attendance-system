import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useStudent, useStudentParents } from "../../../api/hooks/useProfiles";
import { useClassEnrollmentsByUser } from "../../../api/hooks/useAcademic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import Avatar from "../../../components/atoms/Avatar";
import Badge from "../../../components/atoms/Badge";
import Button from "../../../components/atoms/Button";
import { 
  PencilIcon, 
  ChatIcon, // Replacement for PhoneIcon
  FolderIcon, // Replacement for MapPinIcon/Docs
  UserIcon, 
  TimeIcon,
  ShootingStarIcon // Replacement for AcademicCapIcon
} from "../../../components/atoms/Icons";
import { format } from "date-fns";

// Define interface for the expected parent relation structure
interface ParentRelation {
  id: number | string;
  relationship: string;
  isPrimaryContact: boolean;
  parent?: {
    id: string;
    phone?: string;
    user?: {
      name: string;
      photo?: string;
    }
  }
}

const StudentProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"timeline" | "family" | "docs">("timeline");

  const { data: student, isLoading: isLoadingStudent } = useStudent(userId || "");
  const { data: parentsResponse, isLoading: isLoadingParents } = useStudentParents(userId);
  const { data: enrollmentsResponse, isLoading: isLoadingEnrollments } = useClassEnrollmentsByUser(userId);

  // Cast response to expected type
  const parents = (parentsResponse?.data || []) as unknown as ParentRelation[];
  
  // Sort enrollments by date descending (newest first)
  const enrollments = (enrollmentsResponse?.data || []).sort((a,b) => 
    new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()
  );

  const activeEnrollment = enrollments.find(e => e.status === 'active');
  // Mock attendance rate for now (future: fetch from attendance stats)
  const attendanceRate = "94%"; 
  const primaryParent = parents[0]?.parent;

  if (isLoadingStudent || isLoadingParents || isLoadingEnrollments) {
      return (
          <div className="p-8 text-center animate-pulse">
              <div className="h-32 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 mx-auto rounded mb-4"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 mx-auto rounded"></div>
          </div>
      );
  }

  if (!student) return <div className="p-8 text-center">Student not found</div>;

  return (
    <>
      <PageMeta title={`${student.user?.name} | Student Profile`} description="Student comprehensive 360 view." />
      <PageBreadcrumb pageTitle="Student Profile" />

      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        
        {/* A. Profile Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-6 md:p-10 shadow-sm">
           {/* Decorative Background Elements */}
           <div className="absolute top-0 right-0 p-32 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 p-24 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

           <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative shrink-0">
                <div className="p-1.5 bg-white dark:bg-gray-900 rounded-full md:rounded-[2rem] shadow-lg">
                    <Avatar 
                        src={student.user?.photo || undefined} 
                        alt={student.user?.name} 
                        size="xxlarge" 
                        className="rounded-full md:rounded-[1.8rem] w-32 h-32 md:w-40 md:h-40 object-cover"
                    />
                </div>
                <div className={`absolute bottom-2 right-2 md:-right-2 md:bottom-6 size-6 rounded-full border-2 border-white dark:border-gray-900 ${student.user?.isActive ? 'bg-success-500' : 'bg-gray-400'}`}></div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                 <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                        {student.user?.name}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <Badge variant="light" className="font-mono font-bold text-gray-500 border-gray-200 bg-gray-50/50">
                            {student.studentId || "NO ID"}
                        </Badge>
                        <Badge color={student.user?.isActive ? 'success' : 'light'} className="capitalize font-bold px-3">
                            {student.user?.isActive ? 'Active Student' : 'Inactive'}
                        </Badge>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto md:mx-0">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                        <ChatIcon className="size-4 opacity-70" />
                        <span>{student.user?.phone || "No Phone"}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                        <FolderIcon className="size-4 opacity-70" />
                        <span className="truncate">{student.address || "No Address"}</span>
                    </div>
                 </div>
              </div>

              <div className="shrink-0">
                 <Button 
                    variant="outline" 
                    startIcon={<PencilIcon className="size-4"/>}
                    onClick={() => navigate(`/profiles/students?edit=${student.id}`)} // Use profile ID
                    className="rounded-xl border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                 >
                    Edit Profile
                 </Button>
              </div>
           </div>
        </div>

        {/* B. Current Context Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Current Class */}
            <div className="group p-6 rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10 space-y-1">
                    <p className="text-brand-100 text-xs font-bold uppercase tracking-wider">Current Class</p>
                    <h3 className="text-2xl font-bold tracking-tight">
                        {activeEnrollment ? activeEnrollment.class?.name : "Not Enrolled"}
                    </h3>
                    <p className="text-sm text-brand-100 font-medium flex items-center gap-1.5 opacity-80">
                         <ShootingStarIcon className="size-4" />
                         {activeEnrollment ? activeEnrollment.academicYear?.name : "N/A"}
                    </p>
                </div>
            </div>

            {/* Card 2: Attendance Rate */}
            <div className="group p-6 rounded-[2rem] bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] shadow-sm relative overflow-hidden">
                 <div className="absolute right-0 bottom-0 p-12 bg-success-500/5 rounded-full -mr-6 -mb-6 blur-xl"></div>
                 <div className="relative z-10 space-y-1">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Attendance Rate</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{attendanceRate}</h3>
                        <span className="text-sm font-bold text-success-500 mb-1.5 flex items-center bg-success-50 dark:bg-success-900/20 px-2 py-0.5 rounded-lg">
                            +2.4% <span className="text-[10px] ml-1 font-normal text-gray-400">vs last term</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 3: Primary Parent */}
            <div className="group p-6 rounded-[2rem] bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 p-12 bg-indigo-500/5 rounded-full -mr-6 -mt-6 blur-xl"></div>
                <div className="relative z-10 space-y-1">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Primary Guardian</p>
                    {primaryParent?.user ? (
                        <>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate" title={primaryParent.user.name}>
                                {primaryParent.user.name.split(' ')[0]} {primaryParent.user.name.split(' ')[1] && primaryParent.user.name.split(' ')[1][0] + '.'}
                            </h3>
                            <a href={`tel:${primaryParent.phone}`} className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline mt-1">
                                <ChatIcon className="size-3.5" />
                                {primaryParent.phone}
                            </a>
                        </>
                    ) : (
                        <h3 className="text-xl font-bold text-gray-400">No Guardian Linked</h3>
                    )}
                </div>
            </div>
        </div>

        {/* C. The Journey Tabs */}
        <div className="space-y-6">
            <div className="flex p-1 bg-gray-100/50 dark:bg-white/[0.03] rounded-2xl w-full md:w-fit backdrop-blur-sm">
                {[
                    { id: 'timeline', label: 'Academic Journey', icon: <TimeIcon className="size-4"/> },
                    { id: 'family', label: 'Family & Contacts', icon: <UserIcon className="size-4"/> },
                    { id: 'docs', label: 'Documents', icon: <FolderIcon className="size-4"/> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-[2.5rem] border border-gray-100 dark:border-white/[0.05] p-6 md:p-8 min-h-[400px]">
                {activeTab === 'timeline' && (
                    <div className="max-w-3xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8">Enrollment History</h3>
                        <div className="space-y-8 relative pl-4 border-l-2 border-dashed border-gray-200 dark:border-white/10 ml-3">
                            {enrollments.length === 0 ? (
                                <p className="text-gray-500 pl-4">No enrollment history found.</p>
                            ) : enrollments.map((enrollment, idx) => (
                                <div key={enrollment.id} className="relative pl-8 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[27px] top-1 size-4 rounded-full border-4 border-white dark:border-gray-900 ${
                                        idx === 0 ? 'bg-brand-500 ring-4 ring-brand-100 dark:ring-brand-900/20' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}></div>
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-white/10">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                {format(new Date(enrollment.enrollmentDate), 'MMMM yyyy')}
                                            </p>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {enrollment.status === 'transferred' ? 'Transferred to ' : enrollment.status === 'withdrawn' ? 'Withdrawn from ' : 'Enrolled in '}
                                                <span className="text-brand-600 dark:text-brand-400">{enrollment.class?.name}</span>
                                            </h4>
                                            <p className="text-sm font-medium text-gray-500">
                                                {enrollment.academicYear?.name} • {enrollment.academicYear?.code}
                                            </p>
                                        </div>
                                        <Badge 
                                            color={enrollment.status === 'active' ? 'success' : enrollment.status === 'withdrawn' ? 'error' : 'light'}
                                            className="self-start sm:self-center capitalize"
                                        >
                                            {enrollment.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'family' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {parents.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-400">
                                <UserIcon className="size-12 mx-auto mb-3 opacity-20"/>
                                <p>No family contacts linked.</p>
                            </div>
                        ) : parents.map(({ parent, relationship, isPrimaryContact }) => (
                           <div key={parent?.id} className="relative p-6 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col gap-4 group hover:border-brand-200 dark:hover:border-brand-500/30 transition-colors">
                                {isPrimaryContact && (
                                    <span className="absolute top-4 right-4 text-[10px] font-bold uppercase text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-lg">
                                        Primary
                                    </span>
                                )}
                                <div className="flex items-center gap-4">
                                    <Avatar src={parent?.user?.photo || undefined} alt={parent?.user?.name} size="large" className="rounded-2xl"/>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{parent?.user?.name}</h4>
                                        <p className="text-xs font-medium text-gray-500 capitalize">{relationship}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-white/10">
                                    <a href={`tel:${parent?.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-black/20 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-brand-500 hover:shadow-sm transition-all">
                                        <div className="size-8 rounded-full bg-success-100 text-success-600 flex items-center justify-center">
                                            <ChatIcon className="size-4"/>
                                        </div>
                                        Call Mobile
                                    </a>
                                </div>
                           </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'docs' && (
                    <div className="py-20 text-center">
                         <FolderIcon className="size-16 mx-auto text-gray-200 dark:text-gray-800 mb-4"/>
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white">Documents & Files</h3>
                         <p className="text-gray-500 text-sm max-w-xs mx-auto">Upload certificates, report cards, and other student documents here. (Coming Soon)</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </>
  );
};

export default StudentProfile;
