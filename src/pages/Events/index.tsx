import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useEvents, useEventMutation } from "../../api/hooks/useEvents";
import { Event, CreateEventDto, UpdateEventDto } from "../../api/types/events";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Modal from "../../components/molecules/Modal";
import CustomSelect from "../../components/molecules/CustomSelect";
import ManageInvitationsModal from "../../components/organisms/Events/ManageInvitationsModal";
import DayEventsModal from "../../components/organisms/Events/DayEventsModal";
import CalendarWidget from "../../components/molecules/Calendar/CalendarWidget";
import { EventInput, DateSelectArg } from "@fullcalendar/core";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  AngleRightIcon,
  ChevronLeftIcon,
  GridIcon,
  CalenderIcon,
  TableIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ListIcon,
  UserIcon,
  TimeIcon,
  GroupIcon,
  CloseIcon
} from "../../components/atoms/Icons";
import DatePicker from "../../components/molecules/DatePicker";
import NumberInput from "../../components/molecules/NumberInput";
import Badge from "../../components/atoms/Badge";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import Button from "../../components/atoms/Button";
import Switch from "../../components/atoms/Switch";

const Events: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all"); // upcoming, past, all
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  const navigate = useNavigate();
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading } = useEvents({
    page,
    limit: viewMode === "calendar" ? 1000 : limit,
    eventType: eventTypeFilter || undefined,
    startFrom: startFrom || undefined,
    startTo: startTo || undefined,
    upcoming: timeRangeFilter === "upcoming",
    past: timeRangeFilter === "past",
  });

  const { 
    createMutation, 
    updateMutation, 
    deleteMutation 
  } = useEventMutation();

  const [sortConfig, setSortConfig] = useState<{ key: keyof Event; direction: "asc" | "desc" } | null>(null);

  const events = React.useMemo(() => response?.data || [], [response?.data]);

  const handleSort = (key: keyof Event) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedEvents = React.useMemo(() => {
    if (!sortConfig) return events;
    return [...events].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = a[key] ?? "";
      const valB = b[key] ?? "";
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [events, sortConfig]);

  const SortIcon = ({ column }: { column: keyof Event }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<string | null>(null); // For DayEventsModal
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [formData, setFormData] = useState<CreateEventDto & { isCancelled: boolean; cancellationReason: string | null }>({
    name: "",
    description: "",
    location: "",
    startDateTime: "",
    endDateTime: "",
    eventType: "",
    capacity: null,
    affectsAttendance: false,
    isCancelled: false,
    cancellationReason: null,
  });

  const eventTypes = [
    { label: "All Types", value: "" },
    { label: "Meeting", value: "meeting" },
    { label: "Training", value: "training" },
    { label: "Ceremony", value: "ceremony" },
    { label: "Workshop", value: "workshop" },
  ];

  const timeRangeOptions = [
    { label: "All Events", value: "all" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Past", value: "past" },
  ];

  // Map Events to Calendar format
  const calendarEvents = React.useMemo(() => {
    return events.map((event): EventInput => ({
      id: event.public_id,
      title: event.name,
      start: event.startTime,
      end: event.endTime,
      extendedProps: {
        event: event,
        calendar: event.eventType === "meeting" ? "primary" : 
                 event.eventType === "training" ? "warning" : 
                 event.eventType === "ceremony" ? "success" : "info"
      }
    }));
  }, [events]);

  const handleOpenModal = (event?: Event, start?: string, end?: string) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        name: event.name,
        description: event.description,
        location: event.location,
        startDateTime: event.startTime,
        endDateTime: event.endTime,
        eventType: event.eventType,
        capacity: event.capacity,
        affectsAttendance: event.affectsAttendance,
        isCancelled: event.isCancelled,
        cancellationReason: event.cancellationReason,
      });
    } else {
      setSelectedEvent(null);
      
      let startDt = start || "";
      let endDt = end || "";

      if (start && !start.includes("T") && !start.includes(":")) startDt = `${start} 09:00`;
      if (end && !end.includes("T") && !end.includes(":")) {
         // FullCalendar end is exclusive, usually next day 00:00
         const endDate = new Date(end);
         if (end.length === 10) {
            endDate.setDate(endDate.getDate() - 1);
            endDt = `${endDate.toISOString().split("T")[0]} 17:00`;
         } else {
            endDt = `${end} 10:00`;
         }
      }

      setFormData({
        name: "",
        description: "",
        location: "",
        startDateTime: startDt,
        endDateTime: endDt,
        eventType: "",
        capacity: null,
        affectsAttendance: true,
        isCancelled: false,
        cancellationReason: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Check if range is more than 1 day (24 hours)
    // selectInfo.end is exclusive, so for a single day click:
    // start: 2023-01-01 00:00, end: 2023-01-02 00:00 -> diff 24h -> 1 day
    // If we select 2 days: start 01-01, end 01-03 -> diff 48h -> 2 days

    const { start, end, startStr, endStr } = selectInfo;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // If more than 1 day selected, open create modal directly
    if (diffDays > 1) {
        handleOpenModal(undefined, startStr, endStr);
        return;
    }

    // Otherwise open Day View for the single date
    const date = startStr.split("T")[0];
    setDayViewDate(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = selectedEvent ? "Update Event" : "Create Event";
    const message = `Are you sure you want to ${selectedEvent ? "update" : "create"} this event?`;

    const confirmed = await confirm({
      variant: selectedEvent ? "update" : "create",
      title,
      message,
    });

    if (confirmed) {
      try {
        if (selectedEvent) {
          await updateMutation.mutateAsync({ id: selectedEvent.public_id, data: formData as UpdateEventDto });
          showSuccess("Event updated successfully!");
        } else {
          await createMutation.mutateAsync(formData as CreateEventDto);
          showSuccess("Event created successfully!");
        }
        setIsModalOpen(false);
      } catch (error) {
        showError(error, `Failed to ${selectedEvent ? "update" : "create"} event`);
      }
    }
  };

  const handleDelete = async (event: Event) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Event",
      message: `Are you sure you want to delete the event "${event.name}"? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(event.public_id);
        showSuccess("Event deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete event");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(sortedEvents.map(ev => ev.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number | string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Bulk Delete Events',
      message: `Are you sure you want to permanently delete ${count} selected events? This action cannot be undone.`,
      confirmText: `Delete ${count} Events`
    });

    if (confirmed) {
      try {
        const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(String(id)));
        await Promise.all(promises);
        showSuccess(`Successfully deleted ${count} events.`);
        setSelectedIds(new Set());
      } catch (error) {
        showError(error, "Failed to delete some events");
      }
    }
  };



  const handleOpenManageModal = (event: Event) => {
    setSelectedEvent(event);
    setIsManageModalOpen(true);
  };

  return (
    <>
      <PageMeta title="Events Management" description="Manage company events, meetings, and trainings." />
      <PageBreadcrumb pageTitle="Events" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Schedule and organize meetings, trainings, and ceremonies.</p>
          </div>
          <div className="flex items-center gap-3">
             {/* View Toggle */}
             <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center justify-center rounded-lg px-3 py-1.5 transition-all ${
                    viewMode === "list"
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <ListIcon className="size-4 mr-1.5" />
                  <span className="text-xs font-semibold">List</span>
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center justify-center rounded-lg px-3 py-1.5 transition-all ${
                    viewMode === "calendar"
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <TableIcon className="size-4 mr-1.5" />
                  <span className="text-xs font-semibold">Calendar</span>
                </button>
             </div>

             <button
               onClick={() => handleOpenModal()}
               className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
             >
               <PlusIcon className="fill-white text-xl text-white" />

               Add Event
             </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 bg-white dark:bg-white/[0.03] p-4 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
          <CustomSelect
            label="Event Type"
            value={eventTypeFilter}
            onChange={(val: string | number) => { setEventTypeFilter(String(val)); setPage(1); }}
            options={eventTypes}
          />
          <CustomSelect
            label="Time Range"
            value={timeRangeFilter}
            onChange={(val: string | number) => { setTimeRangeFilter(String(val)); setPage(1); }}
            options={timeRangeOptions}
          />
          <DatePicker
            label="Start At"
            value={startFrom}
            onChange={(date: string) => { setStartFrom(date); setPage(1); }}
            type="date"
          />
          <DatePicker
            label="End To"
            value={startTo}
            onChange={(date: string) => { setStartTo(date); setPage(1); }}
            type="date"
          />
          <div className="flex items-end flex-1">
             <Button 
                variant="outline"
                className="w-full h-11 ring-2 ring-brand-500 text-brand-500 font-semibold hover:bg-brand-500/5 transition-all"
                startIcon={<CloseIcon className="size-4" />}
                onClick={() => {
                    setEventTypeFilter("");
                    setTimeRangeFilter("all");
                    setStartFrom("");
                    setStartTo("");
                    setPage(1);
                }}
             >
                Reset Filters
             </Button>
          </div>
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedIds.size}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Events Selected</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-error-50 dark:bg-error-500/10 border border-error-100 dark:border-error-500/20 rounded-xl text-sm font-bold text-error-600 dark:text-error-400 hover:bg-error-100 transition-all shadow-sm"
                >
                    <TrashBinIcon className="size-4" />
                    Delete Selected
                </button>
                <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        {viewMode === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 w-12">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={sortedEvents.length > 0 && selectedIds.size === sortedEvents.length}
                        onChange={handleSelectAll}
                    />
                </TableCell>
                <TableCell isHeader className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-2 hover:text-brand-500 transition-colors">
                    Event Details <SortIcon column="name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                  <button onClick={() => handleSort("startTime")} className="flex items-center gap-2 hover:text-brand-500 transition-colors">
                    Timeline <SortIcon column="startTime" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider text-center">
                   <button onClick={() => handleSort("isCancelled")} className="mx-auto flex items-center gap-2 hover:text-brand-500 transition-colors">
                    Status <SortIcon column="isCancelled" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading events...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <GridIcon className="size-10 opacity-20 mb-2" />
                      <p className="text-sm font-medium">No events found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Schedule your first event
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedEvents.map((event: Event) => (
                  <TableRow 
                    key={event.public_id} 
                    className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <TableCell className="px-5 py-4">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedIds.has(event.public_id)}
                            onChange={() => handleSelectRow(event.public_id)}
                        />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-start gap-4">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          event.eventType === 'meeting' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' :
                          event.eventType === 'training' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' :
                          'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
                        }`}>
                          {event.eventType === 'meeting' ? <UserIcon className="size-5" /> :
                           event.eventType === 'training' ? <TimeIcon className="size-5" /> :
                           <GridIcon className="size-5" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-gray-900 dark:text-white">{event.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{event.description}</p>
                          <div className="flex items-center gap-2 pt-1">
                             <span className="inline-flex items-center text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                                {event.location}
                             </span>
                             <span className="text-gray-300">•</span>
                             <span className="inline-flex items-center text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                                Cap: {event.capacity}
                             </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                          <CalenderIcon className="size-3.5 text-brand-500" />
                          <span>{new Date(event.startTime).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <TimeIcon className="size-3.5" />
                          <span>Until: {new Date(event.endTime).toLocaleString()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                       <div className="flex flex-col items-center gap-2">
                          {event.isCancelled ? (
                             <div className="flex flex-col items-center gap-1">
                                <Badge color="error" size="sm">Cancelled</Badge>
                                {event.cancellationReason && (
                                  <p className="text-[10px] text-error-500 font-medium max-w-[150px] line-clamp-1 italic" title={event.cancellationReason}>
                                    "{event.cancellationReason}"
                                  </p>
                                )}
                             </div>
                          ) : new Date(event.startTime) > new Date() ? (
                             <Badge color="success" size="sm">Upcoming</Badge>
                          ) : new Date(event.endTime) < new Date() ? (
                             <Badge color="warning" size="sm">Ended</Badge>
                          ) : (
                             <Badge color="primary" size="sm">Live</Badge>
                          )}

                          {!event.isCancelled && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/${event.public_id}/invitation-paper`);
                              }}
                              className="text-[10px] font-bold text-brand-500 hover:text-brand-600 transition-colors uppercase tracking-widest flex items-center gap-1 group/btn"
                            >
                              Invitation Paper
                              <AngleRightIcon className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
                            </button>
                          )}
                       </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1 transition-opacity">
                        <button
                          onClick={() => navigate(`/attendance/history?tab=gate&eventId=${event.public_id}`)}
                          className="rounded-lg p-2 text-emerald-500 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          title="View Attendance List"
                        >
                          <ListIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/events/${event.public_id}/invitations`)}
                          className="rounded-lg p-2 text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                          title="See Invitations"
                        >
                          <GroupIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenManageModal(event)}
                          disabled={event.isCancelled || new Date(event.endTime) < new Date()}
                          className={`rounded-lg p-2 transition-colors ${
                            event.isCancelled || new Date(event.endTime) < new Date()
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          }`}
                          title={event.isCancelled ? "Cannot invite to cancelled event" : new Date(event.endTime) < new Date() ? "Cannot invite to past event" : "Manage Invitations"}
                        >
                          <UserIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(event)}
                          className="rounded-lg p-2 text-amber-500 transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          title="Edit Event"
                        >
                          <PencilIcon className="size-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(event)}
                          className="rounded-lg p-2 text-error-600 transition-colors hover:bg-error-100 dark:hover:bg-error-500/20"
                          title="Delete Event"
                        >
                          <TrashBinIcon className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] p-1 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
             <CalendarWidget 
                events={calendarEvents}
                onDateSelect={handleDateSelect}
                onEventClick={(info) => {
                  const event = info.event.extendedProps.event as Event;
                  if (event) handleOpenModal(event);
                }}
             />
          </div>
        )}

        {/* Pagination */}
        {viewMode === "list" && total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> events
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1 px-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400 px-1">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                Next
                <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          className="max-w-xl"
          title={selectedEvent ? "Update Event" : "Create New Event"}
          description={selectedEvent ? "Modify event details and settings." : "Schedule a new event for the organization."}
          footer={
            <div className="flex justify-between w-full">
               <div>
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={() => {
                          setIsModalOpen(false);
                          setIsManageModalOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <UserIcon className="size-4" />
                      Manage Invitations
                    </button>
                  )}
               </div>
               <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    type="button"
                    className={`rounded-xl px-6 py-2 text-sm font-medium text-white transition-all shadow-lg ${
                        selectedEvent ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
                    }`}
                  >
                    {selectedEvent ? "Update Event" : "Create Event"}
                  </button>
               </div>
            </div>
          }
      >
        <div className="py-2">
          <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              {/* Main Info */}
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter event name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter event description"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location <span className="text-red-500">*</span></label>
                      <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Room, etc."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                      />
                  </div>
                  <CustomSelect
                      label="Event Type"
                      value={formData.eventType}
                      onChange={(val: string | number) => setFormData({ ...formData, eventType: String(val) })}
                      options={eventTypes.filter(t => t.value !== "")}
                      placeholder="Select type"
                  />
                </div>
              </div>

              {/* Scheduling & Settings */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    label="Starts At"
                    value={formData.startDateTime}
                    onChange={(date: string) => setFormData({ ...formData, startDateTime: date })}
                    type="datetime"
                    required
                  />
                  <DatePicker
                    label="Ends At"
                    value={formData.endDateTime}
                    onChange={(date: string) => setFormData({ ...formData, endDateTime: date })}
                    type="datetime"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    label="Capacity"
                    id="capacity"
                    required
                    value={formData.capacity}
                    onChange={(val) => setFormData({ ...formData, capacity: val })}
                    placeholder="0 (Unlimited)"
                  />
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30 dark:border-white/5 dark:bg-white/5">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Attendance</span>
                        <span className="text-[10px] text-gray-500">Track it</span>
                    </div>
                    <Switch 
                        checked={formData.affectsAttendance}
                        onChange={(checked) => setFormData({ ...formData, affectsAttendance: checked })}
                    />
                  </div>
                </div>

                {selectedEvent && (
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 dark:border-white/5 dark:bg-white/5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Creator</p>
                          <div className="flex items-center gap-2">
                              {selectedEvent?.creator?.photo ? (
                                  <img src={selectedEvent.creator.photo} className="size-6 rounded-full" />
                              ) : (
                                  <UserIcon className="size-6 text-gray-300" />
                              )}
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                                  {selectedEvent?.creator?.name || "N/A"}
                              </span>
                          </div>
                      </div>
                      
                      <label className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                          formData.isCancelled 
                          ? "border-error-200 bg-error-50 dark:border-error-500/20 dark:bg-error-500/10" 
                          : "border-gray-100 bg-gray-50/30 dark:border-white/5 dark:bg-white/5 cursor-pointer hover:bg-gray-50"
                      }`}>
                          <div className="relative flex items-center">
                              <input
                                  type="checkbox"
                                  id="isCancelled"
                                  disabled={new Date(selectedEvent.endTime) < new Date()}
                                  checked={formData.isCancelled}
                                  onChange={(e) => {
                                     const checked = e.target.checked;
                                     setFormData({ 
                                        ...formData, 
                                        isCancelled: checked,
                                        cancellationReason: checked ? formData.cancellationReason : null
                                     });
                                  }}
                                  className="peer size-5 cursor-pointer appearance-none rounded-lg border-2 border-gray-200 bg-white checked:border-error-500 checked:bg-error-500 transition-all focus:outline-none dark:border-white/10 dark:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <CloseIcon className="absolute left-1 size-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                          </div>
                          <div className="flex flex-col">
                              <span className={`text-xs font-bold ${formData.isCancelled ? "text-error-600 dark:text-error-400" : "text-gray-700 dark:text-gray-300"}`}>
                                  {formData.isCancelled ? "Cancelled" : "Cancel Event"}
                              </span>
                          </div>
                      </label>
                  </div>
                )}

                {formData.isCancelled && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cancellation Reason</label>
                      <input
                      type="text"
                      required
                      value={formData.cancellationReason || ""}
                      onChange={(e) => setFormData({ ...formData, cancellationReason: e.target.value })}
                      placeholder="Why?"
                      className="w-full rounded-xl border border-error-200 bg-error-50/50 px-4 py-2.5 text-sm outline-none dark:border-error-500/20 dark:bg-error-500/5 dark:text-white"
                      />
                  </div>
                )}

                {selectedEvent && new Date(selectedEvent.endTime) < new Date() && (
                  <div className="flex items-center justify-center p-3 rounded-xl border border-warning-100 bg-warning-50/50 dark:border-warning-500/10 dark:bg-warning-500/5">
                    <Badge color="warning" size="sm">This event has ended</Badge>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <ManageInvitationsModal
         isOpen={isManageModalOpen}
         onClose={() => setIsManageModalOpen(false)}
         event={selectedEvent}
      />

      {dayViewDate && (
        <DayEventsModal
            isOpen={!!dayViewDate}
            onClose={() => setDayViewDate(null)}
            date={dayViewDate}
            onAddEvent={(date) => {
                // When adding event from Day View, pre-fill that date
                // Default to 09:00 - 10:00 or similar
                handleOpenModal(undefined, date, date);
            }}
            onEditEvent={(event) => {
                handleOpenModal(event);
            }}
        />
      )}

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Events;
