import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useStudentTodaySchedule } from '../../../api/hooks/useAttendance';
import { TodayScheduleItem } from '../../../api/types/attendance';
import { attendanceService } from '../../../api/services/attendanceService';
import PageMeta from '../../../components/atoms/PageMeta';
import PageBreadcrumb from '../../../components/molecules/PageBreadcrumb';
import { 
    CheckCircleIcon, 
    QrCodeIcon 
} from '@heroicons/react/24/outline';
import Button from '../../../components/atoms/Button';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';

const StudentSchedule = () => {
    const { user } = useAuthStore();
    const { data: schedule, isLoading, refetch } = useStudentTodaySchedule(user?.public_id);
    
    // Scanning State
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TodayScheduleItem | null>(null);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
    const [scanMessage, setScanMessage] = useState<string | null>(null);

    // Semaphore to prevent double scanning
    const isProcessingScanRef = useRef(false);

    // --- Actions ---
    const handleCheckIn = (item: TodayScheduleItem) => {
        setSelectedSession(item);
        setScanStatus('idle');
        setScanMessage(null);
        isProcessingScanRef.current = false;
        setIsScanModalOpen(true);
    };

    const handleScanSuccess = useCallback(async (decodedText: string) => {
        // Double check both state and ref
        if (isProcessingScanRef.current || scanStatus === 'verifying' || scanStatus === 'success') return;
        
        isProcessingScanRef.current = true;
        
        try {
            setScanStatus('verifying');
            setScanMessage("Verifying session...");

            // 1. Parse QR Data
            let qrData: { sessionId: string | number; [key: string]: unknown };
            try {
                qrData = JSON.parse(decodedText);
            } catch {
                throw new Error("Invalid QR Code format.");
            }

            // 2. Validate Session Match
            if (String(qrData.sessionId) !== String(selectedSession?.sessionId)) { 
                 throw new Error(`Wrong Session! You scanned ${qrData.sessionId}, but selected ${selectedSession?.sessionId}`);
            }

            // 3. Submit Attendance
            // User Spec: POST /attendance/subject-attendances
            // Payload: { teachingSessionId, studentId, status: "present", method: "qr" }
            const payload = {
                teachingSessionId: qrData.sessionId, // Depending on if QR has 'sessionId' or 'teachingSessionId'
                studentId: user?.public_id || "",
                status: "present" as const,
                method: "qr" as const
            };

            await attendanceService.createSubjectAttendance(payload);

            setScanStatus('success');
            setScanMessage("Check-in Successful!");
            toast.success("You have successfully checked in!");
            
            // Close after delay & refresh
            setTimeout(() => {
                setIsScanModalOpen(false);
                refetch();
                setScanStatus('idle');
                isProcessingScanRef.current = false;
            }, 2000);

        } catch (error: unknown) {
            console.error(error);
            setScanStatus('error');
            const errorMessage = error instanceof Error ? error.message : "Failed to verify check-in.";
            setScanMessage(errorMessage);
            isProcessingScanRef.current = false; // Allow retry
        }
    }, [scanStatus, selectedSession, user?.public_id, refetch]);

    // Fix missing dependency or use ref
    const handleScanSuccessRef = useRef(handleScanSuccess);
    useEffect(() => {
        handleScanSuccessRef.current = handleScanSuccess;
    }, [handleScanSuccess]);


    // Helper to safely parse time strings (e.g. "07:00:00" or ISO timestamps)
    const parseTime = (timeStr: string) => {
        if (!timeStr) return new Date();
        // If it matches HH:mm:ss format, append today's date
        if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(timeStr)) {
            const today = new Date();
            const [hours, minutes] = timeStr.split(':');
            const date = new Date(today);
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return date;
        }
        return new Date(timeStr);
    };

    // --- Card Component ---
    const SessionCard = ({ item }: { item: TodayScheduleItem }) => {
        const isCompleted = item.status === 'COMPLETED' || item.isCompleted || item.sessionStatus === 'COMPLETED';
        const isOngoing = item.sessionStatus === 'ONGOING';
        const startTime = parseTime(item.startTime);
        const endTime = parseTime(item.endTime);
        
        // Attendance Status from API
        const myStatus = item.myAttendanceStatus?.toLowerCase();
        const isPresent = myStatus === 'present' || myStatus === 'late';
        const attendanceTime = item.myAttendanceTime ? new Date(item.myAttendanceTime) : null;

        // Calculate Duration
        const diffMinutes = differenceInMinutes(endTime, startTime);
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const durationString = `${hours > 0 ? `${hours} hr ` : ''}${mins > 0 ? `${mins} min` : ''}`.trim();

        // Data Accessors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawItem = item as any;
        const teacherName = item.teacherName || rawItem.session?.actualTeacher?.name || rawItem.template?.defaultTeacher?.name || 'No Teacher Assigned';
        const classCode = rawItem.session?.classSubject?.class?.code || rawItem.template?.classSubject?.class?.code || item.className; 
        
        // Card Styling Logic
        let cardStyles = "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10";
        if (isPresent) {
            cardStyles = "bg-green-50/30 border-green-200 dark:bg-green-900/10 dark:border-green-500/20";
        } else if (isOngoing) {
             cardStyles = "bg-gradient-to-br from-white to-brand-50 border-brand-200 dark:from-white/5 dark:to-brand-900/20 dark:border-brand-500/30 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/20";
        } else if (isCompleted) {
             cardStyles = "bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/5 opacity-70 grayscale-[0.8]";
        }

        return (
            <div className={`relative h-full flex flex-col rounded-2xl border transition-all duration-300 group hover:shadow-xl overflow-hidden ${cardStyles}`}>
                
                {/* Decorative Status Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isPresent ? "bg-green-500" :
                    isOngoing ? "bg-brand-500 animate-pulse" :
                    isCompleted ? "bg-gray-300 dark:bg-white/20" :
                    "bg-transparent"
                }`} />

                <div className="p-5 flex-1 flex flex-col relative">
                    {/* Header: Class & Status */}
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                {classCode}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md w-fit ${
                                isPresent ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                isOngoing ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400" :
                                isCompleted ? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400" :
                                "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                            }`}>
                                {isPresent ? "Present" : 
                                 isOngoing ? "Happening Now" : 
                                 isCompleted ? "Finished" : "Scheduled"}
                            </span>
                         </div>
                         
                         {/* Attendance Badge (Icon) */}
                         {isPresent && (
                            <div className="size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 flex items-center justify-center shadow-sm">
                                <CheckCircleIcon className="size-5" />
                            </div>
                         )}
                    </div>

                    {/* Subject Title */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
                        {item.subjectName}
                    </h3>
                        
                    {/* Teacher Info */}
                     <div className="flex items-center gap-2 mb-6 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        <div className="size-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase">
                            {teacherName.charAt(0)}
                        </div>
                        <span className="truncate">{teacherName}</span> 
                    </div>

                    {/* Time Grid */}
                    <div className="mt-auto grid grid-cols-2 gap-4 py-3 border-t border-gray-100 dark:border-white/5">
                         <div>
                            <span className="block text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Time</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-lg font-mono font-bold ${isOngoing ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-white'}`}>
                                    {format(startTime, 'HH:mm')}
                                </span>
                                <span className="text-xs text-gray-400 font-normal">
                                    - {format(endTime, 'HH:mm')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="block text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Duration</span>
                             <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {durationString}
                             </span>
                        </div>
                    </div>
                </div>

                {/* Footer Action Area */}
                <div className={`p-4 ${
                    isPresent ? "bg-green-50/50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-500/10" :
                    "bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5"
                }`}>
                    {isPresent ? (
                         <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-700 dark:text-green-400">
                             <CheckCircleIcon className="size-4" />
                             <span>
                                 Recorded at {attendanceTime ? format(attendanceTime, 'HH:mm') : '-'}
                             </span>
                         </div>
                    ) : (
                        <Button 
                            onClick={() => handleCheckIn(item)}
                            className={`w-full justify-center py-2.5 rounded-xl font-bold transition-all shadow-sm ${
                                isOngoing 
                                    ? "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 active:scale-[0.98]" 
                                    : "bg-white hover:bg-gray-50 text-gray-400 border border-gray-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-500 dark:border-white/10 cursor-not-allowed"
                            }`}
                            disabled={!isOngoing || isCompleted}
                        >
                            <QrCodeIcon className="size-5 mr-2" />
                            {isOngoing ? "Scan QR to Check In" : isCompleted ? "Class Ended" : "Not Started Yet"}
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    if (isScanModalOpen) {
        return (
            <FullPageScanner 
                onScan={handleScanSuccess} 
                onClose={() => {
                    setIsScanModalOpen(false);
                    setScanStatus('idle');
                    setScanMessage(null);
                }}
                status={scanStatus}
                message={scanMessage}
                session={selectedSession}
            />
        );
    }

    return (
        <>
            <PageMeta title="My Schedule | Student" description="View your daily classes and check in." />
            <PageBreadcrumb pageTitle="Today's Schedule" />

            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                {isLoading ? (
                    <div className="text-center py-12">Loading schedule...</div>
                ) : !schedule?.data || schedule.data.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No classes scheduled for today.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schedule.data.map((item, idx) => (
                            <SessionCard key={idx} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

// Full Scan Component (Adapted from QRScanner.tsx)
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, CheckCircleIcon as SolidCheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'; // Ensure these icons exist or use Outline versions

const FullPageScanner = ({ onScan, onClose, status, message, session }: { onScan: (res: string) => void, onClose: () => void, status: string, message: string | null, session: TodayScheduleItem | null }) => {
    const renderRef = useRef<HTMLDivElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const onScanRef = useRef(onScan);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        let scanner: Html5Qrcode | null = null;
        
        // Small delay to ensure DOM is ready and prevent rapid-fire starts
        const initTimer = setTimeout(async () => {
            if (!renderRef.current) return;
            const elementId = renderRef.current.id;

            try {
                scanner = new Html5Qrcode(elementId);
                scannerRef.current = scanner;

                const config = { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0 
                };

                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (onScanRef.current) {
                            onScanRef.current(decodedText);
                        }
                    },
                    () => {} 
                );
            } catch (err) {
                 console.error("Scanner Error", err);
            }
        }, 500);

        return () => {
             isMountedRef.current = false;
             clearTimeout(initTimer);
             if (scanner) {
                 scanner.stop()
                    .then(() => scanner?.clear())
                    .catch(e => {
                         console.warn("Stop failed, force clearing", e);
                         scanner?.clear();
                    });
             }
        };
    }, []); // Empty dependency array ensures it runs ONCE

    return createPortal(
        <div className="fixed inset-0 z-[100000] bg-black overflow-hidden font-sans">
            {/* Background Ambient */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-900/10 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <button 
                    onClick={onClose}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
                >
                    <ChevronLeftIcon className="size-6" />
                </button>
                <div className="text-center">
                   <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight drop-shadow-md">
                     Scanning
                   </h1>
                   <p className="text-white/70 text-sm font-medium drop-shadow-sm">
                      Check In Session
                   </p>
                </div>
                <div className="w-10" /> {/* Spacer for balance */}
            </div>

            {/* Scanner Viewport */}
            <div className="relative w-full h-full">
                 {/* Camera Feed Container */}
                <div id="full-page-reader" ref={renderRef} className="absolute inset-0 w-full h-full bg-black" />
                <style>{`
                    #full-page-reader { position: absolute !important; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; }
                    #full-page-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
                    #full-page-reader canvas, #full-page-reader img, #full-page-reader svg { display: none !important; }
                    #qr-shaded-region { display: none !important; }
                    #full-page-reader div { box-shadow: none !important; border: none !important; }
                `}</style>

                {/* Dark Overlay with Transparent Center */}
                <div className="absolute inset-0 bg-black/60 z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-3xl" />
                </div>

                {/* Scanning Frame & Animation (Absolutely Positioned to match cutout) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] z-20 pointer-events-none">
                    {/* Laser Animation */}
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                        <motion.div
                            initial={{ top: "-10%" }}
                            animate={{ top: "110%" }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 2, 
                                ease: "linear"
                            }}
                            className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                        >
                             <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-brand-500/30 to-transparent" />
                        </motion.div>
                    </div>

                    {/* Scanner Marker Frames (Green Only - Flat, No Shadow) */}

                    {/* Top Left */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-brand-500 rounded-tl-3xl" />
                    {/* Top Right */}
                    <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-brand-500 rounded-tr-3xl" />
                    {/* Bottom Left */}
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-brand-500 rounded-bl-3xl" />
                    {/* Bottom Right */}
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-brand-500 rounded-br-3xl" />
                </div>
            </div>

            {/* Bottom Bar (Session Info) - Gate Style */}
            {session && (
                <div className="absolute inset-x-0 bottom-10 z-20 flex justify-center px-6 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-500">
                        {/* Column 1: Subject */}
                        <div className="text-center px-4 max-w-[150px]">
                            <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                Subject
                            </span>
                            <span className="text-sm font-medium text-white block truncate">
                                {session.subjectName}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        
                        {/* Column 2: Room */}
                        <div className="text-center px-4">
                            <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                Room
                            </span>
                            <span className="text-sm font-medium text-white block">
                                {session.className}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        
                        {/* Column 3: Time */}
                        <div className="text-center px-4">
                            <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                Time
                            </span>
                            <span className="text-lg font-mono font-bold text-white tracking-tight">
                                {session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Overlay */}
            <AnimatePresence>
                {status !== 'idle' && status !== 'scanning' && message && (
                     <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`absolute inset-0 flex items-center justify-center p-8 backdrop-blur-xl z-50 ${
                          status === "success" ? "bg-green-500/80" : 
                          status === "error" ? "bg-red-500/80" : 
                          "bg-black/80"
                        }`}
                      >
                         <div className="text-center text-white max-w-lg">
                            {status === 'success' ? (
                                <>
                                    <div className="w-24 h-24 rounded-full bg-white text-green-500 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                        <SolidCheckCircleIcon className="w-14 h-14" />
                                    </div>
                                    <h2 className="text-4xl font-extrabold mb-2 tracking-tight">SUCCESS</h2>
                                    <p className="text-2xl font-medium opacity-90">Checked In!</p>
                                    <p className="mt-2 text-lg opacity-75">{message}</p>
                                    
                                    {/* Session Details Card for Success */}
                                    {session && (
                                        <div className="mt-6 bg-black/20 p-4 rounded-xl backdrop-blur-md border border-white/10 text-left">
                                            <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3 pb-2 border-b border-white/10">
                                                Session Details
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-[10px] text-white/50 uppercase tracking-wide">Subject</span>
                                                    <span className="text-lg font-bold">{session.subjectName}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-white/50 uppercase tracking-wide">Time</span>
                                                    <span className="text-lg font-mono font-bold">{session.startTime} - {session.endTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : status === 'error' ? (
                                <>
                                    <div className="w-24 h-24 rounded-full bg-white text-red-500 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                        <XCircleIcon className="w-14 h-14" />
                                    </div>
                                    <h2 className="text-4xl font-extrabold mb-2 tracking-tight">ERROR</h2>
                                    <p className="text-xl font-medium opacity-90">{message}</p>
                                </>
                             ) : (
                                <div className="text-2xl font-bold animate-pulse">{message}</div>
                             )}
                         </div>
                      </motion.div>
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
};

export default StudentSchedule;
