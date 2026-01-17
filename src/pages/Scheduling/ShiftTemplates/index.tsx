import React, { useState } from "react";
import { useShiftTemplates } from "../../../api/hooks/useScheduling";
import { ShiftTemplate } from "../../../api/types/scheduling";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import Checkbox from "../../../components/atoms/Checkbox";
import { 
  PencilIcon, 
  TrashBinIcon, 
  GridIcon, 
  ChevronLeftIcon, 
  AngleRightIcon, 
  TimeIcon,
  CalenderIcon,
  ChevronUpIcon,
  ChevronDownIcon, 
  PlusIcon
} from "../../../components/atoms/Icons";
import DatePicker from "../../../components/molecules/DatePicker";
import NumberInput from "../../../components/molecules/NumberInput";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import CustomSelect from "../../../components/molecules/CustomSelect";

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const DAY_MAP: Record<string, number> = {
  "Monday": 1,
  "Tuesday": 2,
  "Wednesday": 3,
  "Thursday": 4,
  "Friday": 5,
  "Saturday": 6,
  "Sunday": 7
};

const INV_DAY_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(DAY_MAP).map(([name, num]) => [num, name])
);

const ShiftTemplates: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState<number | "">("");
  const [filterPeriod, setFilterPeriod] = useState<"morning" | "afternoon" | "evening" | "">("");
  const [filterType, setFilterType] = useState<"permanent" | "scheduled" | "">("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useShiftTemplates({
    search: debouncedSearch || undefined,
    day: filterDay ? Number(filterDay) : undefined,
    shiftPeriod: filterPeriod || undefined,
    type: filterType || undefined,
    page,
    limit,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ShiftTemplate; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<Partial<ShiftTemplate>>({
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    lateToleranceMinutes: 0,
    earlyDepartureToleranceMinutes: 0,
    workDays: [],
    effectiveDate: null,
  });

  const handleSort = (key: keyof ShiftTemplate) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const templates = React.useMemo(() => Array.isArray(response) ? response : (response?.data || []), [response]);
  
  const sortedTemplates = React.useMemo(() => {
    if (!sortConfig) return templates;
    return [...templates].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = a[key] ?? "";
      const valB = b[key] ?? "";
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [templates, sortConfig]);

  const SortIcon = ({ column }: { column: keyof ShiftTemplate }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const handleOpenModal = (template?: ShiftTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        name: template.name,
        startTime: template.startTime.substring(0, 5), // Handle HH:mm:ss -> HH:mm
        endTime: template.endTime.substring(0, 5),
        lateToleranceMinutes: template.lateToleranceMinutes,
        earlyDepartureToleranceMinutes: template.earlyDepartureToleranceMinutes,
        workDays: template.workDays || [],
        effectiveDate: template.effectiveDate?.split('T')[0] || null,
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        name: "",
        startTime: "08:00",
        endTime: "17:00",
        lateToleranceMinutes: 0,
        earlyDepartureToleranceMinutes: 0,
        workDays: [1, 2, 3, 4, 5],
        effectiveDate: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleDayToggle = (dayName: string) => {
    const dayNum = DAY_MAP[dayName];
    const currentDays = (formData.workDays || []) as number[];
    if (currentDays.includes(dayNum)) {
      setFormData({ ...formData, workDays: currentDays.filter(d => d !== dayNum) });
    } else {
      setFormData({ ...formData, workDays: [...currentDays, dayNum] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedTemplate ? 'update' : 'create',
      title: selectedTemplate ? 'Update Shift Template' : 'Create Shift Template',
      message: `Are you sure you want to ${selectedTemplate ? 'update' : 'create'} the shift template "${formData.name}"?`,
    });

    if (!confirmed) return;

    try {
      const payload = {
        ...formData,
        // startTime and endTime are already in HH:mm from DatePicker
      };

      if (selectedTemplate) {
        await updateMutation.mutateAsync({ id: selectedTemplate.public_id, data: payload as ShiftTemplate });
        showSuccess(`Shift template "${formData.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(payload as ShiftTemplate);
        showSuccess(`Shift template "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save shift template");
    }
  };

  const handleDelete = async (id: string) => {
    const template = templates.find((t: ShiftTemplate) => t.public_id === id);
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Shift Template',
      message: `Are you sure you want to delete the shift template "${template?.name || id}"? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Shift template deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete shift template");
      }
    }
  };

  return (
    <>
      <PageMeta title="Shift Templates | Sistem Absen" description="Manage working hour templates and shift schedules." />
      <PageBreadcrumb pageTitle="Shift Templates" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift Templates</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Define working hours, lunch breaks, and late tolerances.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />

            Add Template
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Templates</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Template name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                label="Filter Day"
                value={filterDay}
                onChange={(val) => { setFilterDay(val ? Number(val) : ""); setPage(1); }}
                placeholder="All Days"
                options={[
                  { label: "All Days", value: "" },
                  ...DAYS_OF_WEEK.map(day => ({ label: day, value: DAY_MAP[day] }))
                ]}
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                label="Shift Period"
                value={filterPeriod}
                onChange={(val) => { setFilterPeriod(val as "morning" | "afternoon" | "evening" | ""); setPage(1); }}
                placeholder="All Periods"
                options={[
                  { label: "All Periods", value: "" },
                  { label: "Morning (< 12:00)", value: "morning" },
                  { label: "Afternoon (12:00-18:00)", value: "afternoon" },
                  { label: "Evening (> 18:00)", value: "evening" },
                ]}
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                label="Template Type"
                value={filterType}
                onChange={(val) => { setFilterType(val as "permanent" | "scheduled" | ""); setPage(1); }}
                placeholder="All Types"
                options={[
                  { label: "All Types", value: "" },
                  { label: "Permanent", value: "permanent" },
                  { label: "Scheduled", value: "scheduled" },
                ]}
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Template Name <SortIcon column="name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("lateToleranceMinutes")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Tolerances <SortIcon column="lateToleranceMinutes" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("effectiveDate")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Effective Date <SortIcon column="effectiveDate" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading templates...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <TimeIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No shift templates found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Add your first template
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTemplates.map((template: ShiftTemplate) => (
                  <TableRow key={template.public_id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10">
                          <TimeIcon className="size-4 text-indigo-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-theme-sm">{template.name}</p>
                          <p className="text-[11px] text-gray-500 uppercase tracking-tighter">
                            {template.workDays.map(d => INV_DAY_MAP[d]).slice(0, 3).join(", ")}{template.workDays.length > 3 ? "..." : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-white/[0.05]">
                          {template.startTime.substring(0, 5)} - {template.endTime.substring(0, 5)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Late: <span className="font-medium text-brand-500">{template.lateToleranceMinutes}m</span></p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Early: <span className="font-medium text-warning-500">{template.earlyDepartureToleranceMinutes}m</span></p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <CalenderIcon className="size-3.5" />
                        <span className="text-theme-sm">{template.effectiveDate ? new Date(template.effectiveDate).toLocaleDateString() : "Permanent"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(template)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.public_id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> templates
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        className="max-w-2xl"
        title={selectedTemplate ? "Update Shift Template" : "Create New Shift Template"}
        description="Define working hours, lunch breaks, and tolerances."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="shift-template-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedTemplate ? "Update Template" : "Save Template"}
            </button>
          </div>
        }
      >
        <form id="shift-template-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Regular Morning Shift"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>

            <DatePicker
              label="Effective Date"
              value={formData.effectiveDate || ""}
              onChange={(date) => setFormData({ ...formData, effectiveDate: date })}
              type="date"
              labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Start Time"
                value={formData.startTime || "08:00"}
                onChange={(time) => setFormData({ ...formData, startTime: time })}
                type="time"
                required
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
              <DatePicker
                label="End Time"
                value={formData.endTime || "17:00"}
                onChange={(time) => setFormData({ ...formData, endTime: time })}
                type="time"
                required
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="Late Tol. (min)"
                value={formData.lateToleranceMinutes}
                onChange={(val) => setFormData({ ...formData, lateToleranceMinutes: val })}
                placeholder="0"
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
              <NumberInput
                label="Early Dep. Tol. (min)"
                value={formData.earlyDepartureToleranceMinutes}
                onChange={(val) => setFormData({ ...formData, earlyDepartureToleranceMinutes: val })}
                placeholder="0"
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Work Days</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/[0.05] dark:bg-white/[0.02]">
              {DAYS_OF_WEEK.map((day) => (
                <Checkbox
                  key={day}
                  label={day}
                  checked={formData.workDays?.includes(DAY_MAP[day])}
                  onChange={() => handleDayToggle(day)}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ShiftTemplates;
