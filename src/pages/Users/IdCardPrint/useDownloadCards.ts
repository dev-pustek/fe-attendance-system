
import { useState } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

interface User {
    id: string;
    name: string;
    [key: string]: any;
}

interface UseDownloadCardsProps {
    printQueue: User[];
    selectedQueueIds: string[];
    printSide: 'front' | 'back' | 'both';
}

export const useDownloadCards = ({ printQueue, selectedQueueIds, printSide }: UseDownloadCardsProps) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadCards = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Preparing images...');

        try {
            // 1. Determine which users to process
            const usersToProcess = selectedQueueIds.length > 0
                ? printQueue.filter(u => selectedQueueIds.includes(u.id))
                : printQueue;

            if (usersToProcess.length === 0) {
                toast.error("No cards to download", { id: toastId });
                setIsDownloading(false);
                return;
            }

            const zip = new JSZip();
            let count = 0;

            // 2. Helper to capture a specific side
            const captureSide = async (elementId: string) => {
                const node = document.getElementById(elementId);
                
                if (!node) return null;

                // html-to-image options for better quality
                const dataUrl = await toPng(node, { 
                    quality: 1.0, 
                    pixelRatio: 4, // 300 DPI - High res for print
                    backgroundColor: '#ffffff', // Force white background
                    cacheBust: true, // Fix for CORS images sometimes being cached without headers
                    style: {
                        transform: 'scale(1)', // Ensure no zoom affects capture
                    }
                });
                return dataUrl;
            };

            // 3. Loop through users and capture
            for (const user of usersToProcess) {
                // Determine sides to capture based on global prop AND logic
                // If 'both', we expect both elements to be present.
                const sidesToCapture: ('front' | 'back')[] = 
                    printSide === 'both' ? ['front', 'back'] : [printSide];

                for (const side of sidesToCapture) {
                    try {
                        // Use pre-calculated safe ID to guarantee match with DOM
                        const safeUserId = user._safeId || String(user.id || user.public_id || user.name).replace(/[^a-zA-Z0-9-_]/g, '_');
                        const elementId = `card-${safeUserId}-${side}`;

                        const dataUrl = await captureSide(elementId);
                        if (dataUrl) {
                            // Clean base64 for zip
                            const imgData = dataUrl.split(',')[1];
                            const safeName = user.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            // Use safeUserId in filename to match the captured element and ensure uniqueness
                            const fileName = `${safeName}_${safeUserId}_${side}.png`;
                            
                            zip.file(fileName, imgData, { base64: true });
                            count++;
                        } else {
                            // If node not found, maybe retry or warn? 
                            // In 'both' mode, both DOM nodes should exist.
                            console.warn(`Node not found for ${user.name} - ${side} (ID: ${elementId})`);
                        }
                    } catch (err) {
                        console.error(`Failed to capture ${user.name} (${side})`, err);
                    }
                }
            }

            if (count === 0) {
                toast.error("Failed to generate any images", { id: toastId });
                return;
            }

            // 4. Generate and save Zip
            toast.loading(`Zipping ${count} images...`, { id: toastId });
            const blob = await zip.generateAsync({ type: 'blob' });
            
            const timestamp = new Date().toISOString().split('T')[0];
            const zipName = selectedQueueIds.length > 0 
                ? `id_cards_selected_${timestamp}.zip` 
                : `id_cards_all_${timestamp}.zip`;

            saveAs(blob, zipName);
            toast.success(`Downloaded ${count} images!`, { id: toastId });

        } catch (error) {
            console.error("Download failed", error);
            toast.error("Download failed. Check console.", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    return { downloadCards, isDownloading };
};
