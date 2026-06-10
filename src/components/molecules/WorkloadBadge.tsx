import React from "react";
import Badge from "../atoms/Badge";

interface WorkloadBadgeProps {
  status: "OVERLOAD" | "UNDERLOAD" | "BALANCED";
  balance: number; // e.g., -2 or +3
  className?: string;
}

const WorkloadBadge: React.FC<WorkloadBadgeProps> = ({ status, balance, className = "" }) => {
  // Logic: 
  // Overload: ⚠️ +3 JP Over (Red Pill)
  // Underload: 📉 Needs 4 JP (Yellow Pill)
  // Balanced: ✅ Perfect (Green Pill)
  
  if (status === "BALANCED") {
      return (
          <Badge color="success" className={className}>
              ✅ Perfect
          </Badge>
      );
  }
  
  if (status === "OVERLOAD") {
      return (
          <Badge color="error" className={className}>
              ⚠️ +{Number(Math.abs(balance).toFixed(1))} JP Over
          </Badge>
      );
  }
  
  if (status === "UNDERLOAD") {
      return (
          <Badge color="warning" className={className}>
              📉 Needs {Number(Math.abs(balance).toFixed(1))} JP
          </Badge>
      );
  }
  
  return null;
};

export default WorkloadBadge;
