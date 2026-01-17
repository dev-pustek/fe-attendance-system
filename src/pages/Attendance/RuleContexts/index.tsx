import React, { useState } from "react";
import { useRuleContexts } from "../../../api/hooks/useRules";
import { useAcademicYears, useEducationLevels, useMajors, useClasses } from "../../../api/hooks/useAcademic";
import { RuleContext, RuleContextType, RulePurpose, CreateRuleContextDto } from "../../../api/types/rules";
import { StudentProfile } from "../../../api/types";
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
  GridIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import SearchableAsyncSelect, { SelectOption } from "../../../components/molecules/SearchableAsyncSelect";
import NumberInput from "../../../components/atoms/NumberInput";
import { profilesService } from "../../../api/services/profilesService";

const RuleContexts: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [contextTypeFilter, setContextTypeFilter] = useState("");
  const [fetchedUsers, setFetchedUsers] = useState<SelectOption[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useRuleContexts({
    search: debouncedSearch || undefined,
    purpose: purposeFilter || undefined,
    contextType: contextTypeFilter || undefined,
    page,
    limit,
  });

  const contexts = response?.data || [];
  const total = Number(response?.meta?.itemCount ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.totalPages ?? Math.ceil(total / limit));

  const { data: academicYearsResponse } = useAcademicYears({ limit: 100 });
  const { data: eduLevelsResponse } = useEducationLevels({ limit: 100 });
  const { data: majorsResponse } = useMajors({ limit: 100 });
  const { data: classesResponse } = useClasses({ limit: 100 });

  const academicYears = academicYearsResponse?.data || [];
  const eduLevels = eduLevelsResponse?.data || [];
  const majors = majorsResponse?.data || [];
  const classes = classesResponse?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<RuleContext | null>(null);

  const [formData, setFormData] = useState<CreateRuleContextDto>({
    contextType: RuleContextType.GLOBAL,
    educationLevelId: null,
    gradeId: null,
    majorId: null,
    classId: null,
    userId: null,
    academicYearId: academicYears[0]?.id ? Number(academicYears[0].id) : 0,
    priority: 0,
    purpose: RulePurpose.SCHEDULE,
  });

  const handleOpenModal = (context?: RuleContext) => {
    if (context) {
      setSelectedContext(context);
      setFormData({
        contextType: context.contextType,
        educationLevelId: context.educationLevelId,
        gradeId: context.gradeId,
        majorId: context.majorId,
        classId: context.classId,
        userId: context.userId,
        academicYearId: Number(context.academicYearId),
        priority: context.priority,
        purpose: context.purpose,
      });
    } else {
      setSelectedContext(null);
      setFormData({
        contextType: RuleContextType.GLOBAL,
        educationLevelId: null,
        gradeId: null,
        majorId: null,
        classId: null,
        userId: null,
        academicYearId: academicYears[0]?.id ? Number(academicYears[0].id) : 0,
        priority: 0,
        purpose: RulePurpose.SCHEDULE,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedContext ? 'update' : 'create',
      title: selectedContext ? 'Update Context' : 'Create Context',
      message: `Are you sure you want to ${selectedContext ? 'update' : 'create'} this rule context?`,
    });

    if (!confirmed) return;

    try {
      if (selectedContext) {
        await updateMutation.mutateAsync({ id: selectedContext.id, data: formData });
        showSuccess("Rule context updated successfully!");
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess("Rule context created successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save rule context");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Rule Context',
      message: 'Are you sure you want to delete this rule context? This action cannot be undone.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Rule context deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete rule context");
      }
    }
  };

  const getTargetLabel = (context: RuleContext) => {
    switch (context.contextType) {
      case RuleContextType.GLOBAL: return "Global (All Users)";
      case RuleContextType.EDUCATION_LEVEL: return `Level: ${context.educationLevel?.name || context.educationLevelId}`;
      case RuleContextType.MAJOR: return `Major: ${context.major?.name || context.majorId}`;
      case RuleContextType.CLASS: return `Class: ${context.class?.name || context.classId}`;
      case RuleContextType.USER: return `User: ${context.user?.name || context.userId}`;
      default: return context.contextType;
    }
  };

  return (
    <>
      <PageMeta title="Rule Contexts | Attendance" description="Manage rule application targets." />
      <PageBreadcrumb pageTitle="Rule Contexts" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rule Contexts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Define where rules (Schedules, Attendance) should be applied.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add New Context
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5 pt-px">
             <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search</label>
             <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="By user name or target..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
          </div>
          <CustomSelect
            label="Purpose"
            value={purposeFilter}
            onChange={(val) => { setPurposeFilter(String(val)); setPage(1); }}
            options={[
              { label: "All Purposes", value: "" },
              { label: "Schedule", value: RulePurpose.SCHEDULE },
              { label: "Attendance Rule", value: RulePurpose.ATTENDANCE_RULE },
            ]}
          />
          <CustomSelect
            label="Context Type"
            value={contextTypeFilter}
            onChange={(val) => { setContextTypeFilter(String(val)); setPage(1); }}
            options={[
              { label: "All Types", value: "" },
              { label: "Global", value: RuleContextType.GLOBAL },
              { label: "Education Level", value: RuleContextType.EDUCATION_LEVEL },
              { label: "Major", value: RuleContextType.MAJOR },
              { label: "Class", value: RuleContextType.CLASS },
              { label: "User", value: RuleContextType.USER },
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purpose</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target / Application</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Priority</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">Loading rule contexts...</TableCell>
                </TableRow>
              ) : contexts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">No rule contexts found.</TableCell>
                </TableRow>
              ) : (
                contexts.map((context) => (
                  <TableRow key={context.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                       <Badge color={context.purpose === RulePurpose.SCHEDULE ? "primary" : "info"}>
                         {context.purpose.replace("_", " ")}
                       </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                       <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{getTargetLabel(context)}</span>
                          <span className="text-xs text-gray-500 uppercase tracking-tight">{context.contextType.replace("_", " ")}</span>
                       </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {context.academicYear?.name || context.academicYearId}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                        <span className="font-semibold text-brand-500">{context.priority}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(context)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(context.id)}
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

        {/* Pagination Logic */}
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
        title={selectedContext ? "Update Rule Context" : "Add Rule Context"}
        description="Target specific entities for rule enforcement."
        footer={
           <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">Cancel</button>
              <button type="submit" form="context-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                {selectedContext ? "Update" : "Create"}
              </button>
           </div>
        }
      >
        <form id="context-form" onSubmit={handleSubmit} className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-4">
             <CustomSelect
               label="Purpose"
               value={formData.purpose}
               onChange={(val) => setFormData({ ...formData, purpose: String(val) })}
               options={[
                 { label: "Schedule", value: RulePurpose.SCHEDULE },
                 { label: "Attendance Rule", value: RulePurpose.ATTENDANCE_RULE },
               ]}
             />
             <NumberInput 
                label="Priority"
                value={formData.priority}
                onChange={(val) => setFormData({ ...formData, priority: Number(val) })}
                required
             />
          </div>

          <CustomSelect
            label="Academic Year"
            value={formData.academicYearId}
            onChange={(val) => setFormData({ ...formData, academicYearId: Number(val) })}
            options={academicYears.map(y => ({ label: y.name, value: Number(y.id) }))}
          />

          <CustomSelect
            label="Context Type"
            value={formData.contextType}
            onChange={(val) => setFormData({ ...formData, contextType: String(val), educationLevelId: null, majorId: null, classId: null, userId: null })}
            options={[
              { label: "Global (All Users)", value: RuleContextType.GLOBAL },
              { label: "Education Level", value: RuleContextType.EDUCATION_LEVEL },
              { label: "Major", value: RuleContextType.MAJOR },
              { label: "Class", value: RuleContextType.CLASS },
              { label: "User", value: RuleContextType.USER },
            ]}
          />

          {formData.contextType === RuleContextType.EDUCATION_LEVEL && (
            <CustomSelect
              label="Education Level"
              value={formData.educationLevelId || ""}
              onChange={(val) => setFormData({ ...formData, educationLevelId: Number(val) })}
              options={eduLevels.map(e => ({ label: e.name, value: Number(e.id) }))}
              placeholder="Select Level"
            />
          )}

          {formData.contextType === RuleContextType.MAJOR && (
            <CustomSelect
              label="Major"
              value={formData.majorId || ""}
              onChange={(val) => setFormData({ ...formData, majorId: Number(val) })}
              options={majors.map(m => ({ label: `${m.name} (${m.educationLevel?.code})`, value: Number(m.id) }))}
              placeholder="Select Major"
            />
          )}

          {formData.contextType === RuleContextType.CLASS && (
            <CustomSelect
              label="Class"
              value={formData.classId || ""}
              onChange={(val) => setFormData({ ...formData, classId: Number(val) })}
              options={classes.map(c => ({ label: c.name, value: Number(c.id) }))}
              placeholder="Select Class"
            />
          )}

          {formData.contextType === RuleContextType.USER && (
            <SearchableAsyncSelect
               label="User"
               onSearch={async (query) => {
                 const res = await profilesService.getStudents({ search: query, limit: 10 });
                 setFetchedUsers(res.data.map((s: StudentProfile) => ({ label: s.user?.name || s.id, value: String(s.user?.id) })));
               }}
               options={fetchedUsers}
               value={formData.userId || ""}
               onChange={(val) => setFormData({ ...formData, userId: String(val) })}
               placeholder="Search user..."
            />
          )}
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default RuleContexts;
