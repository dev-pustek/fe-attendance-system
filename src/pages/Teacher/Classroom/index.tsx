import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import {
  useGroupedTeachingSessions,
  useBulkSubjectAttendance,
  useSubjectAttendances,
} from "../../../api/hooks/useAttendance";
import { useClassEnrollments } from "../../../api/hooks/useAcademic";
import { TeachingSession } from "../../../api/types/attendance";
import { ClassEnrollment } from "../../../api/types/academic";
import {
  TimeIcon as ClockIcon,
  BoltIcon,
  CheckLineIcon,
  CloseLineIcon,
  TimeIcon,
  UserIcon,
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import Button from "../../../components/atoms/Button";
import Avatar from "../../../components/atoms/Avatar";
import { format } from "date-fns";
import { useMe } from "../../../api/hooks/useAuth";
import { toast } from "react-hot-toast";

const ClassroomCommand: React.FC = () => {
  const { data: userResponse } = useMe();
  const user = userResponse?.data;
  const [currentTime, setCurrentTime] = useState(new Date());
  const today = format(currentTime, "yyyy-MM-dd");

  // Fetch today's sessions for this teacher
  // Fetch grouped sessions for today
  const { data: sessionsResponse, isLoading: isLoadingSessions } =
    useGroupedTeachingSessions({
      actualTeacherId: user?.id?.toString(),
      sessionDate: today,
      limit: 50,
    });

  const groupedSessions = useMemo(() => {
    const raw: any = sessionsResponse || {};
    // The API client merges metadata into the data object for non-array responses.
    // We must filter out these metadata keys to get the pure grouping levels.
    const reservedKeys = ['statusCode', 'message', 'timestamp', 'meta', 'status', 'total', 'page', 'limit', 'data'];
    
    const cleanData: Record<string, any> = {};
    Object.keys(raw).forEach(key => {
      if (!reservedKeys.includes(key)) {
        cleanData[key] = raw[key];
      }
    });

    return cleanData;
  }, [sessionsResponse]);

  // Flatten sessions to find active session
  const allSessions = useMemo(() => {
    const flattened: TeachingSession[] = [];
    if (!groupedSessions) return [];

    Object.values(groupedSessions).forEach((categories: any) => {
      if (typeof categories !== 'object' || categories === null) return;
      Object.values(categories).forEach((sList: any) => {
        if (Array.isArray(sList)) {
          flattened.push(...sList);
        }
      });
    });
    return flattened;
  }, [groupedSessions]);

  // Find active session ("Now" session)
  const nowSession = useMemo(() => {
    const nowTime = format(currentTime, "HH:mm:ss");
    return allSessions.find(
      (s) => s.startTime <= nowTime && s.endTime >= nowTime && !s.isCancelled
    );
  }, [allSessions, currentTime]);

  const [selectedSessionId, setSelectedSessionId] = useState<
    string | number | null
  >(null);

  // Set default selected session to "Now" or first upcoming
  useEffect(() => {
    if (nowSession && !selectedSessionId) {
      setSelectedSessionId(nowSession.id);
    } else if (allSessions.length > 0 && !selectedSessionId) {
      const upcoming = [...allSessions]
        .filter((s) => s.startTime > format(currentTime, "HH:mm:ss"))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
      setSelectedSessionId(upcoming?.id || allSessions[0].id);
    }
  }, [nowSession, allSessions, selectedSessionId, currentTime]);

  const activeSession = useMemo(() => {
    return allSessions.find((s) => s.id === selectedSessionId) || nowSession;
  }, [allSessions, selectedSessionId, nowSession]);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-full mx-auto space-y-12 pb-32">
      <PageMeta
        title="Classroom Command | Teacher"
        description="Manage your live classroom session."
      />
      <div className="flex flex-col gap-1">
        <PageBreadcrumb pageTitle="Classroom Command" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Manage your daily schedule and active class sessions.
        </p>
      </div>

      <div className="space-y-10">
        {/* 1. The "Now" Card */}
        <section>
          <NowCard session={activeSession} isLoading={isLoadingSessions} />
        </section>

        {/* 2. Grouped Journey Sections */}
        {Object.keys(groupedSessions).length > 0
          ? Object.entries(groupedSessions).map(([level, categories]) => (
              <div key={level} className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
                  {level}
                </h3>

                {Object.entries(categories as any).map(([category, sessionsList]) => {
                  // Validate that sessionsList is actually an array before rendering
                  if (!Array.isArray(sessionsList)) return null;
                  
                  return (
                    <section
                      key={category}
                      className="space-y-4 pl-4 border-l-2 border-gray-100 dark:border-white/5 ml-1.5"
                    >
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          {category}
                          <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                          <span className="lowercase font-medium">
                            {sessionsList.length} sessions
                          </span>
                        </h4>
                      </div>
                      <JourneyCarousel
                        sessions={sessionsList as TeachingSession[]}
                        activeId={activeSession?.id}
                        onSelect={(id) => setSelectedSessionId(id)}
                      />
                    </section>
                  );
                })}
              </div>
            ))
          : !isLoadingSessions &&
            allSessions.length === 0 && (
              <div className="py-24 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:bg-white/[0.02] dark:border-white/[0.05] relative overflow-hidden group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-50/50 to-transparent dark:from-brand-900/10"></div>
                <div className="relative z-10">
                  <div className="size-20 mx-auto bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-xl shadow-gray-100 dark:shadow-none mb-6 group-hover:scale-110 transition-transform duration-500">
                    <BoltIcon className="size-8 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 transition-colors duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                    No Sessions Today
                  </h3>
                  <p className="text-gray-400 font-medium text-sm max-w-xs mx-auto">
                    You're all clear! Take a break or check upcoming schedules.
                  </p>
                </div>
              </div>
            )}

        {/* 3. The Attendance Grid (Bubble Board) */}
        {activeSession && (
          <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between px-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Bubble Board
                  </h3>
                  <Badge
                    color="primary"
                    variant="light"
                    className="font-bold px-3 py-1 rounded-lg"
                  >
                    {activeSession.classSubject?.class?.name || "No Class"}
                  </Badge>
                </div>
                <p className="text-xs font-bold text-gray-400">
                  Tap avatars to cycle: Present → Late → Absent
                </p>
              </div>
            </div>

            <BubbleBoard teachingSession={activeSession} />
          </section>
        )}
      </div>
    </div>
  );
};

