import React, { useState, useEffect, useRef } from "react";
import { useUpdateEmployee } from "../../../api/hooks/useProfiles";
import { EmployeeProfile, UpdateEmployeeDto } from "../../../api/types/profiles";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Switch from "../../../components/atoms/Switch";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Modal from "../../../components/molecules/Modal";
import { showSuccess } from "../../../utils/toast";
import DatePicker from "../../../components/molecules/DatePicker";
import NumberInput from "../../../components/atoms/NumberInput";
import PhoneNumberInput from "../../../components/atoms/PhoneNumberInput";
import { UserCircleIcon, PlusIcon, TrashBinIcon } from "../../../components/atoms/Icons";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: EmployeeProfile;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, employee }) => {
    const updateMutation = useUpdateEmployee();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<UpdateEmployeeDto>({});

    // Initialize form data when modal opens or employee changes
    useEffect(() => {
        if (isOpen && employee) {
            setFormData({
                name: employee.user?.name || "",
                email: employee.user?.email || "",
                phone: employee.user?.phone || "",
                isActive: employee.user?.isActive ?? true,
                employeeId: employee.employeeId,
                nip: employee.nip || "",
                department: employee.department || "",
                position: employee.position || "",
                employmentStatus: employee.employmentStatus || "PERMANENT",
                hireDate: employee.hireDate?.split('T')[0] || "",
                nik: employee.nik || "",
                placeOfBirth: employee.placeOfBirth || "",
                dateOfBirth: employee.dateOfBirth?.split('T')[0] || "",
                gender: employee.gender || "M",
                religion: employee.religion || "",
                address: employee.address || "",
                rt: employee.rt || "",
                rw: employee.rw || "",
                kelurahan: employee.kelurahan || "",
                kecamatan: employee.kecamatan || "",
                province: employee.province || "",
                notes: employee.notes || ""
            });
            setPreviewPhoto(employee.user?.photo || null);
        }
    }, [isOpen, employee]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, photo: file }));
            setPreviewPhoto(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateMutation.mutateAsync({
                userId: employee.userId,
                data: formData
            });
            showSuccess("Profile updated successfully");
            onClose();
        } catch {
            // Error handled by hook
        }
    };

    const footerContent = (
        <div className="flex items-center justify-between w-full">
            <p className="text-xs text-gray-500 italic">
                * Required fields
            </p>
            <div className="flex gap-3">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={updateMutation.isPending} 
                    className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 tracking-wide"
                >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            className="max-w-6xl"
            title="Edit Academic Profile"
            description="Update your personal and employment information."
            footer={footerContent}
        >
            <div className="p-1">
                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* LEFT COLUMN: Photo & Key Info - STICKY */}
                    <div className="w-full lg:w-[240px] flex-shrink-0 space-y-4 lg:sticky lg:top-0">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">Profile Photo</Label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="relative group cursor-pointer"
                            >
                                <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all group-hover:border-brand-500/50 group-hover:bg-brand-50/10 shadow-inner">
                                    {previewPhoto ? (
                                        <img src={previewPhoto} alt="Preview" className="size-full object-cover" />
                                    ) : (
                                        <div className="text-center space-y-2 p-4">
                                            <UserCircleIcon className="size-12 mx-auto text-gray-300 dark:text-white/10 group-hover:text-brand-500 transition-colors" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Click to<br/>Upload</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors flex items-center justify-center">
                                        <PlusIcon className="size-8 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
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
                                        setFormData(prev => ({ ...prev, photo: null }));
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="flex items-center justify-center gap-2 text-sm text-error-500 font-bold hover:underline w-full"
                                >
                                    <TrashBinIcon className="size-4" />
                                    Remove Photo
                                </button>
                            )}
                        </div>

                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-0">Account Status</Label>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${formData.isActive ? 'text-success-600' : 'text-gray-400'}`}>
                                    {formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                                <Switch 
                                    checked={formData.isActive || false} 
                                    onChange={(val) => setFormData(prev => ({ ...prev, isActive: val }))} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Inputs Grid */}
                    <div className="flex-1 space-y-8 pb-4">
                        
                        {/* User Identity */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">User Identity</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label>Full Name <span className="text-error-500">*</span></Label>
                                    <Input placeholder="Full employee name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Email Address <span className="text-error-500">*</span></Label>
                                    <Input type="email" placeholder="employee@school.com" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                                </div>
                                <div className="space-y-1.5">
                                    <PhoneNumberInput label="Phone Number" placeholder="8xx-xxxx-xxxx" value={formData.phone || ""} onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))} />
                                </div>
                            </div>
                        </div>

                        {/* Employment Info */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Employment Details</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className=" col-span-1 space-y-1.5">
                                    <Label>Employee ID <span className="text-error-500">*</span></Label>
                                    <Input placeholder="EMP-XXXX" value={formData.employeeId} onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))} required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>NIP</Label>
                                    <Input placeholder="Official ID" value={formData.nip} onChange={(e) => setFormData(prev => ({ ...prev, nip: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <CustomSelect label="Employment Status" value={formData.employmentStatus || ""} options={[{label:"Permanent",value:"PERMANENT"},{label:"Contract",value:"CONTRACT"},{label:"Probation",value:"PROBATION"}]} onChange={(val) => setFormData(prev => ({ ...prev, employmentStatus: String(val) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <DatePicker label="Hire Date" value={formData.hireDate || null} onChange={(date) => setFormData(prev => ({ ...prev, hireDate: date }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Department</Label>
                                    <Input placeholder="e.g. IT" value={formData.department} onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Position</Label>
                                    <Input placeholder="e.g. Manager" value={formData.position} onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        
                        {/* Personal Details */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Personal Details</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <NumberInput label="NIK" placeholder="Identity Card ID" value={formData.nik || ""} onChange={(val) => setFormData(prev => ({ ...prev, nik: val }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <CustomSelect label="Gender" value={formData.gender || ""} options={[{label:"Male",value:"M"},{label:"Female",value:"F"}]} onChange={(val) => setFormData(prev => ({ ...prev, gender: String(val) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Place of Birth</Label>
                                    <Input placeholder="City" value={formData.placeOfBirth} onChange={(e) => setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <DatePicker label="Date of Birth" value={formData.dateOfBirth || null} onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Religion</Label>
                                    <Input placeholder="Religion" value={formData.religion} onChange={(e) => setFormData(prev => ({ ...prev, religion: e.target.value }))} />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Address Information</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1.5">
                                    <Label>Street Address</Label>
                                    <textarea rows={2} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-theme-xs outline-none" placeholder="Full street address..." value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <NumberInput label="RT" placeholder="001" value={formData.rt || ""} onChange={(val) => setFormData(prev => ({ ...prev, rt: val }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <NumberInput label="RW" placeholder="002" value={formData.rw || ""} onChange={(val) => setFormData(prev => ({ ...prev, rw: val }))} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Kelurahan/Village</Label>
                                    <Input placeholder="Village" value={formData.kelurahan} onChange={(e) => setFormData(prev => ({ ...prev, kelurahan: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Kecamatan/District</Label>
                                    <Input placeholder="District" value={formData.kecamatan} onChange={(e) => setFormData(prev => ({ ...prev, kecamatan: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Province</Label>
                                    <Input placeholder="Province" value={formData.province} onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))} />
                                </div>
                            </div>
                        </div>

                         {/* Notes */}
                         <div className="space-y-4">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Additional Notes</Label>
                            <div className="space-y-1.5">
                                 <textarea rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-theme-xs outline-none" placeholder="Internal notes about this employee..." value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditProfileModal;
