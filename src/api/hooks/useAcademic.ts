import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicService } from "../services/academicService";
import {
  AcademicYear,
  AcademicYearParams,
  ClassParams,
  CreateClassDto,
  UpdateClassDto,
  ClassEnrollment,
  ClassEnrollmentParams,
  ClassScheduleParams,
  CreateClassScheduleDto,
  UpdateClassScheduleDto,
  EducationLevelParams,
  CreateEducationLevelDto,
  UpdateEducationLevelDto,
  MajorParams,
  CreateMajorDto,
  UpdateMajorDto,
  ClassScheduleOverrideParams,
  CreateClassScheduleOverrideDto,
  UpdateClassScheduleOverrideDto,
  GradeParams,
  CreateGradeDto,
  UpdateGradeDto,
  ProgramStudyParams,
  CreateProgramStudyDto,
  UpdateProgramStudyDto,
  Subject,
  SubjectParams,
  CreateSubjectDto,
  UpdateSubjectDto,
  TeacherSubject,
  TeacherSubjectParams,
  CreateTeacherSubjectDto,
  UpdateTeacherSubjectDto,
  BulkAssignTeacherSubjectDto,
  ClassSubject,
  ClassSubjectParams,
  CreateClassSubjectDto,
  UpdateClassSubjectDto,
  BulkSyncClassSubjectsDto,
  TeachingAssignment,
  TeachingAssignmentParams,
  CreateTeachingAssignmentDto,
  UpdateTeachingAssignmentDto,
  BulkSyncTeachingAssignmentsDto,
  TeachingUnitPolicy,
  TeachingUnitPolicyParams,
  CreateTeachingUnitPolicyDto,
  UpdateTeachingUnitPolicyDto,
  WorkloadContractParams,
  CreateWorkloadContractDto,
  UpdateWorkloadContractDto,
  TeachingScheduleTemplate,
  TeachingScheduleTemplateParams,
  CreateTeachingScheduleTemplateDto,
  UpdateTeachingScheduleTemplateDto,
  DiscoveryTreeResponse,
  GroupedTeacherSubjectsResponse,
  GroupedTeachingAssignmentsResponse,
  WorkloadContractsResponse,
  BulkCreateClassEnrollmentDto,
  BulkPromoteStudentsDto
} from "../types/academic";
import { PaginatedResponse } from "../types/common";

export const useAcademicYears = (params?: AcademicYearParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "years", params],
    queryFn: () => academicService.getAcademicYears(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AcademicYear>) =>
      academicService.createAcademicYear(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "years"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: Partial<AcademicYear>;
    }) => academicService.updateAcademicYear(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "years"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteAcademicYear(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "years"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useAcademicYearsInfinite = (params?: Omit<AcademicYearParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ["academic", "years", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getAcademicYears({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useImportAcademicYears = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => academicService.importAcademicYears(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["academic", "years"] }),
  });
};

export const useClasses = (params?: ClassParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "classes", params],
    queryFn: () => academicService.getClasses(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClassDto) => academicService.createClass(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateClassDto }) =>
      academicService.updateClass(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteClass(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClassDto) => academicService.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] });
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateClassDto }) =>
      academicService.updateClass(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] });
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => academicService.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] });
    },
  });
};

export const useClass = (id: string | number) => {
  return useQuery({
    queryKey: ["academic", "classes", id],
    queryFn: () => academicService.getClass(id),
    enabled: !!id,
  });
};

export const useClassesInfinite = (params?: Omit<ClassParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ["academic", "classes", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getClasses({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useImportClasses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => academicService.importClasses(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] });
    },
  });
};

export const usePromoteStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkPromoteStudentsDto) => academicService.promoteStudents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "classes"] });
      queryClient.invalidateQueries({ queryKey: ["academic", "enrollments"] });
    },
  });
};

export const useClassEnrollments = (params?: ClassEnrollmentParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "enrollments", params],
    queryFn: () => academicService.getClassEnrollments(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ClassEnrollment>) =>
      academicService.createClassEnrollment(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "enrollments"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: Partial<ClassEnrollment>;
    }) => academicService.updateClassEnrollment(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "enrollments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteClassEnrollment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "class-enrollments"] }),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: BulkCreateClassEnrollmentDto) => academicService.createBulkClassEnrollment(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "class-enrollments"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation, bulkCreateMutation };
};

export const useClassEnrollmentsByUser = (userId?: number | string) => {
  return useQuery({
    queryKey: ["academic", "enrollments", "user", userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return academicService.getClassEnrollmentsByUserId(userId);
    },
    enabled: !!userId,
  });
};

