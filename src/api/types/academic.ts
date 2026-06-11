import { User } from "./user";

export interface AcademicYear {
  id: number | string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: number | string;
  code: string;
  name: string;
  gradeId?: number | string | null;
  educationLevelId?: number | string | null;
  majorId?: number | string | null;
  academicYearId?: number | string | null;
  roomNumber?: string;
  maxCapacity?: number;
  homeroomTeacherId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  grade?: {
    id: number | string;
    code: string;
    name: string;
    educationLevelId?: number | string | null;
  } | null;
  educationLevel?: EducationLevel | null;
  major?: Major | null;
  academicYear?: AcademicYear | null;
  homeroomTeacher?: User | null;
  totalStudents?: number;
  totalPlannedJP?: number;
  totalScheduledJP?: number;
}

export interface CreateClassDto {
  code: string;
  name: string;
  educationLevelId: number | string;
  gradeId: number | string;
  majorId: number | string;
  academicYearId: number | string;
  homeroomTeacherId: string | null;
  roomNumber: string;
  maxCapacity: number;
  isActive: boolean;
}

export interface UpdateClassDto extends Partial<CreateClassDto> {
  isActive?: boolean;
}

export interface ClassEnrollment {
  id: number | string;
  userId: number | string;
  classId: number | string;
  academicYearId: number | string;
  enrollmentDate: string;
  withdrawalDate?: string | null;
  status: 'active' | 'withdrawn' | 'graduated' | 'transferred';
  created_at: string;
  updated_at: string;
  
  // Populated fields
  user?: User;
  class?: Class;
  academicYear?: AcademicYear;
}

export interface AcademicYearParams {
  search?: string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface ClassParams {
  search?: string;
  grade?: number | string;
  major?: string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface ClassEnrollmentParams {
  search?: string;
  userId?: number | string;
  classId?: number | string;
  academicYearId?: number | string;
  status?: string;
  page?: number | string;
  limit?: number | string;
}

export interface BulkCreateClassEnrollmentDto {
  classId: number | string;
  academicYearId: number | string;
  userIds: string[];
  enrollmentDate: string;
  status: 'active' | 'withdrawn' | 'graduated' | 'transferred';
}

export interface StudentPromotionDto {
  userId: string;
  action: 'promote' | 'retain' | 'graduate';
  targetClassId?: number | string;
}

export interface BulkPromoteStudentsDto {
  fromClassId: number | string;
  students: StudentPromotionDto[];
}

export interface ClassSchedule {
  id: number | string;
  classId: number | string;
  academicYearId: number | string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  earlyLeaveThresholdMinutes: number;
  createdAt: string;
  updatedAt: string;

  // Relations
  class?: Class;
  academicYear?: AcademicYear;
}

export interface CreateClassScheduleDto {
  classId: number | string;
  academicYearId: number | string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  earlyLeaveThresholdMinutes: number;
}

export type UpdateClassScheduleDto = Partial<CreateClassScheduleDto>;

export interface ClassScheduleParams {
  search?: string;
  classId?: number | string;
  academicYearId?: number | string;
  dayOfWeek?: string;
  page?: number | string;
  limit?: number | string;
}
export interface EducationLevel {
  id: number | string;
  code: string;
  name: string;
  requiresMajor: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    majorsCount: number;
    gradesCount: number;
    programStudiesCount: number;
    subjectsCount: number;
  };
}

export interface EducationLevelParams {
  search?: string;
  isActive?: boolean | string;
  teacherId?: string;

