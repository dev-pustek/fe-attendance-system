import React, { useState, useRef, useEffect, useMemo } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { useLeaveSubmissions, useReviewLeave, useLeaveTypes, useDeleteSubmission, useUpdateSubmission, useSubmitLeave, useLeaveApprovals } from "../../../api/hooks/useLeaves";
import { LeaveSubmission, LeaveStatus } from "../../../api/types/leave";
import { showSuccess, showError } from "../../../utils/toast";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import { EyeIcon, CheckCircleIcon, CloseIcon, CalenderIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, PencilIcon, TrashBinIcon, PlusIcon, FileIcon, ChevronUpIcon, ChevronDownIcon } from "../../../components/atoms/Icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import CustomSelect from "../../../components/molecules/CustomSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import { useDebounce } from "../../../hooks/useDebounce";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import ApprovalHistoryTimeline from "../../../components/organisms/Leaves/ApprovalHistoryTimeline";

const LeaveRequests: React.FC = () => {
    // State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | "ALL">("ALL");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal State
    const [selectedSubmission, setSelectedSubmission] = useState<LeaveSubmission | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [approvalComments, setApprovalComments] = useState("");
    const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | null>(null);
    
    // Image Preview Modal
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historySubmissionId, setHistorySubmissionId] = useState<string | null>(null);
    const { data: approvalHistoryResponse, isLoading: isLoadingHistory } = useLeaveApprovals(
        historySubmissionId ? { submissionId: historySubmissionId } : undefined
    );
    const approvalHistory = useMemo(() => approvalHistoryResponse?.data || [], [approvalHistoryResponse]);

    // Auto-scroll history to bottom
    const historyEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (isHistoryModalOpen && !isLoadingHistory && historyEndRef.current) {
            historyEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isHistoryModalOpen, isLoadingHistory, approvalHistory]);


    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();

    // Hooks
    const { data: submissionsResponse, isLoading: isLoadingSubmissions } = useLeaveSubmissions({
        page,
        limit,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        userId: debouncedSearch || undefined, // Pending backend support for "search" param, distinct from userId
        // Note: Assuming backend might support 'search' param mapping to user name/email, 
        // otherwise strict userId matching might be needed. For now, passing debouncedSearch as userId/search.
    });

    const { data: leaveTypesResponse } = useLeaveTypes({ limit: 100 });
    const leaveTypes = leaveTypesResponse?.data || [];
    
    const reviewMutation = useReviewLeave();
    const deleteMutation = useDeleteSubmission();

    const updateMutation = useUpdateSubmission();
    const submitMutation = useSubmitLeave();

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        leaveTypeCode: "",
        startDate: "",
        endDate: "",
        reason: ""
    });
    
    // Create State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState<{
        leaveTypeCode: string;
        startDate: string;
        endDate: string;
        reason: string;
        image: File | null;
    }>({
        leaveTypeCode: "",
        startDate: "",
        endDate: "",
        reason: "",
        image: null
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const submissions = Array.isArray(submissionsResponse) ? submissionsResponse : (submissionsResponse?.data || []);
    const meta = submissionsResponse?.meta;
    const total = Number(meta?.total || 0);
    // Safe access to last_page which might be returned by Laravel API
    // @ts-expect-error - meta type might be incomplete
    const totalPages = Number(meta?.totalPages || meta?.last_page || Math.ceil(total / limit));

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedSubmissions = [...submissions].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        
        let valA: string | number = "";
        let valB: string | number = "";

        // Handle nested properties
        if (key === "user.name") {
            valA = a.user?.name || "";
            valB = b.user?.name || "";
        } else if (key === "leaveType.name" || key === "leaveType.displayName") {
            valA = a.leaveType?.displayName || a.leaveType?.code || "";
            valB = b.leaveType?.displayName || b.leaveType?.code || "";
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valA = (a as any)[key] || "";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valB = (b as any)[key] || "";
        }

        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    // Handlers
    const handleOpenReview = (submission: LeaveSubmission) => {
        setSelectedSubmission(submission);
        setReviewAction(null);
        setRejectionReason("");
        setApprovalComments("");
        setHistorySubmissionId(submission.public_id);
        setIsReviewModalOpen(true);
    };

    const handleReviewSubmit = async () => {
        if (!selectedSubmission || !reviewAction) return;

        try {
            await reviewMutation.mutateAsync({
                public_id : selectedSubmission.public_id,
                data: {
                    status: reviewAction === "APPROVE" ? "approved" : "rejected",
                    comments: reviewAction === "APPROVE" ? approvalComments : rejectionReason,
                    approvalLevel: selectedSubmission.currentApprovalLevel,
                    rejectionReason: reviewAction === "REJECT" ? rejectionReason : undefined,
                },
            });
            showSuccess(`Leave request ${reviewAction === "APPROVE" ? "approved" : "rejected"} successfully!`);
            setReviewAction(null);
            setRejectionReason("");
            setApprovalComments("");
            setIsReviewModalOpen(false);
        } catch (error) {
            showError(error, "Failed to process review");
        }
    };

    const handleEdit = (submission: LeaveSubmission) => {
        setSelectedSubmission(submission);
        setEditForm({
            leaveTypeCode: submission.leaveType?.code || "",
            startDate: submission.startDate,
            endDate: submission.endDate,
            reason: submission.reason,
        });
        setIsEditModalOpen(true);
    };
    const handleEditSubmit = async () => {
        if (!selectedSubmission) return;
        try {
            await updateMutation.mutateAsync({
                public_id: selectedSubmission.public_id,
                data: editForm
            });
            showSuccess("Leave request updated successfully");
            setIsEditModalOpen(false);
        } catch (error) {
            showError(error, "Failed to update request");
        }
    };
    const handleCreateSubmit = async () => {
        if (!createForm.leaveTypeCode || !createForm.startDate || !createForm.endDate || !createForm.reason) {
            showError(null, "Please fill in all required fields");
            return;
        }

        const selectedLeaveType = leaveTypes.find(t => t.code === createForm.leaveTypeCode);
        if (selectedLeaveType?.requiresFile && !createForm.image) {
            showError(null, "Attachment is required for this leave type");
            return;
        }

        try {
            await submitMutation.mutateAsync({
                ...createForm,
                image: createForm.image || undefined
            });
            showSuccess("Leave request submitted successfully!");
            setIsCreateModalOpen(false);
            setCreateForm({
                leaveTypeCode: "",
                startDate: "",
                endDate: "",
                reason: "",
                image: null
            });
            setImagePreview(null);
        } catch (error) {
            showError(error, "Failed to submit request");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCreateForm(prev => ({ ...prev, image: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = async (submission: LeaveSubmission) => {
        const confirmed = await confirm({
            variant: "delete",
            title: "Delete Submission",
            message: "Are you sure you want to delete this leave request? This action cannot be undone.",
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(submission.public_id);
                showSuccess("Leave request deleted successfully.");
            } catch (error) {
                showError(error, "Failed to delete request");
            }
        }
    };



    // Helper for Status Badge
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

    // Format Date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };




    return (
        <>
            <PageMeta title="Leave Requests | Visia" description="Manage employee leave submissions." />
            <PageBreadcrumb pageTitle="Leave Requests" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Submissions</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Review and manage time-off requests.</p>
                    </div>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <PlusIcon className="size-4" />
                        Create Request
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                     <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                       <div className="flex-1 space-y-1.5">
                         <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Search Requests</label>
                         <div className="relative">
                           <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                             <GridIcon className="size-4" />
                           </div>
                           <input
                             type="text"
                             placeholder="Search by employee..."
                             value={searchQuery}
                             onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                             className="w-full rounded-xl border border-gray-100 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white shadow-sm"
                           />
                         </div>
                       </div>
        
                       <div className="w-full sm:w-48">
                         <CustomSelect
                           label="Status"
                           value={statusFilter}
                           onChange={(val) => { setStatusFilter(val as LeaveStatus | "ALL"); setPage(1); }}
                           options={[
                             { label: "All Statuses", value: "ALL" },
                             { label: "Pending", value: "pending" },
                             { label: "Partially Approved", value: "partially_approved" },
                             { label: "Approved", value: "approved" },
                             { label: "Rejected", value: "rejected" },
                           ]}
                         />
                       </div>
        
                       <div className="w-full sm:w-48">
                         <CustomSelect
                           label="Leave Type"
                           value={typeFilter}
                           onChange={(val) => { setTypeFilter(String(val)); setPage(1); }}
                           options={[
                             { label: "All Types", value: "ALL" },
                             ...leaveTypes.map(t => ({ label: t.displayName || t.code, value: t.code }))
                           ]}
                         />
                       </div>
                     </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("user.name")} className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Employee <SortIcon column="user.name" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("leaveType.displayName")} className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Leave Type <SortIcon column="leaveType.displayName" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("totalDays")} className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Duration <SortIcon column="totalDays" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Reason
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-center">
                                    <button onClick={() => handleSort("status")} className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider w-full">
                                        Status <SortIcon column="status" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-50 dark:divide-white/[0.05]">
                             {isLoadingSubmissions ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                                            <span className="text-sm font-bold text-gray-400 italic">Loading requests...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedSubmissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-20 text-center">
                                        <p className="text-sm font-medium text-gray-400">No leave requests found matching your criteria.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedSubmissions
                                    .filter(item => typeFilter === 'ALL' || item.leaveTypeCode === typeFilter || item.leaveType?.code === typeFilter)
                                    .map((item: LeaveSubmission) => (
                                    <TableRow key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm overflow-hidden ${!item.user?.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10' : ''}`}>
                                                    {item.user?.photo ? (
                                                        <img src={item.user.photo} alt={item.user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        item.user?.name.charAt(0) || "U"
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{item.user?.name || "Unknown User"}</p>
                                                    <p className="text-xs text-gray-500">{item.user?.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="inline-flex items-center justify-center min-w-[80px] rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                                    {item.leaveType?.displayName || "N/A"}
                                                </span>
                                                <span className="text-[10px] font-mono text-gray-400 mt-1 opacity-70">
                                                    {item.leaveType?.code}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">
                                                    {item.totalDays} Days
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {formatDate(item.startDate)} - {formatDate(item.endDate)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 max-w-[200px]">
                                            <p className="truncate text-sm text-gray-600 dark:text-gray-300" title={item.reason}>
                                                {item.reason}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase font-bold tracking-wide ${getStatusStyles(item.status)}`}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                                {item.leaveType?.approvalLevelsRequired && item.leaveType.approvalLevelsRequired > 1 && (
                                                    <div className="flex items-center gap-1">
                                                        <div className="flex h-1.5 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                                                            <div 
                                                                className="h-full bg-brand-500 transition-all duration-500" 
                                                                style={{ width: `${(item.currentApprovalLevel / item.leaveType.approvalLevelsRequired) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-gray-400">
                                                            {item.currentApprovalLevel}/{item.leaveType.approvalLevelsRequired}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleOpenReview(item)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all dark:hover:bg-brand-500/10"
                                                    title="Review Request"
                                                >
                                                    <EyeIcon className="size-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all dark:hover:bg-blue-500/10"
                                                    title="Edit Request"
                                                >
                                                    <PencilIcon className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all dark:hover:bg-red-500/10"
                                                    title="Delete Request"
                                                >
                                                    <TrashBinIcon className="size-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {!isLoadingSubmissions && total > 0 && (
                    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                            <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                            <span className="font-medium text-gray-700 dark:text-white">{total}</span> requests
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                            >
                                <ChevronLeftIcon className="size-4" />
                                Previous
                            </button>
                            <div className="flex items-center gap-1.5 px-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                                <span className="text-sm text-gray-400">/</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                            >
                                Next
                                <AngleRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                className={selectedSubmission?.attachment ? "max-w-4xl" : "max-w-lg"}
                title="Edit Request"
                description="Update the details of this leave request."
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Updating..." : "Save Changes"}
                        </Button>
                    </div>
                }
            >
                <div className="p-1">
                     <div className={`grid gap-6 ${selectedSubmission?.attachment ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Left Column - Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Leave Type</label>
                                <CustomSelect
                                    value={editForm.leaveTypeCode}
                                    onChange={(value) => setEditForm(prev => ({...prev, leaveTypeCode: String(value)}))}
                                    options={leaveTypes.map(type => ({ value: type.code, label: type.displayName || type.code }))}
                                    placeholder="Select leave type"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <DatePicker
                                    label="Start Date"
                                    value={editForm.startDate}
                                    onChange={(date) => setEditForm(prev => ({...prev, startDate: date}))}
                                    type="date"
                                />
                                <DatePicker
                                    label="End Date"
                                    value={editForm.endDate}
                                    onChange={(date) => setEditForm(prev => ({...prev, endDate: date}))}
                                    type="date"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Reason</label>
                                <textarea
                                    value={editForm.reason}
                                    onChange={(e) => setEditForm(prev => ({...prev, reason: e.target.value}))}
                                    placeholder="Edit reason..."
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Right Column - Attachment Preview */}
                        {selectedSubmission?.attachment && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase text-gray-500">Current Attachment</label>
                                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                    <img 
                                        src={selectedSubmission.attachment.startsWith('http') ? selectedSubmission.attachment : `http://localhost:3000/${selectedSubmission.attachment}`}
                                        alt="Leave attachment" 
                                        className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => {
                                            const url = selectedSubmission.attachment!.startsWith('http') ? selectedSubmission.attachment! : `http://localhost:3000/${selectedSubmission.attachment}`;
                                            setPreviewImageUrl(url);
                                            setIsImagePreviewOpen(true);
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 text-center">Click image to view full size</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Review Modal */}
            <Modal 
                isOpen={isReviewModalOpen} 
                onClose={() => !reviewAction && !isHistoryModalOpen && setIsReviewModalOpen(false)} 
                className="max-w-3xl max-h-[80vh] flex flex-col"
                title="Review Request"
                description="Review details and approve or reject this request."
                footer={
                    selectedSubmission?.status !== "approved" && selectedSubmission?.status !== "rejected" ? (
                        <div className="flex flex-col w-full gap-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Current Phase: Level {selectedSubmission?.currentApprovalLevel}
                                </span>
                                {selectedSubmission?.leaveType?.approvalLevelsRequired && (
                                    <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full">
                                        Step {selectedSubmission?.currentApprovalLevel} of {selectedSubmission?.leaveType.approvalLevelsRequired}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setReviewAction("APPROVE")}
                                    className="flex-1 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-500/10"
                                >
                                    <CheckCircleIcon className="size-4 mr-2" />
                                    {selectedSubmission?.leaveType?.approvalLevelsRequired && selectedSubmission.currentApprovalLevel < selectedSubmission.leaveType.approvalLevelsRequired 
                                        ? `Proceed to Level ${selectedSubmission.currentApprovalLevel + 1}` 
                                        : "Final Approval"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setReviewAction("REJECT")}
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10"
                                >
                                    <CloseIcon className="size-4 mr-2" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full text-center text-sm text-gray-500">
                            This request has already been <span className="font-bold lowercase">{selectedSubmission?.status}</span>.
                        </div>
                    )
                }
            >
                {/* Scrollable Content */}
                <div className="p-4 overflow-y-auto grow">
                    {selectedSubmission && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Summary + Reason */}
                            <div className="space-y-6">
                                {/* Summary Card */}
                                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div className="flex gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm dark:bg-gray-800">
                                            <CalenderIcon className="size-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {selectedSubmission.leaveType?.displayName || selectedSubmission.leaveType?.code || "Unknown"} Request
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                by {selectedSubmission.user?.name}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                <span>{formatDate(selectedSubmission.startDate)}</span>
                                                <span>→</span>
                                                <span>{formatDate(selectedSubmission.endDate)}</span>
                                                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] dark:bg-gray-700 text-gray-600 font-bold">
                                                    {selectedSubmission.totalDays} days
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Reason</label>
                                    <div className="h-32 overflow-y-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
                                        {selectedSubmission.reason}
                                    </div>
                                    <div className="mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsHistoryModalOpen(true)}
                                            className="w-full justify-center border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                                        >
                                            View Approval History
                                        </Button>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Attachment */}
                            <div>
                                {(selectedSubmission.attachmentUri || selectedSubmission.attachment) ? (
                                    <div className="flex flex-col h-full">

                                        <div className="h-full min-h-[200px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative group">
                                            <img
                                                src={
                                                    (selectedSubmission.attachmentUri || selectedSubmission.attachment)?.startsWith('http')
                                                    ? (selectedSubmission.attachmentUri || selectedSubmission.attachment)!
                                                    : `http://localhost:3000/${selectedSubmission.attachmentUri || selectedSubmission.attachment}`
                                                }
                                                alt="Leave attachment"
                                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => {
                                                    const src = selectedSubmission.attachmentUri || selectedSubmission.attachment;
                                                    const url = src?.startsWith('http') ? src : `http://localhost:3000/${src}`;
                                                    setPreviewImageUrl(url);
                                                    setIsImagePreviewOpen(true);
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                                                <EyeIcon className="size-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-800/20 text-center">
                                        <p className="text-xs text-gray-400">No attachment provided</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
            </div>
            </Modal>

            {/* Create Modal */}
            <Modal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                className="max-w-lg"
                title="New Leave Request"
                description="Submit a new leave request for approval."
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSubmit} disabled={submitMutation.isPending}>
                            {submitMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <CustomSelect
                        label="Leave Type *"
                        value={createForm.leaveTypeCode}
                        onChange={(val) => setCreateForm(prev => ({...prev, leaveTypeCode: String(val)}))}
                        options={leaveTypes.map(t => ({ label: t.displayName || t.code, value: t.code }))}
                        placeholder="Select leave type"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <DatePicker
                            label="Start Date *"
                            value={createForm.startDate}
                            onChange={(date) => setCreateForm(prev => ({...prev, startDate: date}))}
                            type="date"
                        />
                        <DatePicker
                            label="End Date *"
                            value={createForm.endDate}
                            onChange={(date) => setCreateForm(prev => ({...prev, endDate: date}))}
                            type="date"
                        />
                    </div>
                    
                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Reason *</label>
                        <textarea
                            value={createForm.reason}
                            onChange={(e) => setCreateForm(prev => ({...prev, reason: e.target.value}))}
                            placeholder="Please provide a reason..."
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                    
                    <div>
                        <div className="mb-1.5 flex justify-between">
                            <label className="text-xs font-bold uppercase text-gray-500">Attachment</label>
                            {createForm.leaveTypeCode && leaveTypes.find(t => t.code === createForm.leaveTypeCode)?.requiresFile && (
                                <span className="text-[10px] font-bold text-red-500">* Required</span>
                            )}
                        </div>
                        
                        {!imagePreview ? (
                            <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50">
                                <div className="flex bg-white dark:bg-gray-800 p-3 rounded-full shadow-sm mb-3">
                                    <FileIcon className="size-6 text-brand-500" />
                                </div>
                                <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Click to upload image</p>
                                <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF (max. 5MB)</p>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden" 
                                    onChange={handleFileChange}
                                />
                            </label>
                        ) : (
                            <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                <img src={imagePreview} alt="Preview" className="h-48 w-full object-cover" />
                                <div className="absolute top-2 right-2">
                                    <button 
                                        onClick={() => {
                                            setCreateForm(prev => ({ ...prev, image: null }));
                                            setImagePreview(null);
                                        }}
                                        className="rounded-full bg-white/90 p-1.5 text-gray-600 shadow-sm backdrop-blur-sm transition-colors hover:text-red-500"
                                    >
                                        <CloseIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            
            {/* Image Preview Modal */}
            <Modal isOpen={isImagePreviewOpen} onClose={() => setIsImagePreviewOpen(false)} className="max-w-5xl">
                <div className="relative">
                    <button 
                        onClick={() => setIsImagePreviewOpen(false)}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                        <CloseIcon className="size-6" />
                    </button>
                    <img 
                        src={previewImageUrl} 
                        alt="Attachment preview" 
                        className="w-full h-auto max-h-[90vh] object-contain bg-gray-100 dark:bg-gray-900"
                    />
                </div>
            </Modal>
            
            {/* History Modal */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} className="max-w-xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Approval History</h3>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">Track the submission through levels of approval.</p>
                     </div>
                     <button onClick={() => setIsHistoryModalOpen(false)} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]">
                        <CloseIcon className="size-6" />
                     </button>
                </div>
                <div className="p-6 overflow-y-auto grow">
                    {isLoadingHistory ? (
                         <div className="flex flex-col items-center justify-center py-20">
                            <div className="size-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                            <p className="mt-4 text-sm font-bold text-gray-400 italic">Fetching tracking data...</p>
                         </div>
                    ) : (
                        <div className="px-2">
                             <ApprovalHistoryTimeline approvals={approvalHistory} />
                             <div ref={historyEndRef} />
                        </div>
                    )}
                </div>
            </Modal>

            {/* Confirmation Action Modal */}
            <Modal 
                isOpen={!!reviewAction} 
                onClose={() => { setReviewAction(null); setRejectionReason(""); }} 
                title={reviewAction === "APPROVE" ? "Confirm Approval" : "Reject Request"}
                className="max-w-lg"
            >
                <div>
                     {selectedSubmission && (
                        <div className="space-y-4">
                            {reviewAction === "REJECT" && (
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        Are you sure you want to reject this request? Please provide a reason below.
                                    </p>
                                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                                        Rejection Reason *
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Please provide a reason for rejection..."
                                        rows={4}
                                        className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                </div>
                            )}
                            {reviewAction === "APPROVE" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Approval Level</label>
                                            <input
                                                type="text"
                                                disabled
                                                value={`Level ${selectedSubmission.currentApprovalLevel}`}
                                                className="w-full rounded-xl border border-gray-100 bg-gray-50/50 py-2.5 px-4 text-sm font-bold text-gray-500 outline-none dark:border-white/[0.08] dark:bg-white/[0.03] shadow-sm cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="space-y-1.5 opacity-50">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Next Step</label>
                                            <input
                                                type="text"
                                                disabled
                                                value={selectedSubmission.leaveType?.approvalLevelsRequired && selectedSubmission.currentApprovalLevel < selectedSubmission.leaveType.approvalLevelsRequired 
                                                    ? `Level ${selectedSubmission.currentApprovalLevel + 1}` 
                                                    : "Fully Approved"}
                                                className="w-full rounded-xl border border-dashed border-gray-200 bg-transparent py-2.5 px-4 text-sm font-medium text-gray-400 outline-none dark:border-white/[0.08] shadow-sm cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                                            Approval Comments
                                        </label>
                                        <textarea
                                            value={approvalComments}
                                            onChange={(e) => setApprovalComments(e.target.value)}
                                            placeholder="Add internal notes or feedback (optional)..."
                                            rows={3}
                                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setReviewAction(null);
                                        setRejectionReason("");
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleReviewSubmit}
                                    disabled={reviewAction === "REJECT" && !rejectionReason.trim()}
                                    className={reviewAction === "REJECT" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                                >
                                    Confirm {reviewAction === "APPROVE" ? "Approval" : "Rejection"}
                                </Button>
                            </div>
                        </div>
                     )}
                </div>
            </Modal>

            <ConfirmDialog {...confirmState} />
        </>
    );
};

export default LeaveRequests;
