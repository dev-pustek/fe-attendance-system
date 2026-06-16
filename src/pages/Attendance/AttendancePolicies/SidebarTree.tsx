import { 
  ChevronDownIcon, 
  FolderIcon, 
  BoxIcon, 
  GridIcon 
} from "../../../components/atoms/Icons";
import { useEducationLevels, useGrades } from "../../../api/hooks/useAcademic";
import { RuleContextType } from "../../../api/types/rules";
import { useEffect, useRef, useState } from "react";

interface SidebarTreeProps {
  selectedContext: { type: string; id: number };
  onSelect: (context: { type: string; id: number; name: string }) => void;
}

const SmoothExpand: React.FC<{ isExpanded: boolean; children: React.ReactNode }> = ({ isExpanded, children }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<string | number>(isExpanded ? "auto" : 0);

    useEffect(() => {
        if (isExpanded) {
            setHeight(contentRef.current?.scrollHeight || "auto");
        } else {
            setHeight(contentRef.current?.scrollHeight || 0);
            // Force reflow
            requestAnimationFrame(() => {
                setHeight(0);
            });
        }
    }, [isExpanded]);

    return (
        <div 
            style={{ height, overflow: "hidden", transition: "height 0.3s ease-in-out" }}
        >
            <div ref={contentRef} className="pb-1">
                {children}
            </div>
        </div>
    );
};


const SidebarTree: React.FC<SidebarTreeProps> = ({ selectedContext, onSelect }) => {
  const { data: levelsData } = useEducationLevels({ limit: 100 });
  const { data: gradesData } = useGrades({ limit: 100 });
  
  const [expandedLevels, setExpandedLevels] = useState<number[]>([]);

  const toggleLevel = (id: number) => {
    setExpandedLevels((prev) => 
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const levels = levelsData?.data || [];
  const grades = gradesData?.data || [];

  const getLevelId = (id: string | number | null | undefined): number => {
    if (id === null || id === undefined) return 0;
    return typeof id === 'string' ? parseInt(id, 10) : id;
  };
  const getGradeId = (id: string | number | null | undefined): number => {
    if (id === null || id === undefined) return 0;
    return typeof id === 'string' ? parseInt(id, 10) : id;
  };

  return (
    <div className="w-full bg-white h-full flex flex-col min-h-[500px] z-10 relative flex-shrink-0" id="sidebar-tree-debug">
      {/* Header removed as requested to avoid double title */}
      
      <div className="flex-1 overflow-y-auto p-3">
        {/* Global Node (Always Visible) */}
        <div 
          onClick={() => onSelect({ type: RuleContextType.GLOBAL, id: 0, name: "Pengaturan Global" })}
          className={`flex items-center gap-2 p-2.5 rounded-md cursor-pointer text-sm mb-2 transition-colors ${
            selectedContext.type === RuleContextType.GLOBAL 
              ? "bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-100" 
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <GridIcon className={`w-4 h-4 ${selectedContext.type === RuleContextType.GLOBAL ? "text-blue-600" : "text-gray-400"}`} />
          <span>Pengaturan Global</span>
        </div>

        {levels.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4 italic">
            Tidak ada jenjang pendidikan ditemukan.
          </div>
        )}

        {/* Education Levels */}
        {levels.map((level) => {
           const levelId = getLevelId(level.id);
           const levelGrades = grades.filter((g) => getLevelId(g.educationLevelId) === levelId);
           const isExpanded = expandedLevels.includes(levelId);

           return (
             <div key={level.id} className="mt-1">
               <div 
                 className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm group ${
                   selectedContext.type === RuleContextType.EDUCATION_LEVEL && selectedContext.id === levelId
                     ? "bg-blue-50 text-blue-600 font-medium" 
                     : "text-gray-600 hover:bg-gray-50"
                 }`}
                 onClick={() => onSelect({ type: RuleContextType.EDUCATION_LEVEL, id: levelId, name: level.name })}
               >
                 <div className="flex items-center gap-2">
                   <FolderIcon className="w-4 h-4 text-amber-400 dark:text-amber-500" />
                   <span>{level.name}</span>
                 </div>
                 {levelGrades.length > 0 && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleLevel(levelId); }}
                     className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                   >
                     <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                   </button>
                 )}
               </div>

               {/* Grades (Children) */}
               <SmoothExpand isExpanded={isExpanded}>
                 <div className="ml-4 pl-2 border-l border-gray-100 dark:border-white/10 mt-1">
                   {levelGrades.map((grade) => {
                     const gradeId = getGradeId(grade.id);
                     return (
                       <div
                         key={grade.id}
                         onClick={() => onSelect({ type: RuleContextType.GRADE, id: gradeId, name: grade.name })}
                         className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm mb-1 transition-all ${
                           selectedContext.type === RuleContextType.GRADE && selectedContext.id === gradeId
                             ? "bg-blue-50 text-blue-600 font-medium" 
                             : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                         }`}
                       >
                         <BoxIcon className="w-3.5 h-3.5 opacity-70" />
                         <span>{grade.name}</span>
                       </div>
                     );
                   })}
                 </div>
               </SmoothExpand>
             </div>
           );
        })}
      </div>
    </div>
  );
};

export default SidebarTree;
