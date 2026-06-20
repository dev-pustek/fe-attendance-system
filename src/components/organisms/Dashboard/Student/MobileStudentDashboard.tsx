/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import QRCode from "react-qr-code";
import { Link, useNavigate } from "react-router";
import { BellIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { ArrowDownLeftIcon, ArrowUpRightIcon, ClockIcon, DocumentTextIcon, QrCodeIcon, ChevronRightIcon, FaceSmileIcon, EyeIcon } from "@heroicons/react/24/outline";
import { GridIcon, CalenderIcon, MapPinIcon, PieChartIcon, LockIcon, DocsIcon, UserIcon, AlertIcon } from "../../../atoms/Icons";
import NotificationDropdown from "../../Header/NotificationDropdown";
import UserDropdown from "../../Header/UserDropdown";
import { useAuthStore } from "../../../../store/authStore";
import { dashboardService } from "../../../../api/services/dashboardService";
import { attendanceService } from "../../../../api/services/attendanceService";
import { eventService } from "../../../../api/services/eventService";
import { API_BASE_URL } from "../../../../api/client";
import { CameraIcon, MapPinIcon as MapPinSolidIcon, GlobeAltIcon, ShieldExclamationIcon, CalendarDaysIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../../molecules/Modal";
import Button from "../../../atoms/Button";
import { useAppMenu } from "../../../../hooks/useAppMenu";
import { formatDuration } from "../../../utils/format";
import { StudentRoadmapItem } from "../../../../api/types/dashboard";
import toast from "react-hot-toast";

interface MobileStudentDashboardProps {
  logs?: any[];
}

function CurrentTimeClock() {
  const [time, setTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>;
}

function BreakCountdown({ timeRange, isActive }: { timeRange: string, isActive: boolean }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    // timeRange format: "12:00 - 13:00"
    const [startStr, endStr] = timeRange.split(" - ");
    if (!startStr || !endStr) return;

    const timer = setInterval(() => {
      const now = new Date();
      const targetStr = isActive ? endStr : startStr;
      
      const targetTime = new Date();
      const [h, m] = targetStr.split(":").map(Number);
      targetTime.setHours(h, m, 0, 0);

      const diff = targetTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft(isActive ? "Break Over" : "Break Starting");
      } else {
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${totalMinutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRange, isActive]);

  if (!timeLeft) return null;

  return (
    <span className={`font-mono text-[10px] ml-1 px-1.5 py-0.5 rounded-md ${isActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
      {isActive ? 'Ends in ' : 'Starts in '}{timeLeft}
    </span>
  );
}

function GateCountdown({ targetTime, onComplete }: { targetTime: string, onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!targetTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const targetTimeDate = new Date();
      const [h, m, s] = targetTime.split(":").map(Number);
      targetTimeDate.setHours(h, m, s || 0, 0);

      const diff = targetTimeDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("Sekarang");
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          // Add a delay to allow server time to catch up, then trigger refresh
          setTimeout(() => {
            onComplete();
            // Reset trigger after 5 seconds to retry if backend still returns 'upcoming'
            setTimeout(() => {
              hasTriggeredRef.current = false;
            }, 5000);
          }, 1000);
        }
      } else {
        const totalHours = Math.floor(diff / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (totalHours > 0) {
          setTimeLeft(`${totalHours} jam ${remainingMinutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${remainingMinutes}m ${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, onComplete]);

  if (!timeLeft) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 rounded-md px-1.5 py-0.5">
      <ClockIcon className={timeLeft === "Sekarang" ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
      {timeLeft === "Sekarang" ? "Memuat..." : `Dibuka dlm ${timeLeft}`}
    </span>
  );
}

function MobileDashboardSkeleton() {
  return (
    <div className="animate-pulse w-full">
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="w-full mb-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
        <div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
      <div className="space-y-2 relative mt-2 pb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3.5 relative pb-4">
            <div className="relative z-10 flex flex-col items-center mt-0.5 w-[30px] sm:w-8 shrink-0">
              <div className="w-[30px] h-[30px] sm:w-8 sm:h-8 rounded-full bg-gray-200 dark:bg-gray-700 ring-4 ring-gray-50 dark:ring-slate-900"></div>
            </div>
            {i < 3 && (
              <div className="absolute left-0 top-[32px] sm:top-[34px] bottom-[-8px] w-[30px] sm:w-8 flex justify-center z-0">
                <div className="w-0 border-l-[2px] border-solid border-gray-200 dark:border-gray-700"></div>
              </div>
            )}
            <div className="flex-1">
              <div className="p-4 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-2 w-1/2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileStudentDashboard({ logs = [] }: MobileStudentDashboardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { navGroups } = useAppMenu();

  // Dynamically extract up to 4 quick access links that are not in the bottom bar
  const EXCLUDED_PATHS = ["/", "/attendance/gate-scan", "/leaves/requests", "/student/schedule/weekly", "/menu"];
  const PREFERRED_PATHS = ["/attendance/metrics", "/attendance/history", "/events", "/profile"];
  const allLinks = navGroups.flatMap(group => 
    group.items.flatMap(item => {
      if (item.subItems) {
        return item.subItems.map(sub => ({
          name: sub.name,
          path: sub.path,
          icon: sub.icon || item.icon
        }));
      }
      if (item.path) {
        return [{
          name: item.name,
          path: item.path,
          icon: item.icon
        }];
      }
      return [];
    })
  );
  
  const availableLinks = allLinks.filter(link => !EXCLUDED_PATHS.includes(link.path));
  
  const quickAccessLinks = availableLinks.sort((a, b) => {
    const idxA = PREFERRED_PATHS.indexOf(a.path);
    const idxB = PREFERRED_PATHS.indexOf(b.path);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  }).slice(0, 4);

  const QUICK_ACCESS_STYLES = [
    "from-brand-400 to-brand-600 shadow-[0_8px_16px_rgba(79,70,229,0.25)] dark:from-brand-500 dark:to-brand-700",
    "from-orange-400 to-orange-500 shadow-[0_8px_16px_rgba(249,115,22,0.25)] dark:from-orange-500 dark:to-orange-700",
    "from-purple-400 to-purple-600 shadow-[0_8px_16px_rgba(168,85,247,0.25)] dark:from-purple-500 dark:to-purple-700",
    "from-blue-400 to-blue-500 shadow-[0_8px_16px_rgba(59,130,246,0.25)] dark:from-blue-500 dark:to-blue-700"
  ];

  const isTeacherUser = user?.userTypes?.includes('teacher') || user?.userTypes?.includes('employee') || user?.roles?.some(r => r.name.toLowerCase() === 'teacher' || r.name.toLowerCase() === 'guru' || r.name.toLowerCase() === 'employee') || (user as any)?.role === 'teacher';
  const firstName = user?.name?.split(' ')[0] || "Chandra";
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [confirmClassItem, setConfirmClassItem] = useState<StudentRoadmapItem | null>(null);
  const [isAttendingClass, setIsAttendingClass] = useState(false);
  const [showEventQrModal, setShowEventQrModal] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Location err:", err)
      );
    }
  }, []);

  const locationStr = coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "-6.2000, 106.8166";
  const { data: dashboardData, refetch: refetchRoadmap, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['mobile-student-roadmap', user?.public_id],
    queryFn: async () => {
      if (!user?.public_id) return { roadmap: [], policies: null };
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const targetId = user.id || user.public_id;
      
      const [res, policyRes, recordsRes] = await Promise.all([
        dashboardService.getUserRoadmap(),
        attendanceService.getAttendancePolicy(targetId).catch(() => null),
        attendanceService.getAttendanceHistory({ userId: targetId, startDate: todayStr, endDate: todayStr }).catch(() => null)
      ]);
      
      const userPolicy = (policyRes as any)?.data || policyRes;
      const todayRecords = Array.isArray((recordsRes as any)?.data?.data) 
        ? (recordsRes as any).data.data 
        : (Array.isArray((recordsRes as any)?.data) ? (recordsRes as any).data : []);
      const todayRecord = todayRecords[0];
      
      const computeLate = (clockIn: string, startTime: string, tolerance: number = 0) => {
         const clockInDate = new Date(clockIn);
         const [h, m, s] = startTime.split(':').map(Number);
         const expectedStart = new Date(clockInDate);
         expectedStart.setHours(h, m, s || 0, 0);
         const diffMs = clockInDate.getTime() - expectedStart.getTime();
         const diffMins = Math.floor(diffMs / 60000);
         return diffMins > tolerance ? diffMins : 0;
      };

      const formatDuration = (totalMinutes: number) => {
         if (totalMinutes < 60) return `${totalMinutes}m`;
         const hours = Math.floor(totalMinutes / 60);
         const mins = totalMinutes % 60;
         return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      };

      const computeEarly = (clockOut: string, endTime: string) => {
         const clockOutDate = new Date(clockOut);
         const [h, m, s] = endTime.split(':').map(Number);
         const expectedEnd = new Date(clockOutDate);
         expectedEnd.setHours(h, m, s || 0, 0);
         const diffMs = expectedEnd.getTime() - clockOutDate.getTime();
         return Math.max(0, Math.floor(diffMs / 60000));
      };
      
      const dynamicRule = userPolicy?.rules?.find((r: any) => r.ruleType === "DYNAMIC_TEACHER_SCHEDULE");
      const isDynamicTeacher = isTeacherUser && dynamicRule && (dynamicRule.ruleValue === "true" || dynamicRule.ruleValue === true);
      
      let effectiveStartTime = userPolicy?.attendancePolicy?.startTime || "07:00:00";
      if (isDynamicTeacher) {
         const firstClass = res.roadmap.find((r: any) => r.type === "class" || r.type === "session");
         if (firstClass && firstClass.time) {
            effectiveStartTime = firstClass.time.split(" - ")[0];
         }
      }
      
      const lateTolerance = res.policies?.lateToleranceMinutes || 0;
      
      const nowObj = new Date();
      let isDayOverAndMissed = false;
      if (!userPolicy?.todayStatus?.clockIn) {
        const scanOutItem = res.roadmap.find((r: any) => r.type === 'scan_out');
        const endTimeStr = scanOutItem?.time || userPolicy?.attendancePolicy?.endTime || "15:00:00";
        const [eh, em, es] = endTimeStr.split(":").map(Number);
        const expectedEndObj = new Date(nowObj);
        expectedEndObj.setHours(eh, em, es || 0, 0);
        if (nowObj.getTime() > expectedEndObj.getTime()) {
           isDayOverAndMissed = true;
        }
      }

      const enrichedRoadmap = res.roadmap.map((item) => {
        let shouldMiss = isDayOverAndMissed;

        // Exceptions: Upcoming events that happen after scan out time
        if (isDayOverAndMissed && (item.type === 'event' || item.type === 'class' || item.type === 'session')) {
           const timeStr = item.time?.split(" - ")[1] || item.time?.split(" - ")[0] || item.time;
           if (timeStr) {
             const [eh, em] = timeStr.split(":").map(Number);
             const endObj = new Date(nowObj);
             endObj.setHours(eh, em, 0, 0);
             if (nowObj.getTime() <= endObj.getTime()) {
                shouldMiss = false; // it is not over yet
             }
           }
        }

        if (shouldMiss && item.status !== 'completed') {
           item.status = 'missed';
        }

        // Check if break has passed
        if (item.type === 'break' && item.time) {
           const times = item.time.split(' - ');
           if (times.length === 2) {
               const [eH, eM] = times[1].split(':').map(Number);
               const endObj = new Date(nowObj);
               endObj.setHours(eH, eM, 0, 0);
               if (nowObj.getTime() > endObj.getTime()) {
                   item.status = 'missed'; // Break is over, make it look disabled
               }
           }
        }

        if (item.type === 'scan_in' && userPolicy?.todayStatus?.clockIn) {
           item.status = 'completed';
           if (!item.attendanceTime) item.attendanceTime = userPolicy.todayStatus.clockIn;
           
           const calculatedLateMins = computeLate(userPolicy.todayStatus.clockIn, effectiveStartTime, lateTolerance);
           const isActuallyLate = calculatedLateMins > 0;
           
           if (todayRecord) {
              (item as any).recordDetail = { ...todayRecord, isLate: isActuallyLate, lateMinutes: calculatedLateMins };
           } else {
              // Create a fallback recordDetail to ensure the Modal can show computed times
              (item as any).recordDetail = {
                 isLate: isActuallyLate,
                 lateMinutes: calculatedLateMins,
                 statusLabel: userPolicy.todayStatus.statusLabel,
                 latitude: null, longitude: null, ipAddress: null
              };
           }
           
           (item as any).isLate = isActuallyLate;
           (item as any).lateInfo = isActuallyLate 
             ? `Terlambat (${formatDuration(calculatedLateMins)})`
             : "Tepat Waktu";
        }
        if (item.type === 'scan_out' && userPolicy?.todayStatus?.clockOut) {
           item.status = 'completed';
           if (!item.attendanceTime) item.attendanceTime = userPolicy.todayStatus.clockOut;
           
           if (todayRecord) {
              (item as any).recordDetail = { 
                ...todayRecord, 
                photoUrl: todayRecord.photoOutUrl || null,
                photoEvidenceUrl: null
              };
           } else {
              (item as any).recordDetail = {
                 isLate: false,
                 earlyLeaveMinutes: computeEarly(userPolicy.todayStatus.clockOut, userPolicy.attendancePolicy.endTime),
                 statusLabel: userPolicy.todayStatus.statusLabel,
                 latitude: null, longitude: null, ipAddress: null
              };
           }
           
           const expectedEndTimeStr = item.time || userPolicy.attendancePolicy.endTime;
           const calculatedEarlyMins = computeEarly(userPolicy.todayStatus.clockOut, expectedEndTimeStr);
           
           let timeWorkedStr = "";
           if (userPolicy.todayStatus.clockIn && userPolicy.todayStatus.clockOut) {
               const inDate = new Date(userPolicy.todayStatus.clockIn);
               const outDate = new Date(userPolicy.todayStatus.clockOut);
               const diffMins = Math.max(0, Math.floor((outDate.getTime() - inDate.getTime()) / 60000));
               timeWorkedStr = ` (Durasi Kerja: ${formatDuration(diffMins)})`;
           }
           
           if (calculatedEarlyMins > 0) {
              (item as any).isLate = true;
              (item as any).lateInfo = `Pulang Cepat (${formatDuration(calculatedEarlyMins)})${timeWorkedStr}`;
           } else {
              (item as any).isLate = false;
              (item as any).lateInfo = `Tepat Waktu${timeWorkedStr}`;
           }
        } else if ((item.type === 'class' || item.type === 'session') && item.status === 'missed' && item.time) {
           const now = new Date();
           const times = item.time.split(' - ');
           if (times.length === 2) {
               const [sH, sM] = times[0].split(':').map(Number);
               const [eH, eM] = times[1].split(':').map(Number);
               const startDate = new Date(now);
               startDate.setHours(sH, sM, 0, 0);
               const endDate = new Date(now);
               endDate.setHours(eH, eM, 0, 0);
               
               if (now < startDate) {
                   item.status = 'upcoming';
               } else if (now <= endDate) {
                   item.status = 'active';
               }
           }
        }
        return item;
      });
      return { ...res, roadmap: enrichedRoadmap, policies: userPolicy || res.policies };
    },
    enabled: !!user?.public_id,
    staleTime: 60000 // Cache for 1 minute to prevent double hitting API
  });

  const handleConfirmClassAttendance = async () => {
    if (!confirmClassItem) return;
    
    setIsAttendingClass(true);
    try {
      const targetId = user?.id || user?.public_id || "";
      const isTeacher = user?.userTypes?.includes('teacher') || user?.userTypes?.includes('employee') || user?.roles?.some(r => r.name.toLowerCase() === 'teacher' || r.name.toLowerCase() === 'guru' || r.name.toLowerCase() === 'employee') || (user as any)?.role === 'teacher';
      
      if (!confirmClassItem.sessionId) {
        if (isTeacher) {
          const classSubjectId = (confirmClassItem as any).classSubjectId;
          if (!classSubjectId) {
             toast.error("Invalid class subject ID. Please refresh and try again.");
             return;
          }
          
          const [startTime, endTime] = confirmClassItem.time.split(' - ');
          const sessionDate = new Date().toISOString().split('T')[0];
          
          await attendanceService.createTeachingSession({
            classSubjectId: classSubjectId,
            actualTeacherId: targetId,
            sessionDate: sessionDate,
            startTime: startTime.trim(),
            endTime: endTime ? endTime.trim() : startTime.trim()
          });
          
          toast.success("Class session successfully started!");
          setConfirmClassItem(null);
          refetchRoadmap();
          return;
        } else {
          toast.error("The teacher has not started this class session yet. Please wait until the session is active.");
          setConfirmClassItem(null);
          return;
        }
      }
      
      if (!isTeacher) {
        await attendanceService.createSubjectAttendance({
          teachingSessionId: confirmClassItem.sessionId,
          studentId: targetId,
          status: "present",
          method: "manual",
          latitude: coords?.lat,
          longitude: coords?.lng
        });
        toast.success("Successfully checked into class!");
      } else {
        if ((confirmClassItem as any).validationStatus === 'invalid') {
          await attendanceService.bulkCreateSubjectAttendance({
            teachingSessionId: confirmClassItem.sessionId,
            records: [
              {
                studentId: targetId,
                status: 'present',
                method: 'manual',
              }
            ]
          });
          
          await attendanceService.validateSession(
             confirmClassItem.sessionId,
             'pending',
             'Teacher re-started session'
          ).catch(() => {});
          
          toast.success("Class session successfully re-started!");
        } else {
          toast.success("Session is already active!");
        }
      }
      
      setConfirmClassItem(null);
      refetchRoadmap();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process request.");
    } finally {
      setIsAttendingClass(false);
    }
  };

  const roadmapData = dashboardData?.roadmap || [];
  const policies = dashboardData?.policies || null;
  const rules = (dashboardData as any)?.rules || [];
  const activeLeave = (dashboardData as any)?.activeLeave || null;
  const scheduleOverride = (dashboardData as any)?.scheduleOverride || null;

  const requireQrCode = rules.some((r: any) => r.ruleType === "REQUIRE_QR_CODE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
  const requireGeoLocation = rules.some((r: any) => r.ruleType === "REQUIRE_GEO_LOCATION" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
  const requirePhotoEvidence = rules.some((r: any) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));

  const ScanIcon = requireQrCode ? QrCodeIcon : requireGeoLocation ? MapPinSolidIcon : requirePhotoEvidence ? CameraIcon : CalenderIcon;
  const scanText = requireQrCode ? "Scan QR" : requireGeoLocation ? "Check In (GPS)" : requirePhotoEvidence ? "Take Selfie" : "Record Attendance";

  const handleRespondToInvitation = async (eventId: string | number, status: 'accepted' | 'declined') => {
    try {
      await eventService.respondToEventByEventId(eventId, { status });
      toast.success(status === 'accepted' ? 'Event accepted!' : 'Event declined.');
      refetchRoadmap();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to respond');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "scan_in": return <ArrowDownLeftIcon className="w-5 h-5" strokeWidth={2.5} />;
      case "scan_out": return <ArrowUpRightIcon className="w-5 h-5" strokeWidth={2.5} />;
      case "break": return <FaceSmileIcon className="w-5 h-5" strokeWidth={2.5} />;
      default: return <DocumentTextIcon className="w-5 h-5" strokeWidth={2.5} />;
    }
  };

  // Dynamic Date Formatter
  const todayDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());

  return (
    <div className="bg-gray-50 dark:bg-slate-900 font-sans relative">
      
      {/* ── Fixed/Sticky Header Area ── */}
      <div className="sticky top-0 left-0 w-full bg-gradient-to-br from-brand-500 via-purple-600 to-indigo-800 dark:from-brand-800 dark:via-purple-900 dark:to-indigo-950 z-0 overflow-hidden pb-12 pt-6 px-6 transition-colors duration-300">
        
        {/* Abstract Background Decorators */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
          <div className="absolute top-20 -left-20 w-56 h-56 bg-brand-300/20 rounded-full blur-2xl mix-blend-overlay"></div>
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            {/* SIAPUS Logo Text */}
            <div className="flex items-center">
              <span className="text-2xl font-black text-white tracking-widest drop-shadow-md">SIAPUS</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* <NotificationDropdown isMobilePremium={true} /> */}
              <UserDropdown isMobilePremium={true} />
            </div>
          </div>

          <div className="space-y-1 mb-2">
            <p className="text-brand-100/90 text-[11px] font-medium tracking-wide uppercase">Time to do what you do best</p>
            <h1 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm">
              What's up, {firstName}!
            </h1>
          </div>

          {/* ── Subtle Quick Stats ── */}
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/80 mt-3">
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-3 h-3 text-brand-300" /> {locationStr}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span className="flex items-center gap-1">
              <PieChartIcon className="w-3 h-3 text-green-300" /> 
              {dashboardData?.attendanceRate !== undefined ? `${Number(dashboardData.attendanceRate).toFixed(1)}%` : "0.0%"}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span className="flex items-center gap-1">
              <LockIcon className="w-3 h-3 text-orange-300" /> {dashboardData?.clientIp || "Loading..."}
            </span>
          </div>

        </div>
      </div>

      {/* ── Scrolling Main Content Area (White Rounded) ── */}
      <div className="relative z-10 -mt-6 bg-gray-50 dark:bg-slate-900 rounded-t-[1.75rem] px-5 pt-5 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.12)] pb-16 min-h-[calc(100vh-16rem)]">
        
        {/* Top Stick Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>

        {/* ── Premium Quick Shortcuts ── */}
        <div className="mb-8 mt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight">Akses Cepat</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Akses cepat ke fitur-fitur utama</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-500/20 border border-brand-100 dark:border-brand-500/30 rounded-full">
              <CalenderIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">{todayDate}</span>
            </div>
          </div>
          <div className="flex justify-center items-start gap-4 sm:gap-8">
            {quickAccessLinks.map((link, idx) => (
              <Link key={idx} to={link.path || "#"} className="flex flex-col items-center gap-2 group w-[70px]">
                <div className={`w-[3.25rem] h-[3.25rem] rounded-[1.1rem] bg-gradient-to-b flex items-center justify-center text-white transition-transform duration-200 group-active:scale-95 ${QUICK_ACCESS_STYLES[idx % QUICK_ACCESS_STYLES.length]}`}>
                  <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current [&>svg]:stroke-current">
                    {link.icon}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-0.5 text-center leading-tight line-clamp-2">{link.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Overview Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Jadwal Hari Ini</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Rincian aktivitas dan jadwal kelas Anda</p>
          </div>
          <div className="text-[12px] font-bold text-pink-500 uppercase tracking-widest mt-1">
            <CurrentTimeClock />
          </div>
        </div>

        {isDashboardLoading ? (
           <MobileDashboardSkeleton />
        ) : (
           <>
              {/* Active Leave Banner */}
              {activeLeave && (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDaysIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">On Leave Today</span>
                    {activeLeave.isMultiDay && (
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-full">Day {activeLeave.dayNumber} of {activeLeave.totalDays}</span>
                    )}
                  </div>
                  <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-200">{activeLeave.leaveType}</p>
                  {activeLeave.reason && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">{activeLeave.reason}</p>}
                </div>
              )}

        {/* Schedule Override Banner */}
        {scheduleOverride && (
          <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-1">
              <ArrowPathIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                {scheduleOverride.isHoliday ? 'Holiday Override' : 'Schedule Override'}
              </span>
            </div>
            {scheduleOverride.reason && <p className="text-[12px] font-semibold text-blue-800 dark:text-blue-200">{scheduleOverride.reason}</p>}
            {!scheduleOverride.isHoliday && scheduleOverride.startTime && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Modified hours: {scheduleOverride.startTime?.substring(0,5)} - {scheduleOverride.endTime?.substring(0,5)}</p>
            )}
          </div>
        )}


        {/* ── Daily Schedule Roadmap ── */}
        <div className="relative mt-2 pb-10">
          
          {roadmapData.length > 0 ? (
            <>
              {/* Roadmap Items */}

              <div className="space-y-2 relative">
                {roadmapData.map((item, index) => {
                  const isInvalidated = (item as any).validationStatus === 'invalid';
                  const isCompleted = item.status === "completed";
                  const isActive = item.status === "active" || (item.type === 'class' && isInvalidated);
                  const isUpcoming = item.status === "upcoming";
                  const isMissed = item.status === "missed";
                  const isHoliday = item.status === "holiday";

                  const getIconBg = (type: string) => {
                    if (isActive) {
                      switch (type) {
                        case "scan_in": return "bg-gradient-to-b from-success-400 to-success-600 text-white shadow-lg shadow-success-500/50";
                        case "scan_out": return "bg-gradient-to-b from-error-400 to-error-600 text-white shadow-lg shadow-error-500/50";
                        case "break": return "bg-gradient-to-b from-warning-400 to-warning-600 text-white shadow-lg shadow-warning-500/50";
                        default: return "bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/50";
                      }
                    }
                    if (isMissed) return "bg-gradient-to-b from-gray-100 to-gray-200 text-gray-400 dark:from-slate-800 dark:to-slate-900 dark:text-gray-500 shadow-md shadow-gray-400/20";
                    if (isHoliday) return "bg-gradient-to-b from-warning-100 to-warning-200 text-warning-700 dark:from-warning-500/20 dark:to-warning-500/10 dark:text-warning-400 shadow-md shadow-warning-500/30";
                    if (isCompleted) {
                      switch (type) {
                        case "scan_in": return "bg-gradient-to-b from-success-100 to-success-200 text-success-700 dark:from-success-500/20 dark:to-success-500/10 dark:text-success-400 shadow-md shadow-success-500/30";
                        case "scan_out": return "bg-gradient-to-b from-error-100 to-error-200 text-error-700 dark:from-error-500/20 dark:to-error-500/10 dark:text-error-400 shadow-md shadow-error-500/30";
                        case "break": return "bg-gradient-to-b from-warning-100 to-warning-200 text-warning-700 dark:from-warning-500/20 dark:to-warning-500/10 dark:text-warning-400 shadow-md shadow-warning-500/30";
                        default: return "bg-gradient-to-b from-brand-100 to-brand-200 text-brand-700 dark:from-brand-500/20 dark:to-brand-500/10 dark:text-brand-400 shadow-md shadow-brand-500/30";
                      }
                    }
                    // For upcoming items, make them look active/colorful but slightly lighter than isActive
                    switch (type) {
                      case "scan_in": return "bg-gradient-to-b from-success-50 to-success-100 text-success-500 dark:from-success-500/10 dark:to-success-500/5 dark:text-success-400 shadow-md shadow-success-500/20";
                      case "scan_out": return "bg-gradient-to-b from-error-50 to-error-100 text-error-500 dark:from-error-500/10 dark:to-error-500/5 dark:text-error-400 shadow-md shadow-error-500/20";
                      case "break": return "bg-gradient-to-b from-warning-50 to-warning-100 text-warning-600 dark:from-warning-500/10 dark:to-warning-500/5 dark:text-warning-400 shadow-md shadow-warning-500/20";
                      default: return "bg-gradient-to-b from-brand-50 to-brand-100 text-brand-500 dark:from-brand-500/10 dark:to-brand-500/5 dark:text-brand-400 shadow-md shadow-brand-500/20";
                    }
                  };

                  const getTextColor = (type: string) => {
                    if (isMissed) return "text-gray-500 dark:text-gray-400";
                    switch (type) {
                      case "scan_in": return "text-success-600 dark:text-success-400";
                      case "scan_out": return "text-error-600 dark:text-error-400";
                      case "break": return "text-warning-600 dark:text-warning-400";
                      default: return "text-brand-600 dark:text-brand-400";
                    }
                  };

                  const typeColor = getTextColor(item.type);
                  const bgSoftColor = item.type === 'scan_in' ? 'bg-success-50 dark:bg-success-500/10' :
                                      item.type === 'scan_out' ? 'bg-error-50 dark:bg-error-500/10' :
                                      item.type === 'break' ? 'bg-warning-50 dark:bg-warning-500/10' :
                                      'bg-brand-50 dark:bg-brand-500/10';
                  
                  // Clean up time format: remove seconds (e.g., "07:00:00 - 08:30:00" -> "07:00 - 08:30")
                  const formattedTime = item.time.replace(/(\d{2}:\d{2}):\d{2}/g, '$1');

                  if (item.type === 'event') {
                    const invStatus = (item as any).invitationStatus || 'pending';
                    const getEventGradient = () => {
                      if (invStatus === 'declined') return 'from-gray-400 to-gray-500 shadow-gray-500/20 opacity-60';
                      if (invStatus === 'tentative') return 'from-sky-400 to-blue-500 shadow-sky-500/20';
                      if (invStatus === 'pending' || invStatus === 'invited') return 'from-amber-400 to-orange-500 shadow-amber-500/20';
                      if (isActive) return 'from-purple-500 to-indigo-600 shadow-purple-500/20';
                      if (isCompleted) return 'from-emerald-500 to-teal-600 shadow-emerald-500/20';
                      if (isMissed) return 'from-gray-300 to-gray-400 shadow-gray-500/20 opacity-70 grayscale';
                      return 'from-purple-500 to-indigo-600 shadow-purple-500/20';
                    };
                    const getInvitationBadge = () => {
                      switch (invStatus) {
                        case 'accepted': return { label: 'Accepted', bg: 'bg-emerald-400/30' };
                        case 'declined': return { label: 'Declined', bg: 'bg-white/20' };
                        case 'tentative': return { label: 'Tentative', bg: 'bg-sky-400/30' };
                        case 'pending': case 'invited': return { label: 'Awaiting Response', bg: 'bg-amber-400/30' };
                        default: return null;
                      }
                    };
                    const invBadge = getInvitationBadge();
                    return (
                      <div key={item.id} className={`flex gap-3.5 pb-3 relative transition-all duration-300 ${isUpcoming ? 'opacity-70' : isActive ? 'scale-[1.02]' : ''} ${activeLeave ? 'opacity-50' : ''}`}>
                        {/* Timeline Node */}
                        <div className="relative z-10 flex flex-col items-center mt-0 w-[36px] sm:w-[40px] shrink-0">
                          <div className="relative flex items-center justify-center">
                            {isActive && (
                              <>
                                <div className="absolute -inset-1.5 rounded-[18px] opacity-30 animate-pulse bg-purple-500"></div>
                                <div className="absolute -inset-1.5 rounded-[18px] opacity-20 animate-ping bg-purple-500" style={{ animationDuration: '2s' }}></div>
                              </>
                            )}
                            <div className={`w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-[14px] flex items-center justify-center relative z-10 transition-transform duration-500 ${isActive ? 'scale-110 shadow-xl bg-gradient-to-b from-purple-400 to-purple-600 text-white shadow-purple-500/50' : isCompleted ? 'bg-gradient-to-b from-purple-100 to-purple-200 text-purple-700 dark:from-purple-500/20 dark:to-purple-500/10 dark:text-purple-400 shadow-md shadow-purple-500/30' : isMissed ? 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-400 dark:from-slate-800 dark:to-slate-900 dark:text-gray-500 shadow-md shadow-gray-400/20' : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-400 dark:from-slate-800 dark:to-slate-900 dark:text-gray-500 shadow-md shadow-slate-400/20'}`}>
                              <SparklesIcon className="w-5 h-5" />
                            </div>
                          </div>
                        </div>

                        {/* Connecting Line to Next Node */}
                        {index < roadmapData.length - 1 && (
                          <div className="absolute left-0 top-[36px] sm:top-[40px] bottom-[-10px] w-[36px] sm:w-[40px] flex justify-center z-0">
                          <div className="relative w-[2px] flex justify-center">
                              {isActive && (
                                 <div className="absolute inset-0 bg-brand-400 blur-[3px] opacity-40 animate-pulse" />
                              )}
                              <div className={`w-full transition-colors duration-500 ${isCompleted ? 'bg-brand-400 dark:bg-brand-500/80' : isMissed ? 'bg-gray-300 dark:bg-slate-600/80' : isActive ? 'bg-brand-400 dark:bg-brand-500 shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse' : 'bg-gray-200 dark:bg-slate-700/80'}`} />
                            </div>
                          </div>
                        )}

                        {/* Event Content Box */}
                        <div className="flex-1 pt-2.5 sm:pt-3 pb-4">
                          <div className={`relative overflow-hidden rounded-2xl p-4 border bg-gradient-to-br border-transparent text-white shadow-lg ${getEventGradient()}`}>
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start mb-2 relative z-10">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/20 text-white">
                                  {(item as any).eventType === 'ceremony' ? 'Ceremony' : (item as any).eventType === 'meeting' ? 'Meeting' : (item as any).eventType === 'training' ? 'Training' : 'Special Event'}
                                </span>
                                {invBadge && (
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${invBadge.bg}`}>
                                    {invBadge.label}
                                  </span>
                                )}
                                {isCompleted && <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">Attended</span>}
                                {isMissed && <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">Terlewat</span>}
                              </div>
                              <span className="text-[12px] font-bold shrink-0 text-white">
                                {formattedTime}
                              </span>
                            </div>

                            <h3 className={`text-[15px] font-bold leading-tight mb-2 relative z-10 text-white ${invStatus === 'declined' ? 'line-through opacity-70' : ''}`}>
                              {item.title}
                            </h3>
                            
                            <div className="flex items-center gap-2 text-[12px] font-medium relative z-10 text-white/80">
                              <MapPinIcon className="w-4 h-4 opacity-70" />
                              <span>{item.location}</span>
                            </div>

                            {(item as any).description && (
                              <p className="text-[11px] text-white/70 mt-1.5 relative z-10 line-clamp-2">{(item as any).description}</p>
                            )}
                            
                            {item.attendanceTime && (
                              <div className="mt-3 pt-3 border-t flex items-center justify-between text-[11px] font-medium relative z-10 border-white/20 text-white/80">
                                <span>Recorded at:</span>
                                <span className="font-bold">{new Date(item.attendanceTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}

                            {/* Accept/Decline Buttons for Pending */}
                            {(invStatus === 'pending' || invStatus === 'invited') && (
                              <div className="mt-3 pt-3 border-t border-white/20 flex gap-2 relative z-10">
                                <button
                                  onClick={() => handleRespondToInvitation(item.sessionId, 'accepted')}
                                  className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors active:scale-95"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleRespondToInvitation(item.sessionId, 'declined')}
                                  className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors active:scale-95"
                                >
                                  ✕ Decline
                                </button>
                              </div>
                            )}
                            
                            {/* Event Action Button for Scanning/Selfie */}
                            {isActive && invStatus !== 'declined' && invStatus !== 'pending' && invStatus !== 'invited' && (
                              <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap justify-end gap-2 relative z-10">
                                {(!item.attendanceTime) && (
                                  <button
                                    onClick={() => setShowEventQrModal(true)}
                                    className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-[0_4px_12px_rgba(236,72,153,0.5)] active:scale-95 hover:shadow-[0_6px_16px_rgba(236,72,153,0.6)]"
                                  >
                                    <QrCodeIcon className="w-3.5 h-3.5" />
                                    Tampilkan QR Code
                                  </button>
                                )}
                                {(item as any).isScanner && (
                                  <button
                                    onClick={() => navigate(`/events/scan?eventId=${item.sessionId}`)}
                                    className="flex items-center justify-center gap-1.5 bg-white text-brand-600 hover:bg-gray-50 text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-lg active:scale-95"
                                  >
                                    <CameraIcon className="w-3.5 h-3.5" />
                                    Scan Kehadiran
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className={`flex gap-3.5 pb-3 relative transition-all duration-300 ${isActive ? 'scale-[1.02]' : ''} ${activeLeave ? 'opacity-50' : ''}`}>
                      {/* Timeline Node */}
                      <div className="relative z-10 flex flex-col items-center mt-0 w-[36px] sm:w-[40px] shrink-0">
                        <div className="relative flex items-center justify-center">
                          {isActive && (
                            <>
                              <div className={`absolute -inset-1.5 rounded-[18px] opacity-30 animate-pulse ${
                                item.type === 'scan_in' ? 'bg-success-500' :
                                item.type === 'scan_out' ? 'bg-error-500' :
                                item.type === 'break' ? 'bg-warning-500' : 'bg-brand-500'
                              }`}></div>
                              <div className={`absolute -inset-1.5 rounded-[18px] opacity-20 animate-ping ${
                                item.type === 'scan_in' ? 'bg-success-500' :
                                item.type === 'scan_out' ? 'bg-error-500' :
                                item.type === 'break' ? 'bg-warning-500' : 'bg-brand-500'
                              }`} style={{ animationDuration: '2s' }}></div>
                            </>
                          )}
                          <div className={`w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-[14px] flex items-center justify-center relative z-10 transition-transform duration-500 ${isActive ? 'scale-110 shadow-xl' : ''} ${getIconBg(item.type)}`}>
                            {renderIcon(item.type)}
                          </div>
                        </div>
                      </div>

                      {/* Connecting Line to Next Node */}
                      {index < roadmapData.length - 1 && (
                        <div className="absolute left-0 top-[36px] sm:top-[40px] bottom-[-10px] w-[36px] sm:w-[40px] flex justify-center z-0">
                          <div className="relative w-[2px] flex justify-center">

                            <div className={`w-full transition-colors duration-500 ${
                              (item.status === 'completed' || item.status === 'holiday')
                                ? (item.type === 'scan_in' ? 'bg-success-400 dark:bg-success-500/80' :
                                   item.type === 'scan_out' ? 'bg-error-400 dark:bg-error-500/80' :
                                   item.type === 'break' ? 'bg-warning-400 dark:bg-warning-500/80' :
                                   'bg-brand-400 dark:bg-brand-500/80')
                                : item.status === 'missed' 
                                  ? 'bg-gray-300 dark:bg-slate-600/80'
                                  : isActive
                                    ? (item.type === 'scan_in' ? 'bg-success-400 dark:bg-success-500 shadow-[0_0_8px_rgba(50,213,131,0.5)] animate-pulse' :
                                       item.type === 'scan_out' ? 'bg-error-400 dark:bg-error-500 shadow-[0_0_8px_rgba(249,112,102,0.5)] animate-pulse' :
                                       item.type === 'break' ? 'bg-warning-400 dark:bg-warning-500 shadow-[0_0_8px_rgba(253,176,34,0.5)] animate-pulse' :
                                       'bg-brand-400 dark:bg-brand-500 shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse')
                                    : 'bg-gray-200 dark:bg-slate-700/80'
                            }`} />
                          </div>
                        </div>
                      )}

                      {/* Content Box */}
                      <div className="flex-1 pt-2.5 sm:pt-3 pb-4 mb-2 border-b border-gray-100 dark:border-slate-800/50 last:border-b-0 last:mb-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1.5">
                          <h3 className={`text-[13px] sm:text-[14px] font-bold leading-tight pr-3 ${isActive ? typeColor : isCompleted ? 'text-gray-800 dark:text-gray-200' : isMissed ? 'text-gray-500 dark:text-gray-400 opacity-80' : 'text-gray-700 dark:text-gray-300'}`}>
                            {item.title}
                          </h3>
                          <span className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${isActive ? typeColor : isMissed ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formattedTime}
                          </span>
                        </div>

                        {/* Badges Container (Compact) */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {/* Location Badge */}
                          {item.location && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                              <MapPinSolidIcon className="w-3 h-3" /> {item.location}
                            </span>
                          )}
                          {item.location && ((item.type === 'class' && (item as any).teacherName) || item.attendanceTime || (item as any).lateInfo) && (
                            <span className="w-1 h-1 bg-gray-300 rounded-full mx-0.5"></span>
                          )}
                          
                          {/* Teacher Name */}
                          {item.type === 'class' && (item as any).teacherName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              👨‍🏫 {(item as any).teacherName}
                            </span>
                          )}
                          {item.type === 'class' && (item as any).teacherName && (item.attendanceTime || (item as any).lateInfo) && (
                            <span className="w-1 h-1 bg-gray-300 rounded-full mx-0.5"></span>
                          )}

                          {/* Subject Late Info */}
                          {item.type === 'class' && (item as any).isSubjectLate && (item as any).subjectLateMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500">
                              <ClockIcon className="w-3 h-3" /> Telat ({(item as any).subjectLateMinutes}m)
                            </span>
                          )}
                          {item.type === 'class' && item.attendanceTime && !(item as any).isSubjectLate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                              <ClockIcon className="w-3 h-3" /> Tepat Waktu
                            </span>
                          )}

                          {/* General Late Info */}
                          {(item as any).lateInfo && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${(item as any).isLate ? 'text-red-500' : 'text-emerald-500'}`}>
                              {(item as any).lateInfo}
                            </span>
                          )}

                          {/* Missed Badge */}
                          {isMissed && item.type !== 'event' && item.type !== 'break' && (
                             <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                               Terlewat
                             </span>
                          )}

                          {/* Substitute Teacher Badge */}
                          {item.type === 'class' && (item as any).isSubstitution && (
                            <>
                              <span className="w-1 h-1 bg-gray-300 rounded-full mx-0.5"></span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-500">
                                🔄 Substitute
                              </span>
                            </>
                          )}
                          
                          {/* Invalidated Badge */}
                          {(item as any).validationStatus === 'invalid' && (
                             <>
                               <span className="w-1 h-1 bg-gray-300 rounded-full mx-0.5"></span>
                               <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-500">
                                 <AlertIcon className="w-3 h-3" /> Invalidated
                               </span>
                             </>
                          )}
                        </div>

                        {/* Info Boxes (Compact) */}
                        {item.type === 'class' && (item as any).validationNotes && (item as any).validationStatus === 'invalid' && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg px-2.5 py-1.5 mb-2">
                            <span className="font-bold">Note:</span> {(item as any).validationNotes}
                          </div>
                        )}
                        {item.type === 'class' && (item as any).isSubstitution && (item as any).originalTeacherName && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-lg px-2.5 py-1.5 mb-2">
                            Replacing: <span className="font-bold">{(item as any).originalTeacherName}</span>
                          </div>
                        )}
                        {item.overrideReason && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg px-2.5 py-1.5 mb-2">
                            <span className="font-bold">Keterangan:</span> {item.overrideReason}
                          </div>
                        )}

                        {/* Policies and Actions Row */}
                        <div className="flex justify-between items-center gap-2 w-full mt-1.5">
                          {/* Left: Policies or Upcoming Status */}
                          <div className="flex-1 min-w-0">
                            {(policies || rules.length > 0 || (!isActive && isUpcoming && item.type === 'scan_in' && (item as any).openTime)) && item.type === 'scan_in' && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {!isActive && isUpcoming && (item as any).openTime && (
                                  <GateCountdown targetTime={(item as any).openTime} onComplete={refetchRoadmap} />
                                )}
                                {requirePhotoEvidence && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-md px-1.5 py-0.5">
                                    <CameraIcon className="w-3 h-3" /> Selfie
                                  </span>
                                )}
                                {requireGeoLocation && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-md px-1.5 py-0.5">
                                    <MapPinSolidIcon className="w-3 h-3" /> GPS
                                  </span>
                                )}
                                {requireQrCode && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-md px-1.5 py-0.5">
                                    <QrCodeIcon className="w-3 h-3" /> Scan QR
                                  </span>
                                )}
                                {policies?.lateToleranceMinutes != null && policies.lateToleranceMinutes > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-md px-1.5 py-0.5">
                                    <ClockIcon className="w-3 h-3" /> Toleransi {policies.lateToleranceMinutes}m
                                  </span>
                                )}
                                {rules.find((r: any) => r.ruleType === 'ABSENT_THRESHOLD_MINUTES') && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-md px-1.5 py-0.5">
                                    <ShieldExclamationIcon className="w-3 h-3" /> Auto-Alfa {rules.find((r: any) => r.ruleType === 'ABSENT_THRESHOLD_MINUTES')?.ruleValue}m
                                  </span>
                                )}
                              </div>
                            )}

                            {item.type === 'scan_out' && (policies || rules.length > 0) && (
                              <div className="flex flex-col gap-0.5 px-2 border-l-2 border-brand-500">
                                {requirePhotoEvidence && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    • Wajib Melampirkan Foto Selfie
                                  </span>
                                )}
                                {requireGeoLocation && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    • Wajib Berada di Area Sekolah (GPS)
                                  </span>
                                )}
                                {policies?.earlyLeaveThresholdMinutes != null && policies.earlyLeaveThresholdMinutes > 0 && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    • Maksimal pulang cepat {policies.earlyLeaveThresholdMinutes} menit
                                  </span>
                                )}
                              </div>
                            )}

                            {!isActive && isUpcoming && item.type !== 'scan_in' && (
                              <div className="flex items-center text-gray-500 dark:text-gray-400 font-medium text-[10px] mt-1">
                                <ClockIcon className="w-3.5 h-3.5 mr-1" />
                                {item.type === 'break' ? 'Upcoming Break' : 'Menunggu Waktu...'}
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="shrink-0 ml-2 flex items-center justify-end">
                            {!isActive && !isUpcoming && (item as any).recordDetail && (
                               <Button
                                 size="sm"
                                 variant="secondary"
                                 onClick={() => setSelectedDetail((item as any).recordDetail)}
                                 className={`${bgSoftColor} ${typeColor} !rounded-full !py-1 !px-2 !text-[9px] font-bold shadow-none active:scale-95 !border-none !ring-0`}
                                 startIcon={<EyeIcon className="w-3 h-3" />}
                               >
                                 Lihat Detail
                               </Button>
                            )}

                            {isActive && (
                              <>
                                {item.type === 'scan_in' || item.type === 'scan_out' ? (
                                   <button 
                                     onClick={() => {
                                       navigate("/attendance/gate-scan");
                                     }}
                                     className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold px-4 py-2 rounded-full transition-all shadow-[0_4px_12px_rgba(236,72,153,0.5)] active:scale-95 hover:shadow-[0_6px_16px_rgba(236,72,153,0.6)]"
                                   >
                                     <ScanIcon className="w-3.5 h-3.5" /> 
                                     {requireQrCode ? "Scan QR Code" : requirePhotoEvidence ? "Ambil Selfie" : "Proses Kehadiran"}
                                   </button>
                                ) : item.type === 'break' ? (
                                  <BreakCountdown timeRange={item.time} isActive={true} />
                                ) : (
                                  <button 
                                    onClick={() => {
                                      if (item.type === 'class' && isTeacherUser && !!item.sessionId && (item as any).validationStatus !== 'invalid') {
                                        toast.success("This session is already running.");
                                        return;
                                      }
                                      
                                      const hasClockedIn = roadmapData.find(i => i.type === 'scan_in')?.status === 'completed';
                                      if (item.type === 'class' && !hasClockedIn) {
                                        toast.error("You must clock in at the gate first before entering a class.");
                                        return;
                                      }
                                      if (item.type === 'class') {
                                        setConfirmClassItem(item);
                                      }
                                    }}
                                    className={`text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                                      (item.type === 'class' && isTeacherUser && !!item.sessionId && (item as any).validationStatus !== 'invalid') ? 'bg-gray-400 cursor-default' :
                                      (item.type === 'class' && isTeacherUser && !!item.sessionId && (item as any).validationStatus === 'invalid') ? 'bg-orange-500 hover:bg-orange-600' :
                                      'bg-blue-500 hover:bg-blue-600'
                                  }`}>
                                    {(item.type === 'class' && isTeacherUser && !!item.sessionId && (item as any).validationStatus !== 'invalid') ? 'Running' :
                                     (item.type === 'class' && isTeacherUser && !!item.sessionId && (item as any).validationStatus === 'invalid') ? 'Re-Validate' :
                                     'Start Now'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
                <CalenderIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Tidak Ada Jadwal Hari Ini</h3>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 px-4">
                Anda tidak memiliki jadwal kelas hari ini. Selamat menikmati waktu luang Anda!
              </p>
            </div>
          )}
        </div>
        </>
        )}

        {/* ── Current Position Map ── */}
        <div className="mt-2 mb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Posisi Saat Ini</h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Lokasi perangkat Anda saat ini</p>
            </div>
            <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-full border border-brand-100 dark:border-brand-500/20">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">LIVE</span>
            </div>
          </div>
          
          <div className="relative w-full aspect-square rounded-[1.25rem] overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800 bg-gray-200 dark:bg-slate-800 flex items-center justify-center">
             {/* OpenStreetMap iframe */}
             <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src={coords 
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.005},${coords.lng + 0.01},${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`
                  : "https://www.openstreetmap.org/export/embed.html?bbox=106.8066,-6.2050,106.8266,-6.1950&layer=mapnik&marker=-6.2000,106.8166"
                }
                className="absolute inset-0 z-0 grayscale-[20%] contrast-[1.1] dark:invert dark:grayscale-[50%] dark:hue-rotate-180 dark:opacity-80 transition-all duration-300"
                style={{ border: 'none' }}
                title="Current Location"
             ></iframe>
             
             {/* Gradient Overlay for style */}
             <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10 rounded-[1.25rem]"></div>
             

             {/* Location Details Strip */}
             <div className="absolute top-3 left-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-sm z-20 flex flex-col">
                <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-tight">My Location</span>
                <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{locationStr}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal 
        isOpen={!!selectedDetail} 
        onClose={() => setSelectedDetail(null)} 
        className="w-full sm:max-w-md m-0 sm:m-4"
        title="Attendance Details"
      >
        {selectedDetail && (
          <div className="space-y-4">
            {(selectedDetail.photoEvidenceUrl || selectedDetail.photoUrl) && (
              <div className="aspect-[3/4] max-w-[320px] mx-auto overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50 p-2 dark:border-white/[0.05] dark:bg-white/[0.02] shadow-md">
                <img 
                  src={(selectedDetail.photoEvidenceUrl || selectedDetail.photoUrl).startsWith('http') ? (selectedDetail.photoEvidenceUrl || selectedDetail.photoUrl) : `${new URL(API_BASE_URL).origin}${(selectedDetail.photoEvidenceUrl || selectedDetail.photoUrl).startsWith('/') ? '' : '/'}${selectedDetail.photoEvidenceUrl || selectedDetail.photoUrl}`} 
                  alt="Attendance Evidence" 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            )}
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`font-semibold ${selectedDetail.isLate ? 'text-red-500' : 'text-emerald-500'}`}>
                  {selectedDetail.statusLabel || (selectedDetail.isLate ? "Late" : "On Time")}
                  {selectedDetail.lateMinutes > 0 && <span className="text-sm ml-1 opacity-80">(+{selectedDetail.lateMinutes < 60 ? `${selectedDetail.lateMinutes}m` : `${Math.floor(selectedDetail.lateMinutes/60)}h ${selectedDetail.lateMinutes%60}m`})</span>}
                  {selectedDetail.earlyLeaveMinutes > 0 && <span className="text-sm ml-1 opacity-80">(-{selectedDetail.earlyLeaveMinutes < 60 ? `${selectedDetail.earlyLeaveMinutes}m` : `${Math.floor(selectedDetail.earlyLeaveMinutes/60)}h ${selectedDetail.earlyLeaveMinutes%60}m`})</span>}
                </span>
              </div>
              
              {selectedDetail.isLate && selectedDetail.lateMinutes > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-500 dark:text-gray-400">Late Duration</span>
                  <span className="font-semibold text-red-500">{selectedDetail.lateMinutes < 60 ? `${selectedDetail.lateMinutes} minutes` : `${Math.floor(selectedDetail.lateMinutes/60)}h ${selectedDetail.lateMinutes%60}m`}</span>
                </div>
              )}

              {selectedDetail.earlyLeaveMinutes > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-500 dark:text-gray-400">Early Leave</span>
                  <span className="font-semibold text-red-500">{selectedDetail.earlyLeaveMinutes < 60 ? `${selectedDetail.earlyLeaveMinutes} minutes` : `${Math.floor(selectedDetail.earlyLeaveMinutes/60)}h ${selectedDetail.earlyLeaveMinutes%60}m`} early</span>
                </div>
              )}
              
              {selectedDetail.method && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-500 dark:text-gray-400">Method</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedDetail.method}</span>
                </div>
              )}
              
              <div className="flex flex-col gap-1 py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-500 dark:text-gray-400">Location</span>
                  <div className="text-xs font-mono bg-gray-50 dark:bg-slate-800 p-2 rounded text-gray-700 dark:text-gray-300">
                    {selectedDetail.latitude && selectedDetail.longitude ? `${selectedDetail.latitude}, ${selectedDetail.longitude}` : 'Not Detected'}
                  </div>
              </div>
              
              <div className="flex flex-col gap-1 py-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-500 dark:text-gray-400">IP Address</span>
                  <div className="text-xs font-mono bg-gray-50 dark:bg-slate-800 p-2 rounded text-gray-700 dark:text-gray-300">
                    {selectedDetail.ipAddress || 'Not Detected'}
                  </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Class Check-In Confirmation Modal */}
      <Modal
        isOpen={!!confirmClassItem}
        onClose={() => !isAttendingClass && setConfirmClassItem(null)}
        title="Confirm Attendance"
        className="w-full sm:max-w-xs m-0 sm:m-4"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="secondary"
              onClick={() => setConfirmClassItem(null)}
              disabled={isAttendingClass}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmClassAttendance}
              isLoading={isAttendingClass}
              className="flex-1"
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="text-gray-600 dark:text-gray-300 text-sm">
          <p>Are you sure you want to check in to <strong className="text-gray-900 dark:text-white">{confirmClassItem?.title}</strong>?</p>
          <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg space-y-1">
            <div className="flex items-start gap-2">
              <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{confirmClassItem?.time}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>{confirmClassItem?.location}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Event QR Code Modal */}
      <Modal
        isOpen={showEventQrModal}
        onClose={() => setShowEventQrModal(false)}
        title="QR Code Kehadiran"
        className="w-full sm:max-w-xs m-0 sm:m-4"
      >
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <p className="text-sm text-gray-500">Tunjukkan QR Code ini kepada panitia event atau admin untuk dipindai.</p>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <QRCode value={user?.public_id || user?.id || ""} size={200} />
          </div>
          <p className="text-xs font-bold text-gray-400 mt-2">{user?.public_id || user?.id}</p>
        </div>
      </Modal>

    </div>
  );
}
