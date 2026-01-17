import React, { useState, useMemo } from "react";
import {
  useSubjects,
  useClasses,
  useClassSubjects,
} from "../../../api/hooks/useAcademic";
import { useCurriculumWizardStore } from "../../../store/curriculumWizardStore";
import { useDebounce } from "../../../hooks/useDebounce";
import {
  PlusIcon,
  CloseIcon,
  CopyIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  SearchIcon,
  DocsIcon,
} from "../../../components/atoms/Icons";
import ComponentCard from "../../../components/molecules/ComponentCard";
import Modal from "../../../components/molecules/Modal";

const Step2_SubjectMixer: React.FC = () => {
  const { 
    selectedClassName, 
    selectedSubjectIds, 
    toggleSubject, 
    setSubjects, 
    setStep,
    teacherAssignments,
    setTeacherAssignments,
    subjectConfigs,
    setSubjectConfig
  } = useCurriculumWizardStore();
  const { data: allSubjects, isLoading: loadingAll } = useSubjects({
    limit: 100,
  });
  const [search, setSearch] = useState("");

  const availableSubjects = useMemo(() => {
    return (
      allSubjects?.data.filter((s) => !selectedSubjectIds.includes(s.id)) || []
    );
  }, [allSubjects, selectedSubjectIds]);

  const assignedSubjects = useMemo(() => {
    return (
      allSubjects?.data.filter((s) => selectedSubjectIds.includes(s.id)) || []
    );
  }, [allSubjects, selectedSubjectIds]);

  const filteredAvailable = availableSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  /* Copy From Class Setup */
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourceClassSearch, setSourceClassSearch] = useState("");
  const debouncedClassSearch = useDebounce(sourceClassSearch, 300);
  const { data: classesResponse, isLoading: loadingClasses } = useClasses({
    search: debouncedClassSearch,
    isActive: true,
    limit: 20,
  });

  const [selectedSourceClassId, setSelectedSourceClassId] = useState<
    string | number | null
  >(null);

  const { data: sourceSubjectsResponse } = useClassSubjects({
    classId: selectedSourceClassId || undefined,
    limit: 100,
  });

  const handleCopySubjects = () => {
    if (!sourceSubjectsResponse?.data) return;

    const newSubjects = sourceSubjectsResponse.data.map((cs) => cs.subjectId);
    
    // Extract teacher assignments
    const newAssignments = sourceSubjectsResponse.data.map(cs => {
       const teacher = cs.teachingAssignments?.find(t => t.isActive)?.teacher;
       if (!teacher) return null;
       
       return {
         subjectId: cs.subjectId,
         subjectName: cs.subject?.name || "",
         teacherId: teacher.public_id, // Ensure using public_id as per API response
         teacherName: teacher.name,
         teacherEmail: teacher.email,
         role: "primary"
       };
    }).filter(Boolean);

    // Merge unique subjects
    const mergedSubjects = Array.from(new Set([...selectedSubjectIds, ...newSubjects]));
    setSubjects(mergedSubjects);

    // Merge assignments (Prioritize new ones)
    if (newAssignments.length > 0) {
        // Remove existing assignments for the subjects we are importing (to overwrite)
        const relevantSubjectIds = new Set(newAssignments.map(a => a?.subjectId));
        const filteredExisting = teacherAssignments.filter(ta => !relevantSubjectIds.has(ta.subjectId));
        
        // Combine
        setTeacherAssignments([...filteredExisting, ...newAssignments] as any);
    }
    
    // Update Subject Configs (Units)
    sourceSubjectsResponse.data.forEach(cs => {
        if (cs.plannedTotalUnits || cs.plannedUnitsPerWeek) {
            setSubjectConfig(cs.subjectId, {
                plannedTotalUnits: cs.plannedTotalUnits || 0,
                plannedUnitsPerWeek: cs.plannedUnitsPerWeek || 0
            });
        }
    });

    setIsCopyModalOpen(false);
    setSelectedSourceClassId(null);
    setSourceClassSearch("");
  };

  const handleAddAll = () => {
    const allIds = allSubjects?.data.map((s) => s.id) || [];
    setSubjects(allIds);
  };

  const handleRemoveAll = () => {
    setSubjects([]);
  };

  if (loadingAll) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.03] p-6 rounded-3xl border border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
            <DocsIcon className="size-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
              Configuring Curriculum for
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">
              {selectedClassName}
            </h2>
          </div>
        </div>
        <button
          onClick={() => setIsCopyModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
        >
          <CopyIcon className="size-4" />
          Copy from Another Class
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Available Subjects */}
        <ComponentCard
          title="Available Subjects"
          desc="Select subjects to add to the class curriculum"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or name..."
                className="w-full pl-11 pr-4 py-2 text-sm rounded-xl border border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {availableSubjects.length > 0 && (
              <button
                onClick={handleAddAll}
                className="px-4 py-2 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors whitespace-nowrap"
              >
                Add All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {filteredAvailable.map((s) => (
              <div
                key={s.id}
                onClick={() => toggleSubject(s.id)}
                className="group flex items-center justify-between p-3 rounded-xl border border-gray-50 dark:border-white/5 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tighter">
                    {s.code}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {s.name}
                  </p>
                </div>
                <div className="size-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm">
                  <PlusIcon className="size-4" />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        {/* Assigned Bucket */}
        <ComponentCard
          title="Class Curriculum"
          desc={`${selectedSubjectIds.length} subjects currently assigned`}
        >
          <div className="flex justify-end mb-4">
            {selectedSubjectIds.length > 0 && (
              <button
                onClick={handleRemoveAll}
                className="px-4 py-2 text-xs font-bold text-error-600 bg-error-50 hover:bg-error-100 rounded-xl transition-colors"
              >
                Remove All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin">
            {assignedSubjects.map((s) => {
               const assignment = teacherAssignments.find(ta => ta.subjectId === s.id && ta.teacherName);
               const config = subjectConfigs[String(s.id)] || { plannedTotalUnits: 0, plannedUnitsPerWeek: 0 };

               return (
                  <div
                    key={s.id}
                    className="flex items-start justify-between p-3 rounded-xl border border-brand-100 bg-brand-50/50 dark:border-brand-500/20 dark:bg-brand-500/5 transition-all gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-tighter">
                        {s.code}
                      </p>
                      <p className="text-[11px] text-brand-600/70 dark:text-brand-400/70 font-medium truncate">
                        {s.name}
                      </p>
                      {assignment && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="size-4 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[8px] font-bold text-brand-600 border border-brand-200 dark:border-white/10">
                                {assignment.teacherName?.charAt(0)}
                            </div>
                            <span className="text-[10px] font-medium text-brand-600/80 dark:text-brand-400 truncate max-w-[120px]">
                                {assignment.teacherName}
                            </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Unit Inputs */}
                    <div className="flex items-center gap-2">
                        <div className="w-16">
                            <input 
                                type="number" 
                                placeholder="Total"
                                value={config.plannedTotalUnits || ""}
                                onChange={(e) => setSubjectConfig(s.id, { plannedTotalUnits: Number(e.target.value) })}
                                className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-brand-200 dark:border-brand-500/30 bg-white dark:bg-white/10 outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                            <p className="text-[9px] text-center mt-0.5 text-brand-600/60 dark:text-brand-400/60 font-medium">Total</p>
                        </div>
                        <div className="w-14">
                            <input 
                                type="number" 
                                placeholder="Week"
                                value={config.plannedUnitsPerWeek || ""}
                                onChange={(e) => setSubjectConfig(s.id, { plannedUnitsPerWeek: Number(e.target.value) })}
                                className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-brand-200 dark:border-brand-500/30 bg-white dark:bg-white/10 outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                            <p className="text-[9px] text-center mt-0.5 text-brand-600/60 dark:text-brand-400/60 font-medium">Week</p>
                        </div>
                    </div>

                    <button
                      onClick={() => toggleSubject(s.id)}
                      className="size-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-error-500 hover:bg-error-500 hover:text-white transition-all shadow-sm border border-brand-100/50 dark:border-brand-500/10 shrink-0"
                    >
                      <CloseIcon className="size-4" />
                    </button>
                  </div>
               );
            })}
          </div>
        </ComponentCard>
      </div>

      {/* Copy From Class Modal */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        className="max-w-md"
        title="Copy Curriculum"
        description="Select a class to copy its subject configuration from."
        footer={
           <div className="flex justify-end gap-3 w-full">
               <button 
                onClick={() => setIsCopyModalOpen(false)} 
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
               >
                Cancel
               </button>
               <button 
                disabled={!selectedSourceClassId}
                onClick={handleCopySubjects} 
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                {selectedSourceClassId && sourceSubjectsResponse?.data
                    ? `Import Subjects (${sourceSubjectsResponse.data.length})`
                    : "Import Subjects"}
               </button>
           </div>
        }
      >
        <div className="space-y-4">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                    type="text"
                    autoFocus
                    placeholder="Search class to copy..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={sourceClassSearch}
                    onChange={(e) => {
                        setSourceClassSearch(e.target.value);
                        setSelectedSourceClassId(null);
                    }}
                />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingClasses && (
                    <div className="text-center py-4 text-xs text-gray-400">
                        Loading classes...
                    </div>
                )}
                
                {/* Class List */}
                {!selectedSourceClassId && !loadingClasses && classesResponse?.data.map((c: any) => (
                    <button
                        key={c.id}
                        onClick={() => {
                        setSourceClassSearch(c.name);
                        setSelectedSourceClassId(c.id);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-left border border-transparent hover:bg-gray-50 transition-all text-gray-600 hover:text-gray-900 group"
                    >
                        <span className="text-sm font-bold">{c.name}</span>
                        <span className="text-xs bg-gray-100 group-hover:bg-white px-2 py-1 rounded-md transition-colors">
                        {c.code}
                        </span>
                    </button>
                ))}

                {/* Selected Class Preview - List Subjects with Teachers */}
                {selectedSourceClassId && (
                     <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 uppercase font-bold tracking-wider px-1">
                            <span>Subjects Preview</span>
                            <button 
                                onClick={() => { setSelectedSourceClassId(null); setSourceClassSearch(""); }}
                                className="text-brand-600 hover:text-brand-700"
                            >
                                Change Class
                            </button>
                        </div>
                        
                        {sourceSubjectsResponse?.data?.length === 0 ? (
                             <div className="text-center py-8 text-sm text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                This class has no subjects assigned.
                             </div>
                        ) : (
                            sourceSubjectsResponse?.data.map((cs) => {
                                // Find primary teacher
                                const teacher = cs.teachingAssignments?.find(t => t.isActive)?.teacher;
                                
                                return (
                                    <div key={cs.id} className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                {cs.subject?.name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-mono">
                                                {cs.subject?.code}
                                            </p>
                                        </div>
                                        {teacher && (
                                            <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-white/10 px-2 py-1 rounded-md border border-gray-100 dark:border-white/5">
                                                <div className="size-4 rounded-full bg-brand-100 flex items-center justify-center text-[8px] font-bold text-brand-600">
                                                    {teacher.name?.charAt(0)}
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 max-w-[80px] truncate">
                                                    {teacher.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                     </div>
                )}
            </div>
        </div>
      </Modal>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-gray-100 dark:border-white/5">
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
        >
          <ChevronLeftIcon className="size-5" />
          Back
        </button>

        <button
          disabled={selectedSubjectIds.length === 0}
          onClick={() => setStep(3)}
          className={`flex items-center gap-2 px-12 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg ${
            selectedSubjectIds.length > 0
              ? "bg-brand-600 text-white shadow-brand-600/20 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 dark:bg-white/5 cursor-not-allowed"
          }`}
        >
          Next: Assign Teachers
          <ArrowRightIcon className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default Step2_SubjectMixer;
