import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
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
} from "../atoms/Icons";
import { useSidebar } from "../../context/SidebarContext";
import SidebarWidget from "../molecules/SidebarWidget";
import { useLeaveSubmissions, useMyLeaveSubmissions } from "../../api/hooks/useLeaves";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; badge?: number }[];
};

import { useAuthStore } from "../../store/authStore";

const useNavItems = () => {
  const { user } = useAuthStore();
  
  // Helper to check if user has any of the specified roles
  const hasAnyRole = useCallback((rolesToCheck: string[]) => {
    // If no roles, return false
    if (!user) return false;

    const roleNames = [
        ...(user.roles?.map(r => r.name.toLowerCase()) || []),
        ...(user.userTypes?.map(t => t.toLowerCase()) || []),
        ...(user.typeAssignments?.map(t => t.userType?.name.toLowerCase() || "") || [])
    ].filter(Boolean);

    // ADMIN BYPASS REMOVED: Role checks should be literal to avoid side-effects (e.g., admin being seen as parent)
    
    return rolesToCheck.some(role => 
      roleNames.some(userRole => 
        userRole === role.toLowerCase() || userRole.includes(role.toLowerCase())
      )
    );
  }, [user]);

  // Determine user role flags
  const isStudent = hasAnyRole(['student']);
  const isTeacher = hasAnyRole(['teacher']);
  const isAdmin = hasAnyRole(['admin']);
  const isStaff = hasAnyRole(['staff']);
  const isParent = hasAnyRole(['parent']);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];

    // Dashboard - Visible for everyone
    items.push({
      icon: <GridIcon />,
      name: "Dashboard",
      path: "/",
    });

    // Attendance - Different menus for different roles
    // Logic: Admin is true for all.
    // We want Admin to see EVERYTHING.
    // If isAdmin is true, it enters multiple blocks potentially?
    // user.roles has 'admin', so isStudent=true, isTeacher=true via current hasAnyRole logic? 
    // Yes, above I made hasAnyRole return true if admin.
    // So if I am admin, isStudent=true, isTeacher=true.
    // This will cause duplication if I have "if isStudent ... else if isTeacher".
    // I need to structure this to show ALL options if Admin.

    // Better approach for Sidebar:
    // If Admin, show a consolidated view or just everything?
    // "make sure if admin show all the menu"
    
    // Let's rely on the variables but organize items nicely.
    
    // ATTENDANCE MENU
    const attendanceSubItems: { name: string; path: string; new?: boolean }[] = [];
    
    // 1. Personal Student Items - ONLY for Students (not Admins/Staff)
    if (isStudent && !isAdmin && !isStaff) { 
       attendanceSubItems.push(
         { name: "Subject Schedule", path: "/student/schedule/subject" },
         { name: "Weekly Schedule", path: "/student/schedule/weekly" },
         { name: "Attendance History", path: "/attendance/history" }
       );

       items.push({
         icon: <VideoIcon />,
         name: "Gate Scan",
         path: "/attendance/gate-scan",
       });

       items.push({
         icon: <ShootingStarIcon />,
         name: "My Events",
         path: "/student/events",
       });

       items.push({
         icon: <UserIcon />,
         name: "My ID Card",
         path: "/student/id-card",
       });

       items.push({
         icon: <DocsIcon />,
         name: "Leave Requests",
         path: "/student/leaves",
       });
    }
    
    // 2. Personal Teacher Items - ONLY for Teachers (not Admins/Staff)
    if (isTeacher && !isAdmin && !isStaff) {
      attendanceSubItems.push(
        { name: "My Schedule", path: "/attendance/my-schedule" }
      );
    }

    // 3. Operational & Management Attendance - Admin, Staff, and Teachers
    if (isAdmin || isStaff || isTeacher) {
       // Shared operational management
       attendanceSubItems.push(
         { name: "Teaching Sessions", path: "/attendance/teaching-sessions" },
         { name: "Subject Attendances", path: "/attendance/subject-attendances" }
       );
       
       // Admin & Staff specific management
       if (isAdmin || isStaff) {
         attendanceSubItems.push(
           { name: "Attendance Records", path: "/attendance/records" },
           { name: "Piket Monitor", path: "/attendance/piket" },
           { name: "Attendance History", path: "/attendance/history" }
         );

         items.push({
           icon: <VideoIcon />,
           name: "Gate Monitor",
           path: "/attendance/gate-scan",
         });
       }
    }

    // Remove duplicates based on path (since Admin might trigger allow on multiple blocks)
    const uniqueAttendanceSubItems = Array.from(new Map(attendanceSubItems.map(item => [item.path, item])).values());

    if (uniqueAttendanceSubItems.length > 0) {
      items.push({
         icon: <TimeIcon />,
         name: "Attendance",
         subItems: uniqueAttendanceSubItems
      });
    }

    // ACADEMIC (Teacher/Admin/Staff)
    if (isTeacher || isAdmin || isStaff) {
       const academicSubItems: { name: string; path: string }[] = [];
       // Admin/Staff/Teacher common
       if (isAdmin || isStaff || isTeacher) {
          // No specific items here? 
       }
       
       // Admin/Staff Only items
       if (isAdmin || isStaff) {
         academicSubItems.push(
           { name: "Academic Years", path: "/academic/years" },
           { name: "Students", path: "/academic/students" },
           { name: "Parents", path: "/academic/parents" }
         );
       }

       // Teacher only or shared? 
       // Classes is usually shared
       academicSubItems.push({ name: "Classes", path: "/academic/classes" });
       
       const uniqueAcademic = Array.from(new Map(academicSubItems.map(item => [item.path, item])).values());
       if (uniqueAcademic.length > 0) {
         items.push({
           icon: <UserIcon />, // Or Hat icon
           name: "Academic",
           subItems: uniqueAcademic
         });
       }
    }

    // HR (Admin/Staff)
    if (isAdmin || isStaff) {
       items.push({
         icon: <UserIcon />,
         name: "HR Management",
         subItems: [
           { name: "Employees", path: "/hr/employees" },
           { name: "Workload Contracts", path: "/academic/workload-contracts" }
         ]
       });
    }

    // Leave Requests & Types - Everyone except parents
    if (!isParent && (isAdmin || isTeacher || isStaff)) {
      const leaveSubItems: { name: string; path: string }[] = [
        { name: "Requests", path: "/leaves/requests" }
      ];

      if (isAdmin || isStaff) {
        leaveSubItems.push({ name: "Leave Types", path: "/leaves/types" });
      }

      items.push({
        icon: <DocsIcon />,
        name: "Leave Management",
        subItems: leaveSubItems
      });
    }

    // Events - Admin and Staff only
    if (isAdmin || isStaff) {
      items.push({
        icon: <ShootingStarIcon />,
        name: "Events",
        path: "/events",
      });
    }

    // My Profile
    items.push({
      icon: <UserIcon />,
      name: "My Profile",
      path: "/profile",
    });

    // Notifications - Everyone
    items.push({
      icon: <MailIcon />,
      name: "Notifications",
      path: "/notifications",
    });

    // Guests - Admin and Staff only
    if (isAdmin || isStaff) {
      items.push({
        icon: <UserIcon />,
        name: "Guests",
        subItems: [
          { name: "Guest List", path: "/guests" },
          { name: "Visitor Log", path: "/guests/visits" },
        ],
      });
    }

    // Scheduling - Admin, Teacher, Staff
    if (isAdmin || isTeacher || isStaff) {
      items.push({
        icon: <CalenderIcon />,
        name: "Scheduling",
        subItems: [
          ...(isAdmin || isStaff ? [{ name: "Teaching Assignments", path: "/academic/teaching-assignments" }] : []),
          ...(isAdmin || isTeacher || isStaff ? [{ name: "Class Schedules", path: "/academic/schedules" }] : []),
          ...(isAdmin || isTeacher || isStaff ? [{ name: "Work Rosters", path: "/schedules" }] : []),
        ],
      });
    }

    return items;
  }, [isStudent, isTeacher, isAdmin, isStaff, isParent]);

  return navItems;
};



