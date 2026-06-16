import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import {
  useGroupedTeachingSessions,
  useBulkSubjectAttendance,
  useSubjectAttendances,
  useValidateSession,
} from "../../../api/hooks/useAttendance";
import { useClassEnrollments } from "../../../api/hooks/useAcademic";
import { TeachingSession } from "../../../api/types/attendance";
import { attendanceService } from "../../../api/services/attendanceService";
import { ClassEnrollment } from "../../../api/types/academic";
import {
  TimeIcon as ClockIcon,
  BoltIcon,
  CheckLineIcon,
  CloseLineIcon,
  TimeIcon,
  UserIcon,
  EditIcon,
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import Button from "../../../components/atoms/Button";
import Avatar from "../../../components/atoms/Avatar";
import { format } from "date-fns";
import { useAuthStore } from "../../../store/authStore";
import Modal from "../../../components/molecules/Modal";
import { showSuccess, showError } from "../../../utils/toast";

const ClassroomCommand: React.FC = () => {
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const today = format(currentTime, "yyyy-MM-dd");

  const roleNames = [
    ...(user?.roles?.map((r) => r.name.toLowerCase()) || []),
    ...(user?.userTypes?.map((t) => t.toLowerCase()) || []),
    ...(user?.typeAssignments?.map((t) => t.userType?.name?.toLowerCase() || "") || []),
  ];
  const isAdmin = roleNames.some(r => r.includes("admin") || r.includes("staff"));

  // Fetch today's sessions. If admin, fetch all (no teacher filter).
  const { data: sessionsResponse, isLoading: isLoadingSessions } =
    useGroupedTeachingSessions({
      actualTeacherId: isAdmin ? undefined : user?.id?.toString(),
      sessionDate: today,
      limit: isAdmin ? 500 : 50,
    });

  const groupedSessions = useMemo(() => {
    const raw: any = sessionsResponse || {};
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

  // Action Handlers
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [validationNotes, setValidationNotes] = useState("");
  const [sessionToValidate, setSessionToValidate] = useState<TeachingSession | null>(null);

  const { mutateAsync: validateSession, isPending: isValidating } = useValidateSession();
  const { createMutation: createSubjectAttendance } = useSubjectAttendances();

  const handleTeacherCheckIn = async (session: TeachingSession) => {
    if (!session || !user?.id) return;
    try {
      await attendanceService.bulkCreateSubjectAttendance({
        teachingSessionId: session.id,
        records: [
          {
            studentId: user.id.toString(),
            status: 'present',
            remarks: 'Teacher check-in',
            method: 'manual'
          }
        ]
      });
      
      if (session.validationStatus === 'invalid' || session.validationStatus === 'valid') {
        await validateSession({
          id: session.id,
          status: 'pending' as any,
          notes: 'Teacher re-started session'
        }).catch(() => {});
      }

      showSuccess("Successfully started session!");
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to start session");
    }
  };

  const handleOpenValidateModal = (session: TeachingSession) => {
    setSessionToValidate(session);
    setValidationNotes(session.validationNotes || "");
    setIsValidateModalOpen(true);
  };

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-full mx-auto space-y-6 sm:space-y-8 pb-32">
      <PageMeta
        title="Classroom Command | Teacher"
        description="Manage your live classroom session."
      />

      {/* Header */}
      <div className="flex flex-col gap-1">
        <PageBreadcrumb pageTitle="Classroom Command" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {format(currentTime, "EEEE, dd MMM yyyy")} · {format(currentTime, "HH:mm")}
        </p>
      </div>

      {/* 1. Active Session Card */}
      <section>
        <NowCard session={activeSession} isLoading={isLoadingSessions} />
      </section>

      {/* 2. Session List */}
      {Object.keys(groupedSessions).length > 0 ? (
        <section className="space-y-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight px-1 flex items-center gap-2.5">
            <span className="w-1 h-5 bg-brand-500 rounded-full"></span>
            Today's Sessions
          </h3>

          {Object.entries(groupedSessions).map(([level, categories]) => (
            <div key={level} className="space-y-4">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                {level}
              </p>

              {Object.entries(categories as any).map(([category, sessionsList]) => {
                if (!Array.isArray(sessionsList)) return null;
                return (
                  <div key={category} className="space-y-3">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 flex items-center gap-2">
                      {category}
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-gray-400 dark:text-gray-500 lowercase font-medium">
                        {sessionsList.length} sessions
                      </span>
                    </p>
                    <SessionCardList
                      sessions={sessionsList as TeachingSession[]}
                      activeId={activeSession?.id}
                      onSelect={(id) => setSelectedSessionId(id)}
                      isAdmin={isAdmin}
                      isStarting={createSubjectAttendance.isPending}
                      onValidateClick={handleOpenValidateModal}
                      onStartSessionClick={handleTeacherCheckIn}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ) : (
        !isLoadingSessions &&
        allSessions.length === 0 && (
          <div className="py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 dark:bg-white/[0.02] dark:border-white/[0.06]">
            <div className="size-14 mx-auto bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-md mb-4">
              <BoltIcon className="size-6 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              No Sessions Today
            </h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              You're all clear! Take a break or check upcoming schedules.
            </p>
          </div>
        )
      )}

      {/* 3. Bubble Board (always visible) */}
      {activeSession && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                Student Attendance
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-3.5">
                Tap to cycle: Present → Late → Absent
              </p>
            </div>
            <Badge
              color="primary"
              variant="light"
              className="font-bold text-xs px-2.5 py-1 rounded-lg"
            >
              {activeSession.classSubject?.class?.name || "No Class"}
            </Badge>
          </div>

          {activeSession.validationNotes && (
            <div className={`p-3 rounded-lg border text-sm ${
              activeSession.validationStatus === 'invalid' 
                ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300' 
                : activeSession.validationStatus === 'valid'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300'
            }`}>
              <p className="font-semibold mb-0.5 text-xs uppercase tracking-wider opacity-80">Validation Note</p>
              <p>{activeSession.validationNotes}</p>
            </div>
          )}

          <BubbleBoard teachingSession={activeSession} />
        </section>
      )}

      {/* Validation Modal */}
      <Modal
        isOpen={isValidateModalOpen}
        onClose={() => setIsValidateModalOpen(false)}
        title="Validate Physical Presence"
        className="max-w-md w-full mx-auto"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are physically validating that <strong>{sessionToValidate?.actualTeacher?.name || sessionToValidate?.classSubject?.teacher?.name}</strong> is present in class <strong>{sessionToValidate?.classSubject?.class?.name}</strong>.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
              rows={3}
              placeholder="e.g. Teacher went to restroom, substitute taking over..."
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-white/10">
            <Button
              variant="outline"
              disabled={isValidating}
              onClick={async () => {
                if (!sessionToValidate) return;
                try {
                  await validateSession({
                    id: sessionToValidate.id,
                    status: 'invalid',
                    notes: validationNotes
                  });
                  
                  if (sessionToValidate.actualTeacherId) {
                    await attendanceService.bulkCreateSubjectAttendance({
                      teachingSessionId: sessionToValidate.id,
                      records: [
                        {
                          studentId: sessionToValidate.actualTeacherId.toString(),
                          status: 'absent',
                          remarks: 'Piket marked as invalid (Teacher Missing)',
                          method: 'manual'
                        }
                      ]
                    }).catch(() => {});
                  }

                  showSuccess("Session marked as INVALID");
                  setIsValidateModalOpen(false);
                  setValidationNotes("");
                } catch (err: any) {
                  showError(err.message || "Failed to validate");
                }
              }}
              className="!text-red-500 !ring-red-500 hover:!bg-red-50 dark:hover:!bg-red-500/10"
            >
              Teacher Missing
            </Button>
            <Button
              variant="primary"
              disabled={isValidating}
              onClick={async () => {
                if (!sessionToValidate) return;
                try {
                  await validateSession({
                    id: sessionToValidate.id,
                    status: 'valid',
                    notes: validationNotes
                  });

                  if (sessionToValidate.actualTeacherId) {
                    await attendanceService.bulkCreateSubjectAttendance({
                      teachingSessionId: sessionToValidate.id,
                      records: [
                        {
                          studentId: sessionToValidate.actualTeacherId.toString(),
                          status: 'present',
                          remarks: 'Piket physically validated',
                          method: 'manual'
                        }
                      ]
                    }).catch(() => {});
                  }

                  showSuccess("Session Validated");
                  setIsValidateModalOpen(false);
                  setValidationNotes("");
                } catch (err: any) {
                  showError(err.message || "Failed to validate");
                }
              }}
            >
              Validate (Valid)
            </Button>
          </div>
        </div>
      </Modal>
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
        setTimeLeft("Ended");
      } else {
        const mins = Math.floor(diff / 1000 / 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [session]);

  if (isLoading)
    return (
      <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div>
    );
  if (!session)
    return (
      <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
        <ClockIcon className="size-8 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-semibold text-sm">
          Select a session to start command
        </p>
      </div>
    );

  const validationColor = session.validationStatus === 'valid'
    ? { bg: 'from-emerald-600 via-emerald-700 to-teal-800', glow: 'bg-emerald-400/25', accent: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' }
    : session.validationStatus === 'invalid'
    ? { bg: 'from-rose-600 via-red-700 to-rose-800', glow: 'bg-rose-400/25', accent: 'text-rose-300', badge: 'bg-rose-500/20 text-rose-200 border-rose-400/30' }
    : { bg: 'from-slate-700 via-slate-800 to-gray-900', glow: 'bg-brand-400/15', accent: 'text-brand-300', badge: 'bg-brand-500/20 text-brand-200 border-brand-400/30' };

  return (
    <>
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg">
        {/* Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${validationColor.bg}`}></div>
        <div className={`absolute top-0 right-0 w-72 h-72 ${validationColor.glow} rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4`}></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>

        {/* Watermark */}
        <div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none select-none">
          <span className="text-[6rem] sm:text-[8rem] font-black leading-none text-white">
            {session.classSubject?.subject?.code?.substring(0, 3) || "CLS"}
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 sm:p-7 space-y-5">
          {/* Top Row: Badges + Timer */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${validationColor.badge} border px-2.5 py-1 rounded-lg backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider`}>
                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                </span>
                Live
              </Badge>

              {session.isSubstitution && (
                <Badge className="bg-orange-500/20 text-orange-200 border border-orange-400/30 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  Sub
                </Badge>
              )}

              {session.validationStatus === 'valid' && (
                <Badge className="bg-white/10 text-white/80 border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  ✓ Validated
                </Badge>
              )}

              {session.validationStatus === 'invalid' && (
                <Badge className="bg-white/10 text-white/80 border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  ✕ Invalid
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-black/20 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <ClockIcon className={`size-3.5 ${validationColor.accent}`} />
              <span className="text-white font-mono font-bold text-xs tracking-wide">
                {timeLeft}
              </span>
            </div>
          </div>

          {/* Subject + Class */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${validationColor.accent} mb-1`}>
              {session.classSubject?.subject?.name || "Subject"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              {session.classSubject?.class?.name || "Class"}
            </h2>
          </div>

          {/* Teacher + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                {session.actualTeacher?.photo ? (
                  <img src={session.actualTeacher.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="size-4 text-white/60" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {session.actualTeacher?.name || "Unknown Teacher"}
                </p>
                <p className="text-[10px] text-white/50">
                  {session.isSubstitution ? "Substitute" : "Assigned"} · {session.teachingUnits} units
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Actions moved to individual cards */}
            </div>
          </div>

          {/* Footer: Time range */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-3 text-white/40 text-xs font-medium">
              <span>Code: {session.classSubject?.subject?.code}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-white/90 tracking-tight">
                {session.startTime.substring(0, 5)}
              </span>
              <span className={`text-xs font-medium ${validationColor.accent} ml-2`}>
                — {session.endTime.substring(0, 5)}
              </span>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

// --- Session Card List (horizontal scroll on mobile, grid on desktop) ---

const SessionCardList = ({
  sessions,
  activeId,
  onSelect,
  isAdmin,
  isStarting,
  onValidateClick,
  onStartSessionClick,
}: {
  sessions: TeachingSession[];
  activeId: string | number | undefined;
  onSelect: (id: string | number) => void;
  isAdmin?: boolean;
  isStarting?: boolean;
  onValidateClick?: (s: TeachingSession) => void;
  onStartSessionClick?: (s: TeachingSession) => void;
}) => {
  const getStatusStyles = (s: TeachingSession, isActive: boolean) => {
    const v = s.validationStatus;
    if (isActive) {
      if (v === 'valid') return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-400 shadow-md shadow-emerald-100 dark:shadow-emerald-900/30 ring-1 ring-emerald-500/20";
      if (v === 'invalid') return "bg-rose-50 dark:bg-rose-900/20 border-rose-500 dark:border-rose-400 shadow-md shadow-rose-100 dark:shadow-rose-900/30 ring-1 ring-rose-500/20";
      return "bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-400 shadow-md shadow-brand-100 dark:shadow-brand-900/30 ring-1 ring-brand-500/20";
    }
    if (v === 'valid') return "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-500/15 hover:border-emerald-300 dark:hover:border-emerald-500/30";
    if (v === 'invalid') return "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-500/15 hover:border-rose-300 dark:hover:border-rose-500/30";
    return "bg-white dark:bg-zinc-900/60 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10";
  };

  const getStatusDot = (v: string | undefined) => {
    if (v === 'valid') return { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Valid' };
    if (v === 'invalid') return { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', label: 'Invalid' };
    return { dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', label: 'Pending' };
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar touch-pan-x snap-x -mx-1 px-1">
      {sessions
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((s) => {
          const isActive = s.id === activeId;
          const statusInfo = getStatusDot(s.validationStatus);
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              role="button"
              tabIndex={0}
              className={`relative flex-shrink-0 w-48 sm:w-52 p-4 rounded-xl border text-left transition-all duration-200 snap-start ${getStatusStyles(s, isActive)} ${isActive ? '' : 'hover:shadow-sm active:scale-[0.98]'}`}
            >
              {/* Time */}
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-wider mb-2">
                {s.startTime.substring(0, 5)} — {s.endTime.substring(0, 5)}
              </p>

              {/* Subject */}
              <h4 className="font-bold text-base text-gray-900 dark:text-white tracking-tight leading-tight mb-0.5">
                {s.classSubject?.subject?.code || "CODE"}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-3">
                {s.classSubject?.class?.name || "Class"}
              </p>

              {/* Teacher */}
              <div className="flex items-center gap-2 mb-3">
                <div className="size-5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {s.actualTeacher?.photo ? (
                    <img src={s.actualTeacher.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px]">👤</span>
                  )}
                </div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate">
                  {s.actualTeacher?.name || "No Teacher"}
                </p>
              </div>

              {/* Status & Actions */}
              <div className="pt-2.5 border-t border-gray-100 dark:border-white/5">
                {s.isCancelled ? (
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                    Cancelled
                  </span>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${statusInfo.text}`}>
                      <span className={`size-1.5 rounded-full ${statusInfo.dot} ${isActive && !s.validationStatus ? 'animate-pulse' : ''}`}></span>
                      {statusInfo.label}
                    </div>
                    {/* Action Button */}
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      {isAdmin ? (
                        <button
                          title={s.validationStatus === 'valid' || s.validationStatus === 'invalid' ? 'Update Validation' : 'Validate Session'}
                          onClick={() => onValidateClick?.(s)}
                          className={`flex items-center justify-center size-7 rounded-full transition-colors ${
                            s.validationStatus === 'valid' || s.validationStatus === 'invalid'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300'
                              : 'bg-brand-100 hover:bg-brand-200 text-brand-600 dark:bg-brand-500/20 dark:hover:bg-brand-500/30 dark:text-brand-400'
                          }`}
                        >
                          <EditIcon className="size-3.5" />
                        </button>
                      ) : (
                        <button
                          title="Start Session"
                          onClick={() => onStartSessionClick?.(s)}
                          disabled={isStarting}
                          className={`flex items-center justify-center size-7 rounded-full transition-colors ${
                            s.validationStatus === 'valid'
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400'
                              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {isStarting ? (
                            <div className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <BoltIcon className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

// --- Bubble Board ---

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
      showSuccess("Attendance synced successfully!");
    } catch (err: unknown) {
      showError(
        err instanceof Error ? err.message : "Failed to sync attendance"
      );
    }
  };

  const enrollmentsList = useMemo(() => enrollments, [enrollments]);

  const counts = useMemo(() => {
    const vals = Object.values(localAttendance);
    return {
      present: vals.filter((v) => v === "present").length,
      late: vals.filter((v) => v === "late").length,
      absent: vals.filter((v) => v === "absent").length,
    };
  }, [localAttendance]);

  if (isLoadingEnroll)
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"
          ></div>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Student Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {enrollmentsList.map((en: ClassEnrollment) => {
          const studentId = String(en.userId);
          const status = localAttendance[studentId] || "absent";

          const statusConfig = {
            present: {
              border: "border-emerald-200 dark:border-emerald-500/20",
              bg: "bg-emerald-50/50 dark:bg-emerald-950/15",
              ring: "ring-emerald-500/30",
              icon: <CheckLineIcon className="size-3" />,
              iconBg: "bg-emerald-500 text-white",
              nameColor: "text-gray-900 dark:text-white",
              label: "Present",
              labelColor: "text-emerald-600 dark:text-emerald-400",
            },
            late: {
              border: "border-amber-200 dark:border-amber-500/20",
              bg: "bg-amber-50/50 dark:bg-amber-950/15",
              ring: "ring-amber-500/30",
              icon: <TimeIcon className="size-3" />,
              iconBg: "bg-amber-500 text-white",
              nameColor: "text-gray-800 dark:text-gray-200",
              label: "Late",
              labelColor: "text-amber-600 dark:text-amber-400",
            },
            absent: {
              border: "border-gray-200 dark:border-white/5",
              bg: "bg-gray-50/50 dark:bg-zinc-900/50",
              ring: "ring-red-500/20",
              icon: <CloseLineIcon className="size-3" />,
              iconBg: "bg-red-500 text-white",
              nameColor: "text-gray-500 dark:text-gray-400",
              label: "Absent",
              labelColor: "text-red-500 dark:text-red-400",
            },
            excused: {
              border: "border-gray-200 dark:border-white/5",
              bg: "bg-gray-50/50 dark:bg-zinc-900/50",
              ring: "ring-gray-300",
              icon: <CheckLineIcon className="size-3" />,
              iconBg: "bg-gray-400 text-white",
              nameColor: "text-gray-500 dark:text-gray-400",
              label: "Excused",
              labelColor: "text-gray-500",
            },
          };

          const cfg = statusConfig[status] || statusConfig.absent;

          return (
            <div
              key={en.id}
              onClick={() => toggleStatus(studentId)}
              className={`relative flex flex-col items-center cursor-pointer group select-none p-3 sm:p-4 rounded-2xl transition-all duration-200 border ${cfg.border} ${cfg.bg} hover:shadow-md active:scale-[0.96]`}
            >
              {/* Avatar */}
              <div className="relative mb-2.5">
                <Avatar
                  src={en.user?.photo || undefined}
                  alt={en.user?.name}
                  size="xlarge"
                  className={`transition-all duration-200 bg-white dark:bg-zinc-800 ${
                    status === "absent" ? "grayscale opacity-70" : ""
                  }`}
                />
                {/* Status dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 z-10 size-5 rounded-full flex items-center justify-center ${cfg.iconBg} border-2 border-white dark:border-zinc-900 shadow-sm`}>
                  {cfg.icon}
                </div>
              </div>

              {/* Name */}
              <p className={`text-xs font-semibold truncate w-full text-center ${cfg.nameColor}`}>
                {en.user?.name?.split(" ")[0] || "Student"}
              </p>
              <p className={`text-[10px] font-medium mt-0.5 ${cfg.labelColor}`}>
                {cfg.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4 shadow-xl shadow-gray-200/40 dark:shadow-black/40">
          <div className="flex gap-4 sm:gap-6 text-center">
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                {counts.present}
              </span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                Present
              </span>
            </div>
            <div className="w-px bg-gray-100 dark:bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl font-bold text-amber-500 leading-none">
                {counts.late}
              </span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                Late
              </span>
            </div>
            <div className="w-px bg-gray-100 dark:bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl font-bold text-red-500 leading-none">
                {counts.absent}
              </span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                Absent
              </span>
            </div>
          </div>

          <Button
            onClick={handleBulkSubmit}
            disabled={isPending}
            size="sm"
            className="rounded-xl px-4 sm:px-6 font-bold bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 shadow-lg shadow-brand-500/20 border-none flex items-center gap-1.5 !py-2.5"
          >
            {isPending ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <BoltIcon className="size-3.5" />
            )}
            {isPending ? "..." : "Sync"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClassroomCommand;
