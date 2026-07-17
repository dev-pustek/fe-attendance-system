import React from "react";
import { EmployeeProfile } from "../../../api/types/profiles";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import { PencilIcon, TrashBinIcon, CalenderIcon, GridIcon } from "../../../components/atoms/Icons";

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

interface EmployeeCardProps {
    employee: EmployeeProfile;
    isSelected: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onResetPassword?: () => void;
    showResetPassword?: boolean;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
    employee,
    isSelected,
    onToggle,
    onEdit,
    onDelete,
    onResetPassword,
    showResetPassword = false,
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
                    {/* Code Pill */}
                    <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
                        {employee.employeeId}
                    </span>
                    {/* Status Badge */}
                    <Badge color={employee.employmentStatus === 'PERMANENT' ? 'success' : employee.employmentStatus === 'CONTRACT' ? 'warning' : 'light'}>
                        {employee.employmentStatus || 'UNKNOWN'}
                    </Badge>
                </div>
                {/* Checkbox on the RIGHT */}
                <Checkbox checked={isSelected} onChange={onToggle} />
            </div>

            {/* Card Body */}
            <div className="px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl font-bold text-base overflow-hidden shrink-0 ${!employee.user?.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : ''}`}>
                        {employee.user?.photo ? (
                            <img src={employee.user.photo} alt={employee.user.name} className="size-full object-cover" />
                        ) : (
                            employee.user?.name?.charAt(0) || "E"
                        )}
                    </div>
                    <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
                            {employee.user?.name || "Pegawai Tidak Diketahui"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {employee.user?.email || "Belum ada email"}
                        </p>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5 font-medium">
                        <GridIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span>{employee.position || "Staf"} - {employee.department || "Umum"}</span>
                    </div>
                </div>
                
                {employee.hireDate && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                        <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">Bergabung: {formatDate(employee.hireDate)}</span>
                    </div>
                )}
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01] gap-1">
                {showResetPassword && onResetPassword && (
                    <button onClick={(e) => { e.stopPropagation(); onResetPassword(); }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                        Atur Ulang Kata Sandi
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]">
                    <PencilIcon className="size-3.5" /> Ubah
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
                    <TrashBinIcon className="size-3.5" /> Hapus
                </button>
            </div>
        </div>
    );
};

export default EmployeeCard;
