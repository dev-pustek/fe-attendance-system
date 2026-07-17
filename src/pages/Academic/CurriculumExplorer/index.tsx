import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import CurriculumTree, { NodeType } from "../../../components/organisms/CurriculumTree";
import { 
  useProgramStudies, 
  useGrades, 
  useSubjects,
  useMajors,
  useEducationLevels,
  useDiscoveryTree,
  useTeacherSubjects
} from "../../../api/hooks/useAcademic";
import { useTeachers } from "../../../api/hooks/useUsers";
import { User } from "../../../api/types/user";
import { 
  ProgramStudy, 
  Grade, 
  Subject, 
  Major,
  TeacherSubject,
  EducationLevel
} from "../../../api/types/academic";
import { 
  AngleRightIcon, 
  ChevronLeftIcon, 
  CloseIcon, 
  GridIcon as DegreeIcon, 
  GridIcon, 
  ListIcon, 
  PencilIcon, 
  PlusIcon, 
  TrashBinIcon, 
  DocsIcon,
  FolderIcon,
  GroupIcon
} from "../../../components/atoms/Icons";

import Badge from "../../../components/atoms/Badge";

import Modal from "../../../components/molecules/Modal";
import Label from "../../../components/atoms/Label";
import Input from "../../../components/atoms/InputField";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useDebounce } from "../../../hooks/useDebounce";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Switch from "../../../components/atoms/Switch";

