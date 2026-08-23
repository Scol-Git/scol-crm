// Mock data — the ONLY remaining mock in the app.
//
// Kept solely for Tasks, Reports and Settings, which have no backend endpoints
// yet (see BACKEND-ISSUES.md). Everything else — Leads, Applications, Courses,
// Universities and the Dashboard — runs on the real API.
//
// Delete a block below as soon as its endpoint lands.

// --- Tasks -----------------------------------------------------------------

// Only fullName is read off a task's lead, so this is a name lookup, not a
// full lead record.
export const leadNames = {
  lp1: 'John Doe',
  lp2: 'Jane Smith',
  lp3: 'Mike Johnson',
  lp4: 'Sarah Wilson',
  lp5: 'David Brown',
  lp6: 'Emily Davis',
  lp7: 'Chris Martinez',
  lp8: 'Amanda Taylor'
};

export const tasks = [
  {
    id: 't1',
    leadId: 'lp1',
    title: 'Follow up on application status',
    dueDate: '2025-12-15',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Admin User'
  },
  {
    id: 't2',
    leadId: 'lp2',
    title: 'Schedule counseling session',
    dueDate: '2025-12-10',
    priority: 'medium',
    status: 'completed',
    assignedTo: 'Admin User'
  },
  {
    id: 't3',
    leadId: 'lp3',
    title: 'Send deposit payment reminder',
    dueDate: '2025-12-05',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Admin User'
  },
  {
    id: 't4',
    leadId: 'lp5',
    title: 'Collect missing documents',
    dueDate: '2025-12-20',
    priority: 'medium',
    status: 'pending',
    assignedTo: 'Admin User'
  },
  {
    id: 't5',
    leadId: 'lp6',
    title: 'English test reminder',
    dueDate: '2025-12-08',
    priority: 'high',
    status: 'pending',
    assignedTo: 'Admin User'
  },
  {
    id: 't6',
    leadId: 'lp7',
    title: 'Re-engage lost lead',
    dueDate: '2025-12-25',
    priority: 'low',
    status: 'pending',
    assignedTo: 'Admin User'
  },
  {
    id: 't7',
    leadId: 'lp8',
    title: 'Visa interview preparation',
    dueDate: '2025-12-12',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Admin User'
  }
];

// --- Reports ---------------------------------------------------------------

// reportService.getSummary() only counts statuses, so these are status-only rows.
export const applicationStatuses = [
  'Application Submitted',
  'Pending Review',
  'Unconditional offer',
  'Enrolled',
  'CAS/COE/120',
  'Interview',
  'Conditional offer',
  'VISA'
];

export const monthlyStats = [
  {
    month: 'Jul 2025',
    leads: 12,
    applications: 5,
    accepted: 2,
    enrolled: 1,
    revenue: 15000
  },
  {
    month: 'Aug 2025',
    leads: 18,
    applications: 8,
    accepted: 4,
    enrolled: 2,
    revenue: 28000
  },
  {
    month: 'Sep 2025',
    leads: 25,
    applications: 12,
    accepted: 6,
    enrolled: 3,
    revenue: 42000
  },
  {
    month: 'Oct 2025',
    leads: 22,
    applications: 15,
    accepted: 8,
    enrolled: 4,
    revenue: 55000
  },
  {
    month: 'Nov 2025',
    leads: 30,
    applications: 18,
    accepted: 10,
    enrolled: 5,
    revenue: 68000
  },
  {
    month: 'Dec 2025',
    leads: 28,
    applications: 14,
    accepted: 7,
    enrolled: 3,
    revenue: 45000
  }
];

export const countryStats = [
  {
    country: 'United Kingdom',
    applications: 35,
    accepted: 22,
    enrolled: 15,
    revenue: 125000
  },
  {
    country: 'United States',
    applications: 28,
    accepted: 15,
    enrolled: 8,
    revenue: 98000
  },
  {
    country: 'Canada',
    applications: 22,
    accepted: 18,
    enrolled: 12,
    revenue: 85000
  },
  {
    country: 'Australia',
    applications: 18,
    accepted: 14,
    enrolled: 10,
    revenue: 72000
  },
  {
    country: 'Germany',
    applications: 12,
    accepted: 10,
    enrolled: 7,
    revenue: 35000
  }
];
