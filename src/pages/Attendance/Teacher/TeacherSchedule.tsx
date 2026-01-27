import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../../store/authStore";
import { attendanceService } from "../../../api/services/attendanceService";
import { academicService } from "../../../api/services/academicService";
import { TodayScheduleItem, CreateTeachingSessionDto, SubjectAttendance } from "../../../api/types/attendance";
import { ClassEnrollment } from "../../../api/types/academic";
import { useTodaySchedule, useAttendanceStatuses } from "../../../api/hooks/useAttendance";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { 
  CalenderIcon, 
  CheckCircleIcon, 
  PlusIcon,
  UserIcon,
} from "../../../components/atoms/Icons"; 
import { MapPinIcon, UsersIcon, QrCodeIcon, ArrowPathIcon, TableCellsIcon, CameraIcon, ExclamationTriangleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError } from "../../../utils/toast";
import Modal from "../../../components/molecules/Modal";
import Checkbox from "../../../components/atoms/Checkbox";
import CustomSelect from "../../../components/molecules/CustomSelect";
import QRCode from "react-qr-code";
import { Html5Qrcode } from "html5-qrcode";



const TeacherSchedule: React.FC = () => {
  const { user } = useAuthStore();
  const { data: scheduleRes, isLoading, refetch } = useTodaySchedule(user?.public_id);
  const { data: statusesRes } = useAttendanceStatuses();

  const statusOptions = React.useMemo(() => {
    const apiOptions = (statusesRes?.data || []).map((s) => ({
      label: s.name,
      value: s.code.toLowerCase(),
    }));
    return apiOptions.length > 0
      ? apiOptions
      : [
          { label: "Present", value: "present" },
          { label: "Late", value: "late" },
          { label: "Absent", value: "absent" },
          { label: "Excused", value: "excused" },
          { label: "Sick", value: "sick" },
        ];
  }, [statusesRes]);

  const schedule = scheduleRes?.data || [];
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Attendance Modal State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'show-qr' | 'scan-qr'>('manual');
  
  const [selectedSessionItem, setSelectedSessionItem] = useState<TodayScheduleItem | null>(null);
  const [students, setStudents] = useState<ClassEnrollment[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    

    const [defaultStatus, setDefaultStatus] = useState("");

  // Filter state for manual list
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  // Poll for attendance updates
  useEffect(() => {
      let pollTimer: NodeJS.Timeout;
      
      if (isAttendanceModalOpen && selectedSessionItem?.sessionId) {
          const sessionId = selectedSessionItem.sessionId;
          
          const fetchAttendance = async () => {
             try {
                 const res = await attendanceService.getSubjectAttendances({
                     teachingSessionId: sessionId,
                     limit: 100
                 });
                 
                 if (res.data) {
                     const fetchedRecords = res.data;
                     
                     setAttendanceStatuses(prev => {
                         const next = { ...prev };
                         let hasChanges = false;
                         fetchedRecords.forEach((record: SubjectAttendance) => {
                             if (record.studentId && next[record.studentId] !== record.status) {
                                 next[record.studentId] = record.status;
                                 hasChanges = true;
                             }
                         });
                         return hasChanges ? next : prev;
                     });

                     setSelectedStudents(prev => {
                         const next = new Set(prev);
                         let hasChanges = false;
                         fetchedRecords.forEach((record: SubjectAttendance) => {
                             if (record.studentId && !next.has(record.studentId)) {
                                 next.add(record.studentId);
                                 hasChanges = true;
                             }
                         });
                         return hasChanges ? next : prev;
                     });
                 }
             } catch (error) {
                 console.error("Failed to poll attendance", error);
             }
          };

          fetchAttendance();
          pollTimer = setInterval(fetchAttendance, 5000);
      }

      return () => {
          if (pollTimer) clearInterval(pollTimer);
      };
  }, [isAttendanceModalOpen, selectedSessionItem?.sessionId]);


  const getClassStatus = (item: TodayScheduleItem): 'active' | 'now' | 'upcoming' | 'passed' => {
      // Prioritize explicit session status from backend
      if (item.sessionStatus === 'COMPLETED' || item.isCompleted) return 'passed';
      if (item.sessionStatus === 'ONGOING') return 'now'; // Map ONGOING to 'now' logic for active/brand coloring
      if (item.sessionStatus === 'SCHEDULED') return 'upcoming';

      if (item.type === 'session') {
           // Fallback for existing sessions without explicit sessionStatus
          return item.isCompleted ? 'passed' : 'active';
      }
      
      const now = currentTime;
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeVal = currentHours * 60 + currentMinutes;

      const [startH, startM] = item.startTime.split(':').map(Number);
      const startTimeVal = startH * 60 + startM;
      
      const [endH, endM] = item.endTime.split(':').map(Number);
      const endTimeVal = endH * 60 + endM;

      if (currentTimeVal > endTimeVal) return 'passed';
      if (currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal) return 'now';
      return 'upcoming';
  };

  const handleStartClass = async (item: TodayScheduleItem) => {
      // Strict Check: Only allow starting if status is 'now'
      const status = getClassStatus(item);
      if (status !== 'now') {
          if (status === 'upcoming') showError("Class has not started yet.");
          else if (status === 'passed') showError("Class scheduled time has passed.");
          return;
      }

      if (!user?.public_id) return;
      
      try {
          const payload: CreateTeachingSessionDto = {
              classSubjectId: item.classSubjectId,
              actualTeacherId: user.public_id,
              sessionDate: new Date().toISOString().split('T')[0],
              startTime: item.startTime,
              endTime: item.endTime,
              teachingUnits: item.session?.teachingUnits || 1,
              isSubstitution: false
          };

          await attendanceService.createTeachingSession(payload);
          showSuccess("Class started successfully!");
          refetch();

      } catch (error) {
          showError(error, "Failed to start class");
      }
  };

  const handleOpenAttendance = async (item: TodayScheduleItem) => {
      setSelectedSessionItem(item);
      setIsAttendanceModalOpen(true);
      setActiveTab('manual'); // Default tab
      setIsLoadingStudents(true);
      setStudents([]);
      setAttendanceStatuses({});
      setSelectedStudents(new Set());

      try {
          const classId = item.session?.classSubject?.classId;
          const academicYearId = item.session?.classSubject?.academicYearId;
          
          if (classId && academicYearId) {
              const res = await academicService.getClassEnrollments({
                  limit: 100,
                  classId: classId,
                  academicYearId: academicYearId,
                  status: 'active'
              });
              setStudents(res.data);
          } else {
              showError("Could not determine Class ID or Academic Year for this session.");
          }

      } catch (e) {
          console.error(e);
          showError("Failed to load students");
      } finally {
          setIsLoadingStudents(false);
      }
  };

  const handleSubmitAttendance = async () => {
      if (!selectedSessionItem?.sessionId || !selectedStudents.size) return;

      const records = Array.from(selectedStudents).map(studentId => ({
          studentId,
          status: (attendanceStatuses[studentId] || defaultStatus) as "present" | "absent" | "late" | "excused",
      }));

      // Validate that all records have a status
      const missingStatus = records.some(r => !r.status);
      if (missingStatus) {
          showError("Please select a status for all selected students.");
          return;
      }

      try {
          await attendanceService.bulkCreateSubjectAttendance({
              teachingSessionId: selectedSessionItem.sessionId,
              records
          });

          showSuccess(`Attendance recorded for ${records.length} students.`);
          // We keep modal open but maybe briefly show success?
      } catch (error) {
          showError(error, "Failed to submit attendance");
      }
  };
  
  // Generate QR Value
  const getQRValue = () => {
      if (!selectedSessionItem) return "";
      const data = {
          sessionId: selectedSessionItem.sessionId,
          classSubjectId: selectedSessionItem.session?.classSubjectId,
          type: "session_attendance",
          timestamp: new Date().toISOString(),
      };
      return JSON.stringify(data);
  };

  // --- Render Contents based on Tab ---
  
  const renderManualTab = () => {
       const filteredStudents = students.filter(s => s.user?.name.toLowerCase().includes(filterQuery.toLowerCase()));

       return (
            <div className="space-y-4">
               {/* Bulk Actions Header */}
               <div className="relative md:sticky md:top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-xl p-4 rounded-xl border border-gray-200/50 dark:border-white/10 shadow-sm mb-4 transition-all">
                    <div className="flex items-center gap-3">
                        <Checkbox 
                           checked={students.length > 0 && selectedStudents.size === students.length}
                           onChange={(c) => {
                               if (c) setSelectedStudents(new Set(students.map(s => s.user?.public_id).filter(Boolean) as string[]));
                               else setSelectedStudents(new Set());
                           }}
                           label="Select All"
                        />
                        <span className="text-sm text-gray-500">{selectedStudents.size} selected</span>
                         
                         {/* Live Indicator */}
                         <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full text-xs font-medium animate-pulse">
                            <span className="relative flex size-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full size-2 bg-green-500"></span>
                            </span>
                            Live Updates
                         </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set All To:</span>
                        <div className="w-48">
                           <CustomSelect 
                                value={defaultStatus}
                                onChange={(val: string | number) => {
                                    setDefaultStatus(String(val));
                                    // Update visual state for selected
                                    const newStatuses = { ...attendanceStatuses };
                                    selectedStudents.forEach(id => {
                                        newStatuses[id] = String(val);
                                    });
                                    setAttendanceStatuses(newStatuses);
                                }}
                                options={statusOptions}
                                placeholder="Set Default Status"
                           />
                        </div>
                    </div>
               </div>

               <input 
                  type="text" 
                  placeholder="Search student name..." 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm"
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
               />


               {/* Responsive List Container */}
               <div className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden">
                   {isLoadingStudents ? (
                       <div className="flex justify-center py-12"><div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full"></div></div>
                   ) : filteredStudents.length === 0 ? (
                       <div className="text-center py-12 text-gray-500">No students found.</div>
                   ) : (
                       <>
                           {/* Desktop Table View */}
                           <table className="w-full text-left text-sm hidden md:table">
                               <thead className="bg-gray-50 dark:bg-white/5">
                                   <tr>
                                       <th className="p-4 font-medium text-gray-500">Select</th>
                                       <th className="p-4 font-medium text-gray-500">Student</th>
                                       <th className="p-4 font-medium text-gray-500">Status</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-transparent">
                                    {filteredStudents.map(student => {
                                       const sid = student.user?.public_id;
                                       if (!sid) return null;
                                       const isSelected = selectedStudents.has(sid);
                                       const status = attendanceStatuses[sid] || defaultStatus;
                                       const isMissing = isSelected && !status;

                                       return (
                                           <tr key={sid} className={`transition-colors border-l-4 ${
                                               isMissing ? 'border-red-500 bg-red-50/10' : 'border-transparent'
                                           } ${isSelected ? 'bg-brand-50/30 dark:bg-brand-500/5' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}>
                                               <td className="p-4 w-12">
                                                   <Checkbox 
                                                      checked={isSelected}
                                                      onChange={(c) => {
                                                          const next = new Set(selectedStudents);
                                                          if (c) next.add(sid);
                                                          else next.delete(sid);
                                                          setSelectedStudents(next);
                                                      }}
                                                   />
                                               </td>
                                               <td className="p-4">
                                                   <div className="flex items-center gap-3">
                                                       <div className="w-9 h-12 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden text-gray-500 border border-gray-100 dark:border-white/10 shrink-0">
                                                           {student.user?.photo ? <img src={student.user.photo} className="size-full object-cover" /> : <UserIcon className="size-4" />}
                                                       </div>
                                                       <div>
                                                           <p className="font-medium text-gray-900 dark:text-white">{student.user?.name}</p>
                                                           <p className="text-xs text-gray-500">{student.user?.studentProfile?.nis || student.user?.studentProfile?.studentIdentificationNumber || student.user?.studentProfile?.studentId || "No NIS"}</p>
                                                       </div>
                                                   </div>
                                               </td>
                                               <td className="p-4">
                                                   <div className="w-32">
                                                       <CustomSelect
                                                           value={status}
                                                           onChange={(val: string | number) => {
                                                               setAttendanceStatuses(prev => ({ ...prev, [sid]: String(val) }));
                                                               setSelectedStudents(prev => {
                                                                   const next = new Set(prev);
                                                                   next.add(sid);
                                                                   return next;
                                                               });
                                                           }}
                                                           options={statusOptions}
                                                           placeholder="Select..."
                                                           className={isMissing ? "ring-1 ring-red-500 rounded-xl" : ""}
                                                       />
                                                   </div>
                                               </td>
                                           </tr>
                                       );
                                   })}
                               </tbody>
                           </table>

                           {/* Mobile Card View */}
                           <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
                                {filteredStudents.map(student => {
                                   const sid = student.user?.public_id;
                                   if (!sid) return null;
                                   const isSelected = selectedStudents.has(sid);
                                   const status = attendanceStatuses[sid] || defaultStatus;
                                   const isMissing = isSelected && !status;

                                   return (
                                       <div key={sid} className={`p-4 flex flex-col gap-3 transition-colors border-l-4 ${
                                           isMissing ? 'border-red-500 bg-red-50/10' : 'border-transparent'
                                       } ${isSelected ? 'bg-brand-50/30 dark:bg-brand-500/5' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <div className="pt-1">
                                                    <Checkbox 
                                                        checked={isSelected}
                                                        onChange={(c) => {
                                                            const next = new Set(selectedStudents);
                                                            if (c) next.add(sid);
                                                            else next.delete(sid);
                                                            setSelectedStudents(next);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-[13.33px] rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden text-gray-500 shrink-0 border border-gray-100 dark:border-white/10" style={{ height: '48px', width: '36px' }}>
                                                            {student.user?.photo ? <img src={student.user.photo} className="size-full object-cover" /> : <UserIcon className="size-5" />}
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-semibold text-gray-900 dark:text-white leading-tight">{student.user?.name}</p>
                                                            <p className="text-xs text-gray-400 font-medium">{student.user?.studentProfile?.nis || student.user?.studentProfile?.studentId || "No NIS"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="pl-8">
                                                <CustomSelect
                                                    value={status}
                                                    onChange={(val: string | number) => {
                                                        setAttendanceStatuses(prev => ({ ...prev, [sid]: String(val) }));
                                                        setSelectedStudents(prev => {
                                                            const next = new Set(prev);
                                                            next.add(sid);
                                                            return next;
                                                        });
                                                    }}
                                                    options={statusOptions}
                                                    placeholder="Select..."
                                                    className={isMissing ? "ring-1 ring-red-500 rounded-xl" : ""}
                                                />
                                            </div>
                                       </div>
                                   );
                                })}
                           </div>
                       </>
                   )}
               </div>
       </div>
       );
  };

  const renderShowQRTab = () => {
      return (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                   {selectedSessionItem && (
                       <QRCode 
                           value={getQRValue()}
                           size={256}
                           style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                           viewBox={`0 0 256 256`}
                       />
                   )}
               </div>
               
               <div className="text-center space-y-2">
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                       Scan with Mobile App
                   </h3>
                   <p className="text-sm text-gray-500">
                       Students can scan this code to mark themselves as <span className="font-bold text-green-600">Present</span>.
                   </p>
               </div>
          </div>
      );
  };

  const ScanQRTab = ({ sessionItem }: { sessionItem: TodayScheduleItem | null }) => {
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [scanMessage, setScanMessage] = useState<string | null>(null);
    const [scannedName, setScannedName] = useState<string | null>(null);

    // Refs for accessing latest state inside effect without triggering re-runs
    const statusRef = React.useRef(status);
    const studentsRef = React.useRef(students);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        studentsRef.current = students;
    }, []);

    // Track mounting to prevent updates after unmount
    const isMounted = React.useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        const scannerConfig = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 };
        // Ensure element exists before instantiating
        const elementId = "reader-modal";
        if (!document.getElementById(elementId)) return;
        
        const html5QrCode = new Html5Qrcode(elementId);
        let isRunning = false;
        
        const startPromise = html5QrCode.start(
            { facingMode: "environment" },
            scannerConfig,
            async (decodedText) => {
                if (!isMounted.current || statusRef.current === 'success') return;

                try {
                    let studentId = decodedText;
                    try {
                        const json = JSON.parse(decodedText);
                        if (json.userId) studentId = json.userId;
                        else if (json.studentId) studentId = json.studentId;
                    } catch {
                        // plain string
                    }

                    // 1. Mark presence
                    if (sessionItem?.sessionId) {
                          try {
                              await attendanceService.createSubjectAttendance({
                                   teachingSessionId: sessionItem.sessionId,
                                   studentId: studentId,
                                   status: "present"
                              });
                              
                              if (!isMounted.current) return;

                              // Find student name for feedback
                              // Check both user.public_id and potentially profile NIS if we had it, but here we iterate enrollments
                              const enrollment = studentsRef.current.find(s => s.user?.public_id === studentId);
                              setScannedName(enrollment?.user?.name || studentId);
                              
                              setStatus('success');
                              setScanMessage("Marked as Present");
                          } catch(e) {
                               console.error(e);
                               if (isMounted.current) {
                                   setStatus('error');
                                   setScanMessage("Failed to mark attendance.");
                               }
                          }
                    }

                    // Reset after 3s
                    setTimeout(() => {
                        if (isMounted.current) {
                            setStatus('idle');
                            setScanMessage(null);
                            setScannedName(null);
                        }
                    }, 3000);

                } catch (err) {
                    console.error(err);
                }
            },
            () => {} // error callback
        ).then(() => {
            if (isMounted.current) {
                isRunning = true;
            } else {
                // If unmounted during start, immediately stop
                 html5QrCode.stop().catch(() => {}).finally(() => html5QrCode.clear());
            }
        }).catch(err => {
             if (!isMounted.current) return;
             if (err?.name === 'NotAllowedError') {
                  setScanMessage("Camera permission denied");
                  setStatus('error');
             }
             console.error("Error starting scanner", err);
        });

        return () => {
             startPromise.then(() => {
                 if (isRunning) {
                     html5QrCode.stop()
                         .then(() => html5QrCode.clear())
                         .catch(err => {
                             // Ignore common cleanup errors
                             const msg = err?.message || err;
                             if (typeof msg === 'string' && (msg.includes("not running") || msg.includes("removeChild"))) {
                                return;
                             }
                             console.warn("Scanner stop failed/ignored", err);
                         });
                 } else {
                     try { html5QrCode.clear(); } catch { /* ignore */ }
                 }
             }).catch(() => {
                 // start failed, nothing to stop
             });
        };
        // ONLY re-run if sessionItem changes
        // eslint-disable-next-line
    }, [sessionItem?.sessionId]);

    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-4 relative min-h-[400px]">
            <div className="w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl relative border-4 border-gray-900 mx-auto">
                 {/* Scanner Logic */}
                 <div id="reader-modal" className="absolute inset-0 w-full h-full bg-black z-0" />
                 
                 {/* Custom CSS to force video cover */}
                 <style>{`
                    #reader-modal video {
                        object-fit: cover !important;
                        width: 100% !important;
                        height: 100% !important;
                        border-radius: 1rem;
                    }
                    #reader-modal div[style*="position: absolute"] { display: none !important; }
                    #reader-modal__scan_region { display: none !important; }
                 `}</style>
                 
                 {/* Dark Gradient Overlay for readability */}
                 <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10 pointer-events-none" />

                 {/* Target Box */}
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 z-20 pointer-events-none">
                     {/* SVG Frame */}
                     <svg className="absolute inset-0 w-full h-full text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none">
                         <path d="M25 2H20C10 2 2 10 2 20V25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                         <path d="M75 2H80C90 2 98 10 98 20V25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                         <path d="M2 75V80C2 90 10 98 20 98H25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                         <path d="M98 75V80C98 90 90 98 80 98H75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                     </svg>
                     
                     {/* Scanning Laser */}
                     <motion.div
                        initial={{ top: "10%", opacity: 0 }}
                        animate={{ top: "90%", opacity: [0, 1, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute left-[10%] right-[10%] h-0.5 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,1)]"
                     >
                        <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-green-500/20 to-transparent" />
                     </motion.div>
                 </div>

                 {/* Result Overlay */}
                 <AnimatePresence>
                    {status !== 'idle' && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`absolute inset-0 flex items-center justify-center p-6 backdrop-blur-md z-30 ${
                                status === 'success' ? 'bg-green-500/80' : 'bg-red-500/80'
                            }`}
                        >
                            <div className="text-center text-white">
                                {status === 'success' ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-white text-green-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
                                            <CheckCircleIcon className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-1">Marked Present</h2>
                                        {scannedName && <p className="text-lg opacity-90">{scannedName}</p>}
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-white text-red-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
                                            <ExclamationTriangleIcon className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-1">Error</h2>
                                        <p className="text-lg opacity-90">{scanMessage}</p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 text-sm">
                Point camera at student QR Card
            </p>
        </div>
    );
};


  return (
    <>
      <PageMeta title="My Schedule | Visia" description="View today's teaching schedule and record attendance." />
      <PageBreadcrumb pageTitle="My Schedule" />

      <div className="space-y-8">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Today's Schedule</h1>
           <p className="text-gray-500 dark:text-gray-400 mt-1">
             {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
           </p>
        </div>

        {isLoading ? (
             <div className="flex justify-center py-20"><div className="animate-spin size-10 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>
        ) : schedule.length === 0 ? (
             <div className="bg-white dark:bg-white/[0.03] rounded-3xl p-16 text-center border border-gray-100 dark:border-white/5 shadow-sm">
                 <div className="mx-auto size-16 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-4">
                     <CalenderIcon className="size-8 text-gray-400" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Classes Today</h3>
                 <p className="text-gray-500">You don't have any classes scheduled for today. Enjoy your day!</p>
             </div>
        ) : (
             <div className="grid gap-5">
                 {schedule.map((item, idx) => {
                     const status = getClassStatus(item);
                     
                     return (
                          <div key={idx} className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 transition-all duration-300 group ${
                              status === 'active' 
                                ? 'bg-gradient-to-br from-green-50 to-white border-green-200 dark:from-green-500/10 dark:to-transparent dark:border-green-500/30 ring-1 ring-green-500/20 shadow-lg shadow-green-500/5' 
                                : status === 'now'
                                ? 'bg-gradient-to-br from-brand-50 to-white border-brand-200 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/50 dark:from-brand-500/10 dark:to-transparent dark:border-brand-500/30'
                                : status === 'passed'
                                ? 'bg-gray-50 border-gray-100 dark:bg-white/[0.01] dark:border-white/5 opacity-70 grayscale-[0.5]'
                                : 'bg-white border-gray-200 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 dark:bg-white/[0.03] dark:border-white/10 dark:hover:border-white/20'
                          } border`}>
                             
                             {/* Status Badge - Desktop (Absolute) */}
                             <div className="hidden sm:block absolute top-0 right-0">
                                 {status === 'active' && (
                                     <div className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                         <span className="relative flex size-2">
                                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                           <span className="relative inline-flex rounded-full size-2 bg-white"></span>
                                         </span>
                                         Active Session
                                     </div>
                                 )}
                                 {status === 'now' && (
                                     <div className="bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                         <ArrowPathIcon className="size-4 animate-spin" />
                                         Happening Now
                                     </div>
                                 )}
                                 {status === 'passed' && (
                                      <div className="bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400 text-xs font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider">
                                          Finished
                                      </div>
                                 )}
                             </div>
                             
                             {/* Mobile Header: Time Label (Left) & Status (Right) */}
                             <div className="sm:hidden flex justify-between items-start mb-4">
                                 {/* Time Label */}
                                 <div className="bg-gray-50 dark:bg-white/10 border border-gray-100 dark:border-white/5 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm">
                                      {item.startTime.substring(0,5)} - {item.endTime.substring(0,5)}
                                 </div>

                                 {/* Status Badge */}
                                 <div>
                                     {status === 'active' && (
                                         <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                             <span className="relative flex size-2">
                                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                               <span className="relative inline-flex rounded-full size-2 bg-white"></span>
                                             </span>
                                             Active
                                         </div>
                                     )}
                                     {status === 'now' && (
                                         <div className="bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                             <ArrowPathIcon className="size-4 animate-spin" />
                                             Now
                                         </div>
                                     )}
                                     {status === 'passed' && (
                                          <div className="bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                              Finished
                                          </div>
                                     )}
                                 </div>
                             </div>

                             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 relative z-10">
                                 <div className="flex gap-4 sm:gap-6 items-start">
                                     {/* Time Column (Hidden on Mobile) */}
                                     <div className={`hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-2xl shrink-0 ${
                                         status === 'now' || status === 'active' 
                                            ? 'bg-white dark:bg-white/10 shadow-inner' 
                                            : 'bg-gray-100 dark:bg-white/5'
                                     }`}>
                                         <span className={`text-sm font-bold ${
                                             status === 'now' || status === 'active' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500'
                                         }`}>
                                             {item.startTime.substring(0,5)}
                                         </span>
                                         <div className="w-8 h-[1px] bg-gray-300 dark:bg-white/20 my-1"></div>
                                         <span className={`text-sm font-bold ${
                                             status === 'now' || status === 'active' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500'
                                         }`}>
                                             {item.endTime.substring(0,5)}
                                         </span>
                                     </div>

                                     <div className="space-y-2 w-full">
                                         <div className="flex flex-wrap items-center gap-2">
                                             <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                 status === 'now' || status === 'active'
                                                    ? 'bg-brand-500 text-white shadow-brand-500/20 shadow-lg'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                                             }`}>
                                                 {item.className}
                                             </span>
                                         </div>
                                         <h3 className={`text-xl sm:text-2xl font-bold ${
                                             status === 'passed' ? 'text-gray-500' : 'text-gray-900 dark:text-white'
                                         }`}>
                                             {item.subjectName}
                                         </h3>
                                         
                                         {/* Enhanced details with icons */}
                                         <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <UserIcon className="size-4" />
                                                <span>{user?.name || "Teacher"}</span>
                                            </div>
                                            {item.session?.classSubject?.class?.roomNumber && (
                                                <div className="flex items-center gap-1.5" title="Room Number">
                                                    <MapPinIcon className="size-4" />
                                                    <span>Room {item.session.classSubject.class.roomNumber}</span>
                                                </div>
                                            )}
                                            {item.session?.classSubject?.class?.maxCapacity && (
                                                <div className="flex items-center gap-1.5" title="Class Capacity">
                                                    <UsersIcon className="size-4" />
                                                    <span>{item.session.classSubject.class.maxCapacity} Students</span>
                                                </div>
                                            )}
                                            {item.session?.teachingUnits && (
                                                <div className="flex items-center gap-1.5" title="Teaching Hours">
                                                    <ClockIcon className="size-4" />
                                                    <span>{item.session.teachingUnits} hrs</span>
                                                </div>
                                            )}
                                         </div>
                                     </div>
                                 </div>

                                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-4 lg:mt-0 w-full lg:w-auto">
                                     {item.type === 'template' ? (
                                         <button 
                                            onClick={() => handleStartClass(item)}
                                            disabled={status !== 'now'}
                                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg w-full sm:w-auto ${
                                                status === 'now' 
                                                    ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/30 hover:shadow-brand-500/40 ring-2 ring-brand-500/20 ring-offset-2 dark:ring-offset-[#0f1115]' 
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-white/5 dark:text-gray-500 shadow-none'
                                            }`}
                                         >
                                             {status === 'passed' ? (
                                                  <>Class Ended</>
                                             ) : status === 'upcoming' ? (
                                                  <>
                                                      <ClockIcon className="size-5" />
                                                      Upcoming
                                                  </>
                                             ) : (
                                                  <>
                                                      <PlusIcon className="size-5" />
                                                      Start Class
                                                  </>
                                             )}
                                         </button>
                                     ) : (
                                         <button 
                                            onClick={() => handleOpenAttendance(item)}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-brand-500/20 w-full sm:w-auto"
                                         >
                                              <CheckCircleIcon className="size-5" />
                                              Attendance
                                         </button>
                                     )}
                                 </div>
                             </div>
                         </div>
                     );
                 })}
             </div>
        )}
      </div>

      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        className="max-w-2xl"
        title={selectedSessionItem?.subjectName || "Attendance"}
        description="Manage attendance via list, student QR, or teacher scanner."
        subHeader={
            <div className="flex border-b border-gray-100 dark:border-white/5">
                <button 
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <TableCellsIcon className="size-4" />
                    Manual List
                </button>
                <button 
                    onClick={() => setActiveTab('show-qr')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'show-qr' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <QrCodeIcon className="size-4" />
                    Show QR
                </button>
                <button 
                    onClick={() => setActiveTab('scan-qr')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'scan-qr' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <CameraIcon className="size-4" />
                    Scan Card
                </button>
            </div>
        }
        footer={
           <div className="flex justify-end gap-3">
                <button onClick={() => setIsAttendanceModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors dark:hover:bg-white/5">Close</button>
                {activeTab === 'manual' && (
                    <button onClick={handleSubmitAttendance} className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all">Save Changes</button>
                )}
           </div>
        }
      >
          <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                  {activeTab === 'manual' && renderManualTab()}
                  {activeTab === 'show-qr' && renderShowQRTab()}
                  {activeTab === 'scan-qr' && <ScanQRTab sessionItem={selectedSessionItem} />}
              </motion.div>
          </AnimatePresence>
      </Modal>
    </>
  );
};



export default TeacherSchedule;
