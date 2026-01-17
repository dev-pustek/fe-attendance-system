import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiService } from "../services/aiService";
import { PaginationParams } from "../types/common";

export const useRegisterFace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => aiService.registerFace(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "templates"] });
    },
  });
};

export const useVerifyFace = () => {
  return useMutation({
    mutationFn: (file: File) => aiService.verifyFace(file),
  });
};

export const useAllFaceTemplates = (params?: PaginationParams & { userId?: string }) => {
  return useQuery({
    queryKey: ["ai", "templates", params],
    queryFn: () => aiService.getAllTemplates(params),
  });
};

export const useDeleteFaceTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "templates"] });
    },
  });
};

export const useFaceDetections = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["ai", "detections", params],
    queryFn: () => aiService.getDetections(params),
  });
};

export const useFaceMatches = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["ai", "matches", params],
    queryFn: () => aiService.getMatches(params),
  });
};
