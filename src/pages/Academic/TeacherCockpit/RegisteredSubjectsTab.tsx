import { useMemo, useState, useEffect } from "react";
import { useTeacherCockpit } from "./TeacherCockpitContext";
import { useGroupedTeacherSubjects, useTeacherSubjects } from "../../../api/hooks/useAcademic";
import { 
    SearchIcon, 
    DocsIcon,
    TrashBinIcon,
    GridIcon,
    ChevronDownIcon,
    FolderIcon,
    GroupIcon
} from "../../../components/atoms/Icons";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog"; 
import { motion, AnimatePresence } from "framer-motion";
import Badge from "../../../components/atoms/Badge";

interface GroupedSubjectItem {
    id: number | string;
    name: string;
    code: string;
    teacherSubjectId: number | string;
    gradeName?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignedClasses?: any[];
    metrics?: { classesCount: number };
}

const RegisteredSubjectsTab = () => {
    const { employeeDetails } = useTeacherCockpit();
    const { 
        data: groupedResponse, 
        isLoading,
        refetch 
    } = useGroupedTeacherSubjects(employeeDetails?.userId);

    const { deleteMutation } = useTeacherSubjects(); 
    const { confirm, confirmState } = useConfirm();

    // -- State --
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNode, setSelectedNode] = useState<{ type: "all" | "level" | "major" | "grade"; id: number | string; name: string } | null>({ type: "all", id: "all", name: "All Qualifications" });
    const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
    
    // -- Expand Logic --
    const toggleNode = (nodeId: string) => {
        setExpandedNodes((prev) => 
            prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
        );
    };

    // Auto-expand all levels initially
    useEffect(() => {
        if (groupedResponse) {
            const allIds = groupedResponse.map(l => `level-${l.educationLevel.id}`);
            setExpandedNodes(prev => [...new Set([...prev, ...allIds])]);
        }
    }, [groupedResponse]);


    // -- Flattened Subjects for Grid based on Selection --
    const displayedSubjects = useMemo(() => {
        if (!groupedResponse) return [];

        let subjects: GroupedSubjectItem[] = [];

        // Flatten everything first to a common list
        const allSubjects: GroupedSubjectItem[] = [];
        groupedResponse.forEach(level => {
            // Majors
            level.majors.forEach(m => {
                m.grades.forEach(g => {
                    const subjectItems = g.subjects as unknown as any[];
                     subjectItems.forEach(s => {
                        s.gradeName = g.grade.name;
                        s.assignedClasses = s.classSubjects || s.subject?.classSubjects || [];
                    });
                    allSubjects.push(...(subjectItems as GroupedSubjectItem[]));
                });
            });
            // General Grades
            level.grades.forEach(g => {
                const subjectItems = g.subjects as unknown as any[];
                 subjectItems.forEach(s => {
                    s.gradeName = g.grade.name;
                    s.assignedClasses = s.classSubjects || s.subject?.classSubjects || [];
                });
                allSubjects.push(...(subjectItems as GroupedSubjectItem[]));
            });
        });

        // Filter by Node
        if (selectedNode?.type === "all") {
            subjects = allSubjects;
        } else if (selectedNode?.type === "level") {
            const level = groupedResponse.find(l => String(l.educationLevel.id) === String(selectedNode.id));
            if (level) {
                 level.majors.forEach(m => {
                     m.grades.forEach(g => subjects.push(...(g.subjects as unknown as GroupedSubjectItem[])));
                 });
                 level.grades.forEach(g => subjects.push(...(g.subjects as unknown as GroupedSubjectItem[])));
            }
        } else if (selectedNode?.type === "major") {
             // Find in all levels
             groupedResponse.forEach(level => {
                 const major = level.majors.find(m => String(m.major.id) === String(selectedNode.id));
                 if (major) {
                     major.grades.forEach(g => subjects.push(...(g.subjects as unknown as GroupedSubjectItem[])));
                 }
             });
        }

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            subjects = subjects.filter(ts => 
                ts.name?.toLowerCase().includes(q) || 
                ts.code?.toLowerCase().includes(q)
            );
        }

        return subjects;
    }, [groupedResponse, selectedNode, searchQuery]);


    const handleUnassign = async (teacherSubjectId: number | string, subjectName: string) => {
        const ok = await confirm({
            variant: "delete",
            title: "Unassign Subject",
            message: `Are you sure you want to remove qualification for "${subjectName}"?`
        });

        if (ok) {
            try {
                // Use teacherSubjectId for deletion
                await deleteMutation.mutateAsync(teacherSubjectId);
                showSuccess("Subject unassigned successfully");
                refetch();
            } catch {
                showError("Failed to unassign subject");
            }
        }
    };

    if (isLoading) {
        return <div className="p-12 flex justify-center"><div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full"/></div>;
    }

    return (
        <div className="flex flex-col lg:flex-row h-full bg-white dark:bg-gray-800 overflow-hidden">
            
            {/* --- SIDEBAR --- */}
            <div className="w-full lg:w-80 border-r border-gray-100 dark:border-white/5 flex flex-col bg-gray-50/30 dark:bg-gray-900/30 hidden lg:flex">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-0.5">
                         <h3 className="font-bold text-gray-900 dark:text-white text-lg">Qualifications</h3>
                    </div>
                    <p className="text-xs text-gray-500">Filter your assigned subjects</p>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar space-y-1">
                    {/* All Option */}
                     <button 
                        onClick={() => setSelectedNode({ type: "all", id: "all", name: "All Qualifications" })}
                        className={`flex items-center justify-between w-full p-2.5 rounded-xl mb-1 transition-all duration-200 group text-left text-sm ${
                            selectedNode?.type === 'all'
                                ? 'bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 dark:text-brand-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                             <DocsIcon className={`size-4 shrink-0 ${selectedNode?.type === 'all' ? 'text-brand-500' : 'text-gray-400'}`} />
                             <span>All Subjects</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 rounded-full">
                           {/* Total count could be calculated here but keeping it simple */}
                        </span>
                    </button>

                    <div className="h-px w-full bg-gray-200 dark:bg-white/10 my-2" />

                    {groupedResponse?.map((level) => {
                        const levelId = `level-${level.educationLevel.id}`;
                        const isExpanded = expandedNodes.includes(levelId);
                        const isSelected = selectedNode?.type === 'level' && String(selectedNode.id) === String(level.educationLevel.id);

                        return (
                            <div key={levelId}>
                                <button 
                                    onClick={() => {
                                        setSelectedNode({ type: "level", id: level.educationLevel.id, name: level.educationLevel.name });
                                        toggleNode(levelId);
                                    }}
                                    className={`flex items-center justify-between w-full p-2.5 rounded-xl mb-1 transition-all duration-200 group text-left text-sm ${
                                        isSelected
                                            ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-500/10 dark:text-blue-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                         <GridIcon className={`size-4 shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                                         <span className="truncate">{level.educationLevel.name}</span>
                                    </div>
                                    <div className={`p-1 rounded transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}>
                                        <ChevronDownIcon className="size-3 text-gray-400" />
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-white/5 pl-2 pb-1">
                                                {level.majors.map(major => {
                                                    const majorSelected = selectedNode?.type === 'major' && String(selectedNode.id) === String(major.major.id);
                                                    return (
                                                        <button 
                                                            key={major.major.id}
                                                            onClick={() => setSelectedNode({ type: "major", id: major.major.id, name: major.major.name })}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-[13px] group transition-all w-full text-left ${
                                                                majorSelected
                                                                    ? 'text-brand-500 font-bold bg-brand-50/30 dark:bg-brand-500/5'
                                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <FolderIcon className={`size-3.5 shrink-0 ${majorSelected ? 'text-brand-500' : 'text-gray-400'}`} />
                                                                <span className="truncate">{major.major.name}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {level.grades.length > 0 && (
                                                     <div className="p-2 text-xs text-gray-400 italic">
                                                         + {level.grades.length} distinct grades
                                                     </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-h-[600px]">
                 {/* Visual Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-transparent">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                             <h4 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                 {selectedNode?.name}
                             </h4>
                             <p className="text-sm text-gray-500 mt-1">
                                 Showing {displayedSubjects.length} qualified subjects
                             </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="relative flex-1">
                             <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                             <input 
                                 type="text" 
                                 placeholder={`Search in ${selectedNode?.name}...`}
                                 className="w-full pl-9 pr-4 py-2 text-sm bg-transparent outline-none text-gray-700 dark:text-white placeholder-gray-400"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                             />
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/10">
                    {displayedSubjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                             <DocsIcon className="size-16 text-gray-300 mb-4" />
                             <p className="font-medium text-gray-900 dark:text-white">No qualifications found</p>
                             <p className="text-sm text-gray-500">
                                {searchQuery ? "No subjects match your search." : "Try selecting a different category."}
                             </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {displayedSubjects.map(ts => (
                                <SubjectCard key={ts.teacherSubjectId} ts={ts} onUnassign={handleUnassign} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <ConfirmDialog {...confirmState} />
        </div>
    );
};

// --- Modern Subject Card (Responsive) ---
const SubjectCard = ({ ts, onUnassign }: { ts: GroupedSubjectItem, onUnassign: (id: number | string, name: string) => void }) => {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-gray-800 hover:border-brand-500/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default overflow-hidden"
        >
            <div className="p-5 flex flex-col gap-5 w-full text-left">
                {/* Top Header: Code & Status */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest truncate">{ts.code}</span>
                            <span className="text-gray-300 dark:text-white/10 text-[8px] shrink-0">•</span>
                            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 truncate">
                                {ts.gradeName || "No Grade"}
                            </span>
                        </div>
                        <Badge color="success" className="shrink-0 px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                            Assigned
                        </Badge>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight line-clamp-2" title={ts.name}>
                        {ts.name}
                    </h3>

                    {/* Assigned Classes List */}
                    {ts.assignedClasses && ts.assignedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {ts.assignedClasses.slice(0, 3).map((cs: any) => (
                                <span key={cs.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5 whitespace-nowrap">
                                    {cs.class?.code || "Unknown Class"}
                                </span>
                            ))}
                            {ts.assignedClasses.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-50 dark:bg-white/5 text-gray-400 border border-gray-100 dark:border-white/5 whitespace-nowrap">
                                    +{ts.assignedClasses.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Metrics Stats */}
                <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                        <GroupIcon className="size-3 text-blue-500/80" />
                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                             {ts.assignedClasses?.length || ts.metrics?.classesCount || 0} Classes
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3 border-t bg-gray-50/50 border-gray-100 dark:bg-white/[0.02] dark:border-white/5 flex items-center justify-between transition-colors">
                <span className="text-[10px] font-medium text-gray-400">
                    Click bin to unassign
                </span>
                <button 
                    onClick={() => onUnassign(ts.teacherSubjectId, ts.name)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                    title="Remove Qualification"
                >
                    <TrashBinIcon className="size-4" />
                </button>
            </div>
        </motion.div>
    );
};

export default RegisteredSubjectsTab;
