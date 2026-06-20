import React, { useMemo, useState } from "react";
import { TeachingSession } from "../../../api/types/attendance";
import { TimeIcon, UserIcon, MapPinIcon } from "../../../components/atoms/Icons";
import { ScheduleRule } from "../../../api/types/rules";
import { stringToPastelColor, stringToDarkerColor } from "../../../utils/colors";
import { parseISO, format } from "date-fns";
import Modal from "../../../components/molecules/Modal";

interface WeeklySessionMatrixProps {
  sessions: TeachingSession[];
  loading?: boolean;
  viewMode: 'subject' | 'teacher';
  availableDays?: { label: string; value: string }[];
  effectiveRules?: Record<string, import('../../../api/types/rules').ScheduleRule>;
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
  session: TeachingSession;
  viewMode: 'subject' | 'teacher';
  rule?: ScheduleRule;
  minutesPerUnit?: number;
  onClick?: (session: TeachingSession) => void;
}> = ({ session, rule, minutesPerUnit = 45, onClick }) => {
  // Resolve Subject Name: Try classSubject first
  const subjectName = session.classSubject?.subject?.name || "Unknown Subject";
  
  // Resolve Class Name
  const className = session.classSubject?.class?.name || "Assigned Class";

  // Resolve Teacher Name: Use actualTeacher, fallback to sub, or placeholder
  const teacherName = session.actualTeacher?.name || session.substituteForTeacher?.name || "No Teacher";

  // Generate dynamic colors
  const bgColor = stringToPastelColor(subjectName);
  const borderColor = stringToDarkerColor(subjectName);
  const textColor = stringToDarkerColor(subjectName);

  // Status visual states
  const isCancelled = session.isCancelled;
  const isSubstitution = session.isSubstitution;

  // JP Cost
  const start = new Date(`1970-01-01T${session.startTime}`);
  const end = new Date(`1970-01-01T${session.endTime}`);
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  
  return (
    <div
      onClick={() => onClick?.(session)}
      className={`group relative flex flex-col gap-1.5 rounded-lg p-2 text-left shadow-sm transition-all hover:shadow-md cursor-pointer ${
        isCancelled ? 'opacity-50 grayscale' : 'opacity-100'
      }`}
      style={{
          backgroundColor: bgColor,
          borderColor: isCancelled ? '#9ca3af' : (isSubstitution ? '#eab308' : borderColor),
          borderWidth: isSubstitution ? '2px' : '1px',
          borderStyle: isSubstitution ? 'dashed' : 'solid'
      }}
      title={`Duration: ${durationMins} mins${isCancelled ? ' (CANCELLED)' : ''}`}
    >
      <div className="flex justify-between items-start relative z-10">
         <span className={`font-bold text-xs leading-tight line-clamp-2 pr-1 ${isCancelled ? 'line-through text-gray-500' : ''}`} style={{ color: isCancelled ? undefined : textColor }}>
            {subjectName}
         </span>
      </div>
      
      <div className="flex items-center gap-1.5 text-[10px] font-medium relative z-10" style={{ color: isCancelled ? '#6b7280' : textColor, opacity: 0.8 }}>
         <TimeIcon className="size-3 shrink-0" />
         <span className={isCancelled ? 'line-through' : ''}>{session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}</span>
      </div>

       <div className="flex items-center gap-1.5 text-[10px] relative z-10" style={{ color: isCancelled ? '#6b7280' : textColor, opacity: 0.8 }}>
         <UserIcon className="size-3 shrink-0" />
         <span className={`truncate max-w-[120px] ${isCancelled ? 'line-through' : ''}`}>{teacherName}</span>
      </div>

      {isCancelled && (
          <div className="mt-0.5 inline-flex w-fit items-center justify-center rounded-full bg-red-100/80 px-2 py-0.5 border border-red-200/50 relative z-10">
             <span className="text-[8px] leading-none font-bold tracking-wider text-red-600 uppercase">Cancelled</span>
          </div>
      )}

      {isSubstitution && !isCancelled && (
          <div className="mt-0.5 inline-flex w-fit items-center justify-center rounded-full bg-yellow-100/80 px-2 py-0.5 border border-yellow-200/50 relative z-10">
             <span className="text-[8px] leading-none font-bold tracking-wider text-yellow-700 uppercase">Substitute</span>
          </div>
      )}

      {className && (
          <div className="mt-1 flex items-center justify-between relative z-10">
             <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isCancelled ? 'bg-gray-200 text-gray-500' : 'bg-white/60 border border-black/5'}`} style={{ color: isCancelled ? undefined : textColor }}>
                {className}
             </span>
             {minutesPerUnit && (
                 <span className="text-[10px] font-medium opacity-80" style={{ color: isCancelled ? '#6b7280' : textColor }}>
                     {Number((durationMins / minutesPerUnit).toFixed(1))} JP
                 </span>
             )}
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
    sessions: TeachingSession[];
    viewMode: 'subject' | 'teacher';
    isToday: boolean;
    isActive?: boolean;
    rule?: ScheduleRule;
    minutesPerUnit?: number;
    onSessionClick?: (session: TeachingSession) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  day,
  isToday,
  sessions,
  viewMode,
  isActive = true,
  rule,
  minutesPerUnit,
  onSessionClick
}) => {

  // Combined Items (Sessions + Breaks)
  const sortedItems = useMemo(() => {
    const items: ({ type: 'session'; data: TeachingSession } | { type: 'break'; data: import('../../../api/types/rules').ScheduleBreak })[] = [
      ...sessions.map(s => ({ type: 'session' as const, data: s })),
      ...(rule?.breaks || []).map(b => ({ type: 'break' as const, data: b }))
    ];

    return items.sort((a, b) => {
      const startA = a.type === 'session' ? a.data.startTime : a.data.startTime;
      const startB = b.type === 'session' ? b.data.startTime : b.data.startTime;
      return startA.localeCompare(startB);
    });
  }, [sessions, rule?.breaks]);

  return (
    <div
      className={`min-h-[500px] border-b border-gray-200 dark:border-white/5 px-4 md:px-1 py-4 md:py-2 transition-all duration-300 relative flex flex-col gap-3 md:gap-2 ${
        isActive 
            ? isToday 
                ? "bg-blue-50/30 dark:bg-blue-900/10" 
                : "bg-transparent hover:bg-gray-50 dark:hover:bg-white/5"
            : "bg-gray-100/50 dark:bg-[#121216] opacity-70 border-x border-dashed border-gray-200/50 dark:border-white/5"
      }`}
    >
        {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="text-xs font-bold text-gray-300 dark:text-gray-700 -rotate-45 uppercase tracking-widest select-none">
                     Day Off
                 </p>
            </div>
        )}

      {/* Header for Day Column (Hidden on desktop) */}
      <div className="hidden mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-brand-600" : "text-gray-500"}`}>
          {day.label}
        </span>
      </div>

      <div className="flex-1 space-y-2 relative z-10">
        {sortedItems.map((item, idx) => (
          item.type === 'session' ? (
            <SessionCard
              key={item.data.id}
              session={item.data}
              viewMode={viewMode}
              rule={rule}
              minutesPerUnit={minutesPerUnit}
              onClick={onSessionClick}
            />
          ) : (
            <BreakCard key={`break-${idx}`} breakItem={item.data} />
          )
        ))}
      </div>
    </div>
  );
};

