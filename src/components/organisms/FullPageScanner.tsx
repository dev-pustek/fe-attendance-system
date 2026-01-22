import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronLeftIcon, CheckCircleIcon as SolidCheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface FullPageScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    status: 'idle' | 'scanning' | 'verifying' | 'success' | 'error';
    message: string | null;
    title?: string;
    subtitle?: string;
    description?: React.ReactNode;
}

const FullPageScanner = ({ 
    onScan, 
    onClose, 
    status, 
    message, 
    title = "Scanning", 
    subtitle = "Verify QR Code",
    description 
}: FullPageScannerProps) => {
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
    }, []);

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
                     {title}
                   </h1>
                   <p className="text-white/70 text-sm font-medium drop-shadow-sm">
                      {subtitle}
                   </p>
                </div>
                <div className="w-10" />
            </div>

            {/* Scanner Viewport */}
            <div className="relative w-full h-full">
                <div id="full-page-reader" ref={renderRef} className="absolute inset-0 w-full h-full bg-black" />
                <style>{`
                    #full-page-reader { position: absolute !important; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; }
                    #full-page-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
                    #full-page-reader canvas, #full-page-reader img, #full-page-reader svg { display: none !important; }
                    #qr-shaded-region { display: none !important; }
                    #full-page-reader div { box-shadow: none !important; border: none !important; }
                `}</style>

                <div className="absolute inset-0 bg-black/60 z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-3xl" />
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] z-20 pointer-events-none">
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                        <motion.div
                            initial={{ top: "-10%" }}
                            animate={{ top: "110%" }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                        >
                             <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-brand-500/30 to-transparent" />
                        </motion.div>
                    </div>

                    <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-brand-500 rounded-tl-3xl" />
                    <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-brand-500 rounded-tr-3xl" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-brand-500 rounded-bl-3xl" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-brand-500 rounded-br-3xl" />
                </div>
            </div>

            {/* Bottom Bar (Session Info) */}
            {description && (
                <div className="absolute inset-x-0 bottom-10 z-20 flex justify-center px-6 pointer-events-none">
                    {description}
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
                                    <p className="text-2xl font-medium opacity-90">{message}</p>
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

export default FullPageScanner;
