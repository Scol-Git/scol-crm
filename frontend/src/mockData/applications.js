// Additional Mock Data for Applications and Journeys

// Mock Applications
export const applications = [
  {
    id: 'app1',
    leadId: 'lp1',
    uniCourseId: 'course1',
    courseIntakeId: 'ci1',
    status: 'Application Submitted',
    appliedDate: '2025-11-15',
    lastUpdated: '2025-12-01',
    documents: ['passport', 'transcript', 'englishTest'],
    notes: 'Application submitted successfully. Waiting for university response.',
  },
  {
    id: 'app2',
    leadId: 'lp2',
    uniCourseId: 'course3',
    courseIntakeId: 'ci3',
    status: 'Pending Review',
    appliedDate: '2025-10-20',
    lastUpdated: '2025-11-28',
    documents: ['passport', 'transcript', 'englishTest', 'sop'],
    notes: 'Under review by admissions committee.',
  },
  {
    id: 'app3',
    leadId: 'lp3',
    uniCourseId: 'course5',
    courseIntakeId: 'ci4',
    status: 'Unconditional offer',
    appliedDate: '2025-09-10',
    lastUpdated: '2025-11-15',
    documents: ['passport', 'transcript', 'englishTest', 'sop', 'lor'],
    notes: 'Congratulations! Offer letter received.',
    offerLetterDate: '2025-11-15',
    depositPaid: false,
  },
  {
    id: 'app4',
    leadId: 'lp4',
    uniCourseId: 'course7',
    courseIntakeId: null,
    status: 'Enrolled',
    appliedDate: '2025-07-05',
    lastUpdated: '2025-10-01',
    documents: ['passport', 'transcript', 'englishTest', 'sop', 'lor', 'financialProof'],
    notes: 'Student has enrolled and visa approved.',
    offerLetterDate: '2025-08-20',
    depositPaid: true,
    visaStatus: 'approved',
    visaApprovalDate: '2025-09-25',
  },
  {
    id: 'app5',
    leadId: 'lp1',
    uniCourseId: 'course2',
    courseIntakeId: 'ci2',
    status: 'CAS/COE/120',
    appliedDate: '2025-12-10',
    lastUpdated: '2025-12-10',
    documents: ['passport'],
    notes: 'Application in progress.',
  },
  {
    id: 'app6',
    leadId: 'lp5',
    uniCourseId: 'course8',
    courseIntakeId: null,
    status: 'Interview',
    appliedDate: '2025-08-15',
    lastUpdated: '2025-10-05',
    documents: ['passport', 'transcript', 'englishTest'],
    notes: 'Application rejected due to low GPA.',
    rejectionReason: 'Academic requirements not met',
  },
  {
    id: 'app7',
    leadId: 'lp6',
    uniCourseId: 'course3',
    courseIntakeId: 'ci3',
    status: 'Conditional offer',
    appliedDate: '2025-10-01',
    lastUpdated: '2025-11-20',
    documents: ['passport', 'transcript', 'sop'],
    notes: 'Conditional offer - requires English test score.',
    conditions: ['Submit IELTS score of 7.0 or above'],
  },
  {
    id: 'app8',
    leadId: 'lp8',
    uniCourseId: 'course1',
    courseIntakeId: 'ci1',
    status: 'VISA',
    appliedDate: '2025-08-20',
    lastUpdated: '2025-12-01',
    documents: ['passport', 'transcript', 'englishTest', 'sop', 'lor', 'financialProof'],
    notes: 'Visa application submitted.',
    offerLetterDate: '2025-09-30',
    depositPaid: true,
    visaStatus: 'processing',
  },
];

