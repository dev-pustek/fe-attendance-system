import apiClient from "../client";
import { 
  AcademicYear, AcademicYearParams, 
  Class, ClassParams, 
  ClassEnrollment, ClassEnrollmentParams,
  ClassSchedule, ClassScheduleParams, CreateClassScheduleDto, UpdateClassScheduleDto,
  EducationLevel, EducationLevelParams, CreateEducationLevelDto, UpdateEducationLevelDto,
  Major, MajorParams, CreateMajorDto, UpdateMajorDto,
  ClassScheduleOverride, ClassScheduleOverrideParams, CreateClassScheduleOverrideDto, UpdateClassScheduleOverrideDto,
  Grade, GradeParams, CreateGradeDto, UpdateGradeDto,
  ProgramStudy, ProgramStudyParams, CreateProgramStudyDto, UpdateProgramStudyDto,
  Subject, SubjectParams, CreateSubjectDto, UpdateSubjectDto,
  TeacherSubject, TeacherSubjectParams, CreateTeacherSubjectDto, UpdateTeacherSubjectDto, BulkAssignTeacherSubjectDto,
  ClassSubject, ClassSubjectParams, CreateClassSubjectDto, UpdateClassSubjectDto, BulkSyncClassSubjectsDto,
  TeachingAssignment, TeachingAssignmentParams, CreateTeachingAssignmentDto, UpdateTeachingAssignmentDto, BulkSyncTeachingAssignmentsDto,
  TeachingUnitPolicy, TeachingUnitPolicyParams, CreateTeachingUnitPolicyDto, UpdateTeachingUnitPolicyDto,
  WorkloadContract, WorkloadContractParams, CreateWorkloadContractDto, UpdateWorkloadContractDto,
  TeachingScheduleTemplate, TeachingScheduleTemplateParams, CreateTeachingScheduleTemplateDto, UpdateTeachingScheduleTemplateDto,
  DiscoveryTreeResponse,
  GenerateScheduleDto,
  GenerateScheduleResponse,
  GroupedTeacherSubjectsResponse,
  GroupedTeachingAssignmentsResponse,
  TeacherWorkload, 
  TeacherWorkloadParams,
  WorkloadContractsResponse,
  TeacherParams,
  BulkPromoteStudentsDto
} from "../types/academic";
import { BaseResponse, PaginatedResponse } from "../types/common";

