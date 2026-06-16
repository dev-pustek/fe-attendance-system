import React, { useState } from "react";
import { useCurriculumWizardStore } from "../../../store/curriculumWizardStore";
import TeacherAssignmentDrawer from "./TeacherAssignmentDrawer";
import { EditIcon, PlusIcon } from "../../../components/atoms/Icons";
import Button from "../../../components/atoms/Button";

interface TeacherRowProps {
  subjectId: number | string;
  subjectName: string;
}

const TeacherRow: React.FC<TeacherRowProps> = ({ subjectId, subjectName }) => {
  const { teacherAssignments, toggleTeacherAssignment, removeTeacherFromSubject } = useCurriculumWizardStore();
  const assignments = teacherAssignments.filter((a) => a.subjectId === subjectId);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-white/10 transition-all group">
        <div className="flex items-center gap-4 shrink-0">
            <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${
                assignments.length > 0
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" 
                : "bg-gray-50 text-gray-400 dark:bg-white/5"
            }`}>
                <span className="text-sm font-bold">{subjectName.charAt(0)}</span>
            </div>
            <div>
                 <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-0.5">Mata Pelajaran</p>
                 <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{subjectName}</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 sm:justify-end">
            {assignments.map(assignment => (
                <div key={assignment.teacherId} className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                    <div className="size-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">
                        {assignment.teacherName?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-900 dark:text-white leading-none">{assignment.teacherName}</p>
                    </div>
                    <button 
                        onClick={() => removeTeacherFromSubject(subjectId, assignment.teacherId)}
                        className="ml-1 text-gray-400 hover:text-error-500 transition-colors"
                        title="Hapus Guru"
                    >
                        &times;
                    </button>
                </div>
            ))}
            
            <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
                className={`border-dashed !border-gray-300 dark:!border-white/20 !text-gray-500 hover:!text-brand-600 hover:!border-brand-300 hover:!bg-brand-50/50 !transition-all !text-[10px] !font-bold uppercase tracking-wide !rounded-xl ${
                    assignments.length === 0 ? "w-full sm:w-auto !px-6 !py-3 !text-xs" : "!px-4 !py-2"
                }`}
                startIcon={<PlusIcon className="size-3" />}
            >
                {assignments.length > 0 ? "Tambah" : "Tetapkan Guru"}
            </Button>
        </div>
      </div>

      <TeacherAssignmentDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        subjectId={subjectId}
        subjectName={subjectName}
        currentTeacherIds={assignments.map(a => a.teacherId)}
        onToggle={(teacherId, teacherName, role) => {
             toggleTeacherAssignment({
                  subjectId,
                  subjectName,
                  teacherId,
                  teacherName,
                  role
              });
        }}
      />
    </>
  );
};

export default TeacherRow;
