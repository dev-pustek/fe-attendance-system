import React, { useMemo } from "react";
import { TeachingScheduleTemplate, ClassSubject } from "../../../api/types/academic";
import { PlusIcon, TimeIcon, UserIcon, TrashIcon, EditIcon } from "../../../components/atoms/Icons";
import { useDrag, useDrop, useDragLayer } from "react-dnd";
import { ScheduleRule } from "../../../api/types/rules";
import { stringToPastelColor, stringToDarkerColor } from "../../../utils/colors";

export const ItemTypes = {
  SESSION: 'session',
  SUBJECT: 'subject',
};

interface ScheduleMatrixProps {
  templates: TeachingScheduleTemplate[];
  loading?: boolean;
  viewMode: 'subject' | 'teacher';
  onAddSession: (day: string) => void;
  onEditSession: (template: TeachingScheduleTemplate) => void;
  onDeleteSession: (id: number | string) => void;
  onMoveSession: (template: TeachingScheduleTemplate, newDay: string) => void;
  onDropSubject: (subject: ClassSubject, day: string) => void;
  availableDays?: { label: string; value: string }[];
  effectiveRules?: Record<string, import('../../../api/types/rules').ScheduleRule>;
  readOnly?: boolean;
  minutesPerUnit?: number;
}

const DAYS = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
  { label: "Saturday", value: "SATURDAY" },
];

const SessionCard: React.FC<{
  template: TeachingScheduleTemplate;
  viewMode: 'subject' | 'teacher';
  onEdit: (t: TeachingScheduleTemplate) => void;
  onDelete: (id: number | string) => void;
  rule?: ScheduleRule;
  isOverlapping?: boolean;
  readOnly?: boolean;
  minutesPerUnit?: number;
}> = ({ template, onEdit, onDelete, rule, isOverlapping, readOnly, minutesPerUnit = 45 }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SESSION,
    item: template,
    canDrag: () => !readOnly,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [readOnly, template]);

  // Resolve Subject Name: Try classSubject first, then teacherSubject
  const subjectName = template.classSubject?.subject?.name || (template as any).teacherSubject?.subject?.name || "Unknown Subject";
  
  // Resolve Class Name
  const className = template.classSubject?.class?.name || (template.classSubject ? "Assigned Class" : null);

  // Resolve Teacher Name
  const teacherName = template.defaultTeacher?.name || "No Teacher";

  // Generate dynamic colors
  const bgColor = stringToPastelColor(subjectName);
  const borderColor = stringToDarkerColor(subjectName);
  const textColor = stringToDarkerColor(subjectName);

  // Conflict Logic
  const hasRuleConflict = useMemo(() => {
       if (!rule) return false;
       if (!rule.isActive) return true; // Conflict if day is inactive? Yes, technically.
       
       // Compare times (HH:mm)
       const sessionStart = template.startTime.slice(0, 5);
       const sessionEnd = template.endTime.slice(0, 5);
       const ruleStart = rule.startTime.slice(0, 5);
       const ruleEnd = rule.endTime.slice(0, 5);
       
       return sessionStart < ruleStart || sessionEnd > ruleEnd;
   }, [rule, template.startTime, template.endTime]);

  const hasConflict = hasRuleConflict || isOverlapping;

  // JP Cost
  const start = new Date(`1970-01-01T${template.startTime}`);
  const end = new Date(`1970-01-01T${template.endTime}`);
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  // If we have minutesPerUnit prop passed down, use it. The prop was not in original SessionCard, need to add it to type definition above. 
  // Wait, I need to update the FC definition first. Let's do that in a separate replacement or combined if lines allow.
  // Viewing lines 36-146...
  
  return (
    <div
      ref={drag as any}
      className={`group relative flex flex-col gap-1.5 rounded-lg p-2 text-left shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 grayscale' : 'opacity-100'
      } ${!template.isActive ? 'opacity-60' : ''}`}
      style={{
          backgroundColor: bgColor,
          borderColor: hasConflict ? '#ef4444' : borderColor, // Red if conflict
      }}
      title={`Duration: ${durationMins} mins${!template.isActive ? ' (INACTIVE)' : ''}`}
    >
      <div className="flex justify-between items-start relative z-10">
         <span className="font-bold text-xs leading-tight line-clamp-2 pr-14" style={{ color: textColor }}>
            {subjectName}
         </span>
         {!readOnly && (
             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(template); }}
                    className="p-1 rounded bg-white/50 hover:bg-white text-gray-600 shadow-sm transition-colors"
                >
                    <EditIcon className="size-3" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(template.id); }}
                    className="p-1 rounded bg-white/50 hover:bg-red-50 text-red-500 hover:text-red-600 shadow-sm transition-colors"
                >
                    <TrashIcon className="size-3" />
                </button>
             </div>
         )}
      </div>
      
      <div className="flex items-center gap-1.5 text-[10px] font-medium relative z-10" style={{ color: hasConflict ? '#ef4444' : textColor, opacity: 0.8 }}>
         <TimeIcon className="size-3 shrink-0" />
         <span>{template.startTime.slice(0, 5)} - {template.endTime.slice(0, 5)}</span>
      </div>

       <div className="flex items-center gap-1.5 text-[10px] relative z-10" style={{ color: textColor, opacity: 0.8 }}>
         <UserIcon className="size-3 shrink-0" />
         <span className="truncate max-w-[120px]">{teacherName}</span>
      </div>

      {!template.isActive && (
          <div className="mt-0.5 inline-flex w-fit items-center justify-center rounded-full bg-red-100/80 px-2 py-0.5 border border-red-200/50 relative z-10">
             <span className="text-[8px] leading-none font-bold tracking-wider text-red-600 uppercase">Inactive</span>
          </div>
      )}

      {className && (
          <div className="mt-1 flex items-center justify-between relative z-10">
             <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/60 border border-black/5" style={{ color: textColor }}>
                {className}
             </span>
             {minutesPerUnit && (
                 <span className="text-[10px] font-medium opacity-80" style={{ color: textColor }}>
                     {Number((durationMins / minutesPerUnit).toFixed(1))} JP
                 </span>
             )}
          </div>
      )}

      {hasConflict && (
           <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 z-20">
               <span>⚠️</span> {isOverlapping ? "Overlap" : "Restriction"}
           </div>
      )}
    </div>
  );
};

