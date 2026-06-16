import React, { useState } from "react";
import { userService } from "../../api/services/userService";
import { ChangePasswordDto } from "../../api/types/user";
import { showSuccess, showError } from "../../utils/toast";
import Input from "../../components/atoms/InputField";
import Label from "../../components/atoms/Label";
import { EyeIcon, EyeCloseIcon, LockIcon } from "../../components/atoms/Icons";

export default function UpdatePasswordForm() {
  const [formData, setFormData] = useState<ChangePasswordDto>({
    currentPassword: "",
    newPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword) {
      showError("Please fill in both fields");
      return;
    }
    
    if (formData.newPassword.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await userService.changePassword(formData);
      showSuccess("Password updated successfully");
      setFormData({ currentPassword: "", newPassword: "" });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5 space-y-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 flex items-center gap-2">
          <LockIcon className="size-4" />
          Change Password
        </Label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Update your password to keep your account secure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
        <div className="space-y-1.5 relative">
          <Label>Current Password</Label>
          <div className="relative">
            <Input
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Enter current password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeCloseIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1.5 relative">
          <Label>New Password</Label>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password (min 6 chars)"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeCloseIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end max-w-2xl">
        <button
          type="submit"
          disabled={isLoading || !formData.currentPassword || !formData.newPassword}
          className="rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </form>
  );
}