const WeeklySessionMatrix: React.FC<WeeklySessionMatrixProps> = ({
  sessions,
  loading,
  viewMode,
  availableDays = DAYS,
  effectiveRules,
  minutesPerUnit = 45,
}) => {
  const [selectedSession, setSelectedSession] = useState<TeachingSession | null>(null);

  const currentDayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday
  const todayValue =
    currentDayIndex === 0 ? "SUNDAY" : availableDays[currentDayIndex - 1]?.value;

  // Derive grouped sessions by dayOfWeek from sessionDate
  const groupedSessions = useMemo(() => {
    const map: Record<string, TeachingSession[]> = {};
    availableDays.forEach((d) => {
      map[d.value] = [];
    });

    sessions.forEach((s) => {
      if (s.sessionDate) {
          const dateStr = format(parseISO(s.sessionDate), 'EEEE').toUpperCase();
          if (map[dateStr]) {
            map[dateStr].push(s);
          }
      }
    });

    return map;
  }, [sessions, availableDays]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-6 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#121216] opacity-50">
        {availableDays.map((day) => (
          <div key={`skeleton-${day.value}`} className="min-h-[500px] border-r border-gray-200 dark:border-white/10 p-2 space-y-3">
             <div className="h-6 w-full bg-gray-200 dark:bg-white/5 rounded animate-pulse"></div>
             <div className="h-24 w-full bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse"></div>
             <div className="h-24 w-full bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative isolate w-full">
      <div className="hidden md:grid grid-cols-1 md:grid-cols-5 xl:grid-cols-6 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#121216] shadow-sm">
        {availableDays.map((day, idx) => {
          const isToday = todayValue === day.value;
          const isLast = idx === availableDays.length - 1;
          const rule = effectiveRules ? effectiveRules[day.value] : undefined;
          const isActive = rule ? rule.isActive : true;

          return (
            <div key={day.value} className={`flex flex-col ${!isLast ? 'border-r border-gray-200 dark:border-white/10' : ''}`}>
              <DayHeader day={day} isToday={isToday} rule={rule} className="border-b border-gray-200 dark:border-white/10" />
              <DayColumn
                day={day}
                isToday={isToday}
                sessions={groupedSessions[day.value]}
                viewMode={viewMode}
                isActive={isActive}
                rule={rule}
                minutesPerUnit={minutesPerUnit}
                onSessionClick={setSelectedSession}
              />
            </div>
          );
        })}
      </div>
      
      {/* Mobile Stacked View */}
      <div className="md:hidden flex flex-col gap-4">
          {availableDays.map(day => {
              const rule = effectiveRules ? effectiveRules[day.value] : undefined;
              const isActive = rule ? rule.isActive : true;
              
              if (!isActive && groupedSessions[day.value].length === 0) return null; // Hide empty inactive days on mobile
              
              return (
                  <div key={`mobile-${day.value}`} className="bg-white dark:bg-[#121216] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                      <DayHeader day={day} isToday={todayValue === day.value} rule={rule} className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]" />
                      <DayColumn
                          day={day}
                          isToday={todayValue === day.value}
                          sessions={groupedSessions[day.value]}
                          viewMode={viewMode}
                          isActive={isActive}
                          rule={rule}
                          minutesPerUnit={minutesPerUnit}
                          onSessionClick={setSelectedSession}
                      />
                  </div>
              )
          })}
      </div>

      {/* Session Detail Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Detail Sesi Mengajar"
        className="max-w-md"
      >
        {selectedSession && (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">
                {selectedSession.classSubject?.subject?.name || "Unknown Subject"}
              </h4>
              <p className="text-brand-500 font-medium">
                {selectedSession.classSubject?.class?.name || "Unknown Class"}
              </p>
            </div>
            
            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                 <UserIcon className="size-4 text-gray-400" />
                 <span>
                    <span className="font-semibold text-gray-900 dark:text-white">Guru:</span> {selectedSession.actualTeacher?.name || selectedSession.substituteForTeacher?.name || "Belum Ditentukan"}
                 </span>
              </div>
              <div className="flex items-center gap-2">
                 <TimeIcon className="size-4 text-gray-400" />
                 <span>
                    <span className="font-semibold text-gray-900 dark:text-white">Waktu:</span> {selectedSession.startTime.slice(0, 5)} - {selectedSession.endTime.slice(0, 5)}
                 </span>
              </div>
              <div className="flex items-center gap-2">
                 <MapPinIcon className="size-4 text-gray-400" />
                 <span>
                    <span className="font-semibold text-gray-900 dark:text-white">Tanggal:</span> {format(new Date(selectedSession.sessionDate), "dd MMMM yyyy")}
                 </span>
              </div>
            </div>

            {selectedSession.isSubstitution && (
              <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-3 rounded-xl">
                 <p className="text-yellow-800 dark:text-yellow-400 text-xs font-medium">
                   Sesi ini adalah penggantian guru untuk: <strong>{selectedSession.substituteForTeacher?.name || "Guru Lain"}</strong>
                 </p>
              </div>
            )}

            {selectedSession.isCancelled && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 rounded-xl">
                 <p className="text-red-800 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                   Sesi ini telah dibatalkan
                 </p>
              </div>
            )}

            <div className="pt-2">
               <span className="font-semibold text-gray-900 dark:text-white block mb-1">Catatan Khusus:</span>
               {selectedSession.notes ? (
                 <p className="bg-white dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/5 whitespace-pre-wrap text-sm italic">
                   {selectedSession.notes}
                 </p>
               ) : (
                 <p className="text-gray-400 dark:text-gray-500 italic text-sm">Tidak ada catatan untuk sesi ini.</p>
               )}
            </div>
            
            <div className="pt-4 flex justify-end">
              <button 
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WeeklySessionMatrix;