export const useClassSchedules = (params?: ClassScheduleParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "schedules", params],
    queryFn: () => academicService.getClassSchedules(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClassScheduleDto) =>
      academicService.createClassSchedule(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "schedules"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateClassScheduleDto;
    }) => academicService.updateClassSchedule(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "schedules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteClassSchedule(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "schedules"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};
export const useEducationLevels = (params?: EducationLevelParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "education-levels", params],
    queryFn: () => academicService.getEducationLevels(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEducationLevelDto) =>
      academicService.createEducationLevel(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "education-levels"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateEducationLevelDto;
    }) => academicService.updateEducationLevel(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "education-levels"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteEducationLevel(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "education-levels"],
      }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useMajors = (params?: MajorParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "majors", params],
    queryFn: () => academicService.getMajors(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMajorDto) => academicService.createMajor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "majors"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateMajorDto }) =>
      academicService.updateMajor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "majors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteMajor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "majors"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useMajorsInfinite = (params?: Omit<MajorParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ["academic", "majors", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getMajors({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useImportMajors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => academicService.importMajors(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "majors"] });
    },
  });
};

export const useClassScheduleOverrides = (
  params?: ClassScheduleOverrideParams
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "schedule-overrides", params],
    queryFn: () => academicService.getClassScheduleOverrides(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClassScheduleOverrideDto) =>
      academicService.createClassScheduleOverride(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "schedule-overrides"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateClassScheduleOverrideDto;
    }) => academicService.updateClassScheduleOverride(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "schedule-overrides"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteClassScheduleOverride(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "schedule-overrides"],
      }),
  });

  return {
    ...query,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};

