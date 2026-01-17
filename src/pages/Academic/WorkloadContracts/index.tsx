import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { 
    PlusIcon, 
    UserIcon, 
    PencilIcon, 
    TrashBinIcon, 
    AngleRightIcon, 
    AlertIcon, 
    CheckCircleIcon, 
    InfoIcon, 
    SearchIcon,
    UserCircleIcon,
    ChevronLeftIcon,
} from "../../../components/atoms/Icons";
import { 
    useWorkloadContracts, 
    useAcademicYears, 
    useTeachingUnitPolicies,
    useEducationLevels,
    useGrades,
    useMajors,
    useProgramStudies
} from "../../../api/hooks/useAcademic";
import { academicService } from "../../../api/services/academicService";
import { WorkloadContract, CreateWorkloadContractDto, UpdateWorkloadContractDto } from "../../../api/types/academic";
import Badge from "../../../components/atoms/Badge";
import Switch from "../../../components/atoms/Switch";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import NumberInput from "../../../components/atoms/NumberInput";
import Label from "../../../components/atoms/Label";
import toast from "react-hot-toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { showSuccess, showError } from "../../../utils/toast";
import WorkloadBar from "../../../components/molecules/WorkloadBar";
import WorkloadBadge from "../../../components/molecules/WorkloadBadge";
import { useDebounce } from "../../../hooks/useDebounce";