// Mock Journey Events
export const journeyEvents = [
  // Lead lp1 journey
  { id: 'je1', leadId: 'lp1', type: 'lead_created', date: '2025-09-01', title: 'Lead Created', description: 'John Doe registered as a new lead.' },
  { id: 'je2', leadId: 'lp1', type: 'status_change', date: '2025-09-05', title: 'Status Updated', description: 'Status changed from New to Contacted.' },
  { id: 'je3', leadId: 'lp1', type: 'document_uploaded', date: '2025-09-10', title: 'Document Uploaded', description: 'Passport uploaded.' },
  { id: 'je4', leadId: 'lp1', type: 'counseling_session', date: '2025-09-15', title: 'Counseling Session', description: 'Initial counseling completed. Interested in UK universities.' },
  { id: 'je5', leadId: 'lp1', type: 'application_started', date: '2025-11-15', title: 'Application Started', description: 'Application to University of Oxford - BSc Computer Science.' },
  { id: 'je6', leadId: 'lp1', type: 'application_submitted', date: '2025-11-15', title: 'Application Submitted', description: 'Application submitted successfully.' },

  // Lead lp2 journey
  { id: 'je7', leadId: 'lp2', type: 'lead_created', date: '2025-08-15', title: 'Lead Created', description: 'Jane Smith registered as a new lead.' },
  { id: 'je8', leadId: 'lp2', type: 'english_test_added', date: '2025-08-20', title: 'Test Score Added', description: 'TOEFL score of 105 added.' },
  { id: 'je9', leadId: 'lp2', type: 'application_submitted', date: '2025-10-20', title: 'Application Submitted', description: 'Applied to Harvard University.' },
  { id: 'je10', leadId: 'lp2', type: 'status_change', date: '2025-11-28', title: 'Application Update', description: 'Application under review.' },

  // Lead lp3 journey
  { id: 'je11', leadId: 'lp3', type: 'lead_created', date: '2025-06-01', title: 'Lead Created', description: 'Mike Johnson registered.' },
  { id: 'je12', leadId: 'lp3', type: 'application_submitted', date: '2025-09-10', title: 'Application Submitted', description: 'Applied to University of Toronto.' },
  { id: 'je13', leadId: 'lp3', type: 'offer_received', date: '2025-11-15', title: 'Offer Received', description: 'Unconditional offer received!' },

  // Lead lp4 journey
  { id: 'je14', leadId: 'lp4', type: 'lead_created', date: '2025-04-01', title: 'Lead Created', description: 'Sarah Wilson registered.' },
  { id: 'je15', leadId: 'lp4', type: 'application_submitted', date: '2025-07-05', title: 'Application Submitted', description: 'Applied to University of Melbourne.' },
  { id: 'je16', leadId: 'lp4', type: 'offer_received', date: '2025-08-20', title: 'Offer Received', description: 'Offer letter received.' },
  { id: 'je17', leadId: 'lp4', type: 'deposit_paid', date: '2025-09-01', title: 'Deposit Paid', description: 'Initial deposit of AUD 10,000 paid.' },
  { id: 'je18', leadId: 'lp4', type: 'visa_approved', date: '2025-09-25', title: 'Visa Approved', description: 'Student visa approved!' },
  { id: 'je19', leadId: 'lp4', type: 'enrolled', date: '2025-10-01', title: 'Enrolled', description: 'Successfully enrolled at University of Melbourne.' },
];

// Mock Tasks/Follow-ups
export const tasks = [
  { id: 't1', leadId: 'lp1', title: 'Follow up on application status', dueDate: '2025-12-15', priority: 'high', status: 'pending', assignedTo: 'Admin User' },
  { id: 't2', leadId: 'lp2', title: 'Schedule counseling session', dueDate: '2025-12-10', priority: 'medium', status: 'completed', assignedTo: 'Admin User' },
  { id: 't3', leadId: 'lp3', title: 'Send deposit payment reminder', dueDate: '2025-12-05', priority: 'high', status: 'pending', assignedTo: 'Admin User' },
  { id: 't4', leadId: 'lp5', title: 'Collect missing documents', dueDate: '2025-12-20', priority: 'medium', status: 'pending', assignedTo: 'Admin User' },
  { id: 't5', leadId: 'lp6', title: 'English test reminder', dueDate: '2025-12-08', priority: 'high', status: 'pending', assignedTo: 'Admin User' },
  { id: 't6', leadId: 'lp7', title: 'Re-engage lost lead', dueDate: '2025-12-25', priority: 'low', status: 'pending', assignedTo: 'Admin User' },
  { id: 't7', leadId: 'lp8', title: 'Visa interview preparation', dueDate: '2025-12-12', priority: 'high', status: 'in_progress', assignedTo: 'Admin User' },
];

// Monthly Statistics for Reports
export const monthlyStats = [
  { month: 'Jul 2025', leads: 12, applications: 5, accepted: 2, enrolled: 1, revenue: 15000 },
  { month: 'Aug 2025', leads: 18, applications: 8, accepted: 4, enrolled: 2, revenue: 28000 },
  { month: 'Sep 2025', leads: 25, applications: 12, accepted: 6, enrolled: 3, revenue: 42000 },
  { month: 'Oct 2025', leads: 22, applications: 15, accepted: 8, enrolled: 4, revenue: 55000 },
  { month: 'Nov 2025', leads: 30, applications: 18, accepted: 10, enrolled: 5, revenue: 68000 },
  { month: 'Dec 2025', leads: 28, applications: 14, accepted: 7, enrolled: 3, revenue: 45000 },
];

// Country-wise Statistics
export const countryStats = [
  { country: 'United Kingdom', applications: 35, accepted: 22, enrolled: 15, revenue: 125000 },
  { country: 'United States', applications: 28, accepted: 15, enrolled: 8, revenue: 98000 },
  { country: 'Canada', applications: 22, accepted: 18, enrolled: 12, revenue: 85000 },
  { country: 'Australia', applications: 18, accepted: 14, enrolled: 10, revenue: 72000 },
  { country: 'Germany', applications: 12, accepted: 10, enrolled: 7, revenue: 35000 },
];

export default {
  applications,
  journeyEvents,
  tasks,
  monthlyStats,
  countryStats,
};
