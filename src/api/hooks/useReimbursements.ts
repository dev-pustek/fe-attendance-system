import { keepPreviousData, useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { reimbursementService, CreateReimbursementDto, GetReimbursementsParams } from '../services/reimbursementService';

export const useReimbursements = (params?: GetReimbursementsParams) => {
  return useQuery({
    queryKey: ['reimbursements', params],
    queryFn: () => reimbursementService.findAll(params),
    placeholderData: keepPreviousData as any,
  });
};

export const useReimbursementsInfinite = (params?: GetReimbursementsParams) => {
  return useInfiniteQuery({
    queryKey: ['reimbursements', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => reimbursementService.findAll({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      const totalPages = meta?.totalPages || meta?.last_page || Math.ceil((meta?.total || 0) / (meta?.limit || 10));
      return meta?.page < totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useReimbursementsForApproval = (params?: GetReimbursementsParams) => {
  return useQuery({
    queryKey: ['reimbursements', 'all', params],
    queryFn: () => reimbursementService.findAllForApproval(params),
    placeholderData: keepPreviousData as any,
  });
};

export const useCreateReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReimbursementDto) => reimbursementService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    },
  });
};

export const useUpdateReimbursementStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'paid' }) =>
      reimbursementService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    },
  });
};
