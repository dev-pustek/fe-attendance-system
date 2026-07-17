import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "../../components/molecules/Modal";
import Button from "../../components/atoms/Button";
import Label from "../../components/atoms/Label";
import { Guest } from "../../api/types/system";
import { useCheckInGuest } from "../../api/hooks/useGuests";
import { showSuccess, showError } from "../../utils/toast";

const checkInSchema = z.object({
    purpose: z.string().min(1, "Tujuan wajib diisi"),
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

interface GuestCheckInModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedGuest: Guest | null;
}

const GuestCheckInModal: React.FC<GuestCheckInModalProps> = ({ isOpen, onClose, selectedGuest }) => {
    const checkInMutation = useCheckInGuest();

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CheckInFormValues>({
        resolver: zodResolver(checkInSchema),
        defaultValues: { purpose: "" }
    });

    useEffect(() => {
        if (isOpen) reset({ purpose: "" });
    }, [isOpen, reset]);

    const onSubmit = async (data: CheckInFormValues) => {
        if (!selectedGuest) return;
        try {
            await checkInMutation.mutateAsync({
                public_id: selectedGuest.public_id || String(selectedGuest.id),
                data: { purpose: data.purpose },
            });
            showSuccess("Tamu berhasil check-in");
            onClose();
        } catch (error) {
            showError(error, "Gagal melakukan check-in tamu");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-lg"
            title="Check-In Tamu"
            description="Catat tujuan kunjungan ini."
            footer={
                <div className="flex justify-end gap-3 w-full border-t border-gray-100 dark:border-white/5 pt-4">
                    <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={checkInMutation.isPending}>
                        {checkInMutation.isPending ? "Memproses Check-In..." : "Check-In"}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 pb-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400 mb-1">Detail Tamu</p>
                    <p className="font-bold text-gray-900 dark:text-white text-base">
                        {selectedGuest?.name}
                    </p>
                    {selectedGuest?.company && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{selectedGuest.company}</p>
                    )}
                </div>

                <div>
                    <Label>Tujuan <span className="text-red-500">*</span></Label>
                    <textarea
                        {...register("purpose")}
                        placeholder="misalnya Pertemuan dengan Kepala Sekolah"
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-theme-xs outline-none"
                    />
                    {errors.purpose && <p className="text-xs text-error-500 mt-1">{errors.purpose.message}</p>}
                </div>
            </form>
        </Modal>
    );
};

export default GuestCheckInModal;
