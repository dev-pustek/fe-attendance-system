import React, { useRef } from "react";
import Input from "../atoms/InputField";
import { SearchIcon, DownloadIcon, TrashBinIcon, MoreDotIcon } from "../atoms/Icons";

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "danger" | "default";
}

interface TableToolbarProps {
  /** Search */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Filter slots — pass any selects / controls */
  filters?: React.ReactNode;

  /** Selection state */
  selectedCount?: number;
  bulkActions?: BulkAction[];
  onClearSelection?: () => void;

  /** Primary action (e.g. "Add New") */
  primaryAction?: React.ReactNode;

  /** Export handlers */
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportExcelSelected?: () => void;  // export only selected rows

  /** Import handlers */
  onImportClick?: () => void; // Trigger for opening an import modal
  onDownloadTemplate?: () => void;

  /** Loading state for export/import */
  isExporting?: boolean;
  isImporting?: boolean;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  selectedCount = 0,
  bulkActions = [],
  onClearSelection,
  primaryAction,
  onExportExcel,
  onExportPdf,
  onExportExcelSelected,
  onImportClick,
  onDownloadTemplate,
  isExporting = false,
  isImporting = false,
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showImportMenu, setShowImportMenu] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const hasBulkBar = selectedCount > 0;
  const hasMainToolbar = onSearchChange || filters || primaryAction || onExportExcel || onExportPdf || onImportClick || onDownloadTemplate;

  return (
    <div className="space-y-3">
      {/* ── Main toolbar ── */}
      {hasMainToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:px-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
        
        {/* Search */}
        {onSearchChange && (
          <div className="relative w-full sm:w-72 shrink-0">
            <div className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-400">
              <SearchIcon className="size-4" />
            </div>
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 text-sm bg-gray-50 border-gray-100 focus:bg-white focus:border-brand-400 dark:bg-gray-800/60 dark:border-white/[0.06] dark:focus:bg-gray-900 rounded-xl"
            />
          </div>
        )}

        {/* Filters and Actions wrapper */}
        <div className="flex flex-row flex-wrap items-center gap-3 flex-1 min-w-0">
          
          {/* Filters */}
          {filters && (
            <div className="flex flex-wrap gap-2 items-center flex-1 sm:flex-none">
              <div className="hidden sm:block h-7 w-px bg-gray-100 dark:bg-white/[0.06]" />
              {filters}
            </div>
          )}

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">

          {/* ── Mobile Combined Actions Menu ── */}
          {(onExportExcel || onExportPdf || onImportClick || onDownloadTemplate) && (
            <div className="relative sm:hidden">
              <button
                onClick={() => { setShowMobileMenu(v => !v); setShowExportMenu(false); setShowImportMenu(false); }}
                disabled={isExporting || isImporting}
                title="More Actions"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-600 transition-all hover:border-brand-300 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-50 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
              >
                {(isExporting || isImporting) ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                ) : (
                  <MoreDotIcon className="size-5" />
                )}
              </button>

              {showMobileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMobileMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-48 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-white/[0.07] dark:bg-gray-900">
                    
                    {/* Mobile Export Section */}
                    {(onExportExcel || onExportPdf) && (
                      <div className="mb-1 pb-1 border-b border-gray-100 dark:border-white/[0.05]">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Export
                        </div>
                        {selectedCount > 0 && onExportExcelSelected && (
                          <button
                            onClick={() => { onExportExcelSelected(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            <DownloadIcon className="size-3.5" /> Selected ({selectedCount})
                          </button>
                        )}
                        {onExportExcel && (
                          <button
                            onClick={() => { onExportExcel(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                          >
                            <svg className="size-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17l2-3-2-3h1.5l1.25 2L12 11h1.5l-2 3 2 3H12l-1.25-2L9.5 17H8z"/>
                            </svg>
                            Export Excel
                          </button>
                        )}
                        {onExportPdf && (
                          <button
                            onClick={() => { onExportPdf(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                          >
                            <svg className="size-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 6.5c0 .28-.22.5-.5.5H9v1.5a.5.5 0 01-1 0V14a.5.5 0 01.5-.5h1.5c.83 0 1.5.67 1.5 1.5zm4 1h-2v.5h1.5a.5.5 0 010 1H13v.5a.5.5 0 01-1 0V14a.5.5 0 01.5-.5H15a.5.5 0 010 1h-2V15h2a.5.5 0 010 1zm-7-.5h1v1H8v-1z"/>
                            </svg>
                            Export PDF
                          </button>
                        )}
                      </div>
                    )}

                    {/* Mobile Import Section */}
                    {(onImportClick || onDownloadTemplate) && (
                      <div className="pt-1">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Import
                        </div>
                        {onImportClick && (
                          <button
                            onClick={() => { onImportClick(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                          >
                            <svg className="size-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                            </svg>
                            Upload Excel file
                          </button>
                        )}
                        {onDownloadTemplate && (
                          <button
                            onClick={() => { onDownloadTemplate(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                          >
                            <svg className="size-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download template
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Desktop Export dropdown ── */}
          {(onExportExcel || onExportPdf) && (
            <div className="relative hidden sm:block">
              <button
                onClick={() => { setShowExportMenu(v => !v); setShowImportMenu(false); setShowMobileMenu(false); }}
                disabled={isExporting}
                title="Export"
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                {isExporting ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <DownloadIcon className="size-3.5" />
                )}
                <span className="hidden sm:inline">Export</span>
                <svg className="size-3 ml-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-52 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-white/[0.07] dark:bg-gray-900">
                    {selectedCount > 0 && onExportExcelSelected && (
                      <>
                        <button
                          onClick={() => { onExportExcelSelected(); setShowExportMenu(false); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                        >
                          <DownloadIcon className="size-3.5" />
                          Excel — {selectedCount} selected
                        </button>
                        <div className="my-1 border-t border-gray-100 dark:border-white/[0.05]" />
                      </>
                    )}
                    {onExportExcel && (
                      <button
                        onClick={() => { onExportExcel(); setShowExportMenu(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                      >
                        <svg className="size-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17l2-3-2-3h1.5l1.25 2L12 11h1.5l-2 3 2 3H12l-1.25-2L9.5 17H8z"/>
                        </svg>
                        Export all as Excel
                      </button>
                    )}
                    {onExportPdf && (
                      <button
                        onClick={() => { onExportPdf(); setShowExportMenu(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                      >
                        <svg className="size-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-2 6.5c0 .28-.22.5-.5.5H9v1.5a.5.5 0 01-1 0V14a.5.5 0 01.5-.5h1.5c.83 0 1.5.67 1.5 1.5zm4 1h-2v.5h1.5a.5.5 0 010 1H13v.5a.5.5 0 01-1 0V14a.5.5 0 01.5-.5H15a.5.5 0 010 1h-2V15h2a.5.5 0 010 1zm-7-.5h1v1H8v-1z"/>
                        </svg>
                        Export all as PDF
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Desktop Import dropdown ── */}
          {(onImportClick || onDownloadTemplate) && (
            <div className="relative hidden sm:block">
              <button
                onClick={() => { setShowImportMenu(v => !v); setShowExportMenu(false); setShowMobileMenu(false); }}
                disabled={isImporting}
                title="Import"
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                {isImporting ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                  </svg>
                )}
                <span className="hidden sm:inline">Import</span>
                <svg className="size-3 ml-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showImportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowImportMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-52 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-white/[0.07] dark:bg-gray-900">
                    {onImportClick && (
                      <button
                        onClick={() => { onImportClick(); setShowImportMenu(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                      >
                        <svg className="size-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                        </svg>
                        Upload Excel file
                      </button>
                    )}
                    {onDownloadTemplate && (
                      <button
                        onClick={() => { onDownloadTemplate(); setShowImportMenu(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                      >
                        <svg className="size-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download template
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

            {primaryAction && (
              <>
                <div className="hidden sm:block h-7 w-px bg-gray-100 dark:bg-white/[0.06]" />
                {primaryAction}
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Bulk-action bar ── */}
      {hasBulkBar && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-500/20 dark:bg-brand-500/10">
          <div className="flex items-center gap-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              {selectedCount}
            </span>
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  action.variant === "danger"
                    ? "border border-error-200 bg-white text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:bg-transparent dark:hover:bg-error-500/10"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}

            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="ml-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableToolbar;
