import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { eventService } from "../services/eventService";
import { 
  EventParams, 
  CreateEventDto, 
  UpdateEventDto, 
  EventInvitationParams,
  BulkInviteDto,
  ClassInviteDto 
} from "../types/events";

export const useEvents = (params?: EventParams) => {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => eventService.getEvents(params),
  });
};

export const useEventsInfinite = (params?: EventParams) => {
  return useInfiniteQuery({
    queryKey: ["events", "infinite", params],
    queryFn: ({ pageParam = 1 }) => eventService.getEvents({ ...params, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta;
      return meta?.page < meta?.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => eventService.getEvent(id),
    enabled: !!id,
  });
};

export const useEventMutation = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateEventDto) => eventService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventDto }) =>
      eventService.updateEvent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => eventService.cancelEvent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", id] });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: BulkInviteDto }) =>
      eventService.bulkInvite(eventId, data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "invitations"] });
    },
  });

  const inviteClassMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: ClassInviteDto }) =>
      eventService.inviteClass(eventId, data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "invitations"] });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: ({ eventId, invitationId }: { eventId: string; invitationId: string }) =>
      eventService.deleteInvitation(eventId, invitationId),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "invitations"] });
    },
  });

  return { 
    createMutation, 
    updateMutation, 
    deleteMutation, 
    cancelMutation, 
    bulkInviteMutation, 
    inviteClassMutation,
    deleteInvitationMutation
  };
};

export const useEventInvitations = (eventId: string, params?: EventInvitationParams) => {
  return useQuery({
    queryKey: ["events", eventId, "invitations", params],
    queryFn: () => eventService.getInvitations(eventId, params),
    enabled: !!eventId,
  });
};
