import React, { useState, useRef, useEffect, useMemo } from "react";
import { toast } from 'react-hot-toast';
import { useSearchParams, useNavigate } from "react-router";
import { useUsers } from "../../../api/hooks/useUsers";
import { useClasses } from "../../../api/hooks/useAcademic";
import { useDownloadCards } from "./useDownloadCards";
import PageMeta from "../../../components/atoms/PageMeta";
import { ChevronLeftIcon, GridIcon, SearchIcon, CloseIcon, PlugInIcon, PlusIcon, EditIcon, TrashBinIcon, CheckLineIcon, UserIcon, DownloadIcon } from "../../../components/atoms/Icons";
import IdCard from "../../../components/molecules/IdCard";
import { Modal } from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";

interface User {
    id?: string; // Internal/Local ID (Optional)
    public_id: string; // PUBLIC ID IS THE PRIMARY KEY
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
    userTypes?: string[];
    img_url?: string; // Standard API field for photos
    photo?: string;
    profile?: {
        type: string;
        // Student
        studentId?: string;
        nisn?: string;
        nis?: string;
        placeOfBirth?: string;
        dateOfBirth?: string;
        // Employee
        employeeId?: string;
        nip?: string;
        department?: string;
        position?: string;
    } | null;
    activeClass?: {
        id?: string;
        name: string;
        academicYear?: string;
    } | null;
}



