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
  selectedSubjectIds: (number | string)[];
  teacherAssignments: TeacherAssignmentDraft[];
  subjectConfigs: Record<string, SubjectConfig>;
  
  // Actions
  setStep: (step: number) => void;
  setClass: (id: number | string | null, name: string) => void;
  setSubjects: (ids: (number | string)[]) => void;
  setTeacherAssignments: (assignments: TeacherAssignmentDraft[]) => void;
  toggleSubject: (id: number | string) => void;
  updateTeacherAssignment: (assignment: TeacherAssignmentDraft) => void;
  removeTeacherAssignment: (subjectId: number | string) => void;
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
      selectedSubjectIds: [],
      teacherAssignments: [],
      subjectConfigs: {},

      setStep: (step) => set({ currentStep: step }),
      
      setClass: (id, name) => set({ 
        selectedClassId: id, 
        selectedClassName: name,
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

      updateTeacherAssignment: (assignment) => {
        const current = get().teacherAssignments;
        const index = current.findIndex(a => a.subjectId === assignment.subjectId);
        
        if (index >= 0) {
          const updated = [...current];
          updated[index] = assignment;
          set({ teacherAssignments: updated });
        } else {
          set({ teacherAssignments: [...current, assignment] });
        }
      },

      removeTeacherAssignment: (subjectId) => {
        set({ teacherAssignments: get().teacherAssignments.filter(a => a.subjectId !== subjectId) });
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
        selectedSubjectIds: [], 
        teacherAssignments: [],
        subjectConfigs: {}
      }),

      canGoNext: () => {
        const { currentStep, selectedClassId, selectedSubjectIds, teacherAssignments } = get();
        if (currentStep === 1) return !!selectedClassId;
        if (currentStep === 2) return selectedSubjectIds.length > 0;
        if (currentStep === 3) return teacherAssignments.length === selectedSubjectIds.length;
        return false;
      }
    }),
    {
      name: "curriculum-wizard-storage",
      skipHydration: false,
    }
  )
);
