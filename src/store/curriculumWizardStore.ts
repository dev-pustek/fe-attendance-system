import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TeacherAssignmentDraft {
  subjectId: number | string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  role: "primary" | "assistant";
}

export interface SubjectConfig {
  plannedTotalUnits: number;
  plannedUnitsPerWeek: number;
}

interface CurriculumWizardState {
  currentStep: number;
  selectedClassId: number | string | null;
  selectedClassName: string;
  selectedMajorId: number | string | null;
  selectedGradeId: number | string | null;
  selectedSubjectIds: (number | string)[];
  teacherAssignments: TeacherAssignmentDraft[];
  subjectConfigs: Record<string, SubjectConfig>;
  
  // Actions
  setStep: (step: number) => void;
  setClass: (id: number | string | null, name: string, majorId?: number | string | null, gradeId?: number | string | null) => void;
  setSubjects: (ids: (number | string)[]) => void;
  setTeacherAssignments: (assignments: TeacherAssignmentDraft[]) => void;
  toggleTeacherAssignment: (assignment: TeacherAssignmentDraft) => void;
  removeTeacherAssignment: (subjectId: number | string) => void;
  removeTeacherFromSubject: (subjectId: number | string, teacherId: string) => void;
  setSubjectConfig: (subjectId: number | string, config: Partial<SubjectConfig>) => void;
  setSubjectConfigs: (configs: Record<string, SubjectConfig>) => void;
  reset: () => void;
  
  // Navigation helpers
  canGoNext: () => boolean;
}

export const useCurriculumWizardStore = create<CurriculumWizardState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      selectedClassId: null,
      selectedClassName: "",
      selectedMajorId: null,
      selectedGradeId: null,
      selectedSubjectIds: [],
      teacherAssignments: [],
      subjectConfigs: {},

      setStep: (step) => set({ currentStep: step }),
      
      setClass: (id, name, majorId = null, gradeId = null) => set({ 
        selectedClassId: id, 
        selectedClassName: name,
        selectedMajorId: majorId,
        selectedGradeId: gradeId,
        selectedSubjectIds: [], 
        teacherAssignments: [],
        subjectConfigs: {}
      }),

      setSubjects: (ids) => {
        const currentAssignments = get().teacherAssignments;
        const currentConfigs = get().subjectConfigs;
        
        const filteredAssignments = currentAssignments.filter(a => ids.includes(a.subjectId));
        
        // Filter configs to keep only active subjects
        const filteredConfigs: Record<string, SubjectConfig> = {};
        ids.forEach(id => {
            if (currentConfigs[String(id)]) {
                filteredConfigs[String(id)] = currentConfigs[String(id)];
            }
        });

        set({ 
            selectedSubjectIds: ids,
            teacherAssignments: filteredAssignments,
            subjectConfigs: filteredConfigs
        });
      },

      setTeacherAssignments: (assignments) => set({ teacherAssignments: assignments }),

      toggleSubject: (id) => {
        const current = get().selectedSubjectIds;
        const isSelected = current.includes(id);
        const newIds = isSelected ? current.filter(sid => sid !== id) : [...current, id];
        
        if (isSelected) {
          const filteredAssignments = get().teacherAssignments.filter(a => a.subjectId !== id);
          const { [String(id)]: removed, ...remainingConfigs } = get().subjectConfigs;
          set({ 
              selectedSubjectIds: newIds, 
              teacherAssignments: filteredAssignments,
              subjectConfigs: remainingConfigs
          });
        } else {
          set({ selectedSubjectIds: newIds });
        }
      },

      toggleTeacherAssignment: (assignment) => {
        const current = get().teacherAssignments;
        const existingIndex = current.findIndex(
          (a) => a.subjectId === assignment.subjectId && a.teacherId === assignment.teacherId
        );

        if (existingIndex >= 0) {
          // If exists, remove it
          const updated = [...current];
          updated.splice(existingIndex, 1);
          set({ teacherAssignments: updated });
        } else {
          // If not exists, add it
          set({ teacherAssignments: [...current, assignment] });
        }
      },

      removeTeacherAssignment: (subjectId) => {
        set({ teacherAssignments: get().teacherAssignments.filter(a => a.subjectId !== subjectId) });
      },

      removeTeacherFromSubject: (subjectId, teacherId) => {
        set({ 
            teacherAssignments: get().teacherAssignments.filter(
                a => !(a.subjectId === subjectId && a.teacherId === teacherId)
            ) 
        });
      },

      setSubjectConfig: (subjectId, config) => {
          const currentConfigs = get().subjectConfigs;
          const key = String(subjectId);
          set({
              subjectConfigs: {
                  ...currentConfigs,
                  [key]: {
                      ...currentConfigs[key],
                      ...config
                  }
              }
          });
      },

      setSubjectConfigs: (configs) => {
          set({ subjectConfigs: configs });
      },

      reset: () => set({ 
        currentStep: 1, 
        selectedClassId: null, 
        selectedClassName: "", 
        selectedMajorId: null,
        selectedSubjectIds: [], 
        teacherAssignments: [],
        subjectConfigs: {}
      }),

      canGoNext: () => {
        const { currentStep, selectedClassId, selectedSubjectIds, teacherAssignments } = get();
        if (currentStep === 1) return !!selectedClassId;
        if (currentStep === 2) return selectedSubjectIds.length > 0;
        if (currentStep === 3) {
            // Check if every selected subject has AT LEAST one teacher assigned
            return selectedSubjectIds.every(id => 
                teacherAssignments.some(a => a.subjectId === id)
            );
        }
        return false;
      }
    }),
    {
      name: "curriculum-wizard-storage",
      skipHydration: false,
    }
  )
);
