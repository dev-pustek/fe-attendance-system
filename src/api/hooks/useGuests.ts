import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { 
  guestService, 
  CreateGuestDto, 
  UpdateGuestDto, 
  GuestParams,
  VisitParams,
  CreateGuestVisitDto,
  UpdateGuestVisitDto
} from "../services/guestService";

export const useGuests = (params?: GuestParams) => {
  return useQuery({
    queryKey: ["guests", params],
    queryFn: () => guestService.getGuests(params),
    placeholderData: keepPreviousData,
  });
};

export const useGuest = (id: number) => {
  return useQuery({
    queryKey: ["guests", id],
    queryFn: () => guestService.getGuest(id),
    enabled: !!id,
  });
};

export const useCreateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGuestDto) => guestService.createGuest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
    },
  });
};

export const useRegisterGuestVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGuestDto) => guestService.createVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-visits"] });
    },
  });
};

export const useUpdateGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateGuestDto }) => 
      guestService.updateGuest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests", variables.id] });
    },
  });
};

export const useDeleteGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => guestService.deleteGuest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
    },
  });
};

// Visits
export const useGuestVisits = (params?: VisitParams) => {
  return useQuery({
    queryKey: ["guest-visits", params],
    queryFn: () => guestService.getVisits(params),
    placeholderData: keepPreviousData,
  });
};

export const useGuestVisitsByGuest = (public_id: string, params?: VisitParams) => {
  return useQuery({
    queryKey: ["guest-visits", public_id, params],
    queryFn: () => guestService.getGuestVisits(public_id, params),
    enabled: !!public_id,
    placeholderData: keepPreviousData,
  });
};

export const useCheckInGuest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ public_id, data }: { public_id: string; data: CreateGuestVisitDto }) => 
      guestService.checkIn(public_id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["guest-visits"] });
      queryClient.invalidateQueries({ queryKey: ["guest-visits", variables.public_id] });
    },
  });
};

export const useUpdateGuestVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, data }: { visitId: string | number; data: UpdateGuestVisitDto }) => 
      guestService.updateVisit(visitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-visits"] });
    },
  });
};

export const useDeleteGuestVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId: number) => guestService.deleteVisit(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-visits"] });
    },
  });
};
