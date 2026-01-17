import { useAcademicYears } from "../../api/hooks/useAcademic";
import { CalenderIcon } from "../atoms/Icons";

export default function SidebarWidget() {
  const { data: academicYears, isLoading } = useAcademicYears({ isActive: true });

  const activeYear = academicYears?.data?.[0]; // academicYears.data is the array because it's paginated response (or unwrapped array)

  // Robustly determine the display text
  let displayText = "N/A";
  if (activeYear) {
      if (activeYear.code) {
          // If code is strictly YYYY/YYYY or similar, use it. Or just use it as is.
          displayText = `${activeYear.code}`;
      } else if (activeYear.startDate && activeYear.endDate) {
          const start = new Date(activeYear.startDate).getFullYear();
          const end = new Date(activeYear.endDate).getFullYear();
          if (!isNaN(start) && !isNaN(end)) {
             displayText = `${start}/${end}`;
          } else {
             displayText = activeYear.name || "Active Year";
          }
      } else {
          displayText = activeYear.name || "Active Year";
      }
  }

  return (
    <div
      className={`
        relative overflow-hidden mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-8 text-center shadow-lg dark:from-brand-600 dark:to-brand-700 min-h-[140px] flex flex-col justify-center`}
    >
      <div className="absolute -right-6 -top-6 opacity-10 rotate-12 pointer-events-none">
        <CalenderIcon className="size-24 text-white" />
      </div>

      {isLoading ? (
        <div className="animate-pulse flex flex-col items-center relative z-10">
           <div className="h-12 w-12 bg-white/20 rounded-lg mb-4"></div>
           <div className="h-4 w-24 bg-white/20 rounded mb-2"></div>
           <div className="h-8 w-32 bg-white/20 rounded"></div>
        </div>
      ) : activeYear ? (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
            <CalenderIcon className="size-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/80 uppercase tracking-widest mb-0.5">Active Year</span>
            <h3 className="text-2xl font-bold text-white tracking-tight leading-none">
                {displayText}
            </h3>
          </div>
        </div>
      ) : (
         <div className="relative z-10 flex flex-col items-center gap-2">
            <span className="text-sm text-white/70">No active year set</span>
         </div>
      )}
    </div>
  );
}
