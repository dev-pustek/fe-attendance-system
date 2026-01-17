import React, { forwardRef, useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { 
    InfoIcon, 
    AlertIcon, 
    LockIcon, 
    CheckCircleIcon,
} from "../atoms/Icons";

interface IdCardProps {
  user: {
    id: string; // DOM/Mapping ID
    public_id?: string;
    name: string;
    email?: string;
    phone?: string | null;
    userTypes?: string[];
    photo?: string; // User profile photo URL
    profile?: {
      type: string;
      // Student specific
      studentId?: string;
      nisn?: string;
      nis?: string;
      placeOfBirth?: string;
      dateOfBirth?: string;
      // Employee specific
      employeeId?: string;
      nip?: string;
      department?: string;
      position?: string;
    };
    activeClass?: {
      id?: string;
      name: string;
      academicYear?: string;
    } | null;
  };
  config?: {
      organizationName?: string;
      cardTitle?: string;
      address?: string;
      contact?: string;
      website?: string;
      npsn?: string;
      helpdesk?: string;
  };
  orientation?: "landscape" | "portrait";
  primaryColor?: string;
  side?: "front" | "back"; 
  isSelected?: boolean;
  domId?: string;
}

const IdCard = forwardRef<HTMLDivElement, IdCardProps>(({ 
  user, 
  config = {},
  orientation = "landscape",
  primaryColor = "#3b82f6",
  side = "front",
  isSelected = false,
  domId,
}, ref) => {
  const isPortrait = orientation === "portrait";
  
  // Defaults
  const {
      organizationName = "SMK TI BASIL",
      website = "www.smktis.sch.id",
      npsn = "69447",
      helpdesk = "sasmita jaya group"
  } = config;

  // Image Pre-loading for Capture Reliability
  const [imgData, setImgData] = useState<string | undefined>(user.photo);

  useEffect(() => {
    if (user.photo && !user.photo.startsWith('data:')) {
        let isMounted = true;
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Try anonymous first
        img.src = user.photo;
        
        img.onload = () => {
            if (!isMounted) return;
            // Draw to canvas to get data URL
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    const dataUrl = canvas.toDataURL('image/png'); // Preserve transparency
                    setImgData(dataUrl);
                } catch (e) {
                    // Tainted canvas - stick to original URL but it might fail capture
                    console.warn("Canvas tainted, using original URL", e);
                    setImgData(user.photo);
                }
            }
        };
        img.onerror = () => {
            if (isMounted) setImgData(user.photo); // Fallback
        };

        return () => { isMounted = false; };
    } else {
        setImgData(user.photo);
    }
  }, [user.photo]);

  const containerStyle = {
    width: isPortrait ? "53.98mm" : "85.60mm",
    height: isPortrait ? "85.60mm" : "53.98mm",
  };

  const patternStyle: React.CSSProperties = {
      backgroundImage: `
        radial-gradient(at 0% 0%, ${primaryColor}10 0px, transparent 50%),
        radial-gradient(at 100% 0%, ${primaryColor}10 0px, transparent 50%),
        radial-gradient(at 100% 100%, ${primaryColor}05 0px, transparent 50%),
        radial-gradient(at 0% 100%, ${primaryColor}05 0px, transparent 50%)
      `,
      backgroundSize: '100% 100%',
      opacity: 0.8,
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
  };

  return (
    <div 
      ref={ref} 
      id={domId}
      className={`relative bg-white rounded-lg overflow-hidden shadow-sm border transition-all duration-200 print:shadow-none print:border print:border-gray-200 select-none text-gray-900 font-sans ${isSelected ? 'ring-4 ring-brand-500 ring-offset-2 border-brand-500' : 'border-gray-200'}`}
      style={{ ...containerStyle, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
        {side === "back" ? (
            <div className="flex flex-col h-full relative overflow-hidden bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '100%', height: '100%' }}>
                {/* Background Design */}
                <div className="absolute inset-0 z-0" style={patternStyle}></div>
                
                {/* Decorative stripes */}
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: primaryColor }}></div>
                <div className="absolute bottom-0 left-0 w-full h-1 shadow-inner" style={{ backgroundColor: primaryColor, opacity: 0.2 }}></div>

                <div className="relative z-10 flex flex-col h-full p-4">
                    {/* Back Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-0.5">
                            <h4 className="text-[10px] font-bold text-gray-900 leading-none">KETENTUAN KARTU</h4>
                            <div className="w-8 h-0.5" style={{ backgroundColor: primaryColor }}></div>
                            {isPortrait && config.cardTitle && (
                                <span className="text-[7px] font-bold text-gray-800 uppercase tracking-widest mt-1">
                                    {config.cardTitle}
                                </span>
                            )}
                        </div>
                        <div className="text-[8px] font-bold text-gray-400 font-mono">{npsn}</div>
                    </div>

                    <div className="flex-1 overflow-hidden mt-0.5">
                        <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                            {[
                                { text: "Kartu ini adalah milik instansi dan wajib dibawa setiap saat.", icon: LockIcon },
                                { text: "Penyalahgunaan kartu ini dapat dikenakan sanksi sesuai aturan.", icon: AlertIcon },
                                { text: "Jika menemukan kartu ini, mohon kembalikan ke alamat tertera.", icon: InfoIcon },
                                { text: "Kartu ini digunakan untuk akses absensi dan fasilitas lainnya.", icon: CheckCircleIcon }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 group">
                                    <div className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors duration-200" style={{ backgroundColor: `${primaryColor}15` }}>
                                        <item.icon className="w-2.5 h-2.5" style={{ color: primaryColor }} />
                                    </div>
                                    <span className="text-[7.5px] leading-tight text-gray-600 font-medium group-hover:text-gray-900 transition-colors duration-200">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-1 pt-1 border-t border-gray-100">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[6px] font-medium text-gray-400 uppercase tracking-tighter">Information & Helpdesk</p>
                                <p className="text-[7px] font-bold text-gray-700">{helpdesk}</p>
                                <p className="text-[6px] font-medium text-gray-500">{website}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-right">
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                    <span className="text-[6px] font-bold text-gray-800 uppercase line-clamp-1">{organizationName}</span>
                                </div>
                                {config.address && (
                                    <p className="text-[4.5px] text-gray-400 font-medium leading-[1.2] max-w-[120px] italic">{config.address}</p>
                                )}
                                {config.contact && (
                                    <p className="text-[5px] text-gray-400 font-bold leading-none">{config.contact}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Corner Decoration */}
                <div className="absolute -bottom-8 -right-8 w-16 h-16 rounded-full opacity-10 blur-xl" style={{ backgroundColor: primaryColor }}></div>
            </div>
        ) : (
            // ================= FRONT SIDE =================
            <>
                {isPortrait ? (
                    <div id={`card-${user.id}-${side}`} className="flex flex-col h-full relative overflow-hidden bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '100%', height: '100%' }}>
                        {/* Background Patterns - Modern mesh gradient instead of dots */}
                        <div className="absolute inset-0 z-0 bg-white"></div>
                        <div className="absolute inset-0 z-0" style={patternStyle}></div>
                        
                        {/* Subtle geometric accents */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full border-[1px] border-gray-100/50 z-0"></div>
                        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full border-[1px] border-gray-100/30 z-0"></div>

                        <div className="absolute top-0 left-0 w-full h-[28%] bg-gradient-to-b from-white/10 to-transparent z-0"></div>
                        
                        <div className="absolute top-0 left-0 w-full h-[26%] z-0 overflow-hidden">
                            <svg viewBox="0 0 350 160" className="w-full h-full" preserveAspectRatio="none">
                                <path d="M0,0 L350,0 L350,80 Q175,120 0,80 Z" fill={primaryColor} />
                            </svg>
                            <div className="absolute top-3 left-0 w-full flex justify-center">
                                <div className="flex items-center gap-1.5 text-white/95">
                                    <img src="/logo-pwa.png" alt="Logo" className="w-4 h-4 rounded bg-white/20 p-0.5" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-shadow-sm">{organizationName}</span>
                                        {user.profile?.type === 'student' && user.activeClass?.academicYear && (
                                            <span className="text-[6px] font-medium opacity-80 leading-none mt-0.5">
                                                {user.activeClass.academicYear.replace(/Academic Year /g, '')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Container - Tightened Margins */}
                        <div className="relative z-10 flex flex-col items-center justify-start w-full px-4 pt-10">
                            
                            {/* Photo: Rounded Rectangle, Even smaller to fit */}
                            <div className="w-[24mm] h-[30mm] bg-white rounded-xl p-0.5 shadow-sm mb-2 rotate-0">
                                <div className="w-full h-full rounded-lg bg-gray-100 overflow-hidden">
                                    {imgData ? (
                                        <img 
                                            src={imgData} 
                                            alt={user.name} 
                                            className="w-full h-full object-cover" 
                                            crossOrigin="anonymous" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date of Birth Section */}
                            {(user.profile?.dateOfBirth) && (
                                <div className="text-[7px] text-gray-500 font-bold mb-2 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                    <span>Tgl Lahir :</span>
                                    <span className="text-gray-900">{user.profile.dateOfBirth}</span>
                                </div>
                            )}

                            <div className="text-center w-full mb-2">
                                <h2 className="text-[14px] font-bold text-gray-900 leading-tight mb-1">{user.name}</h2>
                                <div className="flex flex-col gap-0.5">
                                    {user.profile?.type === 'student' ? (
                                        <>
                                            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-wide">
                                                {user.activeClass?.name || "SISWA"}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-wide">
                                                {user.profile?.department || "PEGAWAI"}
                                            </span>
                                            <span className="text-[7px] font-medium text-gray-400">
                                                {user.profile?.position}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Bottom Section: FORCED BOTTOM VISIBILITY */}
                        <div className="absolute bottom-0 left-0 w-full pb-3 px-3">
                            <div className="w-full border-t border-dashed border-gray-300 pt-2 flex items-center justify-between">
                                <div className="shrink-0 bg-white p-0.5 rounded">
                                    <QRCode
                                        size={36}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        value={user.public_id || user.email || "user-id"}
                                        viewBox={`0 0 256 256`}
                                        fgColor="#1f2937"
                                    />
                                </div>
                                <div className="flex-1 text-right pl-3">
                                    {user.profile?.type === 'employee' ? (
                                        <div className="flex flex-col">
                                            <p className="text-[5.5px] font-bold text-gray-400 uppercase mb-0.5 leading-none">EMPLOYEE ID</p>
                                            <p className="text-[7.5px] font-bold text-gray-800 font-mono tracking-wide leading-none">{user.profile.employeeId || "-"}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <p className="text-[5.5px] font-bold text-gray-400 uppercase mb-0.5 leading-none">NIS / NISN</p>
                                            <p className="text-[7.5px] font-bold text-gray-800 font-mono tracking-wide leading-none">
                                                {user.profile?.nis || "-"} / {user.profile?.nisn || "-"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // ================= LANDSCAPE SIDE =================
                    <div className="flex h-full relative overflow-hidden bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '100%', height: '100%' }}>
                        <div className="absolute inset-0 z-0 bg-white"></div>
                        <div className="absolute inset-0 z-0" style={patternStyle}></div>
                        
                        {/* Decorative side accent */}
                        <div className="absolute top-0 left-0 w-1 h-full shadow-sm" style={{ backgroundColor: primaryColor }}></div>

                        <div className="absolute top-0 right-0 h-full w-[45%] z-0">
                            <svg viewBox="0 0 250 350" className="w-full h-full" preserveAspectRatio="none">
                                <path d="M80,0 L250,0 L250,350 L80,350 Q-10,175 80,0 Z" fill={primaryColor} opacity="0.1" />
                                <path d="M120,0 L250,0 L250,350 L120,350 Q40,175 120,0 Z" fill={primaryColor} />
                            </svg>
                        </div>

                        <div className="relative z-10 flex w-full h-full">
                            <div className="flex-1 p-4 flex flex-col justify-center pl-6">
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <img src="/logo-pwa.png" alt="Logo" className="w-5 h-5 rounded shadow-sm" />
                                    <div className="flex flex-col">
                                        <div className="text-[7px] font-bold uppercase tracking-widest text-gray-500">{organizationName}</div>
                                        {user.profile?.type === 'student' && user.activeClass?.academicYear && (
                                            <div className="text-[5px] font-bold text-gray-400 leading-none">
                                                {user.activeClass.academicYear.replace(/Academic Year /g, '')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h1 className="text-[14px] font-bold text-gray-900 leading-none mb-1">{user.name}</h1>
                                <div className="flex items-center gap-1.5 mb-3">
                                    {user.profile?.type === 'student' ? (
                                        <>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">{user.activeClass?.name || "SISWA"}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">{user.profile?.department || "PEGAWAI"}</span>
                                            <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
                                            <span className="text-[8px] font-medium text-gray-400">{user.profile?.position}</span>
                                        </>
                                    )}
                                </div>

                                <div className="mt-auto border-t border-gray-200 pt-2 flex items-center gap-3">
                                    {/* QR Code moved here */}
                                    <div className="bg-white p-0.5 rounded border border-gray-100">
                                        <QRCode
                                            size={40}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            value={user.public_id || user.email || "user-id"}
                                            viewBox={`0 0 256 256`}
                                            fgColor="#1f2937"
                                        />
                                    </div>

                                    <div>
                                        {user.profile?.type === 'employee' ? (
                                            <>
                                                <p className="text-[6px] font-bold text-gray-400 uppercase mb-0.5">EMPLOYEE ID</p>
                                                <p className="text-[9px] font-bold text-gray-800 font-mono tracking-wide">{user.profile.employeeId || "-"}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[6px] font-bold text-gray-400 uppercase mb-0.5">NIS / NISN</p>
                                                <p className="text-[9px] font-bold text-gray-800 font-mono tracking-wide">
                                                    {user.profile?.nis || "-"} / {user.profile?.nisn || "-"}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="w-[35%] flex flex-col items-center justify-center pt-2 text-white p-3">
                                {!isPortrait && config.cardTitle && (
                                    <div className="text-[7px] font-bold uppercase text-white tracking-widest leading-none mb-1.5 text-center">
                                        {config.cardTitle}
                                    </div>
                                )}
                                <div className="w-[20mm] h-[26mm] bg-white rounded-lg p-0.5 shadow-md mb-2">
                                    <div className="w-full h-full rounded-md bg-gray-100 overflow-hidden">
                                        {user.photo ? (
                                            <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Landscape DOB */}
                                {user.profile?.dateOfBirth && (
                                    <div className="text-[6px] font-bold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded flex flex-col items-center">
                                        <span className="opacity-70 uppercase text-[4px]">Tgl Lahir</span>
                                        <span>{user.profile.dateOfBirth}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
    </div>
  );
});

IdCard.displayName = "IdCard";

export default React.memo(IdCard);
