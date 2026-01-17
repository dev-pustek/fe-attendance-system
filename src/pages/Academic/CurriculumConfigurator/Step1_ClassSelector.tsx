import React, { useState, useEffect } from "react";
import { useDiscoveryTree, useClassSubjects } from "../../../api/hooks/useAcademic";
import { useCurriculumWizardStore, TeacherAssignmentDraft } from "../../../store/curriculumWizardStore";
import { 
  SearchIcon, ChevronDownIcon, GroupIcon, CheckCircleIcon,
  DocsIcon, FolderIcon, ArrowRightIcon
} from "../../../components/atoms/Icons";
import ComponentCard from "../../../components/molecules/ComponentCard";

const Step1_ClassSelector: React.FC = () => {
  const { data: tree, isLoading } = useDiscoveryTree();
  const { selectedClassId, setClass, setSubjects, setTeacherAssignments, setSubjectConfigs, setStep } = useCurriculumWizardStore();
  const [search, setSearch] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Automatically fetch already assigned subjects when a class is selected
  const { data: existingSubjectsResponse } = useClassSubjects({
    classId: selectedClassId || undefined,
    limit: 100
  });

  useEffect(() => {
    if (selectedClassId && existingSubjectsResponse?.data) {
      const data = existingSubjectsResponse.data;
      const existingIds = data.map(cs => cs.subjectId);
      
      if (existingIds.length > 0) {
        setSubjects(existingIds);
        
        // Map configs (units)
        const configs: Record<string, any> = {};
        data.forEach(cs => {
            if (cs.plannedTotalUnits || cs.plannedUnitsPerWeek) {
                configs[String(cs.subjectId)] = {
                    plannedTotalUnits: cs.plannedTotalUnits || 0,
                    plannedUnitsPerWeek: cs.plannedUnitsPerWeek || 0
                };
            }
        });
        setSubjectConfigs(configs);

        // Map assignments
        const existingAssignments: TeacherAssignmentDraft[] = [];
        data.forEach(cs => {
          if (cs.teachingAssignments && cs.teachingAssignments.length > 0) {
            cs.teachingAssignments.forEach(ta => {
              existingAssignments.push({
                subjectId: cs.subjectId,
                subjectName: cs.subject?.name || "",
                teacherId: ta.teacherId,
                teacherName: ta.teacher?.name || "",
                teacherEmail: ta.teacher?.email || "",
                role: ta.role
              });
            });
          }
        });

        if (existingAssignments.length > 0) {
           setTeacherAssignments(existingAssignments);
        }
      }
    }
  }, [selectedClassId, existingSubjectsResponse, setSubjects, setTeacherAssignments, setSubjectConfigs]);

  const toggleExpand = (id: string, force?: boolean) => {
    const next = new Set(expandedNodes);
    const shouldExpand = force !== undefined ? force : !next.has(id);
    
    if (shouldExpand) next.add(id);
    else next.delete(id);
    
    setExpandedNodes(next);
  };

  // Auto-expand search results
  useEffect(() => {
    if (search && tree) {
      const toExpand = new Set<string>();
      tree.levels.forEach(lvl => {
        let hasMatchInLevel = false;
        lvl.programStudies.forEach(ps => {
            let hasMatchInPs = false;
            ps.majors.forEach(mj => {
                const matchesMajor = mj.name.toLowerCase().includes(search.toLowerCase());
                const matchingClasses = mj.classes?.filter(c => 
                    c.name.toLowerCase().includes(search.toLowerCase()) || 
                    c.code.toLowerCase().includes(search.toLowerCase())
                );
                
                if (matchesMajor || (matchingClasses && matchingClasses.length > 0)) {
                    toExpand.add(`mj-${mj.id}`);
                    hasMatchInPs = true;
                }
            });
            
            if (ps.name.toLowerCase().includes(search.toLowerCase()) || hasMatchInPs) {
                toExpand.add(`ps-${ps.id}`);
                hasMatchInLevel = true;
            }
        });
        
        if (hasMatchInLevel) {
            toExpand.add(`lvl-${lvl.id}`);
        }
      });
      setExpandedNodes(toExpand);
    }
  }, [search, tree]);


  // Filtering logic
  const filteredTree = React.useMemo(() => {
    if (!tree) return null;
    if (!search) return tree;

    const lowerSearch = search.toLowerCase();
    
    // Deep clone to avoid mutating original data (or map to new structure)
    const newLevels = tree.levels.map(lvl => {
      const newProgramStudies = lvl.programStudies.map(ps => {
         const newMajors = ps.majors.map(mj => {
            const matchingClasses = mj.classes?.filter(c => 
                c.name.toLowerCase().includes(lowerSearch) || 
                c.code.toLowerCase().includes(lowerSearch)
            );
            const isMajorMatch = mj.name.toLowerCase().includes(lowerSearch);
            
            // If major matches, keep all classes? Or just matching?
            // User likely wants to find specific classes or majors.
            // Be strict: Show classes that match OR show all classes if Major matches.
            // Let's go with: Show matching classes. If Major matches, show all classes (as context).
            const finalClasses = isMajorMatch ? mj.classes : matchingClasses;
            
            if (isMajorMatch || (finalClasses && finalClasses.length > 0)) {
                return { ...mj, classes: finalClasses };
            }
            return null;
         }).filter(Boolean) as typeof ps.majors;

         const isPsMatch = ps.name.toLowerCase().includes(lowerSearch);
         
         // If PS matches, should we show all majors? 
         // Let's recursively show matches. If PS match, we still filter inside to be helpful?
         // Simpler: If PS matches, show all its majors/classes? 
         // Usually better to still filter children to reduce noise, unless user expressly opened a "matched" folder.
         // Let's stick to "path to match".
         if (isPsMatch || newMajors.length > 0) {
             return { ...ps, majors: newMajors.length > 0 ? newMajors : ps.majors }; 
         }
         return null;
      }).filter(Boolean) as typeof lvl.programStudies;

      if (lvl.name.toLowerCase().includes(lowerSearch) || newProgramStudies.length > 0) {
          return { ...lvl, programStudies: newProgramStudies.length > 0 ? newProgramStudies : lvl.programStudies };
      }
      return null;
    }).filter(Boolean) as typeof tree.levels;

    return { ...tree, levels: newLevels };
  }, [tree, search]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ComponentCard title="Discovery Tree" desc="Browse and select a class to configure its curriculum">
            <div className="mb-6 relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Search classes, majors, or program studies..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-gray-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="space-y-4 pb-10">
                {filteredTree?.levels.map((level) => (
                    <div key={level.id} className="group/level">
                        <button 
                            onClick={() => toggleExpand(`lvl-${level.id}`)}
                            className={`flex w-full items-center gap-3 p-3 rounded-xl transition-all border ${
                                expandedNodes.has(`lvl-${level.id}`)
                                ? "bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 shadow-sm"
                                : "bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                            }`}
                        >
                            <div className={`p-1.5 rounded-lg transition-colors ${
                                expandedNodes.has(`lvl-${level.id}`) ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400 group-hover/level:bg-white"
                            }`}>
                                <FolderIcon className="size-4" />
                            </div>
                            <span className="flex-1 text-left text-sm font-bold text-gray-800 dark:text-gray-200">{level.name}</span>
                            
                            {/* Count Badge */}
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                {level.programStudies.length}
                            </span>

                            <ChevronDownIcon className={`size-4 text-gray-400 transition-transform ${expandedNodes.has(`lvl-${level.id}`) ? "rotate-180" : ""}`} />
                        </button>
                        
                        {(expandedNodes.has(`lvl-${level.id}`) || search) && (
                            <div className="ml-5 pl-5 border-l-2 border-gray-100 dark:border-white/5 space-y-3 mt-2">
                                {level.programStudies.map((ps) => (
                                    <div key={ps.id} className="group/ps">
                                         <button 
                                            onClick={() => toggleExpand(`ps-${ps.id}`)}
                                            className={`flex w-full items-center gap-3 p-2 rounded-lg transition-all ${
                                                expandedNodes.has(`ps-${ps.id}`)
                                                ? "text-brand-600"
                                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            <DocsIcon className={`size-4 opacity-70 ${expandedNodes.has(`ps-${ps.id}`) ? "text-brand-500" : "text-gray-400"}`} />
                                            <span className="flex-1 text-left text-sm font-semibold">{ps.name}</span>
                                            
                                            {/* Count Badge */}
                                            <span className="ml-2 size-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {ps.majors.length}
                                            </span>

                                            <ChevronDownIcon className={`size-3 opacity-50 transition-transform ${expandedNodes.has(`ps-${ps.id}`) ? "rotate-180" : ""}`} />
                                        </button>
                                        
                                        {(expandedNodes.has(`ps-${ps.id}`) || search) && (
                                            <div className="ml-4 pl-4 border-l-2 border-gray-50 dark:border-white/5 space-y-3 mt-2">
                                                {ps.majors.map((major) => (
                                                    <div key={major.id} className="group/major">
                                                        <button 
                                                            onClick={() => toggleExpand(`mj-${major.id}`)}
                                                            className="flex w-full items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                                                        >
                                                            <div className="size-1.5 rounded-full bg-gray-300 group-hover/major:bg-brand-400 transition-colors" />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover/major:text-brand-600 transition-colors">{major.name}</span>
                                                            <span className="ml-auto text-[10px] text-gray-400 font-medium">{major.classes?.length || 0} classes</span>
                                                        </button>
                                                        
                                                        {(expandedNodes.has(`mj-${major.id}`) || search) && (
                                                            <div className="pl-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {major.classes?.map((cls) => (
                                                                    <button
                                                                        key={cls.id}
                                                                        onClick={() => setClass(cls.id, cls.name)}
                                                                        className={`relative group/card flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                                                                            selectedClassId === cls.id 
                                                                            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-md shadow-brand-500/10" 
                                                                            : "border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-brand-200 dark:hover:border-brand-500/30 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/50 hover:-translate-y-0.5"
                                                                        }`}
                                                                    >
                                                                        <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center transition-colors ${
                                                                            selectedClassId === cls.id 
                                                                            ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300"
                                                                            : "bg-gray-100 text-gray-400 group-hover/card:bg-brand-50 group-hover/card:text-brand-500 dark:bg-white/10"
                                                                        }`}>
                                                                            <GroupIcon className="size-4" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className={`text-sm font-bold transition-colors ${
                                                                                selectedClassId === cls.id ? "text-brand-700 dark:text-brand-300" : "text-gray-900 dark:text-white"
                                                                            }`}>
                                                                                {cls.name}
                                                                            </p>
                                                                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{cls.code}</p>
                                                                        </div>
                                                                        {selectedClassId === cls.id && (
                                                                            <div className="absolute top-3 right-3 text-brand-600 animate-scale-in">
                                                                                <CheckCircleIcon className="size-5" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                                {(!major.classes || major.classes.length === 0) && (
                                                                    <div className="col-span-full py-4 text-center text-xs text-gray-400 italic">
                                                                        No active classes found in this major.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </ComponentCard>
      </div>

      <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
              <ComponentCard title="Summary" desc="Selection Progress">
                  <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Target Class</p>
                          {selectedClassId ? (
                              <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600">
                                      <GroupIcon className="size-5" />
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-brand-900 dark:text-white">
                                          {useCurriculumWizardStore.getState().selectedClassName}
                                      </p>
                                      <p className="text-xs text-brand-600/70 dark:text-brand-400">Ready to configure</p>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex items-center gap-3 opacity-50">
                                  <div className="size-10 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse" />
                                  <div className="space-y-2">
                                      <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                                      <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                                  </div>
                              </div>
                          )}
                      </div>

                      <button
                        disabled={!selectedClassId}
                        onClick={() => setStep(2)}
                        className={`group w-full py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-between ${
                            selectedClassId 
                            ? "bg-brand-600 text-white shadow-xl shadow-brand-600/20 hover:bg-brand-700 hover:scale-[1.02] active:scale-[0.98]" 
                            : "bg-gray-100 text-gray-400 dark:bg-white/5 cursor-not-allowed border border-transparent"
                        }`}
                      >
                          <span>Continue</span>
                          <ArrowRightIcon className={`size-5 transition-transform ${selectedClassId ? "group-hover:translate-x-1" : ""}`} />
                      </button>
                  </div>
              </ComponentCard>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 text-white relative overflow-hidden group shadow-2xl shadow-brand-600/20">
                  <div className="absolute -right-8 -bottom-8 size-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                  <div className="absolute left-0 top-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 relative z-10">
                      <DocsIcon className="size-5 text-white" />
                  </div>
                  
                  <p className="text-lg font-bold mb-2 relative z-10">Pro Tip 💡</p>
                  <p className="text-xs leading-relaxed opacity-90 relative z-10 font-medium">
                      The hierarchy helps you find classes faster. You can assign the same curriculum to multiple classes later using the "Copy from Class" feature in the next step.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Step1_ClassSelector;