export default function IdCardPrint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idsParam = searchParams.get("ids");
  
  // ================= SETTINGS STATE =================
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [printSide, setPrintSide] = useState<"front" | "back" | "both">("front");
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'design' | 'content'>('users'); 
  
  // Dynamic Content State
  const [config, setConfig] = useState({
      organizationName: "SMK AL AMANAH",
      cardTitle: "E - STUDENT - CARD",
      address: "Jl. Pendidikan No. 1, Tangerang Selatan",
      contact: "call 021.7412566",
      website: "www.smkalamanahs.sch.id",
      helpdesk: "PT MENCARI CINTA SEJATI"
  });
  
  // ----- STATE -----
  // Queue & Selection
  const [printQueue, setPrintQueue] = useState<(User | null)[]>([]); // Allow null for ghost slots
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]); // Selection within the print queue (uses public_id)
  
  // Add User Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalClassId, setModalClassId] = useState("all");
  const [modalSelectedIds, setModalSelectedIds] = useState<string[]>([]); // Transient selection (uses public_id)

  // Image Adjustment Modal
  // const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  // const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
  // const [imageAdjustments, setImageAdjustments] = useState<Record<string, ImageAdjustment>>({});

  // Global Data Fetch (Only used for Modal now)
  const { data: classesData } = useClasses({ limit: 100 });
  const classes = classesData?.data || [];
  const { users, isLoading } = useUsers({
    search: modalSearchQuery,
    class_id: modalClassId === "all" ? undefined : Number(modalClassId),
    page: 1,
    limit: 100, // Fetch more for modal selection
    withProfile: true,
  });

  // Initialize printQueue from URL params if available
  useEffect(() => {
    if (idsParam && idsParam !== "all" && users.length > 0 && printQueue.length === 0) {
      const ids = idsParam.split(",");
      const initialUsers = users.filter((u: User) => ids.includes(u.public_id) || (u.id && ids.includes(u.id)));
      setPrintQueue(initialUsers);
    }
  }, [idsParam, users, printQueue.length]); // Depend on users to ensure they are loaded

  const getClassName = (user: User) => {
      if (user.activeClass?.name) return user.activeClass.name;
      if (user.profile?.type === 'employee') return user.profile.department || "Staff";
      return "Student";
  };

  // ----- HANDLERS -----

  // Modal Handlers
  const handleOpenAddUserModal = () => {
      setModalSelectedIds([]); // Reset modal selection
      setModalSearchQuery("");
      setModalClassId("all");
      setIsAddUserModalOpen(true);
  };

  const handleAddToQueue = () => {
      // Use public_id for robust identification
      const usersToAdd = users.filter((u: User) => modalSelectedIds.includes(String(u.public_id)));
      
      setPrintQueue(prev => {
          const validPrev = prev.filter((u): u is User => u !== null);
          const existingIds = new Set(validPrev.map(u => String(u.public_id)));
          
          const newUsers = usersToAdd.filter((u: User) => !existingIds.has(String(u.public_id)));
          return [...validPrev, ...newUsers]; 
      });
      setIsAddUserModalOpen(false);
      
      // Auto-switch to Users tab if not active
      if (activeTab !== 'users') setActiveTab('users');
  };

  const handleRemoveFromQueue = (userId: string) => {
      // Cleanest way: Just filter out the valid users. 
      // userId here refers to public_id
      setPrintQueue(prev => prev.filter(u => u && String(u.public_id) !== userId));
      setSelectedQueueIds(prev => prev.filter(id => id !== userId)); 
      
      setCardOffsets(prev => {
          const newOffsets = { ...prev };
          const frontKey = `${userId}-front`;
          const backKey = `${userId}-back`;
          delete newOffsets[frontKey];
          delete newOffsets[backKey];
          return newOffsets;
      });
  };

  const handleBulkRemoveFromQueue = () => {
    if (selectedQueueIds.length === 0) return;
    
    setPrintQueue(prev => prev.filter(u => u && !selectedQueueIds.includes(String(u.public_id))));
    
    setCardOffsets(prev => {
        const newOffsets = { ...prev };
        selectedQueueIds.forEach(userId => {
            delete newOffsets[`${userId}-front`];
            delete newOffsets[`${userId}-back`];
        });
        return newOffsets;
    });
    
    setSelectedQueueIds([]);
    toast.success(`Removed ${selectedQueueIds.length} users from queue`);
  };


  // Canvas Selection Handlers
  const toggleQueueSelection = (id: string) => {
    setSelectedQueueIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };
  
  const handleResetLayout = () => {
    setPrintQueue(prev => prev.filter((u): u is User => u !== null));
    setCardOffsets({});
    setActiveCardId(null);
    toast.success("Cards restructured & positions reset");
  };
  



  // Download Logic
    // Pre-calculate safe IDs to ensure synchronization between Render and Download
    // Pre-calculate safe IDs to ensure synchronization between Render and Download
    const refinedQueue = useMemo(() => {
        return printQueue.filter((user): user is User => user !== null).map((user, index) => {
            // Use public_id as primary, fallback to safe name for legacy
            const rawId = user.public_id || user.name || `user-${index}`;
            const safeId = String(rawId).replace(/[^a-zA-Z0-9-_]/g, '_');
            return {
                ...user,
                _safeId: safeId,
                id: user.id || safeId // Ensure id exists even if it was undefined
            };
        });
    }, [printQueue]);

    const { downloadCards, isDownloading } = useDownloadCards({ 
        printQueue: refinedQueue, // Pass refined queue with safe IDs
        selectedQueueIds, 
        printSide 
    });
  const [zoom, setZoom] = useState(1.2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Individual Card Moving Logic
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [cardOffsets, setCardOffsets] = useState<Record<string, { x: number, y: number }>>({});
  const [cardColors, setCardColors] = useState<Record<string, string>>({}); 
  // Undo Handling
  const [, setHistory] = useState<Array<Record<string, { x: number, y: number }>>>([]);

  const startPan = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false); // Track if a drag occurred during mouse down/up
  
  // Keyboard Shortcuts: Delete & Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;

      // Undo (Ctrl/Command + Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          setHistory(prev => {
              const newHistory = [...prev];
              const lastState = newHistory.pop();
              if (lastState) {
                  setCardOffsets(lastState);
              }
              return newHistory;
          });
          return;
      }

      // Delete (Backspace / Delete)
      if (e.key === 'Backspace' || e.key === 'Delete') {
          if (activeCardId) {
              const userId = activeCardId.split('-')[0];
              // If active card is also in selected list, remove all selected
              if (selectedQueueIds.includes(userId)) {
                  // Replace selected with nulls to keep positions
                  setPrintQueue(prev => prev.map(u => (u && selectedQueueIds.includes(u.public_id)) ? null : u));
                  setSelectedQueueIds([]);
                  setActiveCardId(null);
                  toast.success("Users deleted (slots preserved)");
              } else {
                  // Remove single active card (replace with null)
                  setPrintQueue(prev => prev.map(u => (u && u.public_id === userId) ? null : u));
                  setActiveCardId(null);
                  toast.success("User deleted (slot preserved)");
              }
          } else if (selectedQueueIds.length > 0) {
              setPrintQueue(prev => prev.map(u => (u && selectedQueueIds.includes(u.public_id)) ? null : u));
              setSelectedQueueIds([]);
              toast.success(`${selectedQueueIds.length} users deleted (slots preserved)`);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQueueIds, activeCardId]); // History not needed as dep because functional update used
  const startCardPos = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Shortcuts for Zoom
  useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey)) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    setZoom(z => Math.min(z + 0.1, 4));
                } else if (e.key === '-') {
                    e.preventDefault();
                    setZoom(z => Math.max(z - 0.1, 0.5));
                } else if (e.key === '0') {
                    e.preventDefault();
                    setZoom(1.0);
                    setPan({x:0, y:0});
                }
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom(z => {
                    const newZoom = z - e.deltaY * 0.01;
                    return Math.min(Math.max(newZoom, 0.5), 4);
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('wheel', handleWheel);
        };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      hasDragged.current = false; // Reset drag flag
      
      if (activeCardId) return; 
      
      // Default: Pan the canvas
      setIsDragging(true);
      startPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCardMouseDown = (e: React.MouseEvent, instanceId: string) => {
      hasDragged.current = false; // Reset drag flag

      if (activeCardId === instanceId) {
          e.stopPropagation(); // Don't pan canvas
          setIsDragging(true); // Reuse drag state but context matters
          // Save current state to history before moving
          
          const currentOffset = cardOffsets[instanceId] || { x: 0, y: 0 };
          startCardPos.current = { x: e.clientX - currentOffset.x, y: e.clientY - currentOffset.y };
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      hasDragged.current = true; // Mark as dragged

      if (activeCardId) {
          // Moving specific card
          setCardOffsets(prev => ({
              ...prev,
              [activeCardId]: {
                  x: e.clientX - startCardPos.current.x,
                  y: e.clientY - startCardPos.current.y
              }
          }));
      } else {
          // Panning Canvas
          setPan({ x: e.clientX - startPan.current.x, y: e.clientY - startPan.current.y });
      }
  };

  const handleMouseUp = () => setIsDragging(false);



  // New Helper for Color Selection
  const handleColorSelect = (color: string) => {
      if (activeCardId) {
          // Priority 1: If dragging/editing a specific card
          const userId = activeCardId.split('-')[0];
          setCardColors(prev => ({ ...prev, [userId]: color }));
      } else if (selectedQueueIds.length > 0) {
           // Priority 2: If users are selected (Single Click)
           setCardColors(prev => {
               const next = { ...prev };
               selectedQueueIds.forEach(id => { next[id] = color; });
               return next;
           });
      } else {
          // Priority 3: Global Change
          setPrimaryColor(color);
      }
  };


  return (
    <>
      <PageMeta title="Print ID Cards" description="Generate and print user identity cards." />

      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        


        <div className="flex-1 flex overflow-hidden relative min-h-0">
            <main 
                ref={containerRef}
                className={`flex-1 overflow-hidden bg-gray-200/50 dark:bg-gray-900/50 printable-area relative select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            >
                {isLoading && printQueue.length === 0 ? ( // Only show loading if no items in queue yet
                    <div className="h-full flex items-center justify-center">
                         <div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : printQueue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <GridIcon className="size-10 opacity-30 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-600 text-lg">Print Queue is Empty</h3>
                        <p className="text-sm text-gray-400 max-w-xs text-center mt-1">
                            Click "Add Users" in the sidebar to select students for printing.
                        </p>
                        <button 
                            onClick={handleOpenAddUserModal}
                            className="mt-6 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <PlusIcon className="size-5" />
                            Add Users
                        </button>
                    </div>
                ) : (
                    <div 
                        style={{ 
                            marginLeft: pan.x, 
                            marginTop: pan.y,
                            transform: `scale(${zoom})`, 
                            transformOrigin: "top left", 
                            transition: isDragging ? "none" : "all 0.1s ease-out"
                        }}
                        className={`inline-block p-10 min-w-full min-h-full ${isDragging && !activeCardId ? "cursor-grabbing" : !activeCardId ? "cursor-grab" : ""}`}
                        onMouseDown={(e) => {
                           // If clicking empty space (not a card), start panning
                           if (e.target === e.currentTarget) {
                              if (activeCardId) return; // Fix: Prevent active card from jumping when clicking background
                              setIsDragging(true);
                              startPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                           }
                           // Deselect all if clicking empty space (and not panning?)
                           // Actually, click vs drag. 
                        }}

                        onClick={() => {
                             // Do nothing on single click now, per user request to keep editing active
                        }}
                        onDoubleClick={(e) => {
                            // Clear only on Double Click (2 times)
                            if (e.target === e.currentTarget) {
                                setActiveCardId(null);
                                setSelectedQueueIds([]);
                            }
                        }}
                    >
                        <div className={`max-w-[1200mm] grid gap-4 print:block bg-white/0 ${
                            // Dynamic Grid System
                            printSide === 'both' 
                                ? orientation === 'landscape' 
                                     ? "grid-cols-1 xl:grid-cols-1 2xl:grid-cols-2" 
                                     : "grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3" 
                                : orientation === 'landscape'
                                     ? "grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" // Improved for Single Landscape
                                     : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" // Portrait Single
                        }`}
                        style={{
                            transform: `scale(${zoom})`,
                            width: 'fit-content'
                        }}
                        >
                            {refinedQueue.map((user) => {
                                // Use the pre-calculated safe ID
                                const safeUserId = user._safeId;
                                const getDomId = (s: string) => `card-${safeUserId}-${s}`;
                                
                                const isSelected = selectedQueueIds.includes(user.id);
                                const userColor = cardColors[user.id] || primaryColor;

                                const cardProps = {
                                    user: {
                                        id: user.id,
                                        public_id: user.public_id,
                                        name: user.name,
                                        email: user.email || "",
                                        phone: user.phone,
                                        userTypes: user.userTypes,
                                        photo: (user as any).photo,
                                        profile: user.profile || undefined,
                                        activeClass: (user as any).activeClass
                                    },
                                    config,
                                    orientation,
                                    side: "front" as "front" | "back", 
                                    primaryColor: userColor, 
                                    isSelected: isSelected, 
                                };

                                // Helper to render a moveable card wrapper
                                const renderMoveableCard = (side: "front" | "back", label?: string) => {
                                    const instanceId = `${user.id}-${side}`;
                                    const isActive = activeCardId === instanceId;
                                    const offset = cardOffsets[instanceId] || { x: 0, y: 0 };
                                    // Use transform for performance, zIndex for layering
                                    const style: React.CSSProperties = {
                                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                                        zIndex: isActive ? 50 : 1, // Active card on top
                                        cursor: isDragging && isActive ? "grabbing" : "grab",
                                        willChange: isDragging && isActive ? "transform" : "auto",
                                        position: 'relative' // Ensure z-index works
                                    };
                                    
                                    return (
                                        <div
                                            key={instanceId}
                                            onMouseDown={(e) => {
                                                // 1. Handle Active Editing Mode Switching
                                                if (activeCardId && activeCardId !== instanceId) {
                                                    setActiveCardId(null); // Close editing for previous card
                                                }

                                                // 2. Handle Selection Logic (Exclusive vs Toggle)
                                                if (selectedQueueIds.includes(user.id)) {
                                                    // If already selected, deselect it (Toggle)
                                                    setSelectedQueueIds(prev => prev.filter(id => id !== user.id));
                                                } else {
                                                    // If not selected, select ONLY this one (Exclusive)
                                                    setSelectedQueueIds([user.id]);
                                                }

                                                handleCardMouseDown(e, instanceId);
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setActiveCardId(instanceId);
                                                // Double click ensures this one is selected exclusively too
                                                if (!selectedQueueIds.includes(user.id)) {
                                                    setSelectedQueueIds([user.id]);
                                                }
                                            }}
                                            style={style}
                                            className={`relative origin-center 
                                                ${isActive ? 'transition-none ring-2 ring-dashed ring-blue-500 ring-offset-2 cursor-move' : 'transition-all duration-200'}
                                                ${!isActive && label ? 'group-hover:ring-2 group-hover:ring-gray-300 rounded-xl' : ''}
                                            `}
                                        >
                                            {label && (
                                                <span className="absolute -top-3 left-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 rounded-full border border-gray-200 print:hidden z-[60] pointer-events-none shadow-sm">
                                                    {label}
                                                </span>
                                            )}
                                            <IdCard {...cardProps} side={side} domId={getDomId(side)} />
                                        </div>
                                    );
                                };
                                
                                return (
                                    <div 
                                        key={user.id}
                                        className={`inline-block mb-4 break-inside-avoid origin-center transition-opacity
                                            ${isSelected ? 'opacity-100 z-10' : 'opacity-80'}
                                        `}
                                    >
                                        {/* Render Both Sides Tied Together */}
                                        {printSide === "both" ? (
                                            <div className="inline-flex flex-col sm:flex-row gap-4 print:gap-1 items-center sm:items-start group p-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand-500 hover:bg-brand-50/20 transition-all print:border-none print:p-0 w-fit">
                                                {renderMoveableCard("front", "Front")}
                                                {renderMoveableCard("back", "Back")}
                                            </div>
                                        ) : (
                                            // Render Single Side (still moveable)
                                            <div className="inline-block">
                                                 {renderMoveableCard(printSide as "front" | "back")}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
                
            </main>

            {/* ================= FLOATING TOOLBAR (FIXED CENTER BOTTOM) ================= */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 dark:border-gray-700 rounded-full shadow-2xl border border-gray-200 p-1.5 flex items-center gap-1 no-print animate-slideUp">
                {/* Settings Toggle */}
                <button 
                    onClick={() => setIsSheetOpen(!isSheetOpen)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 text-gray-700 dark:text-gray-200 ${isSheetOpen ? "bg-gray-100 dark:bg-gray-700 text-gray-900" : ""}`}
                    title="Toggle Print Settings"
                >
                    <PlugInIcon className="size-5" />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                {/* Zoom Controls */}
                <div className="flex items-center">
                     <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="w-9 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-bold text-lg flex items-center justify-center">-</button>
                     <span className="w-12 text-center text-xs font-bold text-gray-800 dark:text-white tabular-nums">{Math.round(zoom * 100)}%</span>
                     <button onClick={() => setZoom(z => Math.min(z + 0.2, 4))} className="w-9 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-bold text-lg flex items-center justify-center">+</button>
                </div>
                
                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                
                <button onClick={() => { setZoom(1.2); setPan({x:0,y:0}) }} className="px-3 h-10 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-500 transition-colors" title="Reset Zoom & Pan">
                    Center
                </button>
                
                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                <button 
                  onClick={handleResetLayout} 
                  className="flex items-center gap-2 px-3 h-10 hover:bg-brand-50 hover:text-brand-600 rounded-lg text-xs font-bold text-gray-500 transition-all active:scale-95"
                  title="Restructure Layout (Clear Ghost Slots & Movements)"
                >
                    <GridIcon className="size-4" />
                    <span>Restructure</span>
                </button>
                
                {selectedQueueIds.length > 0 && (
                    <>
                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                        <button onClick={() => setSelectedQueueIds([])} className="px-3 h-10 hover:bg-red-50 text-red-500 rounded-lg text-xs font-bold transition-colors">
                            Deselect All ({selectedQueueIds.length})
                        </button>
                    </>
                )}

                {/* Edit Mode & Status */}
                {(activeCardId || selectedQueueIds.length > 0) && (
                     <>
                        <div className="h-6 w-px bg-gray-200 mx-1"></div>
                        <div className="px-2 flex items-center gap-3 animate-fadeIn">
                             {activeCardId && (
                                <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-yellow-600 flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100">
                                         <span className="size-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                         Editing Pos
                                     </span>
                                     <button onClick={() => { setActiveCardId(null); setCardOffsets(prev => { const newOffsets = {...prev}; delete newOffsets[activeCardId]; return newOffsets; }) }} className="size-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors" title="Reset Position">
                                         <CloseIcon className="size-3.5" />
                                     </button>
                                </div>
                             )}
                             {selectedQueueIds.length > 0 && (
                                 <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-md border border-brand-100">{selectedQueueIds.length} Selected</span>
                             )}
                        </div>
                     </>
                )}
            </div>

            <aside 
                className={`w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform flex flex-col no-print fixed right-0 top-16 bottom-0 z-30 shadow-2xl transform ${isSheetOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="p-4 pt-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/users/list")} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                            <ChevronLeftIcon className="size-5" />
                        </button>
                        <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            Print Settings
                        </h2>
                    </div>
                    <button onClick={() => setIsSheetOpen(false)} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500">
                        <CloseIcon className="size-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 w-full sticky top-0 bg-white z-10">
                         <button 
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'users' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                         >
                            Users
                         </button>
                         <button 
                            onClick={() => setActiveTab('design')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'design' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                         >
                            Design
                         </button>
                         <button 
                            onClick={() => setActiveTab('content')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'content' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                         >
                            Content
                         </button>
                    </div>

                    <div className="p-6">
                        {/* ================= USERS TAB (PRINT QUEUE) ================= */}
                        {activeTab === 'users' && (
                            <div className="space-y-6 animate-fadeIn h-full flex flex-col">
                                {/* Header / Add Button */}
                                <div>
                                    <button 
                                        onClick={handleOpenAddUserModal}
                                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <div className="bg-white/20 p-1 rounded-md group-hover:bg-white/30">
                                            <PlusIcon className="size-4" />
                                        </div>
                                        Add Users to Queue
                                    </button>
                                </div>

                                {/* Queue Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Print Queue
                                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{printQueue.length}</span>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {selectedQueueIds.length > 0 && (
                                            <button 
                                                onClick={handleBulkRemoveFromQueue} 
                                                className="text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 px-2 py-1 rounded-md transition-colors"
                                            >
                                                Remove Selected ({selectedQueueIds.length})
                                            </button>
                                        )}
                                        {printQueue.length > 0 && (
                                            <button onClick={() => setPrintQueue([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 ml-2">
                                                Clear Queue
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Queue List */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                     {printQueue.map((user, idx) => {
                                         if (!user) return null; // Don't show ghost slots in sidebar
                                         const isSelected = selectedQueueIds.includes(user.public_id);
                                         return (
                                             <div 
                                                 key={user.public_id} 
                                                 className={`group flex items-center gap-3 p-2 rounded-lg border transition-all hover:shadow-sm ${isSelected ? "bg-brand-50 border-brand-200" : "bg-white border-gray-100"}`}
                                             >
                                                 <div 
                                                     className="cursor-pointer flex-1 flex items-center gap-3"
                                                     onClick={() => toggleQueueSelection(user.public_id)}
                                                 >
                                                     <span className="text-xs font-bold text-gray-300 w-4">{idx + 1}</span>
                                                     <div className="flex-1 min-w-0">
                                                         <p className={`text-sm font-medium truncate ${isSelected ? "text-brand-900" : "text-gray-700"}`}>{user.name}</p>
                                                         <p className="text-xs text-gray-400 truncate">{user.email || user.public_id || "No Email"}</p>
                                                     </div>
                                                 </div>
                                                 
                                                 <button 
                                                     onClick={() => handleRemoveFromQueue(user.public_id)}
                                                     className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                     title="Remove from print queue"
                                                 >
                                                     <TrashBinIcon className="size-4" /> 
                                                 </button>
                                             </div>
                                         );
                                     })}
                                    
                                    {printQueue.length === 0 && (
                                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                            <p className="text-xs font-medium">Queue is empty.</p>
                                            <p className="text-[10px] mt-1">Add users to start printing.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* ================= DESIGN TAB ================= */}
                        {activeTab === 'design' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3 block">
                                        {activeCardId ? "Card Color (Override)" : selectedQueueIds.length > 0 ? "Selected Cards Color" : "Theme Color (Global)"}
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {["#3b82f6", "#ef4444", "#10b981", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#111827"].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => handleColorSelect(c)}
                                                className={`w-8 h-8 rounded-full ring-offset-2 transition-transform hover:scale-110 
                                                    ${(activeCardId ? cardColors[activeCardId.split('-')[0]] === c : (selectedQueueIds.length > 0 ? false : primaryColor === c)) ? "scale-110 ring-2 ring-gray-400" : ""}
                                                `}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                        <label className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer relative overflow-hidden group">
                                            <span className="bg-gradient-to-br from-red-500 via-green-500 to-blue-500 w-full h-full opacity-50 group-hover:opacity-100 transition-opacity"></span>
                                            <input 
                                                type="color" 
                                                value={activeCardId ? (cardColors[activeCardId.split('-')[0]] || primaryColor) : primaryColor} 
                                                onChange={(e) => handleColorSelect(e.target.value)} 
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        {activeCardId ? "* Changing color for this card only." : selectedQueueIds.length > 0 ? "* Changing color for selected cards." : "* Applying to all cards."}
                                    </p>
                                </div>

                                {/* View & Print Side */}
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3 block">View & Print Side</label>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <button onClick={() => setPrintSide("front")} className={`px-4 py-3 border-2 rounded-xl transition-all ${printSide === "front" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                                            <span className="text-xs font-bold">Front Only</span>
                                        </button>
                                        <button onClick={() => setPrintSide("back")} className={`px-4 py-3 border-2 rounded-xl transition-all ${printSide === "back" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                                            <span className="text-xs font-bold">Back Only</span>
                                        </button>
                                    </div>
                                    <button onClick={() => setPrintSide("both")} className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${printSide === "both" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                                            <span className="text-xs font-bold">Both Sides (Front & Back)</span>
                                    </button>
                                </div>

                                {/* Orientation */}
                                <div className="pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3 block">Orientation</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setOrientation("landscape")} className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 ${orientation === "landscape" ? "bg-brand-50 border-brand-200 text-brand-700" : "border-gray-200 hover:bg-gray-50"}`}>
                                            <div className="w-8 h-5 border-2 border-current rounded-sm"></div>
                                            Landscape
                                        </button>
                                        <button onClick={() => setOrientation("portrait")} className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center gap-2 ${orientation === "portrait" ? "bg-brand-50 border-brand-200 text-brand-700" : "border-gray-200 hover:bg-gray-50"}`}>
                                            <div className="w-5 h-8 border-2 border-current rounded-sm"></div>
                                            Portrait
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ================= CONTENT TAB ================= */}
                        {activeTab === 'content' && (
                            <div className="space-y-6 animate-fadeIn">
                                 <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <EditIcon className="size-4 text-brand-500" />
                                        <h3 className="text-sm font-bold text-gray-700">Dynamic Text</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Organization Header</label>
                                            <input 
                                                type="text" 
                                                value={config.organizationName}
                                                onChange={e => setConfig({ ...config, organizationName: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
                                                placeholder="e.g. SMK AL AMANAH"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Card Title (Back Side)</label>
                                            <input 
                                                type="text" 
                                                value={config.cardTitle}
                                                onChange={e => setConfig({ ...config, cardTitle: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
                                                placeholder="e.g. E - STUDENT - CARD"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Back Website / Footer</label>
                                            <input 
                                                type="text" 
                                                value={config.website}
                                                onChange={e => setConfig({ ...config, website: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-600"
                                            />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Back Contact Info</label>
                                            <input 
                                                type="text" 
                                                value={config.contact}
                                                onChange={e => setConfig({ ...config, contact: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-600"
                                            />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Helpdesk Info</label>
                                            <input 
                                                type="text" 
                                                value={config.helpdesk}
                                                onChange={e => setConfig({ ...config, helpdesk: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-gray-600"
                                                placeholder="e.g. AL AMANAH AL BANTANI"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Back Address</label>
                                            <textarea 
                                                rows={3}
                                                value={config.address}
                                                onChange={e => setConfig({ ...config, address: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none text-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div> 
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 shrink-0">
                    <button
                        onClick={() => downloadCards()}
                        disabled={printQueue.length === 0 || isDownloading}
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDownloading 
                                ? "bg-gray-200 text-gray-500" 
                                : "bg-gray-900 text-white hover:bg-black active:scale-[0.98]"
                        }`}
                    >
                        {isDownloading ? (
                            <>
                                <div className="size-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                Generating ZIP...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="size-5" />
                                Download {printQueue.filter(u => u !== null).length} Cards
                            </>
                        )}
                    </button>
                    {printQueue.length === 0 && (
                        <p className="text-center text-xs text-gray-400 mt-2 font-medium">Add users to start downloading.</p>
                    )}
                </div>
            </aside>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                html, body {
                    height: auto !important;
                    overflow: visible !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .no-print { display: none !important; }
                .printable-area {
                    position: static !important;
                    background: white !important;
                    display: block !important;
                    overflow: visible !important;
                    transform: none !important;
                }
                .printable-area > div {
                    transform: none !important;
                    display: block !important;
                }
                @page { size: auto; margin: 0mm; }
            }
        `}} />

            {/* ================= ADD USER MODAL ================= */}
            <Modal 
                isOpen={isAddUserModalOpen} 
                onClose={() => setIsAddUserModalOpen(false)} 
                className="max-w-2xl max-h-[85vh] flex flex-col"
                title="Select Users"
                description="Search and filter to find users to add to the print queue."
                subHeader={
                    <div className="p-4 flex gap-2 bg-gray-50/50">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                            <input 
                                type="text" 
                                placeholder="Search students..." 
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                value={modalSearchQuery}
                                onChange={(e) => setModalSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-48">
                             <CustomSelect 
                                value={modalClassId}
                                onChange={(val) => setModalClassId(String(val))}
                                options={[
                                    { label: "All Classes", value: "all" },
                                    ...classes.map(c => ({ label: c.name, value: c.id }))
                                ]}
                                placeholder="All Classes"
                                className="w-full"
                             />
                        </div>
                     </div>
                }
                footer={
                    <div className="flex items-center justify-between w-full">
                        <p className="text-sm font-medium text-gray-600">{modalSelectedIds.length} users selected</p>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsAddUserModalOpen(false)} 
                                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddToQueue} 
                                disabled={modalSelectedIds.length === 0} 
                                className="px-6 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add to Queue
                            </button>
                        </div>
                    </div>
                }
            >
                <div className="bg-gray-50 min-h-[400px] h-full">
                    {isLoading ? (
                         <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading users...</div>
                    ) : users.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                              <p>No users found matching filters.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 p-2">
                             {/* Select All Visible helper */}
                             <div className="px-2 py-1 flex justify-end">
                                 <button 
                                    onClick={() => {
                                        const visibleIds = users.filter((u: User) => !printQueue.find(pq => pq && String(pq.public_id) === String(u.public_id))).map((u: User) => String(u.public_id));
                                        const allSelected = visibleIds.every((id: string) => modalSelectedIds.includes(id));
                                        if (allSelected) {
                                            setModalSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                        } else {
                                            setModalSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
                                        }
                                    }}
                                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                                 >
                                     {users.filter((u: User) => !printQueue.find(pq => pq && String(pq.public_id) === String(u.public_id))).every((u: User) => modalSelectedIds.includes(String(u.public_id))) && users.length > 0 ? "Deselect All Visible" : "Select All Visible"}
                                 </button>
                             </div>

                             {users.map((user: User) => {
                                 const userId = String(user.public_id); // Use public_id
                                 const isInQueue = printQueue.some(pq => pq && String(pq.public_id) === userId);
                                 const isSelected = modalSelectedIds.includes(userId);
                                 return (
                                     <div key={userId} onClick={() => {
                                         if (isInQueue) return;
                                         if (isSelected) setModalSelectedIds(prev => prev.filter(id => id !== userId));
                                         else setModalSelectedIds(prev => [...prev, userId]);
                                     }} className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isInQueue ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed" : isSelected ? "bg-brand-50 border-brand-200 ring-1 ring-brand-200" : "bg-white border-gray-200 hover:border-brand-300 hover:shadow-sm"}`}>
                                          <div className={`size-5 rounded border flex items-center justify-center transition-colors ${isInQueue ? "bg-gray-200 border-gray-300" : isSelected ? "bg-brand-500 border-brand-500 text-white" : "border-gray-300 bg-white group-hover:border-brand-400"}`}>
                                              {(isInQueue || isSelected) && <CheckLineIcon className="size-3.5" />}
                                          </div>
                                          <div className="size-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                              {user.photo ? (
                                                  <img src={user.photo} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                      <UserIcon className="size-5" />
                                                  </div>
                                              )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <p className="font-bold text-gray-800 truncate text-sm">{user.name}</p>
                                              <p className="text-xs text-gray-500 truncate">{user.profile?.type === 'employee' ? user.profile.employeeId : user.profile?.studentId} • {getClassName(user)}</p>
                                          </div>
                                          {isInQueue && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Added</span>}
                                     </div>
                                 );
                             })}
                        </div>
                    )}
                </div>
            </Modal>
      </div>
    </>
  );
}
