import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storageService } from "../services/storageService";
import { StorageConfig, StorageProviderType } from "../types/storage";

export const useStorageIntegrations = () => {
    const queryClient = useQueryClient();

    const { data: integrations, isLoading, error } = useQuery({
        queryKey: ['storage-integrations'],
        queryFn: storageService.getIntegrations,
    });

    const configureMutation = useMutation({
        mutationFn: (data: { provider: StorageProviderType; config: StorageConfig }) => 
            storageService.configureIntegration(data.provider, data.config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['storage-integrations'] });
        },
    });

    const activateMutation = useMutation({
        mutationFn: (data: { id: number; isActive: boolean }) => 
            storageService.updateStatus(data.id, data.isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['storage-integrations'] });
        },
    });
    
    // Auth related mutations
    const getAuthUrlMutation = useMutation({
        mutationFn: (params: { id: number; redirect_uri: string }) => 
            storageService.getAuthUrl(params.id, params.redirect_uri),
    });

    const exchangeCodeMutation = useMutation({
        mutationFn: (params: { id: number; code: string; redirect_uri: string }) => 
            storageService.exchangeAuthCode(params.id, { code: params.code, redirect_uri: params.redirect_uri }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['storage-integrations'] });
        },
    });

    return {
        integrations,
        isLoading,
        error,
        configureMutation,
        activateMutation,
        getAuthUrlMutation,
        exchangeCodeMutation
    };
};
