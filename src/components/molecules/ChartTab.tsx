import React, { useState } from "react";

const ChartTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Monthly");

  const tabs = ["Weekly", "Monthly", "Yearly"];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg dark:bg-gray-800">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            activeTab === tab
              ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default ChartTab;
