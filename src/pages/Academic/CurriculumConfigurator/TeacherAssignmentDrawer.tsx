import React, { useState, useMemo } from "react";
import { useTeacherSubjects } from "../../../api/hooks/useAcademic";
import { useTeachers } from "../../../api/hooks/useUsers";
import { CloseIcon, CheckCircleIcon, SearchIcon, AlertIcon, CheckLineIcon } from "../../../components/atoms/Icons";
import { useDebounce } from "../../../hooks/useDebounce";

interface TeacherAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string | number;
  subjectName: string;
  currentTeacherId?: string | null;
  onSelect: (teacherId: string, teacherName: string, role: "primary" | "assistant") => void;
}

const TeacherAssignmentDrawer: React.FC<TeacherAssignmentDrawerProps> = ({
  isOpen,
  onClose,
  subjectId,
  subjectName,
  currentTeacherId,
  onSelect,
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [activeTab, setActiveTab] = useState<"qualified" | "all">("qualified");

  // Fetch qualified teachers for this subject
  const { data: qualifiedResponse, isLoading: loadingQualified } = useTeacherSubjects({
    subjectId,
    isActive: true,
    limit: 100,
  });

  // Fetch all staff (teachers only)
  const { teachers, isLoading: loadingAll } = useTeachers({
    search: activeTab === "all" ? debouncedSearch : undefined,
    limit: 20,
  });

  const qualifiedTeachers = useMemo(() => {
    return qualifiedResponse?.data.map((ts) => ({
      id: ts.teacher?.public_id,
      name: ts.teacher?.name,
      email: ts.teacher?.email,
      isQualified: true
    })) || [];
  }, [qualifiedResponse]);

  const allTeachers = useMemo(() => {
    return teachers.map((u: any) => ({
      id: u.public_id,
      name: u.name,
      email: u.email,
      isQualified: qualifiedTeachers.some(q => q.id === u.public_id)
    })) || [];
  }, [teachers, qualifiedTeachers]);

  return (
    <>
        {/* Backdrop (No blur as requested, just dimming or transparent based on pref. User said "background like blured, i dont want it". 
            Usually implies they want a clear view or just no blur effect. I'll make it a simple transparent click-away layer or very faint bg) 
        */}
        <div 
            className={`fixed inset-0 z-[60] bg-black/5 transition-opacity duration-300 ease-in-out ${
                isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={onClose}
        />
        
        {/* Drawer */}
        <div 
            className={`fixed top-[72px] bottom-0 right-0 z-[61] w-96 bg-white dark:bg-[#18181b] shadow-2xl border-l border-gray-200 dark:border-white/10 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Teacher</h3>
                    <button 
                        onClick={onClose}
                        className="size-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors shadow-sm"
                    >
                        <CloseIcon className="size-4" />
                    </button>
                </div>
                
                <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-brand-100 dark:border-brand-500/20 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-brand-500 mb-1">Target Subject</p>
                    <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{subjectName}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-2 border-b border-gray-100 dark:border-white/5">
                <button
                    onClick={() => setActiveTab("qualified")}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeTab === "qualified"
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                        : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                >
                    Qualified ({qualifiedTeachers.length})
                </button>
                <button
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeTab === "all"
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                        : "text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                >
                    All Staff
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100 dark:border-white/5">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search teachers..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {activeTab === "qualified" ? (
                    <>
                        {loadingQualified && <div className="text-center py-8 text-xs text-gray-400">Loading qualified teachers...</div>}
                        {!loadingQualified && qualifiedTeachers.length === 0 && (
                            <div className="py-12 text-center">
                                <AlertIcon className="size-12 mx-auto mb-3 text-amber-400 opacity-50" />
                                <p className="text-sm font-bold text-gray-500">No qualified teachers found</p>
                                <button 
                                    onClick={() => setActiveTab("all")}
                                    className="mt-2 text-xs text-brand-600 font-bold hover:underline"
                                >
                                    Browse all staff instead
                                </button>
                            </div>
                        )}
                        {qualifiedTeachers
                            .filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))
                            .map(teacher => (
                            <TeacherCard
                                key={teacher.id}
                                teacher={teacher}
                                isSelected={teacher.id === currentTeacherId}
                                onSelect={() => {
                                    if (teacher.id && teacher.name) {
                                        onSelect(teacher.id, teacher.name, "primary");
                                        onClose();
                                    }
                                }}
                            />
                        ))}
                    </>
                ) : (
                    <>
                        {loadingAll && <div className="text-center py-8 text-xs text-gray-400">Searching staff directory...</div>}
                        {allTeachers.map((teacher: any) => (
                            <TeacherCard
                                key={teacher.id}
                                teacher={teacher}
                                isSelected={teacher.id === currentTeacherId}
                                onSelect={() => {
                                    if (teacher.id && teacher.name) {
                                        onSelect(teacher.id, teacher.name, "primary");
                                        onClose();
                                    }
                                }}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    </>
  );
};

const TeacherCard: React.FC<{ teacher: any; isSelected: boolean; onSelect: () => void }> = ({ teacher, isSelected, onSelect }) => (
    <button
        onClick={onSelect}
        className={`w-full group flex items-start justify-between p-3 rounded-2xl border transition-all text-left ${
            isSelected 
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-lg shadow-brand-500/10" 
            : "border-gray-50 dark:border-white/5 bg-white dark:bg-white/5 hover:border-brand-200"
        }`}
    >
        <div className="flex items-start gap-3">
            <div className={`mt-0.5 size-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                isSelected ? "bg-brand-200 text-brand-700" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
            }`}>
                {teacher.name?.charAt(0)}
            </div>
            <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{teacher.name}</p>
                    {teacher.isQualified && (
                        <div className="text-[10px] font-bold text-success-600 bg-success-50 dark:bg-success-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                            <CheckLineIcon className="size-3" />
                            <span>Qualified</span>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col gap-0.5 mt-1">
                     <p className="text-xs text-gray-500">{teacher.email || "No email"}</p>
                     
                     <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        {teacher.employeeId && (
                             <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">
                                 {teacher.employeeId}
                             </span>
                        )}
                        {teacher.employmentStatus && (
                             <span className="uppercase tracking-wide font-medium">
                                 {teacher.employmentStatus}
                             </span>
                        )}
                     </div>
                     {teacher.department && (
                         <p className="text-[10px] text-brand-500 font-medium">
                             {teacher.department}
                         </p>
                     )}
                </div>
            </div>
        </div>
        {isSelected && <CheckCircleIcon className="size-5 text-brand-600 mt-0.5" />}
    </button>
);

export default TeacherAssignmentDrawer;
