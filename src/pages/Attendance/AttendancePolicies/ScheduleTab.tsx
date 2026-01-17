import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, PlusIcon, TrashBinIcon, TimeIcon } from "../../../components/atoms/Icons";
import Button from "../../../components/atoms/Button";
import { useScheduleRules } from "../../../api/hooks/useRules";
import Switch from "../../../components/atoms/Switch";
import Modal from "../../../components/molecules/Modal";
import { showSuccess, showError } from "../../../utils/toast";

import { RulePurpose, ScheduleBreak } from "../../../api/types/rules";

interface ScheduleTabProps {
  contextId: number;
  globalContextId?: number;
  selectedContext?: { type: string; id: number; name: string };
  onOverride?: () => void;
  onEnsureContext?: (purpose: RulePurpose) => Promise<number | undefined>;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const ScheduleTab: React.FC<ScheduleTabProps> = ({ contextId, globalContextId, selectedContext, onOverride, onEnsureContext }) => {
  const queryClient = useQueryClient(); // For manual invalidation

  // 1. Fetch Local Rules (for current context)
  const { data: scheduleData, createMutation, updateMutation, isLoading } = useScheduleRules({ 
    contextId: contextId || 0, 
    limit: 100 
  }, { disableAutoInvalidate: true }); // DISABLE AUTO INVALIDATION

  // 2. Fetch Global Rules (for defaults)
  const { data: globalRulesData } = useScheduleRules({
      contextId: globalContextId || 0,
      limit: 100
  });

  const schedules = useMemo(() => scheduleData?.data || [], [scheduleData]);
  const globalSchedules = useMemo(() => globalRulesData?.data || [], [globalRulesData]);

  // Local state for 7 days
  const [daySchedules, setDaySchedules] = useState<{
    [key: string]: { startTime: string; endTime: string; isActive: boolean; lateTolerance: number; breaks: ScheduleBreak[] }
  }>({});

  const [activeBreakDay, setActiveBreakDay] = useState<string | null>(null);
  const [tempBreaks, setTempBreaks] = useState<ScheduleBreak[]>([]);

  // Initialize state with defaults or fetched data
  useEffect(() => {
    const newSchedules: Record<string, { startTime: string; endTime: string; isActive: boolean; lateTolerance: number; breaks: ScheduleBreak[] }> = {};
    DAYS.forEach(day => {
      // 1. Try Local
      const existing = schedules.find(s => s.dayOfWeek === day);
      
      // 2. Try Global (Fall back if no local)
      const globalRule = globalSchedules.find(s => s.dayOfWeek === day);

      if (existing) {
        newSchedules[day] = {
          startTime: existing.startTime.slice(0, 5), 
          endTime: existing.endTime.slice(0, 5),     
          isActive: existing.isActive,
          lateTolerance: existing.lateToleranceMinutes,
          breaks: existing.breaks || []
        };
      } else if (globalRule) {
        // Use Global as Default
        newSchedules[day] = {
          startTime: globalRule.startTime.slice(0, 5),
          endTime: globalRule.endTime.slice(0, 5),
          isActive: globalRule.isActive,
          lateTolerance: globalRule.lateToleranceMinutes,
          breaks: globalRule.breaks || []
        };
      } else {
        // Hard fallback
        newSchedules[day] = {
          startTime: "07:00",
          endTime: "14:00",
          isActive: false, 
          lateTolerance: 15,
          breaks: []
        };
      }
    });
    setDaySchedules(newSchedules);
  }, [schedules, globalSchedules]);

  // Helper to update local state
  const updateDay = (day: string, field: string, value: string | boolean | number | ScheduleBreak[]) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleOpenBreaksModal = (day: string) => {
      setActiveBreakDay(day);
      // Deep copy to avoid reference issues
      setTempBreaks(JSON.parse(JSON.stringify(daySchedules[day]?.breaks || [])));
  };

  const handleSaveBreaks = () => {
      if (activeBreakDay) {
          updateDay(activeBreakDay, "breaks", tempBreaks);
          setActiveBreakDay(null);
      }
  };

  const handleSave = async () => {
    try {
      // Ensure context exists if we don't have an ID
      let activeContextId = contextId;
      if (!activeContextId && onEnsureContext) {
          const newId = await onEnsureContext(RulePurpose.SCHEDULE);
          if (newId) activeContextId = newId;
      }

      const promises = DAYS.map(async (day) => {
        const schedule = daySchedules[day];
        const existingRule = schedules.find(s => s.dayOfWeek === day);

        // Format times to HH:mm to match Regex
        const formattedStart = schedule.startTime.slice(0, 5);
        const formattedEnd = schedule.endTime.slice(0, 5);

        // Format breaks to ensure HH:mm
        const formattedBreaks = schedule.breaks.map(b => ({
            name: b.name,
            startTime: b.startTime.slice(0, 5),
            endTime: b.endTime.slice(0, 5)
        }));

        if (existingRule) {
           // Update existing
           // Simple diff check (could be improved to check deep equality for breaks)
           // For now we just update if logic suggests user interacted, but actually we should just save all active changes.
           // Since we don't have dirty tracking, we can just save everything or try to diff.
           // Let's safe-save.
           
           return updateMutation.mutateAsync({
                id: existingRule.id,
                data: {
                  startTime: formattedStart,
                  endTime: formattedEnd,
                  isActive: schedule.isActive,
                  lateToleranceMinutes: schedule.lateTolerance,
                  breaks: formattedBreaks
                }
           });
        } else {
           // Create new
           // Only create if we have a contextId
           if (!activeContextId) return;

           // Only create if it's active OR if users explicitly want to save a non-active rule override?
           // Usually we save everything if override exists.
           return createMutation.mutateAsync({
             contextId: activeContextId,
             dayOfWeek: day,
             startTime: formattedStart,
             endTime: formattedEnd,
             isActive: schedule.isActive,
             lateToleranceMinutes: schedule.lateTolerance,
             earlyLeaveThresholdMinutes: 0,
             breaks: formattedBreaks
           });
        }
      });

      await Promise.all(promises);
      
      // Manual Invalidation / Refetch ONE TIME
      await queryClient.invalidateQueries({ queryKey: ["rules", "schedule-rules"] });
      // await refetch(); // Optional, invalidateQueries should trigger it if active

      showSuccess("Weekly schedule saved successfully");
    } catch (e) {
      showError(e, "Failed to save schedule");
    }
  };


  if (isLoading && contextId) return <div className="p-8 text-center text-gray-400">Loading schedule...</div>;

  // Inheritance Logic
  const isInherited = !contextId && selectedContext?.type !== "GLOBAL";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">Standard Weekly Schedule</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {isInherited 
                    ? "Viewing inherited schedule. Override to customize." 
                    : "Define standard start and end times for each day."}
            </p>
         </div>

