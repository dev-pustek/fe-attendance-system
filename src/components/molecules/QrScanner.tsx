import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Button from "../atoms/Button";
import { VideoIcon } from "../atoms/Icons";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  className?: string;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess, onScanError, className = "" }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "qr-reader-container";

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(regionId);
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 320, height: 200 },
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          onScanError?.(errorMessage);
        }
      );
      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      console.error("Scanner start error:", err);
      setHasPermission(false);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Scanner stop error:", err);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div 
        id={regionId} 
        className={`overflow-hidden rounded-2xl bg-gray-900 shadow-inner transition-all duration-500 ease-out ${
          isScanning ? "aspect-video w-full" : "h-0"
        }`}
      />
      
      {!isScanning ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="size-16 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 mb-4 animate-pulse">
            <VideoIcon className="size-8" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-xs">
            {hasPermission === false 
              ? "Camera permission denied. Please allow camera access in your browser settings."
              : "Ready to scan student cards or QR codes for immediate attendance."}
          </p>
          <Button 
            variant="primary" 
            onClick={startScanner}
            startIcon={<VideoIcon className="size-4" />}
          >
            Start Camera Scanner
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
            <Button variant="outline" onClick={stopScanner}>
                Stop Scanner
            </Button>
        </div>
      )}
    </div>
  );
};

export default QrScanner;
