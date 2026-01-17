import React, { useState } from "react";
import {
  ChevronDownIcon,
  FolderIcon,
  BoxIcon,
  GridIcon,
  SearchIcon
} from "../../atoms/Icons";
import { useDiscoveryTree } from "../../../api/hooks/useAcademic";

export type NodeType = "level" | "program" | "major";

interface CurriculumTreeProps {
  selectedNode: { type: NodeType; id: number | string; parentId?: number | string; levelId?: number | string } | null;
  onSelect: (node: { type: NodeType; id: number | string; name: string; parentId?: number | string; levelId?: number | string }) => void;
  onOverviewSelect?: () => void;
}

const SmoothExpand: React.FC<{ isExpanded: boolean; children: React.ReactNode }> = ({ isExpanded, children }) => {
  const [height, setHeight] = useState<string | number>(isExpanded ? "auto" : 0);
  const [overflow, setOverflow] = useState<string>(isExpanded ? "visible" : "hidden");
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isExpanded) {
      setHeight(contentRef.current?.scrollHeight || "auto");
      const timeout = setTimeout(() => {
        setOverflow("visible");
        setHeight("auto");
      }, 300); // 0.3s duration
      return () => clearTimeout(timeout);
    } else {
      setOverflow("hidden");
      setHeight(contentRef.current?.scrollHeight || 0);
      // Double RAF to ensure the explicit height is applied before transitioning to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
    }
  }, [isExpanded]);

  return (
    <div style={{ height, overflow, transition: "height 0.3s ease-in-out" }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

const CurriculumTree: React.FC<CurriculumTreeProps> = ({ selectedNode, onSelect, onOverviewSelect }) => {
  const { data: treeData, isLoading } = useDiscoveryTree();
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Sync expanded state with selected node
  React.useEffect(() => {
      if (!selectedNode) return;

      if (selectedNode.type === 'program' && selectedNode.parentId) {
          const levelKey = `level-${selectedNode.parentId}`;
          setExpandedNodes(prev => prev.includes(levelKey) ? prev : [...prev, levelKey]);
      } else if (selectedNode.type === 'major' && selectedNode.parentId && selectedNode.levelId) {
          const levelKey = `level-${selectedNode.levelId}`;
          const programKey = `program-${selectedNode.parentId}`;
          setExpandedNodes(prev => {
              const newNodes = [...prev];
              if (!newNodes.includes(levelKey)) newNodes.push(levelKey);
              if (!newNodes.includes(programKey)) newNodes.push(programKey);
              return newNodes;
          });
      }
  }, [selectedNode]);

  const levels = treeData?.levels || [];

  if (isLoading) {
    return (
      <div className="w-72 bg-white border-r border-gray-200 h-full flex flex-col p-6 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
        <p className="text-xs text-gray-500 mt-2 font-medium">Loading structure...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="p-4 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search structure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 dark:bg-white/5 outline-none focus:border-brand-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
        {levels.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-10 italic">
            No academic data available.
          </div>
        )}

        {onOverviewSelect && (
          <div className="pt-2 pb-0">
            <button
              onClick={onOverviewSelect}
              className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm transition-colors ${!selectedNode ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              <GridIcon className="size-4" />
              General
            </button>
          </div>
        )}

        {levels.map((level) => {
          const levelKey = `level-${level.id}`;
          const isLevelExpanded = expandedNodes.includes(levelKey);
          const isLevelSelected = selectedNode?.type === "level" && selectedNode?.id === level.id;

          return (
            <div key={levelKey} className="mb-1">
              {/* Education Level Node */}
              <div
                onClick={() => onSelect({ type: "level", id: level.id, name: level.name })}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm group transition-all duration-200 ${isLevelSelected
                    ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <GridIcon className={`size-4 ${isLevelSelected ? "text-brand-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                  <span className="truncate">{level.name}</span>
                </div>
                {level.programStudies.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleNode(levelKey); }}
                    className={`p-1 rounded-lg hover:bg-gray-200/50 dark:hover:bg-white/10 transition-transform duration-200 ${isLevelExpanded ? "rotate-0" : "-rotate-90"}`}
                  >
                    <ChevronDownIcon className="size-3 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Program Studies (Children) */}
              <SmoothExpand isExpanded={isLevelExpanded}>
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 dark:border-white/5 pl-2 pb-1">
                  {level.programStudies.map((program) => {
                    const programKey = `program-${program.id}`;
                    const isProgramExpanded = expandedNodes.includes(programKey);
                    const isProgramSelected = selectedNode?.type === "program" && selectedNode?.id === program.id;

                    return (
                      <div key={programKey}>
                        <div
                          onClick={() => onSelect({ type: "program", id: program.id, name: program.name, parentId: level.id })}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-[13px] group transition-all ${isProgramSelected
                              ? "bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/10 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderIcon className={`size-3.5 ${isProgramSelected ? "text-blue-500" : "text-gray-400"}`} />
                            <span className="truncate">{program.name}</span>
                          </div>
                          {program.majors.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleNode(programKey); }}
                              className={`p-1 rounded transition-transform duration-200 ${isProgramExpanded ? "rotate-0" : "-rotate-90"}`}
                            >
                              <ChevronDownIcon className="size-3 text-gray-400 shadow-none" />
                            </button>
                          )}
                        </div>

                        {/* Majors (Grand-children) */}
                        <SmoothExpand isExpanded={isProgramExpanded}>
                          <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 dark:border-white/5 pl-2 pb-1">
                            {program.majors.map((major) => {
                              const majorSelected = selectedNode?.type === "major" && selectedNode?.id === major.id;
                              return (
                                <div
                                  key={`major-${major.id}`}
                                  onClick={() => onSelect({ type: "major", id: major.id, name: major.name, parentId: program.id, levelId: level.id })}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all ${majorSelected
                                      ? "text-brand-500 font-semibold bg-brand-50/30 dark:bg-brand-500/5"
                                      : "text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700"
                                    }`}
                                >
                                  <BoxIcon className={`size-3 ${majorSelected ? "text-brand-500" : "text-gray-300"}`} />
                                  <span className="truncate">{major.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </SmoothExpand>
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

export default CurriculumTree;