const BreakCard: React.FC<{
  breakItem: import('../../../api/types/rules').ScheduleBreak;
}> = ({ breakItem }) => {
  return (
    <div
      className="group relative flex flex-col gap-1 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-2 text-left dark:border-white/10 dark:bg-white/[0.02]"
      title={`Break: ${breakItem.name}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {breakItem.name || 'Break'}
        </span>
        <div className="rounded bg-white/50 px-1 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/5">
          Rest
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
        <TimeIcon className="size-3 shrink-0" />
        <span>{breakItem.startTime} - {breakItem.endTime}</span>
      </div>
    </div>
  );
};

const DayHeader: React.FC<{
    day: { label: string; value: string };
    isToday: boolean;
    className?: string;
    rule?: import('../../../api/types/rules').ScheduleRule;
}> = ({ day, isToday, className, rule }) => (
    <div className={`px-4 py-4 text-center transition-colors ${
        isToday
            ? 'bg-brand-50/50 dark:bg-brand-900/10'
            : 'bg-white dark:bg-white/[0.03]'
    } ${className || ''}`}>
      <div className="flex flex-col items-center gap-1">
          <span className={`font-extrabold uppercase tracking-widest text-[11px] ${
                isToday
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-gray-900 dark:text-white'
          }`}>
            {day.label}
          </span>
          {rule && rule.isActive && (
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {rule.startTime.slice(0, 5)} - {rule.endTime.slice(0, 5)}
              </span>
          )}
          {rule && !rule.isActive && (
              <span className="text-[10px] font-medium text-red-400 dark:text-red-400/80">
                  Day Off
              </span>
          )}
      </div>
    </div>
);

interface DayColumnProps {
    day: { label: string; value: string };
    templates: TeachingScheduleTemplate[];
    viewMode: 'subject' | 'teacher';
    isToday: boolean;
    onAdd: (day: string) => void;
    onEdit: (t: TeachingScheduleTemplate) => void;
    onDelete: (id: number | string) => void;
    onMoveSession: (template: TeachingScheduleTemplate, newDay: string) => void;
    onDropSubject: (subject: ClassSubject, day: string) => void;
    isActive?: boolean;
    rule?: ScheduleRule; // Add rule prop
    isGlobalDragging?: boolean;
    readOnly?: boolean;
    minutesPerUnit?: number;
}

const DayColumn: React.FC<DayColumnProps> = ({
  day,
  isToday,
  templates,
  viewMode,
  onAdd,
  onEdit,
  onDelete,
  onMoveSession,
  onDropSubject,
  isActive = true,
  rule,
  isGlobalDragging,
  readOnly,
  minutesPerUnit
}) => {
  const [{ isOver, canDrop }, dropRef] = useDrop<any, any, any>({
    accept: [ItemTypes.SESSION, ItemTypes.SUBJECT],
    canDrop: () => isActive,
    drop: (item: any, monitor) => {
        if (!isActive) return;

        if (monitor.getItemType() === ItemTypes.SUBJECT) {
           onDropSubject(item as ClassSubject, day.value);
        } else {
           const session = item as TeachingScheduleTemplate;
           if (session.dayOfWeek !== day.value) {
                onMoveSession(session, day.value);
           }
        }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Overlap Detection
  const overlaps = useMemo(() => {
    const map: Record<string | number, boolean> = {};
    if (!templates || templates.length < 2) return map;

    for (let i = 0; i < templates.length; i++) {
        const t1 = templates[i];
        map[t1.id] = false;
        
        for (let j = 0; j < templates.length; j++) {
            if (i === j) continue;
            const t2 = templates[j];
            
            const start1 = t1.startTime.slice(0, 5);
            const end1 = t1.endTime.slice(0, 5);
            const start2 = t2.startTime.slice(0, 5);
            const end2 = t2.endTime.slice(0, 5);

            if (start1 < end2 && start2 < end1) {
                map[t1.id] = true;
                break;
            }
        }
    }
    return map;
  }, [templates]);

  // Combined Items (Sessions + Breaks)
  const sortedItems = useMemo(() => {
    const items: ({ type: 'session'; data: TeachingScheduleTemplate } | { type: 'break'; data: import('../../../api/types/rules').ScheduleBreak })[] = [
      ...templates.map(t => ({ type: 'session' as const, data: t })),
      ...(rule?.breaks || []).map(b => ({ type: 'break' as const, data: b }))
    ];

    return items.sort((a, b) => {
      const startA = a.type === 'session' ? a.data.startTime : a.data.startTime;
      const startB = b.type === 'session' ? b.data.startTime : b.data.startTime;
      return startA.localeCompare(startB);
    });
  }, [templates, rule?.breaks]);

  // Ghost Slots Logic
  const ghostSlots = useMemo(() => {
      if (!isActive || !rule) return [];
      
      const slots = [];
      const startHour = parseInt(rule.startTime.split(':')[0]);
      const lastHour = parseInt(rule.endTime.split(':')[0]);
      
      const currentTime = new Date();
      currentTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date();
      endTime.setHours(lastHour, 0, 0, 0);

      let i = 1;
      while (currentTime < endTime) {
          slots.push({ id: i, label: `Period ${i}` });
          currentTime.setMinutes(currentTime.getMinutes() + 45); 
          i++;
          if (i > 12) break; 
      }
      return slots;
  }, [isActive, rule]);

  return (
    <div
      ref={dropRef as any}
      className={`min-h-[500px] border-b border-gray-200 dark:border-white/5 px-4 md:px-1 py-4 md:py-2 transition-all duration-300 relative flex flex-col gap-3 md:gap-2 ${
        isActive 
            ? isGlobalDragging 
                ? "bg-brand-50/40 border-2 border-dashed border-brand-300 dark:bg-brand-500/10 dark:border-brand-500/30"
                : isToday 
                    ? "bg-blue-50/30 dark:bg-blue-900/10" 
                    : "bg-transparent hover:bg-gray-50 dark:hover:bg-white/5"
            : "bg-gray-100/50 dark:bg-[#121216] opacity-70 pointer-events-none cursor-not-allowed border-x border-dashed border-gray-200/50 dark:border-white/5"
      }`}
    >
        {/* Ghost Slots Layer */}
        {isActive && templates.length === 0 && (
            <div className="absolute inset-2 top-14 bottom-2 flex flex-col gap-2 pointer-events-none z-0 opacity-40">
                {ghostSlots.map(slot => (
                    <div key={slot.id} className="flex-1 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/5 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-300 dark:text-white/10 uppercase tracking-widest">{slot.label}</span>
                    </div>
                ))}
            </div>
        )}

        {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="text-xs font-bold text-gray-300 dark:text-gray-700 -rotate-45 uppercase tracking-widest select-none">
                     Day Off
                 </p>
            </div>
        )}

      {/* Header for Day Column (Hidden) */}
      <div className="hidden mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-brand-600" : "text-gray-500"}`}>
          {day.label}
        </span>
      </div>

      {/* Add Button - Only if active and not readonly */}
      {isActive && !readOnly && (
        <button
            onClick={() => onAdd(day.value)}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-xs font-bold transition-all duration-300 hover:shadow-inner mb-2 ${
                isToday 
                    ? 'border-brand-200 text-brand-400 hover:border-brand-500/50 hover:bg-brand-50/50 hover:text-brand-600 dark:border-brand-500/10 dark:text-brand-500/50'
                    : 'border-gray-100 text-gray-400 hover:border-brand-500/50 hover:bg-brand-50/50 hover:text-brand-600 dark:border-white/5 dark:hover:bg-brand-500/5 dark:hover:text-brand-400'
            }`}
        >
            <PlusIcon className="size-4" />
            Add Session
        </button>
      )}

      <div className="flex-1 space-y-2 relative z-10">
        {sortedItems.map((item, idx) => (
          item.type === 'session' ? (
            <SessionCard
              key={item.data.id}
              template={item.data}
              viewMode={viewMode}
              onEdit={onEdit}
              onDelete={onDelete}
              rule={rule}
              isOverlapping={overlaps[item.data.id]}
              readOnly={readOnly}
              minutesPerUnit={minutesPerUnit}
            />
          ) : (
            <BreakCard key={`break-${idx}`} breakItem={item.data} />
          )
        ))}
      </div>

      {/* Drop Indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-2 top-2 bottom-2 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/50 dark:bg-brand-500/10 pointer-events-none flex items-center justify-center z-20">
             <span className="text-sm font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider bg-white/80 dark:bg-black/50 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                Drop Here
             </span>
        </div>
      )}
    </div>
  );
};

const ScheduleMatrix: React.FC<ScheduleMatrixProps> = ({
  templates,
  loading,
  viewMode,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onMoveSession,
  onDropSubject,
  availableDays,
  effectiveRules,
  readOnly,
  minutesPerUnit
}) => {
  const currentOffsetRef = React.useRef<{ x: number, y: number } | null>(null);

  const { isGlobalDragging } = useDragLayer((monitor) => {
      currentOffsetRef.current = monitor.getClientOffset();
      return {
        isGlobalDragging: monitor.isDragging() && 
          (monitor.getItemType() === ItemTypes.SUBJECT || monitor.getItemType() === ItemTypes.SESSION)
      };
  });

  // Auto Scroll Logic - No change

  // ... (Code omitted for brevity, ensure previous logic is kept if not replaced) ...
  // Wait, I need to match the start line correctly.

   const currentDayValue = React.useMemo(() => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
  }, []);

  const visibleDays = React.useMemo(() => {
      return availableDays && availableDays.length > 0 ? availableDays : DAYS;
  }, [availableDays]); 
  
  const getTemplatesForDay = (day: string) => {
    return templates
      .filter((t) => t.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };
  
  // Drag Scroll Logic - No change
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isDown = React.useRef(false);
  const startX = React.useRef(0);
  const scrollLeft = React.useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    if(scrollContainerRef.current) {
        scrollContainerRef.current.classList.add('active');
        scrollContainerRef.current.style.cursor = 'grabbing';
        startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
        scrollLeft.current = scrollContainerRef.current.scrollLeft;
    }
  };

  const handleMouseLeave = () => {
    isDown.current = false;
    if(scrollContainerRef.current) {
         scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseUp = () => {
    isDown.current = false;
    if(scrollContainerRef.current) {
         scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    if(scrollContainerRef.current) {
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; // scroll-fast
        scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
          <span className="text-sm font-medium text-gray-400">Loading schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex flex-col bg-white dark:bg-transparent overflow-x-auto w-full max-w-full cursor-grab active:cursor-grabbing select-none"
    >
        <div className="min-w-full flex flex-col bg-gray-50/50 dark:bg-[#0B0B0F]">
            {/* Scrollable Content Area */}
            <div className="flex-1">
                {/* Sticky Header Row - Dynamic Columns */}
                <div className="grid divide-x divide-gray-200 border-b border-gray-200 dark:divide-white/5 dark:border-white/5 bg-white dark:bg-[#0B0B0F] z-30 sticky top-0 relative pointer-events-none min-w-max"
                     style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(280px, 1fr))` }}
                >
                     {/* Note: pointer-events-none allows drag through header, but might block clicks. If header has interaction, remove it. */}
                     {/* Wait, header is just text?  */}
                    {visibleDays.map((day) => {
                        const rule = effectiveRules ? (effectiveRules[day.value] || effectiveRules[day.label] || effectiveRules[day.value.toUpperCase()]) : undefined;
                        return (
                        <DayHeader 
                            key={`header-${day.value}`} 
                            day={day} 
                            isToday={day.value === currentDayValue}
                            rule={rule}
                        />
                    )})}
                </div>

                <div className="grid min-h-[500px] divide-x divide-gray-200 dark:divide-white/5 min-w-max"
                     style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(280px, 1fr))` }}
                >
                    {/* Note: Identify if using inline style for grid-template-columns causes hydration mismatch if screen size changes? 
                        Ideally use dynamic class or just style. For desktop we want equal columns.
                        Tailwind grid-cols-N only goes up to 12 by default. unique number of days might be variable.
                        Using inline style for columns count is safer for dynamic length.
                     */}
                    {visibleDays.map((day) => {
                        const rule = effectiveRules ? (effectiveRules[day.value] || effectiveRules[day.label] || effectiveRules[day.value.toUpperCase()]) : undefined;
                        const isDayActive = rule ? rule.isActive : true;
                        
                        return (
                        <DayColumn 
                            key={day.value}
                            day={day}
                            isToday={day.value === currentDayValue}
                            templates={getTemplatesForDay(day.value)}
                            viewMode={viewMode}
                            rule={rule}
                            onAdd={onAddSession}
                            onEdit={onEditSession}
                            onDelete={onDeleteSession}
                            onMoveSession={onMoveSession}
                            onDropSubject={onDropSubject}
                            isActive={isDayActive}
                            isGlobalDragging={isGlobalDragging}
                            readOnly={readOnly}
                            minutesPerUnit={minutesPerUnit}
                        />
                    )})}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ScheduleMatrix;
