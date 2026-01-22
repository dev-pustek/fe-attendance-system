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

export default function StudentEvents() {
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);

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

  const handleResponse = useCallback(async (invitationId: number, status: "ACCEPTED" | "DECLINED") => {
    setRespondingId(invitationId);
    try {
      await eventService.respondToInvitation(invitationId, { status: status.toLowerCase() });
      
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId 
          ? { ...inv, status: status.toLowerCase() as EventInvitation['status'] } 
          : inv
      ));
      
      showSuccess(`Successfully ${status.toLowerCase()}ed the invitation.`);
      fetchInvitations(); // Refresh metrics
    } catch (error) {
      showError(error, "Failed to respond to invitation.");
    } finally {
      setRespondingId(null);
    }
  }, [fetchInvitations]);

  const handleScanClick = (event: Event) => {
    setSelectedEvent(event);
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
        setScanMessage("Verifying attendance...");

        // Payload per user request
        const payload = {
            qrData: decodedText, // The student's ID or Location Code
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
        setScanStatus('error');
        const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || (error as Error).message || "Failed to record attendance.";
        setScanMessage(errorMessage);
        isProcessingScanRef.current = false; 
    }
  }, [scanStatus, selectedEvent, fetchInvitations]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted": return <Badge color="success">Accepted</Badge>;
      case "declined": return <Badge color="error">Declined</Badge>;
      case "tentative": return <Badge color="warning">Tentative</Badge>;
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
             <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">My Events</h1>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Events</p>
                <p className="text-xl font-bold dark:text-white">{metrics.totalEvents}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl">
                <CheckCircleIcon className="size-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Attended</p>
                <p className="text-xl font-bold dark:text-white">{metrics.attendedCount}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl">
                <PresentationChartLineIcon className="size-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Missed</p>
                <p className="text-xl font-bold dark:text-white">{metrics.missedCount}</p>
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
                    
                    return (
                    <div key={invitation.id} className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/5 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row gap-6">
                        {/* Date Component */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl w-full sm:w-24 h-24 sm:h-auto border border-brand-100 dark:border-brand-500/20">
                            <span className="text-sm font-bold uppercase tracking-wider">{month}</span>
                            <span className="text-3xl font-bold">{day}</span>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                                            {event.eventType}
                                        </span>
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                        {event.name}
                                    </h3>
                                </div>
                                <div className="flex-shrink-0">
                                    {getStatusBadge(invitation.status)}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                                {event.description}
                            </p>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <TimeIcon className="size-4 shrink-0" />
                                        <span>{time}</span>
                                        {event.endTime && (
                                          <span className="text-xs text-gray-400">
                                            - {format(new Date(event.endTime), "p")}
                                          </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertIcon className="size-4 shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    {invitation.status === "invited" ? (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                                                onClick={() => handleResponse(invitation.id, "DECLINED")}
                                                isLoading={isResponding}
                                                disabled={isResponding}
                                            >
                                                Decline
                                            </Button>
                                            <Button 
                                                variant="primary" 
                                                size="sm"
                                                onClick={() => handleResponse(invitation.id, "ACCEPTED")}
                                                isLoading={isResponding}
                                                disabled={isResponding}
                                            >
                                                Accept
                                            </Button>
                                        </>
                                    ) : isAccepted ? (
                                      <>
                                        <Link to={`/events/${event.public_id}/invitation-paper?userId=${user?.public_id}`}>
                                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                                            <TicketIcon className="size-4" />
                                            <span>Invitation Card</span>
                                          </Button>
                                        </Link>
                                        <Button 
                                          variant="primary" 
                                          size="sm" 
                                          className="flex items-center gap-2"
                                          onClick={() => handleScanClick(event)}
                                        >
                                          <QrCodeIcon className="size-4" />
                                          <span>Check In</span>
                                        </Button>
                                      </>
                                    ) : null}
                                </div>
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
          onScan={handleScanSuccess} 
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
    </>
  );
}
