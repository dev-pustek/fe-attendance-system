import React, { useMemo, useState } from "react";
import { useAcademicYears, useBulkSyncClassSubjects, useSubjects, useBulkSyncTeachingAssignments } from "../../../api/hooks/useAcademic";
import { academicService } from "../../../api/services/academicService";
import { useCurriculumWizardStore } from "../../../store/curriculumWizardStore";
import Button from "../../../components/atoms/Button";
import { ChevronLeftIcon, CheckLineIcon, UserIcon, AlertIcon, BoltIcon as LoadingIcon } from "../../../components/atoms/Icons";
import ComponentCard from "../../../components/molecules/ComponentCard";
import { BulkSyncTeachingAssignmentsDto } from "../../../api/types/academic";
import toast from "react-hot-toast";
import TeacherRow from "./TeacherRow";


const Step3_TeacherAssignment: React.FC = () => {
  const { selectedClassId, selectedClassName, selectedSubjectIds, teacherAssignments, setStep, subjectConfigs } = useCurriculumWizardStore();
  const { data: years } = useAcademicYears({ isActive: true });
  const activeYear = years?.data[0];
  
  const { data: subjectsResponse } = useSubjects({ limit: 100 });
  
  const subjectMap = useMemo(() => {
    const map: Record<string | number, string> = {};
    const data = subjectsResponse?.data || [];
    data.forEach(s => {
        map[s.id] = s.name;
    });
    return map;
  }, [subjectsResponse]);

  const syncSubjects = useBulkSyncClassSubjects();
  const syncAssignments = useBulkSyncTeachingAssignments();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (!selectedClassId || !activeYear) return;
    
    setIsSubmitting(true);
    const loadingToast = toast.loading("Mensinkronisasi kurikulum...");

    try {
      // 1. Sync Subjects
      await syncSubjects.mutateAsync({
          classId: selectedClassId,
          academicYearId: activeYear.id,
          subjects: selectedSubjectIds.map(id => {
              const config = subjectConfigs[String(id)] || { plannedTotalUnits: 0, plannedUnitsPerWeek: 0 };
              return {
                  subjectId: id,
                  plannedTotalUnits: config.plannedTotalUnits || 0,
                  plannedUnitsPerWeek: config.plannedUnitsPerWeek || 0
              };
          })
      });

      // 2. Fetch Fresh Class Subjects to get the new IDs
      // We need to fetch the class subjects we just created to get their primary IDs (classSubjectId)
      const freshClassSubjects = await academicService.getClassSubjects({ 
          classId: selectedClassId, 
          limit: 100 // Ensure we get all of them
      });

      if (!freshClassSubjects?.data) {
          throw new Error("Failed to retrieve curriculum data after sync");
      }

      // Map subjectId -> classSubjectId
      const subjectToClassSubjectMap: Record<string | number, number | string> = {};
      freshClassSubjects.data.forEach(cs => {
          subjectToClassSubjectMap[cs.subjectId] = cs.id;
      });

      // 3. Sync Assignments using the correct ClassSubject IDs
      if (teacherAssignments.length > 0) {
          const assignmentPayload: BulkSyncTeachingAssignmentsDto = {
              assignments: teacherAssignments.map(a => {
                  const classSubjectId = subjectToClassSubjectMap[a.subjectId];
                  if (!classSubjectId) {
                      console.warn(`Could not find classSubjectId for subject ${a.subjectId}`);
                  }
                  
                  return {
                    classSubjectId: classSubjectId || 0, // Fallback (should be caught by validation or earlier check)
                    teacherId: a.teacherId,
                    role: a.role
                  };
              }).filter(a => a.classSubjectId !== 0) // Filter out any invalid mappings
          };
          
          if (assignmentPayload.assignments.length > 0) {
            await syncAssignments.mutateAsync(assignmentPayload);
          }
      }
      
      toast.success("Kurikulum berhasil dikonfigurasi!", { id: loadingToast });
      // navigate("/academic/curriculum"); // Stay on page as requested
    } catch (err) {
      toast.error("Gagal mensinkronisasi kurikulum", { id: loadingToast });
      console.error("Sync error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = useMemo(() => {
    return selectedSubjectIds.every(sId => 
        teacherAssignments.some(ta => String(ta.subjectId) === String(sId))
    );
  }, [selectedSubjectIds, teacherAssignments]);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-white/[0.03] p-6 rounded-3xl border border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-success-50 dark:bg-success-500/10 flex items-center justify-center text-success-600">
                <UserIcon className="size-6" />
            </div>
            <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Menyelesaikan Kurikulum untuk</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{selectedClassName}</h2>
            </div>
        </div>
      </div>

      <ComponentCard 
        title="Penugasan Guru" 
        desc="Tetapkan guru utama untuk setiap mata pelajaran yang dipilih"
      >
          <div className="space-y-4">
              {selectedSubjectIds.map((id: string | number) => (
                  <TeacherRow 
                    key={id} 
                    subjectId={id} 
                    subjectName={subjectMap[id] || `Subject #${id}`} 
                  />
              ))}
              
              {selectedSubjectIds.length === 0 && ( // Should not happen if guards work
                  <div className="py-20 text-center opacity-40">
                      <AlertIcon className="size-16 mx-auto mb-4 opacity-10" />
                      <p className="text-sm font-bold">Silakan kembali dan pilih mata pelajaran terlebih dahulu.</p>
                  </div>
              )}
          </div>
      </ComponentCard>

      <div className="flex items-center justify-between pt-8 pb-10 mt-4 border-t border-gray-100 dark:border-white/5">
          <Button 
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setStep(2)}
            startIcon={<ChevronLeftIcon className="size-5" />}
            className="!rounded-xl !font-bold"
          >
              Kembali
          </Button>

          <Button 
            variant="primary"
            disabled={isSubmitting || !isComplete}
            onClick={handleFinish}
            startIcon={isSubmitting ? <LoadingIcon className="size-5 animate-spin" /> : <CheckLineIcon className="size-5" />}
            className="!rounded-xl !font-bold !shadow-brand-500/20"
          >
              {isSubmitting ? "Memproses..." : "Selesai"}
          </Button>
      </div>
    </div>
  );
};

export default Step3_TeacherAssignment;
