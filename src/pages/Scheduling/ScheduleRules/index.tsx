import React, { useState } from "react";
import { useScheduleRules, useRuleContexts } from "../../../api/hooks/useRules";
import { ScheduleRule, CreateScheduleRuleDto, RulePurpose } from "../../../api/types/rules";
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
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import NumberInput from "../../../components/atoms/NumberInput";

const ScheduleRules: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [contextFilter, setContextFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useScheduleRules({
    contextId: contextFilter || undefined,
    dayOfWeek: dayFilter || undefined,
    page,
    limit,
  });

  const rules = response?.data || [];
  const total = Number(response?.meta?.itemCount ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.totalPages ?? Math.ceil(total / limit));

  const { data: contextsResponse } = useRuleContexts({ purpose: RulePurpose.SCHEDULE, limit: 100 });
  const contexts = contextsResponse?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ScheduleRule | null>(null);

  const [formData, setFormData] = useState<CreateScheduleRuleDto>({
    contextId: 0,
    dayOfWeek: "Monday",
    startTime: "07:00",
    endTime: "15:00",
    lateToleranceMinutes: 0,
    earlyLeaveThresholdMinutes: 0,
    breaks: [],
    isActive: true,
  });

  const handleOpenModal = (rule?: ScheduleRule) => {
    if (rule) {
      setSelectedRule(rule);
      setFormData({
        contextId: rule.contextId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime.substring(0, 5),
        endTime: rule.endTime.substring(0, 5),
        lateToleranceMinutes: rule.lateToleranceMinutes,
        earlyLeaveThresholdMinutes: rule.earlyLeaveThresholdMinutes,
        breaks: rule.breaks || [],
        isActive: rule.isActive,
      });
    } else {
      setSelectedRule(null);
      setFormData({
        contextId: contexts[0]?.id ? Number(contexts[0].id) : 0,
        dayOfWeek: "Monday",
        startTime: "07:00",
        endTime: "15:00",
        lateToleranceMinutes: 0,
        earlyLeaveThresholdMinutes: 0,
        breaks: [],
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contextId) {
        showError(null, "Please select a rule context");
        return;
    }

    const confirmed = await confirm({
      variant: selectedRule ? 'update' : 'create',
      title: selectedRule ? 'Update Schedule Rule' : 'Create Schedule Rule',
      message: `Are you sure you want to ${selectedRule ? 'update' : 'create'} this schedule rule?`,
    });

    if (!confirmed) return;

    try {
      if (selectedRule) {
        await updateMutation.mutateAsync({ id: selectedRule.id, data: formData });
        showSuccess("Schedule rule updated successfully!");
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess("Schedule rule created successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save schedule rule");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Schedule Rule',
      message: 'Are you sure you want to delete this schedule rule? This action cannot be undone.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Schedule rule deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete schedule rule");
      }
    }
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <>
      <PageMeta title="Schedule Rules | Scheduling" description="Manage day-to-day schedule rules." />
      <PageBreadcrumb pageTitle="Schedule Rules" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Rules</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure working hours and tolerances for specific contexts.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add New Rule
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CustomSelect
            label="Filter by Context"
            value={contextFilter}
            onChange={(val) => { setContextFilter(String(val)); setPage(1); }}
            options={[
              { label: "All Contexts", value: "" },
              ...contexts.map(c => ({ 
                label: `${c.contextType}: ${c.academicYear?.code} (P:${c.priority})`, 
                value: String(c.id) 
              }))
            ]}
          />
          <CustomSelect
            label="Filter by Day"
            value={dayFilter}
            onChange={(val) => { setDayFilter(String(val)); setPage(1); }}
            options={[
              { label: "All Days", value: "" },
              ...days.map(d => ({ label: d, value: d }))
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Day</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Range</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Breaks</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tolerance</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Context</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-gray-400">Loading schedule rules...</TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-gray-400">No schedule rules found.</TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                        {rule.dayOfWeek}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-1 text-theme-sm text-gray-600 dark:text-gray-300">
                           <span className="font-medium text-brand-500">{rule.startTime.substring(0, 5)}</span>
                           <span className="text-gray-400">-</span>
                           <span className="font-medium text-brand-500">{rule.endTime.substring(0, 5)}</span>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        {rule.breaks && rule.breaks.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {rule.breaks.slice(0, 2).map((brk, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                        <div className="w-1 h-1 rounded-full bg-brand-500/50" />
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{brk.name}</span>
                                        <span className="text-gray-400">({brk.startTime.substring(0, 5)}-{brk.endTime.substring(0, 5)})</span>
                                    </div>
                                ))}
                                {rule.breaks.length > 2 && (
                                    <span className="text-[10px] text-gray-400 pl-2.5">+{rule.breaks.length - 2} more</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-theme-xs text-gray-400 italic">No breaks</span>
                        )}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <div className="flex flex-col gap-0.5 text-xs">
                           <span className="text-gray-500">Late: <span className="font-medium text-brand-500">{rule.lateToleranceMinutes}m</span></span>
                           <span className="text-gray-500">Early: <span className="font-medium text-warning-500">{rule.earlyLeaveThresholdMinutes}m</span></span>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <div className="flex flex-col">
                           <span className="text-theme-xs font-medium text-gray-800 dark:text-white opacity-80">{rule.context?.contextType}</span>
                           <span className="text-[10px] text-gray-500">Priority: {rule.context?.priority}</span>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge color={rule.isActive ? "success" : "light"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(rule)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> items
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-xl disabled:opacity-50"><ChevronLeftIcon className="size-4" /></button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded-xl disabled:opacity-50"><AngleRightIcon className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        className="max-w-md"
        title={selectedRule ? "Update Schedule Rule" : "Add Schedule Rule"}
        description="Set working hours and tolerances for the selected context."
        footer={
           <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">Cancel</button>
              <button type="submit" form="rule-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                {selectedRule ? "Update" : "Create"}
              </button>
           </div>
        }
      >
        <form id="rule-form" onSubmit={handleSubmit} className="space-y-4 p-1">
          <CustomSelect
            label="Rule Context"
            value={formData.contextId}
            onChange={(val) => setFormData({ ...formData, contextId: Number(val) })}
            options={contexts.map(c => ({ 
                label: `${c.contextType}: ${c.academicYear?.code} (P:${c.priority})`, 
                value: Number(c.id) 
            }))}
            placeholder="Select Context"
          />

          <div className="space-y-4">
             <CustomSelect
                label="Day of Week"
                value={formData.dayOfWeek}
                onChange={(val) => setFormData({ ...formData, dayOfWeek: String(val) })}
                options={days.map(d => ({ label: d, value: d }))}
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</label>
               <input
                 type="time"
                 value={formData.startTime}
                 onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                 className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                 required
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</label>
               <input
                 type="time"
                 value={formData.endTime}
                 onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                 className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                 required
               />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 dark:border-white/[0.05]">
             <NumberInput
                label="Late Tolerance (Min)"
                value={formData.lateToleranceMinutes}
                onChange={(val) => setFormData({ ...formData, lateToleranceMinutes: Number(val) })}
                min={0}
             />
             <NumberInput
                label="Early Threshold (Min)"
                value={formData.earlyLeaveThresholdMinutes}
                onChange={(val) => setFormData({ ...formData, earlyLeaveThresholdMinutes: Number(val) })}
                min={0}
             />
          </div>

          {/* Breaks Configuration */}
          <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Breaks & Rest Periods</label>
                <button 
                  type="button"
                  onClick={() => setFormData({
                      ...formData,
                      breaks: [...(formData.breaks || []), { name: "", startTime: "", endTime: "" }]
                  })}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                    <PlusIcon className="size-3" />
                    Add Break
                </button>
            </div>
            
            <div className="space-y-3">
                {formData.breaks && formData.breaks.length > 0 ? (
                    formData.breaks.map((brk, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-gray-50/50 dark:bg-white/[0.02] p-2 rounded-xl border border-gray-100 dark:border-white/[0.05]">
                            <div className="flex-1 grid grid-cols-12 gap-2">
                                <div className="col-span-5">
                                    <input
                                        type="text"
                                        placeholder="Name (e.g. Lunch)"
                                        value={brk.name}
                                        onChange={(e) => {
                                            const newBreaks = [...(formData.breaks || [])];
                                            newBreaks[idx] = { ...newBreaks[idx], name: e.target.value };
                                            setFormData({ ...formData, breaks: newBreaks });
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                        required
                                    />
                                </div>
                                <div className="col-span-7 flex gap-2">
                                    <input
                                        type="time"
                                        value={brk.startTime}
                                        onChange={(e) => {
                                            const newBreaks = [...(formData.breaks || [])];
                                            newBreaks[idx] = { ...newBreaks[idx], startTime: e.target.value };
                                            setFormData({ ...formData, breaks: newBreaks });
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                        required
                                    />
                                    <span className="self-center text-gray-400">-</span>
                                    <input
                                        type="time"
                                        value={brk.endTime}
                                        onChange={(e) => {
                                            const newBreaks = [...(formData.breaks || [])];
                                            newBreaks[idx] = { ...newBreaks[idx], endTime: e.target.value };
                                            setFormData({ ...formData, breaks: newBreaks });
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const newBreaks = [...(formData.breaks || [])];
                                    newBreaks.splice(idx, 1);
                                    setFormData({ ...formData, breaks: newBreaks });
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <TrashBinIcon className="size-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 text-xs text-gray-400 italic border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        No breaks configured.
                    </div>
                )}
            </div>
          </div>

          <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
              formData.isActive 
              ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
              : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
          }`}>
              <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${formData.isActive ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {formData.isActive ? "Active Rule" : "Inactive Rule"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                      {formData.isActive ? "Rule is applied to schedule." : "Rule is currently disabled."}
                  </span>
              </div>
              <Switch checked={formData.isActive} onChange={(checked) => setFormData({ ...formData, isActive: checked })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ScheduleRules;
