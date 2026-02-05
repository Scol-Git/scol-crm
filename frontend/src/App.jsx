import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layout'
import {
  Dashboard,
  LeadList,
  LeadDetails,
  UniversityList,
  UniversityDetails,
  Courses,
  Settings,
  Applications,
  ApplicationDetails,
  Tasks,
  Reports,
} from './pages'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<LeadList />} />
          <Route path="leads/:id" element={<LeadDetails />} />
          <Route path="universities" element={<UniversityList />} />
          <Route path="universities/:id" element={<UniversityDetails />} />
          <Route path="courses" element={<Courses />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetails />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
