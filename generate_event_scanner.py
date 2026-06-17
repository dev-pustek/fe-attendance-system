import re

content = """/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate, useSearchParams } from "react-router";
import { attendanceService } from "../../api/services/attendanceService";
import {
  ChevronLeftIcon,
  CheckCircleIcon,
} from "../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";

const EventScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [scanResult, setScanResult] = useState<{
    status: "success" | "error" | "idle";
    message?: string;
    studentName?: string;
    attendanceStatus?: string;
  }>({ status: "idle" });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("environment");
  
  const lastScannedDataRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Camera Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!eventId) {
      toast.error("Event ID is missing");
      navigate("/events");
    }
  }, [eventId, navigate]);

  const handleScan = useCallback(
    async (code: string) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const deviceId = `event_scanner_${user?.id}`;

        // Cooldown Check: Prevent scanning the same code within 5 seconds
        const now = Date.now();
        if (code === lastScannedDataRef.current && now - lastScanTimeRef.current < 5000) {
            setIsProcessing(false);
            return;
        }

        lastScannedDataRef.current = code;
        lastScanTimeRef.current = now;

        const response = await attendanceService.scanQRCode({
          qrData: code,
          deviceId,
          eventId: eventId || undefined,
        }) as any;

        const record = response.data || response;

        setScanResult({
          status: "success",
          message: "Event Attendance Success",
          studentName: record.studentName || record.user?.name || "Student",
          attendanceStatus: record.status || "Hadir",
        });

        toast.success(`Success: ${record.studentName || record.user?.name || "Student"} attendance recorded!`);

        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 3000);
      } catch (error: any) {
        setScanResult({
          status: "error",
          message: error.response?.data?.message || error.message || "Invalid QR Code or already scanned",
        });
        toast.error("Failed to record attendance");

        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 3000);
      }
    },
    [isProcessing, user, eventId]
  );

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
          .catch((err) => console.error("Failed to stop scanner", err));
      }
    };
  }, [handleScan, cameraFacingMode]);

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] bg-black text-white relative overflow-hidden">
      {/* Top Navigation */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors backdrop-blur-md"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <span className="font-semibold tracking-wide drop-shadow-md">
          Event Scanner
        </span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {scanError ? (
          <div className="p-8 text-center space-y-4 max-w-sm w-full mx-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white font-medium">{scanError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2.5 bg-white text-black font-semibold rounded-xl w-full hover:bg-gray-100 transition-colors active:scale-95"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
            <div
              id="qr-reader"
              ref={renderRef}
              className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            />
            {/* Camera Frame Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[40px] sm:border-[80px] border-black/50" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] pointer-events-none"
            >
                {/* Scanner corners */}
                <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-brand-500 rounded-tl-2xl pointer-events-none" />
                <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-brand-500 rounded-tr-2xl pointer-events-none" />
                <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-brand-500 rounded-bl-2xl pointer-events-none" />
                <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-brand-500 rounded-br-2xl pointer-events-none" />
                
                {/* Scanner line animation */}
                <motion.div
                    animate={{
                        top: ["0%", "100%", "0%"],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_8px_rgba(236,72,153,1)] z-10"
                />
            </motion.div>

            {/* Controls Container */}
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-12 w-full max-w-[320px] flex justify-center items-center z-50"
            >
                <button
                    onClick={() => setCameraFacingMode(prev => prev === "user" ? "environment" : "user")}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/20 active:scale-95 shadow-xl"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </motion.div>
          </div>
        )}

        {/* Status Overlays */}
        <AnimatePresence mode="wait">
          {scanResult.status !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <div
                className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden ${
                  scanResult.status === "success"
                    ? "bg-gradient-to-b from-success-500/20 to-black border border-success-500/30"
                    : "bg-gradient-to-b from-error-500/20 to-black border border-error-500/30"
                }`}
              >
                {/* Decorative background blur */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 ${
                    scanResult.status === "success" ? "bg-success-500" : "bg-error-500"
                }`} />

                {scanResult.status === "success" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-20 h-20 bg-success-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_32px_rgba(34,197,94,0.4)]"
                  >
                    <CheckCircleIcon className="w-10 h-10 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-20 h-20 bg-error-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_32px_rgba(239,68,68,0.4)]"
                  >
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.div>
                )}
                
                <h2 className="text-2xl font-bold text-white mb-2">
                  {scanResult.status === "success" ? "Success!" : "Failed"}
                </h2>
                <p className="text-gray-300 mb-6 text-sm">
                  {scanResult.message}
                </p>

                {scanResult.status === "success" && (
                    <div className="w-full bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Student</p>
                        <p className="text-lg font-bold text-white truncate">{scanResult.studentName}</p>
                    </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventScanner;
"""
with open('src/pages/Events/EventScanner.tsx', 'w') as f:
    f.write(content)

