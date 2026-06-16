
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useAttendancePolicy } from '../../../api/hooks/useAttendance';
import { StudentRoadmapItem } from '../../../api/types/dashboard';
import { dashboardService } from '../../../api/services/dashboardService';
import { AttendanceRuleType } from '../../../api/types/rules';
import { attendanceService } from '../../../api/services/attendanceService';
import PageMeta from '../../../components/atoms/PageMeta';
import PageBreadcrumb from '../../../components/molecules/PageBreadcrumb';
import { 
    CheckCircleIcon, 
    QrCodeIcon,
    MapPinIcon,
    CameraIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/atoms/Button';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';
import FullPageScanner from '../../../components/organisms/FullPageScanner';

const StudentTodaySchedule = () => {
    const { user } = useAuthStore();
    const { data: policyDataRaw } = useAttendancePolicy(user?.public_id || user?.id);
    const policyData = (policyDataRaw as any)?.data || policyDataRaw;
    
    // Schedule State
    const [schedule, setSchedule] = useState<StudentRoadmapItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRoadmap = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dashboardService.getUserRoadmap();
            setSchedule(data.roadmap || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.public_id) fetchRoadmap();
    }, [user?.public_id, fetchRoadmap]);

    const refetch = fetchRoadmap;

    // Scanning State
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<StudentRoadmapItem | null>(null);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
    const [scanMessage, setScanMessage] = useState<string | null>(null);
    const isProcessingScanRef = useRef(false);

    // --- Actions ---
    const handleCheckIn = (item: StudentRoadmapItem) => {
        if (!policyData?.todayStatus?.clockIn) {
            toast.error("You must clock in at the gate first before scanning for a class.");
            return;
        }

        setSelectedSession(item);
        setScanStatus('idle');
        setScanMessage(null);
        isProcessingScanRef.current = false;
        setIsScanModalOpen(true);
    };

    const handleScanSuccess = useCallback(async (decodedText: string) => {
        if (isProcessingScanRef.current || scanStatus === 'verifying' || scanStatus === 'success') return;
        isProcessingScanRef.current = true;
        
        try {
            setScanStatus('verifying');
            setScanMessage("Verifying session...");

            let qrData: { sessionId: string | number; [key: string]: unknown };
            try {
                qrData = JSON.parse(decodedText);
            } catch {
                throw new Error("Invalid QR Code format.");
            }

            if (String(qrData.sessionId) !== String(selectedSession?.sessionId)) { 
                 throw new Error(`Wrong Session! You scanned ${qrData.sessionId}, but selected ${selectedSession?.sessionId}`);
            }

            // Check if Geo Location is required from policy
            const geoRule = policyData?.rules?.find((r: { ruleType: string; ruleValue: unknown }) => r.ruleType === AttendanceRuleType.REQUIRE_GEO_LOCATION);
            const isGeoRequired = geoRule?.ruleValue === true || geoRule?.ruleValue === 'true';

            let latitude: number | undefined;
            let longitude: number | undefined;

            if (isGeoRequired) {
                setScanMessage("Capturing location...");
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 5000,
                            maximumAge: 0
                        });
                    });
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                } catch (geoError) {
                    console.error("Geo Location Error:", geoError);
                    throw new Error("Location access is required to check in. Please enable location permissions.");
                }
            }

            const payload = {
                teachingSessionId: qrData.sessionId, 
                studentId: user?.public_id || "",
                status: "present" as const,
                method: "qr" as const,
                latitude,
                longitude
            };

            await attendanceService.createSubjectAttendance(payload);

            setScanStatus('success');
            setScanMessage("Check-in Successful!");
            toast.success("You have successfully checked in!");
            
            setTimeout(() => {
                setIsScanModalOpen(false);
                refetch();
                setScanStatus('idle');
                isProcessingScanRef.current = false;
            }, 2000);

        } catch (error: unknown) {
            console.error(error);
            // Revert to scanning state so user can try again immediately
            setScanStatus('scanning');
            
            const errorMessage = error instanceof Error ? error.message : "Failed to verify check-in.";
            
            // Show toast instead of full page error overlay
            toast.error(errorMessage);
            
            isProcessingScanRef.current = false; 
        }
    }, [scanStatus, selectedSession, user?.public_id, refetch, policyData]);

    const handleScanSuccessRef = useRef(handleScanSuccess);
    useEffect(() => {
        handleScanSuccessRef.current = handleScanSuccess;
    }, [handleScanSuccess]);

    // Helper to safely parse time strings (e.g. "07:00:00" or ISO timestamps)
    const parseTime = (timeStr: string) => {
        if (!timeStr) return new Date();
        if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(timeStr)) {
            const today = new Date();
            const [hours, minutes] = timeStr.split(':');
            const date = new Date(today);
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return date;
        }
        return new Date(timeStr);
    };

    // --- Gate Card Component ---
    const GateCard = ({ item }: { item: StudentRoadmapItem }) => {
        const isCompleted = item.status === 'completed';
        const isScanIn = item.type === 'scan_in';
        return (
            <div className={`relative h-full flex flex-col rounded-2xl border transition-all duration-300 group hover:shadow-xl overflow-hidden ${isCompleted ? "bg-green-50/30 border-green-200 dark:bg-green-900/10 dark:border-green-500/20" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"}`}>
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-white/20"}`} />
                <div className="p-5 flex-1 flex flex-col relative">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md w-fit ${isCompleted ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"}`}>
                            {isScanIn ? "Arrival Scan" : "Departure Scan"}
                        </span>
                        {isCompleted && (
                            <div className="size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 flex items-center justify-center shadow-sm">
                                <CheckCircleIcon className="size-5" />
                            </div>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
                        {item.title}
                    </h3>
                    <div className="mt-auto grid grid-cols-1 gap-4 py-3 border-t border-gray-100 dark:border-white/5">
                        <div>
                            <span className="block text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Scanned Time</span>
                            <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                                {item.time}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Card Component ---
    const SessionCard = ({ item }: { item: StudentRoadmapItem }) => {
        const isCompleted = item.status === 'completed';
        const isOngoing = item.isOngoing;
        const [startTimeStr, endTimeStr] = item.time.split(' - ');
        const startTime = parseTime(startTimeStr);
        const endTime = endTimeStr ? parseTime(endTimeStr) : startTime;
        
        const isHoliday = item.status === 'holiday';
        const isPresent = isCompleted;
        const attendanceTime = item.attendanceTime ? new Date(item.attendanceTime) : null;

        const diffMinutes = differenceInMinutes(endTime, startTime);
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const durationString = `${hours > 0 ? `${hours} hr ` : ''}${mins > 0 ? `${mins} min` : ''}`.trim();

        const teacherName = item.teacherName || 'No Teacher Assigned';
        const classCode = item.classCode || 'CLASS'; 
        
        let cardStyles = "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10";
        if (isHoliday) {
            cardStyles = "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-500/20";
        } else if (isPresent) {
            cardStyles = "bg-green-50/30 border-green-200 dark:bg-green-900/10 dark:border-green-500/20";
        } else if (isOngoing) {
             cardStyles = "bg-gradient-to-br from-white to-brand-50 border-brand-200 dark:from-white/5 dark:to-brand-900/20 dark:border-brand-500/30 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/20";
        } else if (isCompleted) {
             cardStyles = "bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/5 opacity-70 grayscale-[0.8]";
        }

        const rules = policyData?.rules || [];
        const requireQrCode = rules.some((r: any) => r.ruleType === "REQUIRE_QR_CODE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
        const requireGeoLocation = rules.some((r: any) => r.ruleType === "REQUIRE_GEO_LOCATION" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));
        const requirePhotoEvidence = rules.some((r: any) => r.ruleType === "REQUIRE_PHOTO_EVIDENCE" && (r.ruleValue === "true" || r.ruleValue === "1" || r.ruleValue === true));

        const ScanIcon = requireQrCode ? QrCodeIcon : requireGeoLocation ? MapPinIcon : requirePhotoEvidence ? CameraIcon : CheckCircleIcon;
        const scanText = requireQrCode ? "Scan QR to Check In" : requireGeoLocation ? "Check In (GPS)" : requirePhotoEvidence ? "Take Selfie" : "Record Check In";

        return (
            <div className={`relative h-full flex flex-col rounded-2xl border transition-all duration-300 group hover:shadow-xl overflow-hidden ${cardStyles}`}>
                
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isHoliday ? "bg-amber-500" :
                    isPresent ? "bg-green-500" :
                    isOngoing ? "bg-brand-500 animate-pulse" :
                    isCompleted ? "bg-gray-300 dark:bg-white/20" :
                    "bg-transparent"
                }`} />

                <div className="p-5 flex-1 flex flex-col relative">
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                {classCode}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md w-fit ${
                                isHoliday ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                                isPresent ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                isOngoing ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400" :
                                isCompleted ? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400" :
                                "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                            }`}>
                                {isHoliday ? "Libur" : 
                                 isPresent ? "Present" : 
                                 isOngoing ? "Happening Now" : 
                                 isCompleted ? "Finished" : "Scheduled"}
                            </span>
                         </div>
                         
                         {isPresent && (
                            <div className="size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 flex items-center justify-center shadow-sm">
                                <CheckCircleIcon className="size-5" />
                            </div>
                         )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
                        {item.title}
                    </h3>
                    
                    {item.overrideReason && (
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-3 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-100 dark:border-amber-500/20">
                            <span className="font-bold">Keterangan:</span> {item.overrideReason}
                        </p>
                    )}
                     <div className="flex items-center gap-2 mb-6 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        <div className="size-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase">
                            {teacherName.charAt(0)}
                        </div>
                        <span className="truncate">{teacherName}</span> 
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-4 py-3 border-t border-gray-100 dark:border-white/5">
                         <div>
                            <span className="block text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Time</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-lg font-mono font-bold ${isOngoing ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-white'}`}>
                                    {startTimeStr}
                                </span>
                                {endTimeStr && (
                                    <span className="text-xs text-gray-400 font-normal">
                                        - {endTimeStr}
                                    </span>
                                )}
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
                            <ScanIcon className="size-5 mr-2" />
                            {isOngoing ? scanText : isCompleted ? "Class Ended" : "Not Started Yet"}
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    // --- Break Card Component ---
    const BreakCard = ({ item }: { item: StudentRoadmapItem }) => {
        const isCompleted = item.status === 'completed';
        const isActive = item.status === 'active';
        const [startTimeStr, endTimeStr] = item.time.split(' - ');
        const startTime = parseTime(startTimeStr);
        const endTime = endTimeStr ? parseTime(endTimeStr) : startTime;
        const diffMinutes = differenceInMinutes(endTime, startTime);
        const durationString = `${diffMinutes} min`;

        return (
            <div className={`relative h-full flex flex-col rounded-2xl border transition-all duration-300 group hover:shadow-xl overflow-hidden ${
                isActive 
                    ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/10 dark:to-orange-900/10 dark:border-amber-500/20 ring-1 ring-amber-500/20" 
                    : isCompleted 
                        ? "bg-gray-50/50 border-gray-200 dark:bg-white/5 dark:border-white/10 opacity-70"
                        : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"
            }`}>
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isActive ? "bg-amber-400 animate-pulse" : isCompleted ? "bg-gray-300 dark:bg-white/20" : "bg-amber-200 dark:bg-amber-500/20"
                }`} />
                <div className="p-5 flex-1 flex flex-col relative">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md w-fit ${
                            isActive ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" 
                            : isCompleted ? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400" 
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}>
                            {isActive ? "Break Time" : isCompleted ? "Break Over" : "Upcoming Break"}
                        </span>
                        <div className={`size-8 rounded-full flex items-center justify-center shadow-sm ${
                            isActive ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" 
                            : "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500"
                        }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                                <path d="M12 2.25a.75.75 0 01.75.75v9a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM18.894 6.166a.75.75 0 00-1.06-1.06l-6.364 6.364a.75.75 0 101.06 1.06l6.364-6.364zM6.75 12a5.25 5.25 0 1010.335 1.29.75.75 0 011.174.936A6.75 6.75 0 116.75 12z" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
                        {item.title}
                    </h3>
                    <div className="mt-auto grid grid-cols-2 gap-4 py-3 border-t border-gray-100 dark:border-white/5">
                        <div>
                            <span className="block text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Time</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-lg font-mono font-bold ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                    {startTimeStr}
                                </span>
                                {endTimeStr && (
                                    <span className="text-xs text-gray-400 font-normal">- {endTimeStr}</span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Duration</span>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{durationString}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PageMeta title="Subject Schedule | Student" description="View your daily classes." />
            <PageBreadcrumb pageTitle="Subject Schedule" />

            {isScanModalOpen && (
                <FullPageScanner 
                    onScan={handleScanSuccess} 
                    onClose={() => {
                        setIsScanModalOpen(false);
                        setScanStatus('idle');
                        setScanMessage(null);
                    }}
                    status={scanStatus}
                    message={scanMessage}
                    title="Scanning"
                    subtitle="Check In Session"
                    description={selectedSession && (
                        <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center shadow-2xl">
                            {/* Column 1: Subject */}
                            <div className="text-center px-4 max-w-[150px]">
                                <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                    Subject
                                </span>
                                <span className="text-sm font-medium text-white block truncate">
                                    {selectedSession.title}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-white/10 mx-2" />
                            
                            {/* Column 2: Room */}
                            <div className="text-center px-4">
                                <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                    Room
                                </span>
                                <span className="text-sm font-medium text-white block">
                                    {selectedSession.classCode || 'CLASS'}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-white/10 mx-2" />
                            
                            {/* Column 3: Time */}
                            <div className="text-center px-4">
                                <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                    Time
                                </span>
                                <span className="text-lg font-mono font-bold text-white tracking-tight">
                                    {selectedSession.startTime.slice(0, 5)} - {selectedSession.endTime.slice(0, 5)}
                                </span>
                            </div>
                        </div>
                    )}
                />
            )}

            <div className="flex flex-col flex-1 px-4 sm:px-6 md:px-8 py-8 w-full max-w-7xl mx-auto overflow-y-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Today's Schedule</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Your daily roadmap of classes and scans.</p>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
                    </div>
                ) : !schedule || schedule.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-white/10">
                        <div className="size-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <CheckCircleIcon className="size-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Schedule Today</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md">You don't have any classes scheduled for today.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {schedule.map((item: StudentRoadmapItem, index: number) => {
                            if (item.type === 'scan_in' || item.type === 'scan_out') {
                                return <GateCard key={`gate-${index}`} item={item} />;
                            }
                            if (item.type === 'break') {
                                return <BreakCard key={`break-${index}`} item={item} />;
                            }
                            return <SessionCard key={`class-${index}`} item={item} />;
                        })}
                    </div>
                )}
            </div>
        </>
    );
};
export default StudentTodaySchedule;
