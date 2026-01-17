import React, { useState, useMemo } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { useGuestVisits, useUpdateGuestVisit, useDeleteGuestVisit, useRegisterGuestVisit, useUpdateGuest } from "../../api/hooks/useGuests";
import { GuestVisit } from "../../api/types/system";
import { 
    ChevronLeftIcon, AngleRightIcon, UserIcon, 
    PencilIcon, TrashBinIcon, CloseIcon, GridIcon, PlusIcon,
    ChevronUpIcon, ChevronDownIcon, CheckCircleIcon
} from "../../components/atoms/Icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useDebounce } from "../../hooks/useDebounce";
import DatePicker from "../../components/molecules/DatePicker";
import Badge from "../../components/atoms/Badge";
import Modal from "../../components/molecules/Modal";
import Label from "../../components/atoms/Label";
import Input from "../../components/atoms/InputField"; 
import PhoneNumberInput from "../../components/atoms/PhoneNumberInput";
import CustomSelect from "../../components/molecules/CustomSelect";

const GuestVisits: React.FC = () => {
    // State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof GuestVisit | string; direction: "asc" | "desc" } | null>(null);

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<GuestVisit | null>(null);

    const [createForm, setCreateForm] = useState({
        name: "",
        phone: "",
        email: "",
        company: "",
        purpose: "",
        idCardNumber: "",
        photoUrl: null as File | null,
    });

    const [editForm, setEditForm] = useState({
        name: "",
        phone: "",
        email: "",
        company: "",
        purpose: "",
        idCardNumber: "",
        photoUrl: null as File | string | null,
        visitDate: "",
        checkIn: "",
        checkOut: "",
        status: "",
    });

    const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");

    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();

    // Hooks
    const { data: response, isLoading } = useGuestVisits({
        page,
        limit,
        search: debouncedSearch || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
    });

    const registerVisitMutation = useRegisterGuestVisit();
    const updateGuestMutation = useUpdateGuest();
    const updateVisitMutation = useUpdateGuestVisit();
    const deleteVisitMutation = useDeleteGuestVisit();

    const visits = useMemo(() => {
        return Array.isArray(response) ? response : (response?.data || []);
    }, [response]);

    const sortedVisits = useMemo(() => {
        if (!sortConfig) return visits;
        return [...visits].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA: string | number = "";
            let valB: string | number = "";

            if (key === "guest.name") {
                valA = a.guest?.name || "";
                valB = b.guest?.name || "";
            } else {
                valA = (a as unknown as Record<string, string | number>)[key] ?? "";
                valB = (b as unknown as Record<string, string | number>)[key] ?? "";
            }

            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [visits, sortConfig]);

    const total = Number(response?.meta?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

    // Handlers
    const handleSort = (key: keyof GuestVisit | string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: keyof GuestVisit | string }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("en-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateString;
        }
    };

    const getStatusBadge = (status: string | null | undefined) => {
        const s = status?.toLowerCase() || "scheduled";
        switch (s) {
            case "completed":
                return <Badge color="success" size="sm" variant="light">Completed</Badge>;
            case "active":
                return <Badge color="primary" size="sm" variant="light" className="animate-pulse">Active</Badge>;
            case "scheduled":
                return <Badge color="warning" size="sm" variant="light">Scheduled</Badge>;
            default:
                return <Badge color="light" size="sm" variant="light">{status}</Badge>;
        }
    };

    const handleCheckOut = async (visit: GuestVisit) => {
        const confirmed = await confirm({
            variant: "update",
            title: "Guest Check-out",
            message: `Are you sure you want to check out ${visit.guest?.name || "this guest"}?`,
        });

        if (!confirmed) return;

        try {
            await updateVisitMutation.mutateAsync({
                visitId: visit.id,
                data: {
                    clockOut: new Date().toISOString(),
                    statusLabel: "Completed",
                }
            });
            showSuccess(`Checked out ${visit.guest?.name || "Guest"}`);
        } catch (error) {
            showError(error, "Failed to check out");
        }
    };

    const handleDelete = async (visit: GuestVisit) => {
        const confirmed = await confirm({
            variant: "delete",
            title: "Delete Visit Record",
            message: `Are you sure you want to delete this visit record for ${visit.guest?.name}?`,
        });

        if (confirmed) {
            try {
                await deleteVisitMutation.mutateAsync(visit.id);
                showSuccess("Visit record deleted successfully");
            } catch (error) {
                showError(error, "Failed to delete visit record");
            }
        }
    };

    const handleEdit = (visit: GuestVisit) => {
        setSelectedVisit(visit);
        setEditForm({
            name: visit.guest?.name || "",
            phone: visit.guest?.phone || "",
            email: visit.guest?.email || "",
            company: visit.guest?.company || "",
            purpose: visit.purpose || "",
            idCardNumber: visit.guest?.idCardNumber || "",
            photoUrl: visit.guest?.photoUrl || null,
            visitDate: visit.visitDate || "",
            checkIn: visit.checkIn || visit.checkInTime || "",
            checkOut: visit.checkOut || visit.checkOutTime || "",
            status: visit.status || "",
        });
        setEditImagePreview(visit.guest?.photoUrl || null);
        setIsEditModalOpen(true);
    };

    const handleViewDetail = (visit: GuestVisit) => {
        setSelectedVisit(visit);
        setIsDetailModalOpen(true);
    };

    const handleCreateSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await registerVisitMutation.mutateAsync({
                name: createForm.name,
                phone: createForm.phone,
                email: createForm.email,
                company: createForm.company,
                purpose: createForm.purpose,
                idCardNumber: createForm.idCardNumber,
                photoUrl: createForm.photoUrl,
            });
            showSuccess("Guest visit registered successfully");
            setIsCreateModalOpen(false);
            setCreateForm({
                name: "",
                phone: "",
                email: "",
                company: "",
                purpose: "",
                idCardNumber: "",
                photoUrl: null,
            });
            setCreateImagePreview(null);
        } catch (error) {
            showError(error, "Failed to create guest visit");
        }
    };

    const handleEditSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedVisit) return;
        
        try {
            // Update Guest Info if changed
            await updateGuestMutation.mutateAsync({
                id: selectedVisit.guest?.public_id || selectedVisit.guestId,
                data: {
                    name: editForm.name,
                    phone: editForm.phone,
                    email: editForm.email,
                    company: editForm.company,
                    purpose: editForm.purpose,
                    idCardNumber: editForm.idCardNumber,
                    photoUrl: editForm.photoUrl instanceof File ? editForm.photoUrl : undefined
                }
            });

            // Update Visit Info
            await updateVisitMutation.mutateAsync({
                visitId: selectedVisit.id,
                data: {
                    date: editForm.visitDate,
                    clockIn: editForm.checkIn || undefined,
                    clockOut: editForm.checkOut || undefined,
                    statusLabel: editForm.status,
                    notes: editForm.purpose,
                }
            });

            showSuccess("Visit record updated successfully");
            setIsEditModalOpen(false);
        } catch (error) {
            showError(error, "Failed to update visit");
        }
    };

    return (
        <>
            <PageMeta title="Guest Visits | Sistem Absen" description="Monitor and manage guest entrance history." />
            <PageBreadcrumb pageTitle="Guest Visits" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guest Entry Registry</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage monitoring and attendance for school visitors.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="fill-white text-xl text-white" />
                        Register Visit
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Guest</label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <GridIcon className="size-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-48">
                        <DatePicker 
                            label="Start Date" 
                            value={startDate} 
                            onChange={(date) => { setStartDate(date); setPage(1); }}
                            placeholder="All time"
                            className="dark:bg-white/[0.03]"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <DatePicker 
                            label="End Date" 
                            value={endDate} 
                            onChange={(date) => { setEndDate(date); setPage(1); }}
                            placeholder="All time"
                            className="dark:bg-white/[0.03]"
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-4 text-left">
                                    <button onClick={() => handleSort("guest.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Guest <SortIcon column="guest.name" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-left">
                                    <button onClick={() => handleSort("purpose")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Purpose <SortIcon column="purpose" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-theme-xs">Status</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-theme-xs">Time Details</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-right font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-theme-xs">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                                            <span className="text-sm">Retrieving visits...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedVisits.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                                                <UserIcon className="size-5 opacity-20" />
                                            </div>
                                            <p className="text-sm font-medium">No visit records found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedVisits.map((visit) => (
                                    <TableRow key={visit.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => handleViewDetail(visit)}>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 text-xs">
                                                    {visit.guest?.name?.charAt(0) || "G"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 dark:text-white text-theme-sm">{visit.guest?.name || "Unknown"}</span>
                                                    <span className="text-xs text-gray-500">{visit.guest?.company || "Personal Visit"}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 max-w-[200px] truncate">
                                            <span className="text-theme-sm text-gray-600 dark:text-gray-400">{visit.purpose || "Meeting"}</span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            {getStatusBadge(visit.status)}
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                    <div className="size-1 rounded-full bg-brand-500" /> In: 
                                                    <span className="font-mono text-gray-600 dark:text-gray-400 normal-case tracking-normal">{formatDate(visit.checkIn || visit.checkInTime || visit.visitDate)}</span>
                                                </div>
                                                {(visit.checkOut || visit.checkOutTime) && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                        <div className="size-1 rounded-full bg-gray-300" /> Out: 
                                                        <span className="font-mono text-gray-600 dark:text-gray-400 normal-case tracking-normal">{formatDate(visit.checkOut || visit.checkOutTime)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end items-center gap-2">
                                                {visit.status?.toLowerCase() !== "completed" && (
                                                    <button
                                                        onClick={() => handleCheckOut(visit)}
                                                        className="rounded-lg p-2 text-emerald-500 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                                        title="Check Out"
                                                    >
                                                        <CheckCircleIcon className="size-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(visit)}
                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                                                >
                                                    <PencilIcon className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(visit)}
                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
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
                            <span className="font-medium text-gray-700 dark:text-white">{total}</span> records
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

            {/* Create Modal */}
            <Modal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                className="max-w-2xl"
                title="Register New Visit"
                description="Create a new entry for a physical visitor. This will register the guest and their visit simultaneously."
                footer={
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsCreateModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">Cancel</button>
                        <button 
                            form="create-visit-form"
                            type="submit"
                            disabled={registerVisitMutation.isPending}
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                        >
                            {registerVisitMutation.isPending ? "Registering..." : "Register Visit"}
                        </button>
                    </div>
                }
            >
                <form id="create-visit-form" onSubmit={handleCreateSubmit} className="space-y-5 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Guest Name</Label>
                            <Input
                                placeholder="e.g. Robert Smith"
                                value={createForm.name}
                                onChange={(e) => setCreateForm(prev => ({...prev, name: e.target.value}))}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company / Entity</Label>
                            <Input
                                placeholder="e.g. Acme Innovations"
                                value={createForm.company}
                                onChange={(e) => setCreateForm(prev => ({...prev, company: e.target.value}))}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Contact</Label>
                            <PhoneNumberInput
                                value={createForm.phone}
                                onChange={(value) => setCreateForm(prev => ({...prev, phone: value}))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email (Optional)</Label>
                            <Input
                                placeholder="robert@example.com"
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm(prev => ({...prev, email: e.target.value}))}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">National ID / Passport</Label>
                        <Input
                            placeholder="Enter identification number"
                            value={createForm.idCardNumber}
                            onChange={(e) => setCreateForm(prev => ({...prev, idCardNumber: e.target.value}))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose of Visit</Label>
                        <textarea
                            value={createForm.purpose}
                            onChange={(e) => setCreateForm(prev => ({...prev, purpose: e.target.value}))}
                            rows={3}
                            placeholder="Describe the reason for entry..."
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Visual Identification</Label>
                        {!createImagePreview ? (
                            <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 transition-colors hover:bg-gray-100/50 dark:border-white/[0.08] dark:bg-white/[0.02]">
                                <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                    <PlusIcon className="size-6" />
                                </div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Capture / Upload Photo</p>
                                <p className="mt-1 text-xs text-gray-500">Take a selfie or photo of visitor ID</p>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setCreateForm(prev => ({ ...prev, photoUrl: file }));
                                            const reader = new FileReader();
                                            reader.onloadend = () => setCreateImagePreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        ) : (
                            <div className="group relative aspect-video overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.05]">
                                <img 
                                    src={createImagePreview} 
                                    alt="Preview" 
                                    className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                    onClick={() => {
                                        setPreviewImageUrl(createImagePreview);
                                        setIsImagePreviewModalOpen(true);
                                    }}
                                />
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setCreateForm(prev => ({ ...prev, photoUrl: null }));
                                            setCreateImagePreview(null);
                                        }}
                                        className="rounded-full bg-white/90 p-2 text-red-500 shadow-lg backdrop-blur-sm hover:bg-red-50 transition-colors"
                                    >
                                        <TrashBinIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                className="max-w-2xl"
                title="Edit Visit Details"
                description={`Updating metadata for ${selectedVisit?.guest?.name}'s visit record.`}
                footer={
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsEditModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">Cancel</button>
                        <button 
                            form="edit-visit-form"
                            type="submit"
                            disabled={updateVisitMutation.isPending || updateGuestMutation.isPending}
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                        >
                            {updateVisitMutation.isPending || updateGuestMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                }
            >
                <form id="edit-visit-form" onSubmit={handleEditSubmit} className="space-y-5 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</Label>
                            <Input
                                placeholder="e.g. Robert Smith"
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Entity / Company</Label>
                            <Input
                                placeholder="e.g. Acme Innovations"
                                value={editForm.company}
                                onChange={(e) => setEditForm(prev => ({...prev, company: e.target.value}))}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</Label>
                            <PhoneNumberInput
                                value={editForm.phone}
                                onChange={(value) => setEditForm(prev => ({...prev, phone: value}))}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</Label>
                            <Input
                                type="email"
                                placeholder="robert@example.com"
                                value={editForm.email}
                                onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Date</Label>
                            <DatePicker 
                                type="datetime"
                                value={editForm.visitDate} 
                                onChange={(date) => setEditForm(prev => ({...prev, visitDate: date}))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status Record</Label>
                            <CustomSelect
                                options={[
                                    { value: "scheduled", label: "Scheduled" },
                                    { value: "active", label: "Active" },
                                    { value: "completed", label: "Completed" },
                                ]}
                                value={editForm.status}
                                onChange={(value) => setEditForm(prev => ({...prev, status: String(value)}))}
                                placeholder="Select visit status"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Check In Time</Label>
                            <DatePicker 
                                type="datetime"
                                value={editForm.checkIn} 
                                onChange={(date) => setEditForm(prev => ({...prev, checkIn: date}))}
                                placeholder="Auto on arrival"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out Time</Label>
                            <DatePicker 
                                type="datetime"
                                value={editForm.checkOut} 
                                onChange={(date) => setEditForm(prev => ({...prev, checkOut: date}))}
                                placeholder="Not checked out"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose of Visit</Label>
                        <textarea
                            value={editForm.purpose}
                            onChange={(e) => setEditForm(prev => ({...prev, purpose: e.target.value}))}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Photo / Evidence</Label>
                        {!editImagePreview ? (
                            <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 transition-colors hover:bg-gray-100/50 dark:border-white/[0.08] dark:bg-white/[0.02]">
                                <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                    <PlusIcon className="size-6" />
                                </div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Update Photo</p>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setEditForm(prev => ({ ...prev, photoUrl: file }));
                                            const reader = new FileReader();
                                            reader.onloadend = () => setEditImagePreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        ) : (
                            <div className="group relative aspect-video overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.05]">
                                <img 
                                    src={editImagePreview} 
                                    alt="Preview" 
                                    className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                    onClick={() => {
                                        setPreviewImageUrl(editImagePreview);
                                        setIsImagePreviewModalOpen(true);
                                    }}
                                />
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setEditForm(prev => ({ ...prev, photoUrl: null }));
                                            setEditImagePreview(null);
                                        }}
                                        className="rounded-full bg-white/90 p-2 text-red-500 shadow-lg backdrop-blur-sm hover:bg-red-50 transition-colors"
                                    >
                                        <TrashBinIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal 
                isOpen={isDetailModalOpen} 
                onClose={() => setIsDetailModalOpen(false)} 
                className="max-w-md" 
                title="Visit Summary"
                description="Comprehensive overview of guest identification and visitation metrics."
            >
                {selectedVisit && (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 shadow-sm dark:bg-brand-500/10">
                                {selectedVisit.guest?.photoUrl ? (
                                    <img 
                                        src={selectedVisit.guest.photoUrl} 
                                        alt="Guest" 
                                        className="h-full w-full object-cover rounded-2xl"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImageUrl(selectedVisit.guest!.photoUrl!);
                                            setIsImagePreviewModalOpen(true);
                                        }}
                                    />
                                ) : (
                                    <UserIcon className="size-10" />
                                )}
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedVisit.guest?.name}</h4>
                            <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">{selectedVisit.guest?.company || "Personal Guest"}</p>
                        </div>

                        <div className="space-y-5">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Time Tracking</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-1">Check In:</span>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedVisit.checkIn || selectedVisit.visitDate)}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-1">Check Out:</span>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedVisit.checkOut ? formatDate(selectedVisit.checkOut) : "Active Now"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Visit Intent</p>
                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                    {selectedVisit.purpose}
                                </p>
                            </div>

                            <div className="px-1 pt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Identification</p>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Contact:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{selectedVisit.guest?.phone || selectedVisit.guest?.email || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">ID Number:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{selectedVisit.guest?.idCardNumber || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Global ID:</span>
                                        <span className="font-mono text-[10px] text-gray-400">{selectedVisit.guest?.public_id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Image Preview Modal */}
            <Modal isOpen={isImagePreviewModalOpen} onClose={() => setIsImagePreviewModalOpen(false)} className="max-w-5xl overflow-hidden p-0 border-0 bg-transparent">
                <div className="relative group">
                    <button 
                        onClick={() => setIsImagePreviewModalOpen(false)}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <CloseIcon className="size-6" />
                    </button>
                    <img 
                        src={previewImageUrl} 
                        alt="High definition preview" 
                        className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
                    />
                </div>
            </Modal>

            <ConfirmDialog {...confirmState} />
        </>
    );
};

export default GuestVisits;
