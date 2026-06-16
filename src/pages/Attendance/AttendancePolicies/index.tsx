import React, { useState, useRef, useEffect, useCallback } from "react";
import SidebarTree from "./SidebarTree";
import PoliciesTab from "./PoliciesTab";
import ScheduleTab from "./ScheduleTab"; 
import LeaveTypesTab from "./LeaveTypesTab";
import PresenceStatusesTab from "./PresenceStatusesTab";
import { RuleContextType, RulePurpose } from "../../../api/types/rules";
import { useRuleContexts } from "../../../api/hooks/useRules";
import { CloseIcon, ListIcon } from "../../../components/atoms/Icons";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";

const AttendanceRules: React.FC = () => {
  const [selectedContext, setSelectedContext] = useState<{ 
    type: string; 
    id: number; 
    name: string 
  }>({
    type: RuleContextType.GLOBAL,
    id: 0,
    name: "Global Settings",
  });

  const [activeTab, setActiveTab] = useState<"policies" | "schedule" | "leaves" | "statuses">("policies");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Draggable Sidebar Button State
  const [buttonTop, setButtonTop] = useState(176); // Default top-44 (176px)
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const initialTopRef = useRef(176);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDraggingRef.current = false;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartYRef.current = clientY;
    initialTopRef.current = buttonTop;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaY = currentY - dragStartYRef.current;
      
      if (Math.abs(deltaY) > 5) {
        isDraggingRef.current = true;
      }

      // Constrain within viewport
      const constrainedTop = Math.max(72, Math.min(window.innerHeight - 80, initialTopRef.current + deltaY));
      setButtonTop(constrainedTop);
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [buttonTop]);

  const handleSidebarOpen = () => {
    if (!isDraggingRef.current) {
      setIsSidebarOpen(true);
    }
  };

  // Fetch context for the selected target
  const { data: contexts, createMutation: createContext } = useRuleContexts({
    contextType: selectedContext.type as RuleContextType,
    limit: 100 
  });

  // Also fetch Global contexts to support inheritance defaults
  const { data: globalContexts } = useRuleContexts({
      contextType: RuleContextType.GLOBAL,
      limit: 10
  });

  // Find the matching context for the current selection
  // Refined Logic: We must filter by PURPOSE because Global (and others) can have multiple context records (one for Rules, one for Schedule).
  
  const policyContext = contexts?.data?.find(c => {
    const typeMatch = 
        (selectedContext.type === RuleContextType.GLOBAL && c.contextType === RuleContextType.GLOBAL) ||
        (selectedContext.type === RuleContextType.EDUCATION_LEVEL && c.educationLevelId === selectedContext.id) ||
        (selectedContext.type === RuleContextType.GRADE && c.gradeId === selectedContext.id);

    return typeMatch && c.purpose === RulePurpose.ATTENDANCE_RULE;
  });

  const scheduleContext = contexts?.data?.find(c => {
    const typeMatch = 
        (selectedContext.type === RuleContextType.GLOBAL && c.contextType === RuleContextType.GLOBAL) ||
        (selectedContext.type === RuleContextType.EDUCATION_LEVEL && c.educationLevelId === selectedContext.id) ||
        (selectedContext.type === RuleContextType.GRADE && c.gradeId === selectedContext.id);
        
    return typeMatch && c.purpose === RulePurpose.SCHEDULE;
  });

  const globalScheduleContext = globalContexts?.data?.find(c => 
      c.contextType === RuleContextType.GLOBAL && c.purpose === RulePurpose.SCHEDULE
  );



  // Debug Context Resolution
  useEffect(() => {
     console.log("Context Debug:", { 
         selected: selectedContext, 
         contexts: contexts?.data, 
         policyContext,
         scheduleContext
     });
  }, [selectedContext, contexts, policyContext, scheduleContext]);

  const handleEnsureContext = async (purpose: RulePurpose): Promise<number | undefined> => {
      // Check if context already exists in loaded data
      const existing = contexts?.data?.find(c => {
        const typeMatch = 
            (selectedContext.type === RuleContextType.GLOBAL && c.contextType === RuleContextType.GLOBAL) ||
            (selectedContext.type === RuleContextType.EDUCATION_LEVEL && c.educationLevelId === selectedContext.id) ||
            (selectedContext.type === RuleContextType.GRADE && c.gradeId === selectedContext.id);
        
        return typeMatch && c.purpose === purpose;
      });

      if (existing) return existing.id;

      // Create if not exists
      try {
        const result = await createContext.mutateAsync({
            contextType: selectedContext.type,
            academicYearId: 1, 
            priority: selectedContext.type === RuleContextType.GRADE ? 20 : 10,
            purpose: purpose,
            educationLevelId: selectedContext.type === RuleContextType.EDUCATION_LEVEL ? selectedContext.id : null,
            gradeId: selectedContext.type === RuleContextType.GRADE ? selectedContext.id : null,
            classId: null,
            userId: null,
            majorId: null
        });
        return result.data.id;
      } catch (error) {
        console.error("Failed to ensure context", error);
        return undefined;
      }
  };

  const handleCreateOverride = () => {
    // Legacy override method (kept for cleaner UI button usage if needed)
    // Now handled dynamically by save
    handleEnsureContext(activeTab === 'policies' ? RulePurpose.ATTENDANCE_RULE : RulePurpose.SCHEDULE);
  };

  const tabs = React.useMemo(() => [
    { id: "policies", label: "General Rules" },
    { id: "schedule", label: "Weekly Schedule" },
    ...(selectedContext.type === RuleContextType.GLOBAL ? [
      { id: "leaves", label: "Leave Types" },
      { id: "statuses", label: "Presence Status" }
    ] : [])
  ], [selectedContext.type]);

  // Reset active tab if it doesn't exist in the current context
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab("policies");
    }
  }, [selectedContext.type, tabs, activeTab]);

  // Tab Refs for precise underline animation
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeElement = tabRefs.current[activeTab];
    if (activeElement) {
        // Only update if values actually changed to prevent loop
        setIndicatorStyle(prev => {
            const newLeft = activeElement.offsetLeft;
            const newWidth = activeElement.offsetWidth;
            if (prev.left !== newLeft || prev.width !== newWidth) {
                return { left: newLeft, width: newWidth };
            }
            return prev;
        });
    }
  }, [activeTab]);

  return (
    <>
      <PageMeta title="Attendance Policies | SIAPUS" description="Configure attendance rules, schedules, and policies." />
      <PageBreadcrumb pageTitle="Attendance Policies" />

      <div className="relative flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
        
        {/* Sidebar Drawer - Fixed Right Overlay */}
        <div 
            className={`fixed top-[72px] bottom-0 right-0 z-[999] transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <aside className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col">
                 <div className="p-4 pt-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/50">
                    <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                        Context Selector
                    </h2>
                    <button 
                        onClick={() => setIsSidebarOpen(false)} 
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Close Sidebar"
                    >
                        <CloseIcon className="size-4" />
                    </button>
                 </div>

                 <div className="flex-1 w-full h-full overflow-hidden"> 
                    <SidebarTree 
                        selectedContext={selectedContext} 
                        onSelect={setSelectedContext} 
                    />
                 </div>
            </aside>
        </div>

        {/* Main Content Area - Window Scrollable */}
        <div className="flex-1 w-full relative"> 
                     {/* Sidebar Toggle - Top Right */}
             {/* Sidebar Toggle - Floating Animated Icon */}
             {!isSidebarOpen && (
                 <button
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    onClick={handleSidebarOpen}
                    style={{ top: `${buttonTop}px` }}
                    className="fixed right-0 z-30 bg-brand-600 text-white shadow-xl shadow-brand-500/20 py-3 px-3 rounded-l-xl flex items-center gap-0 overflow-hidden max-w-[48px] hover:max-w-[200px] transition-[max-width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group animate-pulse-subtle cursor-grab active:cursor-grabbing select-none"
                 >
                    <ListIcon className="size-6 shrink-0 min-w-6" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap ml-3 text-sm font-semibold pointer-events-none">
                        Open Menu
                    </span>
                 </button>
             )}

             <div className="space-y-6 w-full pb-20">
                <div className="space-y-6">
                    {/* Combined Header & Tabs Panel */}
                    <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col">
                        
                        {/* Header Section */}
                        <div className="p-6 pb-0 relative">
                             {/* REMOVED BIG ICON */}
                             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                 <div>
                                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedContext.name}</h1>
                                     <div className="flex items-center gap-2 mt-2">
                                         <span className="text-sm text-gray-500 dark:text-gray-400">Configuration Scope:</span>
                                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-100 dark:border-brand-500/20">
                                             {selectedContext.type}
                                         </span>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* Tabs Section (Integrated) - Moved out to be full width */}
                        {/* Only hide tabs if absolutely no context exists, but we usually want to show tabs so user can click 'Override' */}
                        <div className="border-b border-t border-gray-100 dark:border-white/5 relative px-6 bg-gray-50/30 dark:bg-white/[0.01]">
                            <div className="flex gap-8 relative" ref={tabsRef}>
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        ref={(el) => { tabRefs.current[tab.id] = el; }}
                                        onClick={() => setActiveTab(tab.id as "policies" | "schedule" | "leaves" | "statuses")}
                                        className={`py-4 text-sm font-medium transition-all relative z-10 ${
                                            activeTab === tab.id
                                            ? "text-brand-600 dark:text-brand-400 font-bold"
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                                {/* Precise Sliding Underline - Moved inside relative flex container to ensure offsetLeft works perfectly */}
                                <div 
                                    className="absolute bottom-0 h-0.5 bg-brand-500 transition-all duration-300 ease-out z-20"
                                    style={{
                                        left: `${indicatorStyle.left}px`,
                                        width: `${indicatorStyle.width}px`
                                    }}
                                />
                            </div>
                        </div>
                    
                        {/* Content Section */}
                        <div className="flex-1 bg-white dark:bg-transparent">
                               <div className="p-6">
                                        {activeTab === "policies" && <PoliciesTab contextId={policyContext?.id} selectedContext={selectedContext} onOverride={handleCreateOverride} onEnsureContext={handleEnsureContext} />}
                                        {activeTab === "schedule" && <ScheduleTab contextId={scheduleContext?.id || 0} globalContextId={globalScheduleContext?.id} selectedContext={selectedContext} onOverride={handleCreateOverride} onEnsureContext={handleEnsureContext} />}
                                        {activeTab === "leaves" && <LeaveTypesTab />}
                                        {activeTab === "statuses" && <PresenceStatusesTab />}
                               </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </>
  );
};

export default AttendanceRules;
