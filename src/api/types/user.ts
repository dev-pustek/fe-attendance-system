export interface User {
  id?: string; // Optional, backend primarily uses public_id
  public_id: string;
  name: string;
  email: string;
  phone?: string | null;
  photo?: string | null; // URL to the uploaded photo
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userTypes?: string[]; // Array of user type codes like ["student", "employee"]
  roles?: Array<{ id: number; name: string; displayName: string }>; // User roles from backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any | null; // Student or Employee profile data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studentProfile?: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employeeProfile?: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeClass?: any | null; // Active class information
  typeAssignments?: UserTypeAssignment[];
}

export interface UserType {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  created_at: string;
  updated_at?: string;
  metrics?: {
    usersCount: number;
    previewUsers: User[];
  };
}

export interface UserTypeAssignment {
  id: string;
  userId: string;
  userTypeId: string;
  isPrimary: boolean;
  assignedAt: string;
  userType?: UserType;
}

export interface Role {
  id: string | number;
  name: string;
  displayName: string;
}

export interface RoleParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
}

export interface UserParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  isActive?: boolean | string;
  typeCode?: string;
  role?: string;
  classId?: string;
  class_id?: number | string;
  withProfile?: boolean | string;
}

export interface ImageAdjustment {
  scale: number; // 1.0 = 100%, 2.0 = 200%
  x: number; // horizontal offset in pixels
  y: number; // vertical offset in pixels
}
