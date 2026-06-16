import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '../../components/molecules/Modal';
import Input from '../../components/atoms/InputField';
import Label from '../../components/atoms/Label';
import CustomSelect from '../../components/molecules/CustomSelect';
import Button from '../../components/atoms/Button';
import { useCreateGatePass } from '../../api/hooks/useGatePasses';
import { showSuccess, showError } from '../../utils/toast';

interface GatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity?: any;
}

const gatePassSchema = z.object({
  type: z.string().min(1, 'Pilih jenis izin'),
  expectedOutTime: z.string().min(1, 'Waktu keluar wajib diisi'),
  expectedInTime: z.string().optional(),
  reason: z.string().min(1, 'Alasan wajib diisi'),
});

type GatePassFormValues = z.infer<typeof gatePassSchema>;

const GatePassModal: React.FC<GatePassModalProps> = ({ isOpen, onClose, selectedEntity }) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<GatePassFormValues>({
    resolver: zodResolver(gatePassSchema),
    defaultValues: {
      type: 'personal',
      expectedOutTime: '',
      expectedInTime: '',
      reason: '',
    }
  });

  const createMutation = useCreateGatePass();

  useEffect(() => {
    if (isOpen) {
      if (selectedEntity) {
        reset({
          type: selectedEntity.type,
          expectedOutTime: selectedEntity.expectedOutTime ? new Date(selectedEntity.expectedOutTime).toISOString().slice(0, 16) : '',
          expectedInTime: selectedEntity.expectedInTime ? new Date(selectedEntity.expectedInTime).toISOString().slice(0, 16) : '',
          reason: selectedEntity.reason,
        });
      } else {
        reset({
          type: 'personal',
          expectedOutTime: '',
          expectedInTime: '',
          reason: '',
        });
      }
    }
  }, [isOpen, selectedEntity, reset]);

  const onSubmit = async (data: GatePassFormValues) => {
    try {
      if (selectedEntity) {
        // TODO: Update mutation
      } else {
        await createMutation.mutateAsync({
          type: data.type as any,
          expectedOutTime: new Date(data.expectedOutTime).toISOString(),
          expectedInTime: data.expectedInTime ? new Date(data.expectedInTime).toISOString() : undefined,
          reason: data.reason,
        });
        showSuccess('Izin Keluar berhasil diajukan');
      }
      onClose();
    } catch (error) {
      showError(error, 'Gagal menyimpan Izin Keluar');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" title={selectedEntity ? "Edit Izin Keluar" : "Pengajuan Izin Keluar"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Jenis Izin</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                onChange={(val) => field.onChange(String(val))}
                options={[
                  { label: 'Keperluan Pribadi', value: 'personal' },
                  { label: 'Dinas Luar', value: 'official_business' },
                  { label: 'Sakit/Pulang Cepat', value: 'sick_go_home' },
                ]}
              />
            )}
          />
          {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
        </div>

        <div>
          <Label>Waktu Keluar</Label>
          <Controller
            name="expectedOutTime"
            control={control}
            render={({ field }) => (
              <Input
                type="datetime-local"
                value={field.value}
                onChange={field.onChange}
                error={errors.expectedOutTime?.message}
              />
            )}
          />
        </div>

        <div>
          <Label>Perkiraan Kembali (Opsional)</Label>
          <Controller
            name="expectedInTime"
            control={control}
            render={({ field }) => (
              <Input
                type="datetime-local"
                value={field.value}
                onChange={field.onChange}
                error={errors.expectedInTime?.message}
              />
            )}
          />
        </div>

        <div>
          <Label>Alasan</Label>
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                placeholder="Jelaskan alasan izin keluar..."
                value={field.value}
                onChange={field.onChange}
                error={errors.reason?.message}
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

export default GatePassModal;
