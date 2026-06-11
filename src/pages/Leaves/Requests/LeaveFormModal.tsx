import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import CustomSelect from "../../../components/molecules/CustomSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import Label from "../../../components/atoms/Label";
import { LeaveSubmission } from "../../../api/types/leave";
import { useSubmitLeave, useUpdateSubmission } from "../../../api/hooks/useLeaves";
import { showSuccess, showError } from "../../../utils/toast";

const createSubmissionSchema = z.object({
    leaveTypeCode: z.string().min(1, "Leave Type is required"),
    startDate: z.string().min(1, "Start Date is required"),
    endDate: z.string().min(1, "End Date is required"),
    reason: z.string().min(1, "Reason is required"),
    image: z.any().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
});

type CreateFormValues = z.infer<typeof createSubmissionSchema>;

interface LeaveFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedEntity: LeaveSubmission | null;
    leaveTypes: any[];
}

const LeaveFormModal: React.FC<LeaveFormModalProps> = ({ isOpen, onClose, selectedEntity, leaveTypes }) => {
    const createMutation = useSubmitLeave();
    const updateMutation = useUpdateSubmission();
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<CreateFormValues>({
        resolver: zodResolver(createSubmissionSchema),
        defaultValues: { leaveTypeCode: "", startDate: "", endDate: "", reason: "" }
    });

    useEffect(() => {
        if (selectedEntity) {
            setValue("leaveTypeCode", selectedEntity.leaveType?.code || "");
            setValue("startDate", selectedEntity.startDate);
            setValue("endDate", selectedEntity.endDate);
            setValue("reason", selectedEntity.reason);
            setImagePreview(null);
        } else {
            reset();
            setImagePreview(null);
        }
    }, [selectedEntity, isOpen, setValue, reset]);

    const onSubmit = async (data: CreateFormValues) => {
        const selectedLeaveType = leaveTypes.find(t => t.code === data.leaveTypeCode);
        if (selectedLeaveType?.requiresFile && !data.image && !selectedEntity?.attachment) {
            showError(null, "Attachment is required for this leave type");
            return;
        }

        try {
            if (selectedEntity) {
                await updateMutation.mutateAsync({
                    public_id: selectedEntity.public_id,
                    data: {
                        leaveTypeCode: data.leaveTypeCode,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        reason: data.reason,
                        ...(data.image ? { image: data.image } : {})
                    }
                });
                showSuccess("Leave request updated successfully");
            } else {
                await createMutation.mutateAsync({
                    leaveTypeCode: data.leaveTypeCode,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    reason: data.reason,
                    ...(data.image ? { image: data.image } : {})
                });
                showSuccess("Leave request submitted successfully");
            }
            onClose();
        } catch (error) {
            showError(error, `Failed to ${selectedEntity ? "update" : "create"} request`);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={selectedEntity ? "Edit Leave Request" : "Create Leave Request"}
            description={selectedEntity ? "Update the details of your leave submission." : "Submit a new leave request for approval."}
            className={selectedEntity?.attachment ? "max-w-4xl" : "max-w-lg"}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className={`grid gap-6 ${selectedEntity?.attachment ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-4">
                        <Controller
                            name="leaveTypeCode"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-1.5">
                                    <Label>Leave Type <span className="text-error-500">*</span></Label>
                                    <CustomSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={leaveTypes.map(t => ({ label: t.displayName || t.code, value: t.code }))}
                                        placeholder="Select Type"
                                    />
                                    {errors.leaveTypeCode && <p className="text-xs text-error-500">{errors.leaveTypeCode.message}</p>}
                                </div>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="startDate"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-1.5">
                                        <DatePicker label="Start Date" value={field.value} onChange={field.onChange} />
                                        {errors.startDate && <p className="text-xs text-error-500">{errors.startDate.message}</p>}
                                    </div>
                                )}
                            />
                            <Controller
                                name="endDate"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-1.5">
                                        <DatePicker label="End Date" value={field.value} onChange={field.onChange} />
                                        {errors.endDate && <p className="text-xs text-error-500">{errors.endDate.message}</p>}
                                    </div>
                                )}
                            />
                        </div>
                        <div>
                            <Label>Reason <span className="text-error-500">*</span></Label>
                            <textarea
                                {...register("reason")}
                                className="w-full mt-1.5 px-4 py-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
                                rows={3}
                                placeholder="Brief reason..."
                            />
                            {errors.reason && <p className="text-xs text-error-500 mt-1">{errors.reason.message}</p>}
                        </div>
                        {!selectedEntity && (
                            <div>
                                <Label>Attachment (Optional unless required by type)</Label>
                                <input 
                                    type="file" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setValue("image", file);
                                            const reader = new FileReader();
                                            reader.onloadend = () => setImagePreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="mt-1.5 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                />
                                {imagePreview && (
                                    <img src={imagePreview} alt="Preview" className="mt-3 h-32 object-contain rounded-lg border border-gray-200" />
                                )}
                            </div>
                        )}
                    </div>
                    {selectedEntity?.attachment && (
                        <div className="space-y-3">
                            <Label>Current Attachment</Label>
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-center p-4">
                                <img 
                                    src={selectedEntity.attachment.startsWith('http') ? selectedEntity.attachment : `http://localhost:3000/${selectedEntity.attachment}`}
                                    alt="Attachment" 
                                    className="max-h-[300px] object-contain"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 w-full mt-6 border-t border-gray-100 dark:border-white/5 pt-4">
                    <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default LeaveFormModal;
