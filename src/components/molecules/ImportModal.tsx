import React, { useRef, useState } from "react";
import Modal from "./Modal";
import Button from "../atoms/Button";
import { DownloadIcon, FileIcon, TrashBinIcon, CloseIcon } from "../atoms/Icons";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onDownloadTemplate?: (withData: boolean) => void;
  title?: string;
  isImporting?: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onDownloadTemplate,
  title = "Import Data",
  isImporting = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onImport(selectedFile);
    }
  };

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
    }
  }, [isOpen]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-md w-full"
      title={title}
      description="Upload an Excel file (.xlsx, .xls) to import."
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isImporting}
            isLoading={isImporting}
          >
            {isImporting ? "Importing..." : "Import Data"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {onDownloadTemplate && (
          <div className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Need the correct format?
              </p>
              <p className="text-xs text-brand-600/80 dark:text-brand-400/80">
                Download the template file first. You can download a blank template or one with your existing data to update it.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-white"
                onClick={() => onDownloadTemplate(false)}
                startIcon={<DownloadIcon className="size-3.5" />}
              >
                Blank Template
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-white"
                onClick={() => onDownloadTemplate(true)}
                startIcon={<DownloadIcon className="size-3.5" />}
              >
                With Data
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-8 transition-colors hover:border-brand-300 hover:bg-brand-50/30 dark:border-white/[0.08] dark:bg-white/[0.01] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-500">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to select file
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  .xlsx or .xls files only
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-brand-100 text-brand-500 dark:border-white/[0.05] dark:bg-white/[0.05] dark:text-brand-400">
                  <FileIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 pl-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-brand-600 dark:hover:bg-white/[0.05] dark:hover:text-brand-400 transition"
                  title="Change file"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={handleRemoveFile}
                  className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-500 transition"
                  title="Remove file"
                >
                  <TrashBinIcon className="size-4" />
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;
