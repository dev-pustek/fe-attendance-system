import { ClassLeaderboardItem } from "../../../api/types/dashboard";

interface ClassLeaderboardProps {
  leaderboard: ClassLeaderboardItem[];
}

export default function ClassLeaderboard({ leaderboard }: ClassLeaderboardProps) {
  return (
    <div className="col-span-12 xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Top Class Attendance
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
            <thead>
                <tr className="text-left">
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Rank</th>
                    <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Class Name</th>
                    <th className="pb-3 text-sm font-medium text-right text-gray-500 dark:text-gray-400">Count</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {leaderboard.map((item, index) => (
                    <tr key={index}>
                        <td className="py-3 text-sm text-gray-800 dark:text-white/90">
                            #{index + 1}
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                            {item.name}
                        </td>
                        <td className="py-3 text-sm font-bold text-right text-brand-500">
                            {item.count}
                        </td>
                    </tr>
                ))}
                {leaderboard.length === 0 && (
                     <tr>
                        <td colSpan={3} className="py-4 text-center text-sm text-gray-500">
                            No class data available today
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