  withMetrics?: boolean;
  page?: number | string;
  limit?: number | string;
}

export interface CreateEducationLevelDto {
  code: string;
  name: string;
  requiresMajor: boolean;
  isActive: boolean;
}

export type UpdateEducationLevelDto = Partial<CreateEducationLevelDto>;

export interface Major {
  id: number | string;
  educationLevelId: number;
  programStudyId: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  educationLevel?: EducationLevel | null;
  programStudy?: ProgramStudy | null;
  metrics?: {
    classesCount: number;
    subjectsCount: number;
  };
}

export interface MajorParams {
  search?: string;
  educationLevelId?: number | string;
  programStudyId?: number | string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
  withMetrics?: boolean;
}

export interface CreateMajorDto {
  educationLevelId: number;
  programStudyId: number;
  code: string;
  name: string;
  isActive: boolean;
}

export type UpdateMajorDto = Partial<CreateMajorDto>;

export interface ClassScheduleOverride {
  id: number | string;
  classId: number | string;
  overrideDate: string;
  startTime: string | null;
  endTime: string | null;
  isHoliday: boolean;
  reason: string;
  createdAt: string;
  class?: Class;
}

export interface ClassScheduleOverrideParams {
  classId?: number | string;
  startDate?: string;
  endDate?: string;
  page?: number | string;
  limit?: number | string;
}

export interface CreateClassScheduleOverrideDto {
  classId: number | string;
  overrideDate: string;
  startTime: string | null;
  endTime: string | null;
  isHoliday: boolean;
  reason: string;
}

export type UpdateClassScheduleOverrideDto = Partial<CreateClassScheduleOverrideDto>;

export interface Grade {
  id: number | string;
  code: string;
  name: string;
  educationLevelId: number | string | null;
  educationLevel?: EducationLevel | null;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    classesCount: number;
    subjectsCount: number;
  };
}

export interface GradeParams {
  search?: string;
  educationLevelId?: number | string;
  page?: number | string;
  limit?: number | string;
  withMetrics?: boolean;
}

export interface CreateGradeDto {
  code: string;
  name: string;
  educationLevelId: number;
}

export type UpdateGradeDto = Partial<CreateGradeDto>;

export interface ProgramStudy {
  id: number | string;
  educationLevelId: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  educationLevel?: EducationLevel | null;
  metrics?: {
    majorsCount: number;
    subjectsCount: number;
  };
}

export interface ProgramStudyParams {
  search?: string;
  educationLevelId?: number | string;
  page?: number | string;
  limit?: number | string;
  isActive?: boolean | string;
  teacherId?: string;

  withMetrics?: boolean;
}

export interface CreateProgramStudyDto {
  educationLevelId: number;
  code: string;
  name: string;
  isActive: boolean;
}

export type UpdateProgramStudyDto = Partial<CreateProgramStudyDto>;

export interface Subject {
  id: number | string;
  majorId?: number | null;
  gradeId?: number | null;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  major?: Major | null;
  grade?: Grade | null;
  teacherSubjects?: TeacherSubject[];
  units?: number;
  metrics?: {
    classesCount: number;
    teachersCount?: number;
  };
}

export interface SubjectParams {
  search?: string;
  majorId?: number | string;
  gradeId?: number | string;
  educationLevelId?: number | string;
  page?: number | string;
  limit?: number | string;
  isActive?: boolean | string;
  teacherId?: string;

}

export interface CreateSubjectDto {
  code: string;
  name: string;
  isActive: boolean;
  majorId?: number | null;
  gradeId?: number | null;
}

export type UpdateSubjectDto = Partial<CreateSubjectDto>;

export interface TeacherSubject {
  id: number | string;
  teacherId: string;
  subjectId: number | string;
  isActive: boolean;
  createdAt: string;
  teacher?: User;
  subject?: Subject;
}

