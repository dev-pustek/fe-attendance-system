import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useShiftAssignments, useShiftTemplates } from "../../../api/hooks/useScheduling";
import { ShiftAssignment } from "../../../api/types/scheduling";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import { 
  PencilIcon, 
  TrashBinIcon, 
  PlusIcon, 
  ChevronLeftIcon, 
  AngleRightIcon, 
  CalenderIcon,
  UserIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  GridIcon
} from "../../../components/atoms/Icons";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { useDebounce } from "../../../hooks/useDebounce";
import CustomSelect from "../../../components/molecules/CustomSelect";
import ShiftAssignmentModal from "../../../components/organisms/Scheduling/ShiftAssignmentModal";
import DatePicker from "../../../components/molecules/DatePicker";

const ShiftAssignments: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // Filters
  const [filterTemplateId, setFilterTemplateId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");

  // Parse date range
  const { startDate, endDate } = React.useMemo(() => {
    if (!dateRange) return { startDate: undefined, endDate: undefined };
    const [start, end] = dateRange.split(" to ");
    return { startDate: start, endDate: end || start };
  }, [dateRange]);

  const { confirm, confirmState } = useConfirm();

  const { 
    data: response, 
    isLoading, 
    deleteMutation,
    refetch
  } = useShiftAssignments({
    page,
    limit,
    shiftTemplateId: filterTemplateId || undefined,
    search: debouncedSearch || undefined,
    startDate,
    endDate,
  });

  // Fetch templates for filter
  const { data: templatesResponse } = useShiftTemplates({ limit: 100 });
  const templates = Array.isArray(templatesResponse) ? templatesResponse : (templatesResponse?.data || []);
  const templateOptions = templates.map(t => ({ label: t.name, value: t.public_id }));

  const assignments = React.useMemo(() => {
    return Array.isArray(response) ? response : (response?.data || []);
  }, [response]);
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ShiftAssignment | "userName" | "templateName"; direction: "asc" | "desc" } | null>(null);

  const handleSort = (key: keyof ShiftAssignment | "userName" | "templateName") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedAssignments = React.useMemo(() => {
    if (!sortConfig) return assignments;
    return [...assignments].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string = "";
      let valB: string = "";

      if (key === "userName") {
        valA = String(a.user?.name ?? "");
        valB = String(b.user?.name ?? "");
      } else if (key === "templateName") {
        valA = String(a.shiftTemplate?.name ?? "");
        valB = String(b.shiftTemplate?.name ?? "");
      } else {
        valA = String(a[key as keyof ShiftAssignment] ?? "");
        valB = String(b[key as keyof ShiftAssignment] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [assignments, sortConfig]);

  const SortIcon = ({ column }: { column: keyof ShiftAssignment | "userName" | "templateName" }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleOpenModal = (assignment?: ShiftAssignment) => {
    setSelectedAssignment(assignment || null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    refetch();
    // Redirect to calendar view after successful creation (not update)
    if (!selectedAssignment) {
      navigate("/schedules");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Assignment',
      message: `Are you sure you want to delete this shift assignment? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Assignment deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete assignment");
      }
    }
  };



  return (
    <>
      <PageMeta title="Shift Assignments | Sistem Absen" description="Assign shift templates to users." />
      <PageBreadcrumb pageTitle="Shift Assignments" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift Assignments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage work schedules for employees and students.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />

            Assign Shift
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search user or template..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>
            
             {/* Template Filter */}
            <div className="md:col-span-1">
                <CustomSelect
                    label="Filter by Template"
                    value={filterTemplateId}
                    onChange={(val) => { setFilterTemplateId(String(val || "")); setPage(1); }}
                    options={[{ label: "All Templates", value: "" }, ...templateOptions]}
                    placeholder="All Templates"
                />
            </div>

            {/* Date Range Filter */}
            <div className="md:col-span-1">
              <DatePicker
                label="Date Range"
                mode="range"
                value={dateRange}
                onChange={(val) => { setDateRange(val); setPage(1); }}
                placeholder="Select date range..."
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("userName")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    User <SortIcon column="userName" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                   <button onClick={() => handleSort("templateName")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Shift Template <SortIcon column="templateName" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                   <button onClick={() => handleSort("effectiveFrom")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Effective Date <SortIcon column="effectiveFrom" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading assignments...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <UserIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No assignments found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Create assignment
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment: ShiftAssignment) => (
                  <TableRow key={assignment.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
                          <UserIcon className="size-4 text-brand-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-theme-sm">{assignment.user?.name || "Unknown User"}</p>
                          <p className="text-[11px] text-gray-500">{assignment.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                       <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-indigo-500"></div>
                        <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                            {assignment.shiftTemplate?.name || "Unknown Template"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-0.5 text-theme-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <CalenderIcon className="size-3.5 text-success-500" />
                            <span>From: {new Date(assignment.effectiveFrom).toLocaleDateString()}</span>
                        </div>
                        {assignment.effectiveTo && (
                            <div className="flex items-center gap-1.5">
                                <CalenderIcon className="size-3.5 text-gray-400" />
                                <span>To: {new Date(assignment.effectiveTo).toLocaleDateString()}</span>
                            </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(assignment)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> assignments
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
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

      <ShiftAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedAssignment={selectedAssignment}
        onSuccess={handleModalSuccess}
      />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ShiftAssignments;
