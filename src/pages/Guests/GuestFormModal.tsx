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
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format").or(z.literal("")).optional(),
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
                showSuccess("Guest updated successfully");
            } else {
                await createMutation.mutateAsync(data);
                showSuccess("Guest created successfully");
            }
            onClose();
        } catch (error) {
            showError(error, `Failed to ${selectedEntity ? "update" : "create"} guest`);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-lg"
            title={selectedEntity ? "Edit Guest" : "Add New Guest"}
            description="Enter guest details and contact information."
            footer={
                <div className="flex justify-end gap-3 w-full border-t border-gray-100 dark:border-white/5 pt-4">
                    <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending || updateMutation.isPending}>
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Guest"}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 pb-2">
                <div>
                    <Label>Name <span className="text-red-500">*</span></Label>
                    <Input {...register("name")} placeholder="Guest Name" />
                    {errors.name && <p className="text-xs text-error-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                    <Label>Email</Label>
                    <Input {...register("email")} type="email" placeholder="guest@example.com" />
                    {errors.email && <p className="text-xs text-error-500 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                    <Label>Phone</Label>
                    <Input {...register("phone")} type="tel" placeholder="08123456789" />
                    {errors.phone && <p className="text-xs text-error-500 mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                    <Label>Company (Optional)</Label>
                    <Input {...register("company")} placeholder="Company Name" />
                    {errors.company && <p className="text-xs text-error-500 mt-1">{errors.company.message}</p>}
                </div>
                <div>
                    <Label>ID Card Number (Optional)</Label>
                    <Input {...register("idCardNumber")} placeholder="Identity Document Number" />
                    {errors.idCardNumber && <p className="text-xs text-error-500 mt-1">{errors.idCardNumber.message}</p>}
                </div>
            </form>
        </Modal>
    );
};

export default GuestFormModal;