export const useClassScheduleOverridesInfinite = (
  params?: ClassScheduleOverrideParams
) => {
  return useInfiniteQuery({
    queryKey: ["academic", "schedule-overrides", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getClassScheduleOverrides({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useGradesInfinite = (params?: Omit<GradeParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ["academic", "grades", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getGrades({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useGrades = (params?: GradeParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "grades", params],
    queryFn: () => academicService.getGrades(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGradeDto) => academicService.createGrade(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "grades"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateGradeDto }) =>
      academicService.updateGrade(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "grades"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteGrade(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "grades"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useProgramStudies = (params?: ProgramStudyParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic", "program-studies", params],
    queryFn: () => academicService.getProgramStudies(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProgramStudyDto) =>
      academicService.createProgramStudy(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "program-studies"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateProgramStudyDto;
    }) => academicService.updateProgramStudy(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "program-studies"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteProgramStudy(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "program-studies"],
      }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useProgramStudiesInfinite = (params?: ProgramStudyParams) => {
  return useInfiniteQuery({
    queryKey: ["academic", "program-studies", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getProgramStudies({ ...params, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta;
      return meta && meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useSubjects = (params?: SubjectParams) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResponse<Subject>>({
    queryKey: ["academic", "subjects", params],
    queryFn: () => academicService.getSubjects(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSubjectDto) => academicService.createSubject(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "subjects"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateSubjectDto;
    }) => academicService.updateSubject(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "subjects"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteSubject(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["academic", "subjects"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useSubjectsInfinite = (params?: SubjectParams) => {
  return useInfiniteQuery({
    queryKey: ["academic", "subjects", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getSubjects({ ...params, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<Subject>) => {
      const meta = lastPage?.meta;
      return meta && meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useTeacherSubjects = (params?: TeacherSubjectParams) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResponse<TeacherSubject>>({
    queryKey: ["academic", "teacher-subjects", params],
    queryFn: () => academicService.getTeacherSubjects(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTeacherSubjectDto) =>
      academicService.createTeacherSubject(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teacher-subjects"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateTeacherSubjectDto;
    }) => academicService.updateTeacherSubject(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teacher-subjects"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteTeacherSubject(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teacher-subjects"],
      }),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (data: BulkAssignTeacherSubjectDto) =>
      academicService.bulkAssignTeacherSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "teacher-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["academic", "subjects"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation, bulkAssignMutation };
};

export const useGroupedTeacherSubjects = (teacherId?: string) => {
  return useQuery<GroupedTeacherSubjectsResponse>({
    queryKey: ["academic", "teacher-subjects", "grouped", teacherId],
    queryFn: () => academicService.getGroupedTeacherSubjects(teacherId),
    enabled: !!teacherId,
  });
};

export const useClassSubjects = (params?: ClassSubjectParams) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResponse<ClassSubject>>({
    queryKey: ["academic", "class-subjects", params],
    queryFn: () => academicService.getClassSubjects(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClassSubjectDto) =>
      academicService.createClassSubject(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "class-subjects"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateClassSubjectDto;
    }) => academicService.updateClassSubject(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "class-subjects"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => academicService.deleteClassSubject(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "class-subjects"],
      }),
  });

  const bulkSyncMutation = useMutation({
    mutationFn: (data: BulkSyncClassSubjectsDto) =>
      academicService.bulkSyncClassSubjects(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "class-subjects"],
      }),
  });

  return {
    ...query,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkSyncMutation,
  };
};

export const useTeachingAssignments = (params?: TeachingAssignmentParams) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResponse<TeachingAssignment>>({
    queryKey: ["academic", "teaching-assignments", params],
    queryFn: () => academicService.getTeachingAssignments(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTeachingAssignmentDto) =>
      academicService.createTeachingAssignment(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-assignments"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateTeachingAssignmentDto;
    }) => academicService.updateTeachingAssignment(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-assignments"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteTeachingAssignment(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-assignments"],
      }),
  });

  const bulkSyncMutation = useMutation({
    mutationFn: (data: BulkSyncTeachingAssignmentsDto) =>
      academicService.bulkSyncTeachingAssignments(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-assignments"],
      }),
  });

  return {
    ...query,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkSyncMutation,
  };
};

export const useGroupedTeachingAssignments = (teacherId?: string) => {
  return useQuery<GroupedTeachingAssignmentsResponse>({
    queryKey: ["academic", "teaching-assignments", "grouped", teacherId],
    queryFn: () => academicService.getGroupedTeachingAssignments(teacherId),
    enabled: !!teacherId,
  });
};



export const useTeachingUnitPolicies = (params?: TeachingUnitPolicyParams) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResponse<TeachingUnitPolicy>>({
    queryKey: ["academic", "teaching-unit-policies", params],
    queryFn: () => academicService.getTeachingUnitPolicies(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTeachingUnitPolicyDto) =>
      academicService.createTeachingUnitPolicy(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-unit-policies"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateTeachingUnitPolicyDto;
    }) => academicService.updateTeachingUnitPolicy(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-unit-policies"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteTeachingUnitPolicy(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-unit-policies"],
      }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useTeachingUnitPoliciesInfinite = (params?: Omit<TeachingUnitPolicyParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ["academic", "teaching-unit-policies", "infinite", params],
    queryFn: ({ pageParam = 1 }) =>
      academicService.getTeachingUnitPolicies({ ...params, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useImportTeachingUnitPolicies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => academicService.importTeachingUnitPolicies(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic", "teaching-unit-policies"] });
    },
  });
};

export const useWorkloadContracts = (params?: WorkloadContractParams) => {
  const queryClient = useQueryClient();

  const query = useQuery<WorkloadContractsResponse>({
    queryKey: ["academic", "workload-contracts", params],
    queryFn: () => academicService.getWorkloadContracts(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkloadContractDto) =>
      academicService.createWorkloadContract(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "workload-contracts"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateWorkloadContractDto;
    }) => academicService.updateWorkloadContract(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "workload-contracts"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteWorkloadContract(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "workload-contracts"],
      }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useTeachingScheduleTemplates = (
  params?: TeachingScheduleTemplateParams
) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResponse<TeachingScheduleTemplate>>({
    queryKey: ["academic", "teaching-schedule-templates", params],
    queryFn: () => academicService.getTeachingScheduleTemplates(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTeachingScheduleTemplateDto) =>
      academicService.createTeachingScheduleTemplate(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-schedule-templates"],
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateTeachingScheduleTemplateDto;
    }) => academicService.updateTeachingScheduleTemplate(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-schedule-templates"],
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      academicService.deleteTeachingScheduleTemplate(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-schedule-templates"],
      }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useDiscoveryTree = () => {
  return useQuery<DiscoveryTreeResponse>({
    queryKey: ["academic", "discovery", "tree"],
    queryFn: () => academicService.getDiscoveryTree(),
  });
};

export const useBulkSyncClassSubjects = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkSyncClassSubjectsDto) =>
      academicService.bulkSyncClassSubjects(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "class-subjects"],
      }),
  });
};

export const useBulkSyncTeachingAssignments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkSyncTeachingAssignmentsDto) =>
      academicService.bulkSyncTeachingAssignments(data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["academic", "teaching-assignments"],
      }),
  });
};
