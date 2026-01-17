export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
  search?: string;
  isActive?: boolean;
  relationship?: string;
}

export interface BaseResponse<T> {
  statusCode: number;
  message: string;
  timestamp: string;
  data: T;
}

export type ApiResponse<T> = BaseResponse<T>;

export interface PaginatedResponse<T> {
  statusCode: number;
  message: string;
  timestamp: string;
  data: T[];
  // Support both flat and nested meta structures for backward compatibility during transition
  total?: number;
  page?: number | string;
  limit?: number | string;
  totalPages?: number;
  meta?: {
    total: number;
    page: number | string;
    limit: number | string;
    totalPages?: number;
    itemCount?: number;
    pageCount?: number;
    take?: number;
    lastPage?: number;
  };
  // Attendance-specific metrics
  metrics?: {
    totalPresent?: number;
    onTime?: number;
    late?: number;
    checkedOut?: number;
    stillInSchool?: number;
    attendanceRate?: string;
  };
  generatedAt?: string;
}
