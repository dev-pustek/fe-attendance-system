import React, { useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useEvent } from "../../api/hooks/useEvents";
import { useMe } from "../../api/hooks/useAuth";
import { useUser } from "../../api/hooks/useUser";
import { User } from "../../api/types/user";
import { Event } from "../../api/types/events";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { CalenderIcon, TimeIcon, AngleRightIcon, UserCircleIcon } from "../../components/atoms/Icons";

const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M17 17H19C20.1046 17 21 16.1046 21 15V11C21 9.89543 20.1046 9 19 9H5C3.89543 9 3 9.89543 3 11V15C3 16.1046 3.89543 17 5 17H7M17 17V21H7V17M17 17H7M17 9V5C17 3.89543 16.1046 3 15 3H9C7.89543 3 7 3.89543 7 5V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 13H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


// Utility helpers for dynamic color processing
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darkenColor = (hex: string, percent: number) => {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  const result = "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
  return result;
};

const GeneralInvitation: React.FC<{ event: Event; qrData: string; primaryColor: string }> = ({ event, qrData, primaryColor }) => {
  const shadowColor = hexToRgba(primaryColor, 0.1);
  const darkerColor = darkenColor(primaryColor, -15);
  
  return (
  <div className="relative w-full max-w-[794px] aspect-auto md:aspect-[1/1.414] print:aspect-[1/1.414] bg-white text-[#111827] flex flex-col border-[1px] border-[#f2f4f7] print:w-[210mm] print:h-[297mm] print:border-none group shadow-2xl md:shadow-none min-h-[600px] md:min-h-0">
    {/* Sophisticated Decorators */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] size-full rotate-45 border-[40px] rounded-[100px]" style={{ borderColor: primaryColor }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] size-full rotate-45 border-[40px] rounded-[100px]" style={{ borderColor: primaryColor }}></div>
    </div>
    
    {/* Corner Floral Accents */}
    <div className="absolute top-6 left-6 size-24 border-t-2 border-l-2 border-[#e4e7ec] pointer-events-none"></div>
    <div className="absolute top-6 right-6 size-24 border-t-2 border-r-2 border-[#e4e7ec] pointer-events-none"></div>
    <div className="absolute bottom-6 left-6 size-24 border-b-2 border-l-2 border-[#e4e7ec] pointer-events-none"></div>
    <div className="absolute bottom-6 right-6 size-24 border-b-2 border-r-2 border-[#e4e7ec] pointer-events-none"></div>

    <div className="absolute inset-10 border border-[#f2f4f7] pointer-events-none print:inset-6"></div>

    {/* Content */}
    <div className="flex-1 p-8 sm:p-14 flex flex-col items-center text-center relative z-10 print:p-10 print:justify-center">
      {/* Top Accent */}
      <div className="mb-8 flex flex-col items-center print:mb-6">
        <div className="size-16 sm:size-20 rounded-3xl flex items-center justify-center mb-4 print:size-16 print:mb-4 transform transition-transform group-hover:scale-110" style={{ backgroundColor: primaryColor }}>
           <CalenderIcon className="size-10 text-white print:size-8" />
        </div>
        <div className="flex items-center gap-4">
           <div className="h-px w-8 bg-[#e4e7ec]"></div>
           <span className="font-bold uppercase tracking-[0.5em] text-[10px] block" style={{ color: primaryColor }}>Official Invitation</span>
           <div className="h-px w-8 bg-[#e4e7ec]"></div>
        </div>
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif italic text-[#101828] leading-tight mb-6 font-bold tracking-tight print:text-5xl print:mb-4">
        {event.name}
      </h1>

      <div className="flex items-center gap-2 mb-6 print:mb-6">
          <div className="size-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
          <div className="w-16 h-px bg-[#f2f4f7]"></div>
          <div className="size-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
      </div>

      <p className="text-base sm:text-lg md:text-xl text-[#475467] font-light max-w-lg leading-relaxed italic mb-8 px-4 print:text-sm print:mb-8 print:max-w-md">
        {event.description || "You are cordially invited to join us for this special occasion. Your presence would be highly appreciated."}
      </p>

      {/* Event Details Plate */}
      <div className="w-full max-w-lg bg-[#f9fafb] rounded-[40px] p-8 sm:p-10 border border-[#f2f4f7] space-y-6 mb-8 print:bg-[#f9fafb] print:p-8 print:space-y-4 print:mb-8 print:rounded-3xl print:max-w-md print:shadow-none" style={{ boxShadow: `0 20px 50px -12px ${shadowColor}` }}>
          <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#98a2b3] uppercase tracking-[0.3em] block mb-3 print:mb-1">When / Timeline</span>
              <p className="text-xl sm:text-2xl font-serif font-bold text-[#1d2939] print:text-lg">
                  {new Date(event.startTime).toLocaleDateString(undefined, { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  })}
              </p>
              <div className="flex items-center gap-3 mt-3 px-6 py-2 text-white rounded-full print:mt-2 print:px-4 print:py-1" style={{ backgroundColor: primaryColor }}>
                 <TimeIcon className="size-4 print:size-3" />
                 <p className="text-xs sm:text-sm font-bold tracking-wider print:text-[10px]">
                    {new Date(event.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    <span className="mx-2 opacity-50">—</span>
                    {new Date(event.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                 </p>
              </div>
          </div>

          <div className="flex items-center gap-4 justify-center py-2 print:py-1">
            <div className="h-px w-full bg-[#f2f4f7]"></div>
            <div className="flex gap-1.5">
                {[1,2,3].map(i => <div key={i} className="size-1 rounded-full bg-[#e4e7ec]"></div>)}
            </div>
            <div className="h-px w-full bg-[#f2f4f7]"></div>
          </div>

          <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-[#98a2b3] uppercase tracking-[0.3em] block mb-3 print:mb-1">Where / Location</span>
              <div className="flex items-center gap-2 mb-1">
                 <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                 <p className="text-xl sm:text-2xl font-serif font-bold text-[#1d2939] print:text-lg">{event.location}</p>
              </div>
              <p className="text-[10px] text-[#98a2b3] font-bold italic mt-2 tracking-widest bg-white dark:bg-transparent px-3 py-1 rounded-lg border border-[#f2f4f7] uppercase print:mt-1 print:text-[8px]">Authorized Access Only</p>
          </div>
      </div>

      {/* QR Section */}
      <div className="mt-auto flex flex-col items-center group/qr print:mt-0">
        <div className="bg-white p-6 rounded-[32px] mb-4 border border-[#f2f4f7] relative overflow-hidden flex items-center justify-center print:p-4 print:mb-2 print:rounded-2xl shrink-0 print:shadow-none" style={{ boxShadow: `0 10px 30px -5px ${hexToRgba(primaryColor, 0.05)}` }}>
            <div className="absolute inset-2 border-[0.5px] border-[#f2f4f7] rounded-[24px] pointer-events-none"></div>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}`} 
              alt="Event QR Code"
              crossOrigin="anonymous"
              className="size-40 sm:size-48 aspect-square object-contain grayscale transition-all duration-500 group-hover/qr:grayscale-0 print:size-40"
            />
        </div>
        <p className="text-[10px] font-bold text-[#1d2939] tracking-[0.4em] uppercase mb-1 print:text-[8px] print:mt-2">Scan to Respond</p>
        <p className="text-[8px] text-[#98a2b3] font-medium lowercase tracking-tighter opacity-50 print:hidden">{qrData.slice(0, 40)}...</p>
      </div>
    </div>

    {/* Bottom Accent */}
    <div className="h-4 w-full print:h-2" style={{ backgroundColor: darkerColor }}></div>
  </div>
  );
};

const PersonalizedTicket: React.FC<{ event: Event; user: User | undefined; recipientName: string; recipientEmail: string | undefined | null; qrData: string; primaryColor: string }> = ({ event, user, recipientName, recipientEmail, qrData, primaryColor }) => {
  const subtleAccent = hexToRgba(primaryColor, 0.2);
  
  return (
  <div className="relative w-full max-w-[1123px] aspect-auto md:aspect-[1.414/1] print:aspect-[1.414/1] bg-white text-[#111827] flex flex-col md:flex-row print:flex-row items-stretch border-[1px] border-[#f2f4f7] print:w-[297mm] print:h-[210mm] print:border-none group overflow-hidden shadow-2xl md:shadow-none">
    {/* Sophisticated Background Pattern */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none print:opacity-[0.05]">
      <div className="grid grid-cols-8 gap-x-20 gap-y-16 -rotate-12 scale-125">
        {Array.from({length: 64}).map((_, i) => (
            <AngleRightIcon key={i} className="size-24" style={{ color: primaryColor }} />
        ))}
      </div>
    </div>

    {/* Left Section (Experience Panel) */}
    <div className="flex-1 p-12 sm:p-16 relative flex flex-col justify-between print:p-16">
      {/* Corner Accents */}
      <div className="absolute top-10 left-10 size-24 border-t-2 border-l-2 print:top-6 print:left-6" style={{ borderColor: subtleAccent }}></div>
      <div className="absolute bottom-10 left-10 size-24 border-b-2 border-l-2 print:bottom-6 print:left-6" style={{ borderColor: subtleAccent }}></div>

      {/* Header Branding */}
      <div className="relative z-10">
         <div className="flex items-center gap-6 mb-12 print:mb-10">
            <div className="size-14 sm:size-16 rounded-2xl flex items-center justify-center print:size-20 print:shadow-none" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${hexToRgba(primaryColor, 0.3)}` }}>
               <CalenderIcon className="size-8 text-white print:size-12" />
            </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold uppercase tracking-[0.5em] text-[10px] block leading-none print:text-xs" style={{ color: primaryColor }}>Official Event Pass</span>
                  <div className="h-px w-10 bg-[#e4e7ec]"></div>
               </div>
               <p className="text-base font-serif italic text-[#475467] font-medium leading-none print:text-lg">The ID Link Media VIP Delegate Exclusive</p>
            </div>
         </div>

         <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif italic text-[#101828] leading-[1.1] mb-8 font-bold tracking-tight print:text-7xl print:mb-8">
                {event.name}
            </h1>
            <div className="h-1.5 w-48 mb-10 rounded-full print:h-2 print:w-64 print:mb-8" style={{ backgroundColor: primaryColor }}></div>
            <p className="text-lg sm:text-xl lg:text-2xl text-[#475467] font-light leading-relaxed italic line-clamp-3 print:text-xl print:line-clamp-none print:max-w-2xl">
                {event.description || "You are cordially invited to join us for this special occasion. Your presence would be highly appreciated."}
            </p>
         </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex gap-20 print:gap-32">
          <div>
            <span className="text-[10px] font-bold text-[#98a2b3] uppercase tracking-[0.3em] block mb-3 print:text-xs">Timeline</span>
            <p className="text-xl sm:text-2xl font-serif font-bold text-[#1d2939] print:text-3xl">
                {new Date(event.startTime).toLocaleDateString(undefined, { 
                    weekday: 'long', month: 'long', day: 'numeric' 
                })}
            </p>
            <div className="inline-flex items-center gap-2 mt-2 text-xs font-bold bg-[#f9fafb] px-3 py-1 rounded-lg border border-[#f2f4f7] print:text-sm print:px-4 print:py-1.5" style={{ color: primaryColor }}>
               <TimeIcon className="size-3.5 print:size-4" />
               {new Date(event.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#98a2b3] uppercase tracking-[0.3em] block mb-3 print:text-xs">Location</span>
            <p className="text-xl sm:text-2xl font-serif font-bold text-[#1d2939] print:text-3xl mb-2">{event.location}</p>
            <span className="text-[9px] text-[#98a2b3] font-bold tracking-widest uppercase italic print:text-[10px]">Authorized Entry Only</span>
          </div>
      </div>
    </div>

    {/* Right Section (Control Stub) */}
    <div className="w-full md:w-[35%] lg:w-[30%] bg-[#fcfcfd] border-t-2 md:border-t-0 print:border-t-0 md:border-l-2 print:border-l-2 border-dashed border-[#e4e7ec] p-8 sm:p-10 flex flex-col items-center relative print:w-[35%] print:p-12">
      {/* Perforation visual effect */}
      <div className="absolute top-[-11px] left-0 right-0 md:top-0 md:bottom-0 print:top-0 print:bottom-0 md:left-[-11px] print:left-[-11px] flex flex-row md:flex-col print:flex-col justify-around pointer-events-none no-print">
         {Array.from({length: 8}).map((_, i) => (
            <div key={i} className="size-5 rounded-full bg-white border border-[#f2f4f7] shadow-inner"></div>
         ))}
      </div>

      {/* Rotated "PASS STUB" vertical label */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 origin-right whitespace-nowrap hidden lg:block">
          <span className="text-[9px] font-bold text-[#cbd5e1] uppercase tracking-[1.5em] leading-none opacity-50">TICKET PASS STUB</span>
      </div>

      {/* Guest Identification */}
      <div className="w-full flex flex-col items-center flex-1">
         <span className="text-[10px] font-bold text-[#98a2b3] uppercase tracking-[0.3em] block mb-10 text-center print:text-xs print:mb-12">Security Access</span>
         
         <div className="relative mb-6">
            <div className="size-20 sm:size-24 rounded-[32px] bg-white border-2 border-[#f2f4f7] flex items-center justify-center shadow-sm relative z-10 print:size-28">
               <UserCircleIcon className="size-14 sm:size-16 text-[#cbd5e1] print:size-20" />
            </div>
            <div className="absolute -bottom-2 -right-2 size-8 bg-[#10b981] rounded-xl flex items-center justify-center text-white shadow-lg z-20 print:size-10">
               <svg className="size-4 print:size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
         </div>
         
         <div className="text-center w-full px-2 mb-8 print:mb-12">
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#101828] mb-1 leading-tight truncate print:text-3xl">
              {recipientName}
            </h3>
            <p className="text-[10px] font-bold tracking-widest uppercase italic opacity-70 mb-4 truncate print:text-sm print:mb-6" style={{ color: primaryColor }}>{recipientEmail}</p>
            
            <div className="inline-flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] w-full print:p-5">
               <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-widest print:text-[10px]">Delegate Token</span>
               <span className="text-xs font-mono font-bold text-gray-900 tracking-tighter print:text-sm">
                  {user?.public_id?.split('-')[0] || 'V-PASS'}-IDLM-2025
               </span>
            </div>
         </div>
      </div>

      {/* QR Stub */}
      <div className="flex flex-col items-center mt-auto">
          <div className="bg-white p-4 rounded-[28px] border border-[#f2f4f7] relative overflow-hidden print:shadow-none print:p-4 print:rounded-[40px]" style={{ boxShadow: `0 12px 30px -10px ${hexToRgba(primaryColor, 0.1)}` }}>
              <div className="absolute inset-1.5 border rounded-[22px] pointer-events-none print:inset-2.5 print:rounded-[32px]" style={{ borderColor: hexToRgba(primaryColor, 0.1) }}></div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}`} 
                alt="Stub QR"
                className="size-32 sm:size-36 aspect-square object-contain print:size-52"
              />
          </div>
          <p className="text-[8px] font-bold text-[#1d2939] tracking-[0.4em] uppercase mt-4 opacity-50 print:text-[10px] print:mt-6">Scan for VIP Lounge</p>
      </div>
    </div>
  </div>
  );
};

const InvitationPaper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading: isEventLoading, error: eventError } = useEvent(id || "");
  const printRef = useRef<HTMLDivElement>(null);
  const [primaryColor, setPrimaryColor] = React.useState("#7152f3");

  const palettes = [
    { name: "Sleek Purple", color: "#7152f3" },
    { name: "Royal Blue", color: "#1e40af" },
    { name: "Deep Emerald", color: "#065f46" },
    { name: "Luxury Gold", color: "#b45309" },
    { name: "Elegant Rose", color: "#be123c" },
    { name: "Midnight", color: "#0f172a" }
  ];

  const queryParams = new URLSearchParams(window.location.search);
  const userIdParam = queryParams.get("userId");
  
  const { data: userDataResponse } = useUser(userIdParam || undefined);
  const { data: meDataResponse } = useMe();
  
  // result.data.data is the User object based on provided JSON structure
  const user = (userDataResponse || meDataResponse) as unknown as User | undefined;
  
  // Robust Role Check for "isStudent"
  const isStudent = React.useMemo(() => {
    if (!meDataResponse) return false;
    // Interceptor unwraps BaseResponse to User, but we cast to satisfy TS
    const me = (meDataResponse as unknown) as User;
    const roles = me.roles?.map((r: { name: string }) => r.name.toLowerCase()) || [];
    const userTypes = me.userTypes?.map((t: string) => t.toLowerCase()) || [];
    const typeAssignments = me.typeAssignments?.map((t: { userType?: { name: string } }) => t.userType?.name.toLowerCase()) || [];
    const allRoles = [...roles, ...userTypes, ...typeAssignments].filter((r): r is string => !!r);
    return allRoles.some(r => r === 'student' || r.includes('student'));
  }, [meDataResponse]);

  const recipientName = user?.name || "Valued Guest";
  const recipientEmail = user?.email;
  const isPersonalized = !!userIdParam;
  
  // If personalized, QR is user public_id. If general, QR is event URL.
  const qrData = isPersonalized 
    ? (user?.public_id || userIdParam || "") 
    : `${window.location.origin}/events/${id}/invitation-paper`;

  const handlePrint = () => {
    window.print();
  };


  if (isEventLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-8 animate-spin rounded-full border-4 border-[#7152f3] border-t-transparent"></div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#98a2b3]">
        <p className="text-lg font-medium">Event not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-[#7152f3] hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={`Event Ticket - ${event?.name || 'document'}`} description="View and print your official event ticket." />
      
      {/* Dashboard UI */}
      <div className="no-print">
        <PageBreadcrumb pageTitle={isPersonalized ? "Guest Ticket" : "General Invitation"} />
        
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-4">

            {/* Theme Customizer Panel - Hidden for Students */}
            {!isStudent && (
              <div className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-[#e4e7ec] shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#475467]">Theme Customizer</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {palettes.map((p) => (
                      <button
                        key={p.color}
                        onClick={() => setPrimaryColor(p.color)}
                        className={`size-6 rounded-full transition-all hover:scale-125 hover:shadow-md ${primaryColor === p.color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                        style={{ backgroundColor: p.color }}
                        title={p.name}
                      />
                    ))}
                    <div className="h-4 w-px bg-gray-200 mx-1"></div>
                    <div className="relative group">
                      <input 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="size-6 rounded-full overflow-hidden border-none cursor-pointer bg-transparent"
                      />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Custom HEX</span>
                    </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all hover:scale-110 active:scale-95 md:static md:h-auto md:w-auto md:rounded-xl md:px-5 md:py-2.5 md:text-sm md:font-semibold md:shadow-lg md:shadow-brand-500/20"
              style={{ backgroundColor: primaryColor }}
            >
              <PrinterIcon className="size-6 md:size-4 text-white" />
              <span className="hidden md:inline ml-2">Print {isPersonalized ? "Ticket" : "Invitation"}</span>
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={printRef}
        id="print-area"
        className="flex justify-center pb-12"
      >
        {isPersonalized ? (
          <PersonalizedTicket 
            event={event} 
            user={user} 
            recipientName={recipientName}
            recipientEmail={recipientEmail}
            qrData={qrData}
            primaryColor={primaryColor}
          />
        ) : (
          <GeneralInvitation 
            event={event} 
            qrData={qrData}
            primaryColor={primaryColor}
          />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              width: 100% !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body > * { visibility: hidden !important; }
            #print-area, #print-area * { visibility: visible !important; }
            
            #print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: ${isPersonalized ? '297mm' : '210mm'} !important;
              height: ${isPersonalized ? '210mm' : '297mm'} !important;
              margin: 0 !important;
              padding: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              z-index: 99999 !important;
              background: white !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            .no-print { display: none !important; }
            @page { 
              size: A4 ${isPersonalized ? 'landscape' : 'portrait'}; 
              margin: 0; 
            }
          }
      `}} />
    </>
  );
};

export default InvitationPaper;
