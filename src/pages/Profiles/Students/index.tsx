import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useStudents, useDeleteStudent, useUpdateStudent, useCreateStudent } from "../../../api/hooks/useProfiles";
import { useClasses, useAcademicYears } from "../../../api/hooks/useAcademic";
import { StudentProfile, ProfileParams, CreateStudentDto, UpdateStudentDto } from "../../../api/types/profiles";
import { Class, AcademicYear } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Switch from "../../../components/atoms/Switch";
import { 
    EditIcon,
    TrashBinIcon,
    PlusIcon,
    GridIcon,
    UserCircleIcon,
    EyeIcon,
    ChevronLeftIcon,
    AngleRightIcon,
} from "../../../components/atoms/Icons";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Modal from "../../../components/molecules/Modal";
import DatePicker from "../../../components/molecules/DatePicker";
import NumberInput from "../../../components/atoms/NumberInput";
import PhoneNumberInput from "../../../components/atoms/PhoneNumberInput";
import { useSearchParams } from "react-router";

const StudentManagement: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();

    // Filters derived from URL
    const classFilter = searchParams.get("classId") || "all";
    const yearFilter = searchParams.get("academicYearId") || "all";
    const statusFilter = searchParams.get("status") || "all";

    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value === "all") {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        setSearchParams(newParams);
        setPage(1);
    };

    // Modal State

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    
    // Data Fetching
    const { data: studentsResponse, isLoading: isStudentsLoading } = useStudents({
        page,
        limit,
        search: debouncedSearch || undefined,
        classId: classFilter === "all" ? undefined : classFilter,
        academicYearId: yearFilter === "all" ? undefined : yearFilter,
        studentStatus: statusFilter === "all" ? undefined : statusFilter,
    } as ProfileParams);

    const { data: classesResponse } = useClasses();
    const { data: yearsResponse } = useAcademicYears();
    
    const createMutation = useCreateStudent();
    const deleteMutation = useDeleteStudent();
    const updateMutation = useUpdateStudent();

    const students = useMemo(() => studentsResponse?.data || [], [studentsResponse]);
    const meta = studentsResponse?.meta;
    const total = Number(meta?.total || 0);
    const totalPages = Number(meta?.totalPages || 1);

    const classes = useMemo(() => Array.isArray(classesResponse) ? classesResponse : (classesResponse?.data || []), [classesResponse]);
    const academicYears = useMemo(() => Array.isArray(yearsResponse) ? yearsResponse : (yearsResponse?.data || []), [yearsResponse]);

    // Form State
    const [formData, setFormData] = useState<CreateStudentDto>({
        name: "", email: "", phone: "", isActive: true,
        studentId: "", nisn: "", nis: "", entryYear: new Date().getFullYear(),
        studentStatus: "ACTIVE", pipRecipient: false,
        formGender: "M", // Temp field for select logic,
        photo: undefined
    } as CreateStudentDto);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handlers


    const handleEdit = (student: StudentProfile) => {
        setSelectedStudent(student);
        setFormData({
            name: student.user?.name || "",
            email: student.user?.email || "",
            phone: student.user?.phone || "",
            isActive: student.user?.isActive ?? true,
            studentId: student.studentId,
            nisn: student.nisn || "",
            nis: student.nis || "",
            nik: student.nik || "",
            placeOfBirth: student.placeOfBirth || "",
            dateOfBirth: student.dateOfBirth?.split('T')[0] || "",
            gender: student.gender || "M",
            religion: student.religion || "",
            address: student.address || "",
            rt: student.rt || "",
            rw: student.rw || "",
            kelurahan: student.kelurahan || "",
            kecamatan: student.kecamatan || "",
            province: student.province || "",
            fatherName: student.fatherName || "",
            fatherPhone: student.fatherPhone || "",
            motherName: student.motherName || "",
            motherPhone: student.motherPhone || "",
            entryYear: student.entryYear || new Date().getFullYear(),
            enrollmentDate: student.enrollmentDate?.split('T')[0] || "",
            studentStatus: student.studentStatus || "ACTIVE",
            pipRecipient: student.pipRecipient || false,
            kipNumber: student.kipNumber || "",
            notes: student.notes || ""
        });
        setPreviewPhoto(student.user?.photo || null);
        setIsFormModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedStudent(null);
        setFormData({
            name: "", email: "", phone: "", isActive: true,
            studentId: "", nisn: "", nis: "", 
            entryYear: new Date().getFullYear(),
            studentStatus: "ACTIVE", pipRecipient: false,
            gender: "M"
        } as CreateStudentDto);
        setPreviewPhoto(null);
        setIsFormModalOpen(true);
    };

    const handleDelete = async (student: StudentProfile) => {
        const confirmed = await confirm({
            variant: "delete",
            title: "Delete Student Profile",
            message: `Are you sure you want to delete the profile for ${student.user?.name || 'this student'}? This action cannot be undone.`,
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(student.userId);
            } catch (e) {
                showError(e);
            }
        }
    };

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
            if (selectedStudent) {
                await updateMutation.mutateAsync({
                    userId: selectedStudent.userId,
                    data: formData as UpdateStudentDto
                });
                showSuccess("Student updated successfully");
            } else {
                await createMutation.mutateAsync(formData as CreateStudentDto);
                showSuccess("Student created successfully");
            }
            setIsFormModalOpen(false);
        } catch {
            // Error handled by hook
        }
    };

    return (
        <>
            <PageMeta title="Student Management | Visia" description="Manage system students." />
            <PageBreadcrumb pageTitle="Student Management" />

            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View and manage student profiles and academic records.</p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="size-5" />
                        Add New Student
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Student</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <GridIcon className="size-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Name, NISN, or Student ID..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white shadow-sm"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect
                                label="Class"
                                value={classFilter === "all" ? "all" : Number(classFilter)}
                                onChange={(val) => updateFilter("classId", String(val))}
                                options={[
                                    { label: "All Classes", value: "all" },
                                    ...classes.map((cls: Class) => ({ label: cls.name, value: Number(cls.id) }))
                                ]}
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect
                                label="Academic Year"
                                value={yearFilter === "all" ? "all" : Number(yearFilter)}
                                onChange={(val) => updateFilter("academicYearId", String(val))}
                                options={[
                                    { label: "All Years", value: "all" },
                                    ...academicYears.map((ay: AcademicYear) => ({ label: ay.name, value: Number(ay.id) }))
                                ]}
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect
                                label="Status"
                                value={statusFilter}
                                onChange={(val) => updateFilter("status", String(val))}
                                options={[
                                    { label: "All Status", value: "all" },
                                    { label: "Active", value: "ACTIVE" },
                                    { label: "Graduated", value: "GRADUATED" },
                                    { label: "Withdrawn", value: "WITHDRAWN" },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Information</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID & NISN</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Enrollment</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isStudentsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                                            <span className="text-sm font-medium text-gray-400">Loading student directory...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                                                <UserCircleIcon className="size-5 opacity-20" />
                                            </div>
                                            <p className="text-sm font-medium">No students found matching your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student: StudentProfile) => (
                                    <TableRow key={student.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex size-10 items-center justify-center rounded-xl font-bold text-base overflow-hidden ${!student.user?.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : ''}`}>
                                                    {student.user?.photo ? (
                                                        <img src={student.user.photo} alt={student.user.name} className="size-full object-cover" />
                                                    ) : (
                                                        student.user?.name?.charAt(0) || "S"
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-theme-sm leading-tight">{student.user?.name || "Unknown Student"}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{student.user?.email || "No email linked"}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">NISN</span>
                                                    <span className="text-theme-sm text-gray-700 dark:text-gray-300">{student.nisn || "-"}</span>
                                                </div>
                                                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                                    <span className="font-mono">SID: {student.studentId}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    <GridIcon className="size-3.5 text-brand-500" />
                                                    {student.user?.activeClass?.name || "Not Enrolled"}
                                                </div>
                                                <p className="text-[11px] text-gray-400 uppercase tracking-wider">{student.user?.activeClass?.academicYear || "N/A"}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Badge color={student.studentStatus === 'ACTIVE' ? 'success' : 'light'}>
                                                {student.studentStatus || 'UNKNOWN'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/students/${student.userId}`)}
                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                                                    title="View 360 Profile"
                                                >
                                                    <EyeIcon className="size-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleEdit(student)}
                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                                                    title="Edit Profile"
                                                >
                                                    <EditIcon className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student)}
                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                                                    title="Delete Profile"
                                                >
                                                    <TrashBinIcon className="size-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {!isStudentsLoading && total > 0 && (
                    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                            <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                            <span className="font-medium text-gray-700 dark:text-white">{total}</span> students
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                            >
                                <ChevronLeftIcon className="size-4" />
                                Previous
                            </button>
                            <div className="flex items-center gap-1.5 px-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                                <span className="text-sm text-gray-400">/</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                            >
                                Next
                                <AngleRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal (Create/Edit) */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                className="max-w-6xl"
                title={selectedStudent ? 'Update Student Profile' : 'Add New Student'}
                description={selectedStudent ? 'Modify existing student data.' : 'Create and link a new student.'}
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsFormModalOpen(false)}
                            className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="student-form"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 tracking-wide"
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Student Profile'}
                        </button>
                    </div>
                }
            >
                <div className="p-1">
                    <form id="student-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                        {/* LEFT COLUMN: Photo & Status */}
                        <div className="w-full lg:w-[240px] flex-shrink-0 space-y-4">
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
                        <div className="flex-1 space-y-6 overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                            
                            {/* User Identity */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">User Identity</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Full Name <span className="text-error-500">*</span></Label>
                                        <Input placeholder="Full student name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Email Address <span className="text-error-500">*</span></Label>
                                        <Input type="email" placeholder="student@school.com" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <PhoneNumberInput label="Phone Number" placeholder="8xx-xxxx-xxxx" value={formData.phone || ""} onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))} required />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Info */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Academic Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Student ID <span className="text-error-500">*</span></Label>
                                        <Input placeholder="STU-XXXX" value={formData.studentId} onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>NISN <span className="text-error-500">*</span></Label>
                                        <Input placeholder="National Student ID" value={formData.nisn || ""} onChange={(e) => setFormData(prev => ({ ...prev, nisn: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>NIS <span className="text-error-500">*</span></Label>
                                        <Input placeholder="School ID" value={formData.nis || ""} onChange={(e) => setFormData(prev => ({ ...prev, nis: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <NumberInput 
                                            label="Entry Year" 
                                            placeholder="YYYY" 
                                            value={formData.entryYear || ""} 
                                            onChange={(val) => setFormData(prev => ({ ...prev, entryYear: val ? Number(val) : undefined }))} 
                                            maxLength={4}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <CustomSelect label="Student Status" value={formData.studentStatus || ""} options={[{label:"Active",value:"ACTIVE"},{label:"Graduated",value:"GRADUATED"},{label:"Withdrawn",value:"WITHDRAWN"}]} onChange={(val) => setFormData(prev => ({ ...prev, studentStatus: String(val) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <DatePicker label="Enrollment Date" value={formData.enrollmentDate || null} onChange={(date) => setFormData(prev => ({ ...prev, enrollmentDate: date }))} />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2 flex items-end gap-4 pb-1">
                                         <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-white/5 w-full">
                                            <span className="text-xs font-bold text-gray-500 uppercase flex-1">PIP Recipient</span>
                                            <Switch checked={formData.pipRecipient || false} onChange={(val) => setFormData(prev => ({ ...prev, pipRecipient: val }))} />
                                        </div>
                                    </div>
                                    {formData.pipRecipient && (
                                        <div className="md:col-span-2 space-y-1.5">
                                            <NumberInput label="KIP Number" placeholder="KIP Card Number" value={formData.kipNumber || ""} onChange={(val) => setFormData(prev => ({ ...prev, kipNumber: val }))} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Personal Details */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Personal Details</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <NumberInput label="NIK" placeholder="Family Card ID" value={formData.nik || ""} onChange={(val) => setFormData(prev => ({ ...prev, nik: val }))} />
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

                            {/* Family */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Family Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Father's Name</Label>
                                        <Input placeholder="Father's name" value={formData.fatherName} onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <PhoneNumberInput label="Father's Phone" placeholder="8xx-xxxx-xxxx" value={formData.fatherPhone || ""} onChange={(val) => setFormData(prev => ({ ...prev, fatherPhone: val }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Mother's Name</Label>
                                        <Input placeholder="Mother's name" value={formData.motherName} onChange={(e) => setFormData(prev => ({ ...prev, motherName: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <PhoneNumberInput label="Mother's Phone" placeholder="8xx-xxxx-xxxx" value={formData.motherPhone || ""} onChange={(val) => setFormData(prev => ({ ...prev, motherPhone: val }))} />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </form>
                </div>
            </Modal>
            


            <ConfirmDialog {...confirmState} />
        </>
    );
};



export default StudentManagement;