const WorkloadContracts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, confirmState } = useConfirm();

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [sortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Filters
  const isActiveFilter = searchParams.get("isActive") || "all";
  const academicYearFilter = searchParams.get("academicYearId") || "";
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "all" || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
    setPage(1); 
  };

  const params = useMemo(() => ({
    isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    academicYearId: academicYearFilter || undefined,
    educationLevelId: searchParams.get("educationLevelId") || undefined,
    gradeId: searchParams.get("gradeId") || undefined,
    programStudyId: searchParams.get("programStudyId") || undefined,
    majorId: searchParams.get("majorId") || undefined,
    search: debouncedSearch || undefined,
    limit: 1000, 
    withMetrics: true,
  }), [isActiveFilter, academicYearFilter, debouncedSearch, searchParams]);

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useWorkloadContracts(params);
  const { data: academicYearsResponse } = useAcademicYears({ isActive: true });
  const { data: policiesResponse } = useTeachingUnitPolicies({ limit: 100 });
  
  const contracts = useMemo(() => response?.data || [], [response]);
  const metrics = useMemo(() => response?.metrics, [response]);
  const academicYears = useMemo(() => academicYearsResponse?.data || [], [academicYearsResponse]);
  const policies = useMemo(() => policiesResponse?.data || [], [policiesResponse]);

  const getHours = (units: number, academicYearId: number | string) => {
      const policy = policies.find(p => String(p.academicYearId) === String(academicYearId));
      const minutes = policy?.minutesPerUnit || 45; // Default to 45 if no policy
      return ((units * minutes) / 60).toFixed(1);
  };


  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<WorkloadContract | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<CreateWorkloadContractDto>({
    teacherId: "",
    academicYearId: "",
    targetUnitsPerWeek: 24,
    minUnitsPerWeek: 12,
    maxUnitsPerWeek: 30,
    salaryBasis: "per_jp",
    notes: "",
    isActive: true,
  });

  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const educationLevelId = searchParams.get("educationLevelId") || "";
  const gradeId = searchParams.get("gradeId") || "";
  const majorId = searchParams.get("majorId") || "";
  const programStudyId = searchParams.get("programStudyId") || "";

  const { data: educationLevelsResponse } = useEducationLevels({ limit: 100 });
  const { data: gradesResponse } = useGrades({ limit: 100, educationLevelId });
  const { data: programStudiesResponse } = useProgramStudies({ limit: 100, educationLevelId });
  const { data: majorsResponse } = useMajors({ limit: 100, programStudyId });

  const educationLevels = useMemo(() => educationLevelsResponse?.data || [], [educationLevelsResponse]);
  const grades = useMemo(() => gradesResponse?.data || [], [gradesResponse]);
  const majors = useMemo(() => majorsResponse?.data || [], [majorsResponse]);
  const programStudies = useMemo(() => programStudiesResponse?.data || [], [programStudiesResponse]);

  const searchTeachers = useCallback(async (term: string) => {
    setIsSearchingTeachers(true);
    try {
      const response = await academicService.getTeachers({
        search: term,
        limit: 20, // Increased limit
        educationLevelId,
        gradeId,
        majorId,
        programStudyId
      });
      setTeacherOptions(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.data.map((e: any) => {
          const user = e.user || e;
          return {
            label: user?.name || "Unknown",
            value: user?.public_id || "",
            subLabel: user?.email,
          };
        })
      );
    } catch (error) {
      console.error("Failed to search teachers", error);
    } finally {
      setIsSearchingTeachers(false);
    }
  }, [educationLevelId, gradeId, majorId, programStudyId]);

  const handleOpenModal = (contract?: WorkloadContract) => {
    if (contract) {
      setSelectedContract(contract);
      setFormData({
        teacherId: contract.teacherId,
        academicYearId: contract.academicYearId,
        targetUnitsPerWeek: contract.targetUnitsPerWeek,
        minUnitsPerWeek: contract.minUnitsPerWeek || 0,
        maxUnitsPerWeek: contract.maxUnitsPerWeek || 0,
        salaryBasis: contract.salaryBasis,
        notes: contract.notes || "",
        isActive: contract.isActive,
      });
      if (contract.teacher) {
        setTeacherOptions([{
            label: contract.teacher.name,
            value: contract.teacher.public_id,
            subLabel: contract.teacher.email
        }]);
      }
    } else {
      setSelectedContract(null);
      // Reset filters when opening new
      // No longer resetting global filters, they apply to scope
      
      setFormData({
        teacherId: "",
        academicYearId: academicYears.find(ay => ay.isActive)?.id || "",
        targetUnitsPerWeek: 24,
        minUnitsPerWeek: 12,
        maxUnitsPerWeek: 30,
        salaryBasis: "per_jp",
        notes: "",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (contract: WorkloadContract) => {
    setSelectedContract(contract);
    setIsDetailModalOpen(true);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await confirm({
      variant: selectedContract ? 'update' : 'create',
      title: selectedContract ? 'Update Contract' : 'Create Contract',
      message: `Are you sure you want to ${selectedContract ? 'update' : 'create'} this workload contract?`,
    });

    if (!confirmed) return;

    try {
      if (selectedContract) {
        await updateMutation.mutateAsync({
          id: selectedContract.id,
          data: formData as UpdateWorkloadContractDto,
        });
        showSuccess("Contract updated successfully");
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess("Contract created successfully");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      showError(err, "Failed to save contract");
    }
  };

  const handleDelete = async (contract: WorkloadContract) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Workload Contract',
      message: `Are you sure you want to delete the workload contract for ${contract.teacher?.name}? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(contract.id);
        showSuccess("Contract deleted successfully");
      } catch (err: unknown) {
        showError(err, "Failed to delete contract");
      }
    }
  };

  const handleToggleActive = async (contract: WorkloadContract) => {
    try {
      await updateMutation.mutateAsync({
        id: contract.id,
        data: { isActive: !contract.isActive },
      });
      toast.success(`Contract ${!contract.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const salaryBasisOptions = [
    { label: "Per JP", value: "per_jp" },
    { label: "Fixed Salary", value: "fixed" },
    { label: "Hybrid", value: "hybrid" },
  ];

  // Sorting
  const sortedContracts = useMemo(() => {
    const sorted = [...contracts];
    if (sortConfig) {
      sorted.sort((a: WorkloadContract, b: WorkloadContract) => {
        // @ts-expect-error - dynamic key
        const aVal = a[sortConfig.key];
        // @ts-expect-error - dynamic key
        const bVal = b[sortConfig.key];
        
        if (sortConfig.key === "actualUnits" || sortConfig.key === "targetUnitsPerWeek") {
             if (Number(aVal) < Number(bVal)) return sortConfig.direction === "asc" ? -1 : 1;
             if (Number(aVal) > Number(bVal)) return sortConfig.direction === "asc" ? 1 : -1;
             return 0;
        }
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [contracts, sortConfig]);

  const total = sortedContracts.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedContracts = sortedContracts.slice((page - 1) * limit, page * limit);

  return (
    <>
      <PageMeta title="Workload Contracts | Academic" description="Manage teacher workload targets and monitor utilization." />
      <PageBreadcrumb pageTitle="Workload Contracts" />

      <div className="space-y-6">
          {/* Metrics */}
          {metrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Teachers</p>
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.totalTeachers}</h3>
                          </div>
                          <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-xl">
                              <UserIcon className="size-5 text-brand-500" />
                          </div>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overloaded</p>
                              <h3 className="text-2xl font-bold text-error-600 dark:text-error-400 mt-1">{metrics.totalOverloaded}</h3>
                          </div>
                          <div className="p-2 bg-error-50 dark:bg-error-500/10 rounded-xl">
                              <AlertIcon className="size-5 text-error-500" />
                          </div>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Balanced</p>
                              <h3 className="text-2xl font-bold text-success-600 dark:text-success-400 mt-1">{metrics.totalBalanced}</h3>
                          </div>
                          <div className="p-2 bg-success-50 dark:bg-success-500/10 rounded-xl">
                              <CheckCircleIcon className="size-5 text-success-500" />
                          </div>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Underloaded</p>
                              <h3 className="text-2xl font-bold text-warning-600 dark:text-warning-400 mt-1">{metrics.totalUnderloaded}</h3>
                          </div>
                          <div className="p-2 bg-warning-50 dark:bg-warning-500/10 rounded-xl">
                              <InfoIcon className="size-5 text-warning-500" />
                          </div>
                      </div>
                  </div>
              </div>
          ) : null}

          {/* Filter & Actions */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Teacher</label>
                      <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                              <SearchIcon className="size-4" />
                          </div>
                          <input
                              type="text"
                              placeholder="Name or email..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                          />
                      </div>
                  </div>
                  <div className="w-full sm:w-48 space-y-1.5">
                        <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</label>
                        <CustomSelect
                          options={[{ label: "All Levels", value: "" }, ...educationLevels.map(el => ({ label: el.name, value: String(el.id) }))]}
                          value={educationLevelId || ""}
                          onChange={(v) => {
                              updateFilter("educationLevelId", String(v));
                              updateFilter("gradeId", "");
                              updateFilter("programStudyId", "");
                              updateFilter("majorId", "");
                          }}
                        />
                  </div>
                  {/* Additional Filters Grid for larger screens */}
                  {educationLevelId && (
                      <>
                        <div className="w-full sm:w-40 space-y-1.5">
                                <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade</label>
                                <CustomSelect
                                options={[{ label: "All Grades", value: "" }, ...grades.map(g => ({ label: g.name, value: String(g.id) }))]}
                                value={gradeId}
                                onChange={(v) => updateFilter("gradeId", String(v))}
                                />
                        </div>
                         <div className="w-full sm:w-40 space-y-1.5">
                                <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Program</label>
                                <CustomSelect
                                options={[{ label: "All Programs", value: "" }, ...programStudies.map(p => ({ label: p.name, value: String(p.id) }))]}
                                value={programStudyId}
                                onChange={(v) => {
                                    updateFilter("programStudyId", String(v));
                                    updateFilter("majorId", "");
                                }}
                                />
                        </div>
                        <div className="w-full sm:w-40 space-y-1.5">
                                <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Major</label>
                                <CustomSelect
                                options={[{ label: "All Majors", value: "" }, ...majors.map(m => ({ label: m.name, value: String(m.id) }))]}
                                value={majorId}
                                onChange={(v) => updateFilter("majorId", String(v))}
                                disabled={!programStudyId}
                                />
                        </div>
                      </>
                  )}

                  <div className="w-full sm:w-48 space-y-1.5">
                        <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</label>
                        <CustomSelect
                          options={[{ label: "All Years", value: "" }, ...academicYears.map(ay => ({ label: ay.name, value: ay.id }))]}
                          value={academicYearFilter ? (isNaN(Number(academicYearFilter)) ? academicYearFilter : Number(academicYearFilter)) : ""}
                          onChange={(v) => updateFilter("academicYearId", String(v))}
                      />
                  </div>
                  <div className="w-full sm:w-40 space-y-1.5">
                        <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                        <CustomSelect
                          options={[
                              { label: "All Status", value: "all" },
                              { label: "Active", value: "active" },
                              { label: "Inactive", value: "inactive" },
                          ]}
                          value={isActiveFilter}
                          onChange={(v) => updateFilter("isActive", String(v))}
                      />
                  </div>
              </div>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 h-[42px] mb-[1px]"
              >
                  <PlusIcon className="fill-white text-xl text-white" />
                  <span className="hidden sm:inline">Add Contract</span>
                  <span className="sm:hidden">Add</span>
              </button>
          </div>

          {/* Teacher Profile Cards Grid */}
          {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-white/5 animate-pulse" />
                  ))}
              </div>
          ) : paginatedContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/5 border-dashed">
                  <div className="size-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                      <UserCircleIcon className="size-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No contracts found</h3>
                  <p className="text-gray-500 max-w-sm mt-2">Try adjusting your filters or search query.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedContracts.map((contract) => (
                      <div key={contract.id} className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 cursor-pointer overflow-hidden">
                           {/* Absolute Actions & Status - Top Right */}
                           <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenDetail(contract); }}
                                    className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="View Details"
                                >
                                    <InfoIcon className="size-4" />
                                </button>
                                <Badge color={contract.isActive ? 'success' : 'light'} className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-full shadow-sm">
                                    {contract.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                           </div>

                          <div className="p-5 flex flex-col gap-5">
                              {/* Top Header: Teacher Info & Status */}
                              <div className="flex justify-between items-start gap-4">
                                  <div className="flex gap-4 w-full pr-12">
                                      {/* Avatar - Smaller Size */}
                                      <div className="shrink-0 w-12 sm:w-14 aspect-[3/4] rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm">
                                          {contract.teacher?.photo ? (
                                              <img src={contract.teacher.photo} alt={contract.teacher.name} className="size-full object-cover" />
                                          ) : (
                                              <div className="size-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                                  <UserCircleIcon className="size-6" />
                                              </div>
                                          )}
                                      </div>
                                      
                                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest leading-none mt-0.5">
                                                  {contract.teacher?.profile?.employeeId || "TEACHER"}
                                              </span>
                                          </div>
                                          <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 leading-tight">
                                              {contract.teacher?.name}
                                          </h3>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                              {contract.teacher?.email}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Workload Metrics */}
                              <div className="space-y-3">
                                  {/* Bar */}
                                  <div className="space-y-1.5">
                                      <div className="flex justify-between items-end text-xs">
                                          <span className="text-gray-500 dark:text-gray-400 font-medium">Utilization</span>
                                          <div className="text-right">
                                              <span className="font-mono font-bold text-gray-900 dark:text-white block leading-none">
                                                  {contract.actualUnits || 0} <span className="text-gray-400 font-normal">/ {contract.targetUnitsPerWeek} JP</span>
                                              </span>
                                              <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">
                                                  ≈ {getHours(contract.actualUnits || 0, contract.academicYearId)} Hours
                                              </span>
                                          </div>
                                      </div>
                                      <WorkloadBar target={contract.targetUnitsPerWeek} actual={contract.actualUnits || 0} className="h-2 rounded-full" />
                                  </div>

                                  {/* Badges Row */}
                                  <div className="flex flex-wrap items-center gap-2">
                                      {contract.status && contract.balance !== undefined ? (
                                          <WorkloadBadge status={contract.status} balance={contract.balance} className="text-[10px] py-0.5 px-2" />
                                      ) : null}

                                      <Badge 
                                        color={contract.salaryBasis === "per_jp" ? "primary" : contract.salaryBasis === "fixed" ? "success" : "warning"}
                                        className="rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide"
                                      >
                                          {contract.salaryBasis.replace('_', ' ')}
                                      </Badge>
                                      
                                      <Badge color="info" className="rounded-full px-2 py-0.5 text-[10px] font-mono font-bold">
                                          {contract.academicYear?.code}
                                      </Badge>
                                  </div>
                              </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Switch 
                                      checked={contract.isActive} 
                                      onChange={() => handleToggleActive(contract)} 
                                  />
                              </div>

                               <div className="flex items-center gap-1">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleOpenModal(contract); }} 
                                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                  >
                                      <PencilIcon className="size-3.5" /> Edit
                                  </button>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleDelete(contract); }} 
                                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                  >
                                      <TrashBinIcon className="size-3.5" />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between pt-2">
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
                
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                >
                  Next
                  <AngleRightIcon className="size-4" />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedContract ? "Update Contract" : "Create New Contract"}
        description="Configure teacher workload targets and salary bases for the academic year."
        className="max-w-lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
             <button
               type="button"
               onClick={() => setIsModalOpen(false)}
               className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
             >
               Cancel
             </button>
             <button
               type="submit"
               form="contract-form"
               className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20"
             >
               {selectedContract ? "Update Contract" : "Save Contract"}
             </button>
          </div>
        }
      >
        <form id="contract-form" onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <SearchableAsyncSelect
              placeholder="Search teacher..."
              onSearch={searchTeachers}
              options={teacherOptions}
              value={formData.teacherId}
              onChange={(val) => setFormData({ ...formData, teacherId: String(val) })}
              isLoading={isSearchingTeachers}
            />
            {educationLevelId && (
                <p className="text-[10px] text-gray-400">
                    * Showing teachers filtered by {educationLevels.find(e => String(e.id) === educationLevelId)?.name}
                </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Academic Year</Label>
            <CustomSelect
                options={academicYears.map(ay => ({ label: ay.name, value: ay.id }))}
                value={formData.academicYearId}
                onChange={(val) => setFormData({ ...formData, academicYearId: String(val) })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Target JP</Label>
                <NumberInput
                  value={formData.targetUnitsPerWeek}
                  onChange={(val) => setFormData({ ...formData, targetUnitsPerWeek: Number(val) })}
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Min JP</Label>
                <NumberInput
                  value={formData.minUnitsPerWeek || 0}
                  onChange={(val) => setFormData({ ...formData, minUnitsPerWeek: Number(val) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Max JP</Label>
                <NumberInput
                  value={formData.maxUnitsPerWeek || 0}
                  onChange={(val) => setFormData({ ...formData, maxUnitsPerWeek: Number(val) })}
                  min={0}
                />
              </div>
          </div>

          <div className="space-y-2">
            <Label>Salary Basis</Label>
            <CustomSelect
              options={salaryBasisOptions}
              value={formData.salaryBasis}
              onChange={(val) => setFormData({ ...formData, salaryBasis: val as "per_jp" | "fixed" | "hybrid" })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-xl border border-gray-300 bg-transparent p-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 shadow-sm"
              rows={3}
              placeholder="Internal notes..."
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Contract Details"
        description={`Detailed view of workload contract for ${selectedContract?.teacher?.name || 'Teacher'}`}
        className="max-w-2xl"
        footer={
           <div className="flex justify-end gap-3 w-full">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenModal(selectedContract as WorkloadContract);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-md shadow-brand-500/20"
                >
                  <PencilIcon className="size-4" />
                  Edit Contract
                </button>
           </div>
        }
      >
        {selectedContract && (
           <div className="space-y-6 pt-4">
              {/* Header with 3:4 Photo */}
              <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                <div className="shrink-0 w-32 aspect-[3/4] rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 dark:border-white/10">
                    {selectedContract.teacher?.photo ? (
                        <img src={selectedContract.teacher.photo} alt={selectedContract.teacher?.name} className="size-full object-cover" />
                    ) : (
                        <div className="size-full flex items-center justify-center text-gray-300">
                             <UserCircleIcon className="size-16" />
                        </div>
                    )}
                </div>
                <div className="space-y-3 py-1">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedContract.teacher?.name}</h3>
                    <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">{selectedContract.teacher?.email}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge color={selectedContract.isActive ? "success" : "light"} className="capitalize">
                      {selectedContract.isActive ? "Active Status" : "Inactive"}
                    </Badge>
                    <Badge color="info">{selectedContract.academicYear?.name}</Badge>
                    <Badge color="primary" className="uppercase font-mono text-[10px]">
                      {selectedContract.salaryBasis.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
                      <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Target</span>
                          <span className="font-mono font-bold text-gray-800 dark:text-white">{selectedContract.targetUnitsPerWeek} JP</span>
                      </div>
                      <div className="w-px h-8 bg-gray-200 dark:bg-white/10 mx-2" />
                      <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Start Date</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(selectedContract.academicYear?.startDate || "").toLocaleDateString()}</span>
                      </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-5 rounded-2xl border border-gray-100 bg-white dark:bg-white/[0.02] dark:border-white/10 shadow-sm">
                       <div className="flex items-center justify-between mb-4">
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Workload Status</p>
                           <WorkloadBadge status={selectedContract.status || "BALANCED"} balance={selectedContract.balance || 0} />
                       </div>
                       
                       <div className="flex flex-col gap-4">
                           <div className="space-y-2">
                               <div className="flex justify-between items-end">
                                   <span className="text-3xl font-bold text-gray-900 dark:text-white">{selectedContract.actualUnits || 0}<span className="text-base text-gray-400 font-normal ml-1">/ {selectedContract.targetUnitsPerWeek}</span></span>
                                   <span className="text-xs font-medium text-gray-500">JP Allocated</span>
                               </div>
                               <WorkloadBar target={selectedContract.targetUnitsPerWeek} actual={selectedContract.actualUnits || 0} showLabels={false} className="h-3" />
                           </div>
                           
                           <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                               This teacher is currently <strong>{selectedContract.status}</strong> by <span className={selectedContract.balance && selectedContract.balance > 0 ? "text-error-500 font-bold" : "text-gray-700 font-bold"}>{Math.abs(selectedContract.balance || 0)} JP</span> relative to their target.
                           </div>
                       </div>
                   </div>

                   <div className="flex flex-col gap-4">
                        <div className="p-5 rounded-2xl border border-gray-100 bg-white dark:bg-white/[0.02] dark:border-white/10 shadow-sm h-full">
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Limits & Configuration</p>
                           <div className="space-y-4">
                                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <span className="text-sm text-gray-500">Minimum Load</span>
                                    <span className="text-sm font-mono font-bold">{selectedContract.minUnitsPerWeek || 0} JP</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <span className="text-sm text-gray-500">Maximum Load</span>
                                    <span className="text-sm font-mono font-bold">{selectedContract.maxUnitsPerWeek || 0} JP</span>
                                </div>
                                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <span className="text-sm text-gray-500">Salary Model</span>
                                    <span className="text-sm font-medium text-brand-600 capitalize">{selectedContract.salaryBasis.replace('_', ' ')}</span>
                                </div>
                           </div>
                        </div>
                   </div>
              </div>

              {selectedContract.notes && (
                <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-white/5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Internal Notes</p>
                  <div className="p-4 rounded-xl bg-yellow-50/50 dark:bg-yellow-500/5 text-sm text-gray-700 dark:text-gray-300 border border-yellow-100 dark:border-yellow-500/10 italic">
                    {selectedContract.notes}
                  </div>
                </div>
              )}
           </div>
        )}
      </Modal>



      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default WorkloadContracts;
