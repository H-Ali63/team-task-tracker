import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ProtectedRoute, PublicRoute, RoleProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { SocketProvider } from './context/SocketContext';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { UsersPage } from './pages/UsersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'inherit', fontSize: '14px' },
            success: { iconTheme: { primary: '#2563eb', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Redirect root → dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public routes (redirect to dashboard if already authenticated) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes — require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TaskBoardPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />

              {/* ADMIN + MANAGER only */}
              <Route element={<RoleProtectedRoute roles={['ADMIN', 'MANAGER']} />}>
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* ADMIN only */}
              <Route element={<RoleProtectedRoute roles={['ADMIN']} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
