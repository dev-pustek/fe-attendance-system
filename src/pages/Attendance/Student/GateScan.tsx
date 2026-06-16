import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate, useSearchParams } from "react-router";
import { attendanceService } from "../../../api/services/attendanceService";
import { settingsService } from "../../../api/services/settingsService";
import { UserPolicyResponse } from "../../../api/types/attendance";
import {
  ChevronLeftIcon,
  LockIcon,
} from "../../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuthStore } from "../../../store/authStore";
import { useAttendanceRules } from "../../../api/hooks/useRules";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Modal } from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";

const GateScan = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const isSelfScan = !searchParams.get("kiosk");
  const queryClient = useQueryClient();

  const [scanResult, setScanResult] = useState<{
    status: "success" | "error" | "idle";
    message?: string;
    studentName?: string;
    role?: "kiosk" | "self";
    policy?: UserPolicyResponse;
    attendanceStatus?: string;
    record?: any;
  }>({ status: "idle" });
  
  const [isProcessing, setIsProcessing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scanError, setScanError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geoSettings, setGeoSettings] = useState<{lat: number, lng: number, radius: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [userPolicy, setUserPolicy] = useState<UserPolicyResponse | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"landing" | "scanner">("landing");
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);
  const lastScannedDataRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Camera Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  const { data: globalRulesResponse } = useAttendanceRules();

  const requireQrCode = useMemo(() => {
    const userRule = userPolicy?.rules?.find((r: any) => r.ruleType === "REQUIRE_QR_CODE");
    if (userRule) {
      return userRule.ruleValue === "true" || userRule.ruleValue === "1" || userRule.ruleValue === true;
    }
    return globalRulesResponse?.data?.some(
      (r) => r.ruleType === "REQUIRE_QR_CODE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true)
    ) ?? false;
  }, [userPolicy?.rules, globalRulesResponse?.data]);

  const requirePhotoEvidence = useMemo(() => {
    const userRule = userPolicy?.rules?.find((r: any) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE");
    if (userRule) {
      return userRule.ruleValue === "true" || userRule.ruleValue === "1" || userRule.ruleValue === true;
    }
    return globalRulesResponse?.data?.some(
      (r) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true)
    ) ?? false;
  }, [userPolicy?.rules, globalRulesResponse?.data]);

  const { data: userIp } = useQuery({
    queryKey: ["user-ip"],
    queryFn: async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        return data.ip as string;
      } catch (e) {
        return "Unknown IP";
      }
    },
    staleTime: 60000,
  });

  // -- API Handler --
  const handleScan = useCallback(
    async (code: string) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const deviceId = isSelfScan ? `mobile_${user?.id}` : "gate_kiosk_1";

        // Cooldown Check: Prevent scanning the same code within 5 seconds
        const now = Date.now();
        if (code === lastScannedDataRef.current && now - lastScanTimeRef.current < 5000) {
            setIsProcessing(false);
            return;
        }

        lastScannedDataRef.current = code;
        lastScanTimeRef.current = now;

        if (requirePhotoEvidence) {
            setPendingScanCode(code);
            setRequireSelfie(true);
            setIsProcessing(false);
            return; // Wait for user to take selfie
        }

        await submitScan(code, undefined);
      } catch (error: unknown) {
        handleScanError(error);
      }
    },
    [isProcessing, isSelfScan, user, requireSelfie, pendingScanCode, requirePhotoEvidence] // submitScan and handleScanError don't change
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
        }) as any;

        let policy: UserPolicyResponse | undefined;
        const record = response.data || response;
        const userId =
          record.userId ||
          record.user_id ||
          record.id ||
          record.user?.id ||
          record.student?.id;

        if (isSelfScan) {
            toast.success("Scan successful!");
            queryClient.invalidateQueries({ queryKey: ['mobile-student-roadmap'] });
            navigate("/");
            return;
        }

        if (userId) {
          try {
            const policyRes = await attendanceService.getAttendancePolicy(
              userId
            );
            policy = (policyRes as { data?: UserPolicyResponse }).data || (policyRes as unknown as UserPolicyResponse);
          } catch (e) {
            console.error("Failed to fetch policy", e);
          }
        }

        setScanResult({
          status: "success",
          message: "Attendance Recorded",
          studentName: response.studentName || "Student",
          role: "kiosk",
          policy,
          attendanceStatus: (record.statusLabel || response.statusLabel)?.toUpperCase(),
          record: record,
        });

        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 3000);
      } catch (error: unknown) {
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

        let photoBlob: Blob | undefined;
        if (explicitPhoto) {
            const res = await fetch(explicitPhoto);
            photoBlob = await res.blob();
        }

        const isCheckedIn = userPolicy?.todayStatus?.clockIn ? true : false;
        
        let response;
        if (isCheckedIn) {
            response = await attendanceService.checkOut({
                deviceId,
                latitude,
                longitude,
                method: "MANUAL",
                photo: photoBlob
            });
        } else {
            response = await attendanceService.checkIn({
                deviceId,
                latitude,
                longitude,
                method: "MANUAL",
                photo: photoBlob
            });
        }

        let policy: UserPolicyResponse | undefined;
        const record = (response as any).data || response;
        const userId =
          record.userId ||
          record.user_id ||
          record.id ||
          record.user?.id ||
          record.student?.id;

        if (isSelfScan) {
            toast.success(isCheckedIn ? "You have checked out successfully." : "You have checked in successfully.");
            queryClient.invalidateQueries({ queryKey: ['mobile-student-roadmap'] });
            navigate("/");
            return;
        }

        if (userId) {
          try {
            const policyRes = await attendanceService.getAttendancePolicy(userId);
            policy = (policyRes as { data?: UserPolicyResponse }).data || (policyRes as unknown as UserPolicyResponse);
          } catch (e) {
            console.error("Failed to fetch policy", e);
          }
        }

        setScanResult({
          status: "success",
          message: "Attendance Recorded",
          studentName: (response as any).studentName || "Student",
          role: "kiosk",
          policy,
          attendanceStatus: (record.statusLabel || (response as any).statusLabel)?.toUpperCase(),
          record: record,
        });

        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 3000);
      } catch (error: unknown) {
        handleScanError(error);
      }
  };

  const handleScanError = (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        console.error("Scan Error:", err);

        setScanResult({
          status: "error",
          message: err.response?.data?.message || "Invalid QR Code",
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

  // -- Camera Scanner Setup --
  useEffect(() => {
    if (viewMode !== "scanner") return;

    if (!requireQrCode && !requireSelfie) return;

    isMountedRef.current = true;
    let scanner: Html5Qrcode | null = null;
    
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
          },
          (decodedText) => {
            handleScan(decodedText);
          },
          () => {}
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
    const targetId = user?.id || user?.public_id || user?.id;

    if (targetId) {
      attendanceService
        .getAttendancePolicy(targetId.toString())
        .then(async (res) => {
          const policyData = (res as { data?: UserPolicyResponse }).data || (res as unknown as UserPolicyResponse);
          
          // Apply Dynamic Teacher Schedule Override
          const isStudentUser = user?.userTypes?.includes("student");
          if (!isStudentUser) {
             const dynamicRule = policyData.rules?.find((r: any) => r.ruleType === "DYNAMIC_TEACHER_SCHEDULE");
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

          setUserPolicy(policyData);
          setPolicyError(null);
        })
        .catch((err) => {
          console.error("Failed to load user policy", err);
          setPolicyError(err.message || "Failed to load policy");
        });
    }
  }, [user]);

  useEffect(() => {
    const targetId = user?.id || user?.public_id || user?.id;
    if (targetId && targetId !== lastFetchedIdRef.current) {
        lastFetchedIdRef.current = targetId?.toString();
        fetchPolicy();
    }

    // Always request location on mount for Gate Scanner and keep tracking it
    const watchId = navigator.geolocation.watchPosition(
       (pos) => {
           setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
           setLocationError(null);
       },
       (err) => {
           console.error("Gate Scanner geolocation failed:", err);
           setLocationError(err.message);
       },
       { enableHighAccuracy: true }
    );

    return () => {
        navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsService.getSettings({ limit: 100 });
        if (res?.data) {
          const latSetting = res.data.find((s: any) => s.key === "SCHOOL_LATITUDE");
          const lngSetting = res.data.find((s: any) => s.key === "SCHOOL_LONGITUDE");
          const radiusSetting = res.data.find((s: any) => s.key === "ATTENDANCE_RADIUS");
          
          if (latSetting && lngSetting && radiusSetting) {
            const lat = parseFloat(latSetting.value);
            const lng = parseFloat(lngSetting.value);
            const radius = parseFloat(radiusSetting.value);
            
            if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius) && radius > 0) {
              setGeoSettings({ lat, lng, radius });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch geo settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  useEffect(() => {
    if (userLocation && geoSettings) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, geoSettings.lat, geoSettings.lng);
      setDistance(dist);
    }
  }, [userLocation, geoSettings]);

  const getRestrictionState = (): {
    isRestricted: boolean;
    reason: "too_early" | "too_late" | "out_of_zone" | "no_location" | null;
    message: string | null;
    openTime?: Date;
  } => {
    const requireGeo = userPolicy?.rules?.some((r: any) => r.ruleType === "REQUIRE_GEO_LOCATION" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));

    if (geoSettings && requireGeo) {
      if (!userLocation) {
        return {
          isRestricted: true,
          reason: "no_location",
          message: locationError ? "Location Denied" : "Getting Location..."
        };
      }
      if (distance !== null && distance > geoSettings.radius) {
        return {
          isRestricted: true,
          reason: "out_of_zone",
          message: `Out of Zone (${Math.round(distance)}m / ${geoSettings.radius}m)`
        };
      }
    }

    if (!userPolicy || !userPolicy.attendancePolicy)
      return { isRestricted: false, reason: null, message: null };

    const now = currentTime;
    const { startTime, endTime } = userPolicy.attendancePolicy;

    const getTimeDate = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const startDate = getTimeDate(startTime);
    const endDate = getTimeDate(endTime);

    const checkInWindowRule = userPolicy.rules?.find(
      (r) => r.ruleType === "CHECKIN_WINDOW_START_MIN"
    );
    if (checkInWindowRule) {
      const windowMinutes = Number(checkInWindowRule.ruleValue);
      const allowedStart = new Date(
        startDate.getTime() - windowMinutes * 60000
      );

      if (now < allowedStart) {
        return {
          isRestricted: true,
          reason: "too_early",
          message: null,
          openTime: allowedStart,
        };
      }
    }

    // Remove early checkout lock
    // if (userPolicy.todayStatus?.clockIn && !userPolicy.todayStatus?.clockOut) {
    //   if (now < endDate) {
    //     return {
    //       isRestricted: false,
    //       checkOutLocked: true,
    //       reason: "too_early",
    //       message: "Check-out locked",
    //       openTime: endDate,
    //     };
    //   }
    // }

    if (now > endDate && !userPolicy.todayStatus?.clockIn) {
      return {
        isRestricted: true,
        checkOutLocked: false,
        reason: "too_late",
        message: "Attendance Closed",
      };
    }

    return { isRestricted: false, checkOutLocked: false, reason: null, message: null };
  };

  const restriction = getRestrictionState();
  const isRestricted = restriction.isRestricted;

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

  // --- LANDING VIEW ---
  if (viewMode === "landing") {
    const todayStatus = userPolicy?.todayStatus;
    const isHoliday = userPolicy?.holiday?.isHoliday ?? false;

    const attendanceState: 'restricted' | 'checkedIn' | 'none' | 'holiday' | 'complete' = 
        todayStatus?.clockOut ? 'complete' :
        isHoliday ? 'holiday' :
        (todayStatus?.clockIn ? 'checkedIn' :
         (isRestricted ? 'restricted' : 'none'));

    return (
      <div className="fixed inset-0 bg-black text-white overflow-y-auto font-sans z-[1000]">
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
                
                <div className="absolute inset-x-0 top-8 flex flex-col items-center pointer-events-none">
                  <h1 className="text-3xl font-bold tracking-tight mb-1">
                    Absen Kehadiran
                  </h1>
                  <p className="text-white/50 text-sm">Select a policy to begin scanning</p>
                </div>
            </div>

          {/* Card - Centered vertically and horizontally */}
          <div className="w-full max-w-md space-y-8 mt-12 sm:mt-0">
            <div className="space-y-4">
              {userPolicy ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={
                    ["restricted", "holiday"].includes(attendanceState)
                      ? {}
                      : { scale: 1.02 }
                  }
                  whileTap={
                    ["restricted", "holiday"].includes(attendanceState)
                      ? {}
                      : { scale: 0.98 }
                  }
                  onClick={() => {
                    if (["restricted", "holiday"].includes(attendanceState) || restriction.checkOutLocked) return;
                    
                    if (requireQrCode) {
                        setViewMode("scanner");
                    } else if (requirePhotoEvidence) {
                        setPendingScanCode("MANUAL_CHECKIN");
                        setRequireSelfie(true);
                        setViewMode("scanner");
                    } else {
                        setIsConfirmModalOpen(true);
                    }
                  }}
                  className={`border rounded-2xl p-6 transition-all group relative overflow-hidden shadow-2xl ${
                    attendanceState === "restricted"
                      ? "bg-red-500/5 border-red-500/10 opacity-70 cursor-not-allowed"
                      : attendanceState === "holiday"
                      ? "bg-purple-500/10 border-purple-500/20 opacity-90 cursor-default"
                      : attendanceState === "checkedIn"
                      ? "bg-yellow-500/10 border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20"
                      : "bg-brand-500/10 border-brand-500/20 cursor-pointer hover:bg-brand-500/20"
                  }`}
                >


                  {attendanceState === "holiday" && (
                    <div className="absolute top-0 left-0 right-0 bg-purple-500/20 text-purple-300 text-center text-[10px] font-bold py-1 uppercase tracking-wider border-b border-purple-500/30 font-mono">
                      Holiday • {userPolicy.holiday?.name || "Day Off"}
                    </div>
                  )}

                  {attendanceState === "restricted" && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500/20 text-red-400 text-center text-[10px] font-bold py-1 uppercase tracking-wider border-b border-red-500/30 font-mono">
                      {restriction.reason === "too_early" && restriction.openTime ? (
                        <span>Opens in <span className="text-white">{getCountdown(restriction.openTime)}</span></span>
                      ) : (
                        restriction.message || "Restricted"
                      )}
                    </div>
                  )}

                  {attendanceState === "checkedIn" && restriction.checkOutLocked && (
                    <div className="absolute top-0 left-0 right-0 bg-yellow-500/20 text-yellow-500 text-center text-[10px] font-bold py-1 uppercase tracking-wider border-b border-yellow-500/30 font-mono">
                      Check-out opens in <span className="text-white">{restriction.openTime ? getCountdown(restriction.openTime) : '--:--'}</span>
                    </div>
                  )}

                  <div className={`flex items-start justify-between mb-6 ${["restricted", "holiday"].includes(attendanceState) ? "mt-6" : ""}`}>
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                        attendanceState === "restricted" ? "text-red-500" : "text-brand-400"
                      }`}>
                         {isHoliday ? 'Holiday' : (userPolicy.attendancePolicy?.source?.replace(/_/g, " ") || 'Unknown Policy')}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {userPolicy.userName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {userPolicy.class && (
                          <span className="text-white/50 text-sm">{userPolicy.class.name}</span>
                        )}
                        {userPolicy.studentProfile?.nis && (
                          <span className="text-xs font-mono text-white/30 px-1.5 py-0.5 bg-white/5 rounded min-w-[30px] text-center">
                            {userPolicy.studentProfile.nis}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`p-2 rounded-full transition-colors flex-shrink-0 ml-4 ${
                      attendanceState === "restricted" ? "bg-red-500/20 text-red-500" :
                      attendanceState === "holiday" ? "bg-purple-500/20 text-purple-400" :
                      attendanceState === "checkedIn" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-brand-500/20 text-brand-500"
                    }`}>
                      {attendanceState === "complete" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      ) : attendanceState === "restricted" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-black/20 rounded-xl p-4 border border-white/5">
                    {attendanceState === "holiday" ? (
                        <div className="col-span-2 text-center py-2">
                             <div className="text-purple-300 font-medium text-sm">No attendance required today</div>
                             <div className="text-white/40 text-xs mt-1">Enjoy your holiday!</div>
                        </div>
                    ) : (
                    <>
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">Clock In</span>
                      {todayStatus?.clockIn ? (
                        <span className="text-lg font-mono font-bold text-green-400">
                          {new Date(todayStatus.clockIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="text-lg font-mono font-bold text-white">
                          {userPolicy.attendancePolicy?.startTime?.slice(0, 5) || '--:--'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">Clock Out</span>
                      {todayStatus?.clockOut ? (
                        <span className="text-lg font-mono font-bold text-green-400">
                          {new Date(todayStatus.clockOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="text-lg font-mono font-bold text-white">
                          {userPolicy.attendancePolicy?.endTime?.slice(0, 5) || '--:--'}
                        </span>
                      )}
                    </div>
                    </>
                    )}
                  </div>

                  {/* Add IP & Location row */}
                  <div className="grid grid-cols-2 gap-3 mt-3 bg-black/20 rounded-xl p-4 border border-white/5">
                      <div>
                          <span className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">IP Address</span>
                          <span className="text-xs font-mono font-medium text-brand-300">{userIp || 'Loading...'}</span>
                      </div>
                      <div>
                          <span className="block text-[10px] text-white/40 uppercase tracking-wide mb-1">Location</span>
                          <span className="text-xs font-mono font-medium text-brand-300">
                              {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : 'Detecting...'}
                          </span>
                      </div>
                  </div>

                  <div className={`mt-6 flex items-center pt-4 border-t border-white/5 ${["restricted", "holiday", "complete"].includes(attendanceState) ? "justify-center" : "justify-between"}`}>
                    <span className="text-white/60 flex items-center gap-2 text-xs uppercase tracking-wide">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-400">
                            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.75A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.5V6.75A2.75 2.75 0 014.75 4h.25V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                        </svg>
                        {new Date().toLocaleDateString("en-GB", { weekday: "long" })}
                    </span>

                    {(!["restricted", "holiday", "complete"].includes(attendanceState) && !restriction.checkOutLocked) && (() => {
                        const requirePhoto = userPolicy?.rules?.some((r: any) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
                        return (
                        <span className={`text-${attendanceState === 'checkedIn' ? 'yellow' : 'brand'}-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medium text-sm`}>
                            {requireQrCode 
                              ? (attendanceState === "checkedIn" ? "Scan to Clock Out" : "Start Scanning")
                              : requirePhoto 
                                ? (attendanceState === "checkedIn" ? "Take Selfie to Clock Out" : "Take Selfie")
                                : (attendanceState === "checkedIn" ? "Tap to Clock Out" : "Check In Now")
                            } <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                        </span>
                        );
                    })()}
                    
                    {attendanceState === "checkedIn" && restriction.checkOutLocked && (
                        <span className="text-white/40 flex items-center gap-1 font-medium text-sm">
                            <LockIcon className="w-4 h-4" /> Locked until Check-Out
                        </span>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center animate-pulse">
                  <div className="w-12 h-12 bg-white/10 rounded-full mx-auto mb-4" />
                  <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                  <div className="h-3 bg-white/10 rounded w-1/2 mx-auto" />
                </div>
              )}
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
  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button 
          onClick={() => {
            if (requireSelfie && requireQrCode) {
               setRequireSelfie(false);
            } else {
               setViewMode("landing");
            }
          }}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 pointer-events-auto active:scale-95"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
        <div className="text-center pointer-events-auto">
          <h1 className="text-lg sm:text-xl font-bold text-white mb-1 tracking-tight">
            {requireSelfie ? "Take a Selfie" : "Absen Kehadiran"}
          </h1>
          <p className="text-white/70 text-xs font-medium">
            {requireSelfie ? "Position your face in the frame" : "Scan QR Code"}
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="relative w-full h-full">
        <div id="gate-reader" ref={renderRef} className="absolute inset-0 w-full h-full bg-black" />
        <style>{`
          #gate-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
          #gate-reader canvas, #gate-reader img, #gate-reader svg { display: none !important; }
          #gate-reader div { box-shadow: none !important; border: none !important; }
        `}</style>

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

        {/* Live Location Display */}
        {userLocation && (
          <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-white/90 text-xs font-mono font-medium tracking-wide">
                {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
              </span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {scanResult.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-center p-8 backdrop-blur-xl z-50 ${
              scanResult.status === "success" && scanResult.attendanceStatus === "LATE"
                ? "bg-amber-500/90"
                : scanResult.status === "success"
                ? "bg-green-500/90"
                : "bg-red-500/90"
            }`}
          >
            <div className="text-center text-white max-w-md w-full">
              {scanResult.status === "success" ? (
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                  </div>
              ) : (
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </div>
              )}
              
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">
                {scanResult.status === "success" && scanResult.attendanceStatus?.includes("LATE")
                  ? `LATE ${scanResult.record?.lateMinutes ? `BY ${scanResult.record.lateMinutes < 60 ? scanResult.record.lateMinutes + 'm' : Math.floor(scanResult.record.lateMinutes/60) + 'h ' + (scanResult.record.lateMinutes%60) + 'm'}` : 'RECORDED'}`
                  : scanResult.status === "success" && scanResult.attendanceStatus?.includes("EARLY")
                  ? `EARLY LEAVE ${scanResult.record?.earlyLeaveMinutes ? `BY ${scanResult.record.earlyLeaveMinutes < 60 ? scanResult.record.earlyLeaveMinutes + 'm' : Math.floor(scanResult.record.earlyLeaveMinutes/60) + 'h ' + (scanResult.record.earlyLeaveMinutes%60) + 'm'}` : 'RECORDED'}`
                  : scanResult.status === "success"
                  ? "SUCCESS!"
                  : "ERROR"}
              </h2>
              <p className="text-lg font-medium text-white/90 mb-8">{scanResult.message}</p>
              
              {scanResult.status === "success" && (
                  <div className="bg-black/20 rounded-2xl p-6 text-left space-y-4 backdrop-blur-md border border-white/10 shadow-2xl">
                      <div className="border-b border-white/10 pb-4">
                          <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Student</div>
                          <div className="text-xl font-bold">{scanResult.studentName}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Time</div>
                              <div className="text-lg font-mono font-medium">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div>
                              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Status</div>
                              <div className="text-lg font-bold">
                                  {scanResult.attendanceStatus || "PRESENT"}
                                  {scanResult.record?.lateMinutes > 0 && <span className="text-sm font-medium ml-1 opacity-80">(+{scanResult.record.lateMinutes < 60 ? `${scanResult.record.lateMinutes}m` : `${Math.floor(scanResult.record.lateMinutes/60)}h ${scanResult.record.lateMinutes%60}m`})</span>}
                                  {scanResult.record?.earlyLeaveMinutes > 0 && <span className="text-sm font-medium ml-1 opacity-80">(-{scanResult.record.earlyLeaveMinutes < 60 ? `${scanResult.record.earlyLeaveMinutes}m` : `${Math.floor(scanResult.record.earlyLeaveMinutes/60)}h ${scanResult.record.earlyLeaveMinutes%60}m`})</span>}
                              </div>
                          </div>
                          <div>
                              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">IP Address</div>
                              <div className="text-sm font-mono truncate">{userIp || 'Not Detected'}</div>
                          </div>
                          <div>
                              <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Location</div>
                              <div className="text-sm font-mono truncate">
                                  {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Not Detected'}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default GateScan;
