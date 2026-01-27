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

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingScanRef.current || scanStatus === 'verifying' || scanStatus === 'success') return;
    isProcessingScanRef.current = true;
    
    try {
        setScanStatus('verifying');
        setScanMessage("Verifying attendance...");

        // Payload per user request
        // Sanitize QR Data: Backend expects a UUID (User ID, Event ID, or Location ID)
        // If the scanned data is a URL (e.g. Invitation Paper), we should likely treat it as a check-in for the event 
        // using the Event's Public ID if no other ID is found.
        let sanitizedQrData = decodedText;
        
        // UUID Regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(decodedText)) {
             // If not a UUID, and we have a selected event, use the Event ID as the "Location Code"
             // This assumes the user is proving presence at the event defined by the invitation
             if (selectedEvent?.public_id) {
                 sanitizedQrData = selectedEvent.public_id;
             }
        }

        const payload = {
            qrData: sanitizedQrData,
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
                    
                    const isCheckInOpen = invitation.availabilityStatus === 'open' && isAccepted;
                    const isUpcoming = invitation.availabilityStatus === 'upcoming';
                    const isClosed = invitation.availabilityStatus === 'closed' || invitation.availabilityStatus === 'ended';
                    
                    let cardStyles = "bg-white dark:bg-gray-800 border-gray-200 dark:border-white/5 hover:shadow-lg"; // Default/Upcoming
                    
                    if (isCheckInOpen) {
                        cardStyles = "bg-brand-50/10 dark:bg-brand-500/5 border-brand-500 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/20";
                    } else if (isClosed) {
                        cardStyles = "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-white/5 opacity-75 grayscale-[0.5]";
                    } else if (isUpcoming) {
                         // Optional: Distinct style for upcoming if needed, or keep default active-looking but waiting
                         cardStyles = "bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-500/20";
                    }

                    return (
                    <div 
                        key={invitation.id} 
                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row gap-6 p-4 sm:p-6 ${cardStyles}`}
                    >
                        {/* Active Indicator Strip */}
                        {isCheckInOpen && (
                            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
                        )}
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
                                                onClick={() => handleResponseClick(invitation.id, "DECLINED")}
                                                isLoading={isResponding}
                                                disabled={isResponding}
                                            >
                                                Decline
                                            </Button>
                                            <Button 
                                                variant="primary" 
                                                size="sm"
                                                onClick={() => handleResponseClick(invitation.id, "ACCEPTED")}
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
                                        {/* Check In Button - Controlled by availabilityStatus */}
                                        {invitation.availabilityStatus === 'open' ? (
                                            <Button 
                                              variant="primary" 
                                              size="sm" 
                                              className="flex items-center gap-2 animate-pulse-slow shadow-lg shadow-brand-500/20"
                                              onClick={() => handleScanClick(event)}
                                            >
                                              <QrCodeIcon className="size-4" />
                                              <span>Check In Now</span>
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed select-none">
                                                <TimeIcon className="size-4" />
                                                <span className="text-xs font-bold uppercase tracking-wide">
                                                    {invitation.availabilityStatus === 'upcoming' ? 'UPCOMING' : 
                                                     invitation.availabilityStatus === 'ended' ? 'ENDED' : 'UNAVAILABLE'}
                                                </span>
                                            </div>
                                        )}
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
