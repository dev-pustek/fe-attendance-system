import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profilesService } from "../services/profilesService";
import { PaginationParams } from "../types/common";
import { 
  CreateStudentDto, UpdateStudentDto, 
  CreateEmployeeDto, UpdateEmployeeDto, 
  CreateParentDto, UpdateParentDto,
  AssignStudentDto 
} from "../types/profiles";
import { showSuccess, showError } from "../../utils/toast";

export const useStudents = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["profiles", "students", params],
    queryFn: () => profilesService.getStudents(params),
  });
};

export const useStudent = (userId: string) => {
  return useQuery({
    queryKey: ["profiles", "students", userId],
    queryFn: () => profilesService.getStudent(userId),
    enabled: !!userId,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentDto) => profilesService.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "students"] });
      showSuccess("Student profile created successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateStudentDto }) => 
      profilesService.updateStudent(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "students"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", "students", variables.userId] });
      showSuccess("Student profile updated successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => profilesService.deleteStudent(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "students"] });
      showSuccess("Student profile deleted successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useEmployees = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["profiles", "employees", params],
    queryFn: () => profilesService.getEmployees(params),
  });
};

export const useEmployee = (userId: string) => {
  return useQuery({
    queryKey: ["profiles", "employees", userId],
    queryFn: () => profilesService.getEmployee(userId),
    enabled: !!userId,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeDto) => profilesService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "employees"] });
      showSuccess("Employee profile created successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateEmployeeDto }) => 
      profilesService.updateEmployee(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "employees"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", "employees", variables.userId] });
      showSuccess("Employee profile updated successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => profilesService.deleteEmployee(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "employees"] });
      showSuccess("Employee profile deleted successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useParents = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ["profiles", "parents", params],
    queryFn: () => profilesService.getParents(params),
  });
};

export const useParent = (userId: string) => {
  return useQuery({
    queryKey: ["profiles", "parents", userId],
    queryFn: () => profilesService.getParent(userId),
    enabled: !!userId,
  });
};

export const useCreateParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateParentDto) => profilesService.createParent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "parents"] });
      showSuccess("Parent profile created successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useUpdateParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateParentDto }) => 
      profilesService.updateParent(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "parents"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", "parents", variables.userId] });
      showSuccess("Parent profile updated successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useDeleteParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => profilesService.deleteParent(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "parents"] });
      showSuccess("Parent profile deleted successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useParentStudents = (parentId?: string) => {
  return useQuery({
    queryKey: ["profiles", "parents", parentId, "students"],
    queryFn: () => {
      if (!parentId) throw new Error("Parent ID is required");
      return profilesService.getParentStudents(parentId);
    },
    enabled: !!parentId,
  });
};

export const useAssignStudentToParent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignStudentDto) => profilesService.assignStudentToParent(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "parents", variables.parentId, "students"] });
      showSuccess("Student assigned successfully");
    },
    onError: (error) => showError(error),
  });
};

export const useStudentParents = (studentId?: string) => {
  return useQuery({
    queryKey: ["profiles", "students", studentId, "parents"],
    queryFn: () => {
      if (!studentId) throw new Error("Student ID is required");
      return profilesService.getStudentParents(studentId);
    },
    enabled: !!studentId,
  });
};
