/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useSearchParams, useNavigate } from "react-router";
import { attendanceService } from "../../api/services/attendanceService";
import { useMe } from "../../api/hooks/useAuth";
import { CheckCircleIcon, ChevronLeftIcon } from "../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

const EventScanner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");

  const { data: userData } = useMe();
  const user = userData?.data;

  const [scanResult, setScanResult] = useState<{
    status: "success" | "error" | "idle";
    message?: string;
    studentName?: string;
  }>({ status: "idle" });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const lastScannedDataRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // USB Scanner Buffer
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

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
      if (isProcessing || !eventId) return;
      setIsProcessing(true);

      try {
        const now = Date.now();
        if (code === lastScannedDataRef.current && now - lastScanTimeRef.current < 3000) {
            setIsProcessing(false);
            return;
        }

        lastScannedDataRef.current = code;
        lastScanTimeRef.current = now;

        const response = await attendanceService.scanQRCode({
          qrData: code,
          eventId: eventId,
          deviceId: `admin_event_scanner_${user?.id}`
        });

        const record = response.data || response;

        setScanResult({
          status: "success",
          message: "Kehadiran Event Berhasil Dicatat",
          studentName: response.studentName || "Peserta",
        });

        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 2000);
      } catch (error: any) {
        setScanError(error?.response?.data?.message || error.message || "Gagal memindai");
        setScanResult({
          status: "error",
          message: error?.response?.data?.message || "QR Code tidak valid atau peserta belum diundang",
        });
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setScanResult({ status: "idle" });
            setIsProcessing(false);
          }
        }, 3000);
      }
    },
    [isProcessing, eventId, user]
  );

  // --- USB Scanner Listener ---
  useEffect(() => {
    isMountedRef.current = true;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (scanResult.status !== "idle" || isProcessing) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 100) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        e.preventDefault();
        const code = bufferRef.current.trim();
        if (code) {
          handleScan(code);
        }
        bufferRef.current = "";
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleScan, scanResult.status, isProcessing]);

  // --- HTML5 QR Camera Setup ---
  useEffect(() => {
    if (!renderRef.current) return;

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("event-reader");
    }

    const startScanner = async () => {
      try {
        if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop();
        }
        
        await scannerRef.current?.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            handleScan(decodedText);
          },
          (errorMessage) => {
            // Ignore normal read errors
          }
        );
        setScanError(null);
      } catch (err) {
        console.error("Failed to start camera", err);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [handleScan]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-6 left-6 z-50">
        <button
          onClick={() => navigate(-1)}
          className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="text-center z-10 mb-8 mt-12 px-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400 mb-4 tracking-tight drop-shadow-sm">
          Event Scanner
        </h1>
        <p className="text-slate-300 text-lg sm:text-xl font-medium max-w-md mx-auto leading-relaxed">
          Arahkan kamera ke QR Code peserta untuk mencatat kehadiran event.
        </p>
      </div>

      <div className="relative w-full max-w-[320px] aspect-square z-10">
        <div className="absolute -inset-4 bg-gradient-to-br from-brand-500/30 to-purple-500/30 rounded-3xl blur-xl animate-pulse z-0"></div>
        <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div id="event-reader" ref={renderRef} className="w-full h-full [&>video]:object-cover" />
        </div>
      </div>

      <AnimatePresence>
        {scanResult.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 flex items-center justify-center p-8 backdrop-blur-xl z-50 ${
              scanResult.status === "success"
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
                {scanResult.status === "success" ? "BERHASIL!" : "GAGAL"}
              </h2>
              <p className="text-lg font-medium text-white/90 mb-8">{scanResult.message}</p>
              
              {scanResult.status === "success" && (
                  <div className="bg-black/20 rounded-2xl p-6 text-left space-y-4 backdrop-blur-md border border-white/10 shadow-2xl">
                      <div className="border-b border-white/10 pb-4">
                          <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Peserta</div>
                          <div className="text-xl font-bold">{scanResult.studentName}</div>
                      </div>
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventScanner;
