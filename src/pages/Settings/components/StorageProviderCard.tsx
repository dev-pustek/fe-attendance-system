import React from 'react';
import { StorageIntegration } from '../../../api/types/storage';
import Switch from '../../../components/atoms/Switch';
import { BoltIcon, BoxIconLine } from '../../../components/atoms/Icons';

interface StorageProviderCardProps {
    integration: StorageIntegration;
    onToggleActive: (id: number, isActive: boolean) => void;
    onConfigure: (integration: StorageIntegration) => void;
    isToggling: boolean;
}

const StorageProviderCard: React.FC<StorageProviderCardProps> = ({ 
    integration, 
    onToggleActive, 
    onConfigure,
    isToggling
}) => {
    const isConnected = integration.provider === 'local' || (integration.config && (integration.config.client_id || integration.config.tenant_id));
    
    // Helper for display name
    const getDisplayName = (provider: string) => {
        switch(provider) {
            case 'local': return 'Local Storage';
            case 'onedrive': return 'Microsoft OneDrive';
            case 'googledrive': return 'Google Drive';
            default: return provider;
        }
    };

    // Helper for description
    const getDescription = (provider: string) => {
        switch(provider) {
            case 'local': return 'Store files on the local server filesystem.';
            case 'onedrive': return 'Store files in Microsoft OneDrive for Business.';
            case 'googledrive': return 'Store files in Google Drive (Coming Soon).';
            default: return '';
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:shadow-lg hover:shadow-gray-200/50 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:shadow-none">
            {/* Active Indicator Accent - Top */}
            {integration.isActive && (
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-brand-500 to-brand-600"></div>
            )}

            {/* Header Section */}
            <div className="p-5 pb-3 space-y-2.5">
                {/* First Row: Icon and Badge */}
                <div className="flex items-center justify-between">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                        integration.isActive 
                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                            : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500'
                    }`}>
                        <BoxIconLine className="size-6" />
                    </div>

                    <span className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        integration.isActive 
                            ? 'bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20' 
                            : 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20'
                    }`}>
                        {integration.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                {/* Second Row: Title and Description */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                        {getDisplayName(integration.provider)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                        {getDescription(integration.provider)}
                    </p>
                </div>
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-gray-100 dark:border-white/[0.05]"></div>

            {/* Footer Section */}
            <div className="flex items-center justify-between p-5 pt-3">
                <div className="flex items-center gap-3">
                    {/* Connection Status */}
                    <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${
                            isConnected 
                                ? 'bg-success-500 shadow-sm shadow-success-500/50' 
                                : 'bg-gray-300 dark:bg-gray-600'
                        }`}></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {isConnected ? 'Connected' : 'Not Configured'}
                        </span>
                    </div>

                    {/* Configure Button */}
                    {integration.provider !== 'local' && (
                        <button
                            onClick={() => onConfigure(integration)}
                            className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:text-brand-500 hover:border-brand-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-brand-400"
                        >
                            <BoltIcon className="size-4" />
                        </button>
                    )}
                </div>

                {/* Toggle Switch */}
                <Switch 
                    checked={integration.isActive} 
                    onChange={(checked) => onToggleActive(integration.id, checked)}
                    disabled={isToggling}
                />
            </div>


        </div>
    );
};

export default StorageProviderCard;
