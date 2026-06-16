import React from "react";
import { motion } from "framer-motion";

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
        <div className={`w-full ${className}`}>
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar relative px-4 md:px-0">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`relative flex items-center gap-2 pb-3 pt-2 text-sm font-medium transition-colors whitespace-nowrap ${
                                isActive
                                    ? "text-brand-600 dark:text-brand-400"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            }`}
                        >
                            {tab.icon && (
                                <tab.icon 
                                    className={`size-4 ${isActive ? "text-brand-500" : "text-gray-400"}`} 
                                />
                            )}
                            {tab.label}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabUnderline"
                                    className="absolute left-0 right-0 bottom-0 h-0.5 bg-brand-500 rounded-t-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TabNavigation;
