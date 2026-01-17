import React, { useState, useMemo, useCallback } from "react";
import { useClassCockpit } from "./ClassCockpitContext";
import { useClassEnrollments } from "../../../api/hooks/useAcademic";
import { ClassEnrollment } from "../../../api/types/academic";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { userService } from "../../../api/services/userService";
import { User } from "../../../api/types";
import { 
    TrashBinIcon, 
    PlusIcon, 
    ChevronUpIcon, 
    ChevronDownIcon, 
    ChevronLeftIcon, 
    AngleRightIcon, 
    UserIcon,
    SearchIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import DatePicker from "../../../components/molecules/DatePicker";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";

const EnrollmentTab = () => {
    const { classId, classDetails } = useClassCockpit();
    const { confirm, confirmState } = useConfirm();

    // Local State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Data Fetching
    const { 
        data: response, 
        isLoading, 
        createMutation, 
        updateMutation, 
        deleteMutation,
        bulkCreateMutation
    } = useClassEnrollments({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        classId: classId ? String(classId) : undefined,
        academicYearId: classDetails?.academicYearId ? String(classDetails.academicYearId) : undefined,
        page,
        limit,
    });

    const enrollments = response?.data || [];
    const total = Number(response?.meta?.total ?? response?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState<ClassEnrollment | null>(null);
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);
    const [studentOptions, setStudentOptions] = useState<{ label: string; value: string; subLabel: string }[]>([]);

    const [formData, setFormData] = useState<Partial<ClassEnrollment>>({
        userId: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
        status: "active",
    });

    const [enrollmentMode, setEnrollmentMode] = useState<"single" | "bulk" | "class">("single");
    const [bulkUserIds, setBulkUserIds] = useState<string[]>([]);
    const [bulkSelectedUsers, setBulkSelectedUsers] = useState<{id: string, name: string}[]>([]);
    const [sourceClassId, setSourceClassId] = useState<string>("");
    const [isSearchingClasses, setIsSearchingClasses] = useState(false);
    const [classOptions, setClassOptions] = useState<{ label: string; value: string; subLabel: string }[]>([]);

    const handleToggleBulkUser = (userId: string, label: string) => {
        if (bulkUserIds.includes(userId)) {
            setBulkUserIds(bulkUserIds.filter(id => id !== userId));
            setBulkSelectedUsers(bulkSelectedUsers.filter(u => u.id !== userId));
        } else {
            setBulkUserIds([...bulkUserIds, userId]);
            setBulkSelectedUsers([...bulkSelectedUsers, { id: userId, name: label }]);
        }
    };

    const handleRemoveBulkUser = (userId: string) => {
        setBulkUserIds(bulkUserIds.filter(id => id !== userId));
        setBulkSelectedUsers(bulkSelectedUsers.filter(u => u.id !== userId));
    };

    // Class Search Handler
    const fetchClasses = useCallback(async (term: string) => {
        setIsSearchingClasses(true);
        try {
             // Avoid circular dependency if possible, or move useClasses hook usage to here if needed.
             // For now assuming we can use academicService directly or reusing a hook if available is better but hooks inside callback is bad.
             // We'll use the service directly.
             const { academicService } = await import("../../../api/services/academicService");
             const response = await academicService.getClasses({
                 search: term,
                 limit: 20
             });
             
             const classes = response.data || [];
             setClassOptions(classes
                .filter(c => String(c.id) !== String(classId)) // Exclude current class
                .map(c => ({
                    label: c.name,
                    value: String(c.id),
                    subLabel: `${c.educationLevel?.name || ''} - ${c.major?.name || ''}`
                }))
             );
        } catch (error) {
            console.error("Failed to fetch classes", error);
            setClassOptions([]);
        } finally {
            setIsSearchingClasses(false);
        }
    }, [classId]);

    // Student Search Handler - Memoized to prevent infinite loop
    const fetchStudents = useCallback(async (term: string) => {
        setIsSearchingStudents(true);
        try {
            const response = await userService.getUsers({
                search: term,
                typeCode: "student",
                limit: 20
            });
            
            const users = response.data || [];
            setStudentOptions(users
                .filter((u: User) => (u.id || u.public_id) && String(u.id || u.public_id) !== "undefined")
                .map((u: User) => ({
                    label: u.name,
                    value: String(u.public_id || u.id),
                    subLabel: u.email || ""
                }))
            );
        } catch (error) {
            console.error("Failed to fetch students:", error);
            setStudentOptions([]);
        } finally {
            setIsSearchingStudents(false);
        }
    }, []);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof ClassEnrollment; direction: "asc" | "desc" } | null>(null);

    const handleSort = (key: keyof ClassEnrollment) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedEnrollments = useMemo(() => {
        const sorted = [...enrollments];
        if (!sortConfig) return sorted;
        
        return sorted.sort((a, b) => {
             const valA = String(a[sortConfig.key] || "");
             const valB = String(b[sortConfig.key] || "");
             
             if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
             if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
             return 0;
        });
    }, [enrollments, sortConfig]);

    const SortIcon = ({ column }: { column: keyof ClassEnrollment }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    // Actions
    const handleOpenModal = (enrollment?: ClassEnrollment) => {
        if (enrollment) {
            setSelectedEnrollment(enrollment);
            setFormData({
                userId: enrollment.userId && String(enrollment.userId) !== "undefined" ? String(enrollment.userId) : "",
                enrollmentDate: enrollment.enrollmentDate?.split("T")[0] || "",
                status: enrollment.status,
            });
            if (enrollment.user) {
                setStudentOptions([{
                    label: enrollment.user.name,
                    value: String(enrollment.userId),
                    subLabel: enrollment.user.email || ""
                }]);
            }
        } else {
            setSelectedEnrollment(null);
            setFormData({
                userId: "",
                enrollmentDate: new Date().toISOString().split("T")[0],
                status: "active",
            });
            setStudentOptions([]);
            setBulkUserIds([]);
            setBulkSelectedUsers([]);
            setSourceClassId("");
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!classId || !classDetails?.academicYearId) {
            showError(null, "Missing Class Context info");
            return;
        }

        if (enrollmentMode === "single" && !formData.userId && !selectedEnrollment) {
            showError(null, "Please select a student.");
            return;
        }

        if (enrollmentMode === "bulk" && bulkUserIds.length === 0) {
            showError(null, "Please select at least one student.");
            return;
        }

        if (enrollmentMode === "class" && !sourceClassId) {
            showError(null, "Please select a source class.");
            return;
        }

        const payload = {
            ...formData,
            userId: formData.userId && String(formData.userId) !== "undefined" ? String(formData.userId) : "",
            classId: String(classId),
            academicYearId: String(classDetails.academicYearId),
        };

        const confirmed = await confirm({
            variant: selectedEnrollment ? 'update' : 'create',
            title: selectedEnrollment ? 'Update Enrollment' : 'New Enrollment',
            message: `Are you sure you want to ${selectedEnrollment ? 'update' : (enrollmentMode === "bulk" ? `enroll ${bulkUserIds.length} students` : (enrollmentMode === "class" ? "enroll students from selected class" : "enroll this student"))}?`,
        });

        if (!confirmed) return;

        try {
            if (selectedEnrollment) {
                await updateMutation.mutateAsync({ id: selectedEnrollment.id, data: payload });
                showSuccess("Enrollment updated successfully!");
            } else {
                if (enrollmentMode === "class") {
                    // Fetch students from source class
                    const { academicService } = await import("../../../api/services/academicService");
                    const sourceEnrollments = await academicService.getClassEnrollments({
                        classId: sourceClassId,
                        limit: 1000 // Ensure we get all students
                    });
                    
                    const studentsToEnroll = sourceEnrollments.data.map(en => String(en.userId));
                    
                    if (studentsToEnroll.length === 0) {
                        showError(null, "Selected class has no active students.");
                        return;
                    }

                    await bulkCreateMutation.mutateAsync({
                        classId: String(classId),
                        academicYearId: String(classDetails.academicYearId),
                        userIds: studentsToEnroll,
                        enrollmentDate: formData.enrollmentDate || new Date().toISOString().split("T")[0],
                        status: (formData.status as any) || "active"
                    });
                    showSuccess(`Successfully enrolled ${studentsToEnroll.length} students from class!`);
                } else if (enrollmentMode === "bulk") {
                    await bulkCreateMutation.mutateAsync({
                        classId: String(classId),
                        academicYearId: String(classDetails.academicYearId),
                        userIds: bulkUserIds,
                        enrollmentDate: formData.enrollmentDate || new Date().toISOString().split("T")[0],
                        status: (formData.status as any) || "active"
                    });
                     showSuccess("Students enrolled successfully!");
                } else {
                     await createMutation.mutateAsync(payload);
                     showSuccess("Student enrolled successfully!");
                }
            }
            setIsModalOpen(false);
            // Reset bulk state
            setBulkUserIds([]);
            setBulkSelectedUsers([]);
            setSourceClassId("");
        } catch (error) {
            showError(error, "Failed to save enrollment");
        }
    };

    const handleDelete = async (id: number | string) => {
        const confirmed = await confirm({
            variant: 'delete',
            title: 'Delete Enrollment',
            message: 'Are you sure you want to remove this student from the class?',
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(id);
                showSuccess("Student removed successfully!");
            } catch (error) {
                showError(error, "Failed to remove student");
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "success";
            case "withdrawn": return "error";
            case "graduated": return "info";
            default: return "light";
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Class Enrollments</h2>
                    <p className="text-sm text-gray-500">Manage student access and enrollment status for this class.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    disabled={total >= (classDetails?.maxCapacity || 0)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    title={total >= (classDetails?.maxCapacity || 0) ? "Class is full" : "Enroll Student"}
                >
                    <PlusIcon className="fill-white text-xl text-white" />
                    Enroll Student
                </button>
            </div>

             {/* Filters */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5 lg:col-span-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Student</label>
                    <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                            <SearchIcon className="size-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search student by name or email..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                </div>

                 <div className="lg:col-span-1">
                    <CustomSelect
                        label="Status"
                        value={statusFilter}
                        onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                        options={[
                            { label: "All Status", value: "" },
                            { label: "Active", value: "active" },
                            { label: "Withdrawn", value: "withdrawn" },
                            { label: "Graduated", value: "graduated" },
                        ]}
                    />
                </div>
            </div>

             <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                             <TableCell isHeader className="px-6 py-4">
                                <button onClick={() => handleSort("userId")} className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600">
                                    Student Name <SortIcon column="userId" />
                                </button>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    ID / NISN
                                </span>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-center">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </span>
                            </TableCell>
                            <TableCell isHeader className="px-6 py-4 text-right">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                        <span className="text-xs">Loading enrollments...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : sortedEnrollments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                                            <UserIcon className="size-5 opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium">No students enrolled.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedEnrollments.map((en) => (
                                <TableRow key={en.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-full bg-brand-50 dark:bg-white/10 flex items-center justify-center text-brand-600 font-bold text-xs">
                                                {en.user?.name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                    {en.user?.name || "Unknown"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {en.user?.email || "No email"}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-sm">
                                        {en.user?.profile?.studentIdentificationNumber || "-"} 
                                        {en.user?.profile?.nisn ? ` / ${en.user.profile.nisn}` : ""}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-center">
                                        <Badge color={getStatusColor(en.status)}>
                                            {en.status.charAt(0).toUpperCase() + en.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                              onClick={() => handleDelete(en.id)}
                                              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                                              title="Remove Student"
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
             {total > 0 && (
                <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                        <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                        <span className="font-medium text-gray-700 dark:text-white">{total}</span>
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

            {/* Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                className="max-w-xl"
                title={selectedEnrollment ? "Update Enrollment" : (enrollmentMode === "bulk" ? "Bulk Enroll Students" : (enrollmentMode === "class" ? "Enroll from Class" : "Enroll New Student"))}
                description={enrollmentMode === "bulk" ? "Enroll multiple students at once." : (enrollmentMode === "class" ? "Enroll all students from another class." : "Manage student enrollment details.")}
                subHeader={!selectedEnrollment ? (
                    <div className="relative flex border-b border-gray-100 dark:border-white/[0.05]">
                        <button
                            type="button"
                            onClick={() => setEnrollmentMode("single")}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                                enrollmentMode === "single" 
                                ? "text-brand-600 dark:text-brand-400" 
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                        >
                            <UserIcon className="size-4" />
                            Individual
                        </button>
                        <button
                            type="button"
                            onClick={() => setEnrollmentMode("bulk")}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                                enrollmentMode === "bulk" 
                                ? "text-brand-600 dark:text-brand-400" 
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                        >
                            <div className="flex -space-x-1.5 overflow-hidden">
                                <div className="inline-block size-3.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-200"></div>
                                <div className="inline-block size-3.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-300"></div>
                                <div className="inline-block size-3.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-400"></div>
                            </div>
                            Bulk Enroll
                        </button>
                        <button
                            type="button"
                            onClick={() => setEnrollmentMode("class")}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                                enrollmentMode === "class" 
                                ? "text-brand-600 dark:text-brand-400" 
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                        >
                             <div className="flex items-center justify-center size-4 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-300">
                                C
                             </div>
                            By Class
                        </button>
                        
                        <div 
                            className="absolute -bottom-px h-0.5 bg-brand-500 transition-all duration-300 ease-in-out"
                            style={{
                                width: '33.33%',
                                left: enrollmentMode === "single" ? '0%' : (enrollmentMode === "bulk" ? '33.33%' : '66.66%')
                            }}
                        />
                    </div>
                ) : undefined}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="enrollment-form"
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            {selectedEnrollment ? "Update" : (enrollmentMode === "bulk" ? `Enroll ${bulkUserIds.length} Students` : (enrollmentMode === "class" ? "Enroll Class Students" : "Enroll"))}
                        </button>
                    </div>
                }
            >
                <form id="enrollment-form" onSubmit={handleSubmit} className="space-y-4">
                    {enrollmentMode === "single" && (
                        <SearchableAsyncSelect
                            label="Student"
                            value={formData.userId as string}
                            onChange={(val) => setFormData({ ...formData, userId: val && String(val) !== "undefined" ? String(val) : "" })}
                            onSearch={fetchStudents}
                            options={studentOptions}
                            isLoading={isSearchingStudents}
                            placeholder="Type to search student..."
                            disabled={!!selectedEnrollment}
                        />
                    )}

                    {enrollmentMode === "bulk" && (
                         <div className="space-y-2">
                            <SearchableAsyncSelect
                                label="Add Students to List"
                                value={""}
                                onChange={(val, label) => handleToggleBulkUser(String(val), label)}
                                onSearch={fetchStudents}
                                options={studentOptions}
                                isLoading={isSearchingStudents}
                                placeholder="Search and add students..."
                                closeOnSelect={false}
                                selectedValues={bulkUserIds}
                            />
                            
                            <div className="min-h-[100px] max-h-[200px] overflow-y-auto p-3 rounded-xl border border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                {bulkSelectedUsers.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <p className="text-xs">No students selected yet.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {bulkSelectedUsers.map(user => (
                                            <div key={user.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 dark:bg-white/10 dark:border-transparent dark:text-white shadow-sm group">
                                                <span>{user.name}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveBulkUser(user.id)}
                                                    className="text-gray-400 hover:text-error-500 transition-colors"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>{bulkSelectedUsers.length} students selected</span>
                                {bulkSelectedUsers.length > 0 && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setBulkUserIds([]); setBulkSelectedUsers([]); }}
                                        className="text-error-500 hover:text-error-600 hover:underline"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                         </div>
                    )}

                    {enrollmentMode === "class" && (
                        <div className="space-y-4">
                            <SearchableAsyncSelect
                                label="Select Source Class"
                                value={sourceClassId}
                                onChange={(val) => setSourceClassId(String(val))}
                                onSearch={fetchClasses}
                                options={classOptions}
                                isLoading={isSearchingClasses}
                                placeholder="Type to search class (e.g. 10 IPA 1)..."
                            />
                            <div className="rounded-xl bg-blue-50 p-4 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                                <p className="text-sm">
                                    <span className="font-bold">Note:</span> This will enroll ALL active students from the selected class into this class.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                            <DatePicker
                            label="Enrollment Date"
                            value={formData.enrollmentDate ?? null}
                            onChange={(date) => setFormData({ ...formData, enrollmentDate: date })}
                            required
                        />
                        
                        {/* Status Toggle based on channels design */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Enrollment Status</label>
                            <div 
                                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                                    formData.status === "active"
                                    ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                                    : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${
                                        formData.status === "active" ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                                    }`}>
                                        {formData.status === "active" ? "Active" : "Withdrawn"}
                                    </span>
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-tight">
                                        {formData.status === "active" ? "Student is currently enrolled" : "Student has withdrawn from class"}
                                    </span>
                                </div>
                                <Switch 
                                    checked={formData.status === "active"}
                                    onChange={(val) => setFormData({ ...formData, status: val ? "active" : "withdrawn" })}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog {...confirmState} />
        </div>
    );
};

export default EnrollmentTab;
