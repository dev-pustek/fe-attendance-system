import React from "react";
import { useClassCockpit } from "./ClassCockpitContext";
import { useClassEnrollments } from "../../../api/hooks/useAcademic";
import { 
    UserIcon, 
    UserCircleIcon, 
    CalenderIcon,
    ChatIcon, 
    EnvelopeIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";

// --- Components ---

const Card = ({ title, action, children, className = "" }: { title: string, action?: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col ${className}`}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">{title}</h3>
            {action}
        </div>
        <div className="p-0 flex-1">
            {children}
        </div>
    </div>
);

const EmptyState = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="size-12 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-3">
            <Icon className="size-6 text-gray-400" />
        </div>
        <p className="text-gray-900 dark:text-white font-medium">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
);

// --- Main Layout ---

const OverviewTab = () => {
    const { classDetails, subjects, isLoadingClass } = useClassCockpit();
    
    // Fetch Enrollments count
    const { data: enrollmentsResponse } = useClassEnrollments({
        classId: classDetails?.id,
        limit: 1 // We only need meta.total
    });

    if (isLoadingClass) {
         return <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="h-64 bg-gray-100 rounded-2xl" />
             <div className="h-64 bg-gray-100 rounded-2xl" />
         </div>;
    }

    const studentCount = enrollmentsResponse?.meta?.total || 0;
    const maxCapacity = classDetails?.maxCapacity || 0;
    const capacityPercentage = maxCapacity > 0 ? (studentCount / maxCapacity) * 100 : 0;
    
    // Format dates
    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const periodDuration = (start?: string, end?: string) => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return Math.round(diffDays / 7); // Weeks
    };

// --- Helper for Timeline ---
    const getTimelineProgress = (start?: string, end?: string) => {
        if (!start || !end) return 0;
        const startDate = new Date(start).getTime();
        const endDate = new Date(end).getTime();
        const now = new Date().getTime();
        const totalDuration = endDate - startDate;
        const elapsed = now - startDate;
        
        if (elapsed < 0) return 0;
        if (elapsed > totalDuration) return 100;
        return (elapsed / totalDuration) * 100;
    };

    const academicProgress = getTimelineProgress(classDetails?.academicYear?.startDate, classDetails?.academicYear?.endDate);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                
                {/* Left Column: Homeroom Teacher (Premium Design) */}
                <Card title="Homeroom Teacher" className="h-full">
                    {classDetails?.homeroomTeacher ? (
                        <div className="flex flex-col h-full p-6">
                            <div className="flex flex-col sm:flex-row gap-6 mb-6">
                                {/* Photo Section - Floating with Shadow */}
                                <div className="w-28 sm:w-36 shrink-0">
                                    <div className="aspect-[3/4] rounded-2xl bg-gray-100 dark:bg-white/5 relative overflow-hidden shadow-lg shadow-gray-200/50 dark:shadow-none ring-1 ring-black/5 dark:ring-white/10">
                                        {classDetails.homeroomTeacher.photo ? (
                                            <img src={classDetails.homeroomTeacher.photo} alt={classDetails.homeroomTeacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <UserIcon className="size-12" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Info Section */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge color="primary" className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md">
                                                NIP: {classDetails.homeroomTeacher.profile?.employeeId || "-"}
                                            </Badge>
                                        </div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-2xl tracking-tight">{classDetails.homeroomTeacher.name}</h4>
                                        <p className="text-sm font-medium text-gray-500 mt-1">Homeroom Teacher</p>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center gap-3 group cursor-pointer transition-colors">
                                            <div className="size-8 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-500/20">
                                                <EnvelopeIcon className="size-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{classDetails.homeroomTeacher.email || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 group cursor-pointer transition-colors">
                                            <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20">
                                                <ChatIcon className="size-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{classDetails.homeroomTeacher.phone || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer - Integrated */}
                            <div className="flex gap-3 mt-auto pt-6 border-t border-gray-100 dark:border-white/5">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                    View Profile
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
                                    Send Message
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center p-6">
                            <EmptyState 
                                icon={UserCircleIcon} 
                                title="No Teacher Assigned" 
                                description="This class currently has no homeroom teacher." 
                            />
                        </div>
                    )}
                </Card>

                {/* Right Column: Enrollment Stats (Premium) */}
                <Card title="Enrollment Statistics" className="h-full">
                    <div className="p-6 h-full flex flex-col justify-center">
                        <div className="flex flex-col sm:flex-row gap-8 items-center h-full">
                            
                            {/* Left Side: Visual Progress (Floating) */}
                            <div className="relative shrink-0">
                                <div className="size-40 relative transform hover:scale-105 transition-transform duration-500">
                                    {/* Decorative glow behind */}
                                    <div className={`absolute inset-0 rounded-full blur-xl opacity-20 ${
                                        capacityPercentage >= 100 ? 'bg-error-500' : 
                                        capacityPercentage >= 80 ? 'bg-warning-500' : 'bg-brand-500'
                                    }`}></div>

                                    <svg className="size-full -rotate-90 drop-shadow-lg" viewBox="0 0 36 36">
                                        <path className="text-gray-50 dark:text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                                        <path 
                                            className={`${
                                                capacityPercentage >= 100 ? 'text-error-500' : 
                                                capacityPercentage >= 80 ? 'text-warning-500' : 'text-brand-500'
                                            } transition-all duration-1000 ease-out`}
                                            strokeDasharray={`${Math.min(capacityPercentage, 100)}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-3xl font-semibold tracking-tight ${
                                            capacityPercentage >= 100 ? 'text-error-600 dark:text-error-400' : 
                                            capacityPercentage >= 80 ? 'text-warning-600 dark:text-warning-400' : 'text-brand-600 dark:text-brand-400'
                                        }`}>
                                            {Math.round(capacityPercentage)}%
                                        </span>
                                        <span className="text-[10px] font-semibold uppercase text-gray-400">Capacity</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Stats List */}
                            <div className="flex-1 flex flex-col justify-center w-full">
                                <div className="mb-6">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-2xl tracking-tight flex items-baseline gap-2">
                                        {studentCount} 
                                        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">/ {maxCapacity} Students</span>
                                    </h4>
                                     <div className="mt-2">
                                        <Badge color={capacityPercentage >= 100 ? 'error' : 'success'} className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md">
                                            {capacityPercentage >= 100 ? 'Class Full' : 'Open for Enrollment'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                     <div className="flex items-center gap-4 group">
                                        <div className="size-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-500 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-500/20">
                                            <UserIcon className="size-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold text-gray-400 leading-none mb-1">Free Seats</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                {Math.max(0, maxCapacity - studentCount)} <span className="text-gray-400 font-medium text-xs">Remaining</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 group">
                                        <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-500 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-500/20">
                                             {/* Using CalenderIcon as generic placeholder since BookIcon isn't imported, or just standard icon */}
                                            <div className="font-semibold text-lg">📚</div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-semibold text-gray-400 leading-none mb-1">Curriculum</p>
                                             <p className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                {subjects.length} <span className="text-gray-400 font-medium text-xs">Active Subjects</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Bottom Row: Academic Timeline (Premium/Timeline View) */}
            <Card title="Academic Schedule">
                <div className="p-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                         <div className="flex items-center gap-4 min-w-[200px]">
                             <div className="size-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 flex items-center justify-center shrink-0">
                                 <CalenderIcon className="size-6" />
                             </div>
                             <div>
                                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Academic Year</p>
                                 <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{classDetails?.academicYear?.name}</h4>
                             </div>
                         </div>
                         
                         <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Semester</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{classDetails?.academicYear?.code || "-"}</p>
                            </div>
                             <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Duration</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{periodDuration(classDetails?.academicYear?.startDate, classDetails?.academicYear?.endDate)} Weeks</p>
                            </div>
                             <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${classDetails?.academicYear?.isActive ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-gray-100 text-gray-600'}`}>
                                    <span className={`size-1.5 rounded-full ${classDetails?.academicYear?.isActive ? 'bg-success-600' : 'bg-gray-500'}`}></span>
                                    {classDetails?.academicYear?.isActive ? 'Active Period' : 'Inactive'}
                                </span>
                            </div>
                         </div>
                    </div>

                    {/* Timeline Visualization */}
                    <div className="pt-6 pb-2">
                        <div className="relative">
                            {/* Progress Bar Background */}
                            <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-1000 ease-in-out relative"
                                    style={{ width: `${Math.min(academicProgress, 100)}%` }}
                                ></div>
                            </div>

                            {/* Current Indicator - Perfectly Centered on Bar */}
                            <div 
                                className="absolute top-1/2 flex flex-col items-center z-10 pointer-events-none"
                                style={{ 
                                    left: `${Math.min(academicProgress, 100)}%`,
                                    // Align center of the dot (last child) to the line: 
                                    // Shift up by full height (-100%) then down by half dot height (+8px)
                                    transform: `translate(-50%, calc(-100% + 8px))` 
                                }}
                            >
                                {/* Badge sits above - offset by margin bottom to clear the dot */}
                                <div className="mb-2"> 
                                    <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap relative">
                                        Today
                                        {/* Little arrow pointing down */}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-900 dark:border-t-white"></div>
                                    </div>
                                </div>
                                {/* Dot is the anchor point - size-4 is 16px, so +8px centers it */}
                                <div className="size-4 bg-gray-900 dark:bg-white rounded-full border-[3px] border-white dark:border-gray-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10"></div>
                            </div>
                        </div>

                        {/* Labels positioned absolutely relative to container or just margin top */}
                        <div className="flex justify-between mt-3 text-xs font-medium text-gray-500">
                            <div className="text-left">
                                <span className="block text-gray-900 dark:text-white font-semibold mb-0.5">Start Date</span>
                                {formatDate(classDetails?.academicYear?.startDate)}
                            </div>
                            <div className="text-right">
                                <span className="block text-gray-900 dark:text-white font-semibold mb-0.5">End Date</span>
                                {formatDate(classDetails?.academicYear?.endDate)}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default OverviewTab;
