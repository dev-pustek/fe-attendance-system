import React, { useState, useCallback, useEffect } from "react";
import Modal from "../../../components/molecules/Modal";
import Label from "../../../components/atoms/Label";
import DatePicker from "../../../components/molecules/DatePicker";
import Button from "../../../components/atoms/Button";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { useGenerateTeachingSessions, useTeachingSessions, useGenerateTeachingSessionsDryRun } from "../../../api/hooks/useAttendance";
import { useClasses, useClassSubjects } from "../../../api/hooks/useAcademic";
import { showSuccess, showError } from "../../../utils/toast";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { profilesService } from "../../../api/services/profilesService";
import Checkbox from "../../../components/atoms/Checkbox";
import { XCircleIcon } from "@heroicons/react/24/solid";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { academicService } from "../../../api/services/academicService";
import { attendanceService } from "../../../api/services/attendanceService";
import { format, parseISO, addDays, isBefore, isEqual, parse } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateSessionsModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<"all" | "specific" | "teacher">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setTargetType("all");
      setStartDate("");
      setEndDate("");
      setSelectedClassId("");
      setSelectedSubjectId("");
      setSelectedTeacherId("");
      setUnselectedSessions(new Set());
    }
  }, [isOpen]);

  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);
  const searchTeachers = useCallback(async (term: string) => {
    setIsSearchingTeachers(true);
    try {
      const employees = await profilesService.getEmployees({ search: term, limit: 10 });
      setTeacherOptions(employees.data.map((e) => ({ label: e.user?.name || "Unknown", value: e.user?.public_id || "", subLabel: e.user?.email })));
    } catch { } finally { setIsSearchingTeachers(false); }
  }, []);

  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");

  const { data: classesRes } = useClasses({ limit: 100 });
  const { data: subjectsRes } = useClassSubjects({ classId: selectedClassId || undefined, limit: 100 });

  const classOptions = classesRes?.data?.map(c => ({ value: c.id, label: c.name })) || [];
  const filteredClassOptions = classSearchTerm ? classOptions.filter(c => c.label.toLowerCase().includes(classSearchTerm.toLowerCase())) : classOptions;

  const subjectOptions = subjectsRes?.data?.map(s => ({ value: s.id, label: s.subject?.name || "Unknown" })) || [];
  const filteredSubjectOptions = subjectSearchTerm ? subjectOptions.filter(s => s.label.toLowerCase().includes(subjectSearchTerm.toLowerCase())) : subjectOptions;

  // Removed backend generate hooks

  // Preview Data
  const canPreview = !!startDate && !!endDate && (targetType === "all" || (targetType === "specific" && !!selectedSubjectId) || (targetType === "teacher" && !!selectedTeacherId));
  const previewParams = {
    limit: 100,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    classSubjectId: targetType === "specific" && selectedSubjectId ? Number(selectedSubjectId) : undefined,
    actualTeacherId: targetType === "teacher" && selectedTeacherId ? selectedTeacherId : undefined,
  };
  
  const { data: previewData, isLoading: isPreviewLoading, deleteMutation } = useTeachingSessions(previewParams);
  const existingSessionsCount = previewData?.meta?.itemCount || previewData?.data?.length || 0;
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const [localDryRunData, setLocalDryRunData] = useState<any[]>([]);
  const [isDryRunLoading, setIsDryRunLoading] = useState(false);
  const potentialSessionsCount = localDryRunData.length;

  const [unselectedSessions, setUnselectedSessions] = useState<Set<string>>(new Set());

  // Compute Dry Run locally
  useEffect(() => {
    let isMounted = true;
    const computeDryRun = async () => {
      if (!canPreview) {
        setLocalDryRunData([]);
        return;
      }
      setIsDryRunLoading(true);
      try {
        const templatesRes = await academicService.getTeachingScheduleTemplates({
          classSubjectId: targetType === "specific" && selectedSubjectId ? Number(selectedSubjectId) : undefined,
          teacherId: targetType === "teacher" && selectedTeacherId ? selectedTeacherId : undefined,
          limit: 1000,
          isActive: true
        });
        const templates = templatesRes.data || [];

        const potential: any[] = [];
        let curr = parseISO(startDate);
        const end = parseISO(endDate);

        while (curr <= end || isEqual(curr, end)) {
          const dateStr = format(curr, 'yyyy-MM-dd');
          const dayStr = format(curr, 'EEEE').toUpperCase();

          const matches = templates.filter(t => t.dayOfWeek === dayStr);
          matches.forEach(t => {
            const exists = previewData?.data?.some(ex => ex.sessionDate === dateStr && ex.startTime === t.startTime && ex.classSubject?.id === t.classSubject?.id);
            if (!exists) {
              potential.push({
                sessionDate: dateStr,
                startTime: t.startTime,
                endTime: t.endTime,
                classSubjectId: t.classSubject?.id,
                subjectName: t.classSubject?.subject?.name,
                className: t.classSubject?.class?.name,
                teacherId: t.teacher?.id,
                classId: t.classSubject?.class?.id,
                teachingUnits: t.plannedUnits
              });
            }
          });
          curr = addDays(curr, 1);
        }
        if (isMounted) setLocalDryRunData(potential);
      } catch (err) {
        console.error("Failed to compute dry run:", err);
      } finally {
        if (isMounted) setIsDryRunLoading(false);
      }
    };
    computeDryRun();
    return () => { isMounted = false; };
  }, [canPreview, startDate, endDate, targetType, selectedSubjectId, selectedTeacherId, previewData]);

  useEffect(() => {
    setUnselectedSessions(new Set());
  }, [startDate, endDate, selectedSubjectId, selectedTeacherId, targetType]);

  const toggleSelection = (sessionKey: string) => {
    setUnselectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionKey)) newSet.delete(sessionKey);
      else newSet.add(sessionKey);
      return newSet;
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");

  const handleGenerate = async () => {
    if (!startDate || !endDate) return showError(new Error("Start date and end date are required"));
    if (targetType === "specific" && !selectedSubjectId) return showError(new Error("Subject must be selected"));
    if (targetType === "teacher" && !selectedTeacherId) return showError(new Error("Teacher must be selected"));

    const toGenerate = localDryRunData.filter(d => {
      const sessionKey = `${d.sessionDate}|${d.startTime}|${d.classSubjectId}`;
      return !unselectedSessions.has(sessionKey);
    });

    if (toGenerate.length === 0) {
      showError(new Error("Tidak ada sesi yang akan digenerate."));
      return;
    }

    setIsGenerating(true);
    let successCount = 0;
    
    try {
      for (let i = 0; i < toGenerate.length; i++) {
        const session = toGenerate[i];
        setProgressText(`Memproses sesi ${i + 1} dari ${toGenerate.length}...`);
        
        // 1. Create Teaching Session
        const created = await attendanceService.createTeachingSession({
          classSubjectId: session.classSubjectId,
          actualTeacherId: session.teacherId,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          teachingUnits: session.teachingUnits || 2,
          notes: "Generated from template",
        });

        // 2. Fetch Enrollments & Create Attendance
        if (created.data?.id && session.classId) {
          const enrollments = await academicService.getClassEnrollments({ classId: session.classId, limit: 100 });
          if (enrollments.data && enrollments.data.length > 0) {
            await attendanceService.bulkCreateSubjectAttendance({
              teachingSessionId: created.data.id,
              records: enrollments.data.map(e => ({
                studentId: e.student.id,
                status: 'hadir'
              }))
            });
          }
        }
        successCount++;
      }
      showSuccess(`Berhasil: ${successCount} sesi beserta buku absensi tercetak.`);
      queryClient.invalidateQueries({ queryKey: ["teaching-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["grouped-teaching-sessions"] });
      onClose();
    } catch (e) {
      showError(e, "Terjadi kesalahan saat memproses sebagian sesi");
    } finally {
      setIsGenerating(false);
      setProgressText("");
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
      title="Generate Sesi Otomatis (Dari Template)" 
      className="sm:max-w-4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm font-medium text-brand-600 dark:text-brand-400">
            {isGenerating && progressText}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>Batal</Button>
            <Button variant="primary" onClick={handleGenerate} disabled={!canPreview || isGenerating || isDryRunLoading}>
              {isGenerating ? "Memproses..." : "Generate Sekarang"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[4fr_6fr] divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-white/[0.05] -mx-6 -my-6">
        {/* Kolom Kiri: Form */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Label>Pilih Target Generasi</Label>
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="target" checked={targetType === "all"} onChange={() => setTargetType("all")} className="text-brand-500 focus:ring-brand-500 size-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Semua Kelas Aktif (Bulk)</span>
                  <span className="text-xs text-gray-500">Mencetak jadwal untuk seluruh kelas sekaligus.</span>
                </div>
              </label>
              <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="target" checked={targetType === "specific"} onChange={() => setTargetType("specific")} className="text-brand-500 focus:ring-brand-500 size-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Mata Pelajaran Spesifik</span>
                  <span className="text-xs text-gray-500">Mencetak jadwal untuk satu mata pelajaran.</span>
                </div>
              </label>
              <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="target" checked={targetType === "teacher"} onChange={() => setTargetType("teacher")} className="text-brand-500 focus:ring-brand-500 size-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Guru Spesifik</span>
                  <span className="text-xs text-gray-500">Mencetak jadwal untuk satu guru tertentu.</span>
                </div>
              </label>
            </div>
          </div>

          {targetType === "specific" && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-full">
                <Label>Kelas</Label>
                <SearchableAsyncSelect 
                  options={filteredClassOptions} 
                  value={selectedClassId} 
                  onChange={(val) => setSelectedClassId(val ? Number(val) : "")} 
                  onSearch={(term) => setClassSearchTerm(term)}
                  placeholder="Pilih Kelas..."
                />
              </div>
              <div className="w-full">
                <Label>Mata Pelajaran</Label>
                <SearchableAsyncSelect 
                  options={filteredSubjectOptions} 
                  value={selectedSubjectId} 
                  onChange={(val) => setSelectedSubjectId(val ? Number(val) : "")} 
                  onSearch={(term) => setSubjectSearchTerm(term)}
                  placeholder="Pilih Mapel..." 
                  disabled={!selectedClassId}
                />
              </div>
            </div>
          )}

          {targetType === "teacher" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <Label>Pilih Guru</Label>
              <SearchableAsyncSelect
                placeholder="Cari guru..."
                value={selectedTeacherId}
                onChange={(val) => setSelectedTeacherId(String(val))}
                onSearch={searchTeachers}
                options={teacherOptions}
                isLoading={isSearchingTeachers}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Tanggal Mulai</Label>
              <DatePicker type="date" value={startDate} onChange={setStartDate} placeholder="Pilih Tanggal..." />
            </div>
            <div>
              <Label>Tanggal Selesai</Label>
              <DatePicker type="date" value={endDate} onChange={setEndDate} placeholder="Pilih Tanggal..." />
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Preview Info */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/30 overflow-y-auto max-h-[400px] md:max-h-[600px]">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">✨</span> Analisis Pra-Generate
            </h4>
            
            {canPreview ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm dark:bg-white/[0.02] dark:border-white/[0.05]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Generasi</p>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {targetType === "all" ? "Semua Kelas Aktif" : (targetType === "teacher" ? (selectedTeacherId ? "Guru Spesifik" : "Belum Dipilih") : (selectedSubjectId ? "Mata Pelajaran Spesifik" : "Belum Dipilih"))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rentang Tanggal</p>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {startDate} s/d {endDate}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                    {isPreviewLoading ? (
                      <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-2">
                        <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-sm font-medium">Menganalisis jadwal eksisting...</span>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Sesi yang sudah ada:</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${existingSessionsCount > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}`}>
                            {existingSessionsCount} Sesi
                          </span>
                        </div>
                        {existingSessionsCount > 0 && previewData?.data && (
                          <div className="space-y-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-3 border border-gray-100 dark:border-white/[0.05]">
                            {[...previewData.data].sort((a, b) => new Date(`${a.sessionDate}T${a.startTime}`).getTime() - new Date(`${b.sessionDate}T${b.startTime}`).getTime()).map(session => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const isPast = new Date(session.sessionDate).getTime() < today.getTime();
                              
                              return (
                                <div key={session.id} className="group relative flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl text-sm transition-all border border-emerald-100/50 dark:border-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-emerald-500/5">
                                  <div className="flex flex-col gap-1.5 shrink-0">
                                    <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                                      {new Date(session.sessionDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                    <span className="inline-flex items-center self-start px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300">
                                      <svg className="size-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      {session.startTime.slice(0,5)} - {session.endTime.slice(0,5)} WIB
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:items-end gap-1.5 text-left sm:text-right mt-1 sm:mt-0">
                                    <span className="font-semibold text-emerald-800 dark:text-emerald-200 sm:pr-8">
                                      {session.classSubject?.subject?.name || 'Sesi'}
                                    </span>
                                    <span className="inline-flex items-center sm:self-end self-start px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:mr-8">
                                      <svg className="size-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                      Kelas: {session.classSubject?.class?.name || ''}
                                    </span>
                                  </div>
                                  {!isPast && (
                                    <button
                                      type="button"
                                      onClick={() => setSessionToDelete(session.id)}
                                      className="absolute -top-2 -right-2 text-red-500 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-gray-800 rounded-full shadow-sm transition-all outline-none"
                                      title="Hapus Sesi"
                                    >
                                      <XCircleIcon className="size-6" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {isDryRunLoading ? (
                      <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                        <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-sm font-medium">Menghitung potensi sesi...</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-1">
                            <svg className="size-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Potensi Sesi Baru:
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                            {potentialSessionsCount} Sesi
                          </span>
                        </div>
                        {potentialSessionsCount > 0 && localDryRunData && (
                          <div className="space-y-2 bg-brand-50/30 dark:bg-brand-900/10 rounded-xl p-3 border border-brand-100/50 dark:border-brand-500/20">
                            {[...localDryRunData].sort((a, b) => new Date(`${a.sessionDate}T${a.startTime}`).getTime() - new Date(`${b.sessionDate}T${b.startTime}`).getTime()).map((detail, idx) => {
                              const sessionKey = `${detail.sessionDate}|${detail.startTime}|${detail.classSubjectId}`;
                              const isSelected = !unselectedSessions.has(sessionKey);
                              return (
                                <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl text-sm transition-all border shadow-sm cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-500/40 hover:border-blue-300 hover:shadow-blue-500/10' : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 border-red-200 dark:border-red-500/40 hover:border-red-300 hover:shadow-red-500/10'}`} onClick={() => toggleSelection(sessionKey)}>
                                  <div className="pt-1">
                                    <Checkbox checked={isSelected} className={`pointer-events-none ${!isSelected ? 'border-red-400 bg-red-100' : ''}`} onChange={() => {}} />
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full">
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                      <span className={`font-semibold ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-red-900 dark:text-red-100'}`}>
                                        {new Date(detail.sessionDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                      </span>
                                      <span className={`inline-flex items-center self-start px-2 py-1 rounded-md text-[11px] font-bold border ${isSelected ? 'bg-blue-100 text-blue-700 border-blue-200 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-red-100 text-red-700 border-red-200 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300'}`}>
                                        <svg className="size-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {detail.startTime.slice(0,5)} - {detail.endTime.slice(0,5)} WIB
                                      </span>
                                    </div>
                                    <div className="flex flex-col sm:items-end gap-1.5 text-left sm:text-right mt-1 sm:mt-0">
                                      <span className={`font-semibold ${isSelected ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'}`}>
                                        {detail.subjectName || 'Sesi'}
                                      </span>
                                      <span className={`inline-flex items-center sm:self-end self-start px-2 py-1 rounded-md text-[11px] font-bold border ${isSelected ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-red-50 text-red-700 border-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'}`}>
                                        <svg className="size-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        Kelas: {detail.className || ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400 bg-blue-50/50 p-3 rounded-xl border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                  <svg className="size-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p>Sistem cerdas kami hanya akan mencetak sesi yang belum ada, dan secara otomatis <strong>melewati (skip)</strong> sesi yang sudah terbentuk. Tidak akan terjadi duplikasi data.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-3">
                  <svg className="size-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Lengkapi Form</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Pilih rentang tanggal dan target untuk melihat analisis pra-generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </Modal>

      <ConfirmDialog
        isOpen={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete !== null) {
            deleteMutation.mutate(sessionToDelete);
            setSessionToDelete(null);
          }
        }}
        title="Hapus Sesi"
        message="Hapus sesi ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        variant="delete"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