export const academicService = {
  // Academic Years
  getAcademicYears: async (params?: AcademicYearParams) => {
    const response = await apiClient.get<PaginatedResponse<AcademicYear>>("/academic-years", { params });
    return response.data;
  },

  getAcademicYearById: async (id: number | string) => {
    const response = await apiClient.get<BaseResponse<AcademicYear>>(`/academic-years/${id}`);
    return response.data;
  },

  createAcademicYear: async (data: Partial<AcademicYear>) => {
    const response = await apiClient.post<BaseResponse<AcademicYear>>("/academic-years", data);
    return response.data;
  },

  updateAcademicYear: async (id: number | string, data: Partial<AcademicYear>) => {
    const response = await apiClient.patch<BaseResponse<AcademicYear>>(`/academic-years/${id}`, data);
    return response.data;
  },

  deleteAcademicYear: async (id: number | string) => {
    await apiClient.delete(`/academic-years/${id}`);
  },

  exportAcademicYearsExcel: async (params?: AcademicYearParams) => {
    const response = await apiClient.get("/academic-years/export/excel", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  exportAcademicYearsPdf: async (params?: AcademicYearParams) => {
    const response = await apiClient.get("/academic-years/export/pdf", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  downloadAcademicYearsTemplate: async (withData?: boolean) => {
    const response = await apiClient.get("/academic-years/template", {
      params: { withData },
      responseType: "blob",
    });
    return response.data as Blob;
  },

  importAcademicYears: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      "/academic-years/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },


  // Classes
  getClasses: async (params?: ClassParams) => {
    const response = await apiClient.get<PaginatedResponse<Class>>("/classes", { params });
    return response.data;
  },

  createClass: async (data: Partial<Class>) => {
    const response = await apiClient.post<BaseResponse<Class>>("/classes", data);
    return response.data;
  },

  updateClass: async (id: number | string, data: Partial<Class>) => {
    const response = await apiClient.patch<BaseResponse<Class>>(`/classes/${id}`, data);
    return response.data;
  },

  deleteClass: async (id: number | string) => {
    await apiClient.delete(`/classes/${id}`);
  },

  exportClassesExcel: async (params?: ClassParams) => {
    const response = await apiClient.get<Blob>("/classes/export/excel", {
      params,
      responseType: 'blob'
    });
    return response.data as unknown as Blob;
  },

  exportClassesPdf: async (params?: ClassParams) => {
    const response = await apiClient.get<Blob>("/classes/export/pdf", {
      params,
      responseType: 'blob'
    });
    return response.data as unknown as Blob;
  },

  downloadClassesTemplate: async (withData: boolean = false) => {
    const response = await apiClient.get<Blob>("/classes/template", {
      params: { withData },
      responseType: 'blob'
    });
    return response.data as unknown as Blob;
  },

  importClasses: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      "/classes/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  getClass: async (id: number | string): Promise<Class> => {
    const response = await apiClient.get<BaseResponse<Class>>(`/classes/${id}`);
    // The interceptor unwraps .data, so we just return response.data which IS the Class object
    return response.data as unknown as Class;
  },

  promoteStudents: async (data: BulkPromoteStudentsDto) => {
    const response = await apiClient.post<BaseResponse<unknown>>("/classes/promote", data);
    return response.data;
  },

  // Class Enrollments
  getClassEnrollments: async (params?: ClassEnrollmentParams) => {
    const response = await apiClient.get<PaginatedResponse<ClassEnrollment>>("/class-enrollments", { params });
    return response.data;
  },

  getClassEnrollmentById: async (id: number | string) => {
    const response = await apiClient.get<BaseResponse<ClassEnrollment>>(`/class-enrollments/${id}`);
    return response.data;
  },

  getClassEnrollmentsByUserId: async (userId: number | string) => {
    const response = await apiClient.get<BaseResponse<ClassEnrollment[]>>(`/class-enrollments/user/${userId}`);
    return response.data;
  },

  createClassEnrollment: async (data: Partial<ClassEnrollment>) => {
    const response = await apiClient.post<BaseResponse<ClassEnrollment>>("/class-enrollments", data);
    return response.data;
  },

  createBulkClassEnrollment: async (data: BulkCreateClassEnrollmentDto) => {
    const response = await apiClient.post<BaseResponse<any>>("/class-enrollments/bulk", data);
    return response.data;
  },

  updateClassEnrollment: async (id: number | string, data: Partial<ClassEnrollment>) => {
    const response = await apiClient.patch<BaseResponse<ClassEnrollment>>(`/class-enrollments/${id}`, data);
    return response.data;
  },

  deleteClassEnrollment: async (id: number | string) => {
    await apiClient.delete(`/class-enrollments/${id}`);
  },

  // Class Schedules
  getClassSchedules: async (params?: ClassScheduleParams) => {
    const response = await apiClient.get<PaginatedResponse<ClassSchedule>>("/class-schedules", { params });
    return response.data;
  },

  createClassSchedule: async (data: CreateClassScheduleDto) => {
    const response = await apiClient.post<BaseResponse<ClassSchedule>>("/class-schedules", data);
    return response.data;
  },

  updateClassSchedule: async (id: number | string, data: UpdateClassScheduleDto) => {
    const response = await apiClient.patch<BaseResponse<ClassSchedule>>(`/class-schedules/${id}`, data);
    return response.data;
  },

  deleteClassSchedule: async (id: number | string) => {
    await apiClient.delete(`/class-schedules/${id}`);
  },

  // Education Levels
  getEducationLevels: async (params?: EducationLevelParams) => {
    const response = await apiClient.get<PaginatedResponse<EducationLevel>>("/education-levels", { params });
    return response.data;
  },

  createEducationLevel: async (data: CreateEducationLevelDto) => {
    const response = await apiClient.post<BaseResponse<EducationLevel>>("/education-levels", data);
    return response.data;
  },

  updateEducationLevel: async (id: number | string, data: UpdateEducationLevelDto) => {
    const response = await apiClient.patch<BaseResponse<EducationLevel>>(`/education-levels/${id}`, data);
    return response.data;
  },

  deleteEducationLevel: async (id: number | string) => {
    await apiClient.delete(`/education-levels/${id}`);
  },

  // Majors
  getMajors: async (params?: MajorParams) => {
    const response = await apiClient.get<PaginatedResponse<Major>>("/majors", { params });
    return response.data;
  },

  createMajor: async (data: CreateMajorDto) => {
    const response = await apiClient.post<BaseResponse<Major>>("/majors", data);
    return response.data;
  },

  updateMajor: async (id: number | string, data: UpdateMajorDto) => {
    const response = await apiClient.patch<BaseResponse<Major>>(`/majors/${id}`, data);
    return response.data;
  },

  deleteMajor: async (id: number | string) => {
    await apiClient.delete(`/majors/${id}`);
  },

  exportMajorsExcel: async (params?: MajorParams) => {
    const response = await apiClient.get<Blob>("/majors/export/excel", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  exportMajorsPdf: async (params?: MajorParams) => {
    const response = await apiClient.get<Blob>("/majors/export/pdf", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  downloadMajorsTemplate: async () => {
    const response = await apiClient.get<Blob>("/majors/template", {
      responseType: "blob",
    });
    return response.data;
  },

  importMajors: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/majors/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  
  // Class Schedule Overrides
  getClassScheduleOverrides: async (params?: ClassScheduleOverrideParams) => {
    const response = await apiClient.get<PaginatedResponse<ClassScheduleOverride>>("/class-schedule-overrides", { params });
    return response.data;
  },

  createClassScheduleOverride: async (data: CreateClassScheduleOverrideDto) => {
    const response = await apiClient.post<BaseResponse<ClassScheduleOverride>>("/class-schedule-overrides", data);
    return response.data;
  },

  updateClassScheduleOverride: async (id: number | string, data: UpdateClassScheduleOverrideDto) => {
    const response = await apiClient.patch<BaseResponse<ClassScheduleOverride>>(`/class-schedule-overrides/${id}`, data);
    return response.data;
  },

  deleteClassScheduleOverride: async (id: number | string) => {
    await apiClient.delete(`/class-schedule-overrides/${id}`);
  },

  // Grades
  getGrades: async (params?: GradeParams) => {
    const response = await apiClient.get<PaginatedResponse<Grade>>("/grades", { params });
    return response.data;
  },

  createGrade: async (data: CreateGradeDto) => {
    const response = await apiClient.post<BaseResponse<Grade>>("/grades", data);
    return response.data;
  },

  updateGrade: async (id: number | string, data: UpdateGradeDto) => {
    const response = await apiClient.patch<BaseResponse<Grade>>(`/grades/${id}`, data);
    return response.data;
  },

  deleteGrade: async (id: number | string) => {
    await apiClient.delete(`/grades/${id}`);
  },

  // Program Studies
  getProgramStudies: async (params?: ProgramStudyParams) => {
    const response = await apiClient.get<PaginatedResponse<ProgramStudy>>("/program-studies", { params });
    return response.data;
  },

  createProgramStudy: async (data: CreateProgramStudyDto) => {
    const response = await apiClient.post<BaseResponse<ProgramStudy>>("/program-studies", data);
    return response.data;
  },

  updateProgramStudy: async (id: number | string, data: UpdateProgramStudyDto) => {
    const response = await apiClient.patch<BaseResponse<ProgramStudy>>(`/program-studies/${id}`, data);
    return response.data;
  },

  deleteProgramStudy: async (id: number | string) => {
    await apiClient.delete(`/program-studies/${id}`);
  },

  // Subjects
  getSubjects: async (params?: SubjectParams) => {
    const response = await apiClient.get<PaginatedResponse<Subject>>("/academic/subjects", { params });
    return response.data;
  },

  createSubject: async (data: CreateSubjectDto) => {
    const response = await apiClient.post<BaseResponse<Subject>>("/academic/subjects", data);
    return response.data;
  },

  updateSubject: async (id: number | string, data: UpdateSubjectDto) => {
    const response = await apiClient.patch<BaseResponse<Subject>>(`/academic/subjects/${id}`, data);
    return response.data;
  },

  deleteSubject: async (id: number | string) => {
    await apiClient.delete(`/academic/subjects/${id}`);
  },

  // Teacher Subjects
  getTeacherSubjects: async (params?: TeacherSubjectParams) => {
    const response = await apiClient.get<PaginatedResponse<TeacherSubject>>("/academic/teacher-subjects", { params });
    return response.data;
  },

  createTeacherSubject: async (data: CreateTeacherSubjectDto) => {
    const response = await apiClient.post<BaseResponse<TeacherSubject>>("/academic/teacher-subjects", data);
    return response.data;
  },

  updateTeacherSubject: async (id: number | string, data: UpdateTeacherSubjectDto) => {
    const response = await apiClient.patch<BaseResponse<TeacherSubject>>(`/academic/teacher-subjects/${id}`, data);
    return response.data;
  },

  deleteTeacherSubject: async (id: number | string) => {
    await apiClient.delete(`/academic/teacher-subjects/${id}`);
  },

  bulkAssignTeacherSubject: async (data: BulkAssignTeacherSubjectDto) => {
    const response = await apiClient.post<BaseResponse<unknown>>("/academic/teacher-subjects/bulk", data);
    return response.data;
  },

  getGroupedTeacherSubjects: async (teacherId?: string) => {
    if (!teacherId) return [];
    const response = await apiClient.get<BaseResponse<GroupedTeacherSubjectsResponse>>(`/academic/teacher-subjects/teacher/${teacherId}/grouped`);
    return response.data.data;
  },

  // Class Subjects
  getClassSubjects: async (params?: ClassSubjectParams) => {
    const response = await apiClient.get<PaginatedResponse<ClassSubject>>("/academic/class-subjects", { params });
    return response.data;
  },

  createClassSubject: async (data: CreateClassSubjectDto) => {
    const response = await apiClient.post<BaseResponse<ClassSubject>>("/academic/class-subjects", data);
    return response.data;
  },

  updateClassSubject: async (id: number | string, data: UpdateClassSubjectDto) => {
    const response = await apiClient.patch<BaseResponse<ClassSubject>>(`/academic/class-subjects/${id}`, data);
    return response.data;
  },

  deleteClassSubject: async (id: number | string) => {
    await apiClient.delete(`/academic/class-subjects/${id}`);
  },

  bulkSyncClassSubjects: async (data: BulkSyncClassSubjectsDto) => {
    const response = await apiClient.post<BaseResponse<unknown>>("/academic/class-subjects/bulk-sync", data);
    return response.data;
  },

  // Teaching Assignments
  getTeachingAssignments: async (params?: TeachingAssignmentParams) => {
    const response = await apiClient.get<PaginatedResponse<TeachingAssignment>>("/academic/teaching-assignments", { params });
    return response.data;
  },

  createTeachingAssignment: async (data: CreateTeachingAssignmentDto) => {
    const response = await apiClient.post<BaseResponse<TeachingAssignment>>("/academic/teaching-assignments", data);
    return response.data;
  },

  updateTeachingAssignment: async (id: number | string, data: UpdateTeachingAssignmentDto) => {
    const response = await apiClient.patch<BaseResponse<TeachingAssignment>>(`/academic/teaching-assignments/${id}`, data);
    return response.data;
  },

  deleteTeachingAssignment: async (id: number | string) => {
    await apiClient.delete(`/academic/teaching-assignments/${id}`);
  },

  getGroupedTeachingAssignments: async (teacherId?: string) => {
    if (!teacherId) return [];
    // Corrected based on user feedback: ensure we hit teaching-assignments, not teacher-subjects
    const response = await apiClient.get<BaseResponse<GroupedTeachingAssignmentsResponse>>(`/academic/teaching-assignments/teacher/${teacherId}/grouped`);
    return response.data.data;
  },


  bulkSyncTeachingAssignments: async (data: BulkSyncTeachingAssignmentsDto) => {
    const response = await apiClient.post<BaseResponse<unknown>>("/academic/teaching-assignments/bulk-sync", data);
    return response.data;
  },

  // Teaching Unit Policies
  getTeachingUnitPolicies: async (params?: TeachingUnitPolicyParams) => {
    const response = await apiClient.get<PaginatedResponse<TeachingUnitPolicy>>("/academic/teaching-unit-policies", { params });
    return response.data;
  },

  createTeachingUnitPolicy: async (data: CreateTeachingUnitPolicyDto) => {
    const response = await apiClient.post<BaseResponse<TeachingUnitPolicy>>("/academic/teaching-unit-policies", data);
    return response.data;
  },

  updateTeachingUnitPolicy: async (id: number | string, data: UpdateTeachingUnitPolicyDto) => {
    const response = await apiClient.patch<BaseResponse<TeachingUnitPolicy>>(`/academic/teaching-unit-policies/${id}`, data);
    return response.data;
  },

  deleteTeachingUnitPolicy: async (id: number | string) => {
    await apiClient.delete(`/academic/teaching-unit-policies/${id}`);
  },

  exportTeachingUnitPoliciesExcel: async (params?: TeachingUnitPolicyParams) => {
    const response = await apiClient.get("/academic/teaching-unit-policies/export/excel", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  exportTeachingUnitPoliciesPdf: async (params?: TeachingUnitPolicyParams) => {
    const response = await apiClient.get("/academic/teaching-unit-policies/export/pdf", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  downloadTeachingUnitPoliciesTemplate: async (withData?: boolean) => {
    const response = await apiClient.get("/academic/teaching-unit-policies/template", {
      params: { withData },
      responseType: "blob",
    });
    return response.data as Blob;
  },

  importTeachingUnitPolicies: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ created: number; updated: number; errors: string[] }>(
      "/academic/teaching-unit-policies/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  getActiveTeachingUnitPolicy: async () => {
    const response = await apiClient.get<BaseResponse<TeachingUnitPolicy>>("/academic/teaching-unit-policies/active");
    return response.data;
  },

  // Workload Contracts
  getWorkloadContracts: async (params?: WorkloadContractParams) => {
    const response = await apiClient.get<WorkloadContractsResponse>("/academic/workload-contracts", { params });
    return response.data;
  },

  createWorkloadContract: async (data: CreateWorkloadContractDto) => {
    const response = await apiClient.post<BaseResponse<WorkloadContract>>("/academic/workload-contracts", data);
    return response.data;
  },

  updateWorkloadContract: async (id: number | string, data: UpdateWorkloadContractDto) => {
    const response = await apiClient.patch<BaseResponse<WorkloadContract>>(`/academic/workload-contracts/${id}`, data);
    return response.data;
  },

  deleteWorkloadContract: async (id: number | string) => {
    await apiClient.delete(`/academic/workload-contracts/${id}`);
  },




  // Teachers
  getTeachers: async (params?: TeacherParams) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await apiClient.get<PaginatedResponse<any>>("/academic/teachers", { params });
    return response.data;
  },

  getTeacherWorkloads: async (params?: TeacherWorkloadParams) => {
    const response = await apiClient.get<BaseResponse<TeacherWorkload[]>>("/academic/teacher-workloads", { params });
    return response.data;
  },

  // Teaching Schedule Templates
  getTeachingScheduleTemplates: async (params?: TeachingScheduleTemplateParams) => {
    const response = await apiClient.get<PaginatedResponse<TeachingScheduleTemplate>>("/academic/teaching-schedule-templates", { params });
    return response.data;
  },

  createTeachingScheduleTemplate: async (data: CreateTeachingScheduleTemplateDto) => {
    const response = await apiClient.post<BaseResponse<TeachingScheduleTemplate>>("/academic/teaching-schedule-templates", data);
    return response.data;
  },

  updateTeachingScheduleTemplate: async (id: number | string, data: UpdateTeachingScheduleTemplateDto) => {
    const response = await apiClient.patch<BaseResponse<TeachingScheduleTemplate>>(`/academic/teaching-schedule-templates/${id}`, data);
    return response.data;
  },

  deleteTeachingScheduleTemplate: async (id: number | string) => {
    await apiClient.delete(`/academic/teaching-schedule-templates/${id}`);
  },

  // Discovery Tree
  getDiscoveryTree: async () => {
    const response = await apiClient.get<DiscoveryTreeResponse>("/academic/discovery/tree");
    return response.data;
  },

  // Schedule Generator
  generateSchedules: async (data: GenerateScheduleDto) => {
    const response = await apiClient.post<GenerateScheduleResponse>("/schedules/generate", data);
    return response.data;
  },

  // Print Schedule
  printClassSchedule: async (classId: number | string) => {
    const response = await apiClient.get(`/academic/class-schedules/print/${classId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  printTeacherSchedule: async (teacherId: number | string) => {
    const response = await apiClient.get(`/academic/class-schedules/print/teacher/${teacherId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  exportExcelClassSchedule: async (classId: number | string) => {
    const response = await apiClient.get(`/academic/class-schedules/export/excel/${classId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  exportExcelTeacherSchedule: async (teacherId: number | string) => {
    const response = await apiClient.get(`/academic/class-schedules/export/excel/teacher/${teacherId}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

