import React, { useState } from "react";
import { useAccessControl, useBulkAssignRole } from "../../../api/hooks/useAccessControl";
import { Role, User } from "../../../api/types/user";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import Modal from "../../../components/molecules/Modal";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, LockIcon, UserIcon, GroupIcon } from "../../../components/atoms/Icons";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { CreateRoleDto, UpdateRoleDto } from "../../../api/services/accessControlService";
import SearchableAsyncSelect, { SelectOption } from "../../../components/molecules/SearchableAsyncSelect";
import { SmoothHeight } from "../../../components/atoms/SmoothHeight";
import { userService } from "../../../api/services/userService";
interface Meta {
  itemCount?: number;
  total?: number;
  pageCount?: number;
  totalPages?: number;
}

const Roles: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { roles, meta, isLoading, createRoleMutation, updateRoleMutation, deleteRoleMutation } = useAccessControl({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  
  const bulkAssignMutation = useBulkAssignRole();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Role; direction: "asc" | "desc" } | null>(null);
  
  // Assignment state
  const [assignMode, setAssignMode] = useState<"individual" | "multiple">("individual");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<{id: string, name: string}[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState<Partial<Role>>({
    name: "",
    displayName: "",
  });

  const handleSort = (key: keyof Role) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedRoles = React.useMemo(() => {
    if (!sortConfig) return roles;
    return [...roles].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [roles, sortConfig]);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        displayName: role.displayName,
        name: role.name,
      });
    } else {
      setSelectedRole(null);
      setFormData({
        displayName: "",
        name: "",
      });
    }
    setIsModalOpen(true);
  };

  const total = Number((meta as Meta)?.itemCount ?? (meta as Meta)?.total ?? 0);
  const totalPages = Number((meta as Meta)?.pageCount ?? (meta as Meta)?.totalPages ?? 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedRole ? "update" : "create",
      title: selectedRole ? "Update Role" : "Create Role",
      message: `Are you sure you want to ${selectedRole ? "update" : "create"} the role "${formData.displayName}"?`,
    });

    if (!confirmed) return;

    try {
      if (selectedRole) {
        await updateRoleMutation.mutateAsync({ id: selectedRole.id, data: formData as UpdateRoleDto });
        showSuccess(`Role "${formData.displayName}" updated successfully!`);
      } else {
        await createRoleMutation.mutateAsync(formData as CreateRoleDto);
        showSuccess(`Role "${formData.displayName}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save role");
    }
  };

  const handleDelete = async (id: string | number) => {
    const role = roles.find((r: Role) => r.id === id);
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Role",
      message: `Are you sure you want to delete the role "${role?.displayName || id}"? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteRoleMutation.mutateAsync(id);
        showSuccess("Role deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete role");
      }
    }
  };

  const handleOpenAssignModal = (role: Role) => {
    setSelectedRole(role);
    setAssignMode("individual");
    setSelectedUserIds([]);
    setBulkSelectedUsers([]);
    setUserOptions([]);
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedRole) return;
    if (selectedUserIds.length === 0) {
      showError("Please select at least one user.");
      return;
    }

    try {
      await bulkAssignMutation.mutateAsync({
        userIds: selectedUserIds,
        roleName: selectedRole.name,
      });
      showSuccess(`Users assigned to ${selectedRole.displayName} successfully!`);
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

  const searchUsersForSelect = React.useCallback(async (term: string) => {
    if (!term) return;
    try {
        const result = await userService.getUsers({ search: term, limit: 20 });
        const users = Array.isArray(result) ? result : (result.data || []);
        const options = users.map((u: User) => ({
                label: u.name,
                value: u.public_id,
                subLabel: u.email,
                // Check if user already has this role if possible, but roles in User are objects
                isDisabled: u.roles?.some(r => r.name === selectedRole?.name)
        }));
        setUserOptions(options);
    } catch (e) {
        console.error(e);
        setUserOptions([]);
    }
  }, [selectedRole]);

  return (
    <>
      <PageMeta title="User Roles | Access Control" description="Manage system permissions and access levels." />
      <PageBreadcrumb pageTitle="Roles" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Roles</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage system-wide permissions and role associations.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600"
          >
            <PlusIcon className="size-4" />
            Add Role
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Roles</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or key..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                label="Sort By"
                value={sortConfig?.key || "id"}
                onChange={(val) => handleSort(val as keyof Role)}
                options={[
                  { label: "ID", value: "id" },
                  { label: "Display Name", value: "displayName" },
                  { label: "System Name", value: "name" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Grid View */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-full bg-gray-100 dark:bg-white/5"></div>
                  <div className="h-4 w-24 bg-gray-100 dark:bg-white/5 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded"></div>
                  <div className="h-3 w-2/3 bg-gray-100 dark:bg-white/5 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedRoles.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="flex flex-col items-center gap-2">
              <div className="size-12 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-2">
                <LockIcon className="size-6 text-gray-400 opacity-20" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No roles found matching your search.</p>
              <button 
                onClick={() => handleOpenModal()} 
                className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline mt-2 font-medium"
              >
                <PlusIcon className="size-4" />
                Add your first role
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedRoles.map((role: Role) => (
              <div 
                key={role.id} 
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white transition-all hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 overflow-hidden"
              >
                <div className="p-5 flex flex-col gap-5">
                   <div className="flex items-start justify-between gap-4">
                      <div className="">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight mb-2">
                          {role.displayName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">System Key:</span>
                          <code className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5 uppercase tracking-tight">
                              {role.name}
                          </code>
                        </div>
                      </div>
                      <div className={`size-8 rounded-lg flex items-center justify-center border group-hover:scale-110 transition-transform duration-300 ${
                          (() => {
                              const colors = [
                                  'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
                                  'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
                                  'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
                                  'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
                                  'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20',
                                  'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20'
                              ];
                              const index = (typeof role.id === 'number' ? role.id : role.displayName.length) % colors.length;
                              return colors[index];
                          })()
                      }`}>
                          <LockIcon className="size-4" />
                      </div>
                   </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={() => handleOpenAssignModal(role)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-brand-600 bg-brand-50/50 hover:bg-brand-50 rounded-lg border border-brand-100 transition-all dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 dark:hover:bg-brand-500/20"
                        title="Assign Users"
                    >
                        <PlusIcon className="size-3.5" /> Assign Users
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(role)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        title="Edit Role"
                      >
                        <PencilIcon className="size-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                        title="Delete Role"
                      >
                        <TrashBinIcon className="size-3.5" />
                      </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )    }

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> roles
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
          isOpen={isAssignModalOpen} 
          onClose={() => setIsAssignModalOpen(false)} 
          className="max-w-xl"
          title={`Assign ${selectedRole?.displayName}`}
          description="Link users to this role classification."
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
                  
                  <div 
                      className="absolute -bottom-px h-0.5 bg-brand-500 transition-all duration-300 ease-in-out"
                      style={{
                          width: '50%',
                          left: assignMode === "individual" ? '0%' : '50%'
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
                      disabled={bulkAssignMutation.isPending || (selectedUserIds.length === 0)}
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
                  </div>
              </SmoothHeight>
          </div>
      </Modal>

      <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          className="max-w-md"
          title={selectedRole ? "Update Role" : "New Role"}
          description={selectedRole ? "Modify existing system role settings." : "Define a new access level for system users."}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
            type="submit"
            form="role-form"
            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600"
          >
            {selectedRole ? "Update Role" : "Save Role"}
          </button>
            </div>
          }
      >
          <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-gray-500 tracking-wider">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g. Principal"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-gray-500 tracking-wider">System Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. principal"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Roles;
