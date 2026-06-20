import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import { PlusIcon } from "../../../components/atoms/Icons";
import CustomSelect from "../../../components/molecules/CustomSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import Label from "../../../components/atoms/Label";
import { LeaveSubmission } from "../../../api/types/leave";
import { API_BASE_URL } from "../../../api/client";
import { useSubmitLeave, useUpdateSubmission } from "../../../api/hooks/useLeaves";
import { showSuccess, showError } from "../../../utils/toast";

const createSubmissionSchema = z.object({
    leaveTypeCode: z.string().min(1, "Tipe Cuti is required"),
    startDate: z.string().min(1, "Tanggal Mulai is required"),
    endDate: z.string().min(1, "Tanggal Selesai is required"),
    reason: z.string().min(1, "Alasan is required"),
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

    const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<CreateFormValues>({
        resolver: zodResolver(createSubmissionSchema),
        defaultValues: { leaveTypeCode: "", startDate: "", endDate: "", reason: "" }
    });

    const selectedTypeCode = watch("leaveTypeCode");
    const activeLeaveType = leaveTypes.find(t => t.code === selectedTypeCode);

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
            title={selectedEntity ? "Edit Pengajuan Cuti" : "Create Leave Request"}
            description={selectedEntity ? "Update the details of your leave submission." : "Submit a new leave request for approval."}
            className={`${selectedEntity?.attachment ? "max-w-4xl" : "max-w-lg"} sm:m-4`}
            footer={
                <div className="flex justify-end gap-3 w-full sm:w-auto">
                    <Button variant="outline" type="button" onClick={onClose} className="flex-1 sm:flex-none">Batal</Button>
                    <Button type="submit" form="leave-form" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 sm:flex-none">
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                </div>
            }
        >
            <form id="leave-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className={`grid gap-6 ${selectedEntity?.attachment ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="space-y-4">
                        <Controller
                            name="leaveTypeCode"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-1.5">
                                    <Label>Tipe Cuti <span className="text-error-500">*</span></Label>
                                    <CustomSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={leaveTypes.map(t => ({ label: t.displayName || t.code, value: t.code }))}
                                        placeholder="Select Type"
                                    />
                                    {activeLeaveType && (
                                        <div className="mt-2 text-xs text-gray-600 bg-brand-50/50 dark:bg-brand-500/5 p-3 rounded-xl border border-brand-100 dark:border-brand-500/20 space-y-2.5">
                                            {activeLeaveType.description && (
                                                <p className="dark:text-gray-300"><span className="font-semibold text-brand-800 dark:text-brand-300">Deskripsi:</span> {activeLeaveType.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-brand-800 dark:text-brand-300">Lampiran:</span> 
                                                    {activeLeaveType.requiresFile ? <span className="text-error-600 bg-error-50 dark:bg-error-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold">Diwajibkan</span> : <span className="text-gray-500 dark:text-gray-400 font-medium">Opsional</span>}
                                                </div>
                                                {activeLeaveType.maxDaysPerYear > 0 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-brand-800 dark:text-brand-300">Batas Maksimal:</span> 
                                                        <span className="font-medium dark:text-gray-300">{activeLeaveType.maxDaysPerYear} Hari/Tahun</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-brand-800 dark:text-brand-300">Persetujuan Dibutuhkan:</span> 
                                                    <span className="font-medium dark:text-gray-300">{activeLeaveType.approvalLevelsRequired}</span>
                                                </div>
                                            </div>

                                            {activeLeaveType.approvalLevelsRequired > 0 && (
                                                <div className="pt-2.5 border-t border-brand-200/60 dark:border-brand-500/20">
                                                    <span className="font-semibold text-brand-800 dark:text-brand-300 block mb-2">Hierarki Persetujuan:</span>
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        {activeLeaveType.approvers && activeLeaveType.approvers.length > 0 ? (
                                                            activeLeaveType.approvers.sort((a, b) => a.approvalLevel - b.approvalLevel).map((appr, idx) => (
                                                                <React.Fragment key={appr.id}>
                                                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800/50 border border-brand-200 dark:border-brand-500/30 rounded-lg p-1.5 px-2.5">
                                                                        <div className="flex items-center justify-center size-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 text-[10px] font-extrabold">
                                                                            {appr.approvalLevel}
                                                                        </div>
                                                                        <span className="text-gray-700 dark:text-gray-200 font-medium text-[11px]">{appr.approver?.name || "Unknown"}</span>
                                                                    </div>
                                                                    {idx < activeLeaveType.approvers!.length - 1 && (
                                                                        <svg className="size-3.5 text-brand-400 dark:text-brand-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                                        </svg>
                                                                    )}
                                                                </React.Fragment>
                                                            ))
                                                        ) : (
                                                            Array.from({ length: activeLeaveType.approvalLevelsRequired }).map((_, idx) => (
                                                                <React.Fragment key={`default-${idx}`}>
                                                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800/50 border border-brand-200 dark:border-brand-500/30 rounded-lg p-1.5 px-2.5">
                                                                        <div className="flex items-center justify-center size-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 text-[10px] font-extrabold">
                                                                            {idx + 1}
                                                                        </div>
                                                                        <span className="text-gray-700 dark:text-gray-200 font-medium text-[11px]">Admin Sistem / HR</span>
                                                                    </div>
                                                                    {idx < activeLeaveType.approvalLevelsRequired - 1 && (
                                                                        <svg className="size-3.5 text-brand-400 dark:text-brand-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                                        </svg>
                                                                    )}
                                                                </React.Fragment>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                        <DatePicker label="Tanggal Mulai" value={field.value} onChange={field.onChange} />
                                        {errors.startDate && <p className="text-xs text-error-500">{errors.startDate.message}</p>}
                                    </div>
                                )}
                            />
                            <Controller
                                name="endDate"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-1.5">
                                        <DatePicker label="Tanggal Selesai" value={field.value} onChange={field.onChange} />
                                        {errors.endDate && <p className="text-xs text-error-500">{errors.endDate.message}</p>}
                                    </div>
                                )}
                            />
                        </div>
                        <div>
                            <Label>Alasan <span className="text-error-500">*</span></Label>
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
                                <Label>Lampiran (Opsional kecuali diwajibkan oleh tipe)</Label>
                                <div className="relative mt-1.5">
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
                                        className="hidden"
                                        id="leave-attachment"
                                        accept="image/*"
                                    />
                                    <label
                                        htmlFor="leave-attachment"
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                                    >
                                        <PlusIcon className="size-5" />
                                        {/* To show file name, we need to access the watched 'image' from react-hook-form or keep our own state. Since we only have imagePreview, we can check if it's there. */}
                                        {imagePreview ? "Change image" : "Click to upload image"}
                                    </label>
                                </div>
                                {imagePreview && (
                                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                                        <img src={imagePreview} alt="Preview" className="h-40 w-full object-contain" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedEntity?.attachment && (
                        <div className="space-y-3">
                            <Label>Lampiran Saat Ini</Label>
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-center p-4">
                                <img 
                                    src={selectedEntity.attachment.startsWith('http') ? selectedEntity.attachment : `${new URL(API_BASE_URL).origin}/${selectedEntity.attachment}`}
                                    alt="Attachment" 
                                    className="max-h-[300px] object-contain"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default LeaveFormModal;
