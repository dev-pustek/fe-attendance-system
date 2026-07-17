import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "../../components/molecules/Modal";
import Button from "../../components/atoms/Button";
import Input from "../../components/atoms/InputField";
import Label from "../../components/atoms/Label";
import { Guest } from "../../api/types/system";
import { useCreateGuest, useUpdateGuest } from "../../api/hooks/useGuests";
import { showSuccess, showError } from "../../utils/toast";

const guestSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Format email tidak valid").or(z.literal("")).optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    idCardNumber: z.string().optional(),
});

type GuestFormValues = z.infer<typeof guestSchema>;

interface GuestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedEntity: Guest | null;
}

const GuestFormModal: React.FC<GuestFormModalProps> = ({ isOpen, onClose, selectedEntity }) => {
    const createMutation = useCreateGuest();
    const updateMutation = useUpdateGuest();

    const { register, handleSubmit, reset, formState: { errors } } = useForm<GuestFormValues>({
        resolver: zodResolver(guestSchema),
        defaultValues: { name: "", email: "", phone: "", company: "", idCardNumber: "" }
    });

    useEffect(() => {
        if (selectedEntity && isOpen) {
            reset({
                name: selectedEntity.name || "",
                email: selectedEntity.email || "",
                phone: selectedEntity.phone || "",
                company: selectedEntity.company || "",
                idCardNumber: selectedEntity.idCardNumber || "",
            });
        } else if (isOpen) {
            reset({ name: "", email: "", phone: "", company: "", idCardNumber: "" });
        }
    }, [selectedEntity, isOpen, reset]);

    const onSubmit = async (data: GuestFormValues) => {
        try {
            if (selectedEntity) {
                await updateMutation.mutateAsync({
                    id: selectedEntity.id || selectedEntity.public_id,
                    data,
                });
                showSuccess("Tamu berhasil diperbarui");
            } else {
                await createMutation.mutateAsync(data);
                showSuccess("Tamu berhasil dibuat");
            }
            onClose();
        } catch (error) {
            showError(error, `Gagal ${selectedEntity ? "memperbarui" : "membuat"} tamu`);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-lg"
            title={selectedEntity ? "Edit Tamu" : "Tambah Tamu Baru"}
            description="Masukkan detail tamu dan informasi kontak."
            footer={
                <div className="flex justify-end gap-3 w-full border-t border-gray-100 dark:border-white/5 pt-4">
                    <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending || updateMutation.isPending}>
                        {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan Tamu"}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 pb-2">
                <div>
                    <Label>Nama <span className="text-red-500">*</span></Label>
                    <Input {...register("name")} placeholder="Nama Tamu" />
                    {errors.name && <p className="text-xs text-error-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                    <Label>Email</Label>
                    <Input {...register("email")} type="email" placeholder="guest@example.com" />
                    {errors.email && <p className="text-xs text-error-500 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                    <Label>Telepon</Label>
                    <Input {...register("phone")} type="tel" placeholder="08123456789" />
                    {errors.phone && <p className="text-xs text-error-500 mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                    <Label>Perusahaan (Opsional)</Label>
                    <Input {...register("company")} placeholder="Nama Perusahaan" />
                    {errors.company && <p className="text-xs text-error-500 mt-1">{errors.company.message}</p>}
                </div>
                <div>
                    <Label>Nomor KTP (Opsional)</Label>
                    <Input {...register("idCardNumber")} placeholder="Nomor Dokumen Identitas" />
                    {errors.idCardNumber && <p className="text-xs text-error-500 mt-1">{errors.idCardNumber.message}</p>}
                </div>
            </form>
        </Modal>
    );
};

export default GuestFormModal;
