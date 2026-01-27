import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  useTeachingScheduleTemplates,
  useClasses,
} from "../../../api/hooks/useAcademic";
import { academicService } from "../../../api/services/academicService";
import { profilesService } from "../../../api/services/profilesService";
import { ruleService } from "../../../api/services/ruleService";
import { useSearchParams } from "react-router";
import {
  TeachingScheduleTemplate,
  CreateTeachingScheduleTemplateDto,
  ClassSubject,
  TeacherSubject,
  Subject,
  Class,
} from "../../../api/types/academic";
import { ScheduleRule } from "../../../api/types/rules";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";
import {
  SearchIcon,
  DocsIcon,
  ListIcon,
  CloseIcon,
  UserIcon,
  FileIcon,
  TableIcon,
  DownloadIcon,
  PlusIcon,
} from "../../../components/atoms/Icons";
import { showError, showSuccess } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import ScheduleMatrix, { ItemTypes } from "./ScheduleMatrix";
import { useQuery } from "@tanstack/react-query";
import ScheduleGeneratorModal from "./ScheduleGeneratorModal";
import { DndProvider, useDrag } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import {
  stringToPastelColor,
  stringToDarkerColor,
} from "../../../utils/colors";

interface DraggableItemProps {
  data: ClassSubject | TeacherSubject;
  isSelected: boolean;
  onSelect: (data: ClassSubject | TeacherSubject) => void;
}

const DraggableSubject: React.FC<
  DraggableItemProps & {
    unitUsage?: number;
    unitTotal?: number;
  }
