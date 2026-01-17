import React from "react";
import Modal from "../../molecules/Modal";
import { useUser } from "../../../api/hooks/useUser";
import { User } from "../../../api/types/user";
import Badge from "../../atoms/Badge";
import { EnvelopeIcon, ChatIcon, GridIcon, CloseIcon } from "../../atoms/Icons";

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const { data: response, isLoading } = useUser(userId || undefined);
  // apiClient unwraps data, so response is the user object
  const user = response as unknown as User;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl overflow-hidden">
      <div className="relative p-0 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 bg-white/50 hover:bg-gray-100 hover:text-gray-500 backdrop-blur-sm dark:text-gray-300 dark:hover:bg-white/10"
        >
          <CloseIcon className="size-5" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">Loading user profile...</p>
          </div>
        ) : user ? (
          <div className="flex flex-col md:flex-row">
            {/* Left Sidebar: Identity */}
            <div className="flex w-full flex-col items-center bg-gray-50 p-8 text-center md:w-1/3 md:border-r md:border-gray-100 dark:bg-white/5 dark:border-white/5">
                <div className="relative mb-4 w-32 overflow-hidden rounded-xl border-4 border-white shadow-sm dark:border-white/10 aspect-[3/4]">
                    {user.photo ? (
                        <img
                        src={user.photo}
                        alt={user.name}
                        className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-200 text-4xl font-bold text-gray-400 dark:bg-white/10">
                        {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white text-balance">
                    {user.name}
                </h3>
                
                {user.activeClass?.academicYear && (
                    <span className="mb-2 inline-block rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {user.activeClass.academicYear}
                    </span>
                )}

                <div className="mb-4 flex flex-wrap justify-center gap-2">
                    <Badge color={user.isActive ? "success" : "error"}>
                        {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                     {user.userTypes?.map((type) => (
                        <span key={type} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                            {type}
                        </span>
                    ))}
                </div>
                
                 <div className="mt-auto w-full pt-6 border-t border-gray-200 dark:border-white/10">
                    <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                            <GridIcon className="size-4" />
                            <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</span>
                        </div>
                    </div>
                 </div>
            </div>

            {/* Right Content: Details */}
            <div className="flex-1 p-6 md:p-8">
                <h4 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Contact Information</h4>
                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                            <EnvelopeIcon className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Email Address</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white break-all">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                            <ChatIcon className="size-4" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Phone Number</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.phone || "-"}</p>
                        </div>
                    </div>
                </div>

                {/* Academic/Profile Info */}
                {(user.profile || user.activeClass) && (
                    <>
                        <h4 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider border-t border-gray-100 pt-6 dark:border-white/5">Academic Profile</h4>
                        <div className="grid gap-y-4 gap-x-6 sm:grid-cols-2">
                            {user.activeClass && (
                                <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/5">
                                    <p className="text-xs text-gray-500">Active Class</p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-900 dark:text-white">{user.activeClass.name}</p>
                                    </div>
                                </div>
                            )}

                            {user.profile?.studentId && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Student ID</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.profile.studentId}</p>
                                </div>
                            )}
                            {user.profile?.nisn && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">NISN</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.profile.nisn}</p>
                                </div>
                            )}
                             {user.profile?.placeOfBirth && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Place of Birth</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.profile.placeOfBirth}</p>
                                </div>
                            )}
                            {user.profile?.dateOfBirth && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{new Date(user.profile.dateOfBirth).toLocaleDateString()}</p>
                                </div>
                            )}
                            {user.profile?.address && (
                                <div className="sm:col-span-2 flex items-start gap-2 mt-2">
                                    <GridIcon className="mt-0.5 size-4 text-gray-400 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">Address</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{user.profile.address}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            User not found.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserProfileModal;
