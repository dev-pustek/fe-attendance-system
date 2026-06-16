import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Class, CreateClassDto, UpdateClassDto } from "../../../api/types/academic";
import { 
    useCreateClass, 
    useUpdateClass,
    useEducationLevels,
    useGrades,
    useMajors,
    useAcademicYears
} from "../../../api/hooks/useAcademic";
import { useUsers } from "../../../api/hooks/useUsers";
import Modal from "../../../components/molecules/Modal";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Switch from "../../../components/atoms/Switch";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import NumberInput from "../../../components/molecules/NumberInput";
import { showSuccess, showError } from "../../../utils/toast";
import { useDebounce } from "../../../hooks/useDebounce";

const classSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  educationLevelId: z.union([z.string(), z.number()]).refine(val => val !== "", { message: "Education Level is required" }),
  gradeId: z.union([z.string(), z.number()]).refine(val => val !== "", { message: "Grade is required" }),
  majorId: z.union([z.string(), z.number()]).refine(val => val !== "", { message: "Major is required" }),
  academicYearId: z.union([z.string(), z.number()]).refine(val => val !== "", { message: "Academic Year is required" }),
  homeroomTeacherId: z.string().nullable().optional(),
  roomNumber: z.string().nullable().optional(),
  maxCapacity: z.number().min(1, "Must be at least 1"),
  isActive: z.boolean().default(true),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity: Class | null;
}

