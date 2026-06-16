import api from '../client';

export interface GatePass {
  public_id: string;
  userId: string;
  type: 'personal' | 'official_business' | 'sick_go_home';
  expectedOutTime: string;
  expectedInTime?: string;
  actualOutTime?: string;
  actualInTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedById?: string;
  createdAt: string;
  updatedAt: string;
  user?: any; // You can type this better later
}

export interface CreateGatePassDto {
  type: 'personal' | 'official_business' | 'sick_go_home';
  expectedOutTime: string;
  expectedInTime?: string;
  reason: string;
}

export interface GetGatePassesParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
}

export const gatePassService = {
  create: async (data: CreateGatePassDto) => {
    const response = await api.post<GatePass>('/gate-passes', data);
    return response.data;
  },

  findAll: async (params?: GetGatePassesParams) => {
    const response = await api.get<any>('/gate-passes', { params });
    return response.data;
  },

  findAllForApproval: async (params?: GetGatePassesParams) => {
    const response = await api.get<any>('/gate-passes/all', { params });
    return response.data;
  },

  updateStatus: async (id: string, status: 'approved' | 'rejected') => {
    const response = await api.patch<GatePass>(`/gate-passes/${id}/status`, { status });
    return response.data;
  },
};
