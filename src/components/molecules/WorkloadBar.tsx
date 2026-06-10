import React from "react";

interface WorkloadBarProps {
  target: number;
  actual: number;
  className?: string;
  showLabels?: boolean;
}

const WorkloadBar: React.FC<WorkloadBarProps> = ({ 
  target, 
  actual, 
  className = "",
  showLabels = false
}) => {
  // Prevent division by zero
  const safeTarget = target > 0 ? target : 24; 
  const percentage = Math.min((actual / safeTarget) * 100, 100);
  
  // Determine color based on status
  // Green: Balanced (within small margin of target)
  // Yellow: Underload
  // Red: Overload (actual > target)
  
  // Logic from requirements:
  // Red: Actual > Target
  // Green: Actual == Target (allow small float margin if needed, but requirements say Equal)
  // Yellow: Actual < Target
  
  let colorClass = "bg-warning-500"; // Default Yellow
  if (actual > target) {
    colorClass = "bg-error-500";
  } else if (actual === target) {
    colorClass = "bg-success-500";
  } else {
    // Check if close enough to be considered "good" ? 
    // Requirement says: "Green: If actual is equal to target". "Yellow: If actual < target".
    // So distinct yellow for underload.
    colorClass = "bg-warning-500";
  }
  
  // Enhanced Logic: Dark Mode Support included via utility classes.
  
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
        {showLabels && (
            <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {Number(actual.toFixed(1))} JP <span className="text-gray-400 font-normal">/ {Number(target.toFixed(1))} JP</span>
                </span>
                <span className={`${
                    actual > target ? "text-error-500" : 
                    actual === target ? "text-success-500" : "text-warning-500"
                } font-bold`}>
                    {Math.round((actual/safeTarget)*100)}%
                </span>
            </div>
        )}
      
      {/* The Bar Container (Battery Shell) */}
      <div className="relative h-3 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        
        {/* The Target Marker Line (If we want to show it explicitly even if bar is lower) */}
        {/* Requirement: "Gray Background: Represents 100% of the Target." -> The container is the target capacity... wait.
            If target is dynamic, the container width represents 100% of target?
            "Reference Line: A small tick mark at the target value."
            If Actual > Target, does it overflow?
            "Filled Bar: Represents the Actual units."
            
            Interpretation:
            Container = Target Amount (100%).
            Filled = Actual Amount.
            If Actual > Target, it fills 100% + changes color to RED.
        */}
        
        <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
            style={{ width: `${percentage}%` }}
        />
        
        {/* Tick Mark for Target? 
            If container is 100% of target, the tick is at the end? 
            Or is the container a valid range (e.g. 0-30)?
            "Gray Background: Represents 100% of the Target."
            So logic holds: Container Width = Target.
        */}
      </div>
    </div>
  );
};

export default WorkloadBar;
