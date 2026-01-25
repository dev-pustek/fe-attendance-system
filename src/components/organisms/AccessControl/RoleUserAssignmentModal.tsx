import React, { useState, useCallback } from "react";
import Modal from "../../molecules/Modal";
import { SearchIcon, TrashBinIcon, MailIcon, GridIcon } from "../../atoms/Icons";
import SearchableAsyncSelect, { SelectOption } from "../../molecules/SearchableAsyncSelect";
import { useUsers } from "../../../api/hooks/useUsers";
import { accessControlService } from "../../../api/services/accessControlService";
import { userService } from "../../../api/services/userService";
import { Role, User } from "../../../api/types/user";
import { showSuccess, showError } from "../../../utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../atoms/Table";

interface RoleUserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
}

const RoleUserAssignmentModal: React.FC<RoleUserAssignmentModalProps> = ({ isOpen, onClose, role }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Get users currently in this role
  const { users: assignedUsers, isLoading: isUsersLoading } = useUsers({
    role: role?.name,
    limit: 100, // Show many
  });

  const searchUsersForSelect = useCallback(async (term: string) => {
    if (!term || !role) return;
    try {
      const result = await userService.getUsers({ search: term, limit: 10 });
      const users = Array.isArray(result) ? result : (result.data || []);
      const options = users.map((u: User) => {
        const isAlreadyAssigned = u.roles?.some(r => r.name === role.name);
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
  }, [role]);

  const handleAssignUser = async (userId: string | number) => {
    if (!role) return;
    setIsAssigning(true);
    try {
      await accessControlService.assignRole(userId, role.name);
      showSuccess("User assigned successfully!");
      // Invalidate both the role's users list and the general users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["access-control", "user-roles", userId] });
    } catch (error) {
      showError(error, "Failed to assign user");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveUser = async (user: User) => {
    if (!role) return;
    try {
      await accessControlService.removeRole(user.public_id, role.name);
      showSuccess("User removed from role successfully!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["access-control", "user-roles", user.public_id] });
    } catch (error) {
      showError(error, "Failed to remove user");
    }
  };

  if (!role) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl"
      title={`Manage Users: ${role.displayName}`}
      description={`View and manage users assigned to the "${role.name}" role.`}
    >
      <div className="space-y-6">
        {/* Assignment Section */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Assign New User</label>
          <SearchableAsyncSelect
            value=""
            options={userOptions}
            onSearch={searchUsersForSelect}
            onChange={(val) => handleAssignUser(String(val))}
            placeholder="Search for a user to assign..."
            isLoading={isAssigning}
          />
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Current Members ({assignedUsers.length})</label>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <SearchIcon className="size-3" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Filter members..."
                        className="bg-gray-50 dark:bg-white/5 border-none rounded-lg py-1 pl-8 pr-3 text-[11px] focus:ring-1 focus:ring-brand-500 w-40"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.01]">
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-[#1E1E1E] z-10 border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">User Information</TableCell>
                    <TableCell isHeader className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                  {isUsersLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                          <span className="text-[11px] font-bold text-gray-400 italic">Finding members...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : assignedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <GridIcon className="size-8 text-gray-200 dark:text-gray-800" />
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">No users currently in this role</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignedUsers
                      .filter((u: User) => 
                        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((user: User) => (
                        <TableRow key={user.public_id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex size-8 items-center justify-center rounded-lg font-bold text-xs overflow-hidden ${!user.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : ''}`}>
                                {user.photo ? (
                                  <img src={user.photo} alt={user.name} className="size-full object-cover" />
                                ) : (
                                  user.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-xs leading-none">{user.name}</p>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                  <MailIcon className="size-2.5 opacity-50" />
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveUser(user)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-red-500/10"
                              title="Remove user from role"
                            >
                              <TrashBinIcon className="size-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5">
            <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gray-50 px-6 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
                Done
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleUserAssignmentModal;
