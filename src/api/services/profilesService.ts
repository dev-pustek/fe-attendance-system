import apiClient from "../client";
import { StudentProfile, EmployeeProfile, ParentProfile, CreateStudentDto, UpdateStudentDto, CreateEmployeeDto, UpdateEmployeeDto, CreateParentDto, UpdateParentDto, AssignStudentDto } from "../types";
import { PaginationParams, PaginatedResponse, BaseResponse } from "../types/common";

export const profilesService = {
  // Students
  getStudents: async (params?: PaginationParams): Promise<PaginatedResponse<StudentProfile>> => {
    const response = await apiClient.get<PaginatedResponse<StudentProfile>>("/profiles/students", { params });
    return response.data;
  },

  getStudent: async (userId: string): Promise<StudentProfile> => {
    const response = await apiClient.get<StudentProfile>(`/profiles/students/${userId}`);
    return response.data;
  },

  createStudent: async (data: CreateStudentDto): Promise<StudentProfile> => {
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
          }
        });
        const response = await apiClient.post<StudentProfile>("/profiles/students", formData);
        return response.data;
    } else {
        const response = await apiClient.post<StudentProfile>("/profiles/students", data);
        return response.data;
    }
  },

  updateStudent: async (userId: string, data: UpdateStudentDto): Promise<StudentProfile> => {
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
          }
        });
        const response = await apiClient.patch<StudentProfile>(`/profiles/students/${userId}`, formData);
        return response.data;
    } else {
        const response = await apiClient.patch<StudentProfile>(`/profiles/students/${userId}`, data);
        return response.data;
    }
  },

  deleteStudent: async (userId: string): Promise<void> => {
    await apiClient.delete(`/profiles/students/${userId}`);
  },

  exportStudentsExcel: async (params?: any) => {
    const response = await apiClient.get("/profiles/students/export/excel", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  exportStudentsPdf: async (params?: any) => {
    const response = await apiClient.get("/profiles/students/export/pdf", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  downloadStudentsTemplate: async (withData?: boolean, academicYearId?: string) => {
    const response = await apiClient.get("/profiles/students/template", {
      params: { withData, academicYearId },
      responseType: "blob",
    });
    return response.data as Blob;
  },

  importStudents: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      "/profiles/students/import",
      formData
    );
    return response.data;
  },

  // Employees
  getEmployees: async (params?: PaginationParams): Promise<PaginatedResponse<EmployeeProfile>> => {
    const response = await apiClient.get<PaginatedResponse<EmployeeProfile>>("/profiles/employees", { params });
    return response.data;
  },

  getEmployee: async (userId: string): Promise<EmployeeProfile> => {
    const response = await apiClient.get<EmployeeProfile>(`/profiles/employees/${userId}`);
    return response.data;
  },

  createEmployee: async (data: CreateEmployeeDto): Promise<EmployeeProfile> => {
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
          }
        });
        const response = await apiClient.post<EmployeeProfile>("/profiles/employees", formData);
        return response.data;
    } else {
        const response = await apiClient.post<EmployeeProfile>("/profiles/employees", data);
        return response.data;
    }
  },

  updateEmployee: async (userId: string, data: UpdateEmployeeDto): Promise<EmployeeProfile> => {
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
          }
        });
        const response = await apiClient.patch<EmployeeProfile>(`/profiles/employees/${userId}`, formData);
        return response.data;
    } else {
        const response = await apiClient.patch<EmployeeProfile>(`/profiles/employees/${userId}`, data);
        return response.data;
    }
  },

  deleteEmployee: async (userId: string): Promise<void> => {
    await apiClient.delete(`/profiles/employees/${userId}`);
  },

  exportEmployeesExcel: async (params?: any) => {
    const response = await apiClient.get("/profiles/employees/export/excel", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  exportEmployeesPdf: async (params?: any) => {
    const response = await apiClient.get("/profiles/employees/export/pdf", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  downloadEmployeesTemplate: async (withData?: boolean) => {
    const response = await apiClient.get("/profiles/employees/template", {
      params: { withData },
      responseType: "blob",
    });
    return response.data as Blob;
  },

  importEmployees: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      "/profiles/employees/import",
      formData
    );
    return response.data;
  },

  // Parents
  getParents: async (params?: PaginationParams): Promise<PaginatedResponse<ParentProfile>> => {
    const response = await apiClient.get<PaginatedResponse<ParentProfile>>("/parent-profiles", { params });
    return response.data;
  },

  getParent: async (userId: string): Promise<ParentProfile> => {
    const response = await apiClient.get<ParentProfile>(`/parent-profiles/${userId}`);
    return response.data;
  },

  createParent: async (data: CreateParentDto): Promise<ParentProfile> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value instanceof File ? value : String(value));
      }
    });
    const response = await apiClient.post<ParentProfile>("/parent-profiles", formData);
    return response.data;
  },

  updateParent: async (userId: string, data: UpdateParentDto): Promise<ParentProfile> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value instanceof File ? value : String(value));
      }
    });
    const response = await apiClient.patch<ParentProfile>(`/parent-profiles/${userId}`, formData);
    return response.data;
  },

  deleteParent: async (userId: string): Promise<void> => {
    await apiClient.delete(`/parent-profiles/${userId}`);
  },

  exportParentsExcel: async (params?: any) => {
    const response = await apiClient.get("/parent-profiles/export/excel", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  exportParentsPdf: async (params?: any) => {
    const response = await apiClient.get("/parent-profiles/export/pdf", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  downloadParentsTemplate: async (withData?: boolean) => {
    const response = await apiClient.get("/parent-profiles/template", {
      params: { withData },
      responseType: "blob",
    });
    return response.data as Blob;
  },

  importParents: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      "/parent-profiles/import",
      formData
    );
    return response.data;
  },

  // Parent-Student Relation
  getParentStudents: async (parentId: string): Promise<PaginatedResponse<StudentProfile>> => {
    const response = await apiClient.get<PaginatedResponse<StudentProfile>>(`/parent-profiles/${parentId}/students`);
    return response.data;
  },

  assignStudentToParent: async (data: AssignStudentDto): Promise<void> => {
      await apiClient.post("/student-parents", data);
  },

  getStudentParents: async (studentId: string): Promise<BaseResponse<ParentProfile[]>> => {
      const response = await apiClient.get<BaseResponse<ParentProfile[]>>(`/student-parents?studentId=${studentId}&include=parent`);
      return response.data;
  }
};
