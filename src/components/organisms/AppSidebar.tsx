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

// ─── Types ────────────────────────────────────────────────────────────────────
type SubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  badge?: number;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

type NavGroup = {
  label: string;           // section heading shown in sidebar
  collapsedDot?: boolean;  // show dots when collapsed
  items: NavItem[];
};

// ─── Role hook ────────────────────────────────────────────────────────────────
const useRoles = () => {
  const { user } = useAuthStore();

  const hasAnyRole = useCallback(
    (rolesToCheck: string[]) => {
      if (!user) return false;
      const roleNames = [
        ...(user.roles?.map((r) => r.name.toLowerCase()) || []),
        ...(user.userTypes?.map((t) => t.toLowerCase()) || []),
        ...(user.typeAssignments?.map((t) => t.userType?.name.toLowerCase() || "") || []),
      ].filter(Boolean);
      return rolesToCheck.some((role) =>
        roleNames.some(
          (userRole) =>
            userRole === role.toLowerCase() || userRole.includes(role.toLowerCase())
        )
      );
    },
    [user]
  );

  const isStudent = hasAnyRole(["student"]);
  const isTeacher = hasAnyRole(["teacher"]);
  // Admin bypass: if any admin role, grant everything
  const isAdmin = (() => {
    if (!user) return false;
    const roleNames = [
      ...(user.roles?.map((r) => r.name.toLowerCase()) || []),
      ...(user.userTypes?.map((t) => t.toLowerCase()) || []),
      ...(user.typeAssignments?.map((t) => t.userType?.name.toLowerCase() || "") || []),
    ].filter(Boolean);
    return roleNames.some((r) => r === "admin" || r.includes("admin") || r === "super admin");
  })();
  const isStaff = hasAnyRole(["staff"]);
  const isParent = hasAnyRole(["parent"]);

  return { isStudent, isTeacher, isAdmin, isStaff, isParent };
};

