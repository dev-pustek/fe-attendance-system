import React from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "../../store/authStore";

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    // If the user is already authenticated, redirect them to the home page or dashboard
    return <Navigate to="/" replace />;
  }

  // If the user is NOT authenticated, allow access to the public route (e.g., SignIn, SignUp)
  return <>{children}</>;
};

export default PublicRoute;
