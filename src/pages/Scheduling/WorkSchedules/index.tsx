import React, { useState, useMemo } from "react";
import CalendarWidget from "../../../components/molecules/Calendar/CalendarWidget";
import { useShiftAssignments } from "../../../api/hooks/useScheduling";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import ShiftAssignmentModal from "../../../components/organisms/Scheduling/ShiftAssignmentModal";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { ShiftAssignment } from "../../../api/types/scheduling";


const WorkSchedules: React.FC = () => {
  // Filters state
  // Removed User Filter as requested
  
  const { data: response, isLoading, refetch } = useShiftAssignments({
    limit: 1000, // Fetch broader range
  });

  const assignments = useMemo(() => Array.isArray(response) ? response : (response?.data || []), [response]);

  // Transform Assignments to Calendar Events
  const events = useMemo(() => {
    return assignments.flatMap(assignment => {
        if (!assignment.shiftTemplate) return [];

        const template = assignment.shiftTemplate;
        
        // FullCalendar Recurring Events mapping
        // We need to map workDays [1..7] to daysOfWeek [1..0] (Sun is 0)
        // Backend: 1=Mon, 7=Sun
        // FullCalendar: 1=Mon, 0=Sun
        const daysOfWeek = template.workDays.map((d: number) => d === 7 ? 0 : d);

        return {
            id: assignment.id,
            title: `${assignment.user?.name || 'User'} - ${template.name}`,
            startRecur: assignment.effectiveFrom.split('T')[0],
            endRecur: assignment.effectiveTo ? assignment.effectiveTo.split('T')[0] : undefined,
            startTime: template.startTime,
            endTime: template.endTime,
            daysOfWeek: daysOfWeek, // [1, 2, 3] etc
            extendedProps: {
                assignment: assignment, // Store full object for click handling
                calendar: 'Primary' // Or dynamic color based on shift type?
            }
        };
    });
  }, [assignments]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>(undefined);

  // Handlers
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedAssignment(null);
    setSelectedDate(selectInfo.startStr);
    // If user selected a range, use endStr (subtract 1 day since FullCalendar's endStr is exclusive)
    if (selectInfo.endStr && selectInfo.endStr !== selectInfo.startStr) {
      const endDate = new Date(selectInfo.endStr);
      endDate.setDate(endDate.getDate() - 1);
      setSelectedEndDate(endDate.toISOString().split('T')[0]);
    } else {
      setSelectedEndDate(undefined);
    }
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const assignment = clickInfo.event.extendedProps.assignment as ShiftAssignment;
    if (assignment) {
        setSelectedAssignment(assignment);
        setSelectedDate(undefined);
        setSelectedEndDate(undefined);
        setIsModalOpen(true);
    }
  };



  return (
    <>
      <PageMeta title="Work Schedules | Attendance" description="Calendar view of shift assignments." />
      <PageBreadcrumb pageTitle="Work Schedules" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
             <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work Schedules</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">View and manage shift schedules in a calendar.</p>
             </div>
        </div>

        {isLoading ? (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
            </div>
        ) : (
            <CalendarWidget
                events={events}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
                customButtons={{
                    addEventButton: {
                        text: "Assign Shift +",
                        click: () => {
                            setSelectedAssignment(null);
                            setSelectedDate(undefined);
                            setSelectedEndDate(undefined);
                            setIsModalOpen(true);
                        }
                    }
                }}
                headerToolbar={{
                    left: "prev,next today addEventButton",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek"
                }}
            />
        )}
      </div>

      <ShiftAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedAssignment={selectedAssignment}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        onSuccess={() => {
            refetch();
        }}
      />
    </>
  );
};

export default WorkSchedules;
