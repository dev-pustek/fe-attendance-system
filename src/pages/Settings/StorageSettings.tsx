import React, { useState } from 'react';
import PageMeta from '../../components/atoms/PageMeta';
import PageBreadcrumb from '../../components/molecules/PageBreadcrumb';
import { useStorageIntegrations } from '../../api/hooks/useStorageIntegrations';
import StorageProviderCard from './components/StorageProviderCard';
import OneDriveConfigModal from './components/OneDriveConfigModal';
import { StorageIntegration } from '../../api/types/storage';
import { showSuccess, showError } from '../../utils/toast';

const StorageSettings: React.FC = () => {
    const { integrations, isLoading, activateMutation, configureMutation } = useStorageIntegrations();
    const [selectedIntegration, setSelectedIntegration] = useState<StorageIntegration | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isCreateMode, setIsCreateMode] = useState(false);

    const handleToggleActive = async (id: number, isActive: boolean) => {
        try {
            await activateMutation.mutateAsync({ id, isActive });
            showSuccess(`Storage provider ${isActive ? 'activated' : 'deactivated'}`);
        } catch (error) {
            showError(error, "Failed to update status");
        }
    };

    const handleConfigure = (integration: StorageIntegration) => {
        setSelectedIntegration(integration);
        setIsCreateMode(false);
        if (integration.provider === 'onedrive') {
            setIsConfigModalOpen(true);
        }
    };

    const handleCreateNew = () => {
        setSelectedIntegration(null);
        setIsCreateMode(true);
        setIsConfigModalOpen(true);
    };

    // Check which providers are missing
    const existingProviders = integrations?.map(i => i.provider) || [];
    const missingProviders = (['local', 'onedrive', 'googledrive'] as const)
        .filter(p => !existingProviders.includes(p));

    return (
        <>
            <PageMeta title="Storage Settings | SIAPUS" description="Manage file storage providers." />
            <PageBreadcrumb pageTitle="Storage Settings" />

            <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Storage Integrations</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure where the system stores uploaded files.</p>
                    </div>
                    {missingProviders.length > 0 && (
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            <span className="text-xl">+</span>
                            Add Provider
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                        <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {integrations?.map((integration) => (
                            <StorageProviderCard 
                                key={integration.id}
                                integration={integration}
                                onToggleActive={handleToggleActive}
                                onConfigure={handleConfigure}
                                isToggling={activateMutation.isPending}
                            />
                        ))}
                    </div>
                )}
            </div>

            <OneDriveConfigModal 
                isOpen={isConfigModalOpen} 
                onClose={() => setIsConfigModalOpen(false)}
                integration={selectedIntegration}
                isCreateMode={isCreateMode}
                availableProviders={missingProviders}
            />
        </>
    );
};

export default StorageSettings;
