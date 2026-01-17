import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { attendanceService } from "../../api/services/attendanceService";
import {
  TimeIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  GridIcon,
  UserIcon,
  CalenderIcon,
  CheckCircleIcon,
  CloseIcon,
  AlertIcon,
} from "../../components/atoms/Icons";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/atoms/Table";
import CustomSelect from "../../components/molecules/CustomSelect";
// import { useClasses } from "../../api/hooks/useAcademic";
import TabNavigation, { TabItem } from "../../components/molecules/TabNavigation";
import Badge from "../../components/atoms/Badge";
import Avatar from "../../components/atoms/Avatar";
import DatePicker from "../../components/molecules/DatePicker";

type AttendanceTab = 'gate' | 'class' | 'event';

const SkeletonCard = () => (
  <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-4 space-y-3 shadow-sm animate-pulse">
    <div className="flex justify-between items-start gap-3">
         <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gray-200 dark:bg-white/10 shrink-0"></div>
            <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded"></div>
                <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded"></div>
            </div>
         </div>
         <div className="h-6 w-16 bg-gray-200 dark:bg-white/10 rounded-full"></div>
    </div>
    <div className="pt-3 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-y-2">
        <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded col-span-2"></div>
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-white/10 rounded"></div>
    </div>
  </div>
);

