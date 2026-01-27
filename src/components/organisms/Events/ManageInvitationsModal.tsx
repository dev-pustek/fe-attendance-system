import React, { useState, useEffect } from "react";
import Modal from "../../molecules/Modal";
import SearchableAsyncSelect from "../../molecules/SearchableAsyncSelect";
import CustomSelect from "../../molecules/CustomSelect";
import { UserIcon, GroupIcon, CloseIcon, BoxIcon } from "../../atoms/Icons";
import { SmoothHeight } from "../../atoms/SmoothHeight";
import { Event } from "../../../api/types/events";
import { useEventMutation } from "../../../api/hooks/useEvents";
import { useAcademicYears, useClasses } from "../../../api/hooks/useAcademic";
import { eventService } from "../../../api/services/eventService";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../molecules/ConfirmDialog";

interface ManageInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

const ManageInvitationsModal: React.FC<ManageInvitationsModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { bulkInviteMutation, inviteClassMutation } = useEventMutation();
  const { confirm, confirmState } = useConfirm();

  const [inviteMode, setInviteMode] = useState<"bulk" | "class">("bulk");

  // Bulk State
  const [userIds, setUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userOptions, setUserOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  // Class State
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");

  const { data: academicYearsRes } = useAcademicYears({ limit: 100 });
  const { data: classesRes } = useClasses({ limit: 100 });

  const academicYearOptions = (academicYearsRes?.data || []).map((y) => ({ label: y.name, value: String(y.id) }));
  const classOptions = (classesRes?.data || []).map((c) => ({ label: c.name, value: String(c.id) }));

  const fetchExistingInvitations = React.useCallback(async () => {
    if (isOpen && event?.public_id) {
      setInviteMode("bulk");
      setAcademicYearId("");
      setClassId("");
      
      try {
        const res = await eventService.getInvitations(event.public_id, { limit: 100 });
        const existingInvites = res.data || [];
        const ids = existingInvites.map(i => i.userId);
        setUserIds(ids);
        setSelectedUsers(existingInvites.map(invite => ({
          id: invite.userId,
          name: invite.user?.name || `User #${invite.userId.slice(0, 8)}...`
        })));
      } catch (error) {
        console.error("Failed to fetch existing invitations", error);
      }
    }
  }, [isOpen, event?.public_id]);

  useEffect(() => {
    if (isOpen && event?.public_id) {
      fetchExistingInvitations();
    } else if (!isOpen) {
      setUserIds([]);
      setSelectedUsers([]);
      setAcademicYearId("");
      setClassId("");
    }
  }, [isOpen, event?.public_id, fetchExistingInvitations]);

  const searchUsers = React.useCallback(async (term: string) => {
    if (!event) return;
    
    setIsSearching(true);
    try {
      const users = await eventService.getAvailableUsers({
        startDate: event.startTime,
        endDate: event.endTime,
        search: term,
        limit: 10,
      });
      setUserOptions(
        users.map((u) => ({
          label: u.name,
          value: u.public_id,
          subLabel: u.email,
        }))
      );
    } finally {
      setIsSearching(false);
    }
  }, [event]);

  const handleAddUser = (userId: string, label: string) => {
    if (!userIds.includes(userId)) {
      setUserIds([...userIds, userId]);
      setSelectedUsers([...selectedUsers, { id: userId, name: label }]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setUserIds(userIds.filter((id) => id !== userId));
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (inviteMode === "bulk" && userIds.length === 0) {
      showError("Please select at least one user");
      return;
    }

    if (inviteMode === "class" && (!academicYearId || !classId)) {
      showError("Please select academic year and class");
      return;
    }

    if (event.isCancelled || new Date(event.endTime) < new Date()) {
       showError("Cannot send invitations for a cancelled or past event.");
       return;
    }

    const confirmed = await confirm({
      title: "Confirm Invitations",
      message: `Are you sure you want to send invitations to ${
        inviteMode === "bulk" ? `${userIds.length} users` : "the selected class"
      }?`,
      variant: "create",
    });

    if (confirmed) {
      try {
        if (inviteMode === "bulk") {
          await bulkInviteMutation.mutateAsync({ eventId: event.public_id, data: { userIds } });
        } else {
          await inviteClassMutation.mutateAsync({ eventId: event.public_id, data: { classId, academicYearId } });
        }
        showSuccess("Invitations sent successfully!");
        onClose();
      } catch (error) {
        showError(error, "Failed to send invitations");
      }
    }
  };

  return (
    <Modal 
       isOpen={isOpen} 
       onClose={onClose} 
       className="max-w-lg"
       title="Manage Invitations"
       description="Invite users or entire classes to participate in this event."
       subHeader={
         <div className="relative flex border-b border-gray-100 dark:border-white/[0.05]">
            <button
              onClick={() => setInviteMode("bulk")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                inviteMode === "bulk"
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <UserIcon className={`size-4 ${inviteMode === "bulk" ? "fill-current" : ""}`} />
              Bulk Users
            </button>
            <button
              onClick={() => setInviteMode("class")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                inviteMode === "class"
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <BoxIcon className={`size-4 ${inviteMode === "class" ? "fill-current" : ""}`} />
              By Class
            </button>

            {/* Smooth Sliding Underline */}
            <div 
                className="absolute -bottom-px h-0.5 bg-brand-500 transition-all duration-300 ease-in-out"
                style={{
                    width: '50%',
                    left: inviteMode === "bulk" ? '0%' : '50%'
                }}
            />
          </div>
       }
       footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit} // Trigger form submit externally if needed or use form wrapping logic
              disabled={bulkInviteMutation.isPending || inviteClassMutation.isPending}
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {bulkInviteMutation.isPending || inviteClassMutation.isPending ? (
                <div className="flex items-center gap-2">
                   <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   Sending...
                </div>
              ) : "Send Invitations"}
            </button>
          </div>
       }
    >
      <div className="py-2">
        <SmoothHeight>
        <form id="invite-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="px-1">
             <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-500/10 dark:bg-brand-500/5 transition-all">
                <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1">Target Event</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{event?.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{event?.location} • {event?.startTime ? new Date(event?.startTime).toLocaleString() : "N/A"}</p>
             </div>

          {inviteMode === "bulk" ? (
            <div className="space-y-4">
              <SearchableAsyncSelect
                label="Search Users"
                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                placeholder="Type name or email..."
                value=""
                onChange={(val, label) => handleAddUser(String(val), label)}
                onSearch={searchUsers}
                options={userOptions}
                isLoading={isSearching}
                closeOnSelect={false}
                selectedValues={userIds}
              />
              
              <div className="min-h-[100px] max-h-[200px] overflow-y-auto p-3 rounded-xl border border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
                {selectedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                    <UserIcon className="size-8 opacity-10 mb-2" />
                    <p className="text-xs">No users selected</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 dark:bg-white/10 dark:border-transparent dark:text-white shadow-sm"
                      >
                        <span>{user.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-gray-400 hover:text-error-500 transition-colors"
                        >
                          <CloseIcon className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-right text-xs text-gray-400">{selectedUsers.length} users selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <CustomSelect
                  label="Academic Year"
                  labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                  placeholder="Select year..."
                  value={academicYearId}
                  onChange={(val) => setAcademicYearId(String(val))}
                  options={academicYearOptions}
                />
                <CustomSelect
                  label="Class"
                  labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                  placeholder="Select class..."
                  value={classId}
                  onChange={(val) => setClassId(String(val))}
                  options={classOptions}
                />
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/10 dark:bg-blue-500/5">
                 <div className="flex gap-3">
                    <GroupIcon className="size-5 text-blue-500 shrink-0" />
                    <div>
                       <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Class Invitation</p>
                       <p className="text-[11px] text-blue-700/70 dark:text-blue-300/50 mt-0.5">
                          All students currently enrolled in the selected class will receive an invitation to this event.
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          )}
          </div>
        </form>
        </SmoothHeight>
        <ConfirmDialog {...confirmState} />
      </div>
    </Modal>
  );
};

export default ManageInvitationsModal;
