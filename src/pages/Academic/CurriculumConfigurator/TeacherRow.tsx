import React, { useState } from "react";
import { useCurriculumWizardStore } from "../../../store/curriculumWizardStore";
import TeacherAssignmentDrawer from "./TeacherAssignmentDrawer";
import { EditIcon, PlusIcon } from "../../../components/atoms/Icons";

interface TeacherRowProps {
  subjectId: number | string;
  subjectName: string;
}

const TeacherRow: React.FC<TeacherRowProps> = ({ subjectId, subjectName }) => {
  const { teacherAssignments, updateTeacherAssignment } = useCurriculumWizardStore();
  const assignment = teacherAssignments.find((a) => a.subjectId === subjectId);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-white/10 transition-all group">
        <div className="flex items-center gap-4">
            <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${
                assignment 
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" 
                : "bg-gray-50 text-gray-400 dark:bg-white/5"
            }`}>
                <span className="text-sm font-bold">{subjectName.charAt(0)}</span>
            </div>
            <div>
                 <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-0.5">Subject</p>
                 <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{subjectName}</p>
            </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
            {assignment ? (
                <div onClick={() => setIsDrawerOpen(true)} className="flex-1 sm:flex-none flex items-center gap-3 p-2 pr-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent hover:border-brand-200 dark:hover:border-white/10 cursor-pointer transition-all">
                    <div className="size-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                        {assignment.teacherName?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{assignment.teacherName}</p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">Primary Teacher</p>
                    </div>
                    <EditIcon className="size-4 text-gray-400 ml-2" />
                </div>
            ) : (
                <button 
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-gray-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-xs font-bold uppercase tracking-wide"
                >
                    <PlusIcon className="size-4" />
                    Assign Teacher
                </button>
            )}
        </div>
      </div>

      <TeacherAssignmentDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        subjectId={subjectId}
        subjectName={subjectName}
        currentTeacherId={assignment?.teacherId}
        onSelect={(teacherId, teacherName, role) => {
             updateTeacherAssignment({
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
