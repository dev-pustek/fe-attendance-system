import React from "react";
import { LeaveApproval } from "../../../api/types/leave";
import Badge from "../../atoms/Badge";
import { CheckCircleIcon, CloseIcon, InfoIcon } from "../../atoms/Icons";

interface ApprovalHistoryTimelineProps {
  approvals: LeaveApproval[];
}

const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({ approvals }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Sort approvals by level to show the progression
  const sortedApprovals = [...approvals].sort((a, b) => a.approvalLevel - b.approvalLevel);

  if (sortedApprovals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-gray-100 rounded-xl dark:border-gray-800">
          <InfoIcon className="mb-2 size-5 text-gray-300 dark:text-gray-600" />
          <p className="text-xs font-medium text-gray-400">No approval tracking data available.</p>
        </div>
      );
  }

  return (
    <div className="relative space-y-0 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-12px)] before:w-[2px] before:bg-gray-100 dark:before:bg-white/[0.05]">
        {sortedApprovals.map((approval) => {
          const isApproved = approval.status === "approved";
          const isRejected = approval.status === "rejected";

          return (
            <div key={approval.id} className="relative pb-6 pl-8 last:pb-0">
              {/* Timeline Indicator */}
              <div
                className={`absolute left-0 top-1 z-10 flex size-6 items-center justify-center rounded-full border-2 border-white shadow-sm transition-all dark:border-gray-900 ${
                  isApproved
                    ? "bg-green-500 text-white"
                    : isRejected
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {isApproved ? (
                  <CheckCircleIcon className="size-3.5" />
                ) : isRejected ? (
                  <CloseIcon className="size-3" />
                ) : (
                  <span className="text-[10px] font-bold">{approval.approvalLevel}</span>
                )}
              </div>

              {/* Content Card */}
              <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Level {approval.approvalLevel}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {approval.approver?.name || "System Review"}
                        </h4>
                     </div>
                     <span className="text-[10px] text-gray-400 font-mono">
                         {approval.status !== 'pending' ? formatDate(approval.approvedAt || approval.createdAt) : 'Pending'}
                     </span>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4">
                       <div className="text-xs text-gray-500 dark:text-gray-400">
                           {approval.approver?.email}
                       </div>
                       <Badge
                            color={isApproved ? "success" : isRejected ? "error" : "warning"}
                            className="capitalize text-[10px] py-0.5 px-2 h-5"
                        >
                            {approval.status.replace("_", " ")}
                        </Badge>
                  </div>

                {approval.comments && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-white/[0.03] p-2 rounded-lg border border-gray-100 dark:border-white/[0.05]">
                    "{approval.comments}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ApprovalHistoryTimeline;