> = ({ data, isSelected, onSelect, unitUsage = 0, unitTotal = 0 }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SUBJECT,
    item: data,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Determine type and extract data
  const isClassSubject = "class" in data;
  const subject = isClassSubject
    ? (data as ClassSubject).subject
    : (data as TeacherSubject).subject;
  // Extract all assigned teachers for ClassSubject
  const assignedTeachers = isClassSubject
    ? (data as ClassSubject).teachingAssignments
        ?.map((a) => a.teacher)
        .filter(Boolean) || []
    : [(data as TeacherSubject).teacher].filter(Boolean);

  const className = isClassSubject ? (data as ClassSubject).class?.name : null;

  // For Teacher subjects, extract all classes this subject is linked to
  const associatedClasses = !isClassSubject
    ? (
        (data as TeacherSubject).subject as unknown as Subject & {
          classSubjects: ClassSubject[];
        }
      )?.classSubjects
        ?.map((cs: ClassSubject) => cs.class?.name)
        .filter(Boolean)
    : null;

  // Dynamic Colors
  const subjectName = subject?.name || "Unknown Subject";
  const bgColor = stringToPastelColor(subjectName);
  const borderColor = stringToDarkerColor(subjectName);
  const textColor = stringToDarkerColor(subjectName);

  // JP Calculation (Show if isClassSubject)
  const showJp = isClassSubject && unitTotal > 0;
  const percent = showJp ? Math.min(100, (unitUsage / unitTotal) * 100) : 0;
  const isOverBudget = unitUsage > unitTotal;

  return (
    <div
      ref={drag as unknown as React.LegacyRef<HTMLDivElement>}
      onClick={() => onSelect(data)}
      className={`group relative overflow-hidden rounded-lg p-3 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md ${
        isDragging ? "opacity-40 grayscale scale-95" : "opacity-100 scale-100"
      } ${isSelected ? "ring-2 ring-brand-500 shadow-lg" : ""}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderLeftColor: borderColor,
      }}
    >
      <div className="flex flex-col gap-1.5">
        {/* Subject Name */}
        <div className="flex justify-between items-start">
          <span
            className="font-bold text-sm leading-tight line-clamp-2"
            style={{ color: textColor }}
          >
            {subjectName}
          </span>
          <div className="flex flex-col items-end gap-1">
            <div className="p-1 rounded bg-white/50 hover:bg-white text-gray-500 transition-colors">
              <DocsIcon className="size-3.5" />
            </div>
          </div>
        </div>

        {/* JP Progress Bar */}
        {showJp && (
          <div className="mt-1 w-full flex flex-col gap-0.5">
            <div
              className="flex justify-between items-center text-[10px] font-bold opacity-80"
              style={{ color: textColor }}
            >
              <span>
                {unitUsage} / {unitTotal} JP
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/40 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${isOverBudget ? "bg-red-500" : "bg-green-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Teacher Info */}
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-1.5">
            {assignedTeachers.length > 0 ? (
              assignedTeachers.map((t, i) => (
                <div
                  key={t?.id || i}
                  className="flex items-center gap-1.5 overflow-hidden"
                  title={t?.name}
                >
                  <UserIcon className="size-3 shrink-0 opacity-70" />
                  <span className="text-[10px] font-medium truncate leading-tight opacity-90">
                    {t?.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex items-center gap-1.5 opacity-60">
                <UserIcon className="size-3 shrink-0" />
                <span className="text-[10px] italic">No Teacher Assigned</span>
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {className && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/60 border border-black/5"
              style={{ color: textColor }}
            >
              {className}
            </span>
          )}

          {/* Associated Classes for Teacher Mode */}
          {associatedClasses && associatedClasses.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {associatedClasses.slice(0, 3).map((cls, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/40 border border-black/5"
                  style={{ color: textColor }}
                >
                  {cls}
                </span>
              ))}
              {associatedClasses.length > 3 && (
                <span
                  className="text-[9px] opacity-70 px-1"
                  style={{ color: textColor }}
                >
                  +{associatedClasses.length - 3} more
                </span>
              )}
            </div>
          )}

          {!isClassSubject &&
            (!associatedClasses || associatedClasses.length === 0) && (
              <span
                className="text-[10px] italic opacity-60 px-1"
                style={{ color: textColor }}
              >
                Any Class
              </span>
            )}
        </div>
      </div>
    </div>
  );
};

const AvailabilityTimeline: React.FC<{
  day: string;
  startTime: string;
  endTime: string;
  rule?: ScheduleRule;
  otherSessions: TeachingScheduleTemplate[];
  onSelectTime: (start: string, end: string) => void;
}> = ({ startTime, endTime, rule, otherSessions, onSelectTime }) => {
  const effectiveRule =
    rule && rule.isActive
      ? rule
      : ({
          startTime: "07:00",
          endTime: "16:00",
          breaks: [],
          isActive: true,
        } as unknown as ScheduleRule);

  const toMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    const mins = (h || 0) * 60 + (m || 0);
    // If end time is "00:00" it usually means 24:00/next day in these systems if start is late,
    // but strictly here we handle standard day times.
    return mins;
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const dayStart = toMinutes(effectiveRule.startTime);
  const dayEnd = toMinutes(effectiveRule.endTime);
  const totalDuration = dayEnd - dayStart;

  if (totalDuration <= 0) return null;

  const getPos = (time: string) => {
    const mins = toMinutes(time);
    return Math.max(
      0,
      Math.min(100, ((mins - dayStart) / totalDuration) * 100),
    );
  };

  // --- GAP CALCULATION ---
  const allOccupied = [
    ...(effectiveRule.breaks || []).map((b) => ({
      start: toMinutes(b.startTime),
      end: toMinutes(b.endTime),
      type: "break",
    })),
    ...otherSessions.map((s) => ({
      start: toMinutes(s.startTime),
      end: toMinutes(s.endTime),
      type: "session",
    })),
  ].sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const mergedOccupied: { start: number; end: number }[] = [];
  if (allOccupied.length > 0) {
    let current = allOccupied[0];
    for (let i = 1; i < allOccupied.length; i++) {
      const next = allOccupied[i];
      if (next.start < current.end) {
        current.end = Math.max(current.end, next.end);
      } else {
        mergedOccupied.push(current);
        current = next;
      }
    }
    mergedOccupied.push(current);
  }

  // Find Available Slots of at least 45 mins
  const availableSlots: { start: number; end: number; label: string }[] = [];
  let pointer = dayStart;

  // Add dummy end to loop easier
  const checkPoints = [...mergedOccupied, { start: dayEnd, end: dayEnd }];

  for (const block of checkPoints) {
    if (block.start > pointer) {
      const duration = block.start - pointer;
      if (duration >= 45) {
        // Minimum 45 mins to be suggested
        // Suggest chunks of 90 mins (2 JP) or max available
        // For now, just suggest the full slot or up to 90 mins standard
        availableSlots.push({
          start: pointer,
          end: block.start,
          label: `${formatTime(pointer)} - ${formatTime(block.start)}`,
        });
      }
    }
    pointer = Math.max(pointer, block.end);
  }

  const currentStartPos = getPos(startTime);
  const currentEndPos = getPos(endTime);
  const currentWidth = Math.max(0, currentEndPos - currentStartPos);

  // Conflict Check
  const startMins = toMinutes(startTime);
  const endMins = toMinutes(endTime);

  const hasBreakConflict = effectiveRule.breaks?.some((b) => {
    const bStart = toMinutes(b.startTime);
    const bEnd = toMinutes(b.endTime);
    return startMins < bEnd && endMins > bStart;
  });

  const hasSessionConflict = otherSessions.some((s) => {
    const sStart = toMinutes(s.startTime);
    const sEnd = toMinutes(s.endTime);
    return startMins < sEnd && endMins > sStart;
  });

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;

    let clickMins = dayStart + totalDuration * percent;
    // Snap to nearest 15 mins
    clickMins = Math.round(clickMins / 15) * 15;

    // Find if this click is inside a valid slot
    // Simple logic: Default to 90 mins (2 JP)
    let proposedEnd = clickMins + 90;

    // Constrain to next boundary
    const nextObstacle = checkPoints.find((p) => p.start > clickMins);
    if (nextObstacle && proposedEnd > nextObstacle.start) {
      proposedEnd = nextObstacle.start;
    }

    // If duration is too short (< 30), maybe it's invalid click or try to fit backwards?
    // Let's just set it.
    onSelectTime(formatTime(clickMins), formatTime(proposedEnd));
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <div className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5">
            {effectiveRule.startTime.slice(0, 5)}
          </div>

          <div className="flex items-center gap-2">
            {hasBreakConflict || hasSessionConflict ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase animate-pulse">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                {hasBreakConflict ? "Rest Period Conflict" : "Session Overlap"}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-bold uppercase">
                <div className="size-1.5 rounded-full bg-green-500" />
                Valid
              </div>
            )}
          </div>

          <div className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs font-mono font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5">
            {effectiveRule.endTime.slice(0, 5)}
          </div>
        </div>

        <div
          className="relative h-10 w-full bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm cursor-crosshair group/timeline"
          onClick={handleTimelineClick}
        >
          {/* Track Pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

          {/* Breaks */}
          {effectiveRule.breaks?.map((b, i) => {
            const startPos = getPos(b.startTime);
            const endPos = getPos(b.endTime);
            return (
              <div
                key={`break-${i}`}
                className="absolute top-0 bottom-0 bg-gray-100/80 dark:bg-white/10 border-x border-gray-200 dark:border-white/10 pointer-events-none flex items-center justify-center overflow-hidden z-10"
                style={{
                  left: `${startPos}%`,
                  width: `${Math.max(0.5, endPos - startPos)}%`,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)",
                }}
              >
                {endPos - startPos > 2 && (
                  <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest select-none">
                    Rest
                  </span>
                )}
              </div>
            );
          })}

          {/* Other Sessions */}
          {otherSessions.map((s, i) => {
            const startPos = getPos(s.startTime);
            const endPos = getPos(s.endTime);
            return (
              <div
                key={`other-session-${i}`}
                className="absolute top-0 bottom-0 bg-red-500/10 border-x border-red-500/20 pointer-events-none"
                style={{
                  left: `${startPos}%`,
                  width: `${Math.max(0.5, endPos - startPos)}%`,
                }}
              />
            );
          })}

          {/* Current Selection */}
          <div
            className="absolute top-0 bottom-0 bg-brand-500/30 border-x-2 border-brand-500 z-10 transition-all duration-300 shadow-[0_0_15px_rgba(var(--brand-500-rgb),0.3)] pointer-events-none"
            style={{ left: `${currentStartPos}%`, width: `${currentWidth}%` }}
          />
        </div>
      </div>

      {/* Smart Suggestions */}
      {availableSlots.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <PlusIcon className="size-3" />
            <span>
              Smart Suggestions (Found {availableSlots.length} available slots)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSlots.slice(0, 4).map((slot, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  onSelectTime(
                    formatTime(slot.start),
                    formatTime(Math.min(slot.start + 90, slot.end)),
                  )
                } // Suggest 2 JP by default
                className="px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-300 dark:hover:bg-brand-500/20 text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center gap-1"
              >
                <span>{formatTime(slot.start)}</span>
                <span className="opacity-50 mx-0.5">➔</span>
                <span>{formatTime(Math.min(slot.start + 90, slot.end))}</span>
                {slot.end - slot.start > 90 && (
                  <span className="text-[9px] opacity-60 ml-1">
                    (of {Math.round(slot.end - slot.start)}m)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ... (Rest of component)

// Update keys and state in component:
// Rename teacherAssignments -> teacherSubjects
// Update useQuery

const dayOptions = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
  { label: "Saturday", value: "SATURDAY" },
];

const TeachingScheduleTemplates: React.FC = () => {
  const [selectedClassSubject, setSelectedClassSubject] =
    useState<ClassSubject | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [searchParams] = useSearchParams();

  // View Mode State
  const [viewMode, setViewMode] = useState<"subject" | "teacher">("subject");
  const [selectedViewClass, setSelectedViewClass] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<{
    label: string;
    value: string;
    subLabel?: string;
  } | null>(null);

  // Class Filter (for effective rules visualization and sidebar filtering in Teacher Mode)
  const [selectedSidebarClassFilter, setSelectedSidebarClassFilter] =
    useState<string>("");

  // Handle URL Params (e.g.redirect from Personal Schedule)
  const initialLoadRef = useRef(false);
  useEffect(() => {
    const teacherId = searchParams.get("teacherId");
    if (teacherId && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setViewMode("teacher");

      const fetchTeacher = async () => {
        try {
          // Fetch employee/teacher details by User ID
          const employee = await profilesService.getEmployee(teacherId);

          if (employee) {
            const opt = {
              label: employee.user?.name || "Unknown Teacher",
              value: teacherId,
              subLabel: employee.employeeId || employee.nip || undefined,
            };

            setTeacherOptions((prev) => {
              if (!prev.some((o) => o.value === teacherId)) {
                return [...prev, opt];
              }
              return prev;
            });
            setSelectedTeacher(opt);
          } else {
            throw new Error("Teacher not found");
          }
        } catch (error) {
          console.error("Error setting teacher from URL", error);
          const fallback = { label: "Teacher", value: teacherId };
          setSelectedTeacher(fallback);
          setTeacherOptions((prev) => {
            if (!prev.some((o) => o.value === teacherId)) {
              return [...prev, fallback];
            }
            return prev;
          });
        }
      };
      fetchTeacher();
    }
  }, [searchParams]);

  // Tab State & Refs
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const tabs = useMemo(
    () => [
      { id: "subject", label: "Class Schedule" },
      { id: "teacher", label: "Teacher Schedule" },
    ],
    [],
  );

  useEffect(() => {
    const activeElement = tabRefs.current[viewMode];
    if (activeElement) {
      setIndicatorStyle((prev) => {
        const newLeft = activeElement.offsetLeft;
        const newWidth = activeElement.offsetWidth;
        if (prev.left !== newLeft || prev.width !== newWidth) {
          return { left: newLeft, width: newWidth };
        }
        return prev;
      });
    }
  }, [viewMode]);

  // Draggable Sidebar Button State
  const [buttonTop, setButtonTop] = useState(176); // Default top-44
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const initialTopRef = useRef(176);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isDraggingRef.current = false;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragStartYRef.current = clientY;
      initialTopRef.current = buttonTop;

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
        const currentY =
          "touches" in moveEvent
            ? moveEvent.touches[0].clientY
            : moveEvent.clientY;
        const deltaY = currentY - dragStartYRef.current;

        if (Math.abs(deltaY) > 5) {
          isDraggingRef.current = true;
        }

        const constrainedTop = Math.max(
          72,
          Math.min(window.innerHeight - 80, initialTopRef.current + deltaY),
        );
        setButtonTop(constrainedTop);
      };

      const onEnd = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [buttonTop],
  );

  const handleSidebarOpen = () => {
    if (!isDraggingRef.current) {
      setIsSidebarOpen(true);
    }
  };

  // State for handling generic subject drop
  const [droppedSubject, setDroppedSubject] = useState<TeacherSubject | null>(
    null,
  );

  const { confirm, confirmState } = useConfirm();

  // Fetch Classes for Filter
  const { data: classesData } = useClasses({ limit: 100 });
  const classOptions: { label: string; value: string }[] = useMemo(
    () =>
      classesData?.data.map((c: Class) => ({
        label: c.name,
        value: String(c.id),
      })) || [],
    [classesData],
  );

  // Fetch Class Subjects for Sidebar (Subject Mode only)
  const { data: classSubjectsResponse, isLoading: isLoadingSubjects } =
    useQuery({
      queryKey: [
        "academic",
        "class-subjects",
        viewMode,
        selectedViewClass,
        subjectSearch,
      ],
      queryFn: () =>
        academicService.getClassSubjects({
          classId:
            viewMode === "subject" && selectedViewClass
              ? selectedViewClass
              : undefined,
          search: subjectSearch || undefined,
          limit: 100,
        }),
      enabled: viewMode === "subject",
    });

  const classSubjects = useMemo(
    () => classSubjectsResponse?.data || [],
    [classSubjectsResponse],
  );

  // Fetch Templates (Dynamic based on View Mode)
  const {
    data: response,
    createMutation,
    updateMutation,
    deleteMutation,
    isLoading: isLoadingTemplates,
  } = useTeachingScheduleTemplates({
    classId:
      viewMode === "subject" ? selectedViewClass || undefined : undefined,
    teacherId: viewMode === "teacher" ? selectedTeacher?.value : undefined,
    limit: 100,
  });

  const templates = useMemo(() => response?.data || [], [response]);

  // Fetch Active Teaching Unit Policy (JP)
  const { data: policyData } = useQuery({
    queryKey: ["academic", "teaching-unit-policies", "active"],
    queryFn: () => academicService.getActiveTeachingUnitPolicy(),
  });

  const minutesPerUnit = useMemo(
    () => policyData?.data?.minutesPerUnit || 45,
    [policyData],
  );

  // Calculate JP Usage per Subject
  const subjectUsageMap = useMemo(() => {
    const map: Record<string | number, number> = {};

    templates.forEach((t) => {
      if (!t.isActive) return;
      const start = new Date(`1970-01-01T${t.startTime}`);
      const end = new Date(`1970-01-01T${t.endTime}`);
      const diffMinutes = (end.getTime() - start.getTime()) / 60000;
      const units = diffMinutes / minutesPerUnit;

      const subjectKey = t.classSubjectId;
      if (subjectKey) {
        map[subjectKey] = (map[subjectKey] || 0) + units;
      }
    });
    return map;
  }, [templates, minutesPerUnit]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TeachingScheduleTemplate | null>(null);

  // Form Data
  const handleOpenModal = (
    day?: string,
    template?: TeachingScheduleTemplate,
    overrideClassSubject?: ClassSubject,
  ) => {
    setDroppedSubject(null);
    if (template) {
      setSelectedTemplate(template);

      // Ensure teacher is in options so it displays correctly
      if (template.defaultTeacher) {
        setTeacherOptions((prev) => {
          // Assuming defaultTeacher has id and name
          const teacherId = String(
            template.defaultTeacher?.id || template.defaultTeacherId,
          );
          const teacherName =
            template.defaultTeacher?.name || "Unknown Teacher";

          const exists = prev.some((o) => o.value === teacherId);
          if (!exists) {
            return [...prev, { label: teacherName, value: teacherId }];
          }
          return prev;
        });
      }

      setFormData({
        classSubjectId: String(template.classSubjectId),
        defaultTeacherId: template.defaultTeacherId
          ? String(template.defaultTeacherId)
          : "",
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime,
        plannedUnits: template.plannedUnits,
        isActive: template.isActive,
      });
    } else {
      setSelectedTemplate(null);

      // Use override subject if provided (handles drag-drop race condition), otherwise use state
      const targetSubject = overrideClassSubject || selectedClassSubject;
      let initialClassSubjectId = "";
      let initialTeacherId = selectedTeacher?.value || "";

      // Case 1: Subject View - Pre-select ClassSubject and check for Assigned Teacher
      if (viewMode === "subject" && targetSubject) {
        initialClassSubjectId = String(targetSubject.id);

        // Auto-select primary teacher if available
        if (
          !initialTeacherId &&
          targetSubject.teachingAssignments &&
          targetSubject.teachingAssignments.length > 0
        ) {
          const primary = targetSubject.teachingAssignments.find(
            (ta) => ta.role === "primary",
          );
          const target = primary || targetSubject.teachingAssignments[0];

          if (target && target.teacher) {
            initialTeacherId = String(
              target.teacher.public_id || target.teacher.id,
            );

            // Ensure this teacher is in the options list so it displays correctly
            setTeacherOptions((prev) => {
              const label = target.teacher?.name || "Assigned Teacher";
              if (!prev.some((o) => o.value === initialTeacherId)) {
                return [...prev, { label, value: initialTeacherId }];
              }
              return prev;
            });
          }
        }
      }
      // Case 2: Teacher View - Handle Dropped Subject (if implemented) or empty state
      // (Teacher View typically implies drag-and-drop where classSubjectId comes from the dropped item)

      // Calculate default times based on today's rule
      const defaultDay = day || "MONDAY";
      let defaultStart = "07:00";
      let defaultEnd = "08:30";

      if (effectiveRules) {
        const rule =
          effectiveRules[defaultDay] ||
          effectiveRules[defaultDay.toUpperCase()];
        if (rule && rule.isActive) {
          defaultStart = rule.startTime.slice(0, 5);
          const [h, m] = defaultStart.split(":").map(Number);
          const d = new Date();
          d.setHours(h, m + 90, 0, 0);
          defaultEnd = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
      }

      setFormData({
        classSubjectId: initialClassSubjectId,
        defaultTeacherId: initialTeacherId,
        dayOfWeek: day || "MONDAY",
        startTime: defaultStart,
        endTime: defaultEnd,
        plannedUnits: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const [formData, setFormData] = useState<CreateTeachingScheduleTemplateDto>({
    classSubjectId: "",
    defaultTeacherId: "",
    dayOfWeek: "MONDAY",
    startTime: "08:00",
    endTime: "09:30",
    plannedUnits: 0,
    isActive: true,
  });

  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<
    { label: string; value: string; subLabel?: string }[]
  >([]);

  // Async Select Options for Class Subjects (Teacher Mode)
  const [availableClassSubjects, setAvailableClassSubjects] = useState<
    ClassSubject[]
  >([]);
  const [isSearchingClassSubjects, setIsSearchingClassSubjects] =
    useState(false);
  const [classSubjectOptions, setClassSubjectOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const searchClassSubjects = useCallback(
    async (term: string) => {
      setIsSearchingClassSubjects(true);
      try {
        const resp = await academicService.getClassSubjects({
          search: term,
          limit: 20,
          isActive: true,
          subjectId: droppedSubject?.subjectId, // Include subjectId if a subject was dropped
        });
        setAvailableClassSubjects(resp.data);
        setClassSubjectOptions(
          resp.data.map((cs) => ({
            label: `${cs.class?.name} - ${cs.academicYear?.name}`,
            value: String(cs.id),
          })),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearchingClassSubjects(false);
      }
    },
    [droppedSubject],
  );

  // Helper to get classId
  const effectiveClassId = useMemo(() => {
    // If in Subject Mode, the selected view class IS the effective class
    if (viewMode === "subject" && selectedViewClass) return selectedViewClass;

    // If in Teacher Mode and user filtered sidebar, maybe use that?
    if (selectedSidebarClassFilter) return selectedSidebarClassFilter;

    // Fallback or specific logic for Teacher Mode form data...
    if (viewMode === "teacher" && formData.classSubjectId) {
      // Try to find in availableClassSubjects
      const found = availableClassSubjects.find(
        (cs) => String(cs.id) === String(formData.classSubjectId),
      );
      if (found) return found.classId || found.class?.id;
    }

    return null;
  }, [
    viewMode,
    selectedViewClass,
    formData.classSubjectId,
    availableClassSubjects,
    selectedSidebarClassFilter,
  ]);

  const { data: rulesResponse } = useQuery({
    queryKey: ["rules", "effective", effectiveClassId],
    queryFn: () =>
      effectiveClassId
        ? ruleService.getEffectiveScheduleRules({ classId: effectiveClassId })
        : null,
    enabled: !!effectiveClassId,
    staleTime: 0,
  });

  const effectiveRules = useMemo(() => {
    const data = rulesResponse?.data;
    if (!data) return null;

    // Handle both Array and Object/Map responses
    if (Array.isArray(data)) {
      const map: Record<string, ScheduleRule> = {};
      data.forEach((rule: ScheduleRule) => {
        if (rule && rule.dayOfWeek) {
          map[rule.dayOfWeek] = rule;
        }
      });
      return map;
    }
    return data as Record<string, ScheduleRule>;
  }, [rulesResponse]);

  // Filter Day Options based on Rules
  // Update: User wants to show ALL days, but disable inactive ones visually.
  // So we return full dayOptions.
  const availableDayOptions = useMemo(() => dayOptions, []);

  // Update Times when Day Changes
  const handleDayChange = (day: string) => {
    let newStart = formData.startTime;
    let newEnd = formData.endTime;

    if (effectiveRules) {
      // Check for rule for the selected day (normalize case)
      const rule = effectiveRules[day] || effectiveRules[day.toUpperCase()];

      if (rule && rule.isActive) {
        // Set start time to policy start time
        newStart = rule.startTime.slice(0, 5);

        // Set end time to start + 90 mins (2 JP) default
        const [h, m] = newStart.split(":").map(Number);
        const date = new Date();
        date.setHours(h, m + 90, 0, 0);
        const endH = String(date.getHours()).padStart(2, "0");
        const endM = String(date.getMinutes()).padStart(2, "0");
        newEnd = `${endH}:${endM}`;
      }
    }
    setFormData((prev) => ({
      ...prev,
      dayOfWeek: day,
      startTime: newStart,
      endTime: newEnd,
    }));
  };

  // Fetch Teacher Subjects (for sidebar)
  const { data: teacherSubjectsResponse, isLoading: isLoadingTeacherSubjects } =
    useQuery({
      queryKey: ["academic", "teacher-subjects", selectedTeacher?.value],
      queryFn: () =>
        academicService.getTeacherSubjects({
          teacherId: selectedTeacher?.value,
          limit: 100,
          isActive: true,
        }),
      enabled: !!selectedTeacher?.value && viewMode === "teacher",
    });

  // Fetch Teacher Workload (for Progress Bar)
  const { data: teacherWorkloadResponse } = useQuery({
    queryKey: [
      "academic",
      "workload-contracts",
      "teacher-active",
      selectedTeacher?.value,
    ],
    queryFn: () =>
      academicService.getWorkloadContracts({
        teacherId: selectedTeacher?.value,
        isActive: true, // Fetch only active contracts
        limit: 1,
      }),
    enabled: viewMode === "teacher" && !!selectedTeacher?.value,
  });

  const teacherWorkload = useMemo(
    () => teacherWorkloadResponse?.data?.[0],
    [teacherWorkloadResponse],
  );

  const teacherSubjects = useMemo(
    () => teacherSubjectsResponse?.data || [],
    [teacherSubjectsResponse],
  );

  const searchTeachers = useCallback(
    async (term: string) => {
      // If in Subject View and a Subject is selected, restricting search to assigned teachers only
      if (viewMode === "subject" && selectedClassSubject) {
        const assignments = selectedClassSubject.teachingAssignments || [];
        const filtered = assignments
          .map((a) => a.teacher)
          .filter(
            (t) => t && t.name.toLowerCase().includes(term.toLowerCase()),
          );

        setTeacherOptions(
          filtered.map((t) => ({
            label: t!.name,
            value: String(t!.public_id || t!.id),
            subLabel: t!.email,
          })),
        );
        return;
      }

      setIsSearchingTeachers(true);
      try {
        const workloads = await academicService.getTeacherWorkloads({
          search: term,
          // limit is not in params interface but backend might handle it, or we rely on search.
        });

        setTeacherOptions(
          (workloads.data || []).map((w) => {
            const isOverload = w.status === "OVERLOAD";
            const isBalanced = w.status === "BALANCED";
            const isUnderload = w.status === "UNDERLOAD";

            let statusIcon = "🔴";
            if (isBalanced) statusIcon = "🟢";
            if (isUnderload) statusIcon = "🟡";

            // Format: "Mr. Budi (🟢 20/24 JP)"
            // Or Warn: "⚠️ Mr. Budi (🔴 26/24 JP)"

            const loadInfo = `(${statusIcon} ${w.actualUnits}/${w.targetUnits} JP)`;
            const prefix = isOverload ? "⚠️ " : "";

            return {
              label: `${prefix}${w.teacherName} ${loadInfo}`,
              value: w.teacherId,
              subLabel: isOverload ? "Overloaded" : undefined,
            };
          }),
        );
      } catch (error) {
        console.error("Failed to search teachers", error);
      } finally {
        setIsSearchingTeachers(false);
      }
    },
    [viewMode, selectedClassSubject],
  );

  // ... (keeping other handlers)

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classSubjectId) {
      showError("Please select a Class Subject.");
      return;
    }
    if (!formData.defaultTeacherId) {
      showError("Please select an Assigned Teacher.");
      return;
    }

    // Validate against Effective Rules
    if (effectiveRules) {
      // Normalize day key to match rule keys
      // Try exact match, then Title Case, then UPPER CASE
      const dayKey = formData.dayOfWeek;
      const rule =
        effectiveRules[dayKey] ||
        effectiveRules[
          dayKey.charAt(0).toUpperCase() + dayKey.slice(1).toLowerCase()
        ] ||
        effectiveRules[dayKey.toUpperCase()];

      if (!rule || !rule.isActive) {
        showError(
          `Scheduling on ${formData.dayOfWeek} is not allowed by the effective schedule rules.`,
        );
        return;
      }

      // Validate Times
      // We assume times are in "HH:mm" format.
      // Rule times might be "HH:mm:ss", so we slice(0, 5)
      const ruleStart = rule.startTime.slice(0, 5);
      const ruleEnd = rule.endTime.slice(0, 5);
      const selectedStart = formData.startTime;
      const selectedEnd = formData.endTime;

      if (selectedStart < ruleStart || selectedEnd > ruleEnd) {
        showError(
          `Invalid Time. Session time must be within ${ruleStart} - ${ruleEnd}.`,
        );
        return;
      }
    }

    // Validate Duration Multiple (JP)
    const st = new Date(`1970-01-01T${formData.startTime}`);
    const et = new Date(`1970-01-01T${formData.endTime}`);
    const durationMins = (et.getTime() - st.getTime()) / 60000;

    if (durationMins <= 0) {
      showError("End time must be after start time.");
      return;
    }

    if (durationMins % minutesPerUnit !== 0) {
      const units = (durationMins / minutesPerUnit).toFixed(2);
      const confirmed = await confirm({
        title: "Non-Standard Duration",
        message: `The selected duration (${durationMins} mins) is not a multiple of the standard Teaching Unit (${minutesPerUnit} mins).\n\nThis equals ${units} JP. Do you want to proceed?`,
        confirmText: "Proceed",
        variant: "warning", // Using warning variant for attention
      });
      if (!confirmed) return;
    }

    // Calculate Planned Units
    const calculatedUnits =
      durationMins > 0 ? Number((durationMins / minutesPerUnit).toFixed(2)) : 0;

    try {
      if (selectedTemplate) {
        await updateMutation.mutateAsync({
          id: selectedTemplate.id,
          data: {
            ...formData,
            classSubjectId: Number(formData.classSubjectId),
            startTime: formData.startTime.slice(0, 5),
            endTime: formData.endTime.slice(0, 5),
            plannedUnits: calculatedUnits,
          },
        });
        showSuccess("Session updated successfully");
      } else {
        await createMutation.mutateAsync({
          ...formData,
          classSubjectId: Number(formData.classSubjectId),
          startTime: formData.startTime.slice(0, 5),
          endTime: formData.endTime.slice(0, 5),
          plannedUnits: calculatedUnits,
        });
        showSuccess("Session created successfully");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showError("Failed to save schedule");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      title: "Delete Schedule",
      message: "Are you sure you want to delete this schedule template?",
      confirmText: "Delete",
      variant: "delete",
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Schedule deleted successfully");
      } catch (error) {
        console.error(error);
        showError("Failed to delete schedule");
      }
    }
  };

  const handleMoveSession = async (
    templateId: number | string,
    newDay: string,
    newStartTime: string,
    newEndTime: string,
  ) => {
    try {
      await updateMutation.mutateAsync({
        id: templateId,
        data: {
          dayOfWeek: newDay,
          startTime: newStartTime.slice(0, 5),
          endTime: newEndTime.slice(0, 5),
        },
      });
      showSuccess("Session moved successfully");
    } catch (error) {
      console.error(error);
      showError("Failed to move session");
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <PageMeta
        title="Teaching Schedule Templates | Sistem Akademik"
        description="Manage weekly class schedules and teacher assignments."
      />
      <PageBreadcrumb pageTitle="Teaching Schedule" />

      <div className="relative flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
        {/* Sidebar Drawer - Fixed Right Overlay */}
        <div
          className={`fixed top-[72px] bottom-0 right-0 z-[999] transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <aside className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col">
            {/* Keep existing sidebar header/content */}
            <div className="p-4 pt-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/50">
              <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                <ListIcon className="size-4 text-brand-500" />
                Draggable Subjects
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Close Sidebar"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col bg-gray-50/30 dark:bg-zinc-900/50">
              <div className="p-4 border-b border-gray-100 dark:border-white/5 space-y-3 bg-white dark:bg-zinc-900">
                {viewMode === "teacher" && (
                  <div className="mb-3">
                    <CustomSelect
                      label="Filter by Class"
                      placeholder="All Classes"
                      options={[
                        { label: "All Classes", value: "" },
                        ...classOptions,
                      ]}
                      value={selectedSidebarClassFilter}
                      onChange={(val) =>
                        setSelectedSidebarClassFilter(String(val))
                      }
                    />
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search ${viewMode === "subject" ? "subjects" : "assigned subjects"}...`}
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  />
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoadingSubjects || isLoadingTeacherSubjects ? (
                  <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                    Loading...
                  </div>
                ) : (
                  <>
                    {viewMode === "subject" ? (
                      classSubjects.length > 0 ? (
                        classSubjects
                          .filter((s) =>
                            s.subject?.name
                              .toLowerCase()
                              .includes(subjectSearch.toLowerCase()),
                          )
                          .map((subject) => (
                            <DraggableSubject
                              key={`class-subject-${subject.id}`}
                              data={subject}
                              isSelected={
                                selectedClassSubject?.id === subject.id
                              }
                              onSelect={() => setSelectedClassSubject(subject)}
                              unitUsage={subjectUsageMap[subject.id] || 0}
                              unitTotal={subject.plannedUnitsPerWeek || 0}
                            />
                          ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                          <div className="size-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-3">
                            <DocsIcon className="size-6" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">
                            No subjects found
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Try selecting a class first or check your search.
                          </p>
                        </div>
                      )
                    ) : // Teacher Mode
                    teacherSubjects.length > 0 ? (
                      teacherSubjects
                        .filter((s) =>
                          s.subject?.name
                            .toLowerCase()
                            .includes(subjectSearch.toLowerCase()),
                        )
                        .filter(
                          (s) =>
                            !selectedSidebarClassFilter ||
                            classSubjects.find(
                              (cs) =>
                                cs.subjectId === s.subjectId &&
                                String(cs.classId) ===
                                  selectedSidebarClassFilter,
                            ),
                        )
                        .map((subject) => (
                          <DraggableSubject
                            key={`teacher-subject-${subject.id}`}
                            data={subject}
                            isSelected={droppedSubject?.id === subject.id}
                            onSelect={() => setDroppedSubject(subject)}
                          />
                        ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <p className="text-sm text-gray-500">
                          No allowed subjects found for this teacher.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full relative min-w-0">
          {/* Floating Toggle */}
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
                Open Sidebar
              </span>
            </button>
          )}

          <div className="space-y-6 w-full pb-20">
            <div className="space-y-6">
              {/* Combined Header & Tabs Panel */}
              <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col min-w-0 w-full max-w-full">
                {/* Header Section */}
                <div className="p-6 pb-0 relative">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Teaching Schedule Templates
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage weekly class schedules and teacher assignments.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs Section */}
                <div className="border-b border-t border-gray-100 dark:border-white/5 relative px-6 bg-gray-50/30 dark:bg-white/[0.01]">
                  <div className="flex gap-8 relative" ref={tabsRef}>
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          tabRefs.current[tab.id] = el;
                        }}
                        onClick={() =>
                          setViewMode(tab.id as "subject" | "teacher")
                        }
                        className={`py-4 text-sm font-medium transition-all relative z-10 ${
                          viewMode === tab.id
                            ? "text-brand-600 dark:text-brand-400 font-bold"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    {/* Indicator */}
                    <div
                      className="absolute bottom-0 h-0.5 bg-brand-500 transition-all duration-300 ease-out z-20"
                      style={{
                        left: `${indicatorStyle.left}px`,
                        width: `${indicatorStyle.width}px`,
                      }}
                    />
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 bg-white dark:bg-transparent min-w-0 overflow-hidden flex flex-col">
                  <div className="p-6 flex-1 w-full flex flex-col overflow-hidden">
                    {/* Context Selector */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                      <div className="flex-1 max-w-sm">
                        {viewMode === "subject" ? (
                          <CustomSelect
                            placeholder="Select Class..."
                            options={classOptions}
                            value={selectedViewClass}
                            onChange={(v) => setSelectedViewClass(String(v))}
                            label="Target Class"
                          />
                        ) : (
                          <div className="space-y-1">
                            <Label>Target Teacher</Label>
                            <div className="relative z-50">
                              <SearchableAsyncSelect
                                placeholder="Select Teacher..."
                                onSearch={searchTeachers}
                                options={teacherOptions}
                                isLoading={isSearchingTeachers}
                                value={selectedTeacher?.value || ""}
                                initialLabel={selectedTeacher?.label}
                                onChange={(_v, _l, opt) =>
                                  setSelectedTeacher(
                                    opt as {
                                      label: string;
                                      value: string;
                                      subLabel?: string;
                                    } | null,
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3">
                        {((viewMode === "subject" && selectedViewClass) ||
                          (viewMode === "teacher" && selectedTeacher)) && (
                          <>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    let blob;
                                    let filename;

                                    if (
                                      viewMode === "subject" &&
                                      selectedViewClass
                                    ) {
                                      const classId = selectedViewClass;
                                      blob =
                                        await academicService.printClassSchedule(
                                          classId,
                                        );
                                      filename = `schedule-class-${classId}.pdf`;
                                    } else if (
                                      viewMode === "teacher" &&
                                      selectedTeacher
                                    ) {
                                      const teacherId = selectedTeacher.value;
                                      blob =
                                        await academicService.printTeacherSchedule(
                                          teacherId,
                                        );
                                      filename = `schedule-teacher-${teacherId}.pdf`;
                                    }

                                    if (blob && filename) {
                                      const url = window.URL.createObjectURL(
                                        blob as Blob,
                                      );
                                      const link = document.createElement("a");
                                      link.href = url;
                                      link.setAttribute("download", filename);
                                      document.body.appendChild(link);
                                      link.click();
                                      link.parentNode?.removeChild(link);
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Failed to print schedule",
                                      error,
                                    );
                                    showError(
                                      "Failed to generate schedule PDF",
                                    );
                                  }
                                }}
                                className="flex items-center gap-2 px-4 h-[42px] bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                              >
                                <FileIcon className="size-3.5" />
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={async () => {
                                  try {
                                    let blob;
                                    let filename;

                                    if (
                                      viewMode === "subject" &&
                                      selectedViewClass
                                    ) {
                                      const classId = selectedViewClass;
                                      blob =
                                        await academicService.exportExcelClassSchedule(
                                          classId,
                                        );
                                      filename = `schedule-class-${classId}.xlsx`;
                                    } else if (
                                      viewMode === "teacher" &&
                                      selectedTeacher
                                    ) {
                                      const teacherId = selectedTeacher.value;
                                      blob =
                                        await academicService.exportExcelTeacherSchedule(
                                          teacherId,
                                        );
                                      filename = `schedule-teacher-${teacherId}.xlsx`;
                                    }

                                    if (blob && filename) {
                                      const url = window.URL.createObjectURL(
                                        blob as Blob,
                                      );
                                      const link = document.createElement("a");
                                      link.href = url;
                                      link.setAttribute("download", filename);
                                      document.body.appendChild(link);
                                      link.click();
                                      link.parentNode?.removeChild(link);
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Failed to export Excel",
                                      error,
                                    );
                                    showError("Failed to generate Excel file");
                                  }
                                }}
                                className="flex items-center gap-2 px-4 h-[42px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                              >
                                <TableIcon className="size-3.5" />
                                <span>Excel</span>
                              </button>
                            </div>

                            <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden md:block" />

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  showError(
                                    "Import Excel API not available yet",
                                  )
                                }
                                className="flex items-center gap-2 px-4 h-[42px] bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                              >
                                <PlusIcon className="size-3.5" />
                                <span>Import Excel</span>
                              </button>

                              <button
                                onClick={() =>
                                  showError(
                                    "Template download not available yet",
                                  )
                                }
                                className="flex items-center gap-2 px-4 h-[42px] bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-all"
                              >
                                <DownloadIcon className="size-3.5" />
                                <span>Template</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Matrix */}
                    {(
                      viewMode === "subject"
                        ? selectedViewClass
                        : selectedTeacher
                    ) ? (
                      <div className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden w-full max-w-full flex flex-col min-w-0 flex-1">
                        {viewMode === "subject" &&
                          !selectedClassSubject &&
                          selectedViewClass && (
                            <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                  {/* Ensure GridIcon is imported or use ListIcon as fallback if not available yet */}
                                  <ListIcon className="size-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900 dark:text-white">
                                    Class Schedule Summary
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    Total Progress for all Subjects
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 min-w-[200px]">
                                <div className="flex-1 flex flex-col gap-1.5">
                                  {(() => {
                                    // Calculate Total Target JP
                                    const totalTarget = classSubjects.reduce(
                                      (acc, s) =>
                                        acc + (s.plannedUnitsPerWeek || 0),
                                      0,
                                    );

                                    // Calculate Total Scheduled JP
                                    const totalScheduled = templates.reduce(
                                      (acc, t) => {
                                        if (!t.isActive) return acc;
                                        if (t.plannedUnits)
                                          return acc + t.plannedUnits;
                                        if (t.startTime && t.endTime) {
                                          const start = new Date(
                                            `1970-01-01T${t.startTime}`,
                                          );
                                          const end = new Date(
                                            `1970-01-01T${t.endTime}`,
                                          );
                                          const durationMins =
                                            (end.getTime() - start.getTime()) /
                                            60000;
                                          return acc + durationMins / 45;
                                        }
                                        return acc;
                                      },
                                      0,
                                    );

                                    const percent =
                                      totalTarget > 0
                                        ? (totalScheduled / totalTarget) * 100
                                        : 0;

                                    return (
                                      <>
                                        <div className="flex justify-between text-xs font-medium">
                                          <span className="text-gray-500">
                                            Total Scheduled
                                          </span>
                                          <span
                                            className={
                                              totalScheduled > totalTarget
                                                ? "text-red-600"
                                                : totalScheduled === totalTarget
                                                  ? "text-green-600"
                                                  : "text-brand-600"
                                            }
                                          >
                                            {parseFloat(
                                              totalScheduled.toFixed(1),
                                            )}{" "}
                                            / {totalTarget} Units
                                          </span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              totalScheduled > totalTarget
                                                ? "bg-red-500"
                                                : totalScheduled === totalTarget
                                                  ? "bg-green-500"
                                                  : "bg-brand-500"
                                            }`}
                                            style={{
                                              width: `${Math.min(100, percent)}%`,
                                            }}
                                          />
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Subject Progress Bar (Existing) */}
                        {viewMode === "subject" && selectedClassSubject && (
                          <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <DocsIcon className="size-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                  {selectedClassSubject?.subject?.name}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {selectedClassSubject?.class?.name} •{" "}
                                  {(selectedClassSubject?.subject as any)
                                    ?.units || 0}{" "}
                                  Units Required
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 min-w-[200px]">
                              <div className="flex-1 flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-gray-500">
                                    Planned Progress
                                  </span>
                                  <span
                                    className={
                                      templates.reduce(
                                        (acc, t) =>
                                          acc +
                                          (t.isActive ? t.plannedUnits : 0),
                                        0,
                                      ) >=
                                      ((selectedClassSubject?.subject as any)
                                        ?.units || 0)
                                        ? "text-green-600"
                                        : "text-brand-600"
                                    }
                                  >
                                    {templates.reduce(
                                      (acc, t) =>
                                        acc + (t.isActive ? t.plannedUnits : 0),
                                      0,
                                    )}{" "}
                                    /{" "}
                                    {(selectedClassSubject?.subject as any)
                                      ?.units || 0}{" "}
                                    Units
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      templates.reduce(
                                        (acc, t) =>
                                          acc +
                                          (t.isActive ? t.plannedUnits : 0),
                                        0,
                                      ) >=
                                      ((selectedClassSubject?.subject as any)
                                        ?.units || 0)
                                        ? "bg-green-500"
                                        : "bg-brand-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, (templates.reduce((acc, t) => acc + (t.isActive ? t.plannedUnits : 0), 0) / ((selectedClassSubject?.subject as any)?.units || 1)) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Teacher Workload Progress Bar */}
                        {viewMode === "teacher" &&
                          selectedTeacher &&
                          teacherWorkload && (
                            <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                  <UserIcon className="size-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900 dark:text-white">
                                    {teacherWorkload.teacher?.name ||
                                      selectedTeacher.label}
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    {teacherWorkload.academicYear?.name} •{" "}
                                    <span
                                      className={
                                        teacherWorkload.status === "OVERLOAD"
                                          ? "text-red-500 font-bold"
                                          : teacherWorkload.status ===
                                              "UNDERLOAD"
                                            ? "text-yellow-600 font-medium"
                                            : "text-green-600 font-medium"
                                      }
                                    >
                                      {teacherWorkload.status || "ACTIVE"}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 min-w-[200px]">
                                <div className="flex-1 flex flex-col gap-1.5">
                                  {(() => {
                                    // Calculate active scheduled units directly from templates
                                    const activeUnits = templates.reduce(
                                      (acc, t) => {
                                        if (!t.isActive) return acc;
                                        if (t.plannedUnits)
                                          return acc + t.plannedUnits;
                                        // Fallback: Calculate from time duration
                                        if (t.startTime && t.endTime) {
                                          const start = new Date(
                                            `1970-01-01T${t.startTime}`,
                                          );
                                          const end = new Date(
                                            `1970-01-01T${t.endTime}`,
                                          );
                                          const durationMins =
                                            (end.getTime() - start.getTime()) /
                                            60000;
                                          return acc + durationMins / 45; // Assuming 45 mins = 1 Unit
                                        }
                                        return acc;
                                      },
                                      0,
                                    );

                                    const targetUnits =
                                      teacherWorkload.targetUnitsPerWeek || 0;
                                    const minUnits =
                                      teacherWorkload.minUnitsPerWeek || 0;

                                    return (
                                      <>
                                        <div className="flex justify-between text-xs font-medium">
                                          <span className="text-gray-500">
                                            Workload Progress
                                          </span>
                                          <span
                                            className={
                                              activeUnits > targetUnits
                                                ? "text-red-600"
                                                : "text-brand-600"
                                            }
                                          >
                                            {parseFloat(activeUnits.toFixed(1))}{" "}
                                            / {targetUnits} JP
                                          </span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              activeUnits > targetUnits
                                                ? "bg-red-500"
                                                : activeUnits >= minUnits
                                                  ? "bg-green-500"
                                                  : "bg-brand-500"
                                            }`}
                                            style={{
                                              width: `${Math.min(100, (activeUnits / (targetUnits || 1)) * 100)}%`,
                                            }}
                                          />
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                        <div className="bg-gray-50 dark:bg-[#0B0B0F] flex-1 min-w-0 grid grid-cols-1">
                          <div className="w-full">
                            <ScheduleMatrix
                              templates={templates}
                              loading={isLoadingTemplates}
                              viewMode={viewMode}
                              availableDays={availableDayOptions}
                              effectiveRules={effectiveRules || undefined}
                              onAddSession={(day) => handleOpenModal(day)}
                              onDropSubject={(subject, day) => {
                                if ("class" in subject) {
                                  // Force check as string to avoid TS narrowing issues if present
                                  if ((viewMode as string) === "subject") {
                                    setSelectedClassSubject(
                                      subject as ClassSubject,
                                    );
                                    handleOpenModal(
                                      day,
                                      undefined,
                                      subject as ClassSubject,
                                    );
                                  } else {
                                    setDroppedSubject(null);
                                    setFormData({
                                      classSubjectId: String(subject.id),
                                      defaultTeacherId:
                                        selectedTeacher?.value || "",
                                      dayOfWeek: day,
                                      startTime: "08:00",
                                      endTime: "09:30",
                                      plannedUnits: 0,
                                      isActive: true,
                                    });
                                    setSelectedTemplate(null);
                                    setIsModalOpen(true);
                                  }
                                } else {
                                  const ts = subject as any;
                                  setDroppedSubject(ts);
                                  setSelectedTemplate(null);
                                  setFormData({
                                    classSubjectId: "",
                                    defaultTeacherId:
                                      ts.teacher?.public_id ||
                                      selectedTeacher?.value ||
                                      "",
                                    dayOfWeek: day,
                                    startTime: "08:00",
                                    endTime: "09:30",
                                    plannedUnits: 0,
                                    isActive: true,
                                  });
                                  setIsModalOpen(true);
                                }
                              }}
                              onEditSession={(session) => {
                                setSelectedTemplate(session);
                                if (session.defaultTeacher) {
                                  setTeacherOptions((prev) => {
                                    const teacherId = String(
                                      session.defaultTeacher?.id ||
                                        session.defaultTeacherId,
                                    );
                                    const teacherName =
                                      session.defaultTeacher?.name ||
                                      "Unknown Teacher";
                                    if (
                                      !prev.some((o) => o.value === teacherId)
                                    ) {
                                      return [
                                        ...prev,
                                        {
                                          label: teacherName,
                                          value: teacherId,
                                        },
                                      ];
                                    }
                                    return prev;
                                  });
                                }
                                setFormData({
                                  classSubjectId: String(
                                    session.classSubjectId,
                                  ),
                                  defaultTeacherId: session.defaultTeacherId
                                    ? String(session.defaultTeacherId)
                                    : "",
                                  dayOfWeek: session.dayOfWeek,
                                  startTime: session.startTime,
                                  endTime: session.endTime,
                                  plannedUnits: session.plannedUnits,
                                  isActive: session.isActive,
                                });
                                setIsModalOpen(true);
                              }}
                              onDeleteSession={(id) => handleDelete(id)}
                              onMoveSession={(template, newDay) =>
                                handleMoveSession(
                                  template.id,
                                  newDay,
                                  template.startTime,
                                  template.endTime,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 border border-dashed border-gray-200 dark:border-white/10 rounded-xl my-8">
                        <div className="size-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 dark:bg-white/5 dark:text-white/20">
                          <DocsIcon className="size-8" />
                        </div>
                        <div className="max-w-xs">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {viewMode === "subject"
                              ? "No Subject Selected"
                              : "No Teacher Selected"}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {viewMode === "subject"
                              ? "Please select a subject from the sidebar to view and manage its weekly schedule template."
                              : "Please select a teacher from the dropdown above to view their schedule."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-xl"
        title={selectedTemplate ? "Update Session" : "Add Session"}
        description={`Configure schedule for ${selectedClassSubject?.subject?.name} on ${formData.dayOfWeek}`}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="template-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedTemplate ? "Update" : "Add Session"}
            </button>
          </div>
        }
      >
        <form id="template-form" onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" value={formData.classSubjectId} />

          {/* Premium Header Card */}
          <div className="relative group overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 size-32 rounded-full bg-brand-500/5 transition-all duration-500 group-hover:scale-110" />

            <div className="flex items-center gap-4 relative z-10">
              <div
                className="size-12 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-3 shadow-brand-500/20"
                style={{
                  backgroundColor: stringToPastelColor(
                    selectedClassSubject?.subject?.name || "Subject",
                  ),
                }}
              >
                <DocsIcon
                  className="size-6"
                  style={{
                    color: stringToDarkerColor(
                      selectedClassSubject?.subject?.name || "Subject",
                    ),
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {droppedSubject?.subject?.name ||
                      selectedClassSubject?.subject?.name ||
                      "Select Subject"}
                  </h4>
                  {selectedTemplate && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400 text-[10px] font-bold uppercase tracking-wider">
                      Editing
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <TableIcon className="size-3.5" />
                  {droppedSubject
                    ? "Manual Assignment"
                    : selectedClassSubject?.class?.name || "No Class Selected"}
                  {selectedClassSubject?.academicYear && (
                    <span className="text-gray-300 dark:text-white/10 mx-1">
                      |
                    </span>
                  )}
                  <span className="opacity-70">
                    {selectedClassSubject?.academicYear?.name}
                  </span>
                </p>
              </div>
            </div>

            {(droppedSubject || !selectedClassSubject) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <SearchableAsyncSelect
                  label="Target Class/Subject"
                  placeholder="Search class and subject..."
                  value={formData.classSubjectId}
                  onChange={(val) =>
                    setFormData({ ...formData, classSubjectId: String(val) })
                  }
                  onSearch={searchClassSubjects}
                  options={classSubjectOptions}
                  isLoading={isSearchingClassSubjects}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <CustomSelect
              label="Schedule Day"
              value={formData.dayOfWeek}
              onChange={(val) => handleDayChange(String(val))}
              options={availableDayOptions}
            />

            <SearchableAsyncSelect
              label="Assigned Teacher"
              placeholder="Select teacher..."
              value={formData.defaultTeacherId}
              onChange={(val) =>
                setFormData({ ...formData, defaultTeacherId: String(val) })
              }
              onSearch={searchTeachers}
              options={teacherOptions}
              isLoading={isSearchingTeachers}
            />
          </div>

          <AvailabilityTimeline
            day={formData.dayOfWeek}
            startTime={formData.startTime}
            endTime={formData.endTime}
            rule={
              effectiveRules
                ? effectiveRules[formData.dayOfWeek] ||
                  effectiveRules[formData.dayOfWeek.toUpperCase()]
                : undefined
            }
            otherSessions={templates.filter(
              (t) =>
                t.dayOfWeek === formData.dayOfWeek &&
                t.id !== selectedTemplate?.id,
            )}
            onSelectTime={(start, end) =>
              setFormData({ ...formData, startTime: start, endTime: end })
            }
          />

          <div className="grid grid-cols-2 gap-5 relative group">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                Start Time
                <div className="size-1 rounded-full bg-gray-300" />
              </Label>
              <div className="relative group/input">
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:focus:bg-white/10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                End Time
                <div className="size-1 rounded-full bg-gray-300" />
              </Label>
              <div className="relative group/input">
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:focus:bg-white/10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="space-y-1">
              <Label className="text-sm font-bold text-gray-900 dark:text-white">
                Active Status
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Include this session in the current schedule template
                calculations.
              </p>
            </div>
            <Switch
              checked={formData.isActive || false}
              onChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />

      {selectedClassSubject && (
        <ScheduleGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          classSubjectId={selectedClassSubject.id}
          subjectName={selectedClassSubject.subject?.name || "Unknown Subject"}
          className={selectedClassSubject.class?.name || "Unknown Class"}
        />
      )}
    </DndProvider>
  );
};

export default TeachingScheduleTemplates;
