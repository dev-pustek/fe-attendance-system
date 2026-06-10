import React, { useState, useEffect, useMemo } from "react";
import { useClasses, useAcademicYears, useClassEnrollments, usePromoteStudents } from "../../../api/hooks/useAcademic";
import { StudentPromotionDto } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { UserIcon, ArrowRightIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";

const ClassPromotion: React.FC = () => {
  const { confirm, confirmState } = useConfirm();

  // Selections
  const [sourceYearId, setSourceYearId] = useState<string>("");
  const [sourceClassId, setSourceClassId] = useState<string>("");
  
  const [targetYearId, setTargetYearId] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>(""); // Default target

  // API Data
  const { data: academicYearsResponse, isLoading: isLoadingYears } = useAcademicYears({ limit: 100 });
  const { data: classesResponse, isLoading: isLoadingClasses } = useClasses({ limit: 500 });
  
  const { data: sourceEnrollmentsResponse, isLoading: isLoadingEnrollments } = useClassEnrollments({
    classId: sourceClassId || undefined,
    academicYearId: sourceYearId || undefined,
    status: 'active',
    limit: 1000 // Get all for this class
  });

  const promoteMutation = usePromoteStudents();

  // Local State for Student Actions
  const [studentActions, setStudentActions] = useState<Record<string, StudentPromotionDto>>({});

  const academicYears = academicYearsResponse?.data || [];
  const classes = classesResponse?.data || [];
  const enrollments = sourceEnrollmentsResponse?.data || [];

  // Filtered Options
  const sourceClasses = classes.filter(c => String(c.academicYearId) === sourceYearId);
  const targetClasses = classes.filter(c => String(c.academicYearId) === targetYearId);

  // Initialize student actions when source enrollments load
  useEffect(() => {
    if (enrollments.length > 0 && sourceClassId) {
      const initial: Record<string, StudentPromotionDto> = {};
      enrollments.forEach(en => {
        initial[String(en.userId)] = {
          userId: String(en.userId),
          action: "promote",
          targetClassId: targetClassId || undefined
        };
      });
      setStudentActions(initial);
    } else {
      setStudentActions({});
    }
  }, [enrollments, sourceClassId, targetClassId]);

  // Bulk actions
  const setAllActions = (action: "promote" | "retain" | "graduate") => {
    setStudentActions(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(userId => {
        updated[userId].action = action;
        if (action === "graduate") {
          updated[userId].targetClassId = undefined;
        } else {
          updated[userId].targetClassId = targetClassId || undefined;
        }
      });
      return updated;
    });
  };

  const handleStudentActionChange = (userId: string, field: keyof StudentPromotionDto, value: any) => {
    setStudentActions(prev => {
      const current = prev[userId] || { userId, action: "promote" };
      const updated = { ...current, [field]: value };
      
      // Auto-clear targetClassId if graduating
      if (field === 'action' && value === 'graduate') {
        updated.targetClassId = undefined;
      }
      // Auto-set targetClassId if switching to promote/retain and one is selected globally
      if (field === 'action' && value !== 'graduate' && !updated.targetClassId) {
        updated.targetClassId = targetClassId || undefined;
      }
      
      return { ...prev, [userId]: updated };
    });
  };

  const handleSubmit = async () => {
    if (!sourceClassId) {
      showError(null, "Please select a source class.");
      return;
    }

    const studentsToProcess = Object.values(studentActions);
    if (studentsToProcess.length === 0) {
      showError(null, "No students to process.");
      return;
    }

    // Validation
    const invalidStudents = studentsToProcess.filter(s => s.action !== 'graduate' && !s.targetClassId);
    if (invalidStudents.length > 0) {
      showError(null, `${invalidStudents.length} student(s) missing a target class for promotion/retention.`);
      return;
    }

    const confirmed = await confirm({
      variant: 'update',
      title: 'Confirm Class Promotion',
      message: `Are you sure you want to process ${studentsToProcess.length} student(s)? This will deactivate their current enrollments and create new ones (or mark them as graduated).`,
    });

    if (!confirmed) return;

    try {
      await promoteMutation.mutateAsync({
        fromClassId: Number(sourceClassId),
        students: studentsToProcess
      });
      showSuccess("Students processed successfully!");
      // Reset
      setSourceClassId("");
      setStudentActions({});
    } catch (err) {
      showError(err, "Failed to process class promotion");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const vals = Object.values(studentActions);
    return {
      promote: vals.filter(s => s.action === 'promote').length,
      retain: vals.filter(s => s.action === 'retain').length,
      graduate: vals.filter(s => s.action === 'graduate').length,
      total: vals.length
    };
  }, [studentActions]);

  return (
    <>
      <PageMeta title="Class Promotion | Management" description="Promote, retain, or graduate students in bulk." />
      <PageBreadcrumb pageTitle="Class Promotion" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Promotion</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Bulk advance students from one academic year to the next.</p>
        </div>

        {/* Wizard Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-100 text-xs text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">1</span>
              Source Class
            </h3>
            <div className="space-y-4">
              <CustomSelect
                label="Academic Year"
                value={sourceYearId}
                onChange={(val) => { setSourceYearId(String(val)); setSourceClassId(""); }}
                options={[
                  { label: "Select Year", value: "" },
                  ...academicYears.map(y => ({ label: y.code, value: String(y.id) })),
                ]}
              />
              <CustomSelect
                label="Class"
                value={sourceClassId}
                onChange={(val) => setSourceClassId(String(val))}
                disabled={!sourceYearId}
                options={[
                  { label: "Select Class", value: "" },
                  ...sourceClasses.map(c => ({ label: c.code, value: String(c.id) })),
                ]}
              />
            </div>
          </div>

          {/* Target Section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-100 text-xs text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">2</span>
              Default Target Class
            </h3>
            <div className="space-y-4">
              <CustomSelect
                label="Next Academic Year"
                value={targetYearId}
                onChange={(val) => { setTargetYearId(String(val)); setTargetClassId(""); }}
                options={[
                  { label: "Select Next Year", value: "" },
                  ...academicYears.map(y => ({ label: y.code, value: String(y.id) })),
                ]}
              />
              <CustomSelect
                label="Default Next Class"
                value={targetClassId}
                onChange={(val) => setTargetClassId(String(val))}
                disabled={!targetYearId}
                options={[
                  { label: "Select Default Class", value: "" },
                  ...targetClasses.map(c => ({ label: c.code, value: String(c.id) })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {enrollments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Total:</span>
                <span className="font-bold text-gray-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-success-500"></span>
                <span className="text-gray-500">Promote:</span>
                <span className="font-bold text-gray-900 dark:text-white">{stats.promote}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-warning-500"></span>
                <span className="text-gray-500">Retain:</span>
                <span className="font-bold text-gray-900 dark:text-white">{stats.retain}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-info-500"></span>
                <span className="text-gray-500">Graduate:</span>
                <span className="font-bold text-gray-900 dark:text-white">{stats.graduate}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setAllActions("promote")} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white text-success-600 border border-success-200 hover:bg-success-50 dark:bg-transparent dark:border-success-500/30 dark:hover:bg-success-500/10 transition-colors">Mark All Promote</button>
              <button onClick={() => setAllActions("graduate")} className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white text-info-600 border border-info-200 hover:bg-info-50 dark:bg-transparent dark:border-info-500/30 dark:hover:bg-info-500/10 transition-colors">Mark All Graduate</button>
            </div>
          </div>
        )}

        {/* Student Table */}
        {sourceClassId && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</TableCell>
                  <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Action</TableCell>
                  <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Target Class</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoadingEnrollments ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-gray-400">Loading students...</TableCell>
                  </TableRow>
                ) : enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-gray-400">No active students in this class.</TableCell>
                  </TableRow>
                ) : (
                  enrollments.map((en) => {
                    const actionData = studentActions[String(en.userId)];
                    if (!actionData) return null;
                    
                    return (
                      <TableRow key={en.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                              <UserIcon className="size-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{en.user?.name || "Unknown Student"}</p>
                              <p className="text-[11px] text-gray-500">{en.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          <CustomSelect
                            value={actionData.action}
                            onChange={(val) => handleStudentActionChange(String(en.userId), 'action', val)}
                            options={[
                              { label: "Promote", value: "promote" },
                              { label: "Retain", value: "retain" },
                              { label: "Graduate", value: "graduate" },
                            ]}
                            className={`min-w-[120px] ${
                              actionData.action === 'promote' ? '[&>button]:!border-success-200 [&>button]:!bg-success-50 [&>button]:!text-success-700 dark:[&>button]:!border-success-500/30 dark:[&>button]:!bg-success-500/10 dark:[&>button]:!text-success-400' :
                              actionData.action === 'retain' ? '[&>button]:!border-warning-200 [&>button]:!bg-warning-50 [&>button]:!text-warning-700 dark:[&>button]:!border-warning-500/30 dark:[&>button]:!bg-warning-500/10 dark:[&>button]:!text-warning-400' :
                              '[&>button]:!border-info-200 [&>button]:!bg-info-50 [&>button]:!text-info-700 dark:[&>button]:!border-info-500/30 dark:[&>button]:!bg-info-500/10 dark:[&>button]:!text-info-400'
                            }`}
                          />
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          {actionData.action === 'graduate' ? (
                            <div className="flex items-center justify-center gap-2 text-gray-400">
                              <span className="text-sm font-semibold italic text-info-600">Graduating</span>
                            </div>
                          ) : (
                            <CustomSelect
                              value={actionData.targetClassId || ""}
                              onChange={(val) => handleStudentActionChange(String(en.userId), 'targetClassId', val)}
                              options={[
                                { label: "Select Target Class", value: "" },
                                ...targetClasses.map(c => ({ label: c.code, value: String(c.id) }))
                              ]}
                              className="min-w-[160px] text-left"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Submit Button */}
        {enrollments.length > 0 && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSubmit}
              disabled={promoteMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              {promoteMutation.isPending ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  Process Promotion
                  <ArrowRightIcon className="size-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ClassPromotion;
