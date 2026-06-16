import React, { useState, useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import { Navigate } from "react-router";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { useMyLeaveSubmissions, useLeaveTypes, useDeleteSubmission, useSubmitLeave, useLeaveApprovals } from "../../api/hooks/useLeaves";
import { LeaveSubmission, LeaveStatus } from "../../api/types/leave";
import { showSuccess, showError } from "../../utils/toast";
import Modal from "../../components/molecules/Modal";
import Button from "../../components/atoms/Button";
import { CalenderIcon, TrashBinIcon, PlusIcon, TimeIcon, CheckCircleIcon, CloseIcon, EyeIcon, AngleRightIcon } from "../../components/atoms/Icons";
import CustomSelect from "../../components/molecules/CustomSelect";
import DatePicker from "../../components/molecules/DatePicker";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import ApprovalHistoryTimeline from "../../components/organisms/Leaves/ApprovalHistoryTimeline";
import LeaveFormModal from "../Leaves/Requests/LeaveFormModal";
import { format, differenceInDays, parseISO } from "date-fns";

const StudentLeaveRequest: React.FC = () => {
    const { user } = useAuthStore();
    
    // Hooks must be called unconditionally
    const submissionsResponse = useMyLeaveSubmissions({
        page: 1,
        limit: 100,
    });
    const { isLoading: isLoadingSubmissions } = submissionsResponse;

    const { data: leaveTypesResponse } = useLeaveTypes({ limit: 100 });
    const leaveTypes = leaveTypesResponse?.data || [];
    
    const { confirm, confirmState } = useConfirm();
    const deleteMutation = useDeleteSubmission();
    const submitMutation = useSubmitLeave();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historySubmissionId, setHistorySubmissionId] = useState<string | null>(null);
    const { data: approvalHistoryResponse } = useLeaveApprovals(
        historySubmissionId ? { submissionId: historySubmissionId } : undefined,
        { enabled: !!historySubmissionId && isHistoryModalOpen }
    );
    const approvalHistory = (approvalHistoryResponse as any)?.data || [];

    // Redirection logic AFTER hooks
    const roleNames = [
        ...(user?.roles?.map(r => r.name.toLowerCase()) || []),
        ...(user?.userTypes?.map(t => t.toLowerCase()) || [])
    ];
    const isAdminMode = roleNames.some(r => r.includes('admin') || r.includes('teacher') || r.includes('staff'));

    const submissions = Array.isArray((submissionsResponse as any)?.data?.data) ? (submissionsResponse as any).data.data : [];

    // Redirection logic AFTER hooks
    if (isAdminMode) {
        return <Navigate to="/leaves/requests" replace />;
    }

    // Handlers
    const handleDelete = async (submission: LeaveSubmission) => {
        if (submission.status !== "pending") {
            showError(null, "You can only delete pending requests.");
            return;
        }

        const confirmed = await confirm({
            variant: "delete",
            title: "Cancel Request",
            message: "Are you sure you want to cancel this leave request?",
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(submission.public_id);
                showSuccess("Leave request cancelled successfully.");
            } catch (error) {
                showError(error, "Failed to cancel request");
            }
        }
    };

    const getStatusStyles = (status: LeaveStatus) => {
        switch (status) {
            case "approved":
                return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400";
            case "partially_approved":
                return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
            case "rejected":
                return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
            default:
                return "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400";
        }
    };

    const StatusIcon = ({ status }: { status: LeaveStatus }) => {
        switch (status) {
            case "approved": return <CheckCircleIcon className="size-4" />;
            case "rejected": return <CloseIcon className="size-4" />;
            default: return <TimeIcon className="size-4" />;
        }
    };

    const handleViewHistory = (submissionId: string) => {
        setHistorySubmissionId(submissionId);
        setIsHistoryModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "MMM dd, yyyy");
    };

    const calculateTotalDays = (submission: LeaveSubmission) => {
        if (submission.totalDays > 0) return submission.totalDays;
        
        try {
            const start = parseISO(submission.startDate);
            const end = parseISO(submission.endDate);
            // differenceInDays is exclusive, so we add 1 for inclusive days
            return differenceInDays(end, start) + 1;
        } catch (e) {
            return 0;
        }
    };

    return (
        <div className="pb-24">
            <PageMeta title="My Leave Requests | SIAPUS" description="Managed your leave submissions." />
            <PageBreadcrumb pageTitle="My Leave Requests" />

            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Leave Requests</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Track and manage your time-off.</p>
                    </div>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 rounded-full !py-2 px-4 shadow-lg shadow-brand-500/20"
                        size="sm"
                    >
                        <PlusIcon className="size-4" />
                        <span className="hidden sm:inline">New Request</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {isLoadingSubmissions ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.05]" />
                        ))
                    ) : submissions.length === 0 ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-white/5">
                                <CalenderIcon className="size-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No requests yet</h3>
                            <p className="text-sm text-gray-500">When you submit a leave request, it will appear here.</p>
                        </div>
                    ) : (
                        submissions.map((item: LeaveSubmission) => {
                            const days = calculateTotalDays(item);
                            return (
                                <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 dark:border-white/[0.05] dark:bg-white/[0.03]">
                                    {/* Status Bar Top */}
                                    <div className={`h-1.5 w-full ${
                                        item.status === 'approved' ? 'bg-green-500' :
                                        item.status === 'rejected' ? 'bg-red-500' :
                                        item.status === 'partially_approved' ? 'bg-amber-500' : 'bg-yellow-400'
                                    }`} />
                                    
                                    <div className="flex flex-col p-5">
                                        <div className="mb-4 flex items-start justify-between">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                                                        <CalenderIcon className="size-4" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                        {item.leaveType?.displayName || item.leaveType?.code}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${getStatusStyles(item.status)}`}>
                                                        <StatusIcon status={item.status} />
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                {item.status === "pending" ? (
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all dark:hover:bg-red-500/10"
                                                        title="Cancel Request"
                                                    >
                                                        <TrashBinIcon className="size-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleViewHistory(item.public_id)}
                                                        className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-brand-50 hover:text-brand-500 transition-all dark:hover:bg-brand-500/10"
                                                        title="View History"
                                                    >
                                                        <EyeIcon className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-5 space-y-2.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase text-gray-400">Period</span>
                                                        <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-white/5 dark:text-gray-400">
                                                            {days} {days === 1 ? 'Day' : 'Days'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {formatDate(item.startDate)} — {formatDate(item.endDate)}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="rounded-xl bg-gray-50/50 p-3 dark:bg-white/[0.02]">
                                                <p className="line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400" title={item.reason}>
                                                    {item.reason}
                                                </p>
                                            </div>
                                        </div>

                                        {item.leaveType?.approvalLevelsRequired && item.leaveType.approvalLevelsRequired > 0 && (
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                                    <span className="text-gray-400">Approval Path</span>
                                                    <span className="text-brand-600 dark:text-brand-400">
                                                        Level {item.currentApprovalLevel} of {item.leaveType.approvalLevelsRequired}
                                                    </span>
                                                </div>
                                                <div className="group/progress relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                                                    <div 
                                                        className={`h-full transition-all duration-700 ease-out ${
                                                            item.status === 'rejected' ? 'bg-red-500' : 
                                                            item.status === 'approved' ? 'bg-green-500' : 'bg-brand-500'
                                                        }`} 
                                                        style={{ width: `${item.status === 'approved' ? 100 : ((item.currentApprovalLevel - 1) / item.leaveType.approvalLevelsRequired) * 100}%` }}
                                                    />
                                                </div>
                                                {item.status !== "pending" && (
                                                    <button 
                                                        onClick={() => handleViewHistory(item.public_id)}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-brand-500 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                                                    >
                                                        View Approval Timeline
                                                        <AngleRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <LeaveFormModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                selectedEntity={null} 
                leaveTypes={leaveTypes} 
            />

            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                title="Approval History"
                description="View the detailed timeline of your leave request approvals."
                className="max-w-2xl"
            >
                <div className="py-4">
                    <ApprovalHistoryTimeline approvals={approvalHistory} />
                </div>
            </Modal>
            <ConfirmDialog {...confirmState} />
        </div>
    );
};

export default StudentLeaveRequest;
