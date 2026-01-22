
import { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { userService } from '../api/services/userService';
import PageMeta from '../components/atoms/PageMeta';
import PageBreadcrumb from '../components/molecules/PageBreadcrumb';
import Button from '../components/atoms/Button';
import { UserIcon, CameraIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ProfilePicture() {
    const { user, setAuth } = useAuthStore();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error("Please select an image file.");
                return;
            }

            // Validate file size (e.g., 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB.");
                return;
            }

            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user?.public_id) return;

        setIsUploading(true);
        const toastId = toast.loading("Uploading profile picture...");

        try {
            const response = await userService.updateUser(user.public_id, {
                photo: selectedFile
            });

            if (response.data) {
                // Update local auth store with new user data
                // We need to keep the token, just update the user part
                // Actually setAuth requires tokens. We can access them from store or just manually update user part if store allows partial update.
                // But setAuth is defining the WHOLE state.
                // Assuming useAuthStore.getState() gives access.
                const { accessToken, refreshToken } = useAuthStore.getState();
                if (accessToken && refreshToken) {
                    setAuth(response.data, accessToken, refreshToken);
                }
                
                toast.success("Profile picture updated!", { id: toastId });
                setSelectedFile(null);
                setPreviewUrl(null);
            }
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to update profile picture.", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };
    
    // Get current photo URL
    // If backend returns a full URL, use it. If relative, prepend API URL?
    // Usually backend returns full URL or we handle it. 
    // Assuming user.photo is the URL.
    const currentPhotoUrl = user?.photo;

    return (
        <>
            <PageMeta title="Profile Picture | Settings" description="Update your profile picture." />
            <PageBreadcrumb pageTitle="Profile Picture" />

            <div className="max-w-2xl mx-auto space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Change Profile Picture</h2>
                    
                    <div className="flex flex-col items-center gap-8">
                        {/* Avatar Display */}
                        <div className="relative group">
                            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-100 dark:border-white/10 shadow-xl bg-gray-50 flex items-center justify-center">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : currentPhotoUrl ? (
                                    <img src={currentPhotoUrl} alt={user?.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-24 h-24 text-gray-300" />
                                )}
                            </div>
                            
                            {/* Overlay Button */}
                            <button 
                                onClick={triggerFileInput}
                                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                            >
                                <CameraIcon className="w-12 h-12 text-white/80" />
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            
                            <Button 
                                variant="outline" 
                                className="w-full justify-center"
                                onClick={triggerFileInput}
                            >
                                <CameraIcon className="w-5 h-5 mr-2" />
                                Select New Image
                            </Button>

                            {selectedFile && (
                                <div className="space-y-4 w-full animate-in fade-in slide-in-from-top-2">
                                     <div className="text-xs text-center text-gray-500">
                                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                     </div>
                                     <Button 
                                        className="w-full justify-center bg-brand-600 hover:bg-brand-700 text-white"
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                     >
                                        {isUploading ? (
                                            "Uploading..."
                                        ) : (
                                            <>
                                                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                                                Upload & Save
                                            </>
                                        )}
                                     </Button>
                                     <button 
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreviewUrl(null);
                                        }}
                                        className="w-full text-sm text-red-500 hover:underline"
                                     >
                                        Cancel
                                     </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Allowed file types: JPG, PNG, GIF. Max size: 5MB.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
