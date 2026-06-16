import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '../../components/molecules/Modal';
import Input from '../../components/atoms/InputField';
import Label from '../../components/atoms/Label';
import Button from '../../components/atoms/Button';
import { useCreateReimbursement } from '../../api/hooks/useReimbursements';
import { showSuccess, showError } from '../../utils/toast';

interface ReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity?: any;
}

const reimbursementSchema = z.object({
  reimbursementTypeId: z.number().min(1, 'Jenis klaim wajib diisi'),
  amount: z.number().min(1, 'Jumlah wajib lebih dari 0'),
  dateIncurred: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().min(1, 'Keterangan wajib diisi'),
});

type ReimbursementFormValues = z.infer<typeof reimbursementSchema>;

const ReimbursementModal: React.FC<ReimbursementModalProps> = ({ isOpen, onClose, selectedEntity }) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ReimbursementFormValues>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: {
      reimbursementTypeId: 1, // Default Transport
      amount: 0,
      dateIncurred: '',
      description: '',
    }
  });

  const createMutation = useCreateReimbursement();

  useEffect(() => {
    if (isOpen) {
      if (selectedEntity) {
        reset({
          reimbursementTypeId: selectedEntity.reimbursementTypeId || 1,
          amount: Number(selectedEntity.amount) || 0,
          dateIncurred: selectedEntity.dateIncurred ? new Date(selectedEntity.dateIncurred).toISOString().slice(0, 10) : '',
          description: selectedEntity.description || '',
        });
      } else {
        reset({
          reimbursementTypeId: 1,
          amount: 0,
          dateIncurred: '',
          description: '',
        });
      }
    }
  }, [isOpen, selectedEntity, reset]);

  const onSubmit = async (data: ReimbursementFormValues) => {
    try {
      if (selectedEntity) {
        // TODO: Update mutation
      } else {
        await createMutation.mutateAsync({
          reimbursementTypeId: data.reimbursementTypeId,
          amount: data.amount,
          dateIncurred: new Date(data.dateIncurred).toISOString(),
          description: data.description,
        });
        showSuccess('Klaim biaya berhasil diajukan');
      }
      onClose();
    } catch (error) {
      showError(error, 'Gagal menyimpan Klaim Biaya');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" title={selectedEntity ? "Edit Klaim Biaya" : "Pengajuan Klaim Biaya"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Jumlah Biaya (Rp)</Label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                placeholder="Contoh: 150000"
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={errors.amount?.message}
              />
            )}
          />
        </div>

        <div>
          <Label>Tanggal Kejadian</Label>
          <Controller
            name="dateIncurred"
            control={control}
            render={({ field }) => (
              <Input
                type="date"
                value={field.value}
                onChange={field.onChange}
                error={errors.dateIncurred?.message}
              />
            )}
          />
        </div>

        <div>
          <Label>Keterangan</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                placeholder="Jelaskan penggunaan biaya..."
                value={field.value}
                onChange={field.onChange}
                error={errors.description?.message}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
          <Button variant="outline" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Simpan</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReimbursementModal;
