import React from "react";

export type TabItem = {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
};

interface TabNavigationProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ 
    tabs, 
    activeTab, 
    onTabChange,
    className = ""
}) => {
    return (
        <div className={`bg-white dark:bg-gray-800 px-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                    >
                        {tab.icon && (
                            <tab.icon 
                                className={`size-4 ${activeTab === tab.id ? "text-brand-500" : "text-gray-400"}`} 
                            />
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TabNavigation;
