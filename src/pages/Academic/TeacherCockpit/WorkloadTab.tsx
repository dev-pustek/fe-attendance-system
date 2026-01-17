import { useTeacherCockpit } from "./TeacherCockpitContext";
import { useGroupedTeachingAssignments } from "../../../api/hooks/useAcademic";
import { GroupedTeachingAssignmentLevel, GroupedTeachingAssignmentClass } from "../../../api/types/academic";
import { DocsIcon, FolderIcon, GridIcon, ChevronDownIcon } from "../../../components/atoms/Icons";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";

const WorkloadTab = () => {
    const { employeeDetails } = useTeacherCockpit();
    
    // Fetch Grouped Assignments
    const { data: groupedResponse, isLoading } = useGroupedTeachingAssignments(employeeDetails?.userId);

    // Sidebar & Scroll Logic
    const [activeSection, setActiveSection] = React.useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveSection(id);
        }
    };

    const toggleNode = (id: string, shouldScroll = false) => {
        setExpandedNodes(prev => 
            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
        );
        if (shouldScroll) {
            scrollToSection(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!groupedResponse || groupedResponse.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl h-64">
                <div className="size-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <DocsIcon className="size-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Active Assignments</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    This teacher has no active teaching assignments for the current academic year.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-full bg-white dark:bg-gray-800 overflow-hidden">
            {/* LEFT SIDEBAR navigation */}
            <div className="w-full lg:w-80 border-r border-gray-100 dark:border-white/5 flex flex-col bg-gray-50/30 dark:bg-gray-900/30 hidden lg:flex">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-0.5">
                         <h3 className="font-bold text-gray-900 dark:text-white text-lg">Navigation</h3>
                    </div>
                    <p className="text-xs text-gray-500">Quick jump to class groups</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1">
                    {groupedResponse.map((level) => (
                        <div key={level.educationLevel.id}>
                            <button 
                                onClick={() => toggleNode(`level-${level.educationLevel.id}`, true)}
                                className={`flex items-center justify-between w-full p-2.5 rounded-xl mb-1 transition-all duration-200 group text-left text-sm ${
                                    expandedNodes.includes(`level-${level.educationLevel.id}`)
                                        ? 'bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 dark:text-brand-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                     <GridIcon className={`size-4 shrink-0 transition-colors ${
                                         expandedNodes.includes(`level-${level.educationLevel.id}`) 
                                            ? 'text-brand-500' 
                                            : 'text-gray-400 group-hover:text-gray-500'
                                     }`} />
                                     <span className="truncate">{level.educationLevel.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 rounded-full">
                                        {level.majors.length + (level.grades.length > 0 ? 1 : 0)}
                                    </span>
                                    <div 
                                        className={`p-1 rounded-lg transition-transform duration-200 ${expandedNodes.includes(`level-${level.educationLevel.id}`) ? "rotate-0" : "-rotate-90"}`}
                                    >
                                        <ChevronDownIcon className="size-3 text-gray-400" />
                                    </div>
                                </div>
                            </button>
                            
                            <AnimatePresence>
                                {(expandedNodes.includes(`level-${level.educationLevel.id}`)) && (
                                     <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                     >
                                         <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-white/5 pl-2 pb-1">
                                            {/* Major Items */}
                                            {level.majors.map((major) => {
                                                const majorId = `major-${major.major.id}`;
                                                const isExpanded = expandedNodes.includes(majorId);
                                                return (
                                                    <div key={majorId}>
                                                        <button 
                                                            onClick={() => toggleNode(majorId, true)}
                                                            className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-[13px] group transition-all w-full text-left text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <FolderIcon className="size-3.5 shrink-0 text-gray-400" />
                                                                <span className="truncate">{major.major.name}</span>
                                                            </div>
                                                            <div className={`p-1 rounded transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}>
                                                                <ChevronDownIcon className="size-3 text-gray-400" />
                                                            </div>
                                                        </button>

                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height: "auto" }}
                                                                    exit={{ height: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 dark:border-white/5 pl-2 pb-1">
                                                                        {major.grades.map(grade => (
                                                                            <div key={grade.grade.id}>
                                                                                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 rounded">
                                                                                    {grade.grade.name}
                                                                                </div>
                                                                                <div className="ml-1 space-y-0.5">
                                                                                    {grade.classes.map(cls => (
                                                                                        <button
                                                                                            key={cls.class.id}
                                                                                            onClick={() => scrollToSection(`class-${cls.class.id}`)}
                                                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all w-full text-left ${
                                                                                                activeSection === `class-${cls.class.id}` 
                                                                                                    ? 'text-brand-500 font-bold bg-brand-50/30 dark:bg-brand-500/5' 
                                                                                                    : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700'
                                                                                            }`}
                                                                                        >
                                                                                            <span className="truncate">{cls.class.name}</span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}

                                            {/* General Items */}
                                            {level.grades.length > 0 && (
                                                <div>
                                                     <button 
                                                        onClick={() => toggleNode(`general-${level.educationLevel.id}`, true)}
                                                        className="flex items-center justify-between p-2 rounded-lg cursor-pointer text-[13px] group transition-all w-full text-left text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <GridIcon className="size-3.5 text-gray-400" />
                                                            <span>General Classes</span>
                                                        </div>
                                                        <div className={`p-1 rounded transition-transform duration-200 ${expandedNodes.includes(`general-${level.educationLevel.id}`) ? "rotate-0" : "-rotate-90"}`}>
                                                            <ChevronDownIcon className="size-3 text-gray-400" />
                                                        </div>
                                                    </button>
                                                    
                                                     <AnimatePresence>
                                                        {expandedNodes.includes(`general-${level.educationLevel.id}`) && (
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: "auto" }}
                                                                exit={{ height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 dark:border-white/5 pl-2 pb-1">
                                                                     {level.grades.map(grade => (
                                                                        <div key={grade.grade.id}>
                                                                            {/* <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400">{grade.grade.name}</div> */}
                                                                            <div className="space-y-0.5">
                                                                                {grade.classes.map(cls => (
                                                                                    <button
                                                                                        key={cls.class.id}
                                                                                        onClick={() => scrollToSection(`class-${cls.class.id}`)}
                                                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all w-full text-left hover:bg-gray-50 dark:hover:bg-white/5 ${
                                                                                            activeSection === `class-${cls.class.id}` ? 'text-indigo-600 font-bold bg-indigo-50/30' : 'text-gray-500'
                                                                                        }`}
                                                                                    >
                                                                                        {cls.class.name}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>
                                     </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 bg-white dark:bg-gray-800">
                 {/* Mobile Header (simplified stats) */}
                 <div className="lg:hidden mb-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                     <div>
                        <h2 className="font-bold text-gray-900 dark:text-white">Current Workload</h2>
                        <p className="text-xs text-gray-500">{groupedResponse.length} Levels</p>
                     </div>
                 </div>

                <div className="space-y-12 max-w-7xl mx-auto">
                    {groupedResponse.map((level: GroupedTeachingAssignmentLevel) => (
                        <div key={level.educationLevel.id} id={`level-${level.educationLevel.id}`} className="scroll-mt-6">
                            {/* Level Header with Fun Badge */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center justify-center h-8 px-4 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm shadow-md">
                                    {level.educationLevel.name}
                                </div>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                            </div>

                            <div className="space-y-10">
                                {/* 1. MAJORS - Playful Containers */}
                                {level.majors.map((majorItem) => (
                                    <div 
                                        key={majorItem.major.id} 
                                        id={`major-${majorItem.major.id}`}
                                        className={`scroll-mt-6 rounded-[2rem] p-6 lg:p-8 transition-colors duration-500 ${
                                            activeSection === `major-${majorItem.major.id}` 
                                                ? 'bg-brand-50/40 border-2 border-brand-100 dark:bg-brand-500/5 dark:border-brand-500/20' 
                                                : 'bg-gray-50/50 border border-gray-100 dark:bg-white/[0.02] dark:border-white/5'
                                        }`}
                                    >
                                        {/* Major Title */}
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className={`p-3 rounded-2xl text-white shadow-lg shadow-brand-500/20 bg-gradient-to-br from-brand-400 to-brand-600`}>
                                                <FolderIcon className="size-6" />
                                            </div>
                                            <div>
                                                 <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                                                    {majorItem.major.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1">{majorItem.grades.length} Grades • {majorItem.grades.reduce((acc, g) => acc + g.classes.length, 0)} Classes</p>
                                            </div>
                                        </div>

                                        {/* Group Grades */}
                                        <div className="space-y-8 pl-1">
                                            {majorItem.grades.map((gradeItem) => (
                                                <div key={gradeItem.grade.id}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                            {gradeItem.grade.name}
                                                        </span>
                                                        <div className="h-px w-12 bg-gray-200 dark:bg-white/10" />
                                                    </div>
                                                    
                                                    <div className={`grid gap-6 ${gradeItem.classes.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                                        {gradeItem.classes.map((classGroup) => {
                                                            const isClassActive = activeSection === `class-${classGroup.class.id}`;
                                                            return (
                                                                <div key={classGroup.class.id} id={`class-${classGroup.class.id}`} className="scroll-mt-32 transition-all duration-300">
                                                                    <ClassCard classGroup={classGroup} variant="brand" isActive={isClassActive} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* 2. GENERAL CLASSES */}
                                {level.grades.length > 0 && (
                                    <div 
                                        id={`general-${level.educationLevel.id}`}
                                        className={`scroll-mt-6 rounded-[2rem] p-6 lg:p-8 transition-colors duration-500 ${
                                            activeSection === `general-${level.educationLevel.id}`
                                                ? 'bg-indigo-50/40 border-2 border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/20'
                                                : 'bg-gray-50/50 border border-gray-100 dark:bg-white/[0.02] dark:border-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                                                <GridIcon className="size-6" />
                                            </div>
                                            <div>
                                                 <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                                                    General Classes
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1">Non-major specific subjects</p>
                                            </div>
                                        </div>

                                        <div className="space-y-8 pl-1">
                                            {level.grades.map((gradeItem) => (
                                                <div key={gradeItem.grade.id}>
                                                     <div className="flex items-center gap-3 mb-4">
                                                        <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">
                                                            {gradeItem.grade.name}
                                                        </span>
                                                        <div className="h-px w-12 bg-indigo-100 dark:bg-white/5" />
                                                    </div>
                                                    
                                                    <div className={`grid gap-6 ${gradeItem.classes.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                                        {gradeItem.classes.map((classGroup) => {
                                                            const isClassActive = activeSection === `class-${classGroup.class.id}`;
                                                            return (
                                                                 <div key={classGroup.class.id} id={`class-${classGroup.class.id}`} className="scroll-mt-32 transition-all duration-300">
                                                                    <ClassCard classGroup={classGroup} variant="indigo" isActive={isClassActive} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {/* Bottom Spacer */}
                    <div className="h-24" />
                </div>
            </div>
        </div>
    );
};



const ClassCard = ({ 
    classGroup, 
    isActive = false,
    variant 
}: { 
    classGroup: GroupedTeachingAssignmentClass, 
    isActive?: boolean,
    variant?: string
}) => {
    return (
        <div data-variant={variant} className={`flex flex-col rounded-2xl border transition-all duration-300 group relative overflow-hidden bg-white dark:bg-gray-800 ${
            isActive 
                ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md' 
                : 'border-gray-200 dark:border-white/5 hover:border-brand-500/30 hover:shadow-lg hover:-translate-y-1'
        }`}>
            {/* Header Area */}
            <div className="p-5 flex flex-col gap-4 border-b border-gray-100 dark:border-white/5 relative z-10">
                <div className="flex items-start justify-between">
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                             {classGroup.assignments.length} Subjects
                        </span>
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight break-words pr-2 group-hover:text-brand-600 transition-colors">
                            {classGroup.class.name}
                        </h4>
                    </div>
                    {isActive ? (
                        <div className="text-brand-500 scale-110 transition-transform"><DocsIcon className="size-5" /></div>
                    ) : (
                         <div className="text-gray-300 group-hover:text-brand-300 transition-colors"><DocsIcon className="size-5" /></div>
                    )}
                </div>
            </div>

            {/* Assignments List */}
            <div className="p-4 flex-1 flex flex-col gap-2 relative z-10 bg-gray-50/30 dark:bg-white/[0.02]">
                {classGroup.assignments.slice(0, 4).map((assignment) => (
                    <div key={assignment.assignmentId} className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-brand-500/30 transition-colors group/row cursor-default">
                        {/* Code Badge */}
                         <div className={`shrink-0 flex items-center justify-center h-8 w-10 index-0 rounded-lg font-bold text-[10px] shadow-sm border border-transparent whitespace-nowrap ${
                             assignment.role === 'primary' 
                                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400' 
                                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                         }`}>
                            {assignment.subjectCode || assignment.subjectName.substring(0, 3).toUpperCase()}
                        </div>
                        
                        {/* Subject Details */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-snug" title={assignment.subjectName}>
                                {assignment.subjectName}
                            </p>
                             <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-medium truncate ${assignment.role === 'primary' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                                    {assignment.role === 'primary' ? 'Primary Teacher' : 'Assistant'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                
                {classGroup.assignments.length > 4 && (
                    <button className="mt-1 w-full py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center justify-center gap-1">
                        + {classGroup.assignments.length - 4} More Subjects
                    </button>
                )}
            </div>
            
             {/* Bottom Decoration Strip */}
            <div className={`h-1 w-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
        </div>
    );
};

export default WorkloadTab;
