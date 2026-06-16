import api from '../client';

export interface ReimbursementType {
  id: number;
  code: string;
  name: string;
  description?: string;
  maxLimit?: number;
  isActive: boolean;
}

export interface Reimbursement {
  public_id: string;
  userId: string;
  reimbursementTypeId: number;
  amount: number;
  dateIncurred: string;
  description: string;
  receiptUri?: string;
  gatePassId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedById?: string;
  createdAt: string;
  updatedAt: string;
  reimbursementType?: ReimbursementType;
}

export interface CreateReimbursementDto {
  reimbursementTypeId: number;
  amount: number;
  dateIncurred: string;
  description: string;
  receiptUri?: string;
  gatePassId?: string;
}

export interface GetReimbursementsParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
}

export const reimbursementService = {
  create: async (data: CreateReimbursementDto) => {
    const response = await api.post<Reimbursement>('/reimbursements', data);
    return response.data;
  },

  findAll: async (params?: GetReimbursementsParams) => {
    const response = await api.get<any>('/reimbursements', { params });
    return response.data;
  },

  findAllForApproval: async (params?: GetReimbursementsParams) => {
    const response = await api.get<any>('/reimbursements/all', { params });
    return response.data;
  },

  updateStatus: async (id: string, status: 'approved' | 'rejected' | 'paid') => {
    const response = await api.patch<Reimbursement>(`/reimbursements/${id}/status`, { status });
    return response.data;
  },
};
