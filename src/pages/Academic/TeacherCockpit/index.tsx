import { useState } from "react";
import QRCode from "react-qr-code";
import { TeacherCockpitProvider, useTeacherCockpit } from "./TeacherCockpitContext";
import { DocsIcon, UserIcon, CalenderIcon, CheckCircleIcon, EditIcon, UserCircleIcon, GridIcon } from "../../../components/atoms/Icons";
import TalentProfileTab from "./TalentProfileTab";
import WorkloadTab from "./WorkloadTab";
import PersonalScheduleTab from "./PersonalScheduleTab";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { motion, AnimatePresence } from "framer-motion";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import RegisteredSubjectsTab from "./RegisteredSubjectsTab";
import EditProfileModal from "./EditProfileModal";
import Badge from "../../../components/atoms/Badge";

// --- Tab Button Component with Animation ---
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

const TeacherCockpitContent = () => {
    const { employeeDetails, isLoading } = useTeacherCockpit();
    const [activeTab, setActiveTab] = useState("talent");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const tabs = [
        { id: "talent", label: "Talent Profile", icon: UserIcon },
        { id: "registered", label: "My Qualifications", icon: CheckCircleIcon },
        { id: "workload", label: "Current Workload", icon: DocsIcon },
        { id: "schedule", label: "Personal Schedule", icon: CalenderIcon },
    ];

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!employeeDetails) {
        return <div className="flex items-center justify-center min-h-screen">Employee not found</div>;
    }


    return (
        <>
            <PageMeta title={`Academic Profile - ${employeeDetails.user?.name}`} description="Manage teaching qualifications and schedule." />
            <PageBreadcrumb pageTitle="Academic Profile" />
            
            <div className="min-h-screen font-sans space-y-6">
                 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
                     {/* Header */}
                     <div className="px-6 pt-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-gray-800">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                             <div className="flex gap-6">
                                 {/* 3x4 Photo Frame */}
                                 <div className="w-24 md:w-32 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-inner flex-shrink-0">
                                     {employeeDetails.user?.photo ? (
                                         <img src={employeeDetails.user.photo} alt={employeeDetails.user.name} className="size-full object-cover" />
                                     ) : (
                                        <div className="size-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                            <UserCircleIcon className="size-16" />
                                        </div>
                                     )}
                                 </div>

                                 <div className="space-y-3 py-1">
                                     <div>
                                         <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-3">
                                             {employeeDetails.user?.name}
                                             <button
                                                 onClick={() => setIsEditModalOpen(true)}
                                                 className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors"
                                                 title="Edit Profile"
                                             >
                                                 <EditIcon className="size-4" />
                                             </button>
                                         </h1>
                                         <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{employeeDetails.user?.email}</p>
                                     </div>

                                     <div className="flex flex-wrap gap-4 text-sm">
                                         <div className="space-y-1">
                                              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Department</p>
                                              <p className="font-semibold text-gray-700 dark:text-gray-200">{employeeDetails.department || "No Department"}</p>
                                         </div>
                                         <div className="w-px h-8 bg-gray-200 dark:bg-white/10 hidden sm:block" />
                                         <div className="space-y-1">
                                              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Position</p>
                                              <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
                                                  <GridIcon className="size-3.5 text-brand-500" />
                                                  {employeeDetails.position || "Staff"}
                                              </div>
                                         </div>
                                         <div className="w-px h-8 bg-gray-200 dark:bg-white/10 hidden sm:block" />
                                         <div className="space-y-1">
                                              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Employment Status</p>
                                              <Badge color={employeeDetails.employmentStatus === 'PERMANENT' ? 'success' : 'warning'}>
                                                  {employeeDetails.employmentStatus || 'UNKNOWN'}
                                              </Badge>
                                         </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-2 pt-1">
                                         <span className="text-xs font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5">
                                             ID: {employeeDetails.employeeId}
                                         </span>
                                         {employeeDetails.nip && (
                                             <span className="text-xs font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5">
                                                 NIP: {employeeDetails.nip}
                                             </span>
                                         )}
                                     </div>
                                 </div>
                             </div>

                             {/* Edit Profile Button */}
                             {/* QR Code */}
                             <div className="flex-shrink-0 h-full flex items-stretch">
                                 <div className="bg-white p-2 rounded-xl dark:bg-white h-full flex items-center justify-center aspect-square">
                                     <div className="size-28"> 
                                         <QRCode
                                             value={employeeDetails.user?.public_id || "NO_ID"}
                                             size={256}
                                             style={{ height: "100%", width: "100%" }}
                                             viewBox={`0 0 256 256`}
                                         />
                                     </div>
                                 </div>
                             </div>
                        </div>
                        
                        {/* Custom Animated Tabs */}
                        <div className="flex gap-6 overflow-x-auto no-scrollbar">
                            {tabs.map(tab => (
                                <TabButton
                                    key={tab.id}
                                    label={tab.label}
                                    icon={tab.icon}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                />
                            ))}
                        </div>
                     </div>

                     <div className="min-h-[600px] flex flex-col relative overflow-hidden bg-gray-50/30 dark:bg-black/20">
                         <AnimatePresence mode="wait">
                             {activeTab === "talent" && (
                                 <motion.div 
                                     key="talent"
                                     initial={{ opacity: 0, x: -20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     exit={{ opacity: 0, x: 20 }}
                                     transition={{ duration: 0.2 }}
                                     className="h-full flex flex-col"
                                 >
                                     <TalentProfileTab />
                                 </motion.div>
                             )}
                             {activeTab === "registered" && (
                                 <motion.div 
                                     key="registered"
                                     initial={{ opacity: 0, x: -20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     exit={{ opacity: 0, x: 20 }}
                                     transition={{ duration: 0.2 }}
                                     className="h-full flex flex-col"
                                 >
                                     <RegisteredSubjectsTab />
                                 </motion.div>
                             )}
                             {activeTab === "workload" && (
                                 <motion.div 
                                     key="workload"
                                     initial={{ opacity: 0, x: -20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     exit={{ opacity: 0, x: 20 }}
                                     transition={{ duration: 0.2 }}
                                     className="h-full flex flex-col"
                                 >
                                     <WorkloadTab />
                                 </motion.div>
                             )}
                             {activeTab === "schedule" && (
                                 <motion.div 
                                     key="schedule"
                                     initial={{ opacity: 0, x: -20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     exit={{ opacity: 0, x: 20 }}
                                     transition={{ duration: 0.2 }}
                                     className="h-full flex flex-col p-6"
                                 >
                                     <PersonalScheduleTab />
                                 </motion.div>
                             )}
                         </AnimatePresence>
                     </div>
                 </div>
            </div>
                
                {/* Edit Profile Modal */}
                {isEditModalOpen && (
                    <EditProfileModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)} 
                        employee={employeeDetails}
                    />
                )}
            </>
    );
};



const TeacherCockpit = () => {
    return (
        <TeacherCockpitProvider>
            <DndProvider backend={HTML5Backend}>
                <TeacherCockpitContent />
            </DndProvider>
        </TeacherCockpitProvider>
    );
};

export default TeacherCockpit;
