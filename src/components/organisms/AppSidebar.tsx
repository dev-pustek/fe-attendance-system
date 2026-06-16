import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router";

import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  PlugInIcon,
  TableIcon,
  BoltIcon,
  TimeIcon,
  CalenderIcon,
  DocsIcon,
  LockIcon,
  ShootingStarIcon,
  TaskIcon,
  UserIcon,
  PieChartIcon,
  MailIcon,
  VideoIcon,
  ListIcon,
} from "../atoms/Icons";
import { useSidebar } from "../../context/SidebarContext";
import SidebarWidget from "../molecules/SidebarWidget";
import { useLeaveSubmissions, useMyLeaveSubmissions } from "../../api/hooks/useLeaves";
import { useAuthStore } from "../../store/authStore";

import { useAppMenu, NavItem, SubItem, NavGroup } from "../../hooks/useAppMenu";
// ─── Sidebar component ────────────────────────────────────────────────────────
const AppSidebar: React.FC = () => {
  const { isExpanded, isHovered, setIsHovered, isMobileOpen } = useSidebar();
  const isVisible = isExpanded || isHovered || isMobileOpen;
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<{ groupIdx: number; itemIdx: number } | null>(null);

  const { navGroups, isStudent } = useAppMenu();

  const { data: pendingRequests } = useLeaveSubmissions(
    { status: "pending", limit: 1 },
    { enabled: !isStudent }
  );
  const { data: myPendingRequests } = useMyLeaveSubmissions(
    { status: "pending", limit: 1 },
    { enabled: isStudent }
  );

  const pendingCount = (pendingRequests as any)?.meta?.total || 0;
  const myPendingCount = (myPendingRequests as any)?.meta?.total || 0;

  const subMenuHeights = useRef<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [, forceUpdate] = useState(0);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Auto-open the submenu that contains the current route
  useEffect(() => {
    let matched = false;
    navGroups.forEach((group, gIdx) => {
      group.items.forEach((item, iIdx) => {
        if (item.subItems?.some((sub) => isActive(sub.path))) {
          setOpenSubmenu({ groupIdx: gIdx, itemIdx: iIdx });
          matched = true;
        }
      });
    });
    if (!matched) setOpenSubmenu(null);
  }, [location.pathname, isActive]);

  // Measure height for smooth animation
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.groupIdx}-${openSubmenu.itemIdx}`;
      const el = subMenuRefs.current[key];
      if (el) {
        subMenuHeights.current[key] = el.scrollHeight;
        forceUpdate((n) => n + 1);
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (groupIdx: number, itemIdx: number) => {
    setOpenSubmenu((prev) => {
      if (prev?.groupIdx === groupIdx && prev?.itemIdx === itemIdx) return null;
      return { groupIdx, itemIdx };
    });
  };

  const renderItem = (item: NavItem, groupIdx: number, itemIdx: number) => {
    const key = `${groupIdx}-${itemIdx}`;
    const isOpen = openSubmenu?.groupIdx === groupIdx && openSubmenu?.itemIdx === itemIdx;

    if (item.subItems) {
      return (
        <li key={item.name}>
          <button
            onClick={() => handleSubmenuToggle(groupIdx, itemIdx)}
            className={`menu-item group ${isOpen ? "menu-item-active" : "menu-item-inactive"} cursor-pointer ${
              !isVisible ? "lg:justify-center" : "lg:justify-start"
            }`}
          >
            <span className={`menu-item-icon-size ${isOpen ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
              {item.icon}
            </span>
            {isVisible && <span className="menu-item-text">{item.name}</span>}
            {isVisible && (
              <ChevronDownIcon
                className={`ml-auto w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-500" : ""}`}
              />
            )}
          </button>

          {isVisible && (
            <div
              ref={(el) => { subMenuRefs.current[key] = el; }}
              className="overflow-hidden transition-all duration-300"
              style={{ height: isOpen ? `${subMenuHeights.current[key] || 0}px` : "0px" }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {item.subItems.map((sub) => (
                  <li key={sub.path}>
                    <Link
                      to={sub.path}
                      className={`menu-dropdown-item ${
                        isActive(sub.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {sub.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {sub.new && (
                          <span className={`ml-auto ${isActive(sub.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
                            new
                          </span>
                        )}
                        {sub.pro && (
                          <span className={`ml-auto ${isActive(sub.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
                            pro
                          </span>
                        )}
                        {sub.path === "/leaves/requests" && pendingCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                            {pendingCount > 99 ? "99+" : pendingCount}
                          </span>
                        )}
                        {sub.path === "/student/leaves" && myPendingCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                            {myPendingCount > 99 ? "99+" : myPendingCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      );
    }

    if (item.path) {
      return (
        <li key={item.name}>
          <Link
            to={item.path}
            className={`menu-item group ${isActive(item.path) ? "menu-item-active" : "menu-item-inactive"}`}
          >
            <span className={`menu-item-icon-size ${isActive(item.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
              {item.icon}
            </span>
            {isVisible && <span className="menu-item-text">{item.name}</span>}
          </Link>
        </li>
      );
    }

    return null;
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-8 flex ${!isVisible ? "lg:justify-center" : "justify-start"}`}>
        <Link to="/" className="flex items-center justify-center">
          {isVisible ? (
            <div className="flex items-center gap-3">
              <img src="/logo-pwa.png" alt="SIAPUS" width={42} height={42} className="rounded-xl" />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">SIAPUS</span>
            </div>
          ) : (
            <img src="/logo-pwa.png" alt="Logo" width={36} height={36} className="rounded-lg shadow-md" />
          )}
        </Link>
      </div>

      {/* Nav */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {navGroups.map((group, gIdx) => (
              <div key={group.label}>
                {/* Section label */}
                <h2
                  className={`mb-3 flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 ${
                    !isVisible ? "lg:justify-center" : "justify-start px-1"
                  }`}
                >
                  {isVisible ? (
                    group.label
                  ) : (
                    <HorizontaLDots className="size-5" />
                  )}
                </h2>
                <ul className="flex flex-col gap-1">
                  {group.items.map((item, iIdx) => renderItem(item, gIdx, iIdx))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {isVisible && <SidebarWidget />}
      </div>
    </aside>
  );
};

export default AppSidebar;
