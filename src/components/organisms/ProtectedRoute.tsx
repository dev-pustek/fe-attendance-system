import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../../store/authStore";
import { hasRoutePermission } from "../../config/routePermissions";

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/student/login" replace />;
  }

  // Debug logging
  console.log('=== ProtectedRoute Debug ===');
  console.log('Route:', location.pathname);
  console.log('User:', user);
  console.log('User Types:', user?.userTypes);
  console.log('User Roles:', user?.roles);
  console.log('User Types type:', typeof user?.userTypes, Array.isArray(user?.userTypes));

  // Check route permissions - pass both userTypes and roles
  const hasPermission = hasRoutePermission(user?.userTypes, location.pathname, user?.roles as Array<{ name: string }> | undefined);
  
  console.log('Has Permission:', hasPermission);
  console.log('=== End Debug ===');

  if (!hasPermission) {
    // Redirect to unauthorized page or home
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-6 font-mono">
            Route: {location.pathname}<br/>
            Roles: {user?.userTypes?.join(', ') || 'None'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
