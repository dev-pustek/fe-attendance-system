import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStudents, useDeleteStudent, useUpdateStudent, useCreateStudent, useStudentsInfinite, useImportStudents } from "../../../api/hooks/useProfiles";
import { useClasses, useAcademicYears, useMajors } from "../../../api/hooks/useAcademic";
import { StudentProfile, CreateStudentDto, UpdateStudentDto } from "../../../api/types/profiles";
import { Class, AcademicYear } from "../../../api/types/academic";
import { profilesService } from "../../../api/services/profilesService";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import ImportModal from "../../../components/molecules/ImportModal";
import Checkbox from "../../../components/atoms/Checkbox";
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
    MoreDotIcon,
    FilterIcon,
    SearchIcon,
    ChevronDownIcon
} from "../../../components/atoms/Icons";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";

import { useConfirm } from "../../../hooks/useConfirm";
import Modal from "../../../components/molecules/Modal";
import DatePicker from "../../../components/molecules/DatePicker";
import NumberInput from "../../../components/atoms/NumberInput";
import PhoneNumberInput from "../../../components/atoms/PhoneNumberInput";
import StudentCard from "./StudentCard";
import { useInView } from "react-intersection-observer";

const studentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    phone: z.string().optional(),
    studentId: z.string().min(1, "Student ID is required"),
    nisn: z.string().optional(),
    nis: z.string().optional(),
    nik: z.string().optional(),
    placeOfBirth: z.string().optional(),
    gender: z.string().optional(),
    religion: z.string().optional(),
    classId: z.coerce.number().optional(),
    address: z.string().optional(),
    rt: z.string().optional(),
    rw: z.string().optional(),
    kelurahan: z.string().optional(),
    kecamatan: z.string().optional(),
    province: z.string().optional(),
    fatherName: z.string().optional(),
    fatherPhone: z.string().optional(),
    motherName: z.string().optional(),
    motherPhone: z.string().optional(),
    entryYear: z.coerce.number().optional(),
    enrollmentDate: z.any().optional(),
    studentStatus: z.string().optional(),
    pipRecipient: z.boolean().default(false),
    kipNumber: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
    photo: z.any().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return isMobile;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function StudentManagement() {
    const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const { confirm, confirmState } = useConfirm();
    
    const [isExporting, setIsExporting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    const { ref: sentinelRef, inView } = useInView();

    // Filters derived from URL
    const majorFilter = searchParams.get("majorId") || "all";
    const gradeFilter = searchParams.get("grade") || "all";
    const classFilter = searchParams.get("classId") || "all";
    const yearFilter = searchParams.get("academicYearId") || "all";
    const statusFilter = searchParams.get("status") || "all";

    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value === "all" || value === "") {
            newParams.delete(key);
        } else {
            newParams.set(key, value);
        }
        
        // Cascading clears
        if (key === "majorId") {
            newParams.delete("grade");
            newParams.delete("classId");
        } else if (key === "grade") {
            newParams.delete("classId");
        }
        
        setSearchParams(newParams);
        setPage(1);
    };

    // Modal State

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    
    const queryParams: Record<string, string | undefined> = useMemo(() => ({
        search: searchTerm || undefined,
        majorId: majorFilter === "all" ? undefined : majorFilter,
        grade: gradeFilter === "all" ? undefined : gradeFilter,
        classId: classFilter === "all" ? undefined : classFilter,
        academicYearId: yearFilter === "all" ? undefined : yearFilter,
        studentStatus: statusFilter === "all" ? undefined : statusFilter,
    }), [searchTerm, majorFilter, gradeFilter, classFilter, yearFilter, statusFilter]);

    // Data Fetching
    const { data: studentsResponse, isLoading: isStudentsLoading } = useStudents({ ...queryParams, page, limit });
    
    const { 
        data: infiniteResponse, 
        fetchNextPage, 
        hasNextPage, 
        isFetchingNextPage 
    } = useStudentsInfinite(queryParams);

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    const { data: classesResponse } = useClasses({ limit: 200 });
    const { data: yearsResponse } = useAcademicYears();
    const { data: majorsResponse } = useMajors({ limit: 100 });
    
    const createMutation = useCreateStudent();
    const deleteMutation = useDeleteStudent();
    const updateMutation = useUpdateStudent();
    const importMutation = useImportStudents();

    const desktopStudents = useMemo(() => studentsResponse?.data || [], [studentsResponse]);
    const infiniteStudents = useMemo(() => infiniteResponse?.pages.flatMap(p => p.data) || [], [infiniteResponse]);
    
    const students = isMobile ? infiniteStudents : desktopStudents;
    const meta = studentsResponse?.meta;
    const total = Number(meta?.total || 0);
    const totalPages = Number(meta?.totalPages || 1);

    const classes = useMemo(() => Array.isArray(classesResponse) ? classesResponse : (classesResponse?.data || []), [classesResponse]);
    const academicYears = useMemo(() => Array.isArray(yearsResponse) ? yearsResponse : (yearsResponse?.data || []), [yearsResponse]);
    const majors = useMemo(() => Array.isArray(majorsResponse) ? majorsResponse : (majorsResponse?.data || []), [majorsResponse]);

    // Classes filtered by selected major
    const filteredClasses = useMemo(() => {
        if (!majorFilter || majorFilter === "all") return classes;
        return classes.filter((c) => String(c.majorId) === majorFilter);
    }, [classes, majorFilter]);

    // Grades derived from the (possibly major-filtered) classes
    const availableGrades = useMemo(() => {
        const source = majorFilter && majorFilter !== "all" ? filteredClasses : classes;
        const gradeSet = new Map<string, string>();
        source.forEach((c) => {
            const gCode = (c as any).grade?.code ?? (c as any).gradeId;
            const gName = (c as any).grade?.name ?? `Grade ${gCode}`;
            if (gCode) gradeSet.set(String(gCode), String(gName));
        });
        return Array.from(gradeSet.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [classes, filteredClasses, majorFilter]);

    useEffect(() => { setSelectedIds(new Set()); }, [page, searchTerm, statusFilter, classFilter, yearFilter, majorFilter, gradeFilter, isMobile]);

    // Form State
    const {
        register,
        handleSubmit: hookFormSubmit,
        control,
        reset,
        setValue,
        watch,
        formState: { errors }
    } = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            name: "", email: "", phone: "", isActive: true,
            studentId: "", nisn: "", nis: "", entryYear: new Date().getFullYear(),
            studentStatus: "ACTIVE", pipRecipient: false,
            gender: "M", photo: undefined
        }
    });

    const watchIsActive = watch("isActive");
    const watchPipRecipient = watch("pipRecipient");

    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handlers


    const handleEdit = (student: StudentProfile) => {
        setSelectedStudent(student);
        reset({
            name: student.user?.name || "",
            email: student.user?.email || "",
            phone: student.user?.phone || "",
            isActive: student.user?.isActive ?? true,
            studentId: student.studentId,
            nisn: student.nisn || "",
            nis: student.nis || "",
            nik: student.nik || "",
            placeOfBirth: student.placeOfBirth || "",
            dateOfBirth: student.dateOfBirth?.split('T')[0] ? new Date(student.dateOfBirth) : undefined,
            gender: student.gender || "Male",
            religion: student.religion || "",
            classId: student.user?.activeClass?.id ? Number(student.user.activeClass.id) : undefined,
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
            enrollmentDate: student.enrollmentDate?.split('T')[0] ? new Date(student.enrollmentDate) : undefined,
            studentStatus: student.studentStatus || "Active",
            pipRecipient: student.pipRecipient || false,
            kipNumber: student.kipNumber || "",
            notes: student.notes || "",
            photo: undefined
        });
        setPreviewPhoto(student.user?.photo || null);
        setIsFormModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedStudent(null);
        reset({
            name: "", email: "", phone: "", isActive: true,
            studentId: "", nisn: "", nis: "", 
            entryYear: new Date().getFullYear(),
            studentStatus: "Active", pipRecipient: false,
            gender: "Male", photo: undefined, classId: undefined
        });
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
                showSuccess("Student profile deleted successfully.");
            } catch (e) {
                showError(e);
            }
        }
    };

    const allSelected = students.length > 0 && students.every(s => selectedIds.has(s.userId));

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(students.map(s => s.userId)));
        }
    };

    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmed = await confirm({
            variant: "delete",
            title: "Bulk Delete Students",
            message: `Are you sure you want to permanently delete ${selectedIds.size} selected student profiles? This action cannot be undone.`,
            confirmText: `Delete ${selectedIds.size} Students`
        });

        if (confirmed) {
            try {
                const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
                await Promise.all(promises);
                showSuccess(`Successfully removed ${selectedIds.size} student profiles.`);
                setSelectedIds(new Set());
            } catch (e) {
                showError(e, "Failed to remove some students");
            }
        }
    };

    const handleExportExcel = useCallback(async (ids?: string[]) => {
        setIsExporting(true);
        try {
            const params = ids && ids.length > 0 ? { ids: ids.join(',') } : queryParams;
            const blob = await profilesService.exportStudentsExcel(params);
            downloadBlob(blob, "students_export.xlsx");
            showSuccess("Excel exported successfully!");
        } catch (err) {
            showError(err, "Export failed");
        } finally {
            setIsExporting(false);
        }
    }, [queryParams]);

    const handleExportPdf = useCallback(async () => {
        setIsExporting(true);
        try {
            const params = selectedIds.size > 0 ? { ids: Array.from(selectedIds).join(',') } : queryParams;
            const blob = await profilesService.exportStudentsPdf(params);
            downloadBlob(blob, "students_export.pdf");
            showSuccess("PDF exported successfully!");
        } catch (err) {
            showError(err, "Export failed");
        } finally {
            setIsExporting(false);
        }
    }, [selectedIds, queryParams]);

    const handleDownloadTemplate = async (withData: boolean) => {
        if (yearFilter === "all") {
            showError("Please select an Academic Year first to download the correct class list template.");
            return;
        }
        setIsDownloadingTemplate(true);
        try {
            const blob = await profilesService.downloadStudentsTemplate(withData, yearFilter);
            downloadBlob(blob, "students_template.xlsx");
            showSuccess("Template downloaded successfully!");
        } catch (err) {
            showError(err, "Failed to download template");
        } finally {
            setIsDownloadingTemplate(false);
        }
    };

    const handleImportSubmit = async (file: File) => {
        try {
            const result = await importMutation.mutateAsync(file);
            showSuccess(`Successfully imported ${result.created} new students, updated ${result.updated}.`);
            setIsImportModalOpen(false);
        } catch (err) {
            showError(err, "Failed to import students");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setValue("photo", file);
            setPreviewPhoto(URL.createObjectURL(file));
        }
    };

    const onSubmitForm = async (data: StudentFormValues) => {
        try {
            // Format dates
            const formattedData: Record<string, unknown> = { ...data };
            if (formattedData.dateOfBirth instanceof Date) {
                formattedData.dateOfBirth = formattedData.dateOfBirth.toISOString().split('T')[0];
            }
            if (formattedData.enrollmentDate instanceof Date) {
                formattedData.enrollmentDate = formattedData.enrollmentDate.toISOString().split('T')[0];
            }
            
            if (selectedStudent) {
                await updateMutation.mutateAsync({
                    userId: selectedStudent.userId,
                    data: formattedData as UpdateStudentDto
                });
                showSuccess("Student updated successfully");
            } else {
                await createMutation.mutateAsync(formattedData as CreateStudentDto);
                showSuccess("Student created successfully");
            }
            setIsFormModalOpen(false);
        } catch {
            // Error handled by hook
        }
    };

    return (
        <>
            <PageMeta title="Student Management | SIAPUS" description="Manage system students." />
            <PageBreadcrumb pageTitle="Student Management" />

            <div className="space-y-6">
                {/* Header Section */}
                <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                            <UserCircleIcon className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Management</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">View and manage student profiles and academic records.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataActionsMenu
                            isExporting={isExporting || isDownloadingTemplate}
                            isImporting={importMutation.isPending}
                            onExportExcel={() => handleExportExcel()}
                            onExportPdf={handleExportPdf}
                            onExportExcelSelected={selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined}
                            selectedCount={selectedIds.size}
                            onImportClick={() => setIsImportModalOpen(true)}
                            onDownloadTemplate={() => handleDownloadTemplate(false)}
                        />
                        <button
                            onClick={handleAdd}
                            className="hidden sm:flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            <PlusIcon className="size-5" />
                            Add New Student
                        </button>
                    </div>
                </div>

                {/* Mobile FABs */}
                {/* Mobile FABs */}
                {isMobile && (
                    <MobileFloatingActions
                        onAdd={handleAdd}
                        addAriaLabel="Add New Student"
                        dataActionsProps={{
                            isExporting: isExporting || isDownloadingTemplate,
                            isImporting: importMutation.isPending,
                            onExportExcel: () => handleExportExcel(),
                            onExportPdf: handleExportPdf,
                            onExportExcelSelected: selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined,
                            selectedCount: selectedIds.size,
                            onImportClick: () => setIsImportModalOpen(true),
                            onDownloadTemplate: () => handleDownloadTemplate(false)
                        }}
                    />
                )}

                {/* ── Advanced Filter Card ── */}
                <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)} 
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <FilterIcon className="size-5 text-brand-500" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                    Search & Filter Students
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Use the criteria below to filter student data based on class, academic year, and status.
                            </p>
                        </div>
                        <div className="shrink-0 ml-4">
                            <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                        </div>
                    </button>
                    
                    <div 
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                            isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                    >
                        <div className="overflow-hidden min-h-0">
                            <div className="px-5 pb-5">
                                <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                                
                                <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-3 lg:grid-cols-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Academic Year</Label>
                                        <CustomSelect
                                            value={yearFilter === "all" ? "" : Number(yearFilter)}
                                            onChange={(val) => updateFilter("academicYearId", val ? String(val) : "all")}
                                            onClear={() => updateFilter("academicYearId", "all")}
                                            placeholder="All Years"
                                            options={academicYears.map((ay: AcademicYear) => ({ label: ay.name, value: Number(ay.id) }))}
                                            className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Major</Label>
                                        <CustomSelect
                                            value={majorFilter === "all" ? "" : Number(majorFilter)}
                                            onChange={(val) => updateFilter("majorId", val ? String(val) : "all")}
                                            onClear={() => updateFilter("majorId", "all")}
                                            placeholder="All Majors"
                                            options={majors.map((m: any) => ({ label: m.name, value: Number(m.id) }))}
                                            className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Grade</Label>
                                        <CustomSelect
                                            value={gradeFilter === "all" ? "" : gradeFilter}
                                            onChange={(val) => updateFilter("grade", val ? String(val) : "all")}
                                            onClear={() => updateFilter("grade", "all")}
                                            placeholder="All Grades"
                                            options={availableGrades.map(([code, name]) => ({ label: name, value: code }))}
                                            className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Class</Label>
                                        <CustomSelect
                                            value={classFilter === "all" ? "" : Number(classFilter)}
                                            onChange={(val) => updateFilter("classId", val ? String(val) : "all")}
                                            onClear={() => updateFilter("classId", "all")}
                                            placeholder="All Classes"
                                            options={filteredClasses
                                                .filter((c: any) => !gradeFilter || gradeFilter === "all" || String(c.grade?.code ?? c.gradeId) === gradeFilter)
                                                .map((cls: Class) => ({ label: cls.name, value: Number(cls.id) }))}
                                            className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                        <CustomSelect
                                            value={statusFilter === "all" ? "" : statusFilter}
                                            onChange={(val) => updateFilter("status", val ? String(val) : "all")}
                                            onClear={() => updateFilter("status", "all")}
                                            placeholder="All Status"
                                            options={[
                                                { label: "Active", value: "ACTIVE" },
                                                { label: "Graduated", value: "GRADUATED" },
                                                { label: "Withdrawn", value: "WITHDRAWN" },
                                            ]}
                                            className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Name / Email / NISN</Label>
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setSearchTerm(searchQuery);
                                                        setPage(1);
                                                    }
                                                }}
                                                placeholder="Search by Name, Email, or NISN..."
                                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:col-span-1">
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSearchTerm("");
                                                setSearchParams((prev) => {
                                                    const newParams = new URLSearchParams(prev);
                                                    newParams.delete("majorId");
                                                    newParams.delete("grade");
                                                    newParams.delete("classId");
                                                    newParams.delete("academicYearId");
                                                    newParams.delete("status");
                                                    return newParams;
                                                });
                                                setPage(1);
                                            }}
                                            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSearchTerm(searchQuery);
                                                setPage(1);
                                            }}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600"
                                        >
                                            <SearchIcon className="size-4" />
                                            Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar (Only for Bulk Actions and Export/Import) */}
                <TableToolbar
                    selectedCount={selectedIds.size}
                    onClearSelection={() => setSelectedIds(new Set())}
                    bulkActions={[
                        {
                            label: "Delete Selected",
                            icon: <TrashBinIcon className="size-3.5" />,
                            onClick: handleBulkDelete,
                            variant: "danger"
                        }
                    ]}
                />

                {/* Content Section */}
                {isMobile ? (
                    <div className="space-y-3">
                        {students.length > 0 && (
                            <div className="flex items-center gap-3 px-1">
                                <Checkbox checked={allSelected} onChange={toggleAll} />
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                                </span>
                            </div>
                        )}

                        {isStudentsLoading && students.length === 0 ? (
                            <div className="py-20 flex justify-center">
                                <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="py-20 text-center text-gray-400 border rounded-2xl bg-white dark:bg-white/[0.02] dark:border-white/[0.05]">
                                <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                    <UserCircleIcon className="size-5 opacity-20" />
                                </div>
                                <p className="text-sm font-medium">No students found matching your search.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {students.map((student: StudentProfile) => (
                                    <StudentCard
                                        key={student.userId}
                                        student={student}
                                        isSelected={selectedIds.has(student.userId)}
                                        onSelect={toggleOne}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}

                        <div ref={sentinelRef} className="py-4 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                            )}
                            {!hasNextPage && students.length > 0 && (
                                <p className="text-xs text-gray-400 font-medium">All students loaded</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                        <Table>
                            <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                                <TableRow>
                                    <TableCell isHeader className="w-10 px-5 py-4">
                                        <Checkbox checked={allSelected} onChange={toggleAll} />
                                    </TableCell>
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
                                        <TableCell colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                                                <span className="text-sm font-medium text-gray-400">Loading student directory...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : students.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-20 text-center text-gray-400">
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
                                        <TableRow key={student.userId} className={`group transition-colors ${selectedIds.has(student.userId) ? 'bg-brand-50/60 dark:bg-brand-500/5' : 'hover:bg-gray-50/60 dark:hover:bg-white/[0.015]'}`}>
                                            <TableCell className="px-5 py-4">
                                                <Checkbox checked={selectedIds.has(student.userId)} onChange={() => toggleOne(student.userId)} />
                                            </TableCell>
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
                                                        <span className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">{student.nisn || "-"}</span>
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
                                            <TableCell className="px-4 py-4 text-center">
                                                <RowActionMenu 
                                                    onView={() => navigate(`/students/${student.userId}`)}
                                                    onEdit={() => handleEdit(student)}
                                                    onDelete={() => handleDelete(student)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        
                        {!isStudentsLoading && total > 0 && (
                            <div className="border-t border-gray-100 dark:border-white/[0.05] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                    <form id="student-form" onSubmit={hookFormSubmit(onSubmitForm)} className="flex flex-col lg:flex-row gap-8">
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
                                             setValue("photo", undefined);
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
                                    <span className={`text-xs font-bold ${watchIsActive ? 'text-success-600' : 'text-gray-400'}`}>
                                        {watchIsActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                    <Controller
                                        name="isActive"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch checked={field.value} onChange={field.onChange} />
                                        )}
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
                                        <Input placeholder="Full student name" {...register("name")} error={errors.name?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Email Address <span className="text-error-500">*</span></Label>
                                        <Input type="email" placeholder="student@school.com" {...register("email")} error={errors.email?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="phone"
                                            control={control}
                                            render={({ field }) => (
                                                <PhoneNumberInput label="Phone Number" placeholder="8xx-xxxx-xxxx" value={field.value || ""} onChange={field.onChange} error={errors.phone?.message} />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Info */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Academic Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Student ID <span className="text-error-500">*</span></Label>
                                        <Input placeholder="STU-XXXX" {...register("studentId")} error={errors.studentId?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>NISN <span className="text-error-500">*</span></Label>
                                        <Input placeholder="National Student ID" {...register("nisn")} error={errors.nisn?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>NIS <span className="text-error-500">*</span></Label>
                                        <Input placeholder="School ID" {...register("nis")} error={errors.nis?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="entryYear"
                                            control={control}
                                            render={({ field }) => (
                                                <NumberInput 
                                                    label="Entry Year" 
                                                    placeholder="YYYY" 
                                                    value={field.value?.toString() || ""} 
                                                    onChange={field.onChange} 
                                                    maxLength={4}
                                                    error={errors.entryYear?.message}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="studentStatus"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomSelect 
                                                    label="Student Status" 
                                                    value={field.value || ""} 
                                                    options={[
                                                        {label:"Active",value:"Active"},
                                                        {label:"Inactive",value:"Inactive"},
                                                        {label:"Graduated",value:"Graduated"},
                                                        {label:"Transferred",value:"Transferred"},
                                                        {label:"Dropped Out",value:"Dropped Out"},
                                                        {label:"Suspended",value:"Suspended"}
                                                    ]} 
                                                    onChange={field.onChange} 
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="classId"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomSelect 
                                                    label="Class Assignment" 
                                                    value={field.value?.toString() || ""} 
                                                    options={filteredClasses.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id.toString() }))} 
                                                    onChange={(val) => field.onChange(val ? Number(val) : undefined)} 
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="enrollmentDate"
                                            control={control}
                                            render={({ field }) => (
                                                <DatePicker label="Enrollment Date" value={field.value || null} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2 flex items-end gap-4 pb-1">
                                         <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-white/5 w-full">
                                            <span className="text-xs font-bold text-gray-500 uppercase flex-1">PIP Recipient</span>
                                            <Controller
                                                name="pipRecipient"
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch checked={field.value} onChange={field.onChange} />
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {watchPipRecipient && (
                                        <div className="md:col-span-2 space-y-1.5">
                                            <Controller
                                                name="kipNumber"
                                                control={control}
                                                render={({ field }) => (
                                                    <NumberInput label="KIP Number" placeholder="KIP Card Number" value={field.value || ""} onChange={field.onChange} error={errors.kipNumber?.message} />
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Personal Details */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Personal Details</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="nik"
                                            control={control}
                                            render={({ field }) => (
                                                <NumberInput label="NIK" placeholder="Family Card ID" value={field.value || ""} onChange={field.onChange} error={errors.nik?.message} />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="gender"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomSelect label="Gender" value={field.value || ""} options={[{label:"Male",value:"Male"},{label:"Female",value:"Female"}]} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Place of Birth</Label>
                                        <Input placeholder="City" {...register("placeOfBirth")} error={errors.placeOfBirth?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="dateOfBirth"
                                            control={control}
                                            render={({ field }) => (
                                                <DatePicker label="Date of Birth" value={field.value || null} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="religion"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomSelect 
                                                    label="Religion" 
                                                    value={field.value || ""} 
                                                    options={[
                                                        {label:"Islam",value:"Islam"},
                                                        {label:"Christianity",value:"Christianity"},
                                                        {label:"Catholicism",value:"Catholicism"},
                                                        {label:"Hinduism",value:"Hinduism"},
                                                        {label:"Buddhism",value:"Buddhism"},
                                                        {label:"Confucianism",value:"Confucianism"}
                                                    ]} 
                                                    onChange={field.onChange} 
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Address Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Street Address</Label>
                                        <textarea rows={2} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-theme-xs outline-none" placeholder="Full street address..." {...register("address")} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Controller
                                                name="rt"
                                                control={control}
                                                render={({ field }) => (
                                                    <NumberInput label="RT" placeholder="001" value={field.value || ""} onChange={field.onChange} error={errors.rt?.message} />
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Controller
                                                name="rw"
                                                control={control}
                                                render={({ field }) => (
                                                    <NumberInput label="RW" placeholder="002" value={field.value || ""} onChange={field.onChange} error={errors.rw?.message} />
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Kelurahan/Village</Label>
                                        <Input placeholder="Village" {...register("kelurahan")} error={errors.kelurahan?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Kecamatan/District</Label>
                                        <Input placeholder="District" {...register("kecamatan")} error={errors.kecamatan?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Province</Label>
                                        <Input placeholder="Province" {...register("province")} error={errors.province?.message} />
                                    </div>
                                </div>
                            </div>

                            {/* Family */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Family Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Father's Name</Label>
                                        <Input placeholder="Father's name" {...register("fatherName")} error={errors.fatherName?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="fatherPhone"
                                            control={control}
                                            render={({ field }) => (
                                                <PhoneNumberInput label="Father's Phone" placeholder="8xx-xxxx-xxxx" value={field.value || ""} onChange={field.onChange} error={errors.fatherPhone?.message} />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Mother's Name</Label>
                                        <Input placeholder="Mother's name" {...register("motherName")} error={errors.motherName?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Controller
                                            name="motherPhone"
                                            control={control}
                                            render={({ field }) => (
                                                <PhoneNumberInput label="Mother's Phone" placeholder="8xx-xxxx-xxxx" value={field.value || ""} onChange={field.onChange} error={errors.motherPhone?.message} />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </form>
                </div>
            </Modal>
            
            <ConfirmDialog {...confirmState} />
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Import Students"
                description="Upload an Excel file to bulk import student profiles."
                onDownloadTemplate={handleDownloadTemplate}
                onImport={handleImportSubmit}
                isImporting={importMutation.isPending}
            />
        </>
    );
};

const RowActionMenu = ({ onEdit, onDelete, onView }: { onEdit: () => void; onDelete: () => void; onView: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative flex justify-center">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
            >
                <MoreDotIcon className="size-5" />
            </button>
            <Dropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
            >
                <DropdownItem
                    onClick={() => {
                        setIsOpen(false);
                        onView();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <EyeIcon className="size-3.5" /> View
                </DropdownItem>
                <DropdownItem
                    onClick={() => {
                        setIsOpen(false);
                        onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <EditIcon className="size-3.5" /> Edit
                </DropdownItem>
                <DropdownItem
                    onClick={() => {
                        setIsOpen(false);
                        onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                    <TrashBinIcon className="size-3.5" /> Delete
                </DropdownItem>
            </Dropdown>
        </div>
    );
};

