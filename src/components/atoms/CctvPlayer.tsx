import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { API_BASE_URL } from "../../api/client";
import { ErrorIcon, ArrowRightIcon } from "./Icons";

interface CctvPlayerProps {
  publicId: string;
  deviceName: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "none";
  className?: string;
  imgClassName?: string;
}

const CctvPlayer: React.FC<CctvPlayerProps> = ({
  publicId,
  deviceName,
  aspectRatio = "16/9",
  className = "",
  imgClassName = "",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [timestamp] = useState(Date.now());
  const { accessToken } = useAuthStore();

  // Use stable timestamp to prevent re-connections on every render, only change on retry
  const streamUrl = `${API_BASE_URL}/devices/${publicId}/stream?token=${accessToken}&_t=${timestamp + retryKey}`;

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryKey((prev) => prev + 1);
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "4/3":
        return "aspect-[4/3]";
      case "1/1":
        return "aspect-square";
      case "none":
        return "";
      case "16/9":
      default:
        return "aspect-video";
    }
  };

  React.useEffect(() => {
    console.log(`[CctvPlayer] Mounting stream: ${streamUrl}`);
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn(
          `[CctvPlayer] Loading timeout (5s) for ${streamUrl}. Forcing display.`
        );
        setIsLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [streamUrl, isLoading]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-lg ${getAspectRatioClass()} ${className}`}
      style={{ minHeight: '200px' }}
    >
      {/* Loading Skeleton (Background) */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 animate-pulse z-0">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              INITIALIZING STREAM...
            </span>
          </div>
        </div>
      )}

      {/* Stream Image */}
      {!hasError && (
        <img
          key={retryKey}
          src={streamUrl}
          alt={`Live feed from ${deviceName}`}
          className={`relative z-10 h-full w-full object-cover transition-opacity duration-300 min-h-full ${imgClassName}`}
          onLoad={() => {
            console.log(`[CctvPlayer] Loaded: ${streamUrl}`);
            setIsLoading(false);
          }}
          onError={(e) => {
            console.error(`[CctvPlayer] Error loading: ${streamUrl}`, e);
            console.error(e.currentTarget.src)
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}

      {/* Error State (Overlay) */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3 text-center p-4">
            <div className="p-3 bg-red-500/10 rounded-full text-red-500">
              <ErrorIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-200">Signal Lost</p>
              <p className="text-xs text-gray-500 mt-1">
                Unable to connect to camera feed
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <ArrowRightIcon className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-transparent to-transparent dark:from-black/80 dark:to-transparent flex justify-between items-start z-30">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${
                hasError ? "bg-red-500" : "bg-green-500"
              } opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                hasError ? "bg-red-600" : "bg-green-500"
              }`}
            ></span>
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white tracking-wider uppercase font-mono">
            {hasError ? "OFFLINE" : "LIVE"}
          </span>
        </div>
        <div className="px-2 py-0.5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded text-[10px] font-mono text-gray-900 dark:text-white/80 border border-gray-200/50 dark:border-white/10">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent z-30">
        <p className="text-sm font-semibold text-white font-mono truncate">
          {deviceName}
        </p>
      </div>
    </div>
  );
};

export default CctvPlayer;
