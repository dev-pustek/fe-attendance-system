import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";
import { CreateLeaveTypeDto, LeaveTypeParams, UpdateLeaveTypeDto, LeaveSubmissionParams, CreateLeaveSubmissionDto, UpdateLeaveSubmissionDto, ReviewLeaveDto, LeaveApprovalParams } from "../types/leave";

export const useLeaveTypes = (params?: LeaveTypeParams) => {
  return useQuery({
    queryKey: ["leave-types", params],
    queryFn: () => leaveService.getLeaveTypes(params),
    placeholderData: keepPreviousData,
  });
};

export const useCreateLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveTypeDto) => leaveService.createLeaveType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
  });
};

export const useUpdateLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ public_id, data }: { public_id : string; data: UpdateLeaveTypeDto }) =>
      leaveService.updateLeaveType(public_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
  });
};

export const useDeleteLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (public_id : string) => leaveService.deleteLeaveType(public_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
  });
};

// Submissions Hooks

export const useLeaveSubmissions = (params?: LeaveSubmissionParams) => {
  return useQuery({
    queryKey: ["leave-submissions", params],
    queryFn: () => leaveService.getSubmissions(params),
    placeholderData: keepPreviousData,
  });
};

export const useMyLeaveSubmissions = (params?: LeaveSubmissionParams) => {
  return useQuery({
    queryKey: ["my-leaves", params],
    queryFn: () => leaveService.getMySubmissions(params),
    placeholderData: keepPreviousData,
  });
};

export const useLeaveSubmission = (public_id : string) => {
  return useQuery({
    queryKey: ["leave-submission", public_id],
    queryFn: () => leaveService.getSubmission(public_id),
    enabled: !!public_id,
  });
};

export const useSubmitLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveSubmissionDto) => leaveService.submitLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-submissions"] });
    },
  });
};

export const useUpdateSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ public_id, data }: { public_id : string; data: UpdateLeaveSubmissionDto }) =>
      leaveService.updateSubmission(public_id, data),
    onSuccess: (_, { public_id }) => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["leave-submission", public_id] });
    },
  });
};

export const useReviewLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ public_id, data }: { public_id : string; data: ReviewLeaveDto }) =>
      leaveService.reviewLeave(public_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["leave-submission"] });
    },
  });
};

export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (public_id : string) => leaveService.deleteSubmission(public_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-submissions"] });
    },
  });
};

export const useLeaveApprovals = (params?: LeaveApprovalParams) => {
  return useQuery({
    queryKey: ["leave-approvals", params],
    queryFn: () => leaveService.getLeaveApprovals(params),
    placeholderData: keepPreviousData,
  });
};
