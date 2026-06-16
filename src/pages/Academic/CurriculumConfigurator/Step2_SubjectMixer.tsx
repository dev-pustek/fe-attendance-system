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
import Button from "../../../components/atoms/Button";
import ComponentCard from "../../../components/molecules/ComponentCard";
import Modal from "../../../components/molecules/Modal";

const Step2_SubjectMixer: React.FC = () => {
  const { 
    selectedClassName, 
    selectedMajorId,
    selectedSubjectIds, 
    toggleSubject, 
    setSubjects, 
    setStep,
    teacherAssignments,
    setTeacherAssignments,
    subjectConfigs,
    setSubjectConfig,
    selectedGradeId
  } = useCurriculumWizardStore();
  const { data: allSubjects, isLoading: loadingAll } = useSubjects({
    limit: 100,
  });
  const [search, setSearch] = useState("");
  const [showAllGrades, setShowAllGrades] = useState(false);

  const availableSubjects = useMemo(() => {
    return (
      allSubjects?.data.filter((s) => 
        !selectedSubjectIds.includes(s.id) && 
        (s.majorId === selectedMajorId || !s.majorId) &&
        (showAllGrades ? true : (s.gradeId === selectedGradeId || !s.gradeId))
      ) || []
    );
  }, [allSubjects, selectedSubjectIds, selectedMajorId, selectedGradeId, showAllGrades]);

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
              Mengonfigurasi Kurikulum untuk
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">
              {selectedClassName}
            </h2>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          startIcon={<CopyIcon className="size-4" />}
          onClick={() => setIsCopyModalOpen(true)}
          className="!bg-brand-50 hover:!bg-brand-100 !text-brand-600 dark:!bg-brand-500/10 dark:hover:!bg-brand-500/20 dark:!text-brand-400 !shadow-none !rounded-xl"
        >
          Salin dari Kelas Lain
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Available Subjects */}
        <ComponentCard
          title="Mata Pelajaran Tersedia"
          desc="Pilih mata pelajaran untuk ditambahkan ke kurikulum kelas"
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan kode atau nama..."
                  className="w-full pl-11 pr-4 py-2 text-sm rounded-xl border border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {availableSubjects.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAll}
                  className="!text-xs !font-bold !text-brand-600 !bg-brand-50 hover:!bg-brand-100 !rounded-xl !shadow-none !py-2 !px-4"
                >
                  Tambah Semua
                </Button>
              )}
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer mt-1 select-none">
                <input 
                    type="checkbox" 
                    className="rounded text-brand-500 focus:ring-brand-500/20 border-gray-200"
                    checked={showAllGrades}
                    onChange={(e) => setShowAllGrades(e.target.checked)}
                />
                <span className="text-[11px] text-gray-500 font-medium">Tampilkan mata pelajaran dari tingkat lain</span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-none lg:max-h-[400px] overflow-y-auto lg:pr-2 scrollbar-thin">
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
          title="Kurikulum Kelas"
          desc={`${selectedSubjectIds.length} mata pelajaran saat ini ditugaskan`}
        >
          <div className="flex justify-end mb-4">
            {selectedSubjectIds.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRemoveAll}
                className="!text-xs !font-bold !text-error-600 !bg-error-50 hover:!bg-error-100 !rounded-xl !shadow-none !py-2 !px-4"
              >
                Hapus Semua
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-none lg:max-h-[450px] overflow-y-auto lg:pr-2 scrollbar-thin">
            {assignedSubjects.map((s) => {
               const assignment = teacherAssignments.find(ta => ta.subjectId === s.id && ta.teacherName);
               const config = subjectConfigs[String(s.id)] || { plannedTotalUnits: 0, plannedUnitsPerWeek: 0 };

               return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between p-3 rounded-xl border border-brand-100 bg-brand-50/50 dark:border-brand-500/20 dark:bg-brand-500/5 transition-all gap-3 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0 flex items-start justify-between w-full sm:w-auto">
                        <div>
                          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-tighter">
                            {s.code}
                          </p>
                          <p className="text-[11px] text-brand-600/70 dark:text-brand-400/70 font-medium truncate pr-2">
                            {s.name}
                          </p>
                          {assignment && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="size-4 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[8px] font-bold text-brand-600 border border-brand-200 dark:border-white/10 shrink-0">
                                    {assignment.teacherName?.charAt(0)}
                                </div>
                                <span className="text-[10px] font-medium text-brand-600/80 dark:text-brand-400 sm:truncate sm:max-w-[150px]">
                                    {assignment.teacherName}
                                </span>
                            </div>
                          )}
                        </div>

                        {/* Mobile Close Button */}
                        <button
                          onClick={() => toggleSubject(s.id)}
                          className="sm:hidden size-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-error-500 hover:bg-error-500 hover:text-white transition-all shadow-sm border border-brand-100/50 dark:border-brand-500/10 shrink-0"
                        >
                          <CloseIcon className="size-4" />
                        </button>
                    </div>
                    
                    {/* Unit Inputs */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t border-brand-100/50 sm:border-t-0 dark:border-white/5">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex-1 sm:flex-none sm:w-16">
                                <input 
                                    type="number" 
                                    placeholder="Total"
                                    value={config.plannedTotalUnits || ""}
                                    onChange={(e) => setSubjectConfig(s.id, { plannedTotalUnits: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-brand-200 dark:border-brand-500/30 bg-white dark:bg-white/10 outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                                <p className="text-[9px] text-center mt-0.5 text-brand-600/60 dark:text-brand-400/60 font-medium">Total</p>
                            </div>
                            <div className="flex-1 sm:flex-none sm:w-14">
                                <input 
                                    type="number" 
                                    placeholder="Pekan"
                                    value={config.plannedUnitsPerWeek || ""}
                                    onChange={(e) => setSubjectConfig(s.id, { plannedUnitsPerWeek: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-brand-200 dark:border-brand-500/30 bg-white dark:bg-white/10 outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                                <p className="text-[9px] text-center mt-0.5 text-brand-600/60 dark:text-brand-400/60 font-medium">Pekan</p>
                            </div>
                        </div>

                        {/* Desktop Close Button */}
                        <button
                          onClick={() => toggleSubject(s.id)}
                          className="hidden sm:flex size-8 rounded-lg bg-white dark:bg-white/5 items-center justify-center text-error-500 hover:bg-error-500 hover:text-white transition-all shadow-sm border border-brand-100/50 dark:border-brand-500/10 shrink-0"
                        >
                          <CloseIcon className="size-4" />
                        </button>
                    </div>
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
        title="Salin Kurikulum"
        description="Pilih kelas untuk menyalin konfigurasi mata pelajarannya."
        footer={
           <div className="flex justify-end gap-3 w-full">
               <Button 
                variant="secondary"
                onClick={() => setIsCopyModalOpen(false)} 
               >
                Batal
               </Button>
               <Button 
                variant="primary"
                disabled={!selectedSourceClassId}
                onClick={handleCopySubjects} 
               >
                {selectedSourceClassId && sourceSubjectsResponse?.data
                    ? `Impor Mata Pelajaran (${sourceSubjectsResponse.data.length})`
                    : "Impor Mata Pelajaran"}
               </Button>
           </div>
        }
      >
        <div className="space-y-4">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                    type="text"
                    autoFocus
                    placeholder="Cari kelas untuk disalin..."
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
                        Memuat kelas...
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
                            <span>Pratinjau Mata Pelajaran</span>
                            <button 
                                onClick={() => { setSelectedSourceClassId(null); setSourceClassSearch(""); }}
                                className="text-brand-600 hover:text-brand-700"
                            >
                                Ganti Kelas
                            </button>
                        </div>
                        
                        {sourceSubjectsResponse?.data?.length === 0 ? (
                             <div className="text-center py-8 text-sm text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                Kelas ini tidak memiliki mata pelajaran yang ditugaskan.
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
      <div className="flex items-center justify-between pt-8 pb-10 mt-4 border-t border-gray-100 dark:border-white/5">
        <Button
          variant="outline"
          onClick={() => setStep(1)}
          startIcon={<ChevronLeftIcon className="size-5" />}
          className="!rounded-xl !font-bold"
        >
          Kembali
        </Button>
        <Button
          variant="primary"
          disabled={selectedSubjectIds.length === 0}
          onClick={() => setStep(3)}
          endIcon={<ArrowRightIcon className="size-5" />}
          className="!rounded-xl !font-bold !shadow-brand-500/20"
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
};

export default Step2_SubjectMixer;
