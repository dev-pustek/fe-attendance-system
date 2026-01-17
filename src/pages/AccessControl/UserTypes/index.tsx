import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useUserTypes, useCreateUserType, useUpdateUserType, useDeleteUserType, useBulkAssignUserType, useAssignUserTypeByClass } from "../../../api/hooks/useUserTypes";
import { useClasses } from "../../../api/hooks/useAcademic";
import { UserType, User } from "../../../api/types/user";
import { Class } from "../../../api/types/academic";
import { SelectOption } from "../../../components/molecules/SearchableAsyncSelect";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import Modal from "../../../components/molecules/Modal";
import { PencilIcon, TrashBinIcon, PlusIcon, GroupIcon, UserIcon, DocsIcon, BoxIcon, SearchIcon, EyeIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { SmoothHeight } from "../../../components/atoms/SmoothHeight";
import { userService } from "../../../api/services/userService";

const UserTypes: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { userTypes, isLoading: isTypesLoading } = useUserTypes({ withMetrics: true });
  const createMutation = useCreateUserType();
  const updateMutation = useUpdateUserType();
  const deleteMutation = useDeleteUserType();
  const bulkAssignMutation = useBulkAssignUserType();
  const classAssignMutation = useAssignUserTypeByClass();

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    isActive: true,
  });

  // Assignment state
  const [assignMode, setAssignMode] = useState<"individual" | "multiple" | "class">("individual");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<{id: string, name: string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | number>("");
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);

  // View Members State (Removed in favor of redirection)
  // const [viewMembersType, setViewMembersType] = useState<UserType | null>(null);
  
  const navigate = useNavigate(); // Ensure useNavigate is imported or available
  const { data: classesResponse } = useClasses();
  const classes = useMemo(() => {
     return Array.isArray(classesResponse) ? classesResponse : (classesResponse?.data || []);
  }, [classesResponse]);

  const filteredTypes = useMemo(() => {
    let result = [...userTypes];
    if (debouncedSearch) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          t.code.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    return result;
  }, [userTypes, debouncedSearch]);

  const handleOpenFormModal = (type?: UserType) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        code: type.code,
        name: type.name,
        isActive: type.isActive,
      });
    } else {
      setSelectedType(null);
      setFormData({
        code: "",
        name: "",
        isActive: true,
      });
    }
    setIsFormModalOpen(true);
  };

  const handleOpenAssignModal = (type: UserType) => {
    setSelectedType(type);
    setAssignMode("individual");
    setSelectedUserIds([]);
    setBulkSelectedUsers([]);
    setSelectedClassId("");
    setUserOptions([]);
    setIsAssignModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedType) {
        await updateMutation.mutateAsync({ id: selectedType.id, data: formData });
        showSuccess(`User type updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`User type created successfully!`);
      }
      setIsFormModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save user type");
    }
  };

  const handleDelete = async (type: UserType) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete User Type",
      message: `Are you sure you want to delete "${type.name}"? This will not delete users, but will remove this category from them.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(type.id);
        showSuccess("User type deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete user type");
      }
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedType) return;

    try {
      if (assignMode === "individual" || assignMode === "multiple") {
        if (selectedUserIds.length === 0) {
            showError("Please select at least one user.");
            return;
        }
        await bulkAssignMutation.mutateAsync({
          userIds: selectedUserIds,
          typeCode: selectedType.code,
        });
      } else { // assignMode === "class"
        if (!selectedClassId) {
            showError("Please select a class.");
            return;
        }
        await classAssignMutation.mutateAsync({
          classId: selectedClassId,
          typeCode: selectedType.code,
          isPrimary: false, // Assuming default to false for class assignments
        });
      }
      showSuccess(`Assignment to ${selectedType.name} successful!`);
      setIsAssignModalOpen(false);
    } catch (error) {
      showError(error, "Failed to assign users");
    }
  };

  const handleToggleBulkUser = (userId: string, label: string) => {
    if (selectedUserIds.includes(userId)) {
        setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
        setBulkSelectedUsers(bulkSelectedUsers.filter(u => u.id !== userId));
    } else {
        setSelectedUserIds([...selectedUserIds, userId]);
        setBulkSelectedUsers([...bulkSelectedUsers, { id: userId, name: label }]);
    }
  };

  const handleRemoveBulkUser = (userId: string) => {
    setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    setBulkSelectedUsers(bulkSelectedUsers.filter(u => u.id !== userId));
  };

  const searchUsersForSelect = async (term: string) => {
    if (!term) return;
    try {
        const result = await userService.getUsers({ search: term, limit: 20 });
        const users = Array.isArray(result) ? result : (result.data || []);
        const options = users.map((u: User) => {
            const isAlreadyAssigned = u.userTypes?.some(code => code === selectedType?.code);
            return {
                label: u.name,
                value: u.public_id,
                subLabel: u.email,
                isDisabled: isAlreadyAssigned
            };
        });
        setUserOptions(options);
    } catch (e) {
        console.error(e);
        setUserOptions([]);
    }
  };
 

  return (
    <>
      <PageMeta title="User Types | Sistem Absen" description="Manage user categories and assignments." />
      <PageBreadcrumb pageTitle="User Types" />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">User Categories</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Define and manage different types of users in your organization.</p>
          </div>
          <button
            onClick={() => handleOpenFormModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600"
          >
            <PlusIcon className="size-5" />
            Create New Type
          </button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 max-w-md space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Categories</label>
                    <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                            <SearchIcon className="size-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Find by name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-gray-100 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Cards Grid */}
        {isTypesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <div key={i} className="h-64 rounded-2xl bg-gray-50 dark:bg-white/[0.02] animate-pulse"></div>
                ))}
            </div>
        ) : filteredTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="size-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-6">
                    <DocsIcon className="size-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No categories found</h3>
                <p className="text-gray-500 max-w-xs mt-2">Start by creating your first user category like "Student" or "Staff".</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTypes.map((type) => (
                    <div key={type.id} className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-none transition-all hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 overflow-hidden">
                        <div className="p-5 flex flex-col gap-5">
                            {/* Top Header: Code & Status Badge */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{type.code}</span>
                                    <Badge color={type.isActive ? "success" : "light"} className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                        {type.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                    {type.name}
                                </h3>
                            </div>

                            {/* Metrics & Member Stack */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-tight">
                                        {type.metrics?.usersCount || 0} Members
                                    </span>
                                </div>

                                <div className="flex items-center -space-x-1.5 overflow-hidden">
                                    {(type.metrics?.previewUsers || []).slice(0, 4).map((user: User, idx: number) => (
                                        <div 
                                            key={user.public_id} 
                                            className="size-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gray-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden"
                                            style={{ zIndex: 10 - idx }}
                                        >
                                            {user.photo ? (
                                                <img src={user.photo} alt={user.name} className="size-full object-cover" />
                                            ) : (
                                                <UserIcon className="size-3 text-gray-400" />
                                            )}
                                        </div>
                                    ))}
                                    {type.metrics?.usersCount && type.metrics.usersCount > 4 && (
                                        <div className="size-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-gray-500">
                                            +{type.metrics.usersCount - 4}
                                        </div>
                                    )}
                                    {(!type.metrics?.previewUsers || type.metrics.previewUsers.length === 0) && (
                                        <div className="size-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
                                            <UserIcon className="size-3 text-gray-400" />
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => handleOpenAssignModal(type)}
                                        className="size-6 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 ring-2 ring-white dark:ring-zinc-800 ml-1.5 flex items-center justify-center transition-all border border-brand-100 dark:border-brand-500/20"
                                        title="Assign Users"
                                    >
                                        <PlusIcon className="size-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <Switch 
                                    checked={type.isActive} 
                                    onChange={async (checked) => {
                                        try {
                                            await updateMutation.mutateAsync({ id: type.id, data: { isActive: checked }});
                                            showSuccess(`${type.name} is now ${checked ? 'active' : 'inactive'}`);
                                        } catch(e) { showError(e); }
                                    }}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate(`/users/list?typeCode=${type.code}`)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                    title="View Members"
                                >
                                    <EyeIcon className="size-3.5" /> View
                                </button>
                                <button
                                    onClick={() => handleOpenFormModal(type)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                    title="Edit Details"
                                >
                                    <PencilIcon className="size-3.5" /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(type)}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                    title="Delete Category"
                                >
                                    <TrashBinIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Create/Edit Modal */}
        <Modal 
            isOpen={isFormModalOpen} 
            onClose={() => setIsFormModalOpen(false)} 
            className="max-w-md"
            title={selectedType ? 'Update Category' : 'New Category'}
            description="Configure your system-wide user classification."
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setIsFormModalOpen(false)}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="user-type-form"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 disabled:opacity-50"
                    >
                        {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedType ? 'Update Category' : 'Create Category'}
                    </button>
                </div>
            }
        >
            <form id="user-type-form" onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Category Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        placeholder="e.g. Student, Lecturer"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Category Code</label>
                    <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        placeholder="e.g. STU, LEC"
                    />
                </div>
            </form>
        </Modal>

        {/* Assignment Modal */}
        <Modal 
            isOpen={isAssignModalOpen} 
            onClose={() => setIsAssignModalOpen(false)} 
            className="max-w-xl"
            title={`Assign ${selectedType?.name}`}
            description="Link users or classes to this classification."
            subHeader={
                <div className="relative flex border-b border-gray-100 dark:border-white/[0.05]">
                    <button
                        type="button"
                        onClick={() => { setAssignMode("individual"); setSelectedUserIds([]); setBulkSelectedUsers([]); }}
                        className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
                            assignMode === "individual" 
                            ? "text-brand-600 dark:text-brand-400" 
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                    >
                        <UserIcon className="size-4" />
                        Individual
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAssignMode("multiple"); setSelectedUserIds([]); setBulkSelectedUsers([]); }}
                        className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
                            assignMode === "multiple" 
                            ? "text-brand-600 dark:text-brand-400" 
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                    >
                        <GroupIcon className="size-4" />
                        Bulk Users
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAssignMode("class"); setSelectedClassId(""); }}
                        className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
                            assignMode === "class" 
                            ? "text-brand-600 dark:text-brand-400" 
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                    >
                        <BoxIcon className="size-4" />
                        By Class
                    </button>
                    
                    <div 
                        className="absolute -bottom-px h-0.5 bg-brand-500 transition-all duration-300 ease-in-out"
                        style={{
                            width: '33.33%',
                            left: assignMode === "individual" ? '0%' : assignMode === "multiple" ? '33.33%' : '66.66%'
                        }}
                    />
                </div>
            }
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setIsAssignModalOpen(false)}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssignSubmit}
                        disabled={bulkAssignMutation.isPending || (assignMode !== "class" && selectedUserIds.length === 0) || (assignMode === "class" && !selectedClassId)}
                        className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600"
                    >
                        {bulkAssignMutation.isPending ? "Assigning..." : "Apply Changes"}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                <SmoothHeight>
                    <div className="space-y-4">
                        {assignMode === "individual" && (
                            <div className="space-y-1.5">
                                <SearchableAsyncSelect
                                    label="Select User"
                                    value={selectedUserIds[0] || ""}
                                    options={userOptions}
                                    onChange={(val: string | number) => setSelectedUserIds([String(val)])}
                                    onSearch={searchUsersForSelect}
                                    placeholder="Search for a user..."
                                    labelClassName="text-[11px] font-medium uppercase text-gray-500 tracking-wider"
                                />
                            </div>
                        )}

                        {assignMode === "multiple" && (
                            <div className="space-y-3">
                                <SearchableAsyncSelect
                                    label="Add Users to List"
                                    value={""}
                                    options={userOptions}
                                    onChange={(val: string | number, label: string) => handleToggleBulkUser(String(val), label)}
                                    onSearch={searchUsersForSelect}
                                    placeholder="Search and adding users..."
                                    closeOnSelect={false}
                                    selectedValues={selectedUserIds}
                                    labelClassName="text-[11px] font-medium uppercase text-gray-500 tracking-wider"
                                />
                                <div className="min-h-[100px] p-3 rounded-xl border border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                    {bulkSelectedUsers.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-6">No users selected. Search above to add.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {bulkSelectedUsers.map(user => (
                                                <div key={user.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:border-transparent dark:text-white">
                                                    <span>{user.name}</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveBulkUser(user.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-tight">{selectedUserIds.length} users in queue</p>
                            </div>
                        )}

                        {assignMode === "class" && (
                            <div className="space-y-4">
                                <CustomSelect
                                    label="Target Class"
                                    value={selectedClassId}
                                    onChange={(val) => { setSelectedClassId(val); }}
                                    options={classes.map((cls: Class) => ({ label: `${cls.name} (${cls.code})`, value: cls.id }))}
                                    placeholder="Choose a class to assign members..."
                                    labelClassName="text-[11px] font-medium uppercase text-gray-500 tracking-wider"
                                />
                                
                                {selectedClassId && (
                                    <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 dark:bg-brand-500/5 dark:border-brand-500/10">
                                        <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                                            <GroupIcon className="size-4" />
                                            <p className="text-xs font-bold uppercase tracking-tight">
                                                Assigning Category to Class Members
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-brand-600/70 mt-1">
                                            All current members of this class will be assigned the <span className="font-bold underline">{selectedType?.name}</span> categorization.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SmoothHeight>
            </div>
        </Modal>

        {/* View Members Modal Removed */}

        <ConfirmDialog {...confirmState} />
      </div>
    </>
  );
};

export default UserTypes;
