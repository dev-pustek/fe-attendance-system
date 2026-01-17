import { PaginationParams } from "./common";
import { User } from "./user";

export interface StudentProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User & {
    activeClass?: {
      id: string;
      name: string;
      academicYear: string;
    };
  };
  studentId: string;
  nisn?: string | null;
  nis?: string | null;
  nik?: string | null;
  placeOfBirth?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  religion?: string | null;
  address?: string | null;
  rt?: string | null;
  rw?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  province?: string | null;
  fatherName?: string | null;
  fatherPhone?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  entryYear?: number | null;
  enrollmentDate?: string | null;
  studentStatus?: string | null;
  pipRecipient: boolean;
  kipNumber?: string | null;
  notes?: string | null;
}

export interface EmployeeProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User;
  employeeId: string;
  nip?: string | null;
  nuptk?: string | null;
  position?: string | null;
  department?: string | null;
  employmentStatus?: string | null;
  hireDate?: string | null;
  nik?: string | null;
  placeOfBirth?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  religion?: string | null;
  address?: string | null;
  rt?: string | null;
  rw?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  province?: string | null;
  notes?: string | null;
}

export interface ParentStudent {
  relationshipId: number;
  relationship: string;
  studentId: string;
  studentName: string;
  studentPhoto: string | null;
  studentProfile: StudentProfile;
}

export interface ParentProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User;
  relationship: string;
  occupation?: string | null;
  education?: string | null;
  notes?: string | null;
  students?: ParentStudent[];
}

export interface ProfileParams extends PaginationParams {
  search?: string;
  classId?: string;
  academicYearId?: string;
  studentStatus?: string;
  employmentStatus?: string;
  department?: string;
}

export interface CreateStudentDto {
  // User Fields
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  photo?: File | string | null; // Multipart binary or URL string

  // Academic Fields
  studentId: string;
  nisn?: string;
  nis?: string;
  entryYear?: number;
  enrollmentDate?: string;
  studentStatus?: string;
  pipRecipient?: boolean;
  kipNumber?: string;

  // Personal Fields
  nik?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  gender?: string;
  religion?: string;

  // Address Fields
  address?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  province?: string;

  // Family Fields
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;

  // Other
  notes?: string;
  userId?: string;
}

export interface UpdateStudentDto extends Partial<CreateStudentDto> {
  userId?: string;
}

export interface CreateEmployeeDto {
    // User Fields
    name: string;
    email: string;
    phone?: string;
    isActive?: boolean;
    photo?: File | string | null;
  
    // Employment Fields
    employeeId: string;
    nip?: string;
    department?: string;
    position?: string;
    hireDate?: string;
    employmentStatus?: string;
  
    // Personal Fields (Shared structure)
    nik?: string;
    placeOfBirth?: string;
    dateOfBirth?: string;
    gender?: string;
    religion?: string;
  
    // Address Fields (Shared structure)
    address?: string;
    rt?: string;
    rw?: string;
    kelurahan?: string;
    kecamatan?: string;
    province?: string;
  
    // Other
    notes?: string;
    userId?: string;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  userId?: string;
}

export interface CreateParentDto {
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  photo?: File | string | null;
  relationship: string;
  occupation?: string;
  education?: string;
  notes?: string;
}

export interface UpdateParentDto extends Partial<CreateParentDto> {
  userId?: string;
}

export interface AssignStudentDto {
  studentId: string;
  parentId: string;
  relationship: string;
  isPrimaryContact?: boolean;
  canReceiveNotifications?: boolean;
}
