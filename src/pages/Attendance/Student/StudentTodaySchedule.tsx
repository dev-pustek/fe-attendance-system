
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useStudentTodaySchedule, useAttendancePolicy } from '../../../api/hooks/useAttendance';
import { TodayScheduleItem } from '../../../api/types/attendance';
import { AttendanceRuleType } from '../../../api/types/rules';
import { attendanceService } from '../../../api/services/attendanceService';
import PageMeta from '../../../components/atoms/PageMeta';
import PageBreadcrumb from '../../../components/molecules/PageBreadcrumb';
import { 
    CheckCircleIcon, 
    QrCodeIcon 
} from '@heroicons/react/24/outline';
import Button from '../../../components/atoms/Button';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';
import FullPageScanner from '../../../components/organisms/FullPageScanner';

const StudentTodaySchedule = () => {
    const { user } = useAuthStore();
    const { data: schedule, isLoading, refetch } = useStudentTodaySchedule(user?.public_id);
    const { data: policyData } = useAttendancePolicy(user?.public_id);
    
    // Scanning State
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TodayScheduleItem | null>(null);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
    const [scanMessage, setScanMessage] = useState<string | null>(null);
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

    // --- Card Component ---
    const SessionCard = ({ item }: { item: TodayScheduleItem }) => {
        const isCompleted = item.status === 'COMPLETED' || item.isCompleted || item.sessionStatus === 'COMPLETED';
        const isOngoing = item.sessionStatus === 'ONGOING';
        const startTime = parseTime(item.startTime);
        const endTime = parseTime(item.endTime);
        
        const myStatus = item.myAttendanceStatus?.toLowerCase();
        const isPresent = myStatus === 'present' || myStatus === 'late';
        const attendanceTime = item.myAttendanceTime ? new Date(item.myAttendanceTime) : null;

        const diffMinutes = differenceInMinutes(endTime, startTime);
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const durationString = `${hours > 0 ? `${hours} hr ` : ''}${mins > 0 ? `${mins} min` : ''}`.trim();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawItem = item as any;
        const teacherName = item.teacherName || rawItem.session?.actualTeacher?.name || rawItem.template?.defaultTeacher?.name || 'No Teacher Assigned';
        const classCode = rawItem.session?.classSubject?.class?.code || rawItem.template?.classSubject?.class?.code || item.className; 
        
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
                
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
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
                         
                         {isPresent && (
                            <div className="size-8 rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 flex items-center justify-center shadow-sm">
                                <CheckCircleIcon className="size-5" />
                            </div>
                         )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
                        {item.subjectName}
                    </h3>
                        
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
                                    {selectedSession.subjectName}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-white/10 mx-2" />
                            
                            {/* Column 2: Room */}
                            <div className="text-center px-4">
                                <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                                    Room
                                </span>
                                <span className="text-sm font-medium text-white block">
                                    {selectedSession.className}
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
export default StudentTodaySchedule;