// ─── Nav groups builder ───────────────────────────────────────────────────────
const useNavGroups = (): NavGroup[] => {
  const { isStudent, isTeacher, isAdmin, isStaff } = useRoles();

  return useMemo(() => {
    const groups: NavGroup[] = [];

    // ══════════════════════════════════════════════════════════════════════════
    //  1. OVERVIEW
    //     Visible to everyone — home base of the app
    // ══════════════════════════════════════════════════════════════════════════
    const overviewItems: NavItem[] = [
      { icon: <GridIcon />, name: "Dashboard", path: "/" },
    ];

    if (isStudent && !isAdmin && !isStaff) {
      overviewItems.push({ icon: <UserIcon />, name: "My Profile", path: "/profile" });
      overviewItems.push({ icon: <MailIcon />, name: "Notifications", path: "/notifications" });
      overviewItems.push({ icon: <UserIcon />, name: "My ID Card", path: "/student/id-card" });
    } else {
      overviewItems.push({ icon: <UserIcon />, name: "My Profile", path: "/profile" });
      overviewItems.push({ icon: <MailIcon />, name: "Notifications", path: "/notifications" });
    }

    groups.push({ label: "Overview", items: overviewItems });

    // ══════════════════════════════════════════════════════════════════════════
    //  2. ATTENDANCE
    //     Everything related to checking-in, tracking, and monitoring presence
    // ══════════════════════════════════════════════════════════════════════════
    const attendanceItems: NavItem[] = [];

    // Student personal
    if (isStudent && !isAdmin && !isStaff) {
      attendanceItems.push(
        { icon: <VideoIcon />, name: "Absen Kehadiran", path: "/attendance/gate-scan" },
        {
          icon: <TimeIcon />,
          name: "My Attendance",
          subItems: [
            { name: "Attendance History", path: "/attendance/history" },
          ],
        }
      );
    }

    // Teacher personal
    if (isTeacher) {
      attendanceItems.push(
        {
          icon: <CalenderIcon />,
          name: "My Schedule",
          path: "/attendance/my-schedule",
        }
      );
    }

    // Admin / Staff / Teacher operational
    if (isAdmin || isStaff || isTeacher) {
      if (isAdmin || isStaff) {
        attendanceItems.push({
          icon: <VideoIcon />,
          name: "Absen Kehadiran",
          path: "/attendance/gate-scan",
        });
        attendanceItems.push({
          icon: <TimeIcon />,
          name: "Gate Attendance",
          subItems: [
            { name: "Piket Monitor", path: "/attendance/piket" },
            { name: "Attendance Records", path: "/attendance/records" },
            { name: "Attendance History", path: "/attendance/history" },
          ],
        });
      }

      attendanceItems.push({
        icon: <TableIcon />,
        name: "Subject Attendance",
        subItems: [
          { name: "Teaching Sessions", path: "/attendance/teaching-sessions" },
          { name: "Subject Attendances", path: "/attendance/subject-attendances" },
        ],
      });
    }

    if (attendanceItems.length > 0) {
      groups.push({ label: "Attendance", items: attendanceItems });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  3. ACADEMIC
    //     Student data, class management, curriculum, scheduling
    // ══════════════════════════════════════════════════════════════════════════
    const academicItems: NavItem[] = [];

    if (isStudent && !isAdmin && !isStaff) {
      academicItems.push(
        { icon: <CalenderIcon />, name: "My Schedule", subItems: [
          { name: "Subject Schedule", path: "/student/schedule/subject" },
          { name: "Weekly Schedule", path: "/student/schedule/weekly" },
        ]},
        { icon: <ShootingStarIcon />, name: "My Events", path: "/student/events" }
      );
    }

    if (isAdmin || isStaff || isTeacher) {
      if (isAdmin || isStaff) {
        academicItems.push({
          icon: <UserIcon />,
          name: "Student Management",
          subItems: [
            { name: "Students", path: "/academic/students" },
            { name: "Parents", path: "/academic/parents" },
            { name: "Academic Years", path: "/academic/years" },
          ],
        });
      }

      academicItems.push({
        icon: <TableIcon />,
        name: "Classes",
        subItems: [
          { name: "Class List", path: "/academic/classes" },
          { name: "Enrollments", path: "/academic/enrollments" },
          { name: "Class Promotion", path: "/academic/class-promotion", new: true },
        ],
      });

      academicItems.push({
        icon: <CalenderIcon />,
        name: "Scheduling",
        subItems: [
          ...(isAdmin || isStaff ? [{ name: "Teaching Assignments", path: "/academic/teaching-assignments" }] : []),
          { name: "Class Schedules", path: "/academic/schedules" },
          { name: "Work Rosters", path: "/schedules" },
        ],
      });

      academicItems.push({
        icon: <DocsIcon />,
        name: "Curriculum",
        subItems: [
          { name: "Curriculum Explorer", path: "/academic/curriculum" },
          ...(isAdmin || isStaff
            ? [
                { name: "Curriculum Wizard", path: "/academic/curriculum-wizard", new: true },
                { name: "Schedule Templates", path: "/academic/teaching-schedule-templates" },
                { name: "Workload Contracts", path: "/academic/workload-contracts" },
                { name: "Schedule Overrides", path: "/academic/schedule-overrides" },
              ]
            : []),
        ],
      });

      if (isAdmin || isStaff || isTeacher) {
        academicItems.push({ icon: <ShootingStarIcon />, name: "Events", path: "/events" });
      }
    }

    if (academicItems.length > 0) {
      groups.push({ label: "Academic", items: academicItems });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  4. HR & LEAVES
    //     Employees, workload, leave requests
    // ══════════════════════════════════════════════════════════════════════════
    const hrItems: NavItem[] = [];

    if (isAdmin || isStaff) {
      hrItems.push({
        icon: <UserIcon />,
        name: "Employees",
        subItems: [
          { name: "Employee List", path: "/hr/employees" },
        ],
      });
    }

    if (isAdmin || isStaff || isTeacher) {
      const leaveSubItems: SubItem[] = [
        { name: "Leave Requests", path: "/leaves/requests" },
      ];
      if (isAdmin || isStaff) {
        leaveSubItems.push({ name: "Leave Types", path: "/leaves/types" });
      }
      hrItems.push({ icon: <DocsIcon />, name: "Leave Management", subItems: leaveSubItems });
    }

    // Student leaves
    if (isStudent && !isAdmin && !isStaff) {
      hrItems.push({ icon: <DocsIcon />, name: "Leave Requests", path: "/student/leaves" });
    }

    if (hrItems.length > 0) {
      groups.push({ label: "HR & Leaves", items: hrItems });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  5. ADMIN TOOLS
    //     Policies, access control, facilities, guests — Admin/Staff only
    // ══════════════════════════════════════════════════════════════════════════
    const adminItems: NavItem[] = [];

    if (isAdmin || isTeacher) {
      adminItems.push({
        icon: <TaskIcon />,
        name: "Rules & Policies",
        subItems: [
          { name: "Classroom Command", path: "/teacher/classroom" },
          ...(isAdmin
            ? [
                { name: "Attendance Policies", path: "/attendance/policies" },
                { name: "Teaching Unit Policies", path: "/academic/teaching-unit-policies" },
              ]
            : []),
        ],
      });
    }

    if (isAdmin || isStaff) {
      adminItems.push(
        {
          icon: <UserIcon />,
          name: "Guests",
          subItems: [
            { name: "Guest List", path: "/guests" },
            { name: "Visitor Log", path: "/guests/visits" },
          ],
        },
        {
          icon: <PlugInIcon />,
          name: "Facilities",
          subItems: [
            { name: "Device Registry", path: "/devices" },
            ...(isAdmin ? [{ name: "Device Channels", path: "/identity/channels" }] : []),
            { name: "CCTV Monitor", path: "/devices/live" },
            { name: "Print ID Cards", path: "/users/print-ids" },
          ],
        }
      );
    }

    if (isAdmin) {
      adminItems.push({
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

    if (adminItems.length > 0) {
      groups.push({ label: "Admin Tools", items: adminItems });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  6. SYSTEM
    //     Settings, logs, maintenance — Admin only
    // ══════════════════════════════════════════════════════════════════════════
    if (isAdmin) {
      groups.push({
        label: "System",
        items: [
          {
            icon: <BoltIcon />,
            name: "Settings",
            subItems: [
              { name: "General Settings", path: "/settings" },
              { name: "Storage", path: "/settings/storage" },
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
        ],
      });
    }

    return groups;
  }, [isStudent, isTeacher, isAdmin, isStaff]);
};

// ─── Sidebar component ────────────────────────────────────────────────────────
const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const navGroups = useNavGroups();

  const isVisible = isExpanded || isMobileOpen || isHovered;

  const [openSubmenu, setOpenSubmenu] = useState<{
    groupIdx: number;
    itemIdx: number;
  } | null>(null);

  const { user } = useAuthStore();
  const isStudent =
    user?.userTypes?.some((t) => t.toLowerCase().includes("student")) ||
    user?.roles?.some((r) => r.name.toLowerCase().includes("student"));

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
              <img src="/logo-pwa.png" alt="Visia" width={42} height={42} className="rounded-xl" />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Visia</span>
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
