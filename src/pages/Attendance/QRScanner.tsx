import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Link, useSearchParams, useNavigate } from "react-router";
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
import { useAttendanceRules } from "../../api/hooks/useRules";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/molecules/Modal";
import Button from "../../components/atoms/Button";

const QRScanner = () => {
  const { data: userData, isLoading: isUserLoading } = useMe();
  const userFromQuery = userData?.data;
  const userFromStore = useAuthStore((state) => state.user);
  const user = userFromQuery || userFromStore;

  // Determine Mode: Student = Self Scan, Others = Kiosk Mode
  // Default to Kiosk if loading or check fails (safe default for gate)
  const [searchParams] = useSearchParams();
  const isSelfScan = !searchParams.get("kiosk");
  const queryClient = useQueryClient();

  const [scanResult, setScanResult] = useState<{
    status: "success" | "error" | "idle";
    message?: string;
    studentName?: string;
    role?: string;
    policy?: UserPolicyResponse;
    attendanceStatus?: string;
  }>({ status: "idle" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userPolicy, setUserPolicy] = useState<UserPolicyResponse | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"landing" | "scanner">("landing");
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);
  const lastScannedDataRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const { data: globalRulesResponse } = useAttendanceRules();

  // Determine if QR code is required globally or from user policy
  const requireQrCode = useMemo(() => {
    // If user policy has it, use that
    const userRule = userPolicy?.rules?.find(r => r.ruleType === "REQUIRE_QR_CODE");
    if (userRule) {
      return userRule.ruleValue === "true" || userRule.ruleValue === "1" || userRule.ruleValue === true;
    }
    // Otherwise fallback to global rule
    return globalRulesResponse?.data?.some(
      (r) => r.ruleType === "REQUIRE_QR_CODE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true)
    ) ?? false;
  }, [userPolicy?.rules, globalRulesResponse?.data]);

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
        // Dual Mode Payload logic matches standard API
        const deviceId = isSelfScan ? `mobile_${user?.id}` : "gate_kiosk_1";

        // Cooldown Check: Prevent scanning the same code within 5 seconds
        const now = Date.now();
        if (code === lastScannedDataRef.current && now - lastScanTimeRef.current < 5000) {
            setIsProcessing(false);
            return;
        }

        lastScannedDataRef.current = code;
        lastScanTimeRef.current = now;

        let latitude: number | undefined;
        let longitude: number | undefined;
        let photoEvidence: string | undefined;

        // Check rules if policy is loaded (typically for mobile self-scan)
        let requirePhoto = false;
        if (userPolicy?.rules) {
           const requireGeo = userPolicy.rules.some(r => r.ruleType === "REQUIRE_GEO_LOCATION" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
           requirePhoto = userPolicy.rules.some(r => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));

           if (requireGeo) {
               if (!userLocation) {
                   setScanResult({ status: "error", message: "Location access is required by attendance policy. Please enable GPS." });
                   setIsProcessing(false);
                   return;
               }
           }
        }

        if (requirePhoto) {
            setPendingScanCode(code);
            setRequireSelfie(true);
            setIsProcessing(false);
            return;
        }

        await submitScan(code, undefined);
      } catch (error) {
        handleScanError(error);
      }
    },
    [isProcessing, isSelfScan, user, userPolicy, userLocation, requireSelfie, pendingScanCode]
  );

  const submitScan = async (code: string, explicitPhoto?: string) => {
      try {
        const deviceId = isSelfScan ? `mobile_${user?.id}` : "gate_kiosk_1";
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (userLocation) {
            latitude = userLocation.lat;
            longitude = userLocation.lng;
        }

        const response = await attendanceService.scanQRCode({
          qrData: code,
          deviceId,
          latitude,
          longitude,
          photoEvidence: explicitPhoto
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

        if (isSelfScan) {
            toast.success("You have checked in successfully.");
            queryClient.invalidateQueries({ queryKey: ['mobile-student-roadmap'] });
            navigate("/");
            return;
        }

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
          message: isSelfScan
            ? "You have checked in successfully."
            : "Attendance Recorded",
          studentName:
            response.studentName || (isSelfScan ? user?.name : "Student"),
          role: isSelfScan ? "self" : "kiosk",
          policy,
          attendanceStatus: record.status || response.status,
        });

        // Reset after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
            if (isSelfScan) {
              queryClient.invalidateQueries({ queryKey: ['mobile-student-roadmap'] });
              navigate("/");
            }
          }
        }, 3000);
      } catch (error) {
        handleScanError(error);
      }
  };

  const submitDirectCheckIn = async (explicitPhoto?: string) => {
      try {
        const deviceId = isSelfScan ? `mobile_${user?.id}` : "gate_kiosk_1";
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (userLocation) {
            latitude = userLocation.lat;
            longitude = userLocation.lng;
        }

        // We use checkIn endpoint instead of scanQRCode
        // We need to pass FormData
        let photoBlob: Blob | undefined;
        if (explicitPhoto) {
            const res = await fetch(explicitPhoto);
            photoBlob = await res.blob();
        }

        const response = await attendanceService.checkIn({
            deviceId,
            latitude,
            longitude,
            method: "MANUAL",
            photo: photoBlob
        });

        let policy: UserPolicyResponse | undefined;
        const record = response.data || response;
        const userId =
          record.userId ||
          record.user_id ||
          record.id ||
          record.user?.id ||
          record.student?.id;

        if (isSelfScan) {
            toast.success("You have checked in successfully.");
            queryClient.invalidateQueries({ queryKey: ['mobile-student-roadmap'] });
            navigate("/");
            return;
        }

        if (userId) {
          try {
            const policyRes = await attendanceService.getAttendancePolicy(userId);
            policy = (policyRes as any).data || policyRes;
          } catch (e) {
            console.error("Failed to fetch policy", e);
          }
        }

        // Success Handling
        setScanResult({
          status: "success",
          message: isSelfScan
            ? "You have checked in successfully."
            : "Attendance Recorded",
          studentName:
            (record as any).studentName || (isSelfScan ? user?.name : "Student"),
          role: isSelfScan ? "self" : "kiosk",
          policy,
          attendanceStatus: record.status || (response as any).status,
        });

        // Reset after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 3000);
      } catch (error) {
        handleScanError(error);
      }
  };

  const handleScanError = (error: unknown) => {
        const err = error as any;
        console.error("Scan Error:", err);

        setScanResult({
          status: "error",
          message: err.response?.data?.message || err.message || "Invalid QR Code",
        });

        toast.error("Scan Failed");

        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 2000);
  };

  const handleTakePhoto = async () => {
        if (!pendingScanCode || isProcessing) return;
        setIsProcessing(true);

        let photoEvidence: string | undefined;
        if (renderRef.current) {
            try {
                const videoEl = renderRef.current.querySelector("video");
                if (videoEl) {
                    const canvas = document.createElement("canvas");
                    const screenWidth = window.innerWidth || document.documentElement.clientWidth || 360;
                    const screenHeight = window.innerHeight || document.documentElement.clientHeight || 800;
                    const vidWidth = videoEl.videoWidth || 640;
                    const vidHeight = videoEl.videoHeight || 480;
                    
                    const scale = Math.max(screenWidth / vidWidth, screenHeight / vidHeight);

                    const displayedWidth = vidWidth * scale;
                    const displayedHeight = vidHeight * scale;

                    const videoX = (screenWidth - displayedWidth) / 2;
                    const videoY = (screenHeight - displayedHeight) / 2;

                    // Frame is w-[80%] max-w-[320px] aspect-[3/4]
                    const frameWidth = Math.min(screenWidth * 0.8, 320);
                    const frameHeight = frameWidth * 4 / 3;

                    const left = (screenWidth - frameWidth) / 2;
                    const top = (screenHeight - frameHeight) / 2;

                    const sourceX = (left - videoX) / scale;
                    const sourceY = (top - videoY) / scale;
                    const sourceWidth = frameWidth / scale;
                    const sourceHeight = frameHeight / scale;

                    canvas.width = sourceWidth;
                    canvas.height = sourceHeight;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        const isMirrored = videoEl.style.transform.includes("scaleX(-1)");
                        if (isMirrored) {
                            ctx.translate(canvas.width, 0);
                            ctx.scale(-1, 1);
                        }
                        ctx.drawImage(videoEl, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
                        const dataUrl = canvas.toDataURL("image/webp", 0.5);
                        if (dataUrl && dataUrl.length > 50) {
                            photoEvidence = dataUrl;
                        }
                    }
                }
            } catch (e) {
                console.error("Photo capture failed:", e);
            }
        }

        if (photoEvidence) {
            setCapturedPhoto(photoEvidence);
            setIsProcessing(false);
        } else {
            // Fallback if capture fails completely
            if (pendingScanCode === "MANUAL_CHECKIN") {
                await submitDirectCheckIn();
            } else {
                await submitScan(pendingScanCode);
            }
            setRequireSelfie(false);
            setPendingScanCode(null);
            setIsProcessing(false);
        }
  };

  const handleConfirmPhoto = async () => {
        setIsProcessing(true);
        if (pendingScanCode === "MANUAL_CHECKIN") {
            await submitDirectCheckIn(capturedPhoto || undefined);
        } else if (pendingScanCode) {
            await submitScan(pendingScanCode, capturedPhoto || undefined);
        }
        setRequireSelfie(false);
        setPendingScanCode(null);
        setCapturedPhoto(null);
        setIsProcessing(false);
  };

  const handleRetakePhoto = () => {
        setCapturedPhoto(null);
  };

  // -- USB Scanner Setup --1. USB Keyboard Listener (Mostly for Kiosk) --
  useEffect(() => {
    if (isSelfScan) return; // Disable USB listener for mobile/student view to prevent conflicts
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
  }, [handleScan, isSelfScan, viewMode]);

  // -- 2. Camera Scanner Setup --
  useEffect(() => {
    // Only run camera in Scanner Mode
    if (viewMode !== "scanner") return;

    // Do not initialize the camera if QR Code is explicitly disabled and we don't need a selfie
    // (This allows the Kiosk to still work with USB scanners without opening the webcam)
    if (!requireQrCode && !requireSelfie) return;

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
          { facingMode: isSelfScan && requireSelfie && !requireQrCode ? "user" : "environment" },
          {
            fps: 10,
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

  // -- Fetch Policy on Mount & Manual Refresh --
  const fetchPolicy = useCallback(() => {
    const targetId = user?.id || user?.public_id;

    if (targetId) {
      attendanceService
        .getAttendancePolicy(targetId)
        .then(async (res) => {
          const policyData = (res as any).data || res;
          
          // Apply Dynamic Teacher Schedule Override
          const isSelfScanUser = user?.userTypes?.includes("student");
          if (!isSelfScanUser) {
             const dynamicRule = policyData?.rules?.find((r: any) => r.ruleType === "DYNAMIC_TEACHER_SCHEDULE");
             if (dynamicRule && (dynamicRule.ruleValue === "true" || dynamicRule.ruleValue === true)) {
                try {
                   const todayStr = new Date().toISOString().split('T')[0];
                   const sessionsRes = await attendanceService.getTeachingSessions({ 
                       actualTeacherId: targetId.toString(), 
                       sessionDate: todayStr,
                       limit: 100
                   });
                   const sessions = (sessionsRes as any).data || sessionsRes;
                   if (Array.isArray(sessions) && sessions.length > 0) {
                       const firstSession = sessions.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))[0];
                       if (policyData.attendancePolicy && firstSession.startTime) {
                          policyData.attendancePolicy.startTime = firstSession.startTime;
                       }
                   }
                } catch (err) {
                   console.error("Failed to fetch teacher schedule for dynamic check-in:", err);
                }
             }
          }

          console.log("Policy response:", res, "Extracted:", policyData);
          setUserPolicy(policyData);
          setPolicyError(null);

          const requireGeo = policyData?.rules?.some((r: any) => r.ruleType === "REQUIRE_GEO_LOCATION" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
          if (requireGeo) {
             navigator.geolocation.getCurrentPosition(
               (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
               (err) => console.error("Pre-scan geolocation failed:", err),
               { enableHighAccuracy: true }
             );
          }
        })
        .catch((err) => {
          console.error("Failed to load user policy", err);
          setPolicyError(err.message || "Failed to load policy");
        });
    }
  }, [user]);

  useEffect(() => {
    const targetId = user?.id || user?.public_id;

    // Prevent double fetch if same ID
    if (targetId && targetId !== lastFetchedIdRef.current) {
      console.log(
        "Mounting QRScanner.",
        "Target ID:",
        targetId
      );

      lastFetchedIdRef.current = targetId;
      fetchPolicy();
    }
  }, [user, fetchPolicy]);

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

    // Extract common rules
    const requireGeo = userPolicy?.rules?.some(r => r.ruleType === "REQUIRE_GEO_LOCATION" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
    const requirePhoto = userPolicy?.rules?.some(r => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));

    // Determine State
    const attendanceState: 'restricted' | 'checkedIn' | 'none' | 'holiday' | 'complete' = 
            todayStatus?.clockOut ? 'complete' :
            isHoliday ? 'holiday' :
            (todayStatus?.clockIn ? 'checkedIn' :
             (isRestricted ? 'restricted' : 'none'));

    return (
      <div className="fixed inset-0 bg-black text-white overflow-y-auto font-sans">
        {/* Background Ambient */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
            {/* Header - Absolute Top Center Title */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6">
                <div className="flex items-center justify-between w-full">
                  <button 
                      onClick={() => navigate("/")}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
                  >
                      <ChevronLeftIcon className="size-6" />
                  </button>
                  <button 
                      onClick={fetchPolicy}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 active:scale-95"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                      </svg>
                  </button>
                </div>
            </div>

          <div className="w-full max-w-md space-y-8 mt-12 sm:mt-0">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Absen Kehadiran
              </h1>
              <p className="text-white/50">Select your policy to begin scanning</p>
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
                      attendanceState === "restricted" ||
                      attendanceState === "holiday"
                    )
                      return;
                    
                    if (!isSelfScan || requireQrCode) {
                      setViewMode("scanner");
                    } else if (requirePhoto) {
                      setPendingScanCode("MANUAL_CHECKIN");
                      setRequireSelfie(true);
                      setViewMode("scanner");
                    } else {
                      setIsConfirmModalOpen(true);
                    }
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
                      )?.ruleValue === "true" || userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_GEO_LOCATION"
                      )?.ruleValue === "1" || userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_GEO_LOCATION"
                      )?.ruleValue === true;
                      const requirePhoto = userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE"
                      )?.ruleValue === "true" || userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE"
                      )?.ruleValue === "1" || userPolicy.rules?.find(
                        (r) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE"
                      )?.ruleValue === true;
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
                            {(!isSelfScan || requireQrCode) ? "Scan to Clock Out" : requirePhoto ? "Take Selfie to Clock Out" : "Tap to Clock Out"}
                            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                          </span>
                        ) : (
                          <span className="text-brand-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medium text-sm">
                            {(!isSelfScan || requireQrCode) ? "Start Scanning" : requirePhoto ? "Take Selfie" : "Check In Now"}
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
                to={isSelfScan ? "/" : "/attendance/piket"}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                &larr; Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Confirm Check-In"
          className="w-full sm:max-w-md m-0 sm:m-4"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  submitDirectCheckIn();
                }}
                className="flex-1"
              >
                Confirm
              </Button>
            </div>
          }
        >
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            <p>Are you sure you want to {attendanceState === "checkedIn" ? "clock out" : "check in"} now?</p>
          </div>
        </Modal>
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
      <div className="absolute inset-x-0 top-0 p-6 sm:p-8 z-50 pointer-events-none flex items-start justify-between">
                <div className="flex items-center justify-between w-full">
                  <button 
                      onClick={() => {
                          if (requireSelfie && requireQrCode) {
                              setRequireSelfie(false);
                          } else {
                              navigate("/");
                          }
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 pointer-events-auto active:scale-95"
                  >
                      <ChevronLeftIcon className="size-6" />
                  </button>
                  <button 
                      onClick={fetchPolicy}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 active:scale-95 pointer-events-auto"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                      </svg>
                  </button>
                </div>
        <div className="flex-1 mr-10 text-center">
          <h1 className="text-lg sm:text-xl font-bold text-white mb-1 tracking-tight drop-shadow-md">
            {requireSelfie ? "Take a Selfie" : "Scanning"}
          </h1>
          {userPolicy && (
            <p className="text-white/70 text-xs font-medium drop-shadow-sm">
              {requireSelfie ? "Position your face in the frame" : userPolicy.class?.name}
            </p>
          )}
        </div>
      </div>

      {/* Target Box (Fixed Position - Centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-80 sm:h-80 z-20 pointer-events-none">
        {/* Adjust darkness: Reduced shadow alpha for clearer view */}
        {!requireSelfie && (
            <div className="absolute inset-0 bg-black/40 z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] rounded-3xl" />
            </div>
        )}

        {/* Custom Green Corner Frames Only (Hide during selfie or if QR is disabled) */}
        {!requireSelfie && requireQrCode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] z-20 pointer-events-none">
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
                <motion.div
                initial={{ top: "-10%" }}
                animate={{ top: "110%" }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                >
                <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-brand-500/30 to-transparent" />
                </motion.div>
            </div>
            {/* Custom Corners */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-brand-500 rounded-tl-3xl" />
            <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-brand-500 rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-brand-500 rounded-bl-3xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-brand-500 rounded-br-3xl" />
            </div>
        )}

        {/* Message for RFID Scanner when QR is disabled */}
        {!requireSelfie && !requireQrCode && !isSelfScan && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-brand-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-8v4h8v-4zM6 16H4m14-8v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2z" />
                    </svg>
                    <h2 className="text-xl font-bold text-white mb-2">Ready to Scan</h2>
                    <p className="text-white/60 text-sm">Please use the USB Card Reader</p>
                </div>
            </div>
        )}

        {/* Selfie Capture Overlay */}
        {requireSelfie && !capturedPhoto && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto overflow-hidden pb-12">
                {/* No dark overlay filter, let the camera view be fully visible */}

                {/* Clean Cutout Frame */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-[80%] max-w-[320px] aspect-[3/4] rounded-2xl z-40 relative mt-16"
                >
                    {/* Darken only the outside slightly to highlight the frame, but no heavy filter */}
                    <div className="absolute inset-0 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none border-2 border-white/80" />
                    
                    {/* Corner accents */}
                    <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-brand-500 rounded-tl-2xl pointer-events-none" />
                    <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-brand-500 rounded-tr-2xl pointer-events-none" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-brand-500 rounded-bl-2xl pointer-events-none" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-brand-500 rounded-br-2xl pointer-events-none" />
                </motion.div>

                {/* Modern Camera Button */}
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-8 flex flex-col items-center z-50"
                >
                    <button 
                        onClick={handleTakePhoto}
                        disabled={isProcessing}
                        className="w-[72px] h-[72px] rounded-full border-[3px] border-white p-1 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                    >
                        <div className="w-full h-full bg-white rounded-full" />
                    </button>
                </motion.div>
            </div>
        )}

        {/* Captured Photo Preview Overlay */}
        {capturedPhoto && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center pointer-events-auto">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-16 left-0 right-0 text-center z-50 px-4"
                >
                    <h2 className="text-2xl font-bold text-white tracking-wide">Preview</h2>
                </motion.div>
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-[80%] max-w-[320px] aspect-[3/4] rounded-2xl overflow-hidden z-40 relative mt-8"
                >
                    {/* Pure image, no filters */}
                    <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured selfie" />
                </motion.div>

                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute bottom-16 flex gap-4 z-50 w-[80%] max-w-[320px]"
                >
                    <button 
                        className="flex-1 bg-[#333333] hover:bg-[#444444] text-white font-medium py-3.5 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2" 
                        onClick={handleRetakePhoto} 
                        disabled={isProcessing}
                    >
                        Retake
                    </button>
                    <button 
                        className="flex-1 bg-brand-500 hover:bg-brand-400 text-white font-medium py-3.5 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2" 
                        onClick={handleConfirmPhoto} 
                        disabled={isProcessing}
                    >
                        {isProcessing ? "Saving..." : "Submit"}
                    </button>
                </motion.div>
            </div>
        )}
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
      {isSelfScan && !userPolicy && (
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
                ? scanResult.attendanceStatus === "LATE" 
                    ? "bg-amber-500/80" 
                    : "bg-green-500/80"
                : "bg-red-500/80"
            }`}
          >
            <div className="text-center text-white max-w-lg">
              {scanResult.status === "success" ? (
                <>
                  <div className={`w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-2xl ${
                      scanResult.attendanceStatus === "LATE" ? "text-amber-500" : "text-green-500"
                  }`}>
                    {scanResult.attendanceStatus === "LATE" ? (
                        <AlertIcon className="w-14 h-14" />
                    ) : (
                        <CheckCircleIcon className="w-14 h-14" />
                    )}
                  </div>
                  <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
                    {scanResult.attendanceStatus === "LATE" ? "LATE RECORDED" : "SUCCESS"}
                  </h2>

                  {isSelfScan ? (
                    <>
                      <p className="text-2xl font-medium opacity-90">
                        {scanResult.attendanceStatus === "LATE" ? "Checked In Late!" : "Checked In!"}
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
