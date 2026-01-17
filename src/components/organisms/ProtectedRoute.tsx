import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../../store/authStore";

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default ProtectedRoute;
