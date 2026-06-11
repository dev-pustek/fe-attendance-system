import React, { useState, useMemo } from "react";
import { useClassEnrollments, useClasses, useAcademicYears } from "../../../api/hooks/useAcademic";
import { useStudents } from "../../../api/hooks/useProfiles";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { SearchIcon, AngleRightIcon, TrashBinIcon, GridIcon } from "../../../components/atoms/Icons";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";

const ClassEnrollments: React.FC = () => {
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [searchLeft, setSearchLeft] = useState("");
  const [searchRight, setSearchRight] = useState("");
  const [selectedLeftIds, setSelectedLeftIds] = useState<Set<string>>(new Set());

  const { confirm, confirmState } = useConfirm();

  const { data: classesResponse } = useClasses({ limit: 100 });
  const { data: academicYearsResponse } = useAcademicYears({ limit: 100 });

  const {
    data: enrollmentsResponse,
    isLoading: isLoadingEnrollments,
    deleteMutation,
    bulkCreateMutation
  } = useClassEnrollments({
    classId: classId || undefined,
    academicYearId: academicYearId || undefined,
    limit: 1000,
  });

  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({ limit: 5000 });

  const enrollments = enrollmentsResponse?.data || [];
  const enrolledUserIds = new Set(enrollments.map((en) => String(en.userId)));

  const allStudents = studentsResponse?.data || [];

  // Left Pane: Available Students
  const availableStudents = useMemo(() => {
    return allStudents
      .filter((s) => !enrolledUserIds.has(String(s.user?.id || s.user?.public_id)))
      .filter((s) => {
        const term = searchLeft.toLowerCase();
        return (
          s.user?.name?.toLowerCase().includes(term) ||
          s.nis?.toLowerCase().includes(term) ||
          s.nisn?.toLowerCase().includes(term)
        );
      });
  }, [allStudents, enrolledUserIds, searchLeft]);

  // Right Pane: Enrolled Students
  const enrolledStudents = useMemo(() => {
    return enrollments.filter((en) => {
      const term = searchRight.toLowerCase();
      return (
        en.user?.name?.toLowerCase().includes(term) ||
        en.user?.email?.toLowerCase().includes(term)
      );
    });
  }, [enrollments, searchRight]);

  const toggleLeftSelection = (id: string) => {
    const next = new Set(selectedLeftIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeftIds(next);
  };

  const selectAllLeft = () => {
    if (selectedLeftIds.size === availableStudents.length) {
      setSelectedLeftIds(new Set());
    } else {
      setSelectedLeftIds(new Set(availableStudents.map(s => String(s.user?.id || s.user?.public_id))));
    }
  };

  const handleBulkEnroll = async () => {
    if (!classId || !academicYearId) {
      showError(null, "Please select an Academic Year and Class first.");
      return;
    }
    if (selectedLeftIds.size === 0) return;

    try {
      await bulkCreateMutation.mutateAsync({
        classId,
        academicYearId,
        userIds: Array.from(selectedLeftIds),
        status: "active",
      });
      showSuccess(`Successfully enrolled ${selectedLeftIds.size} students!`);
      setSelectedLeftIds(new Set());
    } catch (error) {
      showError(error, "Failed to enroll students.");
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string | number, studentName: string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Remove Student',
      message: `Are you sure you want to remove ${studentName} from this class?`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(enrollmentId);
        showSuccess("Student removed successfully.");
      } catch (error) {
        showError(error, "Failed to remove student.");
      }
    }
  };

  const isPlaygroundReady = classId && academicYearId;

  return (
    <>
      <PageMeta title="Class Enrollments | Playground" description="Bulk manage student class assignments." />
      <PageBreadcrumb pageTitle="Class Enrollments" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enrollment Playground</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Easily bulk-assign students to classes using the transfer workspace.</p>
          </div>
        </div>

        {/* Configuration Toolbar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Workspace Configuration</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <CustomSelect
              label="1. Select Academic Year"
              value={academicYearId}
              onChange={(val) => setAcademicYearId(val ? String(val) : "")}
              options={[
                { label: "Choose Academic Year...", value: "" },
                ...(academicYearsResponse?.data.map((y) => ({ label: y.code, value: String(y.id) })) || []),
              ]}
            />
            <CustomSelect
              label="2. Select Class"
              value={classId}
              onChange={(val) => setClassId(val ? String(val) : "")}
              options={[
                { label: "Choose Class...", value: "" },
                ...(classesResponse?.data.map((c) => ({ label: `${c.name} (${c.code})`, value: String(c.id) })) || []),
              ]}
            />
          </div>
        </div>

        {/* Playground Dual Pane */}
        {!isPlaygroundReady ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-20 dark:border-white/[0.1]">
            <div className="mb-4 rounded-full bg-brand-50 p-4 dark:bg-brand-500/10">
              <GridIcon className="size-8 text-brand-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Workspace Locked</h3>
            <p className="text-sm text-gray-500">Please select both an Academic Year and a Class above to start enrolling students.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
            
            {/* Left Pane: Available Students */}
            <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Available Students</h3>
                  <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {availableStudents.length}
                  </span>
                </div>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, NIS, or NISN..."
                    value={searchLeft}
                    onChange={(e) => setSearchLeft(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center border-b border-gray-100 px-4 py-3 dark:border-white/[0.05]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLeftIds.size > 0 && selectedLeftIds.size === availableStudents.length}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = selectedLeftIds.size > 0 && selectedLeftIds.size < availableStudents.length;
                      }
                    }}
                    onChange={selectAllLeft}
                    className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs font-medium text-gray-500 uppercase">Select All</span>
                </label>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {isLoadingStudents ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading students...</div>
                ) : availableStudents.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No students found.</div>
                ) : (
                  <div className="space-y-1">
                    {availableStudents.map((s) => {
                      const id = String(s.user?.id || s.user?.public_id);
                      const isSelected = selectedLeftIds.has(id);
                      return (
                        <label
                          key={id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${isSelected ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLeftSelection(id)}
                            className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{s.user?.name}</p>
                            <p className="text-xs text-gray-500">NIS: {s.nis || '-'} • NISN: {s.nisn || '-'}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Action Buttons */}
            <div className="flex flex-row items-center justify-center gap-4 lg:flex-col lg:justify-center">
              <button
                onClick={handleBulkEnroll}
                disabled={selectedLeftIds.size === 0 || bulkCreateMutation.isPending}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-brand-50 p-4 text-brand-600 transition-all hover:bg-brand-100 disabled:opacity-50 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 lg:p-6"
              >
                <div className="rounded-full bg-brand-500 p-2 text-white shadow-md transition-transform group-hover:scale-110">
                  <AngleRightIcon className="size-5 rotate-90 lg:rotate-0" />
                </div>
                <span className="text-sm font-semibold">Enroll {selectedLeftIds.size > 0 ? `(${selectedLeftIds.size})` : ''}</span>
              </button>
            </div>

            {/* Right Pane: Enrolled Students */}
            <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm dark:border-brand-500/30 dark:bg-white/[0.03]">
              <div className="border-b border-brand-100 bg-brand-50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-brand-900 dark:text-brand-100">Enrolled Students</h3>
                  <span className="rounded-full bg-brand-200 px-2.5 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-500/20 dark:text-brand-300">
                    {enrolledStudents.length}
                  </span>
                </div>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
                  <input
                    type="text"
                    placeholder="Search enrolled students..."
                    value={searchRight}
                    onChange={(e) => setSearchRight(e.target.value)}
                    className="w-full rounded-xl border border-brand-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-brand-500/30 dark:bg-white/[0.05] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {isLoadingEnrollments ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading enrollments...</div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400">
                    <div className="rounded-full bg-gray-50 p-3 dark:bg-white/5">
                      <GridIcon className="size-6 opacity-20" />
                    </div>
                    <p className="text-sm">No students enrolled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {enrolledStudents.map((en) => (
                      <div
                        key={en.id}
                        className="flex items-center justify-between rounded-xl border border-transparent p-3 transition-colors hover:border-gray-100 hover:bg-gray-50 dark:hover:border-white/[0.05] dark:hover:bg-white/[0.02]"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{en.user?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{en.user?.email || `ID: ${en.userId}`}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveEnrollment(en.id, String(en.user?.name))}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                          title="Remove from class"
                        >
                          <TrashBinIcon className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ClassEnrollments;
