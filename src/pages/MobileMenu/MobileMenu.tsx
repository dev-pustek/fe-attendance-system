import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../../components/atoms/PageMeta";
import { useAppMenu } from "../../hooks/useAppMenu";
import { ChevronDownIcon } from "../../components/atoms/Icons";
import { ChevronRightIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "../../store/authStore";
import { showSuccess } from "../../utils/toast";

const EXCLUDED_PATHS = [
  "/", // Beranda
  "/attendance/gate-scan", // Absen
  "/leaves/requests", // Izin
  "/student/schedule/weekly", // Jadwal
];

const MobileMenu: React.FC = () => {
  const { navGroups } = useAppMenu();
  const { user, logout } = useAuthStore();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showSuccess("Logged out successfully. See you soon!");
    navigate("/signin");
  };

  // Filter out the excluded paths
  const filteredGroups = navGroups.map(group => {
    const newItems = group.items.map(item => {
      // Filter subitems
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(sub => !EXCLUDED_PATHS.includes(sub.path));
        return { ...item, subItems: filteredSubItems };
      }
      return item;
    }).filter(item => {
      // If it's a direct link and in excluded paths, remove it
      if (item.path && EXCLUDED_PATHS.includes(item.path)) return false;
      // If it has subitems, only keep if it still has subitems after filtering
      if (item.subItems && item.subItems.length === 0) return false;
      return true;
    });

    return { ...group, items: newItems };
  }).filter(group => group.items.length > 0);

  const toggleAccordion = (name: string) => {
    setOpenGroup(prev => prev === name ? null : name);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 font-sans animate-in fade-in duration-500">
      <PageMeta title="Menu | SIAPUS" description="SIAPUS Main Menu" />
      
      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-100 dark:border-white/5 pt-6 pb-4 px-6 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Menu Lainnya</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Eksplorasi fitur SIAPUS</p>
      </div>

      {/* ── Content ── */}
      <div className="py-6 space-y-8">
        {filteredGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <h2 className="px-6 mb-2 text-xs font-bold tracking-widest text-brand-500 dark:text-brand-400 uppercase">
              {group.label}
            </h2>
            
            <div className="bg-white dark:bg-slate-800 border-y border-gray-100 dark:border-white/5 flex flex-col">
              {group.items.map((item, iIdx) => {
                const isLast = iIdx === group.items.length - 1;
                const hasSub = item.subItems && item.subItems.length > 0;
                const isOpen = openGroup === item.name;

                return (
                  <div key={iIdx} className={`${!isLast ? 'border-b border-gray-100 dark:border-white/5' : ''}`}>
                    {/* Item Row */}
                    {hasSub ? (
                      <button 
                        onClick={() => toggleAccordion(item.name)}
                        className="w-full flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors active:bg-gray-100 dark:active:bg-slate-700"
                      >
                        <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center shrink-0 shadow-sm border border-brand-100 dark:border-brand-500/20">
                          <span className="w-4 h-4">{item.icon}</span>
                        </div>
                        <span className="ml-4 font-bold text-sm text-gray-900 dark:text-white">{item.name}</span>
                        <ChevronDownIcon 
                          className={`ml-auto w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} 
                        />
                      </button>
                    ) : (
                      <Link 
                        to={item.path || "#"} 
                        className="flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors active:bg-gray-100 dark:active:bg-slate-700"
                      >
                        <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center shrink-0 shadow-sm border border-brand-100 dark:border-brand-500/20">
                          <span className="w-4 h-4">{item.icon}</span>
                        </div>
                        <span className="ml-4 font-bold text-sm text-gray-900 dark:text-white">{item.name}</span>
                      </Link>
                    )}

                    {/* Sub Items Accordion */}
                    {hasSub && (
                      <div 
                        className={`overflow-hidden transition-all duration-300 bg-gray-50/30 dark:bg-slate-800/30 ${isOpen ? 'max-h-[800px]' : 'max-h-0'}`}
                      >
                        <div className="flex flex-col">
                          {item.subItems!.map((sub, sIdx) => (
                            <Link 
                              key={sIdx} 
                              to={sub.path}
                              className="flex items-center px-6 py-4 pl-16 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-t border-gray-100 dark:border-white/5 active:bg-gray-100 dark:active:bg-slate-700"
                            >
                              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{sub.name}</span>
                              
                              <div className="ml-auto flex items-center gap-3">
                                {sub.new && <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm">New</span>}
                                {sub.pro && <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm">Pro</span>}
                                <ChevronRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-500" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Profile Quick Link at bottom just in case */}
        <div className="px-6 pt-4 pb-2">
          <Link to="/profile" className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors active:scale-95 duration-200">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
               <img src={user?.photo || "https://i.pravatar.cc/150"} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{user?.name || "User"}</h3>
              <p className="text-xs font-semibold text-brand-500">Lihat profil Anda</p>
            </div>
            <div className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-white/5">
               <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Logout Button */}
        <div className="px-6 pb-8">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-500/20 font-bold active:scale-95 transition-transform"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Keluar Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
