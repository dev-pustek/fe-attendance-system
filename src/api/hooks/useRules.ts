import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ruleService } from "../services/ruleService";
import { 
  RuleContextParams, CreateRuleContextDto, UpdateRuleContextDto,
  ScheduleRuleParams, CreateScheduleRuleDto, UpdateScheduleRuleDto,
  AttendanceRuleParams, CreateAttendanceRuleDto, UpdateAttendanceRuleDto
} from "../types/rules";

export const useRuleContexts = (params?: RuleContextParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rules", "contexts", params],
    queryFn: () => ruleService.getRuleContexts(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRuleContextDto) => ruleService.createRuleContext(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", "contexts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateRuleContextDto }) =>
      ruleService.updateRuleContext(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", "contexts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => ruleService.deleteRuleContext(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", "contexts"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useScheduleRules = (params?: ScheduleRuleParams, options?: { disableAutoInvalidate?: boolean }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rules", "schedule-rules", params],
    queryFn: () => ruleService.getScheduleRules(params),
  });

  const onSuccess = () => {
      if (!options?.disableAutoInvalidate) {
        queryClient.invalidateQueries({ queryKey: ["rules", "schedule-rules"] });
      }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduleRuleDto) => ruleService.createScheduleRule(data),
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateScheduleRuleDto }) =>
      ruleService.updateScheduleRule(id, data),
    onSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => ruleService.deleteScheduleRule(id),
    onSuccess,
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useAttendanceRules = (params?: AttendanceRuleParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rules", "attendance-rules", params],
    queryFn: () => ruleService.getAttendanceRules(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAttendanceRuleDto) => ruleService.createAttendanceRule(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", "attendance-rules"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateAttendanceRuleDto }) =>
      ruleService.updateAttendanceRule(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", "attendance-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => ruleService.deleteAttendanceRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules", "attendance-rules"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};
