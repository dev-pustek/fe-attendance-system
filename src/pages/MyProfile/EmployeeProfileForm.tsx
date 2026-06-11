import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { profilesService } from "../../api/services/profilesService";
import { useUpdateEmployee } from "../../api/hooks/useProfiles";
import {
  EmployeeProfile,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from "../../api/types/profiles";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import Input from "../../components/atoms/InputField";
import Label from "../../components/atoms/Label";
import Switch from "../../components/atoms/Switch";
import NumberInput from "../../components/atoms/NumberInput";
import PhoneNumberInput from "../../components/atoms/PhoneNumberInput";
import DatePicker from "../../components/molecules/DatePicker";
import CustomSelect from "../../components/molecules/CustomSelect";
import {
  UserCircleIcon,
  PlusIcon,
  TrashBinIcon,
} from "../../components/atoms/Icons";
import { showSuccess, showError } from "../../utils/toast";

export default function EmployeeProfileForm() {
  const { user } = useAuthStore();
  const updateMutation = useUpdateEmployee();

  const [isLoading, setIsLoading] = useState(true);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(
    null,
  );
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<CreateEmployeeDto>({
    name: "",
    email: "",
    phone: "",
    isActive: true,
    employeeId: "",
    nip: "",
    hireDate: "",
    employmentStatus: "ACTIVE",
    department: "",
    position: "",
    gender: "M",
    photo: undefined,
  } as CreateStudentDto);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.public_id) return;
      try {
        // Fetch student profile derived from user
        // Assuming we can get self profile or by user ID.
        // The profilesService.getStudent takes userId (public_id)
        // We need to check if this user IS a student.
        // Removed student check

        setIsLoading(true);
        // Note: getStudent expects userId as per service definition: `getStudent: async (userId: string)`
        const profile = await profilesService.getEmployee(user.public_id);
        setEmployeeProfile(profile);

        // Populate Form
        setFormData({
          name: profile.user?.name || "",
          email: profile.user?.email || "",
          phone: profile.user?.phone || "",
          isActive: profile.user?.isActive ?? true,
          employeeId: profile.employeeId,
          nip: profile.nip || "",
          nuptk: profile.nuptk || "",
          department: profile.department || "",
          position: profile.position || "",
          employmentStatus: profile.employmentStatus || "ACTIVE",
          hireDate: profile.hireDate?.split("T")[0] || "",
          nik: profile.nik || "",
          placeOfBirth: profile.placeOfBirth || "",
          dateOfBirth: profile.dateOfBirth?.split("T")[0] || "",
          gender: profile.gender || "M",
          religion: profile.religion || "",
          address: profile.address || "",
          rt: profile.rt || "",
          rw: profile.rw || "",
          kelurahan: profile.kelurahan || "",
          kecamatan: profile.kecamatan || "",
          province: profile.province || "",
          notes: profile.notes || "",
        } as any); // Cast because we are mixing Create/Update types partially

        setPreviewPhoto(profile.user?.photo || null);
      } catch (error) {
        console.error(error);
        showError("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      setPreviewPhoto(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeProfile) return;

    try {
      const payload: any = { ...formData };
      
      await updateMutation.mutateAsync({
        userId: employeeProfile.userId,
        data: payload as UpdateEmployeeDto,
      });

      // If name or photo changed, update auth store to reflect immediately in sidebar/header
      // But updateMutation returns profile, not user. User is nested.
      // We can re-fetch me or just generic update.
      // Simplified:
      showSuccess("Profile updated successfully");
    } catch {
      // handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading profile...</div>
    );
  }

  // Removed access restricted render

  return (
    <>
        <form
          id="my-profile-form"
          onSubmit={handleSubmit}
          className="flex flex-col lg:flex-row gap-10"
        >
          {/* LEFT COLUMN: Photo & Status */}
          <div className="w-full lg:w-[280px] flex-shrink-0 space-y-6 lg:sticky lg:top-24 self-start">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">
                Profile Photo
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer max-w-[200px] lg:max-w-none mx-auto lg:mx-0"
              >
                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all group-hover:border-brand-500/50 group-hover:bg-brand-50/10 shadow-inner">
                  {previewPhoto ? (
                    <img
                      src={previewPhoto}
                      alt="Preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-2 p-4">
                      <UserCircleIcon className="size-16 mx-auto text-gray-300 dark:text-white/10 group-hover:text-brand-500 transition-colors" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        Click to
                        <br />
                        Upload
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors flex items-center justify-center">
                    <PlusIcon className="size-10 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              {previewPhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewPhoto(null);
                    setFormData((prev) => ({ ...prev, photo: null }));
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex items-center justify-center gap-2 text-sm text-error-500 font-bold hover:underline w-full"
                >
                  <TrashBinIcon className="size-4" />
                  Remove Photo
                </button>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col gap-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-0">
                Account Status
              </Label>
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${formData.isActive ? "text-success-600" : "text-gray-400"}`}
                >
                  {formData.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
                {/* User cannot change their own status usually, so maybe read-only or hidden */}
                {/* Keeping it consistent with modal but disabled */}
                <div className="opacity-50 pointer-events-none">
                  <Switch
                    checked={formData.isActive || false}
                    onChange={() => {}}
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">
                Contact admin to change status
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Inputs Grid */}
          <div className="flex-1 space-y-8">
            {/* User Identity */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">
                User Identity
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="student@school.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <PhoneNumberInput
                    label="Phone Number"
                    placeholder="8xx-xxxx-xxxx"
                    value={formData.phone || ""}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, phone: val }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Employment Info */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">
                Employment Information
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label>Employee ID</Label>
                  <Input
                    placeholder="EMP-XXXX"
                    value={formData.employeeId}
                    disabled
                    className="bg-gray-50 text-gray-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>NIP / NUPTK</Label>
                  <Input
                    placeholder="National ID"
                    value={formData.nip || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nip: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input
                    placeholder="Department"
                    value={formData.department || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, department: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Position</Label>
                  <Input
                    placeholder="Job Title"
                    value={formData.position || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, position: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <DatePicker
                    label="Hire Date"
                    value={formData.hireDate || null}
                    onChange={(date) =>
                      setFormData((prev) => ({ ...prev, hireDate: date }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">
                Personal Details
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <NumberInput
                    label="NIK"
                    placeholder="Family Card ID"
                    value={formData.nik || ""}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, nik: val }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <CustomSelect
                    label="Gender"
                    value={formData.gender || ""}
                    options={[
                      { label: "Male", value: "M" },
                      { label: "Female", value: "F" },
                    ]}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, gender: String(val) }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Place of Birth</Label>
                  <Input
                    placeholder="City"
                    value={formData.placeOfBirth}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        placeOfBirth: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <DatePicker
                    label="Date of Birth"
                    value={formData.dateOfBirth || null}
                    onChange={(date) =>
                      setFormData((prev) => ({ ...prev, dateOfBirth: date }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Religion</Label>
                  <Input
                    placeholder="Religion"
                    value={formData.religion}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        religion: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">
                Address Information
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Street Address</Label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-theme-xs outline-none"
                    placeholder="Full street address..."
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <NumberInput
                      label="RT"
                      placeholder="001"
                      value={formData.rt || ""}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, rt: val }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <NumberInput
                      label="RW"
                      placeholder="002"
                      value={formData.rw || ""}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, rw: val }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Kelurahan/Village</Label>
                  <Input
                    placeholder="Village"
                    value={formData.kelurahan}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        kelurahan: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kecamatan/District</Label>
                  <Input
                    placeholder="District"
                    value={formData.kecamatan}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        kecamatan: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Province</Label>
                  <Input
                    placeholder="Province"
                    value={formData.province}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        province: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>



            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-brand-500 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 tracking-wide"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
    </>
  );
}
