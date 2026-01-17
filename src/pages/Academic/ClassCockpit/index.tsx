import React, { useMemo } from "react";
import EnrollmentTab from "./EnrollmentTab";
import AttendanceMetricsTab from "./AttendanceMetricsTab";
import QRCode from "react-qr-code";
import { ClassCockpitProvider, useClassCockpit } from "./ClassCockpitContext";
import { useTeachingScheduleTemplates } from "../../../api/hooks/useAcademic";
import { 
  DocsIcon, 
  ListIcon, 
  UserIcon, 
  GridIcon,
  PieChartIcon
} from "../../../components/atoms/Icons";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Tabs
import CurriculumTab from "./CurriculumTab";
import ScheduleBuilderTab from "./ScheduleBuilderTab";
import OverviewTab from "./OverviewTab";

// --- Tab Button Component ---
const TabButton = ({
    label,
    icon: Icon,
    isActive,
    onClick,
  }: {
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 py-4 px-1 text-sm font-medium transition-colors ${
        isActive
          ? "text-brand-600 dark:text-brand-400"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      <Icon className={`size-4 ${isActive ? "text-brand-500" : "text-gray-400"}`} />
      {label}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );

// --- Header Component ---
const CockpitHeader = () => {
  const { classDetails, subjects, isLoadingClass } = useClassCockpit();
  
  // Fetch templates to calculate Total Scheduled JP
  const { data: templatesData } = useTeachingScheduleTemplates({
      classId: classDetails?.id,
      isActive: true,
      limit: 100 // Assuming max 100 sessions per class per week
  });

  const totalTargetJP = useMemo(() => {
      // Sum of plannedUnitsPerWeek from all class subjects
      return subjects.reduce((acc, s) => acc + (s.plannedUnitsPerWeek || 0), 0);
  }, [subjects]);

  const totalScheduledJP = useMemo(() => {
      // Sum of plannedUnits from all active templates
      return templatesData?.data?.reduce((acc, t) => {
        if (t.plannedUnits) {
            return acc + t.plannedUnits;
        }
        // Fallback: Calculate from duration (default 45 mins = 1 JP)
        if (t.startTime && t.endTime) {
            const start = new Date(`1970-01-01T${t.startTime}`);
            const end = new Date(`1970-01-01T${t.endTime}`);
            const durationMins = (end.getTime() - start.getTime()) / 60000;
            return acc + (durationMins / 45);
        }
        return acc;
      }, 0) || 0;
  }, [templatesData]);

  const progressPercent = totalTargetJP > 0 ? Math.min(100, (totalScheduledJP / totalTargetJP) * 100) : 0;
  const isOverScheduled = totalScheduledJP > totalTargetJP;

  if (isLoadingClass) {
      return (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-white/5 p-6 mb-6 animate-pulse">
              <div className="flex gap-6">
                <div className="h-32 w-32 bg-gray-100 dark:bg-white/5 rounded-xl shrink-0" />
                <div className="space-y-4 flex-1">
                    <div className="h-8 w-1/3 bg-gray-100 dark:bg-white/5 rounded" />
                    <div className="h-4 w-1/4 bg-gray-100 dark:bg-white/5 rounded" />
                </div>
              </div>
          </div>
      );
  }

  if (!classDetails) {
     return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-white/5 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Class Not Found</h2>
            <p className="text-gray-500 mt-2">The requested class data could not be loaded.</p>
            <Link to="/academic/classes" className="inline-block mt-4 text-brand-600 hover:text-brand-500 font-medium">Return to Classes</Link>
        </div>
     );
  }

  return (
    <div className="px-6 pt-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex gap-6 flex-1">
                {/* Info Section */}
                <div className="space-y-4 flex-1">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                             <div className="px-2 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded text-xs font-bold uppercase tracking-wider border border-brand-100 dark:border-brand-500/20">
                                 {classDetails.code}
                             </div>
                             <span className="text-xs text-gray-400 font-mono">ID: {classDetails.id}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                            {classDetails.name}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                             <span className="font-medium text-gray-700 dark:text-gray-300">{classDetails.major?.name || "General Major"}</span>
                             <span>•</span>
                             <span>{classDetails.academicYear?.name || "Active Year"}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-6 text-sm">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Homeroom Teacher</p>
                            <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                                <UserIcon className="size-3.5 text-brand-500" />
                                {classDetails.homeroomTeacher?.name ? (
                                    <span>{classDetails.homeroomTeacher.name}</span>
                                ) : (
                                    <span className="text-gray-400 italic">Unassigned</span>
                                )}
                            </div>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-white/10 hidden sm:block" />
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Classroom</p>
                            <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                                <GridIcon className="size-3.5 text-brand-500" />
                                <span>{classDetails.roomNumber || "No Room"}</span>
                            </div>
                        </div>
                         <div className="w-px h-8 bg-gray-200 dark:bg-white/10 hidden sm:block" />
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Capacity</p>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {classDetails.maxCapacity || 0} Students
                            </span>
                        </div>
                    </div>
                </div>

                {/* QR Code */}
                <div className="flex-shrink-0">
                    <div className="bg-white p-2 rounded-xl dark:bg-white">
                        <QRCode
                            value={String(classDetails.id)}
                            size={100}
                            viewBox={`0 0 100 100`}
                            className="size-24"
                        />
                    </div>
                </div>
            </div>
            

        </div>

        {/* JP Progress Bar Area */}
        <div className="pb-6">
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Scheduled Progress</span>
                     <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                         isOverScheduled ? "bg-red-100 text-red-600" :
                         progressPercent === 100 ? "bg-green-100 text-green-600" : "bg-brand-50 text-brand-600"
                     }`}>
                         {totalScheduledJP} / {totalTargetJP} JP
                     </span>
                 </div>
                 <span className="text-xs font-medium text-gray-400">{Math.round(progressPercent)}% Completed</span>
             </div>
             <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                        isOverScheduled ? "bg-red-500" : 
                        progressPercent >= 100 ? "bg-green-500" : "bg-brand-500"
                    }`}
                 />
             </div>
        </div>

        {/* Tabs */}
        {/* Placeholder for composition in wrapper */}
    </div>
  );
};