export interface TeacherSubjectParams {
  search?: string;
  teacherId?: string;
  subjectId?: number | string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface CreateTeacherSubjectDto {
  teacherId: string;
  subjectId: number | string;
  isActive?: boolean;
}

export type UpdateTeacherSubjectDto = Partial<CreateTeacherSubjectDto>;

export interface BulkAssignTeacherSubjectDto {
  subjectId: number | string;
  teacherIds: string[];
}

export interface ClassSubject {
  id: number | string;
  classId: number | string;
  subjectId: number | string;
  academicYearId: number | string;
  plannedTotalUnits?: number;
  plannedUnitsPerWeek?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  class?: Class;
  subject?: Subject;
  academicYear?: AcademicYear;
  teachingAssignments?: TeachingAssignment[];
}

export interface ClassSubjectParams {
  search?: string;
  classId?: number | string;
  subjectId?: number | string;
  academicYearId?: number | string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface CreateClassSubjectDto {
  classId: number | string;
  subjectId: number | string;
  academicYearId: number | string;
  plannedTotalUnits?: number;
  plannedUnitsPerWeek?: number;
  isActive?: boolean;
}

export type UpdateClassSubjectDto = Partial<CreateClassSubjectDto>;

export interface BulkSyncClassSubjectsDto {
  classId: number | string;
  academicYearId: number | string;
  subjects: {
    subjectId: number | string;
    plannedTotalUnits: number;
    plannedUnitsPerWeek: number;
  }[];
}

export interface TeacherParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  educationLevelId?: number | string;
  gradeId?: number | string;
  majorId?: number | string;
  programStudyId?: number | string;
}

export interface TeachingAssignment {
  id: number | string;
  classSubjectId: number | string;
  teacherId: string;
  role: "primary" | "assistant";
  isActive: boolean;
  assignedAt: string;
  createdAt: string;
  classSubject?: ClassSubject;
  teacher?: User;
}

export interface TeachingAssignmentParams {
  search?: string;
  classSubjectId?: number | string;
  teacherId?: string;
  role?: string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface CreateTeachingAssignmentDto {
  classSubjectId: number | string;
  teacherId: string;
  role: "primary" | "assistant";
  isActive?: boolean;
}

export type UpdateTeachingAssignmentDto = Partial<CreateTeachingAssignmentDto>;

export interface BulkSyncTeachingAssignmentsDto {
  assignments: {
    classSubjectId: number | string;
    teacherId: string;
    role: "primary" | "assistant";
  }[];
}

// ... (Keeping previous code context if possible, but simplest is to just perform the replace on the specific lines)
export interface TeachingUnitPolicy {
  id: number | string;
  academicYearId: number | string;
  minutesPerUnit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear?: AcademicYear;
}

export interface TeachingUnitPolicyParams {
  academicYearId?: number | string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface CreateTeachingUnitPolicyDto {
  academicYearId: number | string;
  minutesPerUnit: number;
  isActive?: boolean;
}


export type UpdateTeachingUnitPolicyDto = Partial<CreateTeachingUnitPolicyDto>;

// Workload Contract
export interface WorkloadContract {
  id: number | string;
  teacherId: string;
  academicYearId: number | string;
  targetUnitsPerWeek: number;
  minUnitsPerWeek?: number;
  maxUnitsPerWeek?: number;
  salaryBasis: "per_jp" | "fixed" | "hybrid";
  notes?: string;
  isActive: boolean;
  teacher?: User;
  academicYear?: AcademicYear;
  // Metrics fields
  actualUnits?: number;
  balance?: number;
  status?: "OVERLOAD" | "UNDERLOAD" | "BALANCED";
}

export interface WorkloadContractParams {
  academicYearId?: number | string;
  teacherId?: string;
  withMetrics?: boolean;
  search?: string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
  educationLevelId?: number | string;
  gradeId?: number | string;
  majorId?: number | string;
  programStudyId?: number | string;
}

export interface WorkloadMetrics {
  totalTeachers: number;
  totalOverloaded: number;
  totalBalanced: number;
  totalUnderloaded: number;
}

export interface WorkloadContractsResponse {
  data: WorkloadContract[];
  total: number;
  page: number;
  limit: number;
  metrics?: WorkloadMetrics;
}

export interface CreateWorkloadContractDto {
  teacherId: string;
  academicYearId: number | string;
  targetUnitsPerWeek: number;
  minUnitsPerWeek?: number;
  maxUnitsPerWeek?: number;
  salaryBasis: "per_jp" | "fixed" | "hybrid";
  notes?: string;
  isActive?: boolean;
}

export type UpdateWorkloadContractDto = Partial<CreateWorkloadContractDto>;

export interface TeachingScheduleTemplate {
  id: number | string;
  classSubjectId: number | string;
  defaultTeacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  plannedUnits: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  classSubject?: ClassSubject;
  defaultTeacher?: User;
}

export interface TeachingScheduleTemplateParams {
  classId?: number | string;
  classSubjectId?: number | string;
  teacherId?: string;
  dayOfWeek?: string;
  isActive?: boolean | string;
  teacherId?: string;

