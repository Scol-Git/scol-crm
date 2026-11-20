import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context'
import { ProtectedRoute, AdminRoute } from './components'
import { MainLayout } from './layout'
import {
  Dashboard,
  LeadList,
  LeadDetails,
  CourseList,
  CourseDetails,
  UniversityList,
  UniversityDetails,
  BulkImportList,
  BulkImportDetails,
  Settings,
  Applications,
  ApplicationDetails,
  Tasks,
  Reports,
  Login,
  Register,
  ForgotPassword,
  VerifyOtp,
} from './pages'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leads" element={<LeadList />} />
            <Route path="leads/:id" element={<LeadDetails />} />
            <Route path="courses" element={<CourseList />} />
            <Route path="courses/:id" element={<CourseDetails />} />
            {/* Lists draft universities too, which have no courses to find them by */}
            <Route path="universities" element={<UniversityList />} />
            <Route path="universities/:id" element={<UniversityDetails />} />
            {/* CSV bulk import + draft review/publish - ADMIN only */}
            <Route path="bulk-imports" element={<AdminRoute><BulkImportList /></AdminRoute>} />
            <Route path="bulk-imports/:batchId" element={<AdminRoute><BulkImportDetails /></AdminRoute>} />
            <Route path="applications" element={<Applications />} />
            <Route path="applications/:id" element={<ApplicationDetails />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