const ClassCockpitWrapper = () => {
    const { activeTab, setActiveTab, classDetails, isLoadingClass } = useClassCockpit();

    const tabs = [
        { id: 'overview', label: "Overview", icon: GridIcon },
        { id: 'curriculum', label: "Curriculum", icon: DocsIcon },
        { id: 'schedule', label: "Schedule", icon: ListIcon },
        { id: 'enrollment', label: "Enrollment", icon: UserIcon },
        { id: 'analytics', label: "Analytics", icon: PieChartIcon },
    ];

    // Main loading state only if no context data at all
    if (isLoadingClass && !classDetails) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

    // Determine content valid
    const isContentValid = !!classDetails;

    return (
        <div className="min-h-screen font-sans space-y-6">
            <PageMeta 
                title={classDetails ? `Class Cockpit - ${classDetails.name}` : "Class Cockpit"} 
                description="Manage class curriculum, staffing, and schedule." 
             />
             <PageBreadcrumb 
                pageTitle="Class Cockpit" 
                breadcrumbs={[
                    { label: "Academic", path: "/academic" },
                    { label: "Classes", path: "/academic/classes" },
                    { label: classDetails?.name || "Cockpit", path: "#" }
                ]}
             />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                {/* Header Section */}
                {/* Removed shadow from here as requested */}
                
                <CockpitHeader />
                
                {isContentValid && (
                    <>
                        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-white/5">
                            <div className="px-6 flex gap-6 overflow-x-auto no-scrollbar">
                                {tabs.map(tab => (
                                    <TabButton
                                        key={tab.id}
                                        label={tab.label}
                                        icon={tab.icon}
                                        isActive={activeTab === tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                    />
                                ))}
                            </div>
                         </div>
        
                        {/* Tab Content */}
                        <div className="min-h-[600px] flex flex-col relative overflow-hidden bg-gray-50/30 dark:bg-black/20">
                             <AnimatePresence mode="wait">
                                 {activeTab === 'curriculum' && (
                                     <motion.div 
                                         key="curriculum"
                                         initial={{ opacity: 0, x: -20 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         exit={{ opacity: 0, x: 20 }}
                                         transition={{ duration: 0.2 }}
                                         className="h-full flex flex-col"
                                     >
                                         <CurriculumTab />
                                     </motion.div>
                                 )}
                                 {activeTab === 'schedule' && (
                                     <motion.div 
                                         key="schedule"
                                         initial={{ opacity: 0, x: -20 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         exit={{ opacity: 0, x: 20 }}
                                         transition={{ duration: 0.2 }}
                                         className="h-full flex flex-col"
                                     >
                                         <ScheduleBuilderTab />
                                     </motion.div>
                                 )}
                                 {activeTab === 'enrollment' && (
                                     <motion.div 
                                         key="enrollment"
                                         initial={{ opacity: 0, x: -20 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         exit={{ opacity: 0, x: 20 }}
                                         transition={{ duration: 0.2 }}
                                         className="h-full flex flex-col"
                                     >
                                         <EnrollmentTab />
                                     </motion.div>
                                 )}
                                 {activeTab === 'analytics' && (
                                     <motion.div 
                                         key="analytics"
                                         initial={{ opacity: 0, x: -20 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         exit={{ opacity: 0, x: 20 }}
                                         transition={{ duration: 0.2 }}
                                         className="h-full flex flex-col"
                                     >
                                         <AttendanceMetricsTab />
                                     </motion.div>
                                 )}
                                 {activeTab === 'overview' && (
                                     <motion.div 
                                         key="overview"
                                         initial={{ opacity: 0, x: -20 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         exit={{ opacity: 0, x: 20 }}
                                         transition={{ duration: 0.2 }}
                                         className="h-full flex flex-col p-6"
                                     >
                                         <OverviewTab />
                                     </motion.div>
                                 )}
                             </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const ClassCockpit = () => {
  return (
    <ClassCockpitProvider>
      <DndProvider backend={HTML5Backend}>
          <ClassCockpitWrapper />
      </DndProvider>
    </ClassCockpitProvider>
  );
};

export default ClassCockpit;
