import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useGrades, useGradesInfinite, useEducationLevels } from "../../../api/hooks/useAcademic";
import { Grade, CreateGradeDto, UpdateGradeDto } from "../../../api/types/academic";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";
import TableActionMenu from "../../../components/molecules/TableActionMenu";
import DropdownItem from "../../../components/atoms/DropdownItem";
import Dropdown from "../../../components/molecules/Dropdown";
import { 
  InfoIcon as GradeIcon, 
  ChevronLeftIcon, 
  AngleRightIcon, 
  PlusIcon, 
  PencilIcon,
  TrashBinIcon, 
  FilterIcon, 
  SearchIcon, 
  ChevronDownIcon,
  HorizontaLDots as MoreHorizontalIcon,
} from "../../../components/atoms/Icons";
import GradeCard from "./GradeCard";

const RowActionMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
      >
        <MoreHorizontalIcon className="size-5" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
      >
        <DropdownItem
          onClick={() => {
            setIsOpen(false);
            onEdit();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Edit
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

const gradeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  educationLevelId: z.union([z.string(), z.number()]).refine((val) => val !== "", "Education level is required"),
});

type GradeFormValues = z.infer<typeof gradeSchema>;

const Grades: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter state
  const [levelFilter, setLevelFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Check if mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const queryParams = {
    search: searchTerm || undefined,
    educationLevelId: levelFilter === "all" ? undefined : levelFilter,
  };

  const { data: educationLevelsResp } = useEducationLevels({ limit: 100 });
  const educationLevels = educationLevelsResp?.data || [];

  // Desktop query
  const { data: desktopData, isLoading: isLoadingDesktop, createMutation, updateMutation, deleteMutation } = useGrades({
    ...queryParams,
    page,
    limit,
  });

  // Mobile query
  const { data: infiniteData, isLoading: isLoadingInfinite, isFetchingNextPage, hasNextPage, fetchNextPage } = useGradesInfinite(queryParams);

  const { confirm, confirmState } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { code: "", name: "", educationLevelId: "" },
  });

  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      setSelectedGrade(grade);
      reset({
        code: grade.code,
        name: grade.name,
        educationLevelId: grade.educationLevelId || "",
      });
    } else {
      setSelectedGrade(null);
      reset({ code: "", name: "", educationLevelId: "" });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data: GradeFormValues) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        educationLevelId: Number(data.educationLevelId),
      };

      if (selectedGrade) {
        await updateMutation.mutateAsync({ id: selectedGrade.id, data: payload as UpdateGradeDto });
        showSuccess("Grade updated successfully");
      } else {
        await createMutation.mutateAsync(payload as CreateGradeDto);
        showSuccess("Grade created successfully");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save grade");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Grade",
      message: "Are you sure you want to delete this grade? This action cannot be undone.",
    });
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showSuccess("Grade deleted successfully");
      } catch (error) {
        showError(error, "Failed to delete grade");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Selected Grades",
      message: `Are you sure you want to delete ${selectedIds.size} grades? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await Promise.all(Array.from(selectedIds).map((id) => deleteMutation.mutateAsync(id)));
        setSelectedIds(new Set());
        showSuccess(`${selectedIds.size} grades deleted successfully`);
      } catch (error) {
        showError(error, "Failed to delete some grades");
      }
    }
  };

  const grades = isMobile
    ? infiniteData?.pages.flatMap((p: any) => p.data) || []
    : desktopData?.data || [];

  const total = isMobile
    ? infiniteData?.pages[0]?.meta?.total || 0
    : desktopData?.meta?.total || 0;
  const totalPages = desktopData?.meta?.totalPages || 1;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(grades.map((g: Grade) => g.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  return (
    <>
      <PageMeta title="Grade Management | SIAPUS" description="Manage academic grades." />
      <PageBreadcrumb pageTitle="Grade Management" />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <GradeIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Grade Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and manage academic grades.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              <PlusIcon className="size-5" />
              Add New Grade
            </button>
          </div>
        </div>

        {/* Mobile FABs */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
            <button
              onClick={() => handleOpenModal()}
              className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
              aria-label="Add New Grade"
            >
              <PlusIcon className="size-6 fill-white" />
            </button>
          </div>
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
                  Search & Filter Grades
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use the criteria below to filter grades by education level or code.
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
                
                <div className="grid grid-cols-1 gap-5 items-end sm:grid-cols-2 lg:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Education Level</Label>
                    <CustomSelect
                      value={levelFilter === "all" ? "" : levelFilter}
                      onChange={(val) => { setLevelFilter(val ? String(val) : "all"); setPage(1); }}
                      onClear={() => { setLevelFilter("all"); setPage(1); }}
                      placeholder="All Levels"
                      options={educationLevels.map(level => ({ label: level.name, value: String(level.id) }))}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1 lg:col-span-6">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Search</Label>
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
                        placeholder="Search by Code or Name..."
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 lg:col-span-3">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchTerm("");
                        setLevelFilter("all");
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

        {/* Toolbar (Only for Bulk Actions) */}
        {selectedIds.size > 0 && (
          <TableToolbar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            bulkActions={[
              {
                label: "Delete Selected",
                icon: <TrashBinIcon className="size-4" />,
                onClick: handleBulkDelete,
                variant: "danger"
              }
            ]}
          />
        )}

        {isMobile ? (
          <div className="grid gap-3">
            {isLoadingInfinite ? (
              <div className="flex justify-center py-8">
                <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : grades.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <div className="mb-2 rounded-full bg-gray-50 p-3 dark:bg-white/5">
                  <GradeIcon className="size-6 opacity-20" />
                </div>
                <p>No grades found</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-1 mb-2">
                  <Checkbox 
                    checked={grades.length > 0 && selectedIds.size === grades.length} 
                    onChange={(e) => handleSelectAll(e.target.checked)} 
                  />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                  </span>
                </div>
                {grades.map((grade: Grade) => (
                  <GradeCard
                    key={grade.id}
                    grade={grade}
                    isSelected={selectedIds.has(grade.id)}
                    onToggle={() => handleSelect(grade.id)}
                    onEdit={() => handleOpenModal(grade)}
                    onDelete={() => handleDelete(grade.id)}
                  />
                ))}
                <div ref={observerTarget} className="h-4 w-full" />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="w-12 px-5 py-4 text-center">
                      <Checkbox
                        checked={grades.length > 0 && selectedIds.size === grades.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 uppercase tracking-wider text-theme-xs font-medium text-gray-500">
                      Code
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 uppercase tracking-wider text-theme-xs font-medium text-gray-500">
                      Grade Name
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 uppercase tracking-wider text-theme-xs font-medium text-gray-500">
                      Education Level
                    </TableCell>
                    <TableCell isHeader className="w-16 px-5 py-4 text-right uppercase tracking-wider text-theme-xs font-medium text-gray-500">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoadingDesktop ? (
                    <SkeletonTable columns={5} rows={5} />
                  ) : grades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                            <GradeIcon className="size-5 opacity-20" />
                          </div>
                          <p className="text-sm font-medium">No grades found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    grades.map((grade: Grade) => {
                      const isSelected = selectedIds.has(grade.id);
                      return (
                        <TableRow
                          key={grade.id}
                          className={`group transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}
                        >
                          <TableCell className="px-5 py-4 text-center">
                            <Checkbox checked={isSelected} onChange={() => handleSelect(grade.id)} />
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <span className="font-mono text-theme-sm font-medium text-gray-600 dark:text-gray-300">
                              {grade.code}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/5">
                                <GradeIcon className="size-4" />
                              </div>
                              <p className="font-medium text-gray-900 text-theme-sm dark:text-white">
                                {grade.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            {grade.educationLevel ? (
                              <Badge color="light">{grade.educationLevel.name}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <RowActionMenu onEdit={() => handleOpenModal(grade)} onDelete={() => handleDelete(grade.id)} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
                  </span>{" "}
                  of <span className="font-semibold text-gray-600 dark:text-gray-300">{total}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                    <ChevronLeftIcon className="size-3.5" /> Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`flex size-7 items-center justify-center rounded-lg text-xs font-medium transition ${page === p ? "bg-brand-500 text-white shadow-sm" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400"}`}>
                        {p}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-1 text-xs text-gray-400">…</span>}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                    Next <AngleRightIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md"
        title={selectedGrade ? "Update Grade" : "Create New Grade"}
        description="Enter grade details and associated education level."
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
              form="grade-form"
              disabled={isSubmitting}
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : selectedGrade ? "Update Grade" : "Save Grade"}
            </button>
          </div>
        }
      >
        <form id="grade-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code" required>Grade Code</Label>
            <Input
              id="code"
              {...register("code")}
              placeholder="e.g. 10 or X"
              error={errors.code?.message}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" required>Grade Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g. 10"
              error={errors.name?.message}
            />
          </div>

          <div className="space-y-1.5">
            <Label required>Education Level</Label>
            <Controller
              name="educationLevelId"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  options={educationLevels.map(level => ({ label: level.name, value: String(level.id) }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select Education Level"
                />
              )}
            />
            {errors.educationLevelId && (
              <p className="text-xs text-error-500">{errors.educationLevelId.message}</p>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Grades;