const CurriculumExplorer: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<{ type: NodeType; id: number | string; name: string; parentId?: number | string; levelId?: number | string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("programs");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { confirmState, confirm } = useConfirm();
  
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

  // Education Level Management State
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [levelFormData, setLevelFormData] = useState({ id: "", code: "", name: "", requiresMajor: true, isActive: true });
  const { createMutation: createLevelMutation, updateMutation: updateLevelMutation, deleteMutation: deleteLevelMutation } = useEducationLevels();
  
  // Fetch Tree Data for Lookups
  const { data: treeData } = useDiscoveryTree();

  // Panels implementation based on selected node
  const renderPanel = () => {
    if (!selectedNode) {
      return (
        <OverviewPanel 
            onSelect={(node) => {
                setSelectedNode(node);
                setActiveTab("programs");
            }} 
            onCreate={() => {
                setIsEditMode(false);
                setLevelFormData({ id: "", code: "", name: "", requiresMajor: true, isActive: true });
                setIsLevelModalOpen(true);
            }} 
            onEdit={handleEditLevel}
            onDelete={handleDeleteLevel}
            onToggleStatus={handleToggleLevelStatus}
        />
      );
    }

    switch (selectedNode.type) {
      case "level": {
        const level = treeData?.levels.find(l => l.id === selectedNode.id);
        return <LevelPanel 
            id={selectedNode.id} 
            name={selectedNode.name} 
            requiresMajor={level?.requiresMajor ?? false} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            onSelectProgram={(program) => {
                setSelectedNode({ type: 'program', id: program.id, name: program.name, parentId: selectedNode.id });
                setActiveTab("majors");
            }} 
        />;
      }
      case "program":
        return <ProgramPanel 
            id={selectedNode.id} 
            levelId={selectedNode.parentId!} 
            name={selectedNode.name} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onSelectMajor={(major) => {
                setSelectedNode({ type: 'major', id: major.id, name: major.name, parentId: selectedNode.id, levelId: selectedNode.parentId });
                setActiveTab("subjects");
            }}
        />;
      case "major":
        return <MajorPanel 
            id={selectedNode.id} 
            name={selectedNode.name} 
            levelId={selectedNode.levelId}
        />;
      default:
        return null;
    }
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
      e.preventDefault();
      const confirmed = await confirm({
          variant: isEditMode ? 'update' : 'create',
          title: isEditMode ? 'Ubah Jenjang Pendidikan' : 'Buat Jenjang Pendidikan',
          message: `Apakah Anda yakin ingin ${isEditMode ? 'memperbarui' : 'membuat'} "${levelFormData.name}"?`
      });

      if (!confirmed) return;

      try {
          if (isEditMode && levelFormData.id) {
              await updateLevelMutation.mutateAsync({ id: levelFormData.id, data: levelFormData });
              showSuccess("Jenjang Pendidikan berhasil diperbarui");
          } else {
              await createLevelMutation.mutateAsync(levelFormData);
              showSuccess("Jenjang Pendidikan berhasil dibuat");
          }
          setIsLevelModalOpen(false);
          setLevelFormData({ id: "", code: "", name: "", requiresMajor: true, isActive: true });
      } catch (error) {
          showError(error);
      }
  };

  const handleEditLevel = (level: EducationLevel) => {
      setLevelFormData({
          id: level.id as string,
          code: level.code,
          name: level.name,
          requiresMajor: level.requiresMajor,
          isActive: level.isActive
      });
      setIsEditMode(true);
      setIsLevelModalOpen(true);
  };

  const handleDeleteLevel = async (level: EducationLevel) => {
      const confirmed = await confirm({
          variant: 'delete',
          title: 'Hapus Jenjang Pendidikan',
          message: `Apakah Anda yakin ingin menghapus "${level.name}"? Tindakan ini tidak dapat dibatalkan.`
      });

      if (!confirmed) return;

      try {
          await deleteLevelMutation.mutateAsync(level.id);
          showSuccess("Jenjang Pendidikan berhasil dihapus");
      } catch (error) {
          showError(error);
      }
  };

  const handleToggleLevelStatus = async (level: EducationLevel) => {
      try {
          await updateLevelMutation.mutateAsync({
              id: level.id,
              data: { isActive: !level.isActive }
          });
          showSuccess(`Jenjang Pendidikan ${!level.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      } catch (error) {
          showError(error);
      }
  };

  return (
    <>
      <PageMeta title="Eksplorasi Kurikulum | SIAPUS" description="Kelola struktur akademik secara hierarkis." />
      <PageBreadcrumb pageTitle="Eksplorasi Kurikulum" />

      <div className="relative flex flex-col min-h-[600px]">


        {/* Sidebar Drawer Container - Fixed Right Overlay */}
        <div 
            className={`fixed top-[72px] bottom-0 right-0 z-20 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <aside className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col">
                 {/* Sidebar Header */}
                 <div className="p-4 pt-6 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/50">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                        Eksplorasi Akademik
                    </h2>


                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            title="Tutup Sidebar"
                        >
                            <CloseIcon className="size-4" />
                        </button>
                    </div>
                 </div>

                 {/* Sidebar Content */}
                 <div className="flex-1 w-full h-full overflow-hidden flex flex-col"> 
                     <CurriculumTree 
                         selectedNode={selectedNode} 
                         onSelect={(node) => {
                             setSelectedNode(node);
                             if (node.type === "major") setActiveTab("subjects");
                             else if (node.type === "program") setActiveTab("majors");
                             else if (activeTab === "subjects" || activeTab === "majors") setActiveTab("programs");
                         }} 
                         onOverviewSelect={() => {
                             setSelectedNode(null);
                         }}
                     />
                 </div>
                 

            </aside>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full relative"> 
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
                        Buka Menu
                    </span>
                 </button>
             )}

             <div className="w-full pb-20 p-1">
                 {renderPanel()}
             </div>
        </div>
      </div>

      <Modal isOpen={isLevelModalOpen} onClose={() => setIsLevelModalOpen(false)} title={isEditMode ? "Ubah Jenjang Pendidikan" : "Buat Jenjang Pendidikan"} className="max-w-xl">
          <form onSubmit={handleSaveLevel} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                  <Label>Nama Jenjang</Label>
                  <Input
                      value={levelFormData.name}
                      onChange={(e) => setLevelFormData({...levelFormData, name: e.target.value})}
                      placeholder="cth. Sekolah Menengah Kejuruan"
                      required
                  />
              </div>
              <div className="space-y-1.5">
                  <Label>Kode Jenjang</Label>
                  <Input
                      value={levelFormData.code}
                      onChange={(e) => setLevelFormData({...levelFormData, code: e.target.value})}
                      placeholder="cth. SMK"
                      required
                  />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-50/50 dark:bg-white/5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Membutuhkan Jurusan?</span>
                  <Switch checked={levelFormData.requiresMajor} onChange={(checked) => setLevelFormData({...levelFormData, requiresMajor: checked})} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-50/50 dark:bg-white/5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Jenjang Aktif</span>
                  <Switch checked={levelFormData.isActive} onChange={(checked) => setLevelFormData({...levelFormData, isActive: checked})} />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsLevelModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Batal</button>
                  <button type="submit" className="px-6 py-2 bg-brand-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-brand-500/20">
                      Simpan Jenjang
                  </button>
              </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

// --- Panels ---


const OverviewPanel = ({ onSelect, onCreate, onEdit, onDelete, onToggleStatus }: { 
    onSelect: (node: { type: NodeType; id: number | string; name: string }) => void, 
    onCreate: () => void,
    onEdit: (level: EducationLevel) => void,
    onDelete: (level: EducationLevel) => void,
    onToggleStatus: (level: EducationLevel) => void
}) => {
  const { data: response, isLoading } = useEducationLevels({ limit: 100, withMetrics: true });
  const levels = response?.data || [];
  
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col">
       {/* Header */}
       <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between">
                <div>
                     <p className="text-sm text-gray-500 dark:text-gray-400">Kelola semua jenjang pendidikan beserta struktur kurikulumnya.</p>
                </div>
            </div>
       </div>
       
       <div className="p-6 bg-gray-50/50 dark:bg-black/5 flex-1 w-full box-border">
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                     {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 rounded-2xl bg-gray-200 dark:bg-white/5 animate-pulse" />
                     ))}
                </div>
            ) : levels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="size-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                        <DegreeIcon className="size-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Belum Ada Jenjang Pendidikan</h3>
                     <p className="text-gray-500 max-w-sm mt-2 mb-6">Mulai bangun kurikulum Anda dengan menambahkan jenjang pendidikan (mis. SMA, Universitas).</p>
                     <button
                        onClick={onCreate}
                        className="px-6 py-2.5 rounded-xl bg-brand-500 text-white font-medium shadow-lg hover:bg-brand-600 transition-all"
                     >
                        Buat Jenjang Pertama
                     </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Add New Level Card */}
                    <div 
                        onClick={onCreate}
                        className="group relative flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden min-h-[220px]"
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute -right-6 -top-6 size-32 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/15" />
                        <div className="absolute -left-6 -bottom-6 size-32 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/15" />
                        
                        <div className="relative">
                            <div className="size-16 rounded-2xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                                <PlusIcon className="size-8 text-brand-500" />
                            </div>
                        </div>
                        
                        <div className="text-center relative">
                            <span className="text-lg font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                Tambah Jenjang Baru
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium max-w-[180px]">
                                Tentukan target kurikulum baru untuk institusi Anda
                            </p>
                        </div>
                    </div>

                    {levels.map((level) => (
                        <div 
                            key={level.id}
                            onClick={() => onSelect({ type: 'level', id: level.id, name: level.name })}
                            className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 cursor-pointer overflow-hidden"
                        >
                            <div className="p-5 flex flex-col gap-5">
                                {/* Top Header: Code/Name & Status */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{level.code}</span>
                                            {level.requiresMajor && (
                                                <>
                                                    <span className="text-gray-300 dark:text-white/10 text-[8px]">•</span>
                                                    <span className="text-[9px] font-semibold text-blue-600/70 uppercase tracking-wider dark:text-blue-400/70">
                                                        Mendukung Jurusan
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <Badge color={level.isActive ? 'success' : 'light'} className="px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                            {level.isActive ? 'Aktif' : 'Tidak Aktif'}
                                        </Badge>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                        {level.name}
                                    </h3>
                                </div>
                                
                                {/* Metrics Stats */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <DegreeIcon className="size-3 text-blue-500/80" />
                                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                            {level.metrics?.programStudiesCount || 0} Program Studi
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <FolderIcon className="size-3 text-purple-500/80" />
                                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                            {level.metrics?.majorsCount || 0} Jurusan
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <ListIcon className="size-3 text-orange-500/80" />
                                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                            {level.metrics?.gradesCount || 0} Tingkat
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <DocsIcon className="size-3 text-brand-500/80" />
                                        <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                            {level.metrics?.subjectsCount || 0} Mata Pelajaran
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Switch 
                                        checked={level.isActive} 
                                        onChange={() => onToggleStatus(level)} 
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(level); }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                    >
                                        <PencilIcon className="size-3.5" /> Ubah
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(level); }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                    >
                                        <TrashBinIcon className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
       </div>
    </div>
  );
};

const LevelPanel = ({ id, name, requiresMajor, activeTab, setActiveTab, onSelectProgram }: { 
    id: number | string, 
    name: string, 
    requiresMajor: boolean, 
    activeTab: string, 
    setActiveTab: (t: string) => void,
    onSelectProgram: (program: ProgramStudy) => void
}) => {
  const tabs = useMemo(() => {
    const baseTabs = [];
    if (requiresMajor) {
        baseTabs.push({ id: "programs", label: "Program Studi" });
    }
    baseTabs.push({ id: "grades", label: "Tingkat" });

    if (!requiresMajor) {
      baseTabs.push({ id: "subjects", label: "Mata Pelajaran" });
    }
    return baseTabs;
  }, [requiresMajor]);

  // Ensure activeTab is valid when requiresMajor changes
  useEffect(() => {
      const isValid = tabs.some(t => t.id === activeTab);
      if (!isValid && tabs.length > 0) {
          setActiveTab(tabs[0].id);
      }
  }, [tabs, activeTab, setActiveTab]);

  // Tab Refs for precise underline animation
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeElement = tabRefs.current[activeTab];
    if (activeElement) {
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
    <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {/* Header Section */}
        <div className="p-6 pb-0 relative">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                 <div>
                     <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{name}</h1>
                     <div className="flex items-center gap-2 mt-2">
                         <span className="text-sm text-gray-500 dark:text-gray-400">Ruang Lingkup Konfigurasi:</span>
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-100 dark:border-brand-500/20">
                             Jenjang Pendidikan
                         </span>
                     </div>
                 </div>
             </div>
        </div>

        {/* Tabs Section */}
        <div className="border-b border-t border-gray-100 dark:border-white/5 relative px-6 bg-gray-50/30 dark:bg-white/[0.01]">
            <div className="flex gap-8 relative" ref={tabsRef}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        ref={(el) => { tabRefs.current[tab.id] = el; }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 text-sm font-medium transition-all relative z-10 ${
                            activeTab === tab.id
                            ? "text-brand-600 dark:text-brand-400 font-semibold"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}

                <div
                    className="absolute bottom-0 h-0.5 bg-brand-500 transition-all duration-300 ease-out z-20"
                    style={{
                        left: `${indicatorStyle.left}px`,
                        width: `${indicatorStyle.width}px`
                    }}
                />
            </div>
        </div>

        <div className="flex-1 bg-white dark:bg-transparent">
             <div className="p-6">
                {activeTab === "programs" && <ProgramStudyList levelId={id} onSelect={onSelectProgram} />}
                {activeTab === "grades" && <GradeList levelId={id} />}
                {activeTab === "subjects" && <SubjectList levelId={id} />}
             </div>
        </div>
    </div>
  );
};

const ProgramPanel = ({ id, levelId, name, activeTab, setActiveTab, onSelectMajor }: {
    id: number | string,
    levelId: number | string,
    name: string,
    activeTab: string,
    setActiveTab: (t: string) => void,
    onSelectMajor: (major: Major) => void
}) => {

  const tabs = useMemo(() => [
    { id: "majors", label: "Jurusan" },
  ], []);

  // Tab Refs
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeElement = tabRefs.current[activeTab];
    if (activeElement) {
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
    <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {/* Header Section */}
        <div className="p-6 pb-0 relative">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                 <div>
                     <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{name}</h1>
                     <div className="flex items-center gap-2 mt-2">
                         <span className="text-sm text-gray-500 dark:text-gray-400">Ruang Lingkup Konfigurasi:</span>
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                             Program Studi
                         </span>
                     </div>
                 </div>
             </div>
        </div>

        {/* Tabs Section */}
        <div className="border-b border-t border-gray-100 dark:border-white/5 relative px-6 bg-gray-50/30 dark:bg-white/[0.01]">
            <div className="flex gap-8 relative" ref={tabsRef}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        ref={(el) => { tabRefs.current[tab.id] = el; }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 text-sm font-medium transition-all relative z-10 ${
                            activeTab === tab.id
                            ? "text-brand-600 dark:text-brand-400 font-semibold"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
                
                <div 
                    className="absolute bottom-0 h-0.5 bg-brand-500 transition-all duration-300 ease-out z-20"
                    style={{
                        left: `${indicatorStyle.left}px`,
                        width: `${indicatorStyle.width}px`
                    }}
                />
            </div>
        </div>

        <div className="flex-1 bg-white dark:bg-transparent">
             <div className="p-6">
                {activeTab === "majors" && <MajorList programId={id} levelId={levelId} onSelect={onSelectMajor} />}
             </div>
        </div>
    </div>
  );
};

const MajorPanel = ({ id, name, levelId }: { id: number | string, name: string, levelId?: number | string }) => {
  return (
    <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 relative bg-gray-50/30 dark:bg-white/[0.01]">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                     <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{name}</h1>
                     <div className="flex items-center gap-2 mt-2">
                         <span className="text-sm text-gray-500 dark:text-gray-400">Ruang Lingkup Konfigurasi:</span>
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300 border border-green-100 dark:border-green-500/20">
                             Jurusan
                         </span>
                     </div>
                 </div>
             </div>
        </div>

        <div className="flex-1 bg-white dark:bg-transparent">
             <div className="p-6">
                <SubjectList majorId={id} levelId={levelId} majorName={name} />
             </div>
        </div>
    </div>
  );
};

// --- Lists ---

const ProgramStudyList = ({ levelId, onSelect }: { levelId: number | string, onSelect: (p: ProgramStudy) => void }) => {
  // 1. State for Filtering & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // 2. Fetch Data with Params
  // Note: Ensure your useProgramStudies hook accepts these params! 
  // If not, we might need to do client-side filtering if the API doesn't support it yet, 
  // but ideally the API supports it. Assuming standard hook pattern.
  const [selectedProgram, setSelectedProgram] = useState<ProgramStudy | null>(null);

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useProgramStudies({ 
      educationLevelId: levelId,
      search: debouncedSearch || undefined, // support search
      page,
      limit,
      withMetrics: true
  });

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", isActive: true, educationLevelId: 0 });
  const { data: levelsData } = useEducationLevels({ limit: 100 });
  const levels = levelsData?.data || [];
  const { confirm, confirmState } = useConfirm();

  // 3. Extract Data & Meta
  const programs = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const handleOpenModal = (program?: ProgramStudy) => {
      if (program) {
        setSelectedProgram(program);
        setFormData({ name: program.name, code: program.code, isActive: program.isActive, educationLevelId: Number(program.educationLevelId ?? levelId) });
      } else {
        setSelectedProgram(null);
        setFormData({ name: "", code: "", isActive: true, educationLevelId: Number(levelId) });
      }
      setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedProgram;
    const confirmed = await confirm({
        variant: isEdit ? 'update' : 'create',
        title: isEdit ? 'Ubah Program Studi' : 'Buat Program Studi',
        message: `Apakah Anda yakin ingin ${isEdit ? 'mengubah' : 'membuat'} "${formData.name}"?`
    });

    if (!confirmed) return;

    try {
      if (isEdit) {
          await updateMutation.mutateAsync({
            id: selectedProgram.id,
            data: { ...formData }
          });
          showSuccess("Program Studi berhasil diubah");
      } else {
          await createMutation.mutateAsync({ ...formData });
          showSuccess("Program Studi berhasil ditambahkan");
      }
      setIsOpen(false);
    } catch (err) { showError(err); }
  };

  const handleDelete = async (prog: ProgramStudy) => {
      const ok = await confirm({ variant: "delete", title: "Hapus Program Studi", message: `Hapus ${prog.name}?` });
      if (ok) {
          try {
              await deleteMutation.mutateAsync(prog.id);
              showSuccess("Berhasil dihapus");
          } catch(e) { showError(e); }
      }
  };

  const handleToggleStatus = async (prog: ProgramStudy) => {
      try {
          await updateMutation.mutateAsync({
            id: prog.id,
            data: { isActive: !prog.isActive }
          });
          showSuccess(`${prog.name} sekarang ${!prog.isActive ? "Aktif" : "Tidak Aktif"}`);
      } catch (err) { showError(err); }
  };

  return (
    <div className="space-y-6">

      {/* Filters (Search Only for now, maybe status later) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cari Program Studi</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Kode atau nama..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>
          </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!isLoading && (
                /* Add New Program Card */
                <div
                    onClick={() => handleOpenModal()}
                    className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-8 transition-all hover:bg-white hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden h-full min-h-[160px]"
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute -right-4 -top-4 size-24 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:bg-brand-500/10" />

                    <div className="relative">
                        <div className="size-12 rounded-xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                            <PlusIcon className="size-6 text-brand-500" />
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Tambah Program Studi Baru</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Buat program studi baru</span>
                    </div>
                </div>
            )}

           {isLoading ? (
                // Skeleton Loading State
                [...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] animate-pulse">
                        <div className="h-4 w-1/3 bg-gray-100 dark:bg-white/10 rounded mb-4"></div>
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/10 rounded mb-8"></div>
                    </div>
                ))
           ) : (
                programs.map((p: ProgramStudy) => (
                    <div 
                        key={p.id} 
                        onClick={() => onSelect(p)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 cursor-pointer overflow-hidden"
                    >
                        <div className="p-5 flex flex-col gap-5">
                            {/* Top Header: Code & Status */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{p.code}</span>
                                    <Badge color={p.isActive ? "success" : "light"} className="px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                        {p.isActive ? "Aktif" : "Tidak Aktif"}
                                    </Badge>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                    {p.name}
                                </h3>
                            </div>
                            
                            {/* Metrics Stats */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <FolderIcon className="size-3 text-purple-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {p.metrics?.majorsCount || 0} Jurusan
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <DocsIcon className="size-3 text-brand-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {p.metrics?.subjectsCount || 0} Mata Pelajaran
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={p.isActive}
                                    onChange={() => handleToggleStatus(p)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(p); }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                >
                                    <PencilIcon className="size-3.5" /> Ubah
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                >
                                    <TrashBinIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
           )}
      </div>

      {/* Pagination */}
      {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> sampai{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Sebelumnya
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                Berikutnya
                <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedProgram ? "Ubah Program Studi" : "Tambah Program Studi"}
        description="Konfigurasikan detail dan status program studi."
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-3">
             <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">Batal</button>
             <button type="submit" form="program-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                {selectedProgram ? "Ubah Program Studi" : "Simpan Program Studi"}
             </button>
          </div>
        }
      >
        <form id="program-form" onSubmit={handleSubmit} className="space-y-4">
           {/* Level Name Display (No ID) */}
           <div className="space-y-1.5">
             <Label>Jenjang Pendidikan</Label>
             <CustomSelect
                 value={formData.educationLevelId}
                 onChange={(val) => setFormData({...formData, educationLevelId: Number(val)})}
                 options={levels.map(l => ({ label: l.name, value: l.id }))}
                 placeholder="Pilih jenjang..."
             />
           </div>

           <div className="space-y-1.5">
             <Label>Nama Program Studi</Label>
             <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="cth. IPA" required />
           </div>
           <div className="space-y-1.5">
             <Label>Kode</Label>
             <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="cth. IPA" required />
           </div>

           {/* Status Switch (Only for Edit or default new) */}
            <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-50/50 dark:bg-white/5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Program Studi Aktif</span>
                    <Switch checked={formData.isActive} onChange={(checked) => setFormData({...formData, isActive: checked})} />
                </div>
            </div>
        </form>
      </Modal>
      <ConfirmDialog {...confirmState} />
    </div>
  );
};

const GradeList = ({ levelId }: { levelId: number | string }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Grade List Implementation
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useGrades({ 
      educationLevelId: levelId,
      search: debouncedSearch || undefined,
      page,
      limit,
      withMetrics: true
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", educationLevelId: 0 });
  const { data: levelsData } = useEducationLevels({ limit: 100 });
  const levels = levelsData?.data || [];
  const { confirm, confirmState } = useConfirm();

  const grades = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const handleOpenModal = (grade?: Grade) => {
      if (grade) {
        setSelectedGrade(grade);
        setFormData({ name: grade.name, code: grade.code, educationLevelId: Number(grade.educationLevelId ?? levelId) });
      } else {
        setSelectedGrade(null);
        setFormData({ name: "", code: "", educationLevelId: Number(levelId) });
      }
      setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedGrade;
    const confirmed = await confirm({
        variant: isEdit ? 'update' : 'create',
        title: isEdit ? 'Ubah Tingkat' : 'Buat Tingkat',
        message: `Apakah Anda yakin ingin ${isEdit ? 'mengubah' : 'membuat'} "${formData.name}"?`
    });

    if (!confirmed) return;

    try {
      if (isEdit) {
          await updateMutation.mutateAsync({
             id: selectedGrade.id,
             data: { ...formData }
          });
          showSuccess("Tingkat berhasil diubah");
      } else {
          await createMutation.mutateAsync({ ...formData });
          showSuccess("Tingkat berhasil ditambahkan");
      }
      setIsOpen(false);
    } catch (err) { showError(err); }
  };

  const handleDelete = async (grade: Grade) => {
      const ok = await confirm({ variant: "delete", title: "Hapus Tingkat", message: `Hapus ${grade.name}?` });
      if (ok) {
          try {
              await deleteMutation.mutateAsync(grade.id);
              showSuccess("Berhasil dihapus");
          } catch(e) { showError(e); }
      }
  };

  return (
    <div className="space-y-6">

       <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cari</label>
               <div className="relative">
                 <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                   <GridIcon className="size-4" />
                 </div>
                 <input
                   type="text"
                   placeholder="Cari tingkat..."
                   value={searchQuery}
                   onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                   className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                 />
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {/* Add New Grade Card */}
           <div 
                onClick={() => handleOpenModal()}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-8 transition-all hover:bg-white hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden min-h-[160px]"
            >
                {/* Decorative Background Elements */}
                <div className="absolute -right-4 -top-4 size-24 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:bg-brand-500/10" />
                
                <div className="relative">
                    <div className="size-12 rounded-xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                        <PlusIcon className="size-6 text-brand-500" />
                    </div>
                </div>
                <div className="text-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Tambah Tingkat Baru</span>
                </div>
            </div>

           {isLoading ? (
                // Skeleton Loading State
                [...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] animate-pulse">
                        <div className="h-4 w-1/3 bg-gray-100 dark:bg-white/10 rounded mb-4"></div>
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/10 rounded mb-8"></div>
                    </div>
                ))
           ) : (
                grades.map((g: Grade) => (
                    <div 
                        key={g.id} 
                        className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 overflow-hidden"
                    >
                        <div className="p-5 flex flex-col gap-5">
                            {/* Top Header: Code as Badge & Hierarchy */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-brand-500/80 uppercase tracking-widest dark:text-brand-400/80">
                                        {g.educationLevel?.name || levels.find(l => l.id === g.educationLevelId)?.name || "Jenjang"}
                                    </span>
                                    <Badge color="light" className="px-1.5 py-0 text-[10px] font-bold tracking-widest uppercase rounded-md border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                                        {g.code}
                                    </Badge>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                    {g.name}
                                </h3>
                            </div>
                            
                            {/* Metrics Stats */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <GroupIcon className="size-3 text-blue-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {g.metrics?.classesCount || 0} Kelas
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <DocsIcon className="size-3 text-brand-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {g.metrics?.subjectsCount || 0} Mata Pelajaran
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenModal(g)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                >
                                    <PencilIcon className="size-3.5" /> Ubah
                                </button>
                                <button
                                    onClick={() => handleDelete(g)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                >
                                    <TrashBinIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
           )}
      </div>

       {/* Pagination */}
       {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> sampai{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Sebelumnya
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                Berikutnya
                <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={selectedGrade ? "Ubah Tingkat" : "Tambah Tingkat"} className="max-w-xl">
           <form onSubmit={handleSubmit} className="space-y-4 pt-4">
               <div className="space-y-1.5">
                   <Label>Jenjang Pendidikan</Label>
                   <CustomSelect
                       value={formData.educationLevelId}
                       onChange={(val) => setFormData({...formData, educationLevelId: Number(val)})}
                       options={levels.map(l => ({ label: l.name, value: l.id }))}
                       placeholder="Pilih jenjang..."
                   />
               </div>
               <div className="space-y-1.5">
                 <Label>Nama Tingkat</Label>
                 <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="cth. Kelas 10" required />
               </div>
               <div className="space-y-1.5">
                 <Label>Kode</Label>
                 <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="cth. 10" required />
               </div>
               <div className="flex justify-end gap-3 pt-6">
                 <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">Batal</button>
                 <button type="submit" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                    {selectedGrade ? "Ubah" : "Simpan"}
                 </button>
               </div>
           </form>
      </Modal>
      <ConfirmDialog {...confirmState} />
    </div>
  );
};

const MajorList = ({ programId, levelId, onSelect }: { 
    programId: number | string; 
    levelId: number | string, 
    onSelect: (m: Major) => void 
}) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Major List Implementation
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useMajors({ 
      programStudyId: programId,
      search: debouncedSearch || undefined,
      page,
      limit
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", isActive: true, educationLevelId: 0, programStudyId: 0 });
  
  const { data: levelsData } = useEducationLevels({ limit: 100 });
  const levels = levelsData?.data || [];

  const { data: programsData } = useProgramStudies({ 
      educationLevelId: formData.educationLevelId || Number(levelId), 
      limit: 100 
  });
  const programs = programsData?.data || [];

  const { confirm, confirmState } = useConfirm();

  const majors = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const handleOpenModal = (major?: Major) => {
      if (major) {
        setSelectedMajor(major);
        setFormData({ 
            name: major.name, 
            code: major.code, 
            isActive: major.isActive,
            educationLevelId: Number(major.educationLevelId ?? levelId),
            programStudyId: Number(major.programStudyId ?? programId)
        });
      } else {
        setSelectedMajor(null);
        setFormData({ 
            name: "", 
            code: "", 
            isActive: true,
            educationLevelId: Number(levelId),
            programStudyId: Number(programId)
        });
      }
      setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedMajor;
    const confirmed = await confirm({
        variant: isEdit ? 'update' : 'create',
        title: isEdit ? 'Ubah Jurusan' : 'Buat Jurusan',
        message: `Apakah Anda yakin ingin ${isEdit ? 'mengubah' : 'membuat'} "${formData.name}"?`
    });

    if (!confirmed) return;

    try {
      if (isEdit) {
          await updateMutation.mutateAsync({
             id: selectedMajor.id,
             data: { ...formData }
          });
          showSuccess("Jurusan berhasil diubah");
      } else {
          await createMutation.mutateAsync({ ...formData });
          showSuccess("Jurusan berhasil ditambahkan");
      }
      setIsOpen(false);
    } catch (err) { showError(err); }
  };

  const handleDelete = async (major: Major) => {
      const ok = await confirm({ variant: "delete", title: "Hapus Jurusan", message: `Hapus ${major.name}?` });
      if (ok) {
          try {
              await deleteMutation.mutateAsync(major.id);
              showSuccess("Berhasil dihapus");
          } catch(e) { showError(e); }
      }
  };

  const handleToggleStatus = async (major: Major) => {
      try {
          await updateMutation.mutateAsync({
            id: major.id,
            data: { isActive: !major.isActive }
          });
          showSuccess(`${major.name} sekarang ${!major.isActive ? "Aktif" : "Tidak Aktif"}`);
      } catch (err) { showError(err); }
  };

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cari Jurusan</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Kode atau nama..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>
          </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {/* Add New Major Card */}
           <div 
                onClick={() => handleOpenModal()}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-8 transition-all hover:bg-white hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden h-full min-h-[160px]"
            >
                {/* Decorative Background Elements */}
                <div className="absolute -right-4 -top-4 size-24 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:bg-brand-500/10" />
                
                <div className="relative">
                    <div className="size-12 rounded-xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                        <PlusIcon className="size-6 text-brand-500" />
                    </div>
                </div>
                <div className="text-center relative">
                    <span className="text-sm font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Tambah Jurusan Baru</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Buat jurusan/keahlian baru</p>
                </div>
            </div>

           {isLoading ? (
                // Skeleton Loading State
                [...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] animate-pulse">
                        <div className="h-4 w-1/3 bg-gray-100 dark:bg-white/10 rounded mb-4"></div>
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/10 rounded mb-8"></div>
                    </div>
                ))
           ) : (
                majors.map((m: Major) => (
                    <div 
                        key={m.id} 
                        onClick={() => onSelect(m)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 cursor-pointer overflow-hidden"
                    >
                        <div className="p-5 flex flex-col gap-5">
                            {/* Top Header: Code & Status */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{m.code}</span>
                                    <Badge color={m.isActive ? "success" : "light"} className="px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                        {m.isActive ? "Aktif" : "Tidak Aktif"}
                                    </Badge>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                    {m.name}
                                </h3>
                            </div>
                            
                            {/* Metrics Stats */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <GroupIcon className="size-3 text-blue-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {m.metrics?.classesCount || 0} Kelas
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <DocsIcon className="size-3 text-brand-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {m.metrics?.subjectsCount || 0} Mata Pelajaran
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={m.isActive}
                                    onChange={() => handleToggleStatus(m)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(m); }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                >
                                    <PencilIcon className="size-3.5" /> Ubah
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                >
                                    <TrashBinIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
           )}
      </div>

       {/* Pagination */}
      {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> sampai{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Sebelumnya
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                Berikutnya
                <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedMajor ? "Ubah Jurusan" : "Tambah Jurusan"}
        description="Atur detail dan status aktif jurusan."
        className="max-w-xl"
        footer={
           <div className="flex justify-end gap-3">
             <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">Batal</button>
             <button type="submit" form="major-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                {selectedMajor ? "Ubah Jurusan" : "Simpan Jurusan"}
             </button>
           </div>
        }
      >
          <form id="major-form" onSubmit={handleSubmit} className="space-y-4">
             {/* Context Info */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Jenjang Pendidikan</Label>
                  <CustomSelect
                      value={formData.educationLevelId}
                      onChange={(val) => setFormData(prev => ({ ...prev, educationLevelId: Number(val), programStudyId: 0 }))}
                      options={levels.map(l => ({ label: l.name, value: l.id }))}
                      placeholder="Pilih jenjang..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Program Studi</Label>
                  <CustomSelect
                      value={formData.programStudyId}
                      onChange={(val) => setFormData(prev => ({ ...prev, programStudyId: Number(val) }))}
                      options={programs.map(p => ({ label: p.name, value: p.id }))}
                      placeholder="Pilih program studi..."
                      disabled={!formData.educationLevelId}
                  />
                </div>
             </div>

             <div className="space-y-1.5">
               <Label>Nama Jurusan</Label>
               <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="cth. Multimedia" required />
             </div>
             <div className="space-y-1.5">
               <Label>Kode</Label>
               <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="cth. MMD" required />
             </div>

             {/* Status Switch (Only for Edit or default new) */}
             <div className="space-y-1.5">
                 <Label>Status</Label>
                 <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-50/50 dark:bg-white/5">
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Jurusan Aktif</span>
                     <Switch checked={formData.isActive} onChange={(checked) => setFormData({...formData, isActive: checked})} />
                 </div>
             </div>
          </form>
      </Modal>
      <ConfirmDialog {...confirmState} />
    </div>
  );
};

const SubjectList = ({ majorId, levelId, majorName }: { majorId?: number | string, levelId?: number | string, majorName?: string }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | string>(""); // For non-major filtering
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // Need to fetch grades if we are adding a subject or filtering by grade
  const { data: gradesData } = useGrades({ educationLevelId: levelId, limit: 100 });
  const grades = gradesData?.data || [];

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useSubjects({ 
      majorId: majorId || undefined, // Only pass if exists
      gradeId: gradeFilter || undefined, // Always allow filtering by grade if selected
      educationLevelId: (!majorId && !gradeFilter) ? levelId : undefined, // Fallback to Level scope if no Major AND no specific Grade selected
      search: debouncedSearch || undefined,
      isActive: statusFilter === "" ? undefined : statusFilter === "true",
      page,
      limit
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", isActive: true, gradeId: "" as number | string });

  
  const { confirm, confirmState } = useConfirm();

  const subjects = useMemo(() => response?.data || [], [response]);
  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? 1);



  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({ 
          name: subject.name, 
          code: subject.code, 
          isActive: subject.isActive ?? true,
          gradeId: subject.gradeId || "" 
      });
    } else {
      setSelectedSubject(null);
      setFormData({ name: "", code: "", isActive: true, gradeId: gradeFilter || "" });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedSubject;
    const confirmed = await confirm({
        variant: isEdit ? 'update' : 'create',
        title: isEdit ? 'Ubah Mata Pelajaran' : 'Buat Mata Pelajaran',
        message: `Apakah Anda yakin ingin ${isEdit ? 'mengubah' : 'membuat'} "${formData.name}"?`
    });

    if (!confirmed) return;

    try {
      if (isEdit) {
          await updateMutation.mutateAsync({
              id: selectedSubject.id,
              data: {
                  ...formData,
                  majorId: majorId ? Number(majorId) : null,
                  gradeId: formData.gradeId ? Number(formData.gradeId) : null
              }
          });
          showSuccess("Mata pelajaran berhasil diubah");
      } else {
          await createMutation.mutateAsync({
              ...formData,
              majorId: majorId ? Number(majorId) : null,
              gradeId: formData.gradeId ? Number(formData.gradeId) : null,
              isActive: true
          });
          showSuccess("Mata pelajaran berhasil ditambahkan");
      }
      setIsOpen(false);
    } catch (err) { showError(err); }
  };

  const [instructorModalOpen, setInstructorModalOpen] = useState(false);
  const [subjectForInstructor, setSubjectForInstructor] = useState<Subject | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  
  useEffect(() => {
    if (instructorModalOpen && subjectForInstructor && response?.data) {
        const updated = response.data.find(s => s.id === subjectForInstructor.id);
        if (updated) {
            setSubjectForInstructor(updated);
        }
    }
  }, [response?.data, instructorModalOpen, subjectForInstructor]);
  
  const { teachers } = useTeachers({ limit: 100, isActive: true }); // Fetch teachers

  const { deleteMutation: deleteTeacherSubject, bulkAssignMutation } = useTeacherSubjects();



  const handleAddInstructor = (s: Subject) => {
      setSubjectForInstructor(s);
      setSelectedTeacherIds([]);
      setInstructorModalOpen(true);
  };

  const handleSaveInstructor = async () => {
      if (!subjectForInstructor || selectedTeacherIds.length === 0) return;
      try {
          await bulkAssignMutation.mutateAsync({
              subjectId: subjectForInstructor.id,
              teacherIds: selectedTeacherIds
          });
          queryClient.invalidateQueries({ queryKey: ["academic", "subjects"] });
          showSuccess(`${selectedTeacherIds.length} guru pengajar berhasil ditetapkan`);
          setInstructorModalOpen(false);
      } catch (e) { showError(e); }
  };

  const handleRemoveInstructor = async (tsId: number | string, teacherName: string) => {
      const ok = await confirm({
          variant: "delete",
          title: "Hapus Guru Pengajar",
          message: `Hapus ${teacherName} dari mata pelajaran ini?`
      });
      if (ok) {
          try {
              await deleteTeacherSubject.mutateAsync(tsId);
              queryClient.invalidateQueries({ queryKey: ["academic", "subjects"] });
              showSuccess("Guru pengajar berhasil dihapus");
          } catch(e) { showError(e); }
      }
  };

  const handleDelete = async (s: Subject) => {
      const ok = await confirm({ variant: "delete", title: "Hapus Mata Pelajaran", message: `Hapus ${s.name}?` });
      if (ok) {
          try {
              await deleteMutation.mutateAsync(s.id);
              showSuccess("Berhasil dihapus");
          } catch(e) { showError(e); }
      }
  };

  const handleToggleStatus = async (s: Subject) => {
      try {
          await updateMutation.mutateAsync({
            id: s.id,
            data: { isActive: !s.isActive }
          });
          showSuccess(`${s.name} sekarang ${!s.isActive ? "Aktif" : "Tidak Aktif"}`);
      } catch (err) { showError(err); }
  };

  return (
    <div className="space-y-6">

      {/* Filters (Add Grade Filter if no Major) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cari Mata Pelajaran</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Kode atau nama..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

             {/* Grade Filter - Always available if we have grades */}
             {grades.length > 0 && (
                <div className="w-full sm:w-48 space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filter Tingkat</label>
                    <CustomSelect
                        value={gradeFilter}
                        onChange={(val) => { setGradeFilter(val); setPage(1); }}
                        options={[
                            { label: "Semua Tingkat", value: "" },
                            ...grades.map(g => ({ label: g.name, value: g.id }))
                        ]}
                        placeholder="Semua Tingkat"
                    />
                </div>
             )}

            <div className="w-full sm:w-48 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
               <CustomSelect
                value={statusFilter}
                onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                options={[
                  { label: "Semua Status", value: "" },
                  { label: "Aktif", value: "true" },
                  { label: "Tidak Aktif", value: "false" },
                ]}
                placeholder="Semua Status"
              />
            </div>
          </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {/* Add New Subject Card */}
           <div 
                onClick={() => handleOpenModal()}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-8 transition-all hover:bg-white hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden h-full min-h-[180px]"
            >
                {/* Decorative Background Elements */}
                <div className="absolute -right-4 -top-4 size-24 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:bg-brand-500/10" />
                
                <div className="relative">
                    <div className="size-12 rounded-xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                        <PlusIcon className="size-6 text-brand-500" />
                    </div>
                </div>
                <div className="text-center relative">
                    <span className="text-sm font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Tambah Mata Pelajaran Baru</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Buat entri mata pelajaran baru</p>
                </div>
            </div>

           {isLoading ? (
                // Skeleton Loading State
                [...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] animate-pulse">
                        <div className="h-4 w-1/3 bg-gray-100 dark:bg-white/10 rounded mb-4"></div>
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/10 rounded mb-8"></div>
                    </div>
                ))
           ) : (
                subjects.map((s: Subject) => (
                    <div 
                        key={s.id} 
                        className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 overflow-hidden"
                    >
                        <div className="p-5 flex flex-col gap-5">
                            {/* Top Header: Code & Status */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{s.code}</span>
                                        <span className="text-gray-300 dark:text-white/10 text-[8px]">•</span>
                                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                            {s.grade?.name ?? grades.find(g => g.id === s.gradeId)?.name ?? "-"}
                                        </span>
                                    </div>
                                    <Badge color={s.isActive ? "success" : "light"} className="px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                        {s.isActive ? "Aktif" : "Tidak Aktif"}
                                    </Badge>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                    {s.name}
                                </h3>
                            </div>
                            
                            {/* Metrics Stats */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                    <GroupIcon className="size-3 text-blue-500/80" />
                                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                                        {s.teacherSubjects?.length || 0} Guru Pengajar
                                    </span>
                                </div>

                                {/* Teacher Stack & Add Instructor */}
                                <div className="flex items-center -space-x-1.5">
                                    {s.teacherSubjects?.slice(0, 3).map((ts: TeacherSubject) => (
                                        <div key={ts.id} className="size-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gray-50 dark:bg-zinc-700 overflow-hidden flex items-center justify-center">
                                            {ts.teacher?.photo ? (
                                                <img src={ts.teacher.photo} alt={ts.teacher.name} className="size-full object-cover" />
                                            ) : (
                                                <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">
                                                    {ts.teacher?.name?.substring(0, 2).toUpperCase() || "??"}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {s.teacherSubjects && s.teacherSubjects.length > 3 && (
                                        <div className="size-6 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-gray-50 dark:bg-zinc-700 flex items-center justify-center">
                                            <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">+{s.teacherSubjects.length - 3}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAddInstructor(s); }}
                                        className={`size-6 rounded-full flex items-center justify-center transition-all ${
                                            s.teacherSubjects && s.teacherSubjects.length > 0 
                                            ? "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 ring-2 ring-white dark:ring-zinc-800 ml-1.5" 
                                            : "bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand-600 dark:bg-white/5 dark:text-gray-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 border border-dashed border-gray-300 dark:border-white/10"
                                        }`}
                                        title="Kelola Guru Pengajar"
                                    >
                                        <PlusIcon className="size-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={s.isActive}
                                    onChange={() => handleToggleStatus(s)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(s); }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                >
                                    <PencilIcon className="size-3.5" /> Ubah
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                >
                                    <TrashBinIcon className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
           )}
      </div>

      {/* Pagination */}
      {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> sampai{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Sebelumnya
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                Berikutnya
                <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedSubject ? "Ubah Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
        description="Buat atau ubah detail mata pelajaran."
        className="max-w-lg"
        footer={
           <div className="flex justify-end gap-3">
             <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">Batal</button>
             <button type="submit" form="subject-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20">
                {selectedSubject ? "Ubah Mata Pelajaran" : "Simpan Mata Pelajaran"}
             </button>
           </div>
        }
      >
          <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
             {/* Major Name Display */}
             <div className="space-y-1.5">
               <Label>Jurusan</Label>
               <Input value={majorName} disabled className="bg-gray-50 text-gray-500" />
             </div>

             <div className="space-y-1.5">
               <Label>Nama Mata Pelajaran</Label>
               <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="cth. Matematika" required />
             </div>
             <div className="space-y-1.5">
               <Label>Kode</Label>
               <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="cth. MATH-10" required />
             </div>

             {/* Grade Selection */}
             <div className="space-y-1.5">
               <Label>Tingkat</Label>
               <CustomSelect
                 value={formData.gradeId}
                 onChange={(val) => setFormData({...formData, gradeId: val})}
                 options={[
                     { label: "Pilih Tingkat", value: "" },
                     ...grades.map(g => ({ label: g.name, value: g.id }))
                 ]}
                 placeholder="Pilih tingkat..."
               />
             </div>
             {/* Status Switch (Only for Edit or default new) */}
             <div className="space-y-1.5">
                 <Label>Status</Label>
                 <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-50/50 dark:bg-white/5">
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mata Pelajaran Aktif</span>
                     <Switch checked={formData.isActive} onChange={(checked) => setFormData({...formData, isActive: checked})} />
                 </div>
             </div>
          </form>
      </Modal>

      {/* Add Instructor Modal */}
      <Modal
         isOpen={instructorModalOpen}
         onClose={() => setInstructorModalOpen(false)}
         title="Kelola Guru Pengajar"
         description={`Tetapkan atau hapus guru untuk mata pelajaran "${subjectForInstructor?.name}"`}
         className="max-w-4xl"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Left Side: Add Instructor Form */}
              <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/10">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <PlusIcon className="size-4 text-brand-500" />
                          Tambah Guru Pengajar Baru
                      </h5>

                      <div className="space-y-4">
                          <div className="space-y-1.5">
                              <Label>Pilih Guru</Label>
                              <CustomSelect
                                  multiple
                                  value={[...selectedTeacherIds, ...(subjectForInstructor?.teacherSubjects?.map((ts: TeacherSubject) => ts.teacher?.public_id).filter((id): id is string => !!id) || [])]}
                                  onChange={(vals: string[]) => {
                                      const assignedIds = subjectForInstructor?.teacherSubjects?.map((ts: TeacherSubject) => ts.teacher?.public_id).filter((id): id is string => !!id) || [];
                                      const pendingIds = vals.filter(id => !assignedIds.includes(id));
                                      setSelectedTeacherIds(pendingIds);
                                  }}
                                  options={teachers.map((t: User) => {
                                      const isAssigned = subjectForInstructor?.teacherSubjects?.some((ts: TeacherSubject) => ts.teacher?.public_id === t.public_id);
                                      return {
                                          label: isAssigned ? `${t.name} (Ditetapkan)` : t.name,
                                          value: t.public_id
                                      };
                                  })}
                                  placeholder="Cari guru..."
                              />
                          </div>

                          {/* Pending Selection List */}
                          {selectedTeacherIds.length > 0 ? (
                              <div className="space-y-2">
                                  <Label>Dipilih untuk Ditetapkan</Label>
                                  <div className="flex flex-wrap gap-2">
                                      {selectedTeacherIds.map((id: string) => {
                                          const t = teachers.find((teach: User) => teach.public_id === id);
                                          return (
                                              <div key={id} className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-zinc-800 text-brand-700 dark:text-brand-400 rounded-lg text-xs font-semibold border border-brand-200 dark:border-brand-500/30">
                                                  <span>{t?.name || "Tidak diketahui"}</span>
                                                  <button
                                                      onClick={() => setSelectedTeacherIds(prev => prev.filter(i => i !== id))}
                                                      className="text-gray-400 hover:text-error-500 transition-colors"
                                                  >
                                                      <CloseIcon className="size-3" />
                                                  </button>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          ) : (
                              <div className="py-4 text-center">
                                  <p className="text-xs text-gray-400 italic">Pilih guru dari daftar untuk menambahkannya ke antrean</p>
                              </div>
                          )}

                          <button
                              onClick={handleSaveInstructor}
                              disabled={selectedTeacherIds.length === 0 || bulkAssignMutation.isPending}
                              className="w-full mt-4 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                              {bulkAssignMutation.isPending ? (
                                  <span className="flex items-center gap-2">
                                      <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Menetapkan...
                                  </span>
                              ) : `Tetapkan ${selectedTeacherIds.length > 0 ? selectedTeacherIds.length : ''} Guru Pengajar`}
                          </button>
                      </div>
                  </div>
              </div>

              {/* Right Side: Existing Instructors List */}
              <div className="space-y-4 border-l border-gray-100 dark:border-white/5 pl-8">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <DocsIcon className="size-4 text-blue-500" />
                      Guru Pengajar Saat Ini
                  </h5>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {subjectForInstructor?.teacherSubjects && subjectForInstructor.teacherSubjects.length > 0 ? (
                          subjectForInstructor.teacherSubjects.map((ts: TeacherSubject) => (
                              <div key={ts.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-white/5 dark:border-white/10 group transition-all hover:bg-white hover:shadow-sm dark:hover:bg-white/15">
                                  <div className="flex items-center gap-3">
                                       {ts.teacher?.photo ? (
                                           <img src={ts.teacher.photo} alt={ts.teacher.name} className="size-8 rounded-full object-cover ring-2 ring-white dark:ring-white/10 shadow-sm" />
                                       ) : (
                                           <div className="size-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-semibold dark:bg-brand-500/20 dark:text-brand-400 ring-2 ring-white dark:ring-white/10">
                                                {ts.teacher?.name?.substring(0, 2).toUpperCase() || "??"}
                                           </div>
                                       )}
                                       <div className="flex flex-col">
                                           <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                {ts.teacher?.name || "Tidak diketahui"}
                                           </span>
                                           <span className="text-[10px] text-gray-500 dark:text-gray-400 lowercase tracking-tight">
                                                {ts.teacher?.email || "N/A"}
                                           </span>
                                       </div>
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => handleRemoveInstructor(ts.id, ts.teacher?.name || "Tidak diketahui")}
                                      className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                      title="Hapus"
                                  >
                                      <TrashBinIcon className="size-4" />
                                  </button>
                              </div>
                          ))
                      ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-white/5">
                              <p className="text-xs text-gray-400 italic font-medium uppercase tracking-widest opacity-60">Belum ada guru pengajar</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </div>
  );
};





export default CurriculumExplorer;
