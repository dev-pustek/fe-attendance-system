import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router";
import { attendanceService } from "../../../api/services/attendanceService";
import { settingsService } from "../../../api/services/settingsService";
import { UserPolicyResponse } from "../../../api/types/attendance";
import {
  ChevronLeftIcon,
} from "../../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuthStore } from "../../../store/authStore";
import { createPortal } from "react-dom";

const GateScan = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isStudent = user?.userTypes?.includes("student") || false;

  const [scanResult, setScanResult] = useState<{
    status: "success" | "error" | "idle";
    message?: string;
    studentName?: string;
    role?: string;
    policy?: UserPolicyResponse;
    attendanceStatus?: string;
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
  const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);
  const lastScannedDataRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

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
        const deviceId = isStudent ? `mobile_${user?.id}` : "gate_kiosk_1";

        // Cooldown Check: Prevent scanning the same code within 5 seconds
        const now = Date.now();
        if (code === lastScannedDataRef.current && now - lastScanTimeRef.current < 5000) {
            setIsProcessing(false);
            return;
        }

        lastScannedDataRef.current = code;
        lastScanTimeRef.current = now;

        // First, check policy for this specific user code
        let needsPhoto = false;
        try {
            const validLocations = ['SCHOOL_ENTRY', 'GATE_1', 'GATE_2'];
            let policyTargetId = code;
            
            // If scanning a location code (Mode A), use the logged-in student's ID
            if (validLocations.includes(code)) {
                policyTargetId = user?.id || user?.public_id || "";
            }

            if (policyTargetId) {
                const policyRes = await attendanceService.getAttendancePolicy(policyTargetId);
                const policyData = (policyRes as any).data || policyRes;
                needsPhoto = policyData?.rules?.some((r: any) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
            }
        } catch (e) {
            console.error("Failed to fetch policy before scan", e);
        }

        if (needsPhoto) {
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
    [isProcessing, isStudent, user, requireSelfie, pendingScanCode] // submitScan and handleScanError don't change
  );

  const submitScan = async (code: string, explicitPhoto?: string) => {
      try {
        const deviceId = isStudent ? `mobile_${user?.id}` : "gate_kiosk_1";
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
          message: isStudent
            ? "You have checked in successfully."
            : "Attendance Recorded",
          studentName:
            response.studentName || (isStudent ? user?.name : "Student"),
          role: isStudent ? "self" : "kiosk",
          policy,
          attendanceStatus: record.status || response.status,
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
                    const vidWidth = videoEl.videoWidth || 640;
                    const vidHeight = videoEl.videoHeight || 480;
                    const size = Math.min(vidWidth, vidHeight);
                    const startX = (vidWidth - size) / 2;
                    const startY = (vidHeight - size) / 2;
                    
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                        // Crop center square to match UI cutout
                        ctx.drawImage(videoEl, startX, startY, size, size, 0, 0, size, size);
                        // Using WebP for superior compression and smaller payload size compared to JPEG
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

        await submitScan(pendingScanCode, photoEvidence);
        setRequireSelfie(false);
        setPendingScanCode(null);
  };

  // -- Camera Scanner Setup --
  useEffect(() => {
    if (viewMode !== "scanner") return;

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
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0,
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
        .then((res) => {
          const policyData = (res as { data?: UserPolicyResponse }).data || (res as unknown as UserPolicyResponse);
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
    if (geoSettings) {
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

    if (now > endDate && !userPolicy.todayStatus?.clockIn) {
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

    const attendanceState: 'complete' | 'restricted' | 'checkedIn' | 'none' | 'holiday' = 
        isHoliday ? 'holiday' :
        todayStatus?.clockIn && todayStatus?.clockOut ? 'complete' :
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
                    Gate Scanner
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
                    ["complete", "restricted", "holiday"].includes(attendanceState)
                      ? {}
                      : { scale: 1.02 }
                  }
                  whileTap={
                    ["complete", "restricted", "holiday"].includes(attendanceState)
                      ? {}
                      : { scale: 0.98 }
                  }
                  onClick={() => {
                    if (["complete", "restricted", "holiday"].includes(attendanceState)) return;
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
                      {restriction.reason === "too_early" && restriction.openTime ? (
                        <span>Opens in <span className="text-white">{getCountdown(restriction.openTime)}</span></span>
                      ) : (
                        restriction.message || "Restricted"
                      )}
                    </div>
                  )}

                  <div className={`flex items-start justify-between mb-6 ${["complete", "restricted", "holiday"].includes(attendanceState) ? "mt-6" : ""}`}>
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                        attendanceState === "checkedIn" ? "text-yellow-500" : 
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
                      attendanceState === "complete" ? "bg-green-500/20 text-green-500" :
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

                  <div className={`mt-6 flex items-center pt-4 border-t border-white/5 ${["complete", "restricted", "holiday"].includes(attendanceState) ? "justify-center" : "justify-between"}`}>
                    <span className="text-white/60 flex items-center gap-2 text-xs uppercase tracking-wide">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-400">
                            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.75A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.5V6.75A2.75 2.75 0 014.75 4h.25V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                        </svg>
                        {new Date().toLocaleDateString("en-GB", { weekday: "long" })}
                    </span>

                    {!["complete", "restricted", "holiday"].includes(attendanceState) && (
                        <span className={`text-${attendanceState === 'checkedIn' ? 'yellow' : 'brand'}-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-medium text-sm`}>
                            {attendanceState === "checkedIn" ? "Scan to Clock Out" : "Start Scanning"} <ChevronLeftIcon className="w-4 h-4 rotate-180" />
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
      </div>
    );
  }

  // --- SCANNER VIEW ---
  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => setViewMode("landing")}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight">Gate Scanner</h1>
          <p className="text-white/70 text-sm font-medium">Scan QR Code</p>
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
        <div className="absolute inset-0 bg-black/40 z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] rounded-3xl" />
        </div>

        {/* Custom Green Corner Frames Only (Hide during selfie) */}
        {!requireSelfie && (
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

        {/* Selfie Capture Overlay */}
        {requireSelfie && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto">
                <div className="absolute top-24 left-0 right-0 text-center z-50">
                    <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Take a Selfie</h2>
                    <p className="text-white/80">Position your face in the circle</p>
                </div>
                
                {/* Circular cutout */}
                <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full border-4 border-brand-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] z-40 relative">
                    {/* inner glow */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
                </div>

                <button 
                onClick={handleTakePhoto}
                disabled={isProcessing}
                className="absolute bottom-24 w-20 h-20 bg-brand-500 rounded-full border-4 border-white/30 flex items-center justify-center shadow-2xl active:scale-95 transition-transform z-50 disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                </button>
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
            <div className="text-center text-white">
              <h2 className="text-4xl font-extrabold mb-4">
                {scanResult.status === "success" && scanResult.attendanceStatus === "LATE"
                  ? "LATE RECORDED"
                  : scanResult.status === "success"
                  ? "SUCCESS"
                  : "ERROR"}
              </h2>
              <p className="text-xl font-medium">{scanResult.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default GateScan;
