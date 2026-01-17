import React, { useMemo, useState } from "react";
import { useTeacherCockpit } from "./TeacherCockpitContext";
import { useDiscoveryTree, useTeacherSubjects, useSubjects } from "../../../api/hooks/useAcademic";
import { DiscoveryTreeResponse, Subject, DiscoveryTreeLevel, DiscoveryTreeProgramStudy, DiscoveryTreeMajor, ClassSubject } from "../../../api/types/academic";
import { showSuccess, showError } from "../../../utils/toast";
import { 
    CheckCircleIcon, 
    SearchIcon, 
    GridIcon,
    ChevronDownIcon,
    FolderIcon,
    BoxIcon,
    GroupIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { motion, AnimatePresence } from "framer-motion";

// --- Recursive Tree Component ---

interface TreeProps {
  levels: DiscoveryTreeLevel[]; 
  onSelect: (node: { type: "level" | "program" | "major"; id: number | string; name: string }) => void;
  selectedNode: { type: string; id: number | string } | null;
  counts: Record<string, number>;
}


const SmoothExpand: React.FC<{ isExpanded: boolean; children: React.ReactNode }> = ({ isExpanded, children }) => {
    return (
        <AnimatePresence initial={false}>
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const TalentDiscoveryTree: React.FC<TreeProps> = ({ levels, onSelect, selectedNode, counts }) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => 
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  return (
    <div className="space-y-1">
      {levels.map((level) => {
        const levelKey = `level-${level.id}`;
        const isLevelExpanded = expandedNodes.includes(levelKey);
        const isLevelSelected = selectedNode?.type === "level" && String(selectedNode?.id) === String(level.id);

        return (
          <div key={levelKey}>
            <div 
              onClick={() => onSelect({ type: "level", id: level.id, name: level.name })}
              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm group transition-all duration-200 ${
                isLevelSelected 
                  ? "bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 dark:text-brand-400" 
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <GridIcon className={`size-4 shrink-0 ${isLevelSelected ? "text-brand-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                <span className="truncate">{level.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                 {counts[levelKey] !== undefined && (
                     <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 rounded-full">
                         {counts[levelKey]}
                     </span>
                 )}
                 {level.programStudies.length > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleNode(levelKey); }}
                    className={`p-1 rounded-lg hover:bg-gray-200/50 dark:hover:bg-white/10 transition-transform duration-200 ${isLevelExpanded ? "rotate-0" : "-rotate-90"}`}
                  >
                    <ChevronDownIcon className="size-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            
            <SmoothExpand isExpanded={isLevelExpanded}>
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-white/5 pl-2 pb-1">
                {level.programStudies.map((program: DiscoveryTreeProgramStudy) => {
                  const programKey = `program-${program.id}`;
                  const isProgramExpanded = expandedNodes.includes(programKey);
                  const isProgramSelected = selectedNode?.type === "program" && String(selectedNode?.id) === String(program.id);

                  return (
                    <div key={programKey}>
                      <div 
                        onClick={() => onSelect({ type: "program", id: program.id, name: program.name })}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-[13px] group transition-all ${
                          isProgramSelected 
                            ? "bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/10 dark:text-blue-400" 
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FolderIcon className={`size-3.5 shrink-0 ${isProgramSelected ? "text-blue-500" : "text-gray-400"}`} />
                          <span className="truncate">{program.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {counts[programKey] !== undefined && (
                                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 rounded-full">
                                    {counts[programKey]}
                                </span>
                            )}
                            {program.majors.length > 0 && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleNode(programKey); }}
                                className={`p-1 rounded transition-transform duration-200 ${isProgramExpanded ? "rotate-0" : "-rotate-90"}`}
                              >
                                <ChevronDownIcon className="size-3 text-gray-400 shadow-none" />
                              </button>
                            )}
                        </div>
                      </div>

                      <SmoothExpand isExpanded={isProgramExpanded}>
                        <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 dark:border-white/5 pl-2 pb-1">
                          {program.majors.map((major: DiscoveryTreeMajor) => {
                            const majorSelected = selectedNode?.type === "major" && String(selectedNode?.id) === String(major.id);
                            const majorKey = `major-${major.id}`;
                            return (
                              <div
                                key={majorKey}
                                onClick={() => onSelect({ type: "major", id: major.id, name: major.name })}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all ${
                                  majorSelected
                                    ? "text-brand-500 font-bold bg-brand-50/30 dark:bg-brand-500/5" 
                                    : "text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700"
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <BoxIcon className={`size-3 shrink-0 ${majorSelected ? "text-brand-500" : "text-gray-300"}`} />
                                    <span className="truncate">{major.name}</span>
                                </div>
                                {counts[majorKey] !== undefined && (
                                     <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 rounded-full shrink-0">
                                         {counts[majorKey]}
                                     </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </SmoothExpand>
                    </div>
                  );
                })}
              </div>
            </SmoothExpand>
          </div>
        );
      })}
    </div>
  );
};


const TalentProfileTab = () => {
    const { employeeDetails } = useTeacherCockpit();
    
    // -- Data Fetching --
    const { data: treeResponse, isLoading: isLoadingTree } = useDiscoveryTree();
    const tree = treeResponse as DiscoveryTreeResponse;

    const { 
        data: teacherSubjectsResponse, 
        createMutation, 
        deleteMutation
    } = useTeacherSubjects({
        teacherId: employeeDetails?.userId,
        limit: 1000
    });

    const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({ limit: 1000 });
    const allSubjects = useMemo(() => subjectsResponse?.data || [], [subjectsResponse]);
    
    // -- State --
    const [selectedNode, setSelectedNode] = useState<{ type: "level" | "program" | "major"; id: number | string; name: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // -- Derived Data: Assign/Unassign --
    // -- Derived Data: Assign/Unassign --
    const { activeSubjectIds, teacherSubjectMap } = useMemo(() => {
        const ids = new Set<string>();
        const map = new Map<string, any>(); // Using any because TeacherSubject type might need update
        if (teacherSubjectsResponse?.data) {
            teacherSubjectsResponse.data.forEach(ts => {
                const sId = String(ts.subjectId);
                ids.add(sId);
                map.set(sId, ts);
            });
        }
        return { activeSubjectIds: ids, teacherSubjectMap: map };
    }, [teacherSubjectsResponse]);

    // -- Derived Data: Subjects Grouping & Counts --
    const { subjectsByNode, counts } = useMemo(() => {
        const map = new Map<string, Subject[]>();
        const countMap: Record<string, number> = {};

        // Helper to add subject to a node key
        const addToKey = (key: string, subject: Subject) => {
            if (!map.has(key)) map.set(key, []);
            map.get(key)?.push(subject);
            countMap[key] = (countMap[key] || 0) + 1;
        };

        allSubjects.forEach(subject => {
             // Major Level
             if (subject.majorId) {
                 addToKey(`major-${subject.majorId}`, subject);
                 
                 // Find Program & Level for this major to aggregate counts
                 // This is expensive to search every time, but tree is small.
                 // Better approach: Pre-map majors to parent IDs.
             }
        });
        
        // Recalculate counts based on tree structure for parents
        if (tree?.levels) {
            tree.levels.forEach(level => {
                let levelCount = 0;
                level.programStudies.forEach((prog: DiscoveryTreeProgramStudy) => {
                    let progCount = 0;
                    prog.majors.forEach((major: DiscoveryTreeMajor) => {
                        const mCount = countMap[`major-${major.id}`] || 0;
                        progCount += mCount;
                    });
                    countMap[`program-${prog.id}`] = progCount;
                    levelCount += progCount;
                });
                countMap[`level-${level.id}`] = levelCount;
            });
        }

        return { subjectsByNode: map, counts: countMap };
    }, [allSubjects, tree]);

    // -- Selection Logic --
    // Auto-select first level if nothing selected
    useMemo(() => {
        if (!isLoadingTree && tree?.levels && tree.levels.length > 0 && !selectedNode) {
           setSelectedNode({ type: "level", id: tree.levels[0].id, name: tree.levels[0].name });
        }
    }, [tree, isLoadingTree, selectedNode]);

    // -- Filtered Subjects --
    const displayedSubjects = useMemo(() => {
        let subjects: Subject[] = [];
        
        if (selectedNode) {
             if (selectedNode.type === "major") {
                 subjects = subjectsByNode.get(`major-${selectedNode.id}`) || [];
             } else if (selectedNode.type === "program") {
                 // Aggregation for program
                 const level = tree?.levels.find(l => l.programStudies.some((p: any) => String(p.id) === String(selectedNode.id)));
                 const prog = level?.programStudies.find((p: any) => String(p.id) === String(selectedNode.id));
                 prog?.majors.forEach((m: any) => {
                     subjects.push(...(subjectsByNode.get(`major-${m.id}`) || []));
                 });
             } else if (selectedNode.type === "level") {
                 // Aggregation for level
                 const level = tree?.levels.find(l => String(l.id) === String(selectedNode.id));
                 level?.programStudies.forEach((p: any) => {
                     p?.majors.forEach((m: any) => {
                         subjects.push(...(subjectsByNode.get(`major-${m.id}`) || []));
                     });
                 });
             }
        }
        
        if (searchQuery) {
            subjects = subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return subjects;
    }, [selectedNode, subjectsByNode, searchQuery, tree]);

    // -- Handlers --
    const handleToggleSubject = async (subjectId: number | string) => {
        const subjectIdStr = String(subjectId);
        const isAssigned = activeSubjectIds.has(subjectIdStr);
        
        if (!isAssigned) {
            try {
                await createMutation.mutateAsync({
                    teacherId: employeeDetails?.userId || "",
                    subjectId: subjectId,
                    isActive: true
                });
                showSuccess("Subject assigned");
            } catch {
                showError("Failed to assign subject");
            }
        } else {
            const record = teacherSubjectsResponse?.data.find(ts => String(ts.subjectId) === subjectIdStr);
            if (record) {
                try {
                    await deleteMutation.mutateAsync(record.id);
                    showSuccess("Subject unassigned");
                } catch {
                    showError("Failed to unassign subject");
                }
            }
        }
    };

    if (isLoadingTree || isLoadingSubjects) {
        return <div className="p-12 flex justify-center"><div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full"/></div>;
    }

    return (
        <div className="flex flex-col lg:flex-row flex-1 bg-white dark:bg-gray-800 h-full">
            {/* Sidebar Filters */}
            <div className="w-full lg:w-80 border-r border-gray-100 dark:border-white/5 flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Subject Explorer</h3>
                    <p className="text-xs text-gray-500">Select a category to view subjects.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <TalentDiscoveryTree 
                        levels={tree?.levels || []} 
                        onSelect={setSelectedNode} 
                        selectedNode={selectedNode}
                        counts={counts}
                    />
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-h-[600px]">
                {/* Visual Header with Edit Button */}
                <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-transparent">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                             <h4 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                 {selectedNode?.name || "All Subjects"}
                             </h4>
                             <p className="text-sm text-gray-500 mt-1">
                                 Managing qualifications for <span className="font-medium text-gray-700 dark:text-gray-300">{selectedNode?.type || "category"}</span> level.
                             </p>
                        </div>

                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="relative flex-1">
                             <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                             <input 
                                 type="text" 
                                 placeholder={`Search in ${selectedNode?.name || "subjects"}...`}
                                 className="w-full pl-9 pr-4 py-2 text-sm bg-transparent outline-none text-gray-700 dark:text-white placeholder-gray-400"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                             />
                        </div>
                        <div className="pr-3 text-xs font-medium text-gray-400">
                            {displayedSubjects.length} subjects
                        </div>
                    </div>
                </div>

                {/* Subject Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/10">
                    {displayedSubjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-12">
                            <GridIcon className="size-16 mb-4 text-gray-300" />
                            <p className="font-medium text-gray-900 dark:text-white">No subjects found</p>
                            <p className="text-sm text-gray-500">Try selecting a different category or adjusting your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {displayedSubjects.map(subject => {
                                const isAssigned = activeSubjectIds.has(String(subject.id));
                                const teacherSubject = teacherSubjectMap.get(String(subject.id));
                                const assignedClasses = (teacherSubject?.subject as (Subject & { classSubjects: ClassSubject[] }) | undefined)?.classSubjects || [];
                                const classesCount = isAssigned ? assignedClasses.length : (subject.metrics?.classesCount || 0);

                                return (
                                    <motion.button
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        key={subject.id}
                                        onClick={() => handleToggleSubject(subject.id)}
                                        className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                                            isAssigned 
                                                ? "bg-white dark:bg-gray-800 border-brand-500 ring-2 ring-brand-500/20 shadow-md" 
                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-white/5 hover:border-brand-500/30 hover:shadow-lg hover:-translate-y-1"
                                        }`}
                                    >
                                        <div className="p-5 flex flex-col gap-5 w-full text-left">
                                            {/* Top Header: Code & Status */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest truncate">{subject.code}</span>
                                                        <span className="text-gray-300 dark:text-white/10 text-[8px] shrink-0">•</span>
                                                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 truncate">
                                                            {subject.grade?.name || "No Grade"}
                                                        </span>
                                                    </div>
                                                    <Badge color={isAssigned ? "success" : "light"} className="shrink-0 px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                                        {isAssigned ? "Assigned" : "Unassigned"}
                                                    </Badge>
                                                </div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight line-clamp-2" title={subject.name}>
                                                    {subject.name}
                                                </h3>

                                                {/* Assigned Classes List */}
                                                {isAssigned && assignedClasses.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {assignedClasses.slice(0, 3).map((cs: ClassSubject) => (
                                                            <span key={cs.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5 whitespace-nowrap">
                                                                {cs.class?.code || "Unknown Class"}
                                                            </span>
                                                        ))}
                                                        {assignedClasses.length > 3 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-50 dark:bg-white/5 text-gray-400 border border-gray-100 dark:border-white/5 whitespace-nowrap">
                                                                +{assignedClasses.length - 3}
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
                                                        {classesCount} Classes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Actions / Selection Indicator */}
                                        <div className={`px-5 py-3 border-t flex items-center justify-between transition-colors ${
                                            isAssigned 
                                                ? "bg-brand-50/50 border-brand-100 dark:bg-brand-500/5 dark:border-brand-500/20" 
                                                : "bg-gray-50/50 border-gray-100 dark:bg-white/[0.02] dark:border-white/5"
                                        }`}>
                                            <span className={`text-[10px] font-medium transition-colors ${isAssigned ? "text-brand-600 dark:text-brand-400" : "text-gray-400"}`}>
                                                {isAssigned ? "Click to unassign" : "Click to assign"}
                                            </span>
                                            <div className={`transition-all duration-300 ${isAssigned ? "text-brand-500 scale-110" : "text-gray-300 group-hover:text-brand-300"}`}>
                                                <CheckCircleIcon className="size-5" />
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TalentProfileTab;
