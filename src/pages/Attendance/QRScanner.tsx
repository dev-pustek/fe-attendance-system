import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Link } from "react-router";
import { attendanceService } from "../../api/services/attendanceService";
import { useMe } from "../../api/hooks/useAuth";
import { UserPolicyResponse } from "../../api/types/attendance";
import {
  CheckCircleIcon,
  AlertIcon,
  ChevronLeftIcon,
} from "../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

import { useAuthStore } from "../../store/authStore";

const QRScanner = () => {
  const { data: userData, isLoading: isUserLoading } = useMe();
  const userFromQuery = userData?.data;
  const userFromStore = useAuthStore((state) => state.user);
  const user = userFromQuery || userFromStore;

  // Determine Mode: Student = Self Scan, Others = Kiosk Mode
  // Default to Kiosk if loading or check fails (safe default for gate)
  const isStudent = user?.userTypes?.includes("student") || false;

  const [scanResult, setScanResult] = useState<{
    status: "success" | "error" | "idle";
    message?: string;
    studentName?: string;
    role?: string;
    policy?: UserPolicyResponse;
  }>({ status: "idle" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [userPolicy, setUserPolicy] = useState<UserPolicyResponse | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"landing" | "scanner">("landing");
  const lastFetchedIdRef = useRef<string | null>(null);

  // USB Scanner Buffer
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  // Camera Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  // -- API Handler --
  const handleScan = useCallback(
    async (code: string) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        // Determine Context for API
        // Kiosk: deviceId = 'gate_kiosk_1' (or similar static ID)
        // Student: deviceId = 'mobile' (or user ID to track device usage)
        const deviceId = isStudent ? `mobile_${user?.id}` : "gate_kiosk_1";

        // Dual Mode Payload logic matches standard API
        const response = await attendanceService.scanQRCode({
          qrData: code,
          deviceId,
        });

        let policy: UserPolicyResponse | undefined;
        // Try to extract userId from various possible locations in the response
        // Support: wrapped data, direct object, camelCase, snake_case, nested user object
        const record = response.data || response;
        const userId =
          record.userId ||
          record.user_id ||
          record.id ||
          record.user?.id ||
          record.student?.id;

        console.log(
          "Scan successful, extracted userId:",
          userId,
          "Full response:",
          response
        );

        if (userId) {
          try {
            const policyRes = await attendanceService.getAttendancePolicy(
              userId
            );
            policy = (policyRes as any).data || policyRes;
          } catch (e) {
            console.error("Failed to fetch policy", e);
          }
        }

        // Success Handling
        setScanResult({
          status: "success",
          message: isStudent
            ? "You have checked in successfully."
            : "Attendance Recorded",
          studentName:
            response.studentName || (isStudent ? user?.name : "Student"),
          role: isStudent ? "self" : "kiosk",
          policy,
        });

        // Reset after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
            // If student, maybe redirect home after success?
            // For now, keep it open for multi-scans or manual exit
            if (isStudent) {
              // Optional: navigate('/') after delay?
              // navigate('/');
            }
          }
        }, 3000);
      } catch (error) {
        const err = error as any;
        console.error("Scan Error:", err);

        setScanResult({
          status: "error",
          message: err.response?.data?.message || "Invalid QR Code",
        });

        toast.error("Scan Failed");

        // Reset error faster
        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 2000);
      }
    },
    [isProcessing, isStudent, user]
  );

  // -- 1. USB Keyboard Listener (Mostly for Kiosk) --
  useEffect(() => {
    if (isStudent) return; // Disable USB listener for mobile/student view to prevent conflicts
    // USB Listener should arguably work in Landing Mode too?
    // User said: "user can click which card they want to scan".
    // But Kiosk usually has a scanner always ready.
    // Let's enable it ONLY in Scanner View to be safe and consistent with UI.
    if (viewMode !== "scanner") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // If significant delay, reset buffer
      if (currentTime - lastKeyTimeRef.current > 100) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        if (bufferRef.current.length > 0) {
          handleScan(bufferRef.current);
          bufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleScan, isStudent, viewMode]);

  // -- 2. Camera Scanner Setup --
  useEffect(() => {
    // Only run camera in Scanner Mode
    if (viewMode !== "scanner") return;

    isMountedRef.current = true;
    let scanner: Html5Qrcode | null = null;
    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(async () => {
      if (!renderRef.current) return;
      const elementId = renderRef.current.id;

      try {
        scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScan(decodedText);
          },
          () => {
            // ignore parse errors
          }
        );
      } catch (err) {
        console.error("Camera start failed", err);
        if (isMountedRef.current)
          setScanError("Camera access denied or unavailable.");
      }
    }, 500);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(console.error);
      }
    };
  }, [handleScan, viewMode]);

  // -- 3. Fetch Policy on Mount (All Users) --
  useEffect(() => {
    const targetId = user?.id || user?.public_id;

    // Prevent double fetch if same ID
    if (targetId && targetId !== lastFetchedIdRef.current) {
      console.log(
        "Mounting QRScanner.",
        "User (Query):",
        userFromQuery,
        "User (Store):",
        userFromStore,
        "Target ID:",
        targetId
      );

      lastFetchedIdRef.current = targetId;

      attendanceService
        .getAttendancePolicy(targetId)
        .then((res) => {
          const policyData = (res as any).data || res;
          console.log("Policy response:", res, "Extracted:", policyData);
          setUserPolicy(policyData);
          setPolicyError(null);
        })
        .catch((err) => {
          console.error("Failed to load user policy", err);
          setPolicyError(err.message || "Failed to load policy");
          lastFetchedIdRef.current = null; // Reset on error to allow retry
        });
    }
  }, [user, userFromQuery, userFromStore]);

  // --- STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isUserLoading)
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );

  // --- LANDING VIEW ---
  if (viewMode === "landing") {
    const todayStatus = userPolicy?.todayStatus;

    // --- 1. Window & Time Restrictions ---
    const getRestrictionState = (): {
      isRestricted: boolean;
      reason: "too_early" | "too_late" | null;
      message: string | null;
      openTime?: Date;
    } => {
      if (!userPolicy || !userPolicy.attendancePolicy)
        return { isRestricted: false, reason: null, message: null };

      const now = currentTime;
      const { startTime, endTime } = userPolicy.attendancePolicy;

      // Helper: parse HH:MM:SS string to today's Date
      const getTimeDate = (timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
      };

      const startDate = getTimeDate(startTime);
      const endDate = getTimeDate(endTime);

      // A. Check Early Restriction (CHECKIN_WINDOW_START_MIN)
      const checkInWindowRule = userPolicy.rules?.find(
        (r) => r.ruleType === "CHECKIN_WINDOW_START_MIN"
      );
      if (checkInWindowRule) {
        const windowMinutes = Number(checkInWindowRule.ruleValue);
        // Allowed start = startTime - windowMinutes
        const allowedStart = new Date(
          startDate.getTime() - windowMinutes * 60000
        );

        if (now < allowedStart) {
          return {
            isRestricted: true,
            reason: "too_early",
            message: null, // Will be handled by UI countdown
            openTime: allowedStart,
          };
        }
      }

      // B. Check Late Restriction (End Time)
      // Note: If already checked in, we allow clock out even after end time.
      if (now > endDate && !todayStatus?.clockIn) {
        return {
          isRestricted: true,
          reason: "too_late",
          message: "Attendance Closed",
        };
      }

      return { isRestricted: false, reason: null, message: null };
    };

    const restriction = getRestrictionState();
    const isRestricted = restriction.isRestricted;

    // Calculate Countdown String
    const getCountdown = (targetDate: Date) => {
      const diff = targetDate.getTime() - currentTime.getTime();
      if (diff <= 0) return "00:00:00";

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // Determine State
        const isHoliday = userPolicy?.holiday?.isHoliday ?? false;

        // Determine State
        const attendanceState: 'complete' | 'restricted' | 'checkedIn' | 'none' | 'holiday' = 
            isHoliday ? 'holiday' :
            todayStatus?.clockIn && todayStatus?.clockOut ? 'complete' :
            (todayStatus?.clockIn ? 'checkedIn' :
             (isRestricted ? 'restricted' : 'none'));

    return (
      <div className="fixed inset-0 bg-black text-white overflow-y-auto font-sans">
        {/* Background Ambient */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Gate Scanner
              </h1>
              <p className="text-white/50">Select a policy to begin scanning</p>
            </div>

            {/* Policy Card List */}
            <div className="space-y-4">
              {userPolicy ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={
                    attendanceState === "complete" ||
                    attendanceState === "restricted"
                      ? {}
                      : { scale: 1.02 }
                  }
                  whileTap={
                    attendanceState === "complete" ||
                    attendanceState === "restricted"
                      ? {}
                      : { scale: 0.98 }
                  }
                  onClick={() => {
                    if (
                      attendanceState === "complete" ||
                      attendanceState === "restricted" ||
                      attendanceState === "holiday"
                    )
                      return;
                    setViewMode("scanner");
                  }}
                  className={`border rounded-2xl p-6 transition-all group relative overflow-hidden shadow-2xl ${
                    attendanceState === "complete"
                      ? "bg-black/40 border-white/5 opacity-60 cursor-default"
                      : attendanceState === "restricted"
                      ? "bg-red-500/5 border-red-500/10 opacity-70 cursor-not-allowed"
                      : attendanceState === "holiday"
                      ? "bg-purple-500/10 border-purple-500/20 opacity-90 cursor-default"
                      : attendanceState === "checkedIn"
                      ? "bg-yellow-500/10 border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20"
                      : "bg-brand-500/10 border-brand-500/20 cursor-pointer hover:bg-brand-500/20"
                  }`}
                >
                  {attendanceState === "complete" && (
                    <div className="absolute top-0 left-0 right-0 bg-green-500/20 text-green-400 text-center text-[10px] font-bold py-1 uppercase tracking-wider border-b border-green-500/30 font-mono">
                      Attendance Completed
                    </div>
                  )}

                  {attendanceState === "holiday" && (
                    <div className="absolute top-0 left-0 right-0 bg-purple-500/20 text-purple-300 text-center text-[10px] font-bold py-1 uppercase tracking-wider border-b border-purple-500/30 font-mono">
                      Holiday • {userPolicy.holiday?.name || "Day Off"}
                    </div>
                  )}

                  {attendanceState === "restricted" && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500/20 text-red-400 text-center text-[10px] font-bold py-1 uppercase tracking-wider border-b border-red-500/30 font-mono">
                      {restriction.reason === "too_early" &&
                      restriction.openTime ? (
                        <span>
                          Opens in{" "}
                          <span className="text-white">
                            {getCountdown(restriction.openTime)}
                          </span>
                        </span>
                      ) : (
                        restriction.message || "Restricted"
                      )}
                    </div>
                  )}

                  <div
                    className={`flex items-start justify-between mb-6 ${
                      attendanceState === "complete" ||
                      attendanceState === "restricted" ||
                      attendanceState === "holiday"
                        ? "mt-6"
                        : ""
                    }`}
                  >
                    <div>
                      <div
                        className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                          attendanceState === "checkedIn"
                            ? "text-yellow-500"
                            : attendanceState === "restricted"
                            ? "text-red-500"
                            : "text-brand-400"
                        }`}
                      >
                        {attendanceState === 'holiday' 
                            ? 'Holiday' 
                            : (userPolicy.attendancePolicy?.source?.replace(/_/g, " ") || 'Unknown Source')}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {userPolicy.userName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {userPolicy.class && (
                          <span className="text-white/50 text-sm">
                            {userPolicy.class.name}
                          </span>
                        )}
                        {userPolicy.studentProfile?.nis && (
                          <span className="text-xs font-mono text-white/30 px-1.5 py-0.5 bg-white/5 rounded min-w-[30px] text-center">
                            {userPolicy.studentProfile.nis}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Icon - Now Flex Item */}
                    <div
                      className={`p-2 rounded-full transition-colors flex-shrink-0 ml-4 ${
                        attendanceState === "complete"
                          ? "bg-green-500/20 text-green-500"
                          : attendanceState === "restricted"
                          ? "bg-red-500/20 text-red-500"
                          : attendanceState === "holiday"
                          ? "bg-purple-500/20 text-purple-400"
                          : attendanceState === "checkedIn"
                          ? "bg-yellow-500/20 text-yellow-500"
                          : "bg-brand-500/20 text-brand-500"
                      }`}
                    >
                      {attendanceState === "complete" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : attendanceState === "restricted" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : attendanceState === "holiday" ? (
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                           <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                         </svg>
                      ) : attendanceState === "checkedIn" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-4 border border-white/5">
                    {attendanceState === "holiday" ? (
                        <div className="col-span-2 text-center py-2">
                             <div className="text-purple-300 font-medium text-sm">
                                No attendance required today
                             </div>
                             <div className="text-white/40 text-xs mt-1">
                                Enjoy your holiday!
                             </div>
                        </div>
                    ) : (
                    <>
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                        Clock In
                      </span>
                      {todayStatus?.clockIn ? (
                        <span className="text-lg font-mono font-bold text-green-400 flex items-center gap-1">
                          {new Date(todayStatus.clockIn).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3 h-3 text-green-500"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-lg font-mono font-bold text-white group-hover:text-brand-300 transition-colors">
                          {userPolicy.attendancePolicy?.startTime?.slice(0, 5) || '--:--'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">
                        Clock Out
                      </span>
                      {todayStatus?.clockOut ? (
                        <span className="text-lg font-mono font-bold text-green-400 flex items-center gap-1">
                          {new Date(todayStatus.clockOut).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3 h-3 text-green-500"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span
                          className={`text-lg font-mono font-bold transition-colors ${
                            attendanceState === "checkedIn"
                              ? "text-white group-hover:text-yellow-300"
                              : "text-white"
                          }`}
                        >
                          {userPolicy.attendancePolicy?.endTime?.slice(0, 5) || '--:--'}
                        </span>
                      )}
                    </div>
                    </>
                    )}
                  </div>

                  {/* Rules Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(() => {
                      const requireGeo = userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_GEO_LOCATION"
                      )?.ruleValue;
                      const requirePhoto = userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE"
                      )?.ruleValue;
                      const lateTolerance = userPolicy.rules?.find(
                        (r) => r.ruleType === "LATE_TOLERANCE"
                      )?.ruleValue;
                      const checkinWindow = userPolicy.rules?.find(
                        (r) => r.ruleType === "CHECKIN_WINDOW_START_MIN"
                      )?.ruleValue;

                      return (
                        <>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium uppercase tracking-wide ${
                              requireGeo
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                : "bg-white/5 border-white/10 text-white/40"
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.006.003.002.001.003.001a.75.75 0 01-.01-1.498l-.003-.001-.006-.003-.018-.008a10.341 10.341 0 01-.85-.475 12.23 12.23 0 01-2.025-1.574C5.068 13.342 3.5 11.108 3.5 9a6.5 6.5 0 1113 0c0 2.108-1.568 4.342-3.216 5.928a12.231 12.231 0 01-2.025 1.574 10.342 10.342 0 01-.85.475l-.018.008-.006.003-.003.001a.75.75 0 01.01 1.498z"
                                clipRule="evenodd"
                              />
                              <path
                                fillRule="evenodd"
                                d="M10 11a2 2 0 100-4 2 2 0 000 4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Location {requireGeo ? "Required" : "Optional"}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium uppercase tracking-wide ${
                              requirePhoto
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                                : "bg-white/5 border-white/10 text-white/40"
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Photo {requirePhoto ? "Required" : "Optional"}
                          </span>

                          {lateTolerance > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-[10px] font-medium text-orange-300 uppercase tracking-wide">
                              Late +{lateTolerance}m
                            </span>
                          )}
                          {checkinWindow > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-[10px] font-medium text-teal-300 uppercase tracking-wide">
                              Open -{checkinWindow}m
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className={`mt-6 flex items-center pt-4 border-t border-white/5 ${
                     ["complete", "restricted", "holiday"].includes(attendanceState) 
                     ? "justify-center" 
                     : "justify-between"
                  }`}>
                    <span className="text-white/60 flex items-center gap-2 text-xs uppercase tracking-wide">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-brand-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.75A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.5V6.75A2.75 2.75 0 014.75 4h.25V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {userPolicy.attendancePolicy?.dayOfWeek
                        ? userPolicy.attendancePolicy?.dayOfWeek
                        : new Date().toLocaleDateString("en-GB", {
                            weekday: "long",
                          })}
                    </span>



                    {!["complete", "restricted", "holiday"].includes(attendanceState) && (
                         attendanceState === "checkedIn" ? (
                          <span className="text-yellow-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medium text-sm">
                            Scan to Clock Out{" "}
                            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                          </span>
                        ) : (
                          <span className="text-brand-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medium text-sm">
                            Start Scanning{" "}
                            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                          </span>
                        )
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center animate-pulse">
                  <div className="w-12 h-12 bg-white/10 rounded-full mx-auto mb-4" />
                  <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                  <div className="h-3 bg-white/10 rounded w-1/2 mx-auto" />
                  <div className="mt-4 text-xs text-brand-500/80 font-mono">
                    {policyError
                      ? `Error: ${policyError}`
                      : `Waiting... (${(
                          user?.id ||
                          user?.public_id ||
                          ""
                        ).slice(0, 8)}...)`}
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Back */}
            <div className="text-center mt-12">
              <Link
                to="/attendance/piket"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                &larr; Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SCANNER VIEW ---
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden font-sans">
      {/* Camera View */}
      <div
        ref={renderRef}
        id="reader"
        className="absolute inset-0 w-full h-full bg-black z-0"
      />
      <style>{`
                #reader {
                    position: absolute !important;
                    top: 0; 
                    left: 0; 
                    width: 100%; 
                    height: 100%;
                    overflow: hidden;
                }
                #reader video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                }
                /* Hide any default library overlays/borders */
                #reader div[style*="position: absolute"] { display: none !important; }
                #reader__scan_region { display: none !important; }
             `}</style>

      {/* Dark Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10 pointer-events-none" />

      {/* Fallback Error Message */}
      {scanError && (
        <div className="absolute inset-x-0 bottom-44 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-black/80 text-white px-6 py-4 rounded-xl max-w-sm text-center backdrop-blur-md border border-white/10">
            <AlertIcon className="size-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm">{scanError}</p>
          </div>
        </div>
      )}

      {/* Overlay UI Header */}
      <div className="absolute inset-x-0 top-0 p-6 sm:p-8 z-20 pointer-events-none flex items-start justify-between">
        <button
          onClick={() => setViewMode("landing")}
          className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/5"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div className="flex-1 mr-10 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight drop-shadow-md">
            Scanning
          </h1>
          {userPolicy && (
            <p className="text-white/70 text-sm font-medium drop-shadow-sm">
              {userPolicy.class?.name}
            </p>
          )}
        </div>
      </div>

      {/* Target Box (Fixed Position - Centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-80 sm:h-80 z-20 pointer-events-none">
        {/* SVG Frame for perfect corners */}
        <svg
          className="absolute inset-0 w-full h-full text-brand-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Thin continuous border opacity */}
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="20"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="0.5"
          />

          {/* Thicker Corner Accents */}
          <path
            d="M25 2H20C10 2 2 10 2 20V25"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M75 2H80C90 2 98 10 98 20V25"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M2 75V80C2 90 10 98 20 98H25"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M98 75V80C98 90 90 98 80 98H75"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        {/* Scanning Laser */}
        <motion.div
          initial={{ top: "10%", opacity: 0 }}
          animate={{ top: "90%", opacity: [0, 1, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
          className="absolute left-[10%] right-[10%] h-0.5 bg-brand-400 shadow-[0_0_20px_rgba(96,165,250,1)]"
        >
          <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-brand-500/20 to-transparent" />
        </motion.div>
      </div>

      {/* --- SIMPLIFIED BOTTOM BAR (Scanner View) --- */}
      {userPolicy && (
        <div className="absolute inset-x-0 bottom-10 z-20 flex justify-center px-6 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="text-center px-4">
              <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                Date
              </span>
              <span className="text-sm font-medium text-white flex items-center gap-1">
                {new Date(userPolicy.date).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="text-center px-4">
              <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                Clock In
              </span>
              <span className="text-lg font-mono font-bold text-white tracking-tight">
                {userPolicy.attendancePolicy?.startTime?.slice(0, 5) || '--:--'}
              </span>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="text-center px-4">
              <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                Clock Out
              </span>
              <span className="text-lg font-mono font-bold text-white tracking-tight">
                {userPolicy.attendancePolicy?.endTime?.slice(0, 5) || '--:--'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Self-Scan Hint (Only Student, if no policy?) */}
      {isStudent && !userPolicy && (
        <div className="absolute bottom-32 flex items-center justify-center pointer-events-none z-10">
          <p className="text-white/70 text-sm bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            Point camera at the Gate QR Code
          </p>
        </div>
      )}

      {/* Result Overlay */}
      <AnimatePresence>
        {scanResult.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute inset-0 flex items-center justify-center p-8 backdrop-blur-xl z-50 ${
              scanResult.status === "success"
                ? "bg-green-500/80"
                : "bg-red-500/80"
            }`}
          >
            <div className="text-center text-white max-w-lg">
              {scanResult.status === "success" ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-white text-green-500 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <CheckCircleIcon className="w-14 h-14" />
                  </div>
                  <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
                    SUCCESS
                  </h2>

                  {isStudent ? (
                    <>
                      <p className="text-2xl font-medium opacity-90">
                        Checked In!
                      </p>
                      <p className="mt-2 text-lg opacity-75">
                        {scanResult.message}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold opacity-90">
                        {scanResult.studentName}
                      </p>
                      <p className="mt-2 text-lg opacity-75">
                        {scanResult.message}
                      </p>
                    </>
                  )}

                  {scanResult.policy && (
                    <div className="mt-6 bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/10 text-left">
                      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3 pb-2 border-b border-white/10">
                        Attendance Policy
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] text-white/50 uppercase tracking-wide">
                            Start Time
                          </span>
                          <span className="text-xl font-mono font-bold">
                            {scanResult.policy.attendancePolicy.startTime.slice(
                              0,
                              5
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-white/50 uppercase tracking-wide">
                            End Time
                          </span>
                          <span className="text-xl font-mono font-bold">
                            {scanResult.policy.attendancePolicy.endTime.slice(
                              0,
                              5
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-white/50 uppercase tracking-wide">
                            Late Limit
                          </span>
                          <span className="text-sm font-medium">
                            +{scanResult.policy.attendancePolicy.lateTolerance}{" "}
                            mins
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-white/50 uppercase tracking-wide">
                            Source
                          </span>
                          <span className="text-sm font-medium truncate capitalize">
                            {scanResult.policy.attendancePolicy.source.replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-white text-red-500 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <AlertIcon className="w-14 h-14" />
                  </div>
                  <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
                    ERROR
                  </h2>
                  <p className="text-xl font-medium opacity-90">
                    {scanResult.message}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QRScanner;
