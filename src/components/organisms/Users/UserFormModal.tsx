import React, { useState, useEffect } from "react";
import Modal from "../../molecules/Modal";
import Button from "../../atoms/Button";
import { UserCircleIcon, EditIcon } from "../../atoms/Icons";
import CustomSelect from "../../molecules/CustomSelect";
import Switch from "../../atoms/Switch";
import PhoneNumberInput from "../../atoms/PhoneNumberInput";
import { User } from "../../../api/types/user";
import { useCreateUser, useUpdateUser } from "../../../api/hooks/useUsers";
import { useUserTypes } from "../../../api/hooks/useUserTypes";
import { useAccessControl } from "../../../api/hooks/useAccessControl";
import { accessControlService } from "../../../api/services/accessControlService";
import { showSuccess, showError } from "../../../utils/toast";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    isActive: true,
    photo: null as File | null,
    userTypes: [] as string[],
    roles: [] as string[],
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const { userTypes: availableUserTypes } = useUserTypes();
  const { roles: availableRoles } = useAccessControl();

  const isEdit = !!user;

  // Sync data when editing
  useEffect(() => {
    if (user) {
      // Safely access roles, handling potential missing or nested structure depending on backend
      const currentRoles = user.roles ? user.roles.map(r => r.name) : [];
      
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        isActive: user.isActive,
        photo: null,
        userTypes: user.userTypes || [],
        roles: currentRoles,
      });
      // Set existing photo as preview
      setPhotoPreview(user.photo || null);
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        isActive: true,
        photo: null,
        userTypes: [],
        roles: [],
      });
      setPhotoPreview(null);
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));

      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo: null }));
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let savedUserId: string | undefined;
      
      const userPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        isActive: formData.isActive,
        photo: formData.photo || undefined,
        userTypes: formData.userTypes,
      };

      if (isEdit) {
        // Use id if available, otherwise fall back to public_id
        savedUserId = user?.id || user?.public_id;
        if (!savedUserId) {
          showError(null, "User ID is missing. Cannot update user.");
          return;
        }
        await updateUserMutation.mutateAsync({ id: savedUserId, data: userPayload });
      } else {
        const response = await createUserMutation.mutateAsync(userPayload);
        // The create response might return an object with id or public_id
        const newUser = response.data;
        savedUserId = newUser.id || newUser.public_id; 
      }

      // Handle Role Assignment Logic
      if (savedUserId) {
        const selectedRoles = formData.roles;
        
        if (isEdit && user) {
           const initialRoles = user.roles?.map(r => r.name) || [];
           
           // Find roles to add
           const rolesToAdd = selectedRoles.filter(r => !initialRoles.includes(r));
           // Find roles to remove
           const rolesToRemove = initialRoles.filter(r => !selectedRoles.includes(r));

           // Execute assignments
           if (rolesToAdd.length > 0) {
              await Promise.all(rolesToAdd.map(roleName => 
                 accessControlService.assignRole(savedUserId!, roleName)
              ));
           }

           // Execute removals
           if (rolesToRemove.length > 0) {
              await Promise.all(rolesToRemove.map(roleName => 
                 accessControlService.removeRole(savedUserId!, roleName)
              ));
           }
        } else {
           // New User: just assign all selected roles
           if (selectedRoles.length > 0) {
              await Promise.all(selectedRoles.map(roleName => 
                 accessControlService.assignRole(savedUserId!, roleName)
              ));
           }
        }
      }

      showSuccess(`User ${isEdit ? "updated" : "created"} successfully!`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      showError(error);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-2xl"
      title={isEdit ? "Edit User Profile" : "Register New User"}
      description={isEdit ? "Update user details and status." : "Create a new user account and assign roles."}
    >
      <div className="">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Photo Section */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative group">
                <div className="w-32 h-[170px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserCircleIcon className="size-16 text-gray-300" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">3×4</span>
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <EditIcon className="size-8 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                  </label>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Profile Photo</p>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Basic Info Section */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="john@example.com"
                />
              </div>

              <div className="md:col-span-1">
                <PhoneNumberInput
                  label="Phone Number"
                  value={formData.phone}
                  onChange={val => setFormData(prev => ({ ...prev, phone: val }))}
                  placeholder="812-xxxx-xxxx"
                />
              </div>
              
              <div className="md:col-span-1">
                <CustomSelect
                  label="User Types"
                  placeholder="Select types..."
                  value={formData.userTypes[0] || ""}
                  onChange={val => setFormData(prev => ({ ...prev, userTypes: [String(val)] }))}
                  options={availableUserTypes.map((t: any) => ({
                    label: t.name,
                    value: t.code
                  }))}
                />
              </div>
              
              <div className="md:col-span-1">
                <CustomSelect
                  label="System Roles"
                  placeholder="Select roles..."
                  value={formData.roles[0] || ""}
                  onChange={val => {
                     // Simple single select for now, or could be multi if CustomSelect supports it
                     // Assuming CustomSelect is single select based on usage above, but let's check.
                     // The logic above supports multi-roles, but UI might be limited to one for now 
                     // unless CustomSelect supports an array value.
                     // The CustomSelect implementation in List/index.tsx takes a string. 
                     // We'll treat it as single select to start or append if multi supported.
                     // Given CustomSelect usually returns a single value, lets treat it as "Add Role" behavior or just single role management?
                     // The user request impies "assign user for some role". 
                     // Let's assume one primary system role per user for simplicity first, or array if CustomSelect handles it.
                     // Based on type: value: string | number.
                     setFormData(prev => ({ ...prev, roles: [String(val)] }))
                  }}
                  options={availableRoles.map((r: any) => ({
                    label: r.displayName,
                    value: r.name
                  }))}
                />
              </div>

              {isEdit && (
                <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Active Status</span>
                    <p className="text-[11px] text-gray-400">User will be able to log in when active.</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
              className="px-8 shadow-lg shadow-brand-500/20"
            >
              {(createUserMutation.isPending || updateUserMutation.isPending) ? "Processing..." : isEdit ? "Update User" : "Register User"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UserFormModal;
