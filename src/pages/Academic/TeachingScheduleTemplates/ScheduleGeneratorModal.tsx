import React, { useState } from "react";
import Modal from "../../../components/molecules/Modal";
import DatePicker from "../../../components/molecules/DatePicker";
import { showSuccess, showError } from "../../../utils/toast";
import { academicService } from "../../../api/services/academicService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShootingStarIcon } from "../../../components/atoms/Icons";

interface ScheduleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  classSubjectId: number | string;
  subjectName: string;
  className: string;
}

const ScheduleGeneratorModal: React.FC<ScheduleGeneratorModalProps> = ({
  isOpen,
  onClose,
  classSubjectId,
  subjectName,
  className,
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: academicService.generateSchedules,
    onSuccess: (data) => {
      showSuccess(`Successfully generated ${data.generatedCount} sessions!`);
      // Invalidate relevant queries (e.g., if we were displaying sessions on this page, which we aren't yet, but good practice)
      queryClient.invalidateQueries({ queryKey: ["academic", "teaching-sessions"] });
      onClose();
    },
    onError: (error) => {
      showError(error, "Failed to generate schedule");
    },
  });

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      showError("Please select both start and end dates.");
      return;
    }
    
    generateMutation.mutate({
      classSubjectId,
      startDate,
      endDate,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Schedule"
      description="Create teaching sessions based on your weekly template."
      className="max-w-md"
      footer={
        <div className="flex justify-end gap-3 w-full">
            <button 
                onClick={onClose} 
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
                Cancel
            </button>
            <button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:from-brand-600 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {generateMutation.isPending ? (
                    <>Generating...</>
                ) : (
                    <>
                        <ShootingStarIcon className="size-4" />
                        Generate Now
                    </>
                )}
            </button>
        </div>
      }
    >
      <div className="space-y-5 py-2">
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 dark:bg-indigo-500/10 dark:border-indigo-500/20">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    You are generating schedules for <strong>{subjectName}</strong> in <strong>{className}</strong>.
                    Sessions will be created for days with defined templates within the selected range.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select start date"
                />
                <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Select end date"
                />
            </div>
      </div>
    </Modal>
  );
};

export default ScheduleGeneratorModal;
