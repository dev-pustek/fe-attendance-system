// Role-based route permissions configuration
export type UserRole = 'admin' | 'superadmin' | 'super admin' | 'teacher' | 'student' | 'staff' | 'parent';

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  requiresAll?: boolean; // If true, user must have ALL roles. Default: user needs ANY role
}

// Define which routes are accessible to which roles
export const routePermissions: RoutePermission[] = [
  // Dashboard - Everyone
  { path: '/', allowedRoles: ['admin', 'teacher', 'student', 'staff', 'parent'] },
  { path: '/calendar', allowedRoles: ['admin', 'teacher', 'student', 'staff'] },
  { path: '/profile', allowedRoles: ['admin', 'teacher', 'student', 'staff', 'parent'] },
  { path: '/notifications', allowedRoles: ['admin', 'teacher', 'student', 'staff', 'parent'] },

  // Student-specific routes
  { path: '/student/my-schedule', allowedRoles: ['student'] },
  { path: '/student/leaves', allowedRoles: ['student'] },
  { path: '/students/:userId', allowedRoles: ['admin', 'teacher', 'student', 'staff'] },

  // Teacher-specific routes
  { path: '/teacher/classroom', allowedRoles: ['admin', 'teacher'] },
  { path: '/attendance/my-schedule', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/hr/employees/:employeeId/academic-profile', allowedRoles: ['admin', 'teacher'] },

  // Attendance - Different access levels
  { path: '/attendance/records', allowedRoles: ['admin', 'teacher', 'student', 'staff'] },
  { path: '/attendance/history', allowedRoles: ['admin', 'teacher', 'staff', 'student'] },
  { path: '/attendance/gate-scan', allowedRoles: ['admin', 'student', 'staff'] }, // Students can scan for attendance
  { path: '/attendance/piket', allowedRoles: ['admin', 'staff'] },
  { path: '/attendance/classroom-command', allowedRoles: ['admin', 'staff'] },
  { path: '/attendance/history', allowedRoles: ['admin', 'staff', 'student'] },
  { path: '/attendance/teaching-sessions', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/attendance/subject-attendances', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/attendance/events', allowedRoles: ['admin', 'staff'] },
  { path: '/attendance/metrics', allowedRoles: ['admin'] },
  { path: '/attendance/policies', allowedRoles: ['admin'] },

  // Academic Management - Admin and Staff only
  { path: '/academic/years', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/classes', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/classes/:classId/manage', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/curriculum', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/curriculum-wizard', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/schedules', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/schedule-overrides', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/enrollments', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/education-levels', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/majors', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/grades', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/program-studies', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/subjects', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/teacher-subjects', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/class-subjects', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/teaching-assignments', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/teaching-unit-policies', allowedRoles: ['admin'] },
  { path: '/academic/workload-contracts', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/teaching-schedule-templates', allowedRoles: ['admin', 'staff'] },
  { path: '/academic/students', allowedRoles: ['admin', 'teacher', 'staff'] },
  { path: '/academic/parents', allowedRoles: ['admin', 'staff'] },

  // HR & Employees
  { path: '/hr/employees', allowedRoles: ['admin', 'staff'] },

  // Devices & CCTV - Super Admin only
  { path: '/devices', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/devices/live', allowedRoles: ['super admin', 'superadmin'] },

  // Identity Management - Super Admin only
  { path: '/identity/channels', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/identity/credentials', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/identity/logs', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/identity/resolutions', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/identity/capabilities', allowedRoles: ['super admin', 'superadmin'] },

  // Leave Requests - Everyone except parents
  { path: '/leaves/requests', allowedRoles: ['admin', 'teacher', 'student', 'staff'] },

  // Events - Most users
  { path: '/events', allowedRoles: ['admin', 'teacher', 'student', 'staff'] },
  { path: '/events/:id/invitations', allowedRoles: ['admin', 'staff'] },
  { path: '/events/:id/invitation-paper', allowedRoles: ['admin', 'teacher', 'student', 'staff'] },

  // Guests - Admin and Staff
  { path: '/guests', allowedRoles: ['admin', 'staff'] },
  { path: '/guests/visits', allowedRoles: ['admin', 'staff'] },

  // Scheduling
  { path: '/scheduling/templates', allowedRoles: ['admin', 'staff'] },
  { path: '/scheduling/assignments', allowedRoles: ['admin', 'staff'] },
  { path: '/schedules', allowedRoles: ['admin', 'teacher', 'staff'] },

  // Settings & Admin - Super Admin only
  { path: '/settings', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/settings/storage', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/settings/backups', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/settings/notifications', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/roles', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/users/list', allowedRoles: ['admin', 'staff'] },
  { path: '/users/print-ids', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/users/user-types', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/admin/notification-templates', allowedRoles: ['super admin', 'superadmin'] },

  // Audit & Logs - Super Admin only
  { path: '/audit/logs', allowedRoles: ['super admin', 'superadmin'] },
  { path: '/audit/metrics', allowedRoles: ['super admin', 'superadmin'] },
];

/**
 * Check if a user has permission to access a route
 * Uses user roles only (ignoring userTypes)
 * Admin gets access to all routes
 */
export const hasRoutePermission = (
  _userTypes: string[] | undefined, // Kept for signature compatibility but ignored
  routePath: string,
  roles?: Array<{ name: string }> | undefined
): boolean => {
  // 1. Check if user has explicit roles
  if (!roles || roles.length === 0) {
    // Fallback: if no roles, check if we should allow based on empty (for safety/backward compat) or deny
    // For now logging it
    console.warn('⚠️ No roles found for permission check');
    // return false; // Strict mode
    return true; // Backward compatibility fallback
  }

  const roleNames = roles.map(r => r.name.toLowerCase());

  // 2. SUPER ADMIN BYPASS: If user is superadmin, they can access EVERYTHING
  if (roleNames.some(r => r === 'super admin' || r === 'superadmin')) {
    console.log('🛡️ Super Admin Bypass Granted for:', routePath);
    return true;
  }

  // 3. Normal Permission Check
  // Find matching route permission
  const permission = routePermissions.find(p => {
    if (p.path === routePath) return true;
    const pathPattern = p.path.replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${pathPattern}$`).test(routePath);
  });

  if (!permission) {
    console.warn(`No permission defined for route: ${routePath} - allowing access`);
    return true;
  }

  // Check if any of the user's roles match the allowed roles
  const hasPermission = permission.allowedRoles.some(allowedRole => {
    return roleNames.some(userRole => {
      if (userRole === allowedRole) return true;
      if (userRole.includes(allowedRole)) return true;
      return false;
    });
  });

  return hasPermission;
};

/**
 * Get user's primary role for display purposes
 * Prioritizes roles array
 */
export const getPrimaryRole = (_userTypes: string[] | undefined, roles?: Array<{ name: string }>): UserRole | null => {
  // Use roles if available
  if (roles && roles.length > 0) {
    const roleNames = roles.map(r => r.name.toLowerCase());
    if (roleNames.some(r => r.includes('admin'))) return 'admin';
    if (roleNames.some(r => r.includes('teacher'))) return 'teacher';
    if (roleNames.some(r => r.includes('staff'))) return 'staff';
    if (roleNames.some(r => r.includes('student'))) return 'student';
    if (roleNames.some(r => r.includes('parent'))) return 'parent';
  }
  
  return null;
};
