import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Protects routes that require authentication.
 * Redirects to /login if not authenticated, preserving the intended destination.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * Role-based protected route.
 * Renders children only if the user has one of the required roles.
 */
export const RoleProtectedRoute = ({ roles }) => {
  const { user } = useAuthStore();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Redirects authenticated users away from auth pages (login/register).
 */
export const PublicRoute = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
