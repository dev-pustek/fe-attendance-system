import { useState, useMemo, useCallback } from "react";
import { useClassCockpit } from "./ClassCockpitContext";
import { useSubjects, useClassSubjects } from "../../../api/hooks/useAcademic";
import {
  PlusIcon,
  CloseIcon,
  SearchIcon,
} from "../../../components/atoms/Icons";
import ComponentCard from "../../../components/molecules/ComponentCard";
import { useTeachingAssignments } from "../../../api/hooks/useAcademic";
import Modal from "../../../components/molecules/Modal";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { profilesService } from "../../../api/services/profilesService";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useQueryClient } from "@tanstack/react-query";
import { ClassSubject } from "../../../api/types/academic";

const CurriculumTab = () => {
    const { 
        classId, 
        classDetails, 
        subjects: assignedSubjects, 
        isLoadingSubjects,
        refreshSubjects 
    } = useClassCockpit();

    const [search, setSearch] = useState("");

    // 1. Fetch all subjects for "Available" list
    const { 
        data: allSubjects, 
        isLoading: loadingAll,
        createMutation: createSubjectMutation 
    } = useSubjects({
        limit: 100, // TODO: Implement pagination or search on scrolling
        isActive: true,
    });

    // 2. Mutations
    const { createMutation, deleteMutation } = useClassSubjects();
    const { 
        createMutation: createAssignmentMutation, 
        deleteMutation: deleteAssignmentMutation 
    } = useTeachingAssignments();

    // ...

    const handleRemoveAssignment = async (assignmentId: string | number) => {
        const confirmed = await confirm({
            variant: 'delete',
            title: 'Unassign Teacher',
            message: 'Are you sure you want to remove this teacher from the subject?',
        });

        if (!confirmed) return;

        try {
            await deleteAssignmentMutation.mutateAsync(assignmentId);
            showSuccess("Teacher unassigned successfully");
            refreshSubjects();
        } catch (error) {
            showError(error, "Failed to unassign teacher");
        }
    };

    // 3. Derived Helpers
    const assignedSubjectIds = useMemo(() => {
        return assignedSubjects.map(s => s.subjectId);
    }, [assignedSubjects]);

    const availableSubjects = useMemo(() => {
        if (!allSubjects?.data) return [];
        return allSubjects.data.filter(s => !assignedSubjectIds.includes(s.id));
    }, [allSubjects, assignedSubjectIds]);

    const filteredAvailable = availableSubjects.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase())
      );



    // 4. Modal State
    const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);
    const [createSubjectForm, setCreateSubjectForm] = useState({ code: "", name: "" });
    const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSubjectForAssign, setSelectedSubjectForAssign] = useState<ClassSubject | null>(null);
    const [assignmentFormData, setAssignmentFormData] = useState({
        teacherId: "",
        role: "primary",
        isActive: true
    });
    const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
    const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

    const searchTeachers = useCallback(async (term: string) => {
        setIsSearchingTeachers(true);
        try {
            const employees = await profilesService.getEmployees({
                search: term,
                limit: 10,
            });
            setTeacherOptions(
                employees.data.map((e) => ({
                    label: e.user?.name || "Unknown",
                    value: e.user?.public_id || "",
                    subLabel: e.user?.email,
                }))
            );
        } catch (error) {
            console.error("Failed to search teachers", error);
        } finally {
            setIsSearchingTeachers(false);
        }
    }, []);

    const handleOpenAssignModal = (subject: ClassSubject) => {
        setSelectedSubjectForAssign(subject);
        setAssignmentFormData({
            teacherId: "",
            role: "primary",
            isActive: true
        });
        setIsAssignModalOpen(true);
    };

    const handleAssignTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectForAssign || !assignmentFormData.teacherId) return;

        try {
            await createAssignmentMutation.mutateAsync({
                classSubjectId: selectedSubjectForAssign.id,
                teacherId: assignmentFormData.teacherId,
                role: assignmentFormData.role as 'primary' | 'assistant',
                isActive: assignmentFormData.isActive
            });
            showSuccess("Teacher assigned successfully");
            setIsAssignModalOpen(false);
            refreshSubjects(); // Refresh to show new assignment
        } catch (error) {
            showError(error, "Failed to assign teacher");
        }
    };

    const handleCreateSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSubjectMutation.mutateAsync({
                code: createSubjectForm.code,
                name: createSubjectForm.name,
                isActive: true
            });
            showSuccess("Subject created successfully");
            setIsCreateSubjectModalOpen(false);
            setCreateSubjectForm({ code: "", name: "" });
            // The useSubjects hook will auto-invalidate and refresh the list
        } catch (error) {
            showError(error, "Failed to create subject");
        }
    };

    // 5. Handlers
    const { confirm, confirmState } = useConfirm();
    const queryClient = useQueryClient();

    // 5. Handlers
    const handleAddSubject = async (subjectId: string | number) => {
        if (!classId || !classDetails?.academicYearId) {
            console.error("Missing classId or academicYearId");
            return;
        }

        const confirmed = await confirm({
            variant: 'create',
            title: 'Add Subject',
            message: 'Are you sure you want to add this subject to the class?',
        });

        if (!confirmed) return;

        try {
            await createMutation.mutateAsync({
                classId: Number(classId),
                subjectId,
                academicYearId: classDetails.academicYearId,
                isActive: true
            });
            await queryClient.invalidateQueries({ queryKey: ['academic', 'class-subjects', classId] });
            // refreshSubjects(); // Not strictly needed if we invalidate, but keeping as fallback if context relies on it
        } catch (error) {
            console.error("Failed to add subject", error);
            showError(error, "Failed to add subject");
        }
    };

    const handleRemoveSubject = async (classSubjectId: string | number) => {
        const confirmed = await confirm({
            variant: 'delete',
            title: 'Remove Subject',
            message: 'Are you sure you want to remove this subject from the class?',
        });
        
        if (!confirmed) return;

        try {
            await deleteMutation.mutateAsync(classSubjectId);
            await queryClient.invalidateQueries({ queryKey: ['academic', 'class-subjects', classId] });
        } catch (error) {
            console.error("Failed to remove subject", error);
            showError(error, "Failed to remove subject");
        }
    };

    if (isLoadingSubjects || loadingAll) {
        return (
             <div className="flex h-96 items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
             </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Class Curriculum</h2>
                    <p className="text-sm text-gray-500">Manage subjects and teaching assignments for this class.</p>
                </div>
                <button
                    onClick={() => setIsCreateSubjectModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 self-start sm:self-auto"
                >
                    <PlusIcon className="fill-white text-xl text-white" />
                    Create Subject
                </button>
            </div>

            {/* Header / Summary */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                 {/* Available Subjects */}
                <ComponentCard
                  title="Available Subjects"
                  desc="Select subjects to add to the class curriculum"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by code or name..."
                                className="w-full pl-11 pr-4 py-2 text-sm rounded-xl border border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                        {filteredAvailable.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => handleAddSubject(s.id)}
                                className="group flex items-center justify-between p-3 rounded-xl border border-gray-50 dark:border-white/5 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all cursor-pointer"
                            >
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tighter">
                                        {s.code}
                                    </p>
                                    <p className="text-[11px] text-gray-500 font-medium">
                                        {s.name}
                                    </p>
                                </div>
                                <div className="size-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm">
                                    {createMutation.isPending ? (
                                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                        <PlusIcon className="size-4" />
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredAvailable.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-400">
                                No subjects found.
                            </div>
                        )}
                    </div>
                </ComponentCard>

                {/* Assigned Bucket */}
                <ComponentCard
                    title="Class Curriculum"
                    desc="Subjects currently assigned to this class"
                >
                    <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                        {assignedSubjects.map((cs) => (
                            <div
                                key={cs.id}
                                className="flex items-start justify-between p-3 rounded-xl border border-brand-100 bg-brand-50/50 dark:border-brand-500/20 dark:bg-brand-500/5 transition-all gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-tighter">
                                        {cs.subject?.code}
                                    </p>
                                    <p className="text-[11px] text-brand-600/70 dark:text-brand-400/70 font-medium truncate">
                                        {cs.subject?.name}
                                    </p>
                                    
                                    {/* Teacher Assignment Display */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                         {cs.teachingAssignments && cs.teachingAssignments.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {cs.teachingAssignments.filter(ta => ta.isActive).map(ta => (
                                                    <div key={ta.id} className="group/teacher flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-white/10 border border-brand-200 dark:border-white/10 hover:border-error-200 dark:hover:border-error-500/30 transition-colors">
                                                        <div className="size-3 rounded-full bg-brand-100 flex items-center justify-center text-[7px] font-bold text-brand-600">
                                                            {ta.teacher?.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-[9px] font-medium text-brand-600/80 dark:text-brand-400 truncate max-w-[100px]">
                                                            {ta.teacher?.name}
                                                        </span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveAssignment(ta.id);
                                                            }}
                                                            disabled={deleteAssignmentMutation.isPending}
                                                            className="ml-1 opacity-0 group-hover/teacher:opacity-100 p-0.5 rounded-full hover:bg-error-50 text-gray-400 hover:text-error-500 transition-all"
                                                            title="Unassign Teacher"
                                                        >
                                                            <CloseIcon className="size-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                         )}
                                         <button 
                                            onClick={() => handleOpenAssignModal(cs)}
                                            className="size-5 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-600 flex items-center justify-center transition-colors border border-brand-200"
                                            title="Assign Teacher"
                                         >
                                             <PlusIcon className="size-3" />
                                         </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveSubject(cs.id)}
                                    className="size-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-error-500 hover:bg-error-500 hover:text-white transition-all shadow-sm border border-brand-100/50 dark:border-brand-500/10 shrink-0"
                                >
                                    {deleteMutation.isPending ? (
                                         <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                        <CloseIcon className="size-4" />
                                    )}
                                </button>
                            </div>
                        ))}
                         {assignedSubjects.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                List is empty. add subjects from the left panel.
                            </div>
                        )}
                    </div>
                </ComponentCard>
            </div>

            {/* Create Subject Modal */}
            <Modal
                isOpen={isCreateSubjectModalOpen}
                onClose={() => setIsCreateSubjectModalOpen(false)}
                className="max-w-md"
                title="Create New Subject"
                description="Add a new subject to the master list."
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsCreateSubjectModalOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-subject-form"
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                            disabled={createSubjectMutation.isPending}
                        >
                            {createSubjectMutation.isPending ? "Creating..." : "Create Subject"}
                        </button>
                    </div>
                }
            >
                <form id="create-subject-form" onSubmit={handleCreateSubject} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Subject Code <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. MATH101"
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-mono text-sm"
                            value={createSubjectForm.code}
                            onChange={e => setCreateSubjectForm({...createSubjectForm, code: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Subject Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Fundamental Mathematics"
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm"
                            value={createSubjectForm.name}
                            onChange={e => setCreateSubjectForm({...createSubjectForm, name: e.target.value})}
                        />
                    </div>
                </form>
            </Modal>

            {/* Add Subject Modal (Reused for Add Existing if needed or kept logic) */}
             <Modal
                isOpen={isAddSubjectModalOpen}
                onClose={() => setIsAddSubjectModalOpen(false)}
                className="max-w-xl"
                title="Add Subjects"
                description="Search and add subjects to the class curriculum."
            >
                <div className="space-y-4">
                     <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by code or name..."
                            className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="h-[300px] overflow-y-auto pr-1 scrollbar-thin space-y-2">
                         {filteredAvailable.map((s) => (
                            <div
                                key={s.id}
                                className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all cursor-default"
                            >
                                <div className="flex items-center gap-3">
                                     <div className="size-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-brand-600 group-hover:bg-white transition-colors">
                                        {s.code}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {s.name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddSubject(s.id)}
                                    disabled={createMutation.isPending}
                                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 transition-all shadow-sm flex items-center gap-1.5"
                                >
                                    {createMutation.isPending ? (
                                        <div className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                        <PlusIcon className="size-3" />
                                    )}
                                    Add
                                </button>
                            </div>
                        ))}
                        {filteredAvailable.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <SearchIcon className="size-8 opacity-20" />
                                <p className="text-sm">No available subjects matching "{search}"</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                    <button
                        onClick={() => setIsAddSubjectModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                className="max-w-md"
                title="Assign Teacher"
                description={`Assign a teacher to ${selectedSubjectForAssign?.subject?.name || 'Class Subject'}`}
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsAssignModalOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="assign-teacher-form"
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            Assign Teacher
                        </button>
                    </div>
                }
            >
                <form id="assign-teacher-form" onSubmit={handleAssignTeacher} className="space-y-4">
                    <SearchableAsyncSelect
                        label="Teacher"
                        placeholder="Search teacher by name..."
                        value={assignmentFormData.teacherId}
                        onChange={(val) => setAssignmentFormData({ ...assignmentFormData, teacherId: String(val) })}
                        onSearch={searchTeachers}
                        options={teacherOptions}
                        isLoading={isSearchingTeachers}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            onClick={() => setAssignmentFormData({ ...assignmentFormData, role: 'primary' })}
                            className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                assignmentFormData.role === 'primary' 
                                ? 'border-brand-500 bg-brand-50/50 text-brand-700' 
                                : 'border-gray-200 hover:border-brand-200'
                            }`}
                        >
                            <span className="font-bold text-sm">Primary</span>
                            <span className="text-[10px] text-gray-500 text-center">Main instructor</span>
                        </div>
                        <div 
                            onClick={() => setAssignmentFormData({ ...assignmentFormData, role: 'assistant' })}
                            className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                assignmentFormData.role === 'assistant' 
                                ? 'border-brand-500 bg-brand-50/50 text-brand-700' 
                                : 'border-gray-200 hover:border-brand-200'
                            }`}
                        >
                            <span className="font-bold text-sm">Assistant</span>
                            <span className="text-[10px] text-gray-500 text-center">Support role</span>
                        </div>
                    </div>
                </form>
            </Modal>
            
            <ConfirmDialog {...confirmState} />
        </div>
    );
};

export default CurriculumTab;