const useOthersItems = () => {
  const { user } = useAuthStore();
  
  const hasAnyRole = useCallback((rolesToCheck: string[]) => {
    // If no roles, return false
    if (!user) return false;

    const roleNames = [
        ...(user.roles?.map(r => r.name.toLowerCase()) || []),
        ...(user.userTypes?.map(t => t.toLowerCase()) || []),
        ...(user.typeAssignments?.map(t => t.userType?.name.toLowerCase() || "") || [])
    ].filter(Boolean);

    // ADMIN BYPASS
    if (roleNames.some(r => r === 'admin' || r.includes('admin') || r === 'super admin')) {
      return true;
    }
    
    return rolesToCheck.some(role => 
      roleNames.some(userRole => 
        userRole === role.toLowerCase() || userRole.includes(role.toLowerCase())
      )
    );
  }, [user]);

  const isAdmin = hasAnyRole(['admin']);
  const isStaff = hasAnyRole(['staff']);
  const isTeacher = hasAnyRole(['teacher']);

  const othersItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];

    // Curriculum Setup - Admin, Teacher, Staff
    if (isAdmin || isTeacher || isStaff) {
      items.push({
        icon: <TableIcon />,
        name: "Curriculum Setup",
        subItems: [
          ...(isAdmin || isTeacher || isStaff ? [{ name: "Curriculum Explorer", path: "/academic/curriculum" }] : []),
          ...(isAdmin || isStaff ? [{ name: "Schedule Templates", path: "/academic/teaching-schedule-templates" }] : []),
          ...(isAdmin || isStaff ? [{ name: "Curriculum Wizard", path: "/academic/curriculum-wizard", new: true }] : []),
          ...(isAdmin || isStaff ? [{ name: "Workload Contracts", path: "/academic/workload-contracts" }] : []),
          ...(isAdmin || isStaff ? [{ name: "Schedule Overrides", path: "/academic/schedule-overrides" }] : []),
        ],
      });
    }

    // Facilities - Admin and Staff only
    if (isAdmin || isStaff) {
      items.push({
        icon: <PlugInIcon />,
        name: "Facilities",
        subItems: [
          { name: "Device Registry", path: "/devices" },
          ...(isAdmin ? [{ name: "Device Channels", path: "/identity/channels" }] : []),
          { name: "CCTV Monitor", path: "/devices/live" },
          { name: "Print ID Cards", path: "/users/print-ids" },
        ],
      });
    }

    // User Access - Admin only
    if (isAdmin) {
      items.push({
        icon: <LockIcon />,
        name: "User Access",
        subItems: [
          { name: "User Directory", path: "/users/list" },
          { name: "Access Roles", path: "/roles" },
          { name: "User Types", path: "/users/user-types" },
          { name: "Credentials", path: "/identity/credentials" },
        ],
      });
    }

    // Rules & Policies - Admin and Teacher
    if (isAdmin || isTeacher) {
      items.push({
        icon: <TaskIcon />,
        name: "Rules & Policies",
        subItems: [
          ...(isAdmin || isTeacher ? [{ name: "Classroom Command", path: "/teacher/classroom" }] : []),
          ...(isAdmin ? [{ name: "Attendance Policies", path: "/attendance/policies" }] : []),
          ...(isAdmin ? [{ name: "Teaching Unit Policies", path: "/academic/teaching-unit-policies" }] : []),
        ],
      });
    }

    // System Settings - Admin only
    if (isAdmin) {
      items.push({
        icon: <BoltIcon />,
        name: "System Settings",
        subItems: [
          { name: "General Settings", path: "/settings" },
          { name: "Notification Templates", path: "/admin/notification-templates" },
          { name: "Notification Settings", path: "/settings/notifications" },
          { name: "Identity Resolutions", path: "/identity/resolutions" },
        ],
      });
    }

    // Maintenance & Logs - Admin only
    if (isAdmin) {
      items.push({
        icon: <PieChartIcon />,
        name: "Maintenance & Logs",
        subItems: [
          { name: "System Metrics", path: "/audit/metrics" },
          { name: "Audit Logs", path: "/audit/logs" },
          { name: "Identity Logs", path: "/identity/logs" },
          { name: "Backups", path: "/settings/backups" },
        ],
      });
    }

    return items;
  }, [isAdmin, isStaff, isTeacher]);

  return othersItems;
};


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const navItems = useNavItems();
  const othersItems = useOthersItems();


  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  
  const { user } = useAuthStore();
  const isStudent = user?.userTypes?.some(t => t.toLowerCase().includes('student')) || 
                    user?.roles?.some(r => r.name.toLowerCase().includes('student'));

  const { data: pendingRequests } = useLeaveSubmissions({ 
    status: "pending", 
    limit: 1 
  }, { enabled: !isStudent });
  
  const { data: myPendingRequests } = useMyLeaveSubmissions({ 
    status: "pending", 
    limit: 1 
  }, { enabled: isStudent });

  const pendingCount = (pendingRequests as any)?.meta?.total || 0;
  const myPendingCount = (myPendingRequests as any)?.meta?.total || 0;

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
  }, [location, isActive, navItems, othersItems]); // Added othersItems to dependency

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
                        {subItem.path === "/student/leaves" && myPendingCount > 0 && (
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
                alt="Visia"
                width={42}
                height={42}
                className="rounded-xl"
              />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Visia
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
