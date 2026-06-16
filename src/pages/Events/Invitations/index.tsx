import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useEventInvitations, useEvent, useEventMutation } from "../../../api/hooks/useEvents";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Badge from "../../../components/atoms/Badge";
import { 
  ChevronLeftIcon, 
  UserCircleIcon, 
  TimeIcon, 
  ChatIcon, 
  AngleRightIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  PlusIcon,
  TrashBinIcon
} from "../../../components/atoms/Icons";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { showSuccess, showError } from "../../../utils/toast";
import { EventInvitation } from "../../../api/types/events";
import ManageInvitationsModal from "../../../components/organisms/Events/ManageInvitationsModal";

const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M17 17H19C20.1046 17 21 16.1046 21 15V11C21 9.89543 20.1046 9 19 9H5C3.89543 9 3 9.89543 3 11V15C3 16.1046 3.89543 17 5 17H7M17 17V21H7V17M17 17H7M17 9V5C17 3.89543 16.1046 3 15 3H9C7.89543 3 7 3.89543 7 5V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 13H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EventInvitations: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const { confirm, confirmState } = useConfirm();
  const { data: event } = useEvent(id || "");
  const { data: response, isLoading, refetch } = useEventInvitations(id || "", {
    page,
    limit,
  });

  const { deleteInvitationMutation } = useEventMutation();

  const toggleScannerMutation = useMutation({
    mutationFn: async ({ eventId, invitationId, isScanner }: { eventId: string, invitationId: string, isScanner: boolean }) => {
      await eventService.setScannerAccess(eventId, invitationId, isScanner);
    },
    onSuccess: () => {
      refetch();
      showSuccess("Scanner access updated successfully");
    },
    onError: (error: any) => {
      showError(error, "Failed to update scanner access");
    }
  });

  const invitations = React.useMemo(() => response?.data || [], [response?.data]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof EventInvitation; direction: "asc" | "desc" } | null>(null);

  const handleSort = (key: keyof EventInvitation) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedInvitations = React.useMemo(() => {
    if (!sortConfig) return invitations;
    return [...invitations].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [invitations, sortConfig]);

  const SortIcon = ({ column }: { column: keyof EventInvitation }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge color="success" size="sm">Accepted</Badge>;
      case "declined":
        return <Badge color="error" size="sm">Declined</Badge>;
      case "tentative":
        return <Badge color="warning" size="sm">Tentative</Badge>;
      default:
        return <Badge color="light" size="sm">Invited</Badge>;
    }
  };

  return (
    <>
      <PageMeta title={`Invitations - ${event?.name || "Event"}`} description="View response status for event invitations." />
      <PageBreadcrumb pageTitle="Event Invitations" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/events")}
              className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03]"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                 {event?.name || "Loading event..."}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage and track invitations for this event.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />

            Manage Invitations
          </button>
        </div>

        {/* Info Card */}
        {event && (
           <div className="bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-200 dark:border-white/[0.08] flex flex-wrap gap-8 items-center">
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Type</p>
                 <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">{event.eventType}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                 <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{event.location}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
                 <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{event.startTime ? new Date(event.startTime).toLocaleString() : "N/A"}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                 <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacity</p>
                    <p className="text-lg font-bold text-brand-500">{invitations.length} / {event.capacity}</p>
                 </div>
              </div>
           </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("userId")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    User <SortIcon column="userId" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-center">
                   <button onClick={() => handleSort("status")} className="flex items-center justify-center gap-2 w-full text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Status <SortIcon column="status" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                   <button onClick={() => handleSort("invitedAt")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Timeline <SortIcon column="invitedAt" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Response Notes</TableCell>
                <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Panitia</TableCell>
                <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading invitations...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <UserCircleIcon className="size-10 opacity-20 mb-2" />
                      <p className="text-sm font-medium">No invitations found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedInvitations.map((invite) => (
                  <TableRow key={invite.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400">
                           <UserCircleIcon className="size-5" />
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-gray-900 dark:text-white">{invite.user?.name || `User #${invite.userId}`}</span>
                           {invite.user?.email && (
                              <span className="text-[10px] text-gray-400 font-medium">{invite.user.email}</span>
                           )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      {getStatusBadge(invite.status)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                           <TimeIcon className="size-3" />
                           <span>Invited: {invite.invitedAt ? new Date(invite.invitedAt).toLocaleString() : "N/A"}</span>
                        </div>
                        {invite.respondedAt && (
                          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-500">
                             <TimeIcon className="size-3" />
                             <span>Responded: {new Date(invite.respondedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 max-w-xs">
                       <div className="flex items-start gap-2">
                          <ChatIcon className={`size-3.5 mt-0.5 shrink-0 ${invite.responseNotes ? 'text-brand-500' : 'text-gray-300'}`} />
                          <p className={`text-xs ${invite.responseNotes ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 italic'}`}>
                             {invite.responseNotes || "No notes provided"}
                          </p>
                       </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                       <button
                          onClick={() => {
                             if (event?.public_id) {
                                toggleScannerMutation.mutate({
                                   eventId: event.public_id,
                                   invitationId: String(invite.id),
                                   isScanner: !invite.isScanner
                                });
                             }
                          }}
                          disabled={toggleScannerMutation.isPending}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${invite.isScanner ? 'bg-brand-500' : 'bg-gray-200 dark:bg-white/10'}`}
                       >
                          <span className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${invite.isScanner ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                       </button>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                       <div className="flex justify-end gap-1">
                          <button
                            onClick={() => navigate(`/events/${event?.public_id}/invitation-paper?userId=${invite.user?.public_id || invite.userId}`)}
                            className="p-2 text-gray-400 hover:text-brand-500 transition-colors"
                            title="Print Personalized Invitation"
                          >
                            <PrinterIcon className="size-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: "Delete Invitation",
                                message: `Are you sure you want to delete the invitation for "${invite.user?.name || invite.userId}"? This action cannot be undone.`,
                                variant: "delete",
                              });
                              if (confirmed && id) {
                                try {
                                  await deleteInvitationMutation.mutateAsync({ 
                                    eventId: event?.public_id || id, 
                                    invitationId: String(invite.id) 
                                  });
                                  showSuccess("Invitation deleted successfully");
                                  refetch();
                                } catch (error) {
                                  showError(error, "Failed to delete invitation");
                                }
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-error-500 transition-colors"
                            title="Delete Invitation"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 1 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> invitations
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
              
              <div className="flex items-center gap-1 px-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400 px-1">/</span>
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
      <ManageInvitationsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        event={event || null}
      />
      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default EventInvitations;
