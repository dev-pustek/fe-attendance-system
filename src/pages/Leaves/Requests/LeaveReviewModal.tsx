import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import Badge from "../../../components/atoms/Badge";
import { CloseIcon, CheckCircleIcon } from "../../../components/atoms/Icons";
import { LeaveSubmission, LeaveStatus } from "../../../api/types/leave";
import { useReviewLeave } from "../../../api/hooks/useLeaves";
import { showSuccess, showError } from "../../../utils/toast";

const reviewSchema = z.object({
    comments: z.string().optional(),
    action: z.enum(["APPROVE", "REJECT", ""]),
}).superRefine((data, ctx) => {
    if (data.action === "REJECT" && (!data.comments || data.comments.trim() === "")) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Rejection reason is required",
            path: ["comments"],
        });
    }
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface LeaveReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedEntity: LeaveSubmission | null;
}

const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
        case "approved": return "success";
        case "partially_approved": return "warning";
        case "rejected": return "error";
        default: return "light";
    }
};

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({ isOpen, onClose, selectedEntity }) => {
    const reviewMutation = useReviewLeave();
    const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | null>(null);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewSchema),
        defaultValues: { comments: "", action: "" }
    });

    useEffect(() => {
        if (isOpen) {
            setReviewAction(null);
            reset();
        }
    }, [isOpen, reset]);

    const handleActionClick = (action: "APPROVE" | "REJECT") => {
        setReviewAction(action);
        setValue("action", action);
    };

    const onSubmit = async (data: ReviewFormValues) => {
        if (!selectedEntity || !reviewAction) return;
        try {
            await reviewMutation.mutateAsync({
                public_id: selectedEntity.public_id,
                data: {
                    status: reviewAction === "APPROVE" ? "approved" : "rejected",
                    comments: data.comments,
                    approvalLevel: selectedEntity.currentApprovalLevel,
                    rejectionReason: reviewAction === "REJECT" ? data.comments : undefined,
                }
            });
            showSuccess(`Request ${reviewAction === "APPROVE" ? "approved" : "rejected"} successfully!`);
            onClose();
        } catch (error) {
            showError(error, "Failed to process review");
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Review Leave Request"
            description="Approve or reject this employee's leave request."
            footer={
                !reviewAction && selectedEntity?.status !== "approved" && selectedEntity?.status !== "rejected" ? (
                    <div className="flex w-full gap-3">
                        <Button variant="outline" onClick={() => handleActionClick("REJECT")} className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
                            <CloseIcon className="size-4 mr-2" /> Reject
                        </Button>
                        <Button variant="outline" onClick={() => handleActionClick("APPROVE")} className="flex-1 border-green-200 text-green-600 hover:bg-green-50">
                            <CheckCircleIcon className="size-4 mr-2" /> Approve
                        </Button>
                    </div>
                ) : !reviewAction ? (
                    <div className="w-full text-center text-sm text-gray-500">
                        Request is <span className="font-bold lowercase">{selectedEntity?.status}</span>
                    </div>
                ) : null
            }
        >
            <div className="pt-4 pb-2 space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg overflow-hidden">
                            {selectedEntity?.user?.photo ? <img src={selectedEntity.user.photo} alt={selectedEntity.user.name} /> : selectedEntity?.user?.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{selectedEntity?.user?.name}</p>
                            <p className="text-xs text-gray-500">{selectedEntity?.leaveType?.displayName} - {selectedEntity?.totalDays} Days</p>
                        </div>
                    </div>
                    <Badge color={getStatusColor(selectedEntity?.status || "pending")}>
                        {selectedEntity?.status.replace("_", " ")}
                    </Badge>
                </div>

                {reviewAction && (
                    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 p-4 border rounded-xl animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-lg relative">
                        <button type="button" onClick={() => { setReviewAction(null); setValue("action", ""); }} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                            <CloseIcon className="size-4" />
                        </button>
                        <h4 className={`text-sm font-bold mb-3 ${reviewAction === 'APPROVE' ? 'text-green-600' : 'text-red-600'}`}>
                            {reviewAction === 'APPROVE' ? 'Approval Comments' : 'Rejection Reason'}
                        </h4>
                        <textarea
                            {...register("comments")}
                            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 outline-none dark:bg-gray-800 dark:border-gray-700"
                            rows={3}
                            placeholder={`Enter your ${reviewAction.toLowerCase()} notes...`}
                        />
                        {errors.comments && <p className="text-xs text-error-500 mt-1">{errors.comments.message}</p>}
                        
                        <Button type="submit" className="mt-3 w-full" disabled={reviewMutation.isPending}>
                            {reviewMutation.isPending ? "Processing..." : `Confirm ${reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}`}
                        </Button>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default LeaveReviewModal;