// --- Sub-Components ---

const NowCard = ({
  session,
  isLoading,
}: {
  session: TeachingSession | undefined;
  isLoading: boolean;
}) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!session) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const [h, m, s] = session.endTime.split(":").map(Number);
      const endTime = new Date(now);
      endTime.setHours(h, m, s || 0);

      const diff = endTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft("Session ended");
      } else {
        const mins = Math.floor(diff / 1000 / 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${mins}m ${secs}s left`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [session]);

  if (isLoading)
    return (
      <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-[2.5rem]"></div>
    );
  if (!session)
    return (
      <div className="p-10 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
        <ClockIcon className="size-10 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-bold italic">
          Select a session to start command
        </p>
      </div>
    );

  return (
    <div className="group relative w-full h-full min-h-[300px] rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10">
      {/* 1. Dynamic Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-brand-950 dark:via-zinc-900 dark:to-zinc-950 z-0"></div>

      {/* 2. Glassmorphism Overlay & Mesh Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 opacity-40"></div>

      <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] z-10 border border-white/10 rounded-[2.5rem]"></div>

      {/* 3. Decorative Elements */}
      <div className="absolute top-10 right-10 opacity-5 z-0 pointer-events-none select-none">
        <span className="text-[10rem] font-bold leading-none tracking-tighter text-white">
          {session.classSubject?.subject?.code?.substring(0, 3) || "CLS"}
        </span>
      </div>

      {/* 4. Content Content */}
      <div className="relative z-20 p-8 md:p-10 flex flex-col justify-between h-full">
        {/* Header: Status & Time */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-brand-500/20 text-brand-200 border border-brand-500/30 px-3 py-1.5 rounded-lg backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              <span className="font-bold tracking-wide text-xs uppercase">
                Live Session
              </span>
            </Badge>

            {session.isSubstitution && (
              <Badge className="bg-orange-500/20 text-orange-200 border border-orange-500/30 px-3 py-1.5 rounded-lg backdrop-blur-md">
                Substitution
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-full px-4 py-2 backdrop-blur-md">
            <ClockIcon className="size-4 text-brand-400" />
            <span className="text-white font-mono font-bold tracking-wide text-sm">
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Hero: Class Info */}
        <div className="mt-8 mb-8 space-y-2">
          <div className="flex items-center gap-3 text-brand-300/80 mb-1">
            <UserIcon className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">
              {session.classSubject?.subject?.name || "Subject Material"}
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-none drop-shadow-xl">
            {session.classSubject?.class?.name || "Class Name"}
          </h2>

          <div className="flex items-center gap-4 mt-4">
            <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
              {session.teachingUnits} Teaching Units
            </div>
            <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
              Code: {session.classSubject?.subject?.code}
            </div>
          </div>
        </div>

        {/* Footer: Interactive Stats */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Attendance Status
            </p>
            <div className="flex items-center -space-x-3 hover:space-x-1 transition-all duration-300">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="relative group/avatar">
                  <div className="size-10 rounded-full border-2 border-gray-800 bg-gray-700 overflow-hidden relative z-10">
                    <img
                      src={`https://i.pravatar.cc/100?u=${i + 20}`}
                      alt="Student"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
              <div className="size-10 rounded-full border-2 border-gray-800 bg-brand-600 text-white flex items-center justify-center text-xs font-bold relative z-20">
                +42
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex flex-col items-end">
              <span className="text-5xl font-mono font-bold text-white tracking-tighter leading-none">
                {session.startTime.substring(0, 5)}
              </span>
              <span className="text-xs font-medium text-brand-400 uppercase tracking-widest mt-1">
                Until {session.endTime.substring(0, 5)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const JourneyCarousel = ({
  sessions,
  activeId,
  onSelect,
}: {
  sessions: TeachingSession[];
  activeId: string | number | undefined;
  onSelect: (id: string | number) => void;
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto px-1 pb-4 no-scrollbar touch-pan-x snap-x">
      {sessions
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex-shrink-0 w-44 p-5 rounded-2xl border text-left transition-all duration-300 snap-start ${
              s.id === activeId
                ? "bg-brand-600 text-white border-brand-600 dark:bg-brand-600 dark:border-brand-500 shadow-xl shadow-brand-500/20 scale-[1.01]"
                : "bg-white text-gray-900 border-gray-100 dark:bg-zinc-900 dark:text-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
            }`}
          >
            <div className="relative z-10">
              <p
                className={`text-[10px] font-bold mb-3 tracking-wide ${
                  s.id === activeId
                    ? "text-brand-100 dark:text-brand-100"
                    : "text-gray-400"
                }`}
              >
                {s.startTime.substring(0, 5)} — {s.endTime.substring(0, 5)}
              </p>
              <h4 className="font-bold text-base truncate mb-0.5">
                {s.classSubject?.subject?.code || "CODE"}
              </h4>
              <p
                className={`text-xs font-medium truncate mb-4 ${
                  s.id === activeId
                    ? "text-brand-50 dark:text-brand-50"
                    : "text-gray-500"
                }`}
              >
                {s.classSubject?.class?.name || "Class"}
              </p>

              <div
                className={`flex justify-between items-center p-2 rounded-lg border backdrop-blur-sm ${
                  s.id === activeId
                    ? "bg-black/10 border-black/5 dark:bg-black/20 dark:border-black/5"
                    : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5"
                }`}
              >
                {s.isCancelled ? (
                  <div className="text-[10px] font-bold text-error-400 uppercase tracking-tight">
                    Cancelled
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight ${
                      s.id === activeId ? "text-white" : "text-gray-400"
                    }`}
                  >
                    <div
                      className={`size-1.5 rounded-full ${
                        s.id === activeId
                          ? "bg-white animate-pulse"
                          : "bg-gray-300"
                      }`}
                    ></div>
                    Ready
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Pattern for Active State */}
            {s.id === activeId && (
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.5"
                  />
                  <path
                    d="M50 10 A 40 40 0 0 1 90 50"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
    </div>
  );
};

const BubbleBoard = ({
  teachingSession,
}: {
  teachingSession: TeachingSession;
}) => {
  const { data: enrollResponse, isLoading: isLoadingEnroll } =
    useClassEnrollments({
      classId: teachingSession.classSubject?.classId,
      limit: 100,
    });

  const { data: attendanceResponse } = useSubjectAttendances({
    teachingSessionId: teachingSession.id,
    limit: 100,
  });

  const { mutateAsync: submitBulk, isPending } = useBulkSubjectAttendance();

  const enrollments = useMemo(
    () => enrollResponse?.data || [],
    [enrollResponse]
  );
  const existingAttendances = useMemo(
    () => attendanceResponse?.data || [],
    [attendanceResponse]
  );

  const [localAttendance, setLocalAttendance] = useState<
    Record<string, "present" | "absent" | "late" | "excused">
  >({});

  // Sync existing attendance to local state
  useEffect(() => {
    const map: Record<string, "present" | "absent" | "late" | "excused"> = {};
    existingAttendances.forEach((a) => {
      const studentId =
        typeof a.studentId === "string" ? a.studentId : String(a.studentId);
      if (
        a.status === "present" ||
        a.status === "absent" ||
        a.status === "late" ||
        a.status === "excused"
      ) {
        map[studentId] = a.status;
      }
    });
    // For enrollments not in existing attendance, default to "absent"
    enrollments.forEach((en) => {
      const studentId = String(en.userId);
      if (!map[studentId]) map[studentId] = "absent";
    });
    setLocalAttendance(map);
  }, [existingAttendances, enrollments]);

  const toggleStatus = (studentId: string) => {
    const current = localAttendance[studentId] || "absent";
    const order = ["present", "late", "absent"] as const;
    const currentIndex = order.indexOf(current as (typeof order)[number]);
    const next = order[(currentIndex + 1) % order.length];
    setLocalAttendance({ ...localAttendance, [studentId]: next });
  };

  const handleBulkSubmit = async () => {
    try {
      const payload = {
        teachingSessionId: teachingSession.id,
        records: Object.entries(localAttendance).map(([studentId, status]) => ({
          studentId,
          status,
          remarks: "",
        })),
      };
      await submitBulk(payload);
      toast.success("Attendance synced successfully!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync attendance"
      );
    }
  };

  const enrollmentsList = useMemo(() => enrollments, [enrollments]);

  if (isLoadingEnroll)
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 dark:bg-gray-800 animate-pulse rounded-3xl"
          ></div>
        ))}
      </div>
    );

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {enrollmentsList.map((en: ClassEnrollment) => {
          const studentId = String(en.userId);
          const status = localAttendance[studentId] || "absent";

          return (
            <div
              key={en.id}
              onClick={() => toggleStatus(studentId)}
              className={`relative overflow-hidden flex flex-col items-center gap-3 cursor-pointer group select-none p-4 rounded-3xl transition-all duration-300 ${
                status === "present"
                  ? "bg-gradient-to-b from-success-50 to-white border-success-100 dark:from-success-900/20 dark:to-zinc-900/50 dark:border-success-500/20"
                  : status === "late"
                  ? "bg-gradient-to-b from-warning-50 to-white border-warning-100 dark:from-warning-900/20 dark:to-zinc-900/50 dark:border-warning-500/20"
                  : status === "absent"
                  ? "bg-gradient-to-b from-error-50 to-white border-error-100 dark:from-error-900/20 dark:to-zinc-900/50 dark:border-error-500/20"
                  : "bg-white border-transparent hover:border-gray-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
              } border shadow-sm hover:shadow-lg hover:-translate-y-1`}
            >
              {/* Background Pattern for Status */}
              {status !== "absent" &&
              status !== "present" &&
              status !== "late" ? null : (
                <div
                  className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full blur-2xl opacity-40 transition-opacity duration-500 ${
                    status === "present"
                      ? "bg-success-400"
                      : status === "late"
                      ? "bg-warning-400"
                      : "bg-error-400"
                  }`}
                ></div>
              )}

              <div className="relative">
                <Avatar
                  src={en.user?.photo || undefined}
                  alt={en.user?.name}
                  size="xlarge"
                  className={`relative z-10 transition-all duration-300 bg-white dark:bg-zinc-800 ${
                    status === "absent"
                      ? "grayscale ring-4 ring-error-100 dark:ring-error-900/50"
                      : status === "late"
                      ? "ring-4 ring-warning-100 dark:ring-warning-900/50"
                      : status === "present"
                      ? "ring-4 ring-success-100 dark:ring-success-900/50"
                      : "ring-4 ring-gray-50 group-hover:ring-brand-50 dark:ring-white/5 dark:group-hover:ring-brand-900/20"
                  }`}
                />

                {/* Status Indicator Badge */}
                <div
                  className={`absolute -right-2 -top-2 z-20 size-7 rounded-full flex items-center justify-center border-[3px] border-white dark:border-zinc-900 shadow-md transition-all duration-300 transform group-hover:scale-110 ${
                    status === "present"
                      ? "bg-success-500"
                      : status === "late"
                      ? "bg-warning-500"
                      : status === "absent"
                      ? "bg-error-500"
                      : "bg-gray-200 group-hover:bg-brand-500"
                  }`}
                >
                  {status === "present" && (
                    <CheckLineIcon className="size-4 text-white" />
                  )}
                  {status === "late" && (
                    <TimeIcon className="size-4 text-white" />
                  )}
                  {status === "absent" && (
                    <CloseLineIcon className="size-4 text-white" />
                  )}
                  {!["present", "late", "absent"].includes(status) && (
                    <span className="size-2 bg-white rounded-full"></span>
                  )}
                </div>
              </div>

              <div className="relative z-10 text-center space-y-1.5 w-full">
                <span
                  className={`text-sm font-bold block truncate w-full px-2 transition-colors ${
                    status === "present"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {en.user?.name?.split(" ")[0] || "Student"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Horizontal Summary & Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg">
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-6 shadow-2xl shadow-gray-200/50 dark:shadow-black/50 md:p-5">
          <div className="flex gap-4 md:gap-8 px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Present
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {
                  Object.values(localAttendance).filter((v) => v === "present")
                    .length
                }
              </span>
            </div>
            <div className="flex flex-col border-l border-gray-100 dark:border-white/10 pl-4 md:pl-8">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Late/Absent
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {
                  Object.values(localAttendance).filter(
                    (v) => v === "late" || v === "absent"
                  ).length
                }
              </span>
            </div>
          </div>

          <Button
            onClick={handleBulkSubmit}
            disabled={isPending}
            size="md"
            className="rounded-xl px-8 font-bold bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400 shadow-xl shadow-brand-500/20 border-none flex items-center gap-2"
          >
            {isPending ? (
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <BoltIcon className="size-4" />
            )}
            {isPending ? "Syncing..." : "Sync All"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClassroomCommand;
