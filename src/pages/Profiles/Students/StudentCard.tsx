import React from "react";
import { StudentProfile } from "../../../api/types/profiles";
import { PencilIcon, TrashBinIcon, GridIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";

interface StudentCardProps {
    student: StudentProfile;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onEdit: (student: StudentProfile) => void;
    onDelete: (student: StudentProfile) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({
    student,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}) => {
    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            isSelected 
                ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
                : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
        }`}>
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
                        {student.studentId || "-"}
                    </span>
                    <Badge color={student.studentStatus === 'ACTIVE' ? 'success' : 'light'}>
                        {student.studentStatus || 'UNKNOWN'}
                    </Badge>
                </div>
                <Checkbox 
                    checked={isSelected} 
                    onChange={() => onSelect(student.userId)} 
                />
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                    {student.user?.name || "Unknown"}
                </h3>
                
                <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <GridIcon className="size-4 text-brand-500 opacity-70" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {student.user?.activeClass?.name || "Not Enrolled"}
                        </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div>
                            <span className="block uppercase tracking-wider text-[10px] opacity-70">NISN</span>
                            <span className="font-medium">{student.nisn || "-"}</span>
                        </div>
                        <div>
                            <span className="block uppercase tracking-wider text-[10px] opacity-70">Academic Yr</span>
                            <span className="font-medium">{student.user?.activeClass?.academicYear || "-"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(student); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                >
                    <PencilIcon className="size-3.5" />
                    Edit
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(student); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                    <TrashBinIcon className="size-3.5" />
                    Delete
                </button>
            </div>
        </div>
    );
};

export default StudentCard;
