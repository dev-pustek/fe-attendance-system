import React, { useState, useEffect } from "react";
import Modal from "../../molecules/Modal";
import ConfirmDialog from "../../molecules/ConfirmDialog";
import SearchableAsyncSelect from "../../molecules/SearchableAsyncSelect";
import CustomSelect from "../../molecules/CustomSelect";
import DatePicker from "../../molecules/DatePicker";
import { SmoothHeight } from "../../atoms/SmoothHeight";
import { TimeIcon, UserIcon, GroupIcon, BoxIcon } from "../../atoms/Icons";
import { ShiftAssignment } from "../../../api/types/scheduling";
import { useShiftAssignments, useShiftTemplates } from "../../../api/hooks/useScheduling";
import { useAcademicYears, useClasses } from "../../../api/hooks/useAcademic";
import { userService } from "../../../api/services/userService";
import { schedulingService } from "../../../api/services/schedulingService";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";


interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssignment: ShiftAssignment | null;
  onSuccess: () => void;
  selectedDate?: string; // Optional: to pre-fill start date from calendar
  selectedEndDate?: string; // Optional: to pre-fill end date from calendar range
}

const ShiftAssignmentModal: React.FC<ShiftAssignmentModalProps> = ({
  isOpen,
  onClose,
  selectedAssignment,
  onSuccess,
  selectedDate,
  selectedEndDate
}) => {
  const { createMutation, updateMutation, bulkAssignUsersMutation, bulkAssignClassMutation } = useShiftAssignments();
  const { confirm, confirmState } = useConfirm();

  // Mode
  const [assignmentMode, setAssignmentMode] = useState<"individual" | "bulk_users" | "bulk_class">("individual");

  // Form Data
  const [formData, setFormData] = useState({
    userId: "",
    shiftTemplateId: "",
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: null as string | null,
  });

  // Bulk States
  const [bulkUserIds, setBulkUserIds] = useState<string[]>([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<{id: string, name: string}[]>([]);
  const [bulkClassData, setBulkClassData] = useState({
    academicYearId: "",
    classId: "",
  });

  // Data Fetching
  const [userOptions, setUserOptions] = useState<{label: string, value: string, subLabel?: string}[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const { data: templatesResponse } = useShiftTemplates({ limit: 100 });
  const templates = Array.isArray(templatesResponse) ? templatesResponse : (templatesResponse?.data || []);
  const templateOptions = templates.map(t => ({ label: t.name, value: t.public_id }));

  const { data: academicYearsResponse } = useAcademicYears({ limit: 100 });
  const academicYears = Array.isArray(academicYearsResponse) ? academicYearsResponse : (academicYearsResponse?.data || []);
  const academicYearOptions = academicYears.map(y => ({ label: y.name, value: String(y.id) }));

  const { data: classesResponse } = useClasses({ limit: 100 });
  const classes = Array.isArray(classesResponse) ? classesResponse : (classesResponse?.data || []);
  const classOptions = classes.map(c => ({ label: c.name, value: String(c.id) }));

  const INV_DAY_MAP: Record<number, string> = {
    1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"
  };

  const selectedTemplate = templates.find(t => t.id === formData.shiftTemplateId);

  // Fetch existing users for template
  useEffect(() => {
    const fetchExistingAssignments = async () => {
        if (!isOpen || !formData.shiftTemplateId) return;
        
        try {
            const response = await schedulingService.getAssignments({ 
                shiftTemplateId: formData.shiftTemplateId,
                limit: 100 // Get a reasonable amount
            });
            const existingAssignments = Array.isArray(response) ? response : (response?.data || []);
            
            // Map to user format
            const existingUsers = existingAssignments
                .filter(a => a.user && (a.user.public_id || a.user.id))
                .map(a => ({
                    id: String(a.user?.public_id || a.user?.id),
                    name: a.user?.name || "Unknown"
                }));
            
            // Unique users only
            const uniqueUsers = Array.from(new Map(existingUsers.map(u => [u.id, u])).values());
            
            setBulkUserIds(uniqueUsers.map(u => u.id));
            setBulkSelectedUsers(uniqueUsers);
        } catch (error) {
            console.error("Failed to fetch existing template assignments", error);
        }
    };

    if (isOpen && formData.shiftTemplateId) {
        fetchExistingAssignments();
    }
  }, [isOpen, formData.shiftTemplateId]);

  // Initialize
  useEffect(() => {
    if (isOpen) {
        if (selectedAssignment) {
            setAssignmentMode("individual");
            setFormData({
                userId: selectedAssignment.userId,
                shiftTemplateId: String(selectedAssignment.shiftTemplateId || selectedAssignment.shiftTemplate?.public_id || ""),
                effectiveFrom: selectedAssignment.effectiveFrom.split('T')[0],
                effectiveTo: selectedAssignment.effectiveTo ? selectedAssignment.effectiveTo.split('T')[0] : null,
            });
            // Pre-fill user options
            if (selectedAssignment.user) {
                const userId = selectedAssignment.user.public_id || selectedAssignment.user.id;
                setUserOptions([{
                    label: selectedAssignment.user.name,
                    value: String(userId),
                    subLabel: selectedAssignment.user.email
                }]);
            }
        } else {
            setAssignmentMode("individual");
            setFormData(prev => ({
                ...prev,
                userId: "",
                shiftTemplateId: "",
                effectiveFrom: selectedDate || new Date().toISOString().split('T')[0],
                effectiveTo: selectedEndDate || null
            }));
            setBulkUserIds([]);
            setBulkSelectedUsers([]);
            setBulkClassData({ academicYearId: "", classId: "" });
        }
    }
  }, [isOpen, selectedAssignment, selectedDate, selectedEndDate]);


  const searchUsers = React.useCallback(async (term: string) => {
    setIsSearchingUsers(true);
    try {
        const result = await userService.getUsers({ search: term, limit: 20 });
        const users = Array.isArray(result) ? result : (result.data || []);
        interface User {
          public_id: string;
          id: string;
          name: string;
          email: string;
        }

        setUserOptions((users as User[])
            .filter((u) => (u.public_id || u.id) && String(u.public_id || u.id) !== "undefined")
            .map((u) => ({
                label: u.name,
                value: String(u.public_id || u.id),
                subLabel: u.email
            })));
    } catch (error) {
        console.error("Failed to search users", error);
    } finally {
        setIsSearchingUsers(false);
    }
  }, []);

  const handleToggleBulkUser = (userId: string, label: string) => {
    if (bulkUserIds.includes(userId)) {
        setBulkUserIds(bulkUserIds.filter(id => id !== userId));
        setBulkSelectedUsers(bulkSelectedUsers.filter(u => u.id !== userId));
    } else {
        setBulkUserIds([...bulkUserIds, userId]);
        setBulkSelectedUsers([...bulkSelectedUsers, { id: userId, name: label }]);
    }
  };

  const handleRemoveBulkUser = (userId: string) => {
    setBulkUserIds(bulkUserIds.filter(id => id !== userId));
    setBulkSelectedUsers(bulkSelectedUsers.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.shiftTemplateId || !formData.effectiveFrom) {
        showError("Please fill in template and effective date");
        return;
    }

    if (assignmentMode === "individual" && !formData.userId) {
        showError("Please select a user");
        return;
    }
    if (assignmentMode === "bulk_users" && bulkUserIds.length === 0) {
        showError("Please select at least one user");
        return;
    }
    if (assignmentMode === "bulk_class" && (!bulkClassData.classId || !bulkClassData.academicYearId)) {
        showError("Please select academic year and class");
        return;
    }

    const title = selectedAssignment ? 'Update Assignment' : 'Create Assignment';
    const message = `Are you sure you want to proceed with this assignment?`;

    const confirmed = await confirm({
      variant: selectedAssignment ? 'update' : 'create',
      title,
      message,
    });

    if (!confirmed) return;

    try {
      if (assignmentMode === "individual") {
        if (selectedAssignment) {
            await updateMutation.mutateAsync({ 
            id: selectedAssignment.id, 
            data: formData 
            });
        } else {
            await createMutation.mutateAsync(formData);
        }
      } else if (assignmentMode === "bulk_users") {
        await bulkAssignUsersMutation.mutateAsync({
            userIds: bulkUserIds,
            shiftTemplateId: formData.shiftTemplateId,
            effectiveFrom: formData.effectiveFrom,
            effectiveTo: formData.effectiveTo
        });
      } else if (assignmentMode === "bulk_class") {
        await bulkAssignClassMutation.mutateAsync({
            ...bulkClassData,
            shiftTemplateId: formData.shiftTemplateId,
            effectiveFrom: formData.effectiveFrom,
            effectiveTo: formData.effectiveTo
        });
      }
      
      showSuccess(selectedAssignment ? "Updated successfully!" : "Assigned successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      showError(error, "Failed to save assignment");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl"
      title={selectedAssignment && assignmentMode === "individual" ? "Edit Assignment" : "Assign Shift"}
      description="Assign shift templates to users or classes."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="shift-assignment-form"
            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            {selectedAssignment ? "Update Assignment" : "Assign Shift"}
          </button>
        </div>
      }
      subHeader={
        <div className="relative flex border-b border-gray-100 dark:border-white/[0.05]">
            <button
                type="button"
                onClick={() => setAssignmentMode("individual")}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    assignmentMode === "individual" 
                    ? "text-brand-600 dark:text-brand-400" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
                <UserIcon className={`size-4 ${assignmentMode === "individual" ? "fill-current" : ""}`} />
                Individual
            </button>
            <button
                type="button"
                onClick={() => setAssignmentMode("bulk_users")}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    assignmentMode === "bulk_users" 
                    ? "text-brand-600 dark:text-brand-400" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
                <GroupIcon className={`size-4 ${assignmentMode === "bulk_users" ? "fill-current" : ""}`} />
                Multiple Users
            </button>
            <button
                type="button"
                onClick={() => setAssignmentMode("bulk_class")}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    assignmentMode === "bulk_class" 
                    ? "text-brand-600 dark:text-brand-400" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
                <BoxIcon className={`size-4 ${assignmentMode === "bulk_class" ? "fill-current" : ""}`} />
                Class / Group
            </button>
            
            {/* Smooth Sliding Underline */}
            <div 
                className="absolute -bottom-px h-0.5 bg-brand-500 transition-all duration-300 ease-in-out"
                style={{
                    width: '33.33%',
                    left: assignmentMode === "individual" ? '0%' : assignmentMode === "bulk_users" ? '33.33%' : '66.66%'
                }}
            />
        </div>
      }
    >
      <div className="space-y-6">

          <form id="shift-assignment-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Assignment Targets */}
            <SmoothHeight>
            <div className="space-y-2 pb-1">
                {assignmentMode === "individual" && (
                    <div className="space-y-1.5">
                        <SearchableAsyncSelect
                            labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                            label="Select User"
                            value={formData.userId}
                            onChange={(val: string | number) => setFormData({ ...formData, userId: String(val || "") })}
                            onSearch={searchUsers}
                            options={userOptions}
                            isLoading={isSearchingUsers}
                            placeholder="Search for a user..."
                        />
                    </div>
                )}

                {assignmentMode === "bulk_users" && (
                     <div className="space-y-2">
                        <SearchableAsyncSelect
                            labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                            label="Add Users to List"
                            value={""}
                            onChange={(val: string | number, label: string) => handleToggleBulkUser(String(val), label)}
                            onSearch={searchUsers}
                            options={userOptions}
                            isLoading={isSearchingUsers}
                            placeholder="Search and adding users..."
                            closeOnSelect={false}
                            selectedValues={bulkUserIds}
                        />
                        <div className="min-h-[60px] p-3 rounded-xl border border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
                            {bulkSelectedUsers.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-2">No users selected.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {bulkSelectedUsers.map(user => (
                                        <div key={user.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 dark:bg-white/10 dark:border-transparent dark:text-white shadow-sm">
                                            <span>{user.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveBulkUser(user.id)}
                                                className="text-gray-400 hover:text-error-500"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-right text-xs text-gray-400">{bulkSelectedUsers.length} users selected</p>
                     </div>
                )}

                {assignmentMode === "bulk_class" && (
                    <div className="grid grid-cols-2 gap-4">
                        <CustomSelect
                            labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                            label="Academic Year"
                            value={bulkClassData.academicYearId}
                            onChange={(val: string | number) => setBulkClassData({ ...bulkClassData, academicYearId: String(val || "") })}
                            options={academicYearOptions}
                            placeholder="Select year..."
                        />
                        <CustomSelect
                            labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                            label="Class"
                            value={bulkClassData.classId}
                            onChange={(val: string | number) => setBulkClassData({ ...bulkClassData, classId: String(val || "") })}
                            options={classOptions}
                            placeholder="Select class..."
                        />
                    </div>
                )}
            </div>
            </SmoothHeight>

            {/* Template Selection */}
            <div className="space-y-2">
                <CustomSelect
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                    label="Select Shift Template"
                    value={formData.shiftTemplateId}
                    onChange={(val: string | number) => setFormData({ ...formData, shiftTemplateId: String(val || "") })}
                    options={templateOptions}
                    placeholder="Choose a template..."
                />
                
                {selectedTemplate && (
                    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                                <TimeIcon className="size-3.5 text-brand-500" />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                    {selectedTemplate.startTime.slice(0, 5)} - {selectedTemplate.endTime.slice(0, 5)}
                                </span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-white/10 text-gray-500 border border-gray-100 dark:border-transparent">
                                {selectedTemplate.name}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {selectedTemplate.workDays.map((d: number) => (
                                <span key={d} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                    {INV_DAY_MAP[d] || d}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <DatePicker
                    label="Effective From"
                    value={formData.effectiveFrom}
                    onChange={(date: string) => setFormData({ ...formData, effectiveFrom: date })}
                    type="date"
                    required
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                />
                <DatePicker
                    label="Effective To (Optional)"
                    value={formData.effectiveTo || ""}
                    onChange={(date: string) => setFormData({ ...formData, effectiveTo: date || null })}
                    type="date"
                    placeholder="Indefinite"
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                />
            </div>


          </form>

        <ConfirmDialog {...confirmState} />
      </div>
    </Modal>
  );
};

export default ShiftAssignmentModal;
