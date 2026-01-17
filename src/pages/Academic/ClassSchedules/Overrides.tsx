import React, { useState } from "react";
import { useClassScheduleOverrides, useClasses } from "../../../api/hooks/useAcademic";
import { ClassScheduleOverride, CreateClassScheduleOverrideDto } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  AngleRightIcon,
  ChevronLeftIcon,
  CalenderIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import DatePicker from "../../../components/molecules/DatePicker";

const ClassOverrides: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [classFilter, setClassFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useClassScheduleOverrides({
    classId: classFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit,
  });

  const overrides = response?.data || [];
  const total = Number(response?.meta?.itemCount ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.totalPages ?? Math.ceil(total / limit));

  const { data: classesResponse } = useClasses({ limit: 100 });
  const classes = classesResponse?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<ClassScheduleOverride | null>(null);

  const [formData, setFormData] = useState<CreateClassScheduleOverrideDto>({
    classId: 0,
    overrideDate: new Date().toISOString().split('T')[0],
    startTime: "07:00",
    endTime: "15:00",
    isHoliday: false,
    reason: "",
  });

  const handleOpenModal = (override?: ClassScheduleOverride) => {
    if (override) {
      setSelectedOverride(override);
      setFormData({
        classId: Number(override.classId),
        overrideDate: override.overrideDate,
        startTime: override.startTime ? override.startTime.substring(0, 5) : null,
        endTime: override.endTime ? override.endTime.substring(0, 5) : null,
        isHoliday: override.isHoliday,
        reason: override.reason,
      });
    } else {
      setSelectedOverride(null);
      setFormData({
        classId: classes[0]?.id ? Number(classes[0].id) : 0,
        overrideDate: new Date().toISOString().split('T')[0],
        startTime: "07:00",
        endTime: "15:00",
        isHoliday: false,
        reason: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classId) {
        showError(null, "Please select a class");
        return;
    }

    const confirmed = await confirm({
      variant: selectedOverride ? 'update' : 'create',
      title: selectedOverride ? 'Update Override' : 'Create Override',
      message: `Are you sure you want to ${selectedOverride ? 'update' : 'create'} this class schedule override?`,
    });

    if (!confirmed) return;

    try {
      const payload = {
        ...formData,
        startTime: formData.isHoliday ? null : formData.startTime,
        endTime: formData.isHoliday ? null : formData.endTime,
      };

      if (selectedOverride) {
        await updateMutation.mutateAsync({ id: selectedOverride.id, data: payload });
        showSuccess("Override updated successfully!");
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess("Override created successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save override");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Override',
      message: 'Are you sure you want to delete this override? Regular schedule will apply for this date.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Override deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete override");
      }
    }
  };

  return (
    <>
      <PageMeta title="Schedule Overrides | Academic" description="Manage special class schedule exceptions." />
      <PageBreadcrumb pageTitle="Schedule Overrides" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Overrides</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Handle holidays, special class hours, or one-off events.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add Override
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CustomSelect
            label="Filter by Class"
            value={classFilter}
            onChange={(val) => { setClassFilter(String(val)); setPage(1); }}
            options={[
              { label: "All Classes", value: "" },
              ...classes.map(c => ({ label: c.name, value: String(c.id) }))
            ]}
          />
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(date) => { setStartDate(date); setPage(1); }}
            placeholder="Select start date"
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(date) => { setEndDate(date); setPage(1); }}
            placeholder="Select end date"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">Loading overrides...</TableCell>
                </TableRow>
              ) : overrides.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400 text-sm">No schedule overrides found.</TableCell>
                </TableRow>
              ) : (
                overrides.map((ovr) => (
                  <TableRow key={ovr.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors text-theme-sm">
                    <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                       <CalenderIcon className="size-4 text-gray-400" />
                       {new Date(ovr.overrideDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {ovr.class?.name || ovr.classId}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge color={ovr.isHoliday ? "error" : "primary"}>
                        {ovr.isHoliday ? "Holiday" : "Special Schedule"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        {!ovr.isHoliday ? (
                           <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-brand-500">{ovr.startTime?.substring(0, 5)}</span>
                              <span className="text-gray-400 text-xs">-</span>
                              <span className="font-semibold text-brand-500">{ovr.endTime?.substring(0, 5)}</span>
                           </div>
                        ) : (
                           <span className="text-gray-400 italic text-xs">Closed</span>
                        )}
                    </TableCell>
                    <TableCell className="px-5 py-4 max-w-xs truncate text-gray-500">
                        {ovr.reason}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(ovr)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ovr.id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> overrides
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-xl disabled:opacity-50 transition-colors hover:bg-gray-50"><ChevronLeftIcon className="size-4" /></button>
              <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded-xl disabled:opacity-50 transition-colors hover:bg-gray-50"><AngleRightIcon className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        className="max-w-md"
        title={selectedOverride ? "Update Schedule Override" : "Add Schedule Override"}
        description="Configure exceptions for a specific date and class."
        footer={
           <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">Cancel</button>
              <button type="submit" form="override-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                {selectedOverride ? "Update" : "Create"}
              </button>
           </div>
        }
      >
        <form id="override-form" onSubmit={handleSubmit} className="space-y-4 p-1">
          <CustomSelect
            label="Class"
            value={formData.classId}
            onChange={(val) => setFormData({ ...formData, classId: Number(val) })}
            options={classes.map(c => ({ label: c.name, value: Number(c.id) }))}
            placeholder="Select Class"
          />

          <DatePicker
            label="Override Date"
            value={formData.overrideDate}
            onChange={(date) => setFormData({ ...formData, overrideDate: date })}
            placeholder="Select date"
          />

          {!formData.isHoliday && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</label>
                    <input
                        type="time"
                        value={formData.startTime || ""}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        required={!formData.isHoliday}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</label>
                    <input
                        type="time"
                        value={formData.endTime || ""}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        required={!formData.isHoliday}
                    />
                </div>
            </div>
          )}

          <div className="space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reason / Description</label>
               <textarea
                 value={formData.reason}
                 onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                 placeholder="e.g. School Anniversary, Midterm Exam, Public Holiday..."
                 className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white min-h-[80px] resize-none"
                 required
               />
          </div>

          <div 
             className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-all cursor-pointer hover:border-brand-200 dark:hover:border-brand-500/30 ${
                 formData.isHoliday 
                     ? 'border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5' 
                     : 'border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]'
             }`}
             onClick={() => setFormData(prev => ({ ...prev, isHoliday: !prev.isHoliday }))}
          >
             <div>
                 <p className="text-sm font-medium text-gray-900 dark:text-white">Holiday / No Class</p>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                     {formData.isHoliday 
                         ? "Classes are cancelled. Attendance will not be tracked for this day." 
                         : "Classes will proceed according to the custom schedule set above."}
                 </p>
             </div>
             <div className="mt-0.5 pointer-events-none">
                 <Switch 
                     checked={formData.isHoliday} 
                     onChange={() => {}} // Controlled by parent div
                 />
             </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ClassOverrides;
