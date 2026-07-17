import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useUsers, useDeleteUser } from "../../../api/hooks/useUsers";
import { useUserTypes, useUnassignUserType } from "../../../api/hooks/useUserTypes";
import { User, UserType } from "../../../api/types/user";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, MailIcon, ChevronLeftIcon, AngleRightIcon, CloseIcon, DocsIcon, FilterIcon, ChevronDownIcon, SearchIcon } from "../../../components/atoms/Icons";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Badge from "../../../components/atoms/Badge";
import TableToolbar from "../../../components/molecules/TableToolbar";
import TableActionMenu from "../../../components/molecules/TableActionMenu";
import DropdownItem from "../../../components/atoms/DropdownItem";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import UserFormModal from "../../../components/organisms/Users/UserFormModal";

const UserList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTypeCode = searchParams.get("typeCode") || "all";

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>(urlTypeCode);
  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { users, isLoading, meta } = useUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    typeCode: typeFilter === "all" ? undefined : typeFilter
  });

  const { userTypes } = useUserTypes();
  const unassignMutation = useUnassignUserType();
  const deleteMutation = useDeleteUser();

  const total = Number(meta?.total || 0);
  const totalPages = Number(meta?.totalPages || meta?.last_page || Math.ceil(total / limit));

  // Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(users.map((u: User) => u.public_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Action Handlers
  const handleBulkPrint = () => {
    if (selectedIds.length === 0) return;
    navigate(`/users/print-ids?ids=${selectedIds.join(",")}`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = await confirm({
      variant: "delete",
      title: "Bulk Remove Users",
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected users? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.length} Users`
    });

    if (confirmed) {
      try {
        const promises = selectedIds.map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Successfully removed ${selectedIds.length} users.`);
        setSelectedIds([]);
      } catch (error) {
        showError(error, "Failed to remove some users");
      }
    }
  };

  const handleGenerateId = (user: User) => {
    navigate(`/users/print-ids?ids=${user.public_id}`);
  };


  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Remove User",
      message: `Are you sure you want to permanently delete user "${user.name}"? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(user.public_id);
        showSuccess("User removed from system.");
      } catch (error) {
        showError(error, "Failed to remove user");
      }
    }
  };

  const handleUnassign = async (user: User) => {
    if (typeFilter === "all") return;
    
    const activeType = userTypes.find((t: UserType) => t.code === typeFilter);
    const confirmed = await confirm({
      variant: "delete",
      title: "Remove Category",
      message: `Are you sure you want to remove "${activeType?.name || typeFilter}" from "${user.name}"?`,
    });

    if (confirmed) {
      try {
        await unassignMutation.mutateAsync({
          userId: user.public_id,
          typeCode: typeFilter
        });
        showSuccess("User unassigned successfully!");
      } catch (error) {
        showError(error, "Failed to unassign user");
      }
    }
  };

  return (
    <>
      <PageMeta title="User List | SIAPUS" description="Manage system users." />
      <PageBreadcrumb pageTitle="User List" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">System Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all registered users.</p>
          </div>
          <div className="flex gap-2">
            <button
                onClick={() => { setSelectedUser(null); setIsFormModalOpen(true); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
                <PlusIcon className="size-5" />
                Add New User
            </button>
          </div>
        </div>

        {/* ── Advanced Filter Card ── */}
        <div className="mb-4 rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <FilterIcon className="size-5 text-brand-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                            Search & Filter Users
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Use the criteria below to filter user data based on type and status.
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
                        
                        <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                            <div className="md:col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Name / Email / ID</label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                        placeholder="Find by name, email, or ID..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</label>
                                <CustomSelect
                                    value={statusFilter}
                                    onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                                    options={[
                                        { label: "All Statuses", value: "all" },
                                        { label: "Active Only", value: "active" },
                                        { label: "Inactive Only", value: "inactive" },
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="md:col-span-1 space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">User Types</label>
                                <CustomSelect
                                    value={typeFilter}
                                    onChange={(val) => { setTypeFilter(String(val)); setPage(1); }}
                                    options={[
                                        { label: "All Types", value: "all" },
                                        ...userTypes.map((t: UserType) => ({ label: t.name, value: t.code }))
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <TableToolbar
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            bulkActions={[
                { label: "Print IDs", icon: <DocsIcon className="size-3.5" />, onClick: handleBulkPrint, variant: "default" },
                { label: "Delete Selected", icon: <TrashBinIcon className="size-3.5" />, onClick: handleBulkDelete, variant: "danger" }
            ]}
        />

        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-10 px-5 py-4">
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={users.length > 0 && selectedIds.length === users.length}
                            onChange={handleSelectAll}
                        />
                    </div>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Information</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact & ID</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm font-bold text-gray-400 italic">Syncing user directory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                     <p className="text-sm font-medium text-gray-400">No users found matching your search.</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: User) => (
                  <TableRow key={user.public_id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                checked={selectedIds.includes(user.public_id)}
                                onChange={() => handleSelectRow(user.public_id)}
                            />
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex size-11 items-center justify-center rounded-2xl font-bold text-lg overflow-hidden ${!user.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : ''}`}>
                          {user.photo ? (
                            <img src={user.photo} alt={user.name} className="size-full object-cover" />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base leading-none">{user.name}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {(user.userTypes?.map((typeCode, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tighter dark:bg-white/[0.08]">
                                {typeCode}
                              </span>
                            ))) || (user.typeAssignments?.map((ta, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tighter dark:bg-white/[0.08]">
                                {ta.userType?.name}
                              </span>
                            )))}
                            {user.roles?.map((role, i) => (
                              <span key={`role-${i}`} className="px-2 py-0.5 rounded-md bg-brand-50 text-[10px] font-bold text-brand-600 border border-brand-100 uppercase tracking-tighter dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20">
                                {role.displayName || role.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                       <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                             <MailIcon className="size-3.5 opacity-50" />
                             {user.email}
                          </div>
                          <div className="flex items-center">
                             <span className="px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-white/[0.05] border border-gray-100 dark:border-white/[0.08] text-[10px] font-mono text-gray-400 tracking-tighter">ID: {user.public_id}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge color={user.isActive ? "success" : "light"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                       <TableActionMenu>
                           <DropdownItem
                               onClick={() => handleEdit(user)}
                               className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                           >
                               <PencilIcon className="size-4" /> Edit
                           </DropdownItem>
                           {typeFilter !== "all" && (
                               <DropdownItem
                                   onClick={() => handleUnassign(user)}
                                   className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                               >
                                   <CloseIcon className="size-4" /> Unassign {typeFilter}
                               </DropdownItem>
                           )}
                           <DropdownItem
                               onClick={() => handleGenerateId(user)}
                               className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                           >
                               <DocsIcon className="size-4" /> Generate ID Card
                           </DropdownItem>
                           <DropdownItem
                               onClick={() => handleDelete(user)}
                               className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                           >
                               <TrashBinIcon className="size-4" /> Delete
                           </DropdownItem>
                       </TableActionMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!isLoading && total > 0 && (
            <div className="flex flex-col gap-4 px-6 py-4 border-t border-gray-100 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                <span className="font-medium text-gray-700 dark:text-white">{total}</span> members
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
                <div className="flex items-center gap-1.5 px-2">
                   <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                   <span className="text-sm text-gray-400">/</span>
                   <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
      </div>

      <UserFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        user={selectedUser}
        onSuccess={() => {
          // React query will automatically invalidate because of onSuccess in mutations
        }}
      />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default UserList;
