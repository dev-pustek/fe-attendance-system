import React, { useState, useEffect } from 'react';
import Modal from '../../../components/molecules/Modal';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/InputField';
import CustomSelect from '../../../components/molecules/CustomSelect';
import { StorageIntegration } from '../../../api/types/storage';
import { useStorageIntegrations } from '../../../api/hooks/useStorageIntegrations';
import { showError } from '../../../utils/toast';

interface OneDriveConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration: StorageIntegration | null;
    isCreateMode?: boolean;
    availableProviders?: readonly ('local' | 'onedrive' | 'googledrive')[];
}

const OneDriveConfigModal: React.FC<OneDriveConfigModalProps> = ({
    isOpen,
    onClose,
    integration,
    isCreateMode = false,
    availableProviders = []
}) => {
    const { configureMutation, getAuthUrlMutation } = useStorageIntegrations();
    
    // Form state
    const [selectedProvider, setSelectedProvider] = useState<'local' | 'onedrive' | 'googledrive'>('onedrive');
    const [formData, setFormData] = useState({
        client_id: '',
        client_secret: '',
        tenant_id: ''
    });

    // Load initial data
    useEffect(() => {
        if (integration && integration.config) {
            setFormData({
                client_id: integration.config.client_id || '',
                client_secret: integration.config.client_secret || '', // Likely masked or empty
                tenant_id: integration.config.tenant_id || ''
            });
        }
    }, [integration]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const provider = isCreateMode ? selectedProvider : (integration?.provider || 'onedrive');

        try {
            await configureMutation.mutateAsync({
                provider: provider as any,
                config: formData
            });
            onClose();
        } catch (error) {
            showError(error, "Failed to save configuration");
        }
    };

    const handleConnect = async () => {
        if (!integration) return;
        try {
            // Construct current URL base for callback
            const callbackUrl = `${window.location.origin}/settings/storage/callback`;
            const { url } = await getAuthUrlMutation.mutateAsync({
                id: integration.id,
                redirect_uri: callbackUrl
            });
            
            // Redirect to Microsoft Auth
            window.location.href = url;
        } catch (error) {
            showError(error, "Failed to initiate connection");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isCreateMode ? "Add Storage Provider" : "Configure OneDrive"}
            description={isCreateMode ? "Select and configure a new storage provider." : "Enter your Azure AD App credentials to connect OneDrive."}
            className="max-w-md"
            footer={
                <div className="flex justify-between w-full">
                     {!isCreateMode && (selectedProvider === 'onedrive' || integration?.provider === 'onedrive') && (
                        <Button 
                            variant="secondary"
                            onClick={handleConnect}
                            disabled={!integration?.id}
                            type="button"
                        >
                            Connect Account
                        </Button>
                     )}
                     {isCreateMode && <div />}

                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            onClick={onClose}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                            isLoading={configureMutation.isPending}
                            type="button" // Triggered manually or via form
                        >
                            Save Keys
                        </Button>
                    </div>
                </div>
            }
        >
            <form id="onedrive-config-form" onSubmit={handleSubmit} className="space-y-4">
                {isCreateMode && availableProviders.length > 0 && (
                    <CustomSelect
                        label="Storage Provider"
                        options={availableProviders.map(provider => ({
                            label: provider === 'local' ? 'Local Storage' : 
                                   provider === 'onedrive' ? 'Microsoft OneDrive' : 
                                   'Google Drive',
                            value: provider
                        }))}
                        value={selectedProvider}
                        onChange={(val) => setSelectedProvider(val as 'local' | 'onedrive' | 'googledrive')}
                        placeholder="Select a storage provider"
                    />
                )}

                {(selectedProvider === 'onedrive' || integration?.provider === 'onedrive') && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Client ID
                            </label>
                            <Input 
                                value={formData.client_id}
                                onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                                placeholder="Enter Client ID"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Client Secret
                            </label>
                            <Input 
                                type="password"
                                value={formData.client_secret}
                                onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
                                placeholder="Enter Client Secret"
                            />
                            <p className="mt-1 text-xs text-gray-500">Leave blank if unchanged</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tenant ID
                            </label>
                            <Input 
                                value={formData.tenant_id}
                                onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
                                placeholder="Enter Tenant ID"
                                required
                            />
                        </div>
                    </>
                )}

                {selectedProvider === 'local' && (
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/5">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Local storage doesn't require any configuration. Files will be stored on the server's filesystem.
                        </p>
                    </div>
                )}

                {selectedProvider === 'googledrive' && (
                    <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-500/10">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                            Google Drive integration is coming soon.
                        </p>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default OneDriveConfigModal;
