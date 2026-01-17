import React, { useState } from "react";
import { IdentityCaptureLog } from "../../../api/types/identity";
import { useMatchIdentityResolution } from "../../../api/hooks/useIdentity";
import { useUsers } from "../../../api/hooks/useUsers";
import { useDebounce } from "../../../hooks/useDebounce";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import NumberInput from "../../../components/atoms/NumberInput";
import { showSuccess, showError } from "../../../utils/toast";

interface ResolveLogModalProps {
    isOpen: boolean;
    log: IdentityCaptureLog | null;
    onClose: () => void;
}

const ResolveLogModal: React.FC<ResolveLogModalProps> = ({ isOpen, log, onClose }) => {
    const [searchUser, setSearchUser] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("");
    const [resolutionStatus, setResolutionStatus] = useState("confirmed");
    const [matchConfidence, setMatchConfidence] = useState<string | number>(0.95);
    
    const debouncedSearch = useDebounce(searchUser, 300);
    const { data: usersData, isLoading: isUsersLoading } = useUsers({ search: debouncedSearch, limit: 10 });
    
    // Handle potential variation in response structure if needed, but sticking to existing pattern if possible
    // Previous file used: usersData?.users || []. 
    // Types might be: { users: User[], meta: ... } or { data: User[], ... }
    // I'll cast safely.
    const users = (usersData as any)?.users || (usersData as any)?.data || [];

    const userOptions = users.map((u: any) => ({
        label: u.name,
        value: u.id || u.public_id,
        subLabel: u.email
    }));

    const { mutate: matchResolution, isPending } = useMatchIdentityResolution();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!log || !selectedUserId) return;

        matchResolution({
            captureLogId: Number(log.id),
            userId: selectedUserId,
            matchConfidence: Number(matchConfidence),
            resolutionStatus,
            resolutionMethod: "manual",
            resolvedAt: new Date().toISOString()
        }, {
            onSuccess: () => {
                showSuccess("Resolution created successfully");
                onClose();
                setSearchUser("");
                setSelectedUserId("");
                setResolutionStatus("confirmed");
                setMatchConfidence(0.95);
            },
            onError: (err) => {
                showError(err, "Failed to create resolution");
            }
        });
    };

    if (!log) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Manual Resolution"
            description={`Manually resolve capture log #${log.id}`}
            className="max-w-md w-full"
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
                        form="resolve-form"
                        disabled={isPending || !selectedUserId}
                        className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                    >
                        {isPending ? "Saving..." : "Save Resolution"}
                    </button>
                </div>
            }
        >
            <form id="resolve-form" onSubmit={handleSubmit} className="space-y-5">
                <SearchableAsyncSelect
                    label="Select User"
                    placeholder="Search user..."
                    value={selectedUserId}
                    onChange={(val) => setSelectedUserId(String(val))}
                    onSearch={setSearchUser}
                    options={userOptions}
                    isLoading={isUsersLoading}
                />

                <CustomSelect
                    label="Status"
                    value={resolutionStatus}
                    onChange={(val) => setResolutionStatus(String(val))}
                    options={[
                        { label: "Confirmed", value: "confirmed" },
                        { label: "Rejected", value: "rejected" },
                    ]}
                />

                <NumberInput
                    label="Match Confidence (0.0 - 1.0)"
                    value={matchConfidence}
                    onChange={(val) => setMatchConfidence(val)}
                    required
                />
            </form>
        </Modal>
    );
};

export default ResolveLogModal;
