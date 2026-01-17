import React, { useState, useEffect, useMemo } from "react";
import { useDevices } from "../../api/hooks/useDevices";
import CctvPlayer from "../../components/atoms/CctvPlayer";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { VideoIcon, GridIcon, CloseIcon, EyeIcon } from "../../components/atoms/Icons";

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CctvDashboard: React.FC = () => {
  const { data: response, isLoading, isError } = useDevices({
    isActive: true,
    limit: 50,
  });
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [deviceRefreshKeys, setDeviceRefreshKeys] = useState<Record<string, number>>({});

  const activeDevices = useMemo(() => {
    return Array.isArray(response) ? response : (response?.data || []);
  }, [response]);

  const handleRefresh = (id?: string) => {
    if (id) {
       setDeviceRefreshKeys(prev => ({
          ...prev,
          [id]: (prev[id] || 0) + 1
       }));
    } else {
       setDeviceRefreshKeys(prev => {
          const newKeys = { ...prev };
          activeDevices.forEach(d => {
             newKeys[d.public_id] = (newKeys[d.public_id] || 0) + 1;
          });
          return newKeys;
       });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedId) {
        setFocusedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId]);

  return (
    <>
      <PageMeta title="Live Monitoring | Sistem Absen" description="Real-time CCTV surveillance feed dashboard" />
      <PageBreadcrumb pageTitle="Live Monitoring" />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live CCTV Monitoring</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Real-time surveillance feed from all active camera devices.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleRefresh()}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              title="Reload all streams"
            >
              <RefreshIcon className="w-4 h-4" />
              Refresh All
            </button>
            <button className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-500 transition hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.05]" title="Grid View">
              <GridIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-500/20 dark:bg-green-500/10">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">System Status</p>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
            <VideoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Active Cameras</p>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{activeDevices.length} Device{activeDevices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-500/20 dark:bg-purple-500/10">
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            </div>
            <div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Stream Quality</p>
              <p className="text-sm font-bold text-purple-700 dark:text-purple-300">HD Live</p>
            </div>
          </div>
        </div>

        {/* Camera Grid */}
        {isLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                 <div key={i} className="aspect-video bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse"></div>
              ))}
           </div>
        ) : isError ? (
           <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-400 mb-4">
                 <VideoIcon className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Failed to load cameras</h3>
              <p className="text-gray-500 max-w-sm mt-2">Unable to fetch the active device list. Please check your network connection.</p>
           </div>
        ) : activeDevices.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full text-gray-400 mb-4">
                 <VideoIcon className="w-10 h-10 opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Active Cameras</h3>
              <p className="text-gray-500 max-w-sm mt-2">There are no devices currently marked as active in the system.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
              {activeDevices.map((device) => {
                 const isFocused = focusedId === device.public_id;
                 const refreshKey = deviceRefreshKeys[device.public_id] || 0;
                 return (
                 <React.Fragment key={`${device.public_id}-${refreshKey}`}>
                    {isFocused && <div className="aspect-video rounded-xl bg-gray-900/10 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10" />}
                    
                    <div 
                      className={`
                        transition-all duration-300 ease-in-out overflow-hidden
                        ${isFocused 
                           ? "fixed inset-0 z-[999999] flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-gray-950" 
                           : "group relative cursor-pointer ring-offset-2 ring-brand-500 hover:ring-2 rounded-xl bg-gray-100 dark:bg-gray-900"
                        }
                      `}
                      onClick={() => !isFocused && setFocusedId(device.public_id)}
                    >
                        {isFocused && (
                           <div className="absolute top-0 left-0 right-0 z-[110] p-4 md:p-6 flex justify-between items-start pointer-events-none">
                               <div className="pointer-events-auto bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/10 p-4 rounded-2xl flex items-center justify-between w-full max-w-5xl mx-auto shadow-2xl">
                                   <div>
                                       <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                          {device.deviceName}
                                          <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-red-500 text-white">Live</span>
                                       </h2>
                                       <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                          {device.location || 'Unknown Location'}
                                       </p>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <button 
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             handleRefresh(device.public_id);
                                         }}
                                          className="p-3 bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/15 backdrop-blur-md rounded-xl text-gray-900 dark:text-white transition-all hover:scale-105 border border-white/20 dark:border-white/10 shadow-sm"
                                          title="Refresh Stream"
                                       >
                                           <RefreshIcon className="w-5 h-5" />
                                       </button>
                                       <button 
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             setFocusedId(null);
                                         }}
                                         className="p-3 bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/15 backdrop-blur-md rounded-xl text-gray-900 dark:text-white transition-all hover:scale-105 border border-white/20 dark:border-white/10 shadow-sm group/close"
                                         title="Close View (ESC)"
                                       >
                                           <CloseIcon className="w-5 h-5 group-hover/close:rotate-90 transition-transform duration-300" />
                                       </button>
                                   </div>
                               </div>
                           </div>
                        )}

                        <div className={isFocused ? "w-full h-full relative" : "w-full"}>
                             <CctvPlayer
                                publicId={device.public_id}
                                deviceName={device.deviceName}
                                aspectRatio={isFocused ? "none" : "16/9"}
                                className={isFocused ? "h-full w-full" : ""}
                                imgClassName={isFocused ? "object-contain bg-gray-50 dark:bg-black" : "object-cover"}
                             />
                        </div>

                        {!isFocused && (
                            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-xl pointer-events-none">
                                <div 
                                  className="bg-white/80 dark:bg-white/20 backdrop-blur-md p-3 rounded-full text-gray-900 dark:text-white shadow-lg pointer-events-auto hover:scale-110 transition-transform cursor-pointer relative z-20" 
                                  title="View Fullscreen" 
                                  onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setFocusedId(device.public_id);
                                  }}
                                >
                                   <EyeIcon className="w-6 h-6" />
                                </div>
                                <div 
                                    className="bg-white/80 dark:bg-white/20 backdrop-blur-md p-3 rounded-full text-gray-900 dark:text-white shadow-lg pointer-events-auto hover:scale-110 transition-transform cursor-pointer relative z-20" 
                                    title="Refresh Stream"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRefresh(device.public_id);
                                    }}
                                >
                                   <RefreshIcon className="w-6 h-6" />
                                </div>
                            </div>
                        )}
                    </div>
                 </React.Fragment>
                 );
              })}
           </div>
        )}
      </div>
    </>
  );
};

export default CctvDashboard;
