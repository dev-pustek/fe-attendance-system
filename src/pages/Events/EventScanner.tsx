/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate, useSearchParams } from "react-router";
import { attendanceService } from "../../api/services/attendanceService";
import { settingsService } from "../../api/services/settingsService";
import { UserPolicyResponse } from "../../api/types/attendance";
import {
  ChevronLeftIcon,
  LockIcon,
} from "../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { useAttendanceRules } from "../../api/hooks/useRules";
import { useEvent } from "../../api/hooks/useEvents";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Modal } from "../../components/molecules/Modal";
import Button from "../../components/atoms/Button";

const EventScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { data: event } = useEvent(eventId || "");

  useEffect(() => {
    if (!eventId) {
      toast.error("Event ID is missing");
      navigate("/events");
    }
  }, [eventId, navigate]);

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
  
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
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

  const requireQrCode = true;

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
        const deviceId = isSelfScan ? `mobile_${user?.id}` : `event_scanner_${user?.id || 'kiosk'}`;

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
        const deviceId = isSelfScan ? `mobile_${user?.id}` : `event_scanner_${user?.id || 'kiosk'}`;
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
          photoEvidence: explicitPhoto,
          eventId: eventId || undefined
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
          message: "Kehadiran Tercatat",
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
        const deviceId = isSelfScan ? `mobile_${user?.id}` : `event_scanner_${user?.id || 'kiosk'}`;
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
                photo: photoBlob,
                eventId: eventId || undefined
            });
        } else {
            response = await attendanceService.checkIn({
                deviceId,
                latitude,
                longitude,
                method: "MANUAL",
                photo: photoBlob,
                eventId: eventId || undefined
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
          message: "Kehadiran Tercatat",
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
                        const isMirrored = cameraFacingMode === "user";
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
    

    isMountedRef.current = true;
    let scanner: Html5Qrcode | null = null;
    
    const initTimer = setTimeout(async () => {
      if (!renderRef.current) return;
      const elementId = renderRef.current.id;

      try {
        scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: cameraFacingMode },
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
  }, [handleScan, cameraFacingMode]);

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

    // Always request location on mount for Event Scanner and keep tracking it
    const watchId = navigator.geolocation.watchPosition(
       (pos) => {
           setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
           setLocationError(null);
       },
       (err) => {
           console.error("Event Scanner geolocation failed:", err);
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
    const { startTime, endTime, baseStartTime } = userPolicy.attendancePolicy;

    const getTimeDate = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const startDate = getTimeDate(baseStartTime || startTime);
    const endDate = getTimeDate(endTime);

    const checkInWindowRule = userPolicy.rules?.find(
      (r: any) => r.ruleType === "CHECKIN_WINDOW_START_MIN"
    );
    if (checkInWindowRule) {
      const windowMinutes = Number(checkInWindowRule.ruleValue);
      let allowedStart: Date;
      
      if (windowMinutes === 0) {
        allowedStart = new Date(startDate.getTime());
        allowedStart.setHours(0, 0, 0, 0);
      } else {
        allowedStart = new Date(startDate.getTime() - windowMinutes * 60000);
      }

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
        message: "Kehadiran Ditutup",
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

  // --- SCANNER VIEW ---
  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button 
          onClick={() => navigate("/events")}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 pointer-events-auto active:scale-95"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
        <div className="text-center pointer-events-auto">
          <h1 className="text-lg sm:text-xl font-bold text-white mb-1 tracking-tight">
            {requireSelfie ? "Take a Selfie" : "Scan Event QR"}
          </h1>
          <p className="text-white/70 text-xs font-medium">
            {requireSelfie ? "Position your face in the frame" : (event ? event.name : "Scan QR Code to attend")}
          </p>
        </div>
        <button
          onClick={() => setCameraFacingMode(prev => prev === "user" ? "environment" : "user")}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10 pointer-events-auto active:scale-95"
          title="Switch Camera"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      <div className="relative w-full h-full">
        <div id="gate-reader" ref={renderRef} className="absolute inset-0 w-full h-full bg-black" />
        <style>{`
          #gate-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; ${cameraFacingMode === 'user' ? 'transform: scaleX(-1);' : ''} }
          #gate-reader canvas, #gate-reader img, #gate-reader svg { display: none !important; }
          #gate-reader div { box-shadow: none !important; border: none !important; }
        `}</style>

        {/* Adjust darkness: Reduced shadow alpha for clearer view */}
        {!requireSelfie && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
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

                {/* Controls Container */}
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mt-8 w-full max-w-[320px] grid grid-cols-3 items-center z-50"
                >
                    <div className="flex justify-center">
                        {/* Empty space to balance grid */}
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={handleTakePhoto}
                            disabled={isProcessing}
                            className="w-[72px] h-[72px] rounded-full border-[3px] border-white p-1 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                        >
                            <div className="w-full h-full bg-white rounded-full" />
                        </button>
                    </div>

                    <div className="flex justify-center">
                        {/* Empty space to balance the grid and keep the camera button perfectly centered */}
                    </div>
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

        {/* Event Info Display */}
        {event && (
          <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-lg flex flex-col items-center gap-1 max-w-[80%]">
              <span className="text-white font-bold text-sm text-center truncate w-full">
                {event.name}
              </span>
              <span className="text-white/70 text-xs font-medium text-center truncate w-full">
                {event.location || "No Location Specified"}
              </span>
            </div>
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
                  ? `TERLAMBAT ${scanResult.record?.lateMinutes ? `${scanResult.record.lateMinutes < 60 ? scanResult.record.lateMinutes + 'm' : Math.floor(scanResult.record.lateMinutes/60) + 'j ' + (scanResult.record.lateMinutes%60) + 'm'}` : 'TERCATAT'}`
                  : scanResult.status === "success" && scanResult.attendanceStatus?.includes("EARLY")
                  ? `PULANG CEPAT ${scanResult.record?.earlyLeaveMinutes ? `${scanResult.record.earlyLeaveMinutes < 60 ? scanResult.record.earlyLeaveMinutes + 'm' : Math.floor(scanResult.record.earlyLeaveMinutes/60) + 'j ' + (scanResult.record.earlyLeaveMinutes%60) + 'm'}` : 'TERCATAT'}`
                  : scanResult.status === "success"
                  ? "BERHASIL!"
                  : "KESALAHAN"}
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
                              </div>
                              <div className="text-right">
                                  <div className="text-white font-bold">{scanResult.record?.clockOut ? format(parseISO(scanResult.record.clockOut), "HH:mm") : "--:--"}</div>
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

export default EventScanner;
