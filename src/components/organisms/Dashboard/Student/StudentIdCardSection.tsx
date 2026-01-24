import { useMemo } from "react";
import IdCard from "../../../molecules/IdCard";
import { useDownloadCards } from "../../../../pages/Users/IdCardPrint/useDownloadCards";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Button from "../../../atoms/Button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function StudentIdCardSection({ user }: { user: any }) {
    // Construct user object for IdCard component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userForCard: any = useMemo(() => {
        if (!user) return null;
        const safeId = String(user.public_id || user.id).replace(/[^a-zA-Z0-9-_]/g, '_');
        return {
            ...user,
            id: user.id || safeId, // internal ID
            _safeId: safeId, // For useDownloadCards matching
            // Ensure profile exists even if partial, though authenticating student should have it
            profile: user.profile || { type: 'student' }
        };
    }, [user]);

    const { downloadCards, isDownloading } = useDownloadCards({
        printQueue: userForCard ? [userForCard] : [],
        selectedQueueIds: userForCard ? [userForCard.id] : [],
        printSide: 'both'
    });

    if (!userForCard) return null;

    // We must match the DOM IDs exactly as useDownloadCards expects: `card-${safeUserId}-${side}`
    const safeUserId = userForCard._safeId;
    
    return (
        <div className="relative">
            {/* Download Button: Floating on Mobile, Static/Inline on Desktop */}
            <div className="fixed bottom-6 right-6 z-50 md:absolute md:top-0 md:right-0 md:bg-transparent md:static md:flex md:justify-end md:mb-4">
                 <Button 
                    variant="primary" // Changed to primary for better FAB visibility
                    size="sm" 
                    onClick={() => downloadCards()}
                    isLoading={isDownloading}
                    disabled={isDownloading}
                    className="rounded-full h-14 w-14 p-0 flex items-center justify-center shadow-2xl md:shadow-none md:h-auto md:w-auto md:rounded-lg md:px-4 md:py-2 md:aspect-auto"
                 >
                    <ArrowDownTrayIcon className="size-6 text-white md:size-4" />
                    <span className="hidden md:inline md:ml-2">Download ID Card</span>
                 </Button>
            </div>

            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 custom-scrollbar">
                <div className="flex flex-col sm:flex-row items-start lg:items-center justify-center gap-6 min-w-max sm:min-w-0">
                    {/* Front */}
                    <div className="flex flex-col items-center gap-2">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:block">Front Side</span>
                         <IdCard 
                            user={userForCard} 
                            side="front" 
                            domId={`card-${safeUserId}-front`}
                            config={{ organizationName: "SMK AL AMANAH" }} 
                            primaryColor="#3b82f6" 
                         />
                    </div>

                    {/* Back */}
                    <div className="flex flex-col items-center gap-2">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:block">Back Side</span>
                         <IdCard 
                            user={userForCard} 
                            side="back" 
                            domId={`card-${safeUserId}-back`}
                             config={{ organizationName: "SMK AL AMANAH" }}
                             primaryColor="#3b82f6"
                         />
                    </div>
                </div>
            </div>
            
            <p className="mt-4 text-[10px] text-gray-400 text-center italic opacity-60">
                * Official Student Identity Card. Valid for current academic year.
            </p>
        </div>
    );
}