  page?: number | string;
  limit?: number | string;
}

export interface CreateTeachingScheduleTemplateDto {
  classSubjectId: number | string;
  defaultTeacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  plannedUnits: number;
  isActive?: boolean;
}

export type UpdateTeachingScheduleTemplateDto = Partial<CreateTeachingScheduleTemplateDto>;

// Discovery Tree Types
export interface DiscoveryTreeMajor {
  id: number | string;
  name: string;
  classes?: Class[];
}

export interface DiscoveryTreeProgramStudy {
  id: number | string;
  name: string;
  majors: DiscoveryTreeMajor[];
}

export interface DiscoveryTreeLevel {
  id: number | string;
  code?: string;
  name: string;
  requiresMajor?: boolean;
  programStudies: DiscoveryTreeProgramStudy[];
}

export interface DiscoveryTreeResponse {
  levels: DiscoveryTreeLevel[];
}

export interface GenerateScheduleDto {
  classSubjectId: number | string;
  startDate: string;
  endDate: string;
  academicYearId?: number | string;
  semester?: string;
}

export interface GenerateScheduleResponse {
  message: string;
  scheduleId?: string;
  generatedCount: number;
}
// Grouped Teacher Subjects Response
export interface GroupedTeacherSubjectGrade {
  grade: {
    id: number | string;
    name: string;
  };
  subjects: TeacherSubject[];
}

export interface GroupedTeacherSubjectMajor {
  major: {
    id: number | string;
    name: string;
    programStudy?: {
      id: number | string;
      name: string;
    };
  };
  grades: GroupedTeacherSubjectGrade[];
}

export interface GroupedTeacherSubjectLevel {
  educationLevel: {
    id: number | string;
    name: string;
  };
  majors: GroupedTeacherSubjectMajor[];
  grades: GroupedTeacherSubjectGrade[];
}

export type GroupedTeacherSubjectsResponse = GroupedTeacherSubjectLevel[];

// Grouped Teaching Assignments Response
export interface GroupedTeachingAssignment {
  assignmentId: number | string;
  role: "primary" | "assistant";
  subjectName: string;
  subjectCode: string;
}

export interface GroupedTeachingAssignmentClass {
  class: {
    id: number | string;
    name: string;
  };
  assignments: GroupedTeachingAssignment[];
}

export interface GroupedTeachingAssignmentGrade {
  grade: {
    id: number | string;
    name: string;
  };
  classes: GroupedTeachingAssignmentClass[];
}

export interface GroupedTeachingAssignmentMajor {
  major: {
    id: number | string;
    name: string;
  };
  grades: GroupedTeachingAssignmentGrade[];
}

export interface GroupedTeachingAssignmentLevel {
  educationLevel: {
    id: number | string;
    name: string;
  };
  majors: GroupedTeachingAssignmentMajor[];
  grades: GroupedTeachingAssignmentGrade[];
}

export type GroupedTeachingAssignmentsResponse = GroupedTeachingAssignmentLevel[];



export interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  targetUnits: number;
  actualUnits: number;
  balance: number;
  status: "OVERLOAD" | "UNDERLOAD" | "BALANCED";
}

export interface TeacherWorkloadParams {
  academicYearId?: number | string;
  search?: string;
  status?: string;
}