         <div className="flex items-center gap-3">
             {isInherited && (
                 <Button onClick={onOverride} className="bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 shadow-sm">
                     <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                     Override Schedule
                 </Button>
             )}
             
             <Button 
                onClick={handleSave} 
                disabled={isInherited || createMutation.isPending || updateMutation.isPending}
                className={isInherited ? "opacity-50 cursor-not-allowed bg-gray-300 text-white border-transparent" : ""}
             >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Schedule"}
             </Button>
         </div>
      </div>

      {isInherited && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-500/30 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Using Inherited Schedule</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      This schedule is currently inherited from the Global or Education Level configuration. 
                      Cannot edit directly. Click <b>Override Schedule</b> to create a custom schedule for this {selectedContext?.type?.toLowerCase().replace('_', ' ')}.
                  </p>
              </div>
          </div>
      )}

      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden ${isInherited ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}`}>
         <table className="min-w-full divide-y divide-gray-200 dark:divide-white/5">
            <thead className="bg-gray-50/50 dark:bg-zinc-800/50">
               <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Breaks</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Times</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tolerance</th>
               </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-100 dark:divide-white/5">
              {DAYS.map(day => {
                const config = daySchedules[day] || { startTime: "07:00", endTime: "14:00", isActive: false, lateTolerance: 15, breaks: [] };
                const isWorking = config.isActive;

                return (
                  <tr key={day} className={isWorking ? "bg-white dark:bg-transparent" : "bg-gray-50/30 dark:bg-white/[0.02]"}>
                     <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${isWorking ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                          {day}
                        </span>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <Switch 
                            checked={config.isActive} 
                            onChange={v => updateDay(day, "isActive", v)} 
                            disabled={isInherited}
                          />
                        </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                           onClick={() => handleOpenBreaksModal(day)}
                           disabled={isInherited || !isWorking}
                           className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                               config.breaks.length > 0 
                               ? "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                               : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                           } ${(!isWorking || isInherited) ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                           <TimeIcon className="size-3.5" />
                            {config.breaks.length} Breaks
                        </button>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-3 ${!isWorking && "opacity-50 pointer-events-none"}`}>
                           <div className="relative">
                             <input 
                               type="time" 
                               value={config.startTime}
                               onChange={e => updateDay(day, 'startTime', e.target.value)}
                               className="block w-full rounded-md border-gray-200 dark:border-white/10 dark:bg-white/5 text-sm focus:border-blue-500 focus:ring-blue-500/20"
                               disabled={isInherited}
                             />
                           </div>
                           <span className="text-gray-400">-</span>
                           <div className="relative">
                             <input 
                               type="time" 
                               value={config.endTime}
                               onChange={e => updateDay(day, 'endTime', e.target.value)}
                               className="block w-full rounded-md border-gray-200 dark:border-white/10 dark:bg-white/5 text-sm focus:border-blue-500 focus:ring-blue-500/20"
                               disabled={isInherited}
                             />
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`w-24 ${!isWorking && "opacity-50 pointer-events-none"}`}>
                           <input 
                              type="number"
                              min="0"
                              value={config.lateTolerance}
                              onChange={e => updateDay(day, 'lateTolerance', parseInt(e.target.value))}
                              className="block w-full rounded-md border-gray-200 dark:border-white/10 dark:bg-white/5 text-sm focus:border-blue-500 focus:ring-blue-500/20"
                              disabled={isInherited}
                           />
                        </div>
                     </td>
                  </tr>
                );
              })}
            </tbody>
         </table>
      </div>

      <Modal
        isOpen={!!activeBreakDay}
        onClose={() => setActiveBreakDay(null)}
        title={`Manage Breaks - ${activeBreakDay}`}
        description="Configure break times (e.g. Lunch, Recess)."
        className="max-w-lg"
        footer={
            <div className="flex justify-end gap-3 w-full">
                <Button variant="outline" onClick={() => setActiveBreakDay(null)}>
                    Cancel
                </Button>
                <Button onClick={handleSaveBreaks}>
                    Save Changes
                </Button>
            </div>
        }
      >
         <div className="space-y-4">
            <div className="flex justify-end">
                <button 
                  onClick={() => {
                      setTempBreaks([...tempBreaks, { name: "", startTime: "12:00", endTime: "13:00" }]);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <PlusIcon className="size-3.5" />
                    Add Break
                </button>
            </div>

            <div className="space-y-3 min-h-[100px]">
                {tempBreaks.length > 0 ? (
                    tempBreaks.map((brk, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                             <div className="flex-1 space-y-2">
                                 <div>
                                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Lunch Break"
                                        value={brk.name}
                                        onChange={(e) => {
                                            const newBreaks = [...tempBreaks];
                                            newBreaks[idx] = { ...newBreaks[idx], name: e.target.value };
                                            setTempBreaks(newBreaks);
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-black/20"
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-2">
                                     <div>
                                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Start</label>
                                        <input
                                            type="time"
                                            value={brk.startTime}
                                            onChange={(e) => {
                                                const newBreaks = [...tempBreaks];
                                                newBreaks[idx] = { ...newBreaks[idx], startTime: e.target.value };
                                                setTempBreaks(newBreaks);
                                            }}
                                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-black/20"
                                        />
                                     </div>
                                     <div>
                                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">End</label>
                                        <input
                                            type="time"
                                            value={brk.endTime}
                                            onChange={(e) => {
                                                const newBreaks = [...tempBreaks];
                                                newBreaks[idx] = { ...newBreaks[idx], endTime: e.target.value };
                                                setTempBreaks(newBreaks);
                                            }}
                                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-black/20"
                                        />
                                     </div>
                                 </div>
                             </div>
                             <button
                                onClick={() => {
                                    const newBreaks = [...tempBreaks];
                                    newBreaks.splice(idx, 1);
                                    setTempBreaks(newBreaks);
                                }}
                                className="mt-6 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                             >
                                <TrashBinIcon className="size-4" />
                             </button>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-xl">
                        <TimeIcon className="size-8 text-gray-200 dark:text-gray-700 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No breaks configured for this day.</p>
                    </div>
                )}
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default ScheduleTab;
