export type LeaveStatus = "pending" | "partially_approved" | "approved" | "rejected";

export interface LeaveTypeApproverDto {
  level: number;
  approverId: string;
}

export interface LeaveTypeApprover {
  id: number;
  leaveTypeId: number;
  approvalLevel: number;
  approverId: string;
  approver?: {
    public_id: string;
    name: string;
    email: string;
  };
}

export interface LeaveType {
  id: number | string;
  public_id: string;
  code: string;
  displayName: string | null;
  requiresFile: boolean;
  maxDaysPerYear: number;
  approvalLevelsRequired: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  approvers?: LeaveTypeApprover[];
}

export interface LeaveTypeParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateLeaveTypeDto {
  displayName: string;
  description?: string;
  requiresFile?: boolean;
  maxDaysPerYear?: number;
  approvalLevelsRequired: number;
  isActive?: boolean;
  approvers?: LeaveTypeApproverDto[];
}

export interface UpdateLeaveTypeDto {
  displayName?: string;
  description?: string;
  requiresFile?: boolean;
  maxDaysPerYear?: number;
  approvalLevelsRequired?: number;
  isActive?: boolean;
  approvers?: LeaveTypeApproverDto[];
}

export interface LeaveSubmission {
    id?: string; // Optional internal ID
    public_id: string;
    userId: string;
    user?: { 
        public_id: string;
        name: string; 
        email: string; 
        photo?: string; 
        isActive: boolean;
        createdAt?: string;
        updatedAt?: string;
    };
    leaveTypeId: number;
    leaveType?: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    attachment?: string | null;
    attachmentUri?: string | null;
    status: LeaveStatus;
    rejectionReason?: string | null;
    isApproved: boolean;
    currentApprovalLevel: number;
    createdAt: string;
    updatedAt: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    reviewer?: {
        public_id: string;
        name: string;
        email: string;
        photo?: string | null;
    };
}

export interface LeaveSubmissionParams {
    page?: number;
    limit?: number;
    userId?: string;
    status?: LeaveStatus;
    startDate?: string;
    endDate?: string;
}

export interface CreateLeaveSubmissionDto {
    leaveTypeCode: string;
    startDate: string;
    endDate: string;
    reason: string;
    image?: File;
}

export interface UpdateLeaveSubmissionDto {
    leaveTypeCode?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    image?: File;
}

export interface ReviewLeaveDto {
    status: "approved" | "rejected";
    comments?: string;
    approvalLevel?: number;
    rejectionReason?: string;
}

export interface LeaveApproval {
    id: number;
    leaveSubmissionId: string;
    approverId: string;
    approvalLevel: number;
    status: LeaveStatus;
    comments: string | null;
    approvedAt: string;
    createdAt: string;
    leaveSubmission?: LeaveSubmission;
    approver?: {
        public_id: string;
        name: string;
        email: string;
        photo: string | null;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
    };
}

export interface LeaveApprovalParams {
    page?: number;
    limit?: number;
    submissionId?: string;
    approverId?: string;
}
