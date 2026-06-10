import React, { useState } from "react";
import { useSearchParams } from "react-router";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import TabNavigation, { TabItem } from "../../../components/molecules/TabNavigation";

import {
  GridIcon,
  UserIcon,
  CalenderIcon,
} from "../../../components/atoms/Icons";

import GateTab from "./Tabs/GateTab";
import ClassTab from "./Tabs/ClassTab";
import EventTab from "./Tabs/EventTab";

type AttendanceTab = 'gate' | 'class' | 'event';

export default function AttendanceHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") as AttendanceTab || 'gate';

  const [activeTab, setActiveTab] = useState<AttendanceTab>(initialTab);

  const tabs: TabItem[] = [
    { id: 'gate', label: 'Gate Entry', icon: GridIcon },
    { id: 'class', label: 'Class/Subject', icon: CalenderIcon },
    { id: 'event', label: 'Events', icon: UserIcon },
  ];

  const handleTabChange = (id: string | number) => {
    const tabId = id as AttendanceTab;
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <>
      <PageMeta
        title="Attendance History | Visia"
        description="View comprehensive attendance history records."
      />
      <PageBreadcrumb pageTitle="Attendance History" />

      <div className="space-y-5 mb-10 md:mb-0">
        {/* Header - HIDDEN on mobile to match standard */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <CalenderIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Attendance History</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and track all attendance records across different types.</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Wrapper */}
        <div className="bg-transparent md:bg-white md:dark:bg-gray-800 md:rounded-2xl md:border md:border-gray-200 md:dark:border-white/5 md:shadow-sm md:p-6 overflow-hidden">
            {/* Sticky Header for Mobile */}
            <div className="sticky top-[64px] z-20 bg-gray-50 dark:bg-gray-900 pt-2 pb-2 md:static md:bg-transparent md:border-none md:pt-0 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            </div>

            <div className="mt-4 md:mt-6">
                {activeTab === 'gate' && <GateTab />}
                {activeTab === 'class' && <ClassTab />}
                {activeTab === 'event' && <EventTab />}
            </div>
        </div>
      </div>
    </>
  );
}
