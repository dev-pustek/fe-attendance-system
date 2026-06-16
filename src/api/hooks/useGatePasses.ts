import { keepPreviousData, useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { gatePassService, CreateGatePassDto, GetGatePassesParams } from '../services/gatePassService';

export const useGatePasses = (params?: GetGatePassesParams) => {
  return useQuery({
    queryKey: ['gate-passes', params],
    queryFn: () => gatePassService.findAll(params),
    placeholderData: keepPreviousData as any,
  });
};

export const useGatePassesInfinite = (params?: GetGatePassesParams) => {
  return useInfiniteQuery({
    queryKey: ['gate-passes', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => gatePassService.findAll({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      const totalPages = meta?.totalPages || meta?.last_page || Math.ceil((meta?.total || 0) / (meta?.limit || 10));
      return meta?.page < totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useGatePassesForApproval = (params?: GetGatePassesParams) => {
  return useQuery({
    queryKey: ['gate-passes', 'all', params],
    queryFn: () => gatePassService.findAllForApproval(params),
    placeholderData: keepPreviousData as any,
  });
};

export const useCreateGatePass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGatePassDto) => gatePassService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate-passes'] });
    },
  });
};

export const useUpdateGatePassStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      gatePassService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate-passes'] });
    },
  });
};
