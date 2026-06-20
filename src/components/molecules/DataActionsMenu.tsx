import React, { useState } from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "../atoms/DropdownItem";

const DataActionsMenu = ({ 
    onExportExcel, 
    onExportPdf, 
    onExportExcelSelected,
    selectedCount,
    onImportClick, 
    onDownloadTemplate,
    isExporting,
    isImporting,
    isMobileFab = false
}: {
    onExportExcel: () => void;
    onExportPdf: () => void;
    onExportExcelSelected?: () => void;
    selectedCount?: number;
    onImportClick: () => void;
    onDownloadTemplate: () => void;
    isExporting: boolean;
    isImporting: boolean;
    isMobileFab?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <style>{`
                @keyframes scaleFadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-scale-fade {
                    animation: scaleFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
            <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isExporting || isImporting}
                className={isMobileFab 
                    ? "flex size-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-brand-500 transition-transform active:scale-95 dark:bg-gray-800 dark:border-brand-400 dark:text-brand-400 disabled:opacity-50"
                    : "flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.05]"
                }
            >
                {(isExporting || isImporting) ? (
                    <div className={isMobileFab ? "size-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" : "size-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"} />
                ) : (
                    <svg className={isMobileFab ? "size-6" : "size-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isMobileFab ? 1.5 : 2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" /></svg>
                )}
                {!isMobileFab && (
                    <>
                        <span className="hidden sm:inline">Impor / Ekspor</span>
                        <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}
            </button>
            <Dropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className={`absolute right-0 z-20 w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-white/[0.07] dark:bg-gray-900 animate-scale-fade ${isMobileFab ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-1.5 origin-top-right"}`}
            >
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Impor</div>
                <DropdownItem
                    onClick={() => { setIsOpen(false); onImportClick(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <svg className="size-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" /></svg>
                    Unggah File Excel
                </DropdownItem>
                <DropdownItem
                    onClick={() => { setIsOpen(false); onDownloadTemplate(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <svg className="size-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17l2-3-2-3h1.5l1.25 2L12 11h1.5l-2 3 2 3H12l-1.25-2L9.5 17H8z"/></svg>
                    Unduh Template
                </DropdownItem>
                
                <div className="my-1 border-t border-gray-100 dark:border-white/[0.05]" />
                
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Ekspor</div>
                {(selectedCount ?? 0) > 0 && onExportExcelSelected && (
                    <>
                        <DropdownItem
                            onClick={() => { setIsOpen(false); onExportExcelSelected(); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                        >
                            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                            Ekspor Terpilih ({selectedCount})
                        </DropdownItem>
                        <div className="my-1 border-t border-gray-100 dark:border-white/[0.05]" />
                    </>
                )}
                <DropdownItem
                    onClick={() => { setIsOpen(false); onExportExcel(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <svg className="size-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17l2-3-2-3h1.5l1.25 2L12 11h1.5l-2 3 2 3H12l-1.25-2L9.5 17H8z"/></svg>
                    Ekspor ke Excel
                </DropdownItem>
                <DropdownItem
                    onClick={() => { setIsOpen(false); onExportPdf(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <svg className="size-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 6.5c0 .28-.22.5-.5.5H9v1.5a.5.5 0 01-1 0V14a.5.5 0 01.5-.5h1.5c.83 0 1.5.67 1.5 1.5zm4 1h-2v.5h1.5a.5.5 0 010 1H13v.5a.5.5 0 01-1 0V14a.5.5 0 01.5-.5H15a.5.5 0 010 1h-2V15h2a.5.5 0 010 1zm-7-.5h1v1H8v-1z"/></svg>
                    Ekspor ke PDF
                </DropdownItem>
            </Dropdown>
        </div>
    );
};

export default DataActionsMenu;
