import { useEffect, useState, useCallback, useRef } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import { useAuthStore } from "../../../store/authStore";
import { eventService } from "../../../api/services/eventService";
import { attendanceService } from "../../../api/services/attendanceService";
import { EventInvitation, Event } from "../../../api/types/events";
import { EventMetrics } from "../../../api/types/attendance";
import { CalenderIcon, TimeIcon, AlertIcon } from "../../../components/atoms/Icons";
import { QrCodeIcon, TicketIcon, PresentationChartLineIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Badge from "../../../components/atoms/Badge";
import Button from "../../../components/atoms/Button";
import { format } from "date-fns";
import { showSuccess, showError } from "../../../utils/toast";
import { Link } from "react-router";
import FullPageScanner from "../../../components/organisms/FullPageScanner";
import toast from "react-hot-toast";
import Modal from "../../../components/molecules/Modal";
import Label from "../../../components/atoms/Label";

export default function StudentEvents() {
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  // Response Modal State
  const [responseModal, setResponseModal] = useState<{
    isOpen: boolean;
    invitationId: number | null;
    action: "ACCEPTED" | "DECLINED" | null;
  }>({
    isOpen: false,
    invitationId: null,
    action: null
  });
  const [responseNote, setResponseNote] = useState("");

  // Scanning State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const isProcessingScanRef = useRef(false);

  const fetchInvitations = useCallback(async () => {
    const userId = user?.id || user?.public_id;
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await attendanceService.getMyEvents();
      setInvitations(response.data);
      setMetrics(response.metrics);
    } catch (error) {
      console.error("Failed to load events", error);
      // Fallback to older service if getMyEvents fails
      try {
        const fallback = await eventService.getUserInvitations(userId.toString());
        setInvitations(fallback.data);
      } catch (e) {
        console.error("Fallback also failed", e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleResponseClick = (invitationId: number, status: "ACCEPTED" | "DECLINED") => {
    setResponseModal({
      isOpen: true,
      invitationId,
      action: status
    });
    setResponseNote("");
  };

  const confirmResponse = async () => {
    const { invitationId, action } = responseModal;
    if (!invitationId || !action) return;

    setRespondingId(invitationId);
    try {
      await eventService.respondToInvitation(invitationId, { 
        status: action.toLowerCase(),
        responseNotes: responseNote 
      });
      
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId 
          ? { ...inv, status: action.toLowerCase() as EventInvitation['status'] } 
          : inv
      ));
      
      showSuccess(`Successfully ${action.toLowerCase()}ed the invitation.`);
      fetchInvitations(); // Refresh metrics
      setResponseModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      showError(error, "Failed to respond to invitation.");
    } finally {
      setRespondingId(null);
    }
  };

  const handleScanClick = (event: Event) => {
    setSelectedEvent(event);
    setScanStatus('idle');
    setScanMessage(null);
    isProcessingScanRef.current = false;
    setIsScanModalOpen(true);
  };

  const handleScanSuccess = useCallback(async (_decodedText: string) => {
    if (isProcessingScanRef.current || scanStatus === 'verifying' || scanStatus === 'success') return;
    isProcessingScanRef.current = true;
    console.log("Scanned:", _decodedText);
    
    try {
        setScanStatus('verifying');
        setScanMessage("Verifying attendance...");

        const payload = {
            qrData: user?.public_id || "",
            deviceId: "GATE-DEVICE-01",
            eventId: selectedEvent?.public_id || "",
            latitude: -6.1754, // Default per request
            longitude: 106.8272 // Default per request
        };

        await attendanceService.qrScanAttendance(payload);

        setScanStatus('success');
        setScanMessage("Attendance Recorded!");
        toast.success("Event attendance recorded successfully!");
        
        setTimeout(() => {
            setIsScanModalOpen(false);
            fetchInvitations();
            setScanStatus('idle');
            isProcessingScanRef.current = false;
        }, 2000);

    } catch (error: unknown) {
        console.error(error);
        // Revert to scanning state so user can try again immediately
        setScanStatus('scanning');
        
        const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || (error as Error).message || "Failed to record attendance.";
        
        // Show toast instead of full page error overlay
        toast.error(errorMessage);
        
        isProcessingScanRef.current = false; 
    }
  }, [scanStatus, selectedEvent, fetchInvitations, user]);

  const handleScanSuccessRef = useRef(handleScanSuccess);
  useEffect(() => {
    handleScanSuccessRef.current = handleScanSuccess;
  }, [handleScanSuccess]);

  const getStatusBadge = (status: string, attendance?: EventInvitation['attendanceStatus']) => {
    if (status === "attended" || attendance?.hasAttended) {
      return (
        <div className="flex flex-col items-end gap-1">
          <Badge color="success">Attended</Badge>
          {attendance?.status && (
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${attendance.isLate ? 'text-orange-500' : 'text-green-500'}`}>
              {attendance.status}
            </span>
          )}
        </div>
      );
    }

    switch (status) {
      case "accepted": return <Badge color="success">Accepted</Badge>;
      case "declined": return <Badge color="error">Declined</Badge>;
      case "tentative": return <Badge color="warning">Tentative</Badge>;
      case "missed": return <Badge color="error">Missed</Badge>;
      default: return <Badge color="info">Invited</Badge>;
    }
  };

  const getEventDateComponents = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: format(date, "MMM"),
      day: format(date, "d"),
      fullDate: format(date, "PPP"),
      time: format(date, "p")
    };
  };

  return (
    <>
      <PageMeta title="My Events | Visia" description="View your event invitations" />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
             <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-1">My Events</h1>
             <p className="text-sm text-gray-500 dark:text-gray-400">Events you have been invited to.</p>
          </div>
        </div>

        {/* Metrics Section */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className="p-3 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl">
                <CalenderIcon className="size-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Total Events</p>
                <p className="text-xl font-semibold dark:text-white">{metrics.totalEvents}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl">
                <CheckCircleIcon className="size-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Attended</p>
                <p className="text-xl font-semibold dark:text-white">{metrics.attendedCount}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl">
                <PresentationChartLineIcon className="size-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">Missed</p>
                <p className="text-xl font-semibold dark:text-white">{metrics.missedCount}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <p className="text-gray-500">Loading events...</p>
            </div>
        ) : invitations.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
                {invitations.map((invitation) => {
                    if (!invitation.event) return null;
                    const event = invitation.event;
                    const { month, day, time } = getEventDateComponents(event.startTime);
                    const isResponding = respondingId === invitation.id;
                    const isAccepted = invitation.status === "accepted";
                    const isAttended = invitation.status === "attended" || invitation.attendanceStatus?.hasAttended;
                    const isMissed = invitation.status === "missed";
                    
                    const isCheckInOpen = invitation.availabilityStatus === 'open' && isAccepted && !invitation.attendanceStatus?.clockIn;
                    const isCheckOutOpen = invitation.availabilityStatus === 'open' && isAccepted && invitation.attendanceStatus?.clockIn && !invitation.attendanceStatus?.clockOut;
                    const isUpcoming = invitation.availabilityStatus === 'upcoming';
                    const isClosed = (invitation.availabilityStatus === 'closed' || invitation.availabilityStatus === 'ended') && !isAttended;
                    
                    let cardStyles = "bg-white dark:bg-gray-800 border-gray-200 dark:border-white/5"; 
                    
                    if (isAttended && invitation.attendanceStatus?.clockOut) {
                        cardStyles = "bg-green-50/20 dark:bg-green-500/5 border-green-200 dark:border-green-500/20";
                    } else if (isCheckInOpen || isCheckOutOpen) {
                        cardStyles = "bg-brand-50/10 dark:bg-brand-500/5 border-brand-500/50 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/20";
                    } else if (isClosed || isMissed) {
                        cardStyles = "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-white/5 opacity-75 grayscale-[0.5]";
                    } else if (isUpcoming) {
                        cardStyles = "bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-500/20";
                    }

                    return (
                        <div 
                            key={invitation.id} 
                            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col gap-0 shadow-sm ${cardStyles} ${!isClosed && 'hover:shadow-lg hover:border-brand-500/30'}`}
                        >
                            {/* Status Glow / Indicator */}
                            {(isCheckInOpen || isCheckOutOpen) && (
                                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400 animate-shimmer" />
                            )}
                            {isAttended && invitation.attendanceStatus?.clockOut && (
                                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-green-400 to-green-600" />
                            )}

                            <div className="flex flex-col sm:flex-row gap-6 p-5 sm:p-7">
                                {/* Left Side: Date & Status Illustration */}
                                <div className="flex-shrink-0 flex flex-col items-center gap-4">
                                    <div className={`flex flex-col items-center justify-center rounded-2xl w-24 h-24 sm:w-28 sm:h-28 border shadow-sm transition-transform group-hover:scale-105 ${
                                        isAttended ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20' :
                                        (isCheckInOpen || isCheckOutOpen) ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-500/20' :
                                        'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/10'
                                    }`}>
                                        <span className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-0.5">{month}</span>
                                        <span className="text-4xl font-black leading-none">{day}</span>
                                        <span className="text-[10px] font-semibold mt-1 opacity-60 uppercase">{time}</span>
                                    </div>
                                    
                                    {invitation.attendanceStatus?.hasAttended && (
                                        <div className="flex flex-col items-center gap-1 animate-in zoom-in-50 duration-500">
                                            <div className="size-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
                                                <CheckCircleIcon className="size-5 stroke-[2.5]" />
                                            </div>
                                            <span className="text-[10px] font-semibold text-green-600 uppercase tracking-tighter">Verified</span>
                                        </div>
                                    )}
                                </div>

                                {/* Middle: Event Content */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-widest ${
                                                    isCheckInOpen || isCheckOutOpen ? 'bg-brand-100 border-brand-200 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-300' :
                                                    isAttended ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-500/20 dark:border-green-500/30 dark:text-brand-300' :
                                                    'bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                                                }`}>
                                                    {event.eventType}
                                                </span>
                                                {(isCheckInOpen || isCheckOutOpen) && (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full ring-1 ring-brand-500/20">
                                                        <div className="size-1.5 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(var(--color-brand-600),0.8)]" />
                                                        OPEN
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors leading-tight ${
                                                isAttended ? 'text-green-900 dark:text-green-50' : 
                                                'text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400'
                                            }`}>
                                                {event.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-1 max-w-2xl">
                                                "{event.description}"
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {getStatusBadge(invitation.status, invitation.attendanceStatus)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="flex items-center gap-3 group/info">
                                            <div className="size-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover/info:text-brand-500 transition-all">
                                                <TimeIcon className="size-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">Schedule</span>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    {time} — {event.endTime ? format(new Date(event.endTime), "p") : 'End'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 group/info">
                                            <div className="size-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover/info:text-brand-500 transition-all">
                                                <AlertIcon className="size-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">Location</span>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[150px]" title={event.location}>
                                                    {event.location}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 group/info">
                                            <div className="size-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover/info:text-brand-500 transition-all">
                                                <PresentationChartLineIcon className="size-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">Capacity</span>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    {event.capacity || 'Unlimited'} Seats
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Section: Logs & Actions */}
                            <div className="border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] px-5 py-4 sm:px-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                {/* Logs */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {(invitation.attendanceStatus?.clockIn || invitation.attendanceStatus?.clockOut) ? (
                                        <>
                                            {invitation.attendanceStatus.clockIn && (
                                                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 shadow-sm">
                                                    <div className="size-2 rounded-full bg-green-500" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In</span>
                                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                                        {format(new Date(invitation.attendanceStatus.clockIn), "HH:mm:ss")}
                                                    </span>
                                                </div>
                                            )}
                                            {invitation.attendanceStatus.clockOut && (
                                                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 shadow-sm">
                                                    <div className="size-2 rounded-full bg-orange-500" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Out</span>
                                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                                        {format(new Date(invitation.attendanceStatus.clockOut), "HH:mm:ss")}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <div className="size-1.5 rounded-full bg-gray-300" />
                                            <span className="text-[10px] font-semibold uppercase tracking-widest">No attendance recorded</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 flex-shrink-0">
                                    {invitation.status === "invited" ? (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="font-semibold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                                                onClick={() => handleResponseClick(invitation.id, "DECLINED")}
                                                isLoading={isResponding}
                                                disabled={isResponding}
                                            >
                                                Decline
                                            </Button>
                                            <Button 
                                                variant="primary" 
                                                size="sm"
                                                className="font-black px-6 shadow-md"
                                                onClick={() => handleResponseClick(invitation.id, "ACCEPTED")}
                                                isLoading={isResponding}
                                                disabled={isResponding}
                                            >
                                                Accept invitation
                                            </Button>
                                        </>
                                    ) : (isAccepted || isAttended) ? (
                                        <div className="flex items-center gap-2">
                                            <Link to={`/events/${event.public_id}/invitation-paper?userId=${user?.public_id}`}>
                                              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:bg-brand-500/10 rounded-lg transition-all">
                                                <TicketIcon className="size-4" />
                                                <span>Card</span>
                                              </button>
                                            </Link>
                                            
                                            {isCheckInOpen ? (
                                                <Button 
                                                  variant="primary" 
                                                  size="sm" 
                                                  className="flex items-center gap-2 h-9 px-5 font-black animate-pulse shadow-lg shadow-brand-500/20"
                                                  onClick={() => handleScanClick(event)}
                                                >
                                                  <QrCodeIcon className="size-4" />
                                                  <span>Check In</span>
                                                </Button>
                                            ) : isCheckOutOpen ? (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="flex items-center gap-2 h-9 px-5 font-black border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 shadow-lg shadow-orange-500/10"
                                                    onClick={() => handleScanClick(event)}
                                                >
                                                    <QrCodeIcon className="size-4" />
                                                    <span>Check Out Now</span>
                                                </Button>
                                            ) : isAttended && invitation.attendanceStatus?.clockOut ? (
                                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/20">
                                                    <CheckCircleIcon className="size-4 stroke-[3]" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Finalized</span>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest select-none shadow-sm">
                                                    {invitation.availabilityStatus === 'upcoming' ? 'Upcoming' : 
                                                     invitation.availabilityStatus === 'ended' ? 'Ended' : 'Closed'}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )})}
            </div>
        ) : (
            <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-white/5">
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalenderIcon className="size-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Events Found</h3>
                <p className="text-gray-500 dark:text-gray-400">You haven&apos;t been invited to any events yet.</p>
            </div>
        )}
      </div>

      {isScanModalOpen && selectedEvent && (
        <FullPageScanner 
          onScan={(text) => handleScanSuccessRef.current(text)} 
          onClose={() => {
            setIsScanModalOpen(false);
            setScanStatus('idle');
            setScanMessage(null);
          }}
          status={scanStatus}
          message={scanMessage}
          title="Event Scanner"
          subtitle="Scan QR to Record Attendance"
          description={
            <div className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center shadow-2xl">
              <div className="text-center px-4">
                  <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                      Event
                  </span>
                  <span className="text-sm font-medium text-white block truncate max-w-[200px]">
                      {selectedEvent.name}
                  </span>
              </div>
              <div className="h-8 w-px bg-white/10 mx-2" />
              <div className="text-center px-4">
                  <span className="block text-[10px] text-white/50 uppercase tracking-wide mb-1">
                      Location
                  </span>
                  <span className="text-sm font-medium text-white block truncate max-w-[150px]">
                      {selectedEvent.location}
                  </span>
              </div>
            </div>
          }
        />
      )}

      {/* Response Confirmation Modal */}
      <Modal
        isOpen={responseModal.isOpen}
        onClose={() => setResponseModal(prev => ({ ...prev, isOpen: false }))}
        title={`Confirm ${responseModal.action === "ACCEPTED" ? "Attendance" : "Declaration"}`}
        description={`Are you sure you want to ${responseModal.action?.toLowerCase()} this invitation? You can add a note below.`}
        className="max-w-md"
        footer={
           <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResponseModal(prev => ({ ...prev, isOpen: false }))}>
                 Cancel
              </Button>
              <Button 
                variant={responseModal.action === "ACCEPTED" ? "primary" : "outline"}
                className={responseModal.action === "DECLINED" ? "text-red-500 border-red-200 hover:bg-red-50" : ""} 
                onClick={confirmResponse}
                isLoading={respondingId === responseModal.invitationId}
                disabled={respondingId === responseModal.invitationId}
              >
                  Confirm {responseModal.action === "ACCEPTED" ? "Accept" : "Decline"}
              </Button>
           </div>
        }
      >
        <div className="space-y-4">
             <div className="space-y-1">
                 <Label>Note (Optional)</Label>
                 <textarea 
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 bg-white placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-brand-800 min-h-[100px] resize-none transition-all"
                    value={responseNote}
                    onChange={e => setResponseNote(e.target.value)}
                    placeholder={responseModal.action === "ACCEPTED" ? "e.g. I will be late, Vegetarian meal needed..." : "e.g. I have a conflicting schedule..."}
                 />
             </div>
        </div>
      </Modal>
    </>
  );
}
