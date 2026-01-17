import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  schedulingService, 
  CreateShiftTemplateDto, 
  UpdateShiftTemplateDto, 
  CreateShiftAssignmentDto,
  UpdateShiftAssignmentDto,
  BulkAssignUsersDto,
  BulkAssignClassDto
} from "../services/schedulingService";
import { ShiftTemplateParams, ShiftAssignmentParams } from "../types/scheduling";

export const useShiftTemplates = (params?: ShiftTemplateParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["scheduling", "templates", params],
    queryFn: () => schedulingService.getTemplates(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateShiftTemplateDto) => schedulingService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "templates"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftTemplateDto }) => 
      schedulingService.updateTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["scheduling", "templates", String(variables.id)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulingService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "templates"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useShiftTemplate = (id: string | undefined) => {
  return useQuery({
    queryKey: ["scheduling", "templates", id ? String(id) : undefined],
    queryFn: () => schedulingService.getTemplate(id!),
    enabled: !!id,
  });
};

export const useShiftAssignments = (params?: ShiftAssignmentParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["scheduling", "assignments", params],
    queryFn: () => schedulingService.getAssignments(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateShiftAssignmentDto) => schedulingService.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "assignments"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftAssignmentDto }) =>
      schedulingService.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "assignments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulingService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "assignments"] });
    },
  });

  const bulkAssignUsersMutation = useMutation({
    mutationFn: (data: BulkAssignUsersDto) => schedulingService.bulkAssignUsers(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "assignments"] });
    },
  });

  const bulkAssignClassMutation = useMutation({
    mutationFn: (data: BulkAssignClassDto) => schedulingService.bulkAssignClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling", "assignments"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation, bulkAssignUsersMutation, bulkAssignClassMutation };
};
