import React, { useState } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import {
  useGuests,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
  useCheckInGuest,
} from "../../api/hooks/useGuests";
import { Guest } from "../../api/types/system";
import {
  GridIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  UserIcon,
  PencilIcon,
  TrashBinIcon,
  PlusIcon,
  CheckCircleIcon,
} from "../../components/atoms/Icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/atoms/Table";
import { useDebounce } from "../../hooks/useDebounce";
import Button from "../../components/atoms/Button";
import Modal from "../../components/molecules/Modal";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";

const Guests: React.FC = () => {
  // State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Check In Modal State
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInGuest, setCheckInGuest] = useState<Guest | null>(null);
  const [checkInForm, setCheckInForm] = useState({ purpose: "" });

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  // Hooks
  const { data: guestsResponse, isLoading } = useGuests({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreateGuest();
  const updateMutation = useUpdateGuest();
  const deleteMutation = useDeleteGuest();
  const checkInMutation = useCheckInGuest();

  const guests = Array.isArray(guestsResponse)
    ? guestsResponse
    : guestsResponse?.data || [];
  const meta = guestsResponse?.meta;
  const total = Number(meta?.total || 0);
  const totalPages = Number(
    meta?.totalPages || meta?.lastPage || Math.ceil(total / limit)
  );

  // Handlers
  const handleCreate = () => {
    setSelectedGuest(null);
    setFormData({ name: "", email: "", phone: "" });
    setIsModalOpen(true);
  };

  const handleEdit = (guest: Guest) => {
    setSelectedGuest(guest);
    setFormData({
      name: guest.name,
      email: guest.email || "",
      phone: guest.phone || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (guest: Guest) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Guest",
      message: `Are you sure you want to delete ${guest.name}? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(guest.id);
        showSuccess("Guest deleted successfully");
      } catch (error) {
        showError(error, "Failed to delete guest");
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showSuccess("Name is required");
      return;
    }

    try {
      if (selectedGuest) {
        await updateMutation.mutateAsync({
          id: selectedGuest.id,
          data: formData,
        });
        showSuccess("Guest updated successfully");
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess("Guest created successfully");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(
        error,
        selectedGuest ? "Failed to update guest" : "Failed to create guest"
      );
    }
  };

  const handleCheckIn = (guest: Guest) => {
    setCheckInGuest(guest);
    setCheckInForm({ purpose: "" });
    setIsCheckInModalOpen(true);
  };

  const handleCheckInSubmit = async () => {
    if (!checkInGuest || !checkInForm.purpose) {
      showSuccess("Purpose is required");
      return;
    }

    try {
      await checkInMutation.mutateAsync({
        public_id: checkInGuest.public_id,
        data: { purpose: checkInForm.purpose },
      });
      showSuccess("Guest checked in successfully");
      setIsCheckInModalOpen(false);
    } catch (error) {
      showError(error, "Failed to check in guest");
    }
  };

  return (
    <>
      <PageMeta
        title="Manage Guests | Sistem Absen"
        description="Manage visitor list."
      />
      <PageBreadcrumb pageTitle="Guests" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Guest Visitors
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage registered guests.
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <PlusIcon className="mr-2 size-4" />
            Add New Guest
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5 max-w-md">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                Search Guests
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-100 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider"
                >
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider"
                >
                  Contact Info
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider"
                >
                  Public ID
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider text-right"
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm font-bold text-gray-400 italic">
                        Loading guests...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-20 text-center">
                    <p className="text-sm font-medium text-gray-400">
                      No guests found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((guest: Guest) => (
                  <TableRow
                    key={guest.id || guest.public_id}
                    className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 text-sm">
                          <UserIcon className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">
                            {guest.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        {guest.email && (
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {guest.email}
                          </span>
                        )}
                        {guest.phone && (
                          <span className="text-xs text-gray-500">
                            {guest.phone}
                          </span>
                        )}
                        {!guest.email && !guest.phone && (
                          <span className="text-xs text-gray-400 italic">
                            No contact info
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 font-mono text-xs text-gray-500">
                      {guest.public_id}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCheckIn(guest)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-500/10"
                          title="Check In Guest"
                        >
                          <CheckCircleIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(guest)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                          title="Edit Guest"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(guest)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          title="Delete Guest"
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

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex flex-col gap-4 px-6 py-4 border-t border-gray-100 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing{" "}
                <span className="font-medium text-gray-700 dark:text-white">
                  {(page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-gray-700 dark:text-white">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700 dark:text-white">
                  {total}
                </span>{" "}
                guests
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
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {page}
                  </span>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {totalPages || 1}
                  </span>
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-lg"
        title={selectedGuest ? "Edit Guest" : "Add New Guest"}
        description="Enter guest details and contact information."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : "Save Guest"}
            </button>
          </div>
        }
      >
        <div>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500 tracking-wider">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Guest Name"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500 tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="guest@example.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500 tracking-wider">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="08123456789"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Check In Modal */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        className="max-w-lg"
        title="Check In Guest"
        description="Record the purpose of this visit."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCheckInModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckInSubmit}
              disabled={checkInMutation.isPending}
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {checkInMutation.isPending ? "Checking In..." : "Check In"}
            </button>
          </div>
        }
      >
        <div>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Guest</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {checkInGuest?.name}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-gray-500 tracking-wider">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                value={checkInForm.purpose}
                onChange={(e) => setCheckInForm({ purpose: e.target.value })}
                placeholder="e.g. Meeting with Principal"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 outline-none transition-all focus:border-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Guests;
