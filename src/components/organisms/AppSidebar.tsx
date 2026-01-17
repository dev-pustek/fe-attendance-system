import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  ChevronDownIcon,
  GridIcon,
  GroupIcon,
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
} from "../atoms/Icons";
import { useSidebar } from "../../context/SidebarContext";
import SidebarWidget from "../molecules/SidebarWidget";
import { useLeaveSubmissions } from "../../api/hooks/useLeaves";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; badge?: number }[];
};

import { useAuthStore } from "../../store/authStore";

const useNavItems = () => {
  const { user } = useAuthStore();
  
  // Robust check for student role
  const isStudent = user?.userTypes?.some(t => t.toLowerCase() === 'student') 
        || (user?.profile?.nis && user?.profile?.nis.length > 0)
        || user?.userTypes?.includes('Student');

  const navItems: NavItem[] = useMemo(() => [
    {
      icon: <GridIcon />,
      name: "Dashboard",
      subItems: [
        { name: "Overview", path: "/" },
        { name: "Calendar", path: "/calendar" },
      ],
    },
    // Hide School Management for Students (Optional, but good practice)
    ...(isStudent ? [] : [{
      icon: <GroupIcon />,
      name: "School Management",
      subItems: [
        { name: "Academic Years", path: "/academic/years" },
        { name: "Employees", path: "/hr/employees" },
        { name: "Students", path: "/academic/students" },
        { name: "Classes", path: "/academic/classes" },
      ],
    }]),
    {
      icon: <TimeIcon />,
      name: "Attendance",
      subItems: [
        // Show simplified menu for students
        ...(isStudent ? [
             { name: "My Schedule", path: "/student/my-schedule" },
             { name: "Attendance Records", path: "/attendance/records" }, // Assuming they can see their own records here
        ] : [
             { name: "Live Records", path: "/attendance/records" },
             { name: "Piket Monitor", path: "/attendance/piket", new: true },
             { name: "Attendance History", path: "/attendance/history" },
             { name: "Gate Scanner", path: "/attendance/gate-scan" },
             { name: "Teaching Sessions", path: "/attendance/teaching-sessions" },
             { name: "Subject Attendance", path: "/attendance/subject-attendances" },
             { name: "My Schedule", path: "/attendance/my-schedule" },
        ]),
      ],
    },
    // ... Add other conditional logic as needed
      {
    icon: <DocsIcon />,
    name: "Leave Requests",
    path: "/leaves/requests",
  },
  {
    icon: <ShootingStarIcon />,
    name: "Events",
    path: "/events",
  },
  {
    icon: <MailIcon />,
    name: "Notifications",
    path: "/notifications",
  },
  {
    icon: <UserIcon />,
    name: "Guests",
    subItems: [
      { name: "Guest List", path: "/guests" },
      { name: "Visitor Log", path: "/guests/visits" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Scheduling",
    subItems: [
      { name: "Teaching Assignments", path: "/academic/teaching-assignments" },
      { name: "Class Schedules", path: "/academic/schedules" },
      { name: "Work Rosters", path: "/schedules" },
    ],
  },
  ], [isStudent]);

  return navItems;
};

const othersItems: NavItem[] = [
  {
    icon: <TableIcon />,
    name: "Curriculum Setup",
    subItems: [
      { name: "Curriculum Explorer", path: "/academic/curriculum" },
      // { name: "Grades", path: "/academic/grades" },
      { name: "Schedule Templates", path: "/academic/teaching-schedule-templates" },
      { name: "Curriculum Wizard", path: "/academic/curriculum-wizard", new: true },
      { name: "Workload Contracts", path: "/academic/workload-contracts" },
      { name: "Schedule Overrides", path: "/academic/schedule-overrides" },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Facilities",
    subItems: [
      { name: "Device Registry", path: "/devices" },
      { name: "Device Channels", path: "/identity/channels" },
      { name: "CCTV Monitor", path: "/devices/live" },
      { name: "Print ID Cards", path: "/users/print-ids" },
    ],
  },
  {
    icon: <LockIcon />,
    name: "User Access",
    subItems: [
      { name: "User Directory", path: "/users/list" },
      { name: "Access Roles", path: "/roles" },
      { name: "User Types", path: "/users/user-types" },
      { name: "Credentials", path: "/identity/credentials" },
    ],
  },
  {
    icon: <TaskIcon />,
    name: "Rules & Policies",
    subItems: [
      { name: "Classroom Command", path: "/teacher/classroom" },
      { name: "Attendance Policies", path: "/attendance/policies" },
      { name: "Teaching Unit Policies", path: "/academic/teaching-unit-policies" },
    ],
  },
  {
    icon: <BoltIcon />,
    name: "System Settings",
    subItems: [
      { name: "General Settings", path: "/settings" },
      { name: "Notification Templates", path: "/admin/notification-templates" },
      { name: "Notification Settings", path: "/settings/notifications" },
      { name: "Identity Resolutions", path: "/identity/resolutions" },
    ],
  },
  {
    icon: <PieChartIcon />,
    name: "Maintenance & Logs",
    subItems: [
      { name: "System Metrics", path: "/audit/metrics" },
      { name: "Audit Logs", path: "/audit/logs" },
      { name: "Identity Logs", path: "/identity/logs" },
      { name: "Backups", path: "/settings/backups" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const navItems = useNavItems();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  
  const { data: pendingRequests } = useLeaveSubmissions({ status: "pending", limit: 1 });
  const pendingCount = pendingRequests?.meta?.total || 0;

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                        {subItem.path === "/leaves/requests" && pendingCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                             {pendingCount > 99 ? "99+" : pendingCount}
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
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/" className="flex items-center justify-center">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <img
                src="/logo-pwa.png"
                alt="Sistem Absen"
                width={42}
                height={42}
                className="rounded-xl shadow-lg shadow-brand-500/10"
              />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Sistem Absen
              </span>
            </div>
          ) : (
            <img
              src="/logo-pwa.png"
              alt="Logo"
              width={36}
              height={36}
              className="rounded-lg shadow-md"
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
