import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useStorageIntegrations } from '../../api/hooks/useStorageIntegrations';
import { showSuccess, showError } from '../../utils/toast';

const StorageCallback: React.FC = () => {
    return (
        <CallbackLogic />
    );
};

const CallbackLogic = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { exchangeCodeMutation, integrations } = useStorageIntegrations();
    const processedRef = useRef(false);
    
    useEffect(() => {
        const code = searchParams.get('code');
        if (!code || !integrations || processedRef.current) return;

        // Find OneDrive integration
        const onedrive = integrations.find(i => i.provider === 'onedrive');
        if (!onedrive) {
            // Wait for integrations to load
            return;
        }

        processedRef.current = true;
        
        const callbackUrl = `${window.location.origin}/settings/storage/callback`;
        
        exchangeCodeMutation.mutateAsync({
            id: onedrive.id,
            code,
            redirect_uri: callbackUrl
        }).then(() => {
            showSuccess("OneDrive Connected Successfully!");
            navigate('/settings/storage');
        }).catch((err) => {
            showError(err, "Failed to connect OneDrive");
            navigate('/settings/storage');
        });

    }, [searchParams, integrations, exchangeCodeMutation, navigate]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4">
                <div className="size-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connecting storage provider...</h2>
                <p className="text-sm text-gray-500">Please wait while we complete the authentication.</p>
            </div>
        </div>
    );
}

export default StorageCallback;
