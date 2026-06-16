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
    { id: 'gate', label: 'Akses Gerbang', icon: GridIcon },
    { id: 'class', label: 'Kelas/Pelajaran', icon: CalenderIcon },
    { id: 'event', label: 'Kegiatan', icon: UserIcon },
  ];

  const handleTabChange = (id: string | number) => {
    const tabId = id as AttendanceTab;
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <>
      <div className="hidden md:block">
        <PageMeta
          title="Riwayat Kehadiran | SIAPUS"
          description="Lihat catatan riwayat kehadiran komprehensif."
        />
        <PageBreadcrumb pageTitle="Riwayat Kehadiran" />
      </div>

      <div className="relative flex flex-col md:h-[calc(100vh-250px)] md:min-h-[600px] max-w-7xl -m-4 md:m-0 md:mx-auto md:pb-20 pb-24">
         <div className="flex-1 w-full relative min-w-0">
             <div className="md:space-y-6 w-full h-full flex flex-col">
                  
                  {/* Main Panel Wrapper */}
                  <div className="bg-white dark:bg-transparent md:dark:bg-white/[0.02] md:border border-gray-100 dark:border-white/5 md:rounded-2xl md:shadow-sm flex flex-col min-w-0 w-full max-w-full flex-1 min-h-[calc(100vh-80px)] md:min-h-0">
                      
                      {/* Header Section (Hidden on mobile) */}
                      <div className="hidden md:block p-6 pb-6 relative border-b border-gray-100 dark:border-white/5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                                <CalenderIcon className="size-5" />
                              </div>
                              <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Riwayat Kehadiran</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Lihat dan pantau semua riwayat kehadiran dari berbagai kategori.</p>
                              </div>
                            </div>
                          </div>
                      </div>

                      {/* Sticky Header for Mobile Tab Navigation */}
                      <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0B0F]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 pt-2 md:static md:bg-transparent md:pt-4 md:px-6">
                          <TabNavigation
                              tabs={tabs}
                              activeTab={activeTab}
                              onTabChange={handleTabChange}
                          />
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 bg-white dark:bg-transparent min-w-0 overflow-hidden flex flex-col">
                          <div className="mt-4 md:mt-0 p-4 md:p-6 flex-1 w-full flex flex-col overflow-y-auto no-scrollbar">
                              {activeTab === 'gate' && <GateTab />}
                              {activeTab === 'class' && <ClassTab />}
                              {activeTab === 'event' && <EventTab />}
                          </div>
                      </div>
                      
                  </div>
             </div>
         </div>
      </div>
    </>
  );
}