const ClassFormModal: React.FC<ClassFormModalProps> = ({ isOpen, onClose, selectedEntity }) => {
  const isEditing = !!selectedEntity;
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();

  const [teacherSearch, setTeacherSearch] = useState("");
  const debouncedTeacherSearch = useDebounce(teacherSearch, 500);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
        code: "",
        name: "",
        educationLevelId: "",
        gradeId: "",
        majorId: "",
        academicYearId: "",
        homeroomTeacherId: "",
        roomNumber: "",
        maxCapacity: 36,
        isActive: true,
    },
  });

  const selectedLevelId = watch("educationLevelId");

  // Fetch Dependencies
  const { data: levelsData } = useEducationLevels({ isActive: true });
  const educationLevels = levelsData?.data || [];

  const { data: gradesData } = useGrades({ 
      educationLevelId: selectedLevelId || undefined,
      limit: 100 
  });
  const grades = gradesData?.data || [];

  const { data: majorsData } = useMajors({ 
      educationLevelId: selectedLevelId || undefined,
      isActive: true,
      limit: 100 
  });
  const majors = majorsData?.data || [];

  const { data: academicYearsData } = useAcademicYears({ isActive: true });
  const academicYears = academicYearsData?.data || [];

  const { users: teachers, isLoading: isLoadingTeachers } = useUsers({ 
      typeCode: "teacher",
      search: debouncedTeacherSearch || undefined,
      limit: 20 
  });

  useEffect(() => {
    if (isOpen) {
      if (selectedEntity) {
        reset({
          code: selectedEntity.code,
          name: selectedEntity.name,
          educationLevelId: selectedEntity.educationLevelId || (selectedEntity as any).grade?.educationLevelId || "",
          gradeId: selectedEntity.gradeId || "",
          majorId: selectedEntity.majorId || "",
          academicYearId: selectedEntity.academicYearId || "",
          homeroomTeacherId: selectedEntity.homeroomTeacherId || "",
          roomNumber: selectedEntity.roomNumber || "",
          maxCapacity: selectedEntity.maxCapacity || 36,
          isActive: selectedEntity.isActive ?? true,
        });
      } else {
        reset({
            code: "",
            name: "",
            educationLevelId: "",
            gradeId: "",
            majorId: "",
            academicYearId: academicYears.find(y => y.isActive)?.id || "",
            homeroomTeacherId: "",
            roomNumber: "",
            maxCapacity: 36,
            isActive: true,
        });
      }
    }
  }, [isOpen, selectedEntity, reset, academicYears]);

  const onSubmit = async (data: ClassFormValues) => {
    try {
      const formattedData = {
          ...data,
          educationLevelId: Number(data.educationLevelId),
          gradeId: Number(data.gradeId),
          majorId: Number(data.majorId),
          academicYearId: Number(data.academicYearId),
          homeroomTeacherId: data.homeroomTeacherId || null,
          roomNumber: data.roomNumber || null,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: selectedEntity!.id,
          data: formattedData as UpdateClassDto,
        });
        showSuccess("Class updated successfully");
      } else {
        await createMutation.mutateAsync(formattedData as CreateClassDto);
        showSuccess("Class created successfully");
      }
      onClose();
    } catch (error) {
      showError(error, `Failed to ${isEditing ? "update" : "create"} class`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Class" : "Add New Class"}
      description={isEditing ? "Update class details below." : "Enter the new class information."}
      className="max-w-2xl"
    >
      <form id="class-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label>Class Code</Label>
                <Input
                    placeholder="e.g. 10-A-RPL"
                    {...register("code")}
                    error={errors.code?.message}
                />
            </div>
            <div className="space-y-1.5">
                <Label>Class Name</Label>
                <Input
                    placeholder="e.g. 10 RPL A"
                    {...register("name")}
                    error={errors.name?.message}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
                name="educationLevelId"
                control={control}
                render={({ field }) => (
                <div className="space-y-1.5 z-50">
                    <Label>Education Level</Label>
                    <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={educationLevels.map((l: { id: number | string; name: string }) => ({ label: l.name, value: l.id }))}
                        placeholder="Select Level"
                    />
                    {errors.educationLevelId && <p className="text-xs text-error-500">{errors.educationLevelId.message}</p>}
                </div>
                )}
            />
            <Controller
                name="gradeId"
                control={control}
                render={({ field }) => (
                <div className="space-y-1.5 z-40">
                    <Label>Grade</Label>
                    <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={grades.map((g: { id: number | string; name: string }) => ({ label: `Grade ${g.name}`, value: g.id }))}
                        placeholder="Select Grade"
                        disabled={!selectedLevelId}
                    />
                    {errors.gradeId && <p className="text-xs text-error-500">{errors.gradeId.message}</p>}
                </div>
                )}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
                name="majorId"
                control={control}
                render={({ field }) => (
                <div className="space-y-1.5 z-30">
                    <Label>Major</Label>
                    <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={majors.map((m: { id: number | string; name: string }) => ({ label: m.name, value: m.id }))}
                        placeholder="Select Major"
                        disabled={!selectedLevelId}
                    />
                    {errors.majorId && <p className="text-xs text-error-500">{errors.majorId.message}</p>}
                </div>
                )}
            />
            <Controller
                name="academicYearId"
                control={control}
                render={({ field }) => (
                <div className="space-y-1.5 z-20">
                    <Label>Academic Year</Label>
                    <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={academicYears.map((y: { id: number | string; name: string }) => ({ label: y.name, value: y.id }))}
                        placeholder="Select Year"
                    />
                    {errors.academicYearId && <p className="text-xs text-error-500">{errors.academicYearId.message}</p>}
                </div>
                )}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
                name="homeroomTeacherId"
                control={control}
                render={({ field }) => (
                <div className="space-y-1.5 z-10">
                    <Label>Homeroom Teacher (Optional)</Label>
                    <SearchableAsyncSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        onSearch={setTeacherSearch}
                        options={teachers.map((t: { public_id: string; name: string }) => ({ label: t.name, value: t.public_id }))}
                        isLoading={isLoadingTeachers}
                        placeholder="Search teacher..."
                    />
                    {errors.homeroomTeacherId && <p className="text-xs text-error-500">{errors.homeroomTeacherId.message}</p>}
                </div>
                )}
            />
            <div className="space-y-1.5">
                <Label>Room Number (Optional)</Label>
                <Input
                    placeholder="e.g. 101"
                    {...register("roomNumber")}
                    error={errors.roomNumber?.message}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
                name="maxCapacity"
                control={control}
                render={({ field }) => (
                <div className="space-y-1.5">
                    <Label>Max Capacity</Label>
                    <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={1}
                        max={100}
                    />
                    {errors.maxCapacity && <p className="text-xs text-error-500">{errors.maxCapacity.message}</p>}
                </div>
                )}
            />
            <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]">
                    <div className="space-y-0.5">
                        <Label>Status</Label>
                        <p className="text-xs text-gray-500">Active classes accept enrollments.</p>
                    </div>
                    <Switch checked={field.value} onChange={field.onChange} />
                </div>
                )}
            />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="class-form"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Class"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClassFormModal;