const AttendanceHistory: React.FC = () => {
  // Filters
  const [activeTab, setActiveTab] = useState<AttendanceTab>('gate');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));

  // New filters
  const [academicYearId] = useState<string>("");
  const [majorId] = useState<string>("");
  const [subjectId] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<string>("");
  const [eventTimeFilter, setEventTimeFilter] = useState<"all" | "upcoming" | "past">("all");

  // Fetch filter options (mock or actual)
  // const { data: classesResponse } = useClasses({ limit: 100 });
  // const classes = classesResponse?.data || [];

  
  // TODO: Fetch Academic Years, Majors, Subjects from API
  // For now using empty arrays or mocks if not available in context

  // Tab definitions
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileMetrics, setShowMobileMetrics] = useState(false);

  // Tab definitions
  const tabs: TabItem[] = [
    { id: 'gate', label: 'Gate Entry', icon: GridIcon },
    { id: 'class', label: 'Class/Subject', icon: CalenderIcon },
    { id: 'event', label: 'Events', icon: UserIcon },
  ];

  // Fetch data based on active tab
  // Detect Mobile View
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Desktop Queries (Pagination) ---
  const { data: gateResponse, isLoading: isLoadingGate } = useQuery({
    queryKey: ["gateHistory", page, limit, statusFilter, dateFrom, dateTo, academicYearId, majorId],
    queryFn: () =>
      attendanceService.getAttendanceHistory({
        page,
        limit,
        dateFrom,
        dateTo,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        majorId: majorId ? Number(majorId) : undefined,
      }),
    enabled: activeTab === 'gate' && !isMobile,
  });

  const { data: classResponse, isLoading: isLoadingClass } = useQuery({
    queryKey: ["classHistory", page, limit, dateFrom, dateTo, academicYearId, subjectId, statusFilter],
    queryFn: () =>
      attendanceService.getSubjectAttendanceHistory({
        page,
        limit,
        dateFrom,
        dateTo,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: activeTab === 'class' && !isMobile,
  });

  const { data: eventResponse, isLoading: isLoadingEvent } = useQuery({
    queryKey: ["eventHistory", page, limit, eventStatus, eventTimeFilter],
    queryFn: () =>
      attendanceService.getMyEvents({
        page,
        limit,
        status: eventStatus || undefined,
        upcoming: eventTimeFilter === 'upcoming',
        past: eventTimeFilter === 'past',
      }),
    enabled: activeTab === 'event' && !isMobile,
  });

  // --- Mobile Queries (Infinite Scroll / Lazy Load) ---

  // --- Mobile Queries (Infinite Scroll / Lazy Load) ---
  const { 
    data: gateMobileData, 
    fetchNextPage: fetchNextGate, 
    hasNextPage: hasNextGate, 
    isFetchingNextPage: isFetchingNextGate,
    isLoading: isLoadingGateMobile 
  } = useInfiniteQuery({
    queryKey: ["gateHistoryMobile", limit, statusFilter, dateFrom, dateTo, academicYearId, majorId],
    queryFn: ({ pageParam = 1 }) =>
      attendanceService.getAttendanceHistory({
        page: pageParam,
        limit,
        dateFrom,
        dateTo,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        majorId: majorId ? Number(majorId) : undefined,
      }),
    getNextPageParam: (lastPage) => {
       const current = Number(lastPage.meta?.page || 1);
       const last = lastPage.meta?.totalPages ?? lastPage.meta?.lastPage ?? 1;
       return current < last ? current + 1 : undefined; 
    },
    initialPageParam: 1,
    enabled: activeTab === 'gate' && isMobile,
  });

  const { 
    data: classMobileData, 
    fetchNextPage: fetchNextClass, 
    hasNextPage: hasNextClass, 
    isFetchingNextPage: isFetchingNextClass,
    isLoading: isLoadingClassMobile
  } = useInfiniteQuery({
    queryKey: ["classHistoryMobile", limit, dateFrom, dateTo, academicYearId, subjectId, statusFilter],
    queryFn: ({ pageParam = 1 }) =>
      attendanceService.getSubjectAttendanceHistory({
        page: pageParam,
        limit,
        dateFrom,
        dateTo,
        academicYearId: academicYearId ? Number(academicYearId) : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    getNextPageParam: (lastPage) => {
       const current = Number(lastPage.meta?.page || 1);
       const last = lastPage.meta?.totalPages ?? lastPage.meta?.lastPage ?? 1;
       return current < last ? current + 1 : undefined; 
    },
    initialPageParam: 1,
    enabled: activeTab === 'class' && isMobile,
  });

  const { 
    data: eventMobileData, 
    fetchNextPage: fetchNextEvent, 
    hasNextPage: hasNextEvent, 
    isFetchingNextPage: isFetchingNextEvent,
    isLoading: isLoadingEventMobile
  } = useInfiniteQuery({
    queryKey: ["eventHistoryMobile", limit, eventStatus, eventTimeFilter],
    queryFn: ({ pageParam = 1 }) =>
      attendanceService.getMyEvents({
        page: pageParam,
        limit,
        status: eventStatus || undefined,
        upcoming: eventTimeFilter === 'upcoming',
        past: eventTimeFilter === 'past',
      }),
    getNextPageParam: (lastPage) => {
       const current = Number(lastPage.meta?.page || 1);
       const last = lastPage.meta?.totalPages ?? lastPage.meta?.lastPage ?? 1;
       return current < last ? current + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: activeTab === 'event' && isMobile,
  });

  // --- Auto-Scroll Observer ---
  const observerTarget = useRef<HTMLDivElement>(null);
  
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting) {
          if (activeTab === 'gate' && hasNextGate && !isFetchingNextGate) fetchNextGate();
          if (activeTab === 'class' && hasNextClass && !isFetchingNextClass) fetchNextClass();
          if (activeTab === 'event' && hasNextEvent && !isFetchingNextEvent) fetchNextEvent();
      }
  }, [activeTab, hasNextGate, hasNextClass, hasNextEvent, isFetchingNextGate, isFetchingNextClass, isFetchingNextEvent, fetchNextGate, fetchNextClass, fetchNextEvent]);

  useEffect(() => {
      const element = observerTarget.current;
      if (!element) return;
      
      const observer = new IntersectionObserver(handleObserver, { threshold: 0.1, rootMargin: '100px' });
      observer.observe(element);
      
      return () => observer.disconnect();
  }, [handleObserver, showMobileMetrics, showMobileFilters]); // Re-attach if layout shifts

  // Metrics Display Component
  const MetricsSummary = () => {
    // Mobile: Conditionally render
    if (!showMobileMetrics && window.innerWidth < 768) return null; // Simple check, or rely on CSS class hidden
    
    // We will use CSS classes for visibility control instead of JS window check to be SSR safe / responsive safe
    const content = (() => {
        if (activeTab === 'gate' && gateResponse?.metrics) {
        const m = gateResponse.metrics;
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <MetricCard label="Total Days" value={m.totalDays} icon={<CalenderIcon className="text-blue-500" />} />
            <MetricCard label="Present" value={m.presentCount} icon={<CheckCircleIcon className="text-green-500" />} />
            <MetricCard label="Late" value={m.lateCount} icon={<TimeIcon className="text-yellow-500" />} />
            <MetricCard label="Early Leave" value={m.earlyLeaveCount} icon={<TimeIcon className="text-orange-500" />} />
            <MetricCard label="Absent" value={m.absentCount} icon={<CloseIcon className="text-red-500" />} />
            <MetricCard label="Attendance %" value={`${m.attendancePercentage}%`} icon={<CheckCircleIcon className="text-brand-500" />} />
            </div>
        );
        }
        if (activeTab === 'class' && classResponse?.metrics) {
        const m = classResponse.metrics;
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <MetricCard label="Total Sessions" value={m.totalSessions} icon={<CalenderIcon className="text-blue-500" />} />
            <MetricCard label="Present" value={m.presentCount} icon={<CheckCircleIcon className="text-green-500" />} />
            <MetricCard label="Late" value={m.lateCount} icon={<TimeIcon className="text-yellow-500" />} />
            <MetricCard label="Excused" value={m.excusedCount} icon={<AlertIcon className="text-indigo-500" />} />
            <MetricCard label="Absent" value={m.absentCount} icon={<CloseIcon className="text-red-500" />} />
            <MetricCard label="Attendance %" value={`${m.attendancePercentage}%`} icon={<CheckCircleIcon className="text-brand-500" />} />
            </div>
        );
        }
        if (activeTab === 'event' && eventResponse?.metrics) {
        const m = eventResponse.metrics;
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total Events" value={m.totalEvents} icon={<CalenderIcon className="text-blue-500" />} />
            <MetricCard label="Attended" value={m.attendedCount} icon={<CheckCircleIcon className="text-green-500" />} />
            <MetricCard label="Missed" value={m.missedCount} icon={<CloseIcon className="text-red-500" />} />
            </div>
        );
        }
        return null;
    })();

    if (!content) return null;

    return (
        <div className={`${showMobileMetrics ? 'block' : 'hidden'} md:block`}>
            {content}
        </div>
    );
  };

  const MetricCard = ({ label, value, icon }: { label: string, value: number | string, icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 shrink-0">
        {React.isValidElement(icon)
           ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `size-5 ${((icon as React.ReactElement).props as { className?: string }).className || ''}` })
           : icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  // Helper methods and hooks
  const getStatusBadge = (status: string, isLate?: boolean) => {
    if (isLate) return <Badge color="error">Late</Badge>;
    if (status === 'present' || status === 'on-time') return <Badge color="success">Present</Badge>;
    if (status === 'absent') return <Badge color="error">Absent</Badge>;
    if (status === 'excused') return <Badge color="warning">Excused</Badge>;
    return <Badge color="primary">{status}</Badge>;
  };

  const currentData = useMemo(() => {
    if (activeTab === 'gate') return gateResponse?.data || [];
    if (activeTab === 'class') return classResponse?.data || [];
    if (activeTab === 'event') return eventResponse?.data || [];
    return [];
  }, [activeTab, gateResponse, classResponse, eventResponse]);

  const currentMeta = useMemo(() => {
    if (activeTab === 'gate') return gateResponse?.meta;
    if (activeTab === 'class') return classResponse?.meta;
    if (activeTab === 'event') return eventResponse?.meta;
    return null;
  }, [activeTab, gateResponse, classResponse, eventResponse]);

  const isLoading = isLoadingGate || isLoadingClass || isLoadingEvent;

  const total = Number(currentMeta?.total ?? 0);
  const totalPages = Number(currentMeta?.totalPages ?? Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <PageMeta
        title="Attendance History | Sistem Absen"
        description="View comprehensive attendance history records."
      />
      <PageBreadcrumb pageTitle="Attendance History" />

      <main className="space-y-0 md:space-y-6">
        {/* Header - Hidden on Mobile */}
        <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Attendance History
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and track all attendance records across different types.
            </p>
          </div>
        </div>

        {/* Tabs - Sticky on Mobile */}
        {/* Main Card Wrapper: Transparent on Mobile, White Card on Desktop */}
        <div className="bg-transparent md:bg-white md:dark:bg-gray-800 md:rounded-2xl md:border md:border-gray-200 md:dark:border-white/5 md:shadow-sm md:overflow-hidden md:p-6">
            
            {/* Sticky Header for Mobile */}
            <div className="sticky top-[64px] z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/5 pt-2 pb-2 md:static md:bg-transparent md:border-none md:pt-0 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 shadow-sm md:shadow-none">
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={(id) => { setActiveTab(id as AttendanceTab); setPage(1); }}
                />

                {/* Mobile Actions Toolbar (Metrics & Filters Toggle) */}
                <div className="flex bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-white/5 mt-4 md:hidden gap-2">
                    <button 
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${showMobileFilters ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        <GridIcon className="size-4" />
                        Filters
                    </button>
                    <div className="w-px bg-gray-200 dark:bg-white/10 my-1"></div>
                    <button 
                        onClick={() => setShowMobileMetrics(!showMobileMetrics)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${showMobileMetrics ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        <div className="rotate-90"><GridIcon className="size-4" /></div>
                        Metrics
                    </button>
                </div>
            </div>

            <div className="mt-4 md:mt-6">
                <MetricsSummary />
                
                {/* Filters Section */}
                <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block bg-white md:bg-gray-50 dark:bg-gray-800 md:dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-4 mb-6 shadow-sm md:shadow-none`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Common: Date Filters */}
                    <div className="w-full">
                        <DatePicker 
                            label="Start Date" 
                            value={dateFrom} 
                            onChange={setDateFrom} 
                            placeholder="Select start date"
                        />
                    </div>
                    <div className="w-full">
                        <DatePicker 
                            label="End Date" 
                            value={dateTo} 
                            onChange={setDateTo} 
                            placeholder="Select end date"
                        />
                    </div>

                    {activeTab === 'gate' && (
                        <>
                        {/* Removed Class Filter for Gate Tab as requested */}
                        <CustomSelect 
                            label="Status" 
                            value={statusFilter} 
                            onChange={(val: string | number) => setStatusFilter(String(val))} 
                            options={[{label: "All Status", value: "all"}, {label: "Present", value: "present"}, {label: "Late", value: "late"}, {label: "Absent", value: "absent"}]} 
                            placeholder="Select Status"
                        />
                        </>
                    )}

                  {activeTab === 'class' && (
                    <>
                       <CustomSelect 
                          label="Status" 
                          value={statusFilter} 
                          onChange={(val: string | number) => setStatusFilter(String(val))} 
                          options={[{label: "All Status", value: "all"}, {label: "Present", value: "present"}, {label: "Absent", value: "absent"}, {label: "Late", value: "late"}, {label: "Excused", value: "excused"}]} 
                          placeholder="Select Status"
                       />
                       {/* Empty div to fill grid if needed, or let it flow naturally */}
                       <div className="hidden lg:block"></div>
                    </>
                  )}

                  {activeTab === 'event' && (
                    <>
                       <CustomSelect 
                          label="Event Status" 
                          value={eventStatus} 
                          onChange={(val: string | number) => setEventStatus(String(val))} 
                          options={[{label: "All", value: ""}, {label: "Pending", value: "pending"}, {label: "Accepted", value: "accepted"}, {label: "Declined", value: "declined"}]} 
                          placeholder="Select Status"
                       />
                       <CustomSelect 
                          label="Time Filter" 
                          value={eventTimeFilter} 
                          onChange={(val: string | number) => setEventTimeFilter(val as "all" | "upcoming" | "past")} 
                          options={[{label: "All Time", value: "all"}, {label: "Upcoming", value: "upcoming"}, {label: "Past", value: "past"}]} 
                          placeholder="Select Time"
                       />
                    </>
                  )}
               </div>
            </div>


          {/* Mobile Card View (Lazy Load) */}
          <div className="block md:hidden space-y-4">
             {(() => {
                // Determine which data to show
                const flattenData = () => {
                   if (activeTab === "gate") return gateMobileData?.pages.flatMap(p => p.data) || [];
                   if (activeTab === "class") return classMobileData?.pages.flatMap(p => p.data) || [];
                   if (activeTab === "event") return eventMobileData?.pages.flatMap(p => p.data) || [];
                   return [];
                };

                const mobileData = flattenData();
                const isLoadingMobile = isLoadingGateMobile || isLoadingClassMobile || isLoadingEventMobile;
                const hasNext = activeTab === "gate" ? hasNextGate : activeTab === "class" ? hasNextClass : hasNextEvent;
                const isFetchingNext = activeTab === "gate" ? isFetchingNextGate : activeTab === "class" ? isFetchingNextClass : isFetchingNextEvent;

                if (isLoadingMobile) {
                   return (
                      <div className="flex flex-col gap-4">
                         {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                      </div>
                   );
                }

                if (mobileData.length === 0) {
                   return (
                      <div className="py-12 text-center text-gray-400">
                         <div className="flex flex-col items-center gap-2">
                           <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                             <TimeIcon className="size-5 opacity-20" />
                           </div>
                           <p className="text-sm font-medium">No records found.</p>
                         </div>
                      </div>
                   );
                }

                return (
                   <>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {mobileData.map((record: any, idx: number) => (
                         <div key={`${record.id}-${idx}`} className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl p-4 space-y-3 shadow-sm">
                            {/* Card Header: User/Main Info & Status */}
                            <div className="flex justify-between items-start gap-3">
                               <div className="flex items-center gap-3">
                                 {activeTab === 'gate' && (
                                    <>
                                       <Avatar src={record.user?.photo} alt={record.user?.name} size="small" />
                                       <div>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">{record.user?.name || 'Unknown'}</p>
                                          <p className="text-xs text-gray-500">
                                            {/* Logic: if student, show NIS, else email */}
                                            {(record.user?.role === 'student' || record.studentProfile)
                                              ? (record.studentProfile?.nis || record.user?.profile?.nis || '-')
                                              : (record.user?.email || record.userId)}
                                          </p>
                                       </div>
                                    </>
                                 )}
                                 {/* (Other tabs remain same logic, just mobileData source) */}
                                 {activeTab === 'class' && (
                                    <>
                                       <div className="size-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                                         <UserIcon className="size-4 text-brand-600 dark:text-brand-400" />
                                       </div>
                                       <div>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">{record.student?.name || '-'}</p>
                                          <p className="text-xs text-gray-500">
                                            {(record.student?.profile?.nis || record.student?.nis || record.student?.email || '-')}
                                          </p>
                                       </div>
                                    </>
                                 )}
                                 {activeTab === 'event' && (
                                    <div>
                                       <p className="text-sm font-medium text-gray-900 dark:text-white">{record.event?.name || '-'}</p>
                                       <p className="text-xs text-gray-500">{record.event?.startTime ? format(parseISO(record.event.startTime), 'dd MMM yyyy HH:mm') : '-'}</p>
                                    </div>
                                 )}
                               </div>

                               {/* Status Badge */}
                               <div>
                                 {activeTab === 'gate' && getStatusBadge(record.statusLabel || record.status?.name || 'present', record.isLate)}
                                 {activeTab === 'class' && getStatusBadge(record.status)}
                                 {activeTab === 'event' && (
                                    record.attendanceStatus?.hasAttended
                                      ? getStatusBadge(record.attendanceStatus.status, record.attendanceStatus.isLate)
                                      : <Badge color="warning">Not Attended</Badge>
                                 )}
                               </div>
                            </div>

                            {/* Card Body: Details */}
                            <div className="pt-3 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-y-2 text-sm">

                               {/* Gate Details */}
                               {activeTab === 'gate' && (
                                 <>
                                    <div>
                                       <p className="text-xs text-gray-500 mb-0.5">Date</p>
                                       <p className="font-medium text-gray-900 dark:text-white">
                                          {record.date ? format(parseISO(record.date), 'dd MMM yyyy') : '-'}
                                       </p>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-xs text-gray-500 mb-0.5">Method</p>
                                        <Badge color="light" size="sm" className="uppercase text-[10px] tracking-wider font-semibold text-gray-500 inline-block">
                                           {record.method?.replace('_', ' ') || 'MANUAL'}
                                        </Badge>
                                    </div>
                                    <div className="col-span-2 flex gap-4 mt-2 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                                       <div className="flex-1">
                                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Clock In</p>
                                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                             {record.clockIn ? format(parseISO(record.clockIn), 'HH:mm') : '--:--'}
                                          </p>
                                       </div>
                                       <div className="w-px bg-gray-200 dark:bg-white/10"></div>
                                       <div className="flex-1 text-right">
                                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Clock Out</p>
                                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                             {record.clockOut ? format(parseISO(record.clockOut), 'HH:mm') : '--:--'}
                                          </p>
                                       </div>
                                    </div>
                                 </>
                               )}

                               {/* Class Details */}
                               {activeTab === 'class' && (
                                 <>
                                    <div>
                                       <p className="text-xs text-gray-500 mb-0.5">Date</p>
                                       <p className="font-medium text-gray-900 dark:text-white">
                                          {record.teachingSession?.sessionDate ? format(parseISO(record.teachingSession.sessionDate), 'dd MMM yyyy') : '-'}
                                       </p>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-xs text-gray-500 mb-0.5">Time</p>
                                       <p className="font-medium text-gray-900 dark:text-white">
                                         {record.teachingSession?.startTime && record.teachingSession?.endTime
                                           ? `${record.teachingSession.startTime.slice(0, 5)} - ${record.teachingSession.endTime.slice(0, 5)}`
                                           : '-'}
                                       </p>
                                    </div>
                                    <div>
                                       <p className="text-xs text-gray-500 mb-0.5">Recorded At</p>
                                       <p className="font-medium text-gray-900 dark:text-white">
                                          {record.recordedAt ? format(parseISO(record.recordedAt), 'HH:mm') : '-'}
                                       </p>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-xs text-gray-500 mb-0.5">Method</p>
                                       <p className="font-medium text-gray-900 dark:text-white">
                                          {record.method || 'manual'}
                                       </p>
                                    </div>
                                 </>
                               )}

                               {/* Event Details */}
                               {activeTab === 'event' && (
                                 <>
                                    <div>
                                       <p className="text-xs text-gray-500 mb-0.5">Invitation Status</p>
                                       <p className="font-medium text-gray-900 dark:text-white capitalize">
                                          {record.status || '-'}
                                       </p>
                                    </div>
                                 </>
                               )}

                            </div>
                         </div>
                      ))}

                      {/* Infinite Scroll Loader & Sentinel */}
                      {(isFetchingNext || hasNext) && (
                         <div ref={observerTarget} className="py-4 space-y-4">
                            {isFetchingNext && (
                               <>
                                 <SkeletonCard />
                                 <SkeletonCard />
                               </>
                            )}
                         </div>
                      )}

                      {!hasNext && mobileData.length > 0 && (
                         <div className="text-center py-4 text-xs text-gray-400">
                            You've reached the end of the list.
                         </div>
                      )}
                   </>
                );
             })()}
           </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {activeTab === 'gate' && (
                    <>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User Details
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Clock In/Out
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Method
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                        Status
                      </TableCell>
                    </>
                  )}

                  {activeTab === 'class' && (
                    <>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Session Date
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Recorded At
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                        Status
                      </TableCell>
                    </>
                  )}

                  {activeTab === 'event' && (
                    <>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Event Name
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Start Time
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Invitation Status
                      </TableCell>
                      <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                        Attendance
                      </TableCell>
                    </>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                        <span className="text-sm">Loading records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                          <TimeIcon className="size-5 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">No records found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((record: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      {activeTab === 'gate' && (
                        <>
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={record.user?.photo}
                                alt={record.user?.name || record.userId}
                                size="small"
                                className="shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.user?.name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {record.user?.email || record.userId}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                             <div className="flex flex-col">
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {record.date ? format(parseISO(record.date), 'dd MMM yyyy') : '-'}
                                </span>
                                {record.academicYear?.name && (
                                   <span className="text-xs text-gray-400">
                                     {record.academicYear.name.split(' ').slice(-1)[0] || ''}
                                   </span>
                                )}
                             </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                             <div className="flex flex-col text-sm">
                                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                   <span className="font-medium text-green-600 dark:text-green-400">In:</span>
                                   {record.clockIn ? format(parseISO(record.clockIn), 'HH:mm') : '-'}
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                   <span>Out:</span>
                                   {record.clockOut ? format(parseISO(record.clockOut), 'HH:mm') : '-'}
                                </div>
                             </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <Badge color="light" size="sm" className="uppercase text-[10px] tracking-wider font-semibold text-gray-500">
                               {record.method?.replace('_', ' ') || 'MANUAL'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            {getStatusBadge(record.statusLabel || record.status?.name || 'present', record.isLate)}
                          </TableCell>
                        </>
                      )}

                      {activeTab === 'class' && (
                        <>
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                                <UserIcon className="size-4 text-brand-600 dark:text-brand-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.student?.name || '-'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.method || 'manual'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {record.teachingSession?.sessionDate ? format(parseISO(record.teachingSession.sessionDate), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {record.teachingSession?.startTime && record.teachingSession?.endTime 
                              ? `${record.teachingSession.startTime.slice(0, 5)} - ${record.teachingSession.endTime.slice(0, 5)}`
                              : '-'}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {record.recordedAt ? format(parseISO(record.recordedAt), 'HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            {getStatusBadge(record.status)}
                          </TableCell>
                        </>
                      )}

                      {activeTab === 'event' && (
                        <>
                          <TableCell className="px-5 py-4">
                             <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {record.event?.name || '-'}
                             </span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {record.event?.startTime ? format(parseISO(record.event.startTime), 'dd MMM yyyy HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <span className="capitalize">{record.status}</span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                             {record.attendanceStatus?.hasAttended 
                               ? getStatusBadge(record.attendanceStatus.status, record.attendanceStatus.isLate)
                               : <Badge color="warning">Not Attended</Badge>
                             }
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="hidden md:flex flex-col gap-4 px-6 py-4 border-t border-gray-100 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                <span className="font-medium text-gray-700 dark:text-white">{total}</span> results
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

                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                  <span className="text-sm text-gray-400">/</span>
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
        </div>
      </main>
    </div>
  );
};

export default AttendanceHistory;
