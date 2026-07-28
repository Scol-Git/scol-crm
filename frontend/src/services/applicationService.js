// Application Services - backed by the real CRM Applications endpoints.
// Task/Report services below remain on mock data (no backend support yet).
import { applications, tasks, monthlyStats, countryStats } from '../mockData/applications';
import { leadProfiles } from '../mockData';
import { api, extractList } from './apiClient';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeApplication = (raw) => ({
  id: raw.id ?? raw.applicationId,
  leadId: raw.leadId ?? raw.lead?.id ?? null,
  lead: raw.lead
    ? { fullName: raw.lead.fullName ?? raw.lead.name, email: raw.lead.email, phone: raw.lead.phone, consultantName: raw.lead.consultantName }
    : (raw.leadName ? { fullName: raw.leadName } : null),
  university: raw.university
    ? { uniName: raw.university.name ?? raw.university.uniName }
    : (raw.universityName ? { uniName: raw.universityName } : null),
  course: raw.course
    ? { courseName: raw.course.name ?? raw.course.courseName }
    : (raw.courseName ? { courseName: raw.courseName } : null),
  status: raw.status ?? raw.applicationStatus ?? null,
  stage: raw.stage ?? raw.applicationStage ?? null,
  appliedDate: raw.appliedDate ?? raw.createdAt ?? null,
  lastUpdated: raw.lastUpdated ?? raw.updatedAt ?? null,
  _raw: raw,
});

export const applicationService = {
  async getAll({ searchText, filters, ranges, pagination } = {}) {
    const data = await api.post('/crm/applications/list', {
      ...(searchText ? { searchText } : {}),
      ...(filters ? { filters } : {}),
      ...(ranges ? { ranges } : {}),
      pagination: pagination ?? { limit: 50 },
    });
    const { items, pagination: nextPagination } = extractList(data, ['applications']);
    return { applications: items.map(normalizeApplication), pagination: nextPagination };
  },

  async getDropdownData() {
    return api.get('/crm/applications/dropdown-data');
  },

  async getByLead(leadId) {
    const data = await api.get(`/crm/leads/${leadId}/applications`);
    const { items } = extractList(data, ['applications']);
    return items.map(normalizeApplication);
  },

  async getById(leadId, applicationId) {
    const data = await api.get(`/crm/leads/${leadId}/applications/${applicationId}`);
    return normalizeApplication(data);
  },

  async create(leadId, { universityId, courseId, intake }) {
    const data = await api.post(`/crm/leads/${leadId}/applications`, { universityId, courseId, intake });
    return normalizeApplication(data ?? { leadId, universityId, courseId, intake });
  },

  async getStageProgress(leadId, applicationId) {
    return api.get(`/crm/leads/${leadId}/applications/${applicationId}/stage-progress`);
  },

  async getDocumentProgress(leadId, applicationId) {
    return api.get(`/crm/leads/${leadId}/applications/${applicationId}/document-progress`);
  },

  async getActivities(leadId, applicationId) {
    const data = await api.get(`/crm/leads/${leadId}/applications/${applicationId}/activities`);
    const { items } = extractList(data, ['activities']);
    return items;
  },

  async changeStatus(leadId, applicationId, { toStatus, remarks }) {
    return api.post(`/crm/leads/${leadId}/applications/${applicationId}/status-changes`, { toStatus, ...(remarks ? { remarks } : {}) });
  },

  async changeStage(leadId, applicationId, { toStage, remarks }) {
    return api.post(`/crm/leads/${leadId}/applications/${applicationId}/stage-changes`, { toStage, ...(remarks ? { remarks } : {}) });
  },

  async getNotes(leadId, applicationId) {
    const data = await api.get(`/crm/leads/${leadId}/applications/${applicationId}/notes`);
    const { items } = extractList(data, ['notes']);
    return items;
  },

  async addNote(leadId, applicationId, { description, isResolved = false }) {
    return api.post(`/crm/leads/${leadId}/applications/${applicationId}/notes`, { description, isResolved });
  },

  async updateNote(leadId, applicationId, noteId, { description, isResolved }) {
    return api.put(`/crm/leads/${leadId}/applications/${applicationId}/notes/${noteId}`, {
      ...(description !== undefined ? { description } : {}),
      ...(isResolved !== undefined ? { isResolved } : {}),
    });
  },

  async deleteNote(leadId, applicationId, noteId) {
    return api.delete(`/crm/leads/${leadId}/applications/${applicationId}/notes/${noteId}`);
  },
};

// Task Services (mock - no backend endpoints yet)
export const taskService = {
  async getAll() {
    await delay();
    return tasks.map(task => {
      const lead = leadProfiles.find(l => l.id === task.leadId);
      return { ...task, lead };
    });
  },

  async getByLead(leadId) {
    await delay();
    return tasks.filter(task => task.leadId === leadId);
  },

  async getPending() {
    await delay();
    return tasks
      .filter(task => task.status === 'pending' || task.status === 'in_progress')
      .map(task => {
        const lead = leadProfiles.find(l => l.id === task.leadId);
        return { ...task, lead };
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  },

  async create(taskData) {
    await delay();
    const newId = `t${tasks.length + 1}`;
    return { id: newId, ...taskData, status: 'pending' };
  },

  async updateStatus(id, status) {
    await delay();
    return { success: true, status };
  },
};

// Report Services (mock - no backend endpoints yet)
export const reportService = {
  async getMonthlyStats() {
    await delay();
    return monthlyStats;
  },

  async getCountryStats() {
    await delay();
    return countryStats;
  },

  async getSummary() {
    await delay();
    const totalApplications = applications.length;
    const accepted = applications.filter(a => ['Unconditional offer', 'Enrolled', 'VISA', 'Conditional offer'].includes(a.status)).length;
    const enrolled = applications.filter(a => a.status === 'Enrolled').length;
    const pending = applications.filter(a => ['Application Submitted', 'Pending Review', 'Interview', 'Payment', 'CAS/COE/120'].includes(a.status)).length;
    const totalRevenue = monthlyStats.reduce((sum, m) => sum + m.revenue, 0);

    return {
      totalApplications,
      accepted,
      enrolled,
      pending,
      conversionRate: totalApplications > 0 ? Math.round((enrolled / totalApplications) * 100) : 0,
      acceptanceRate: totalApplications > 0 ? Math.round((accepted / totalApplications) * 100) : 0,
      totalRevenue,
      avgRevenuePerEnrollment: enrolled > 0 ? Math.round(totalRevenue / enrolled) : 0,
    };
  },
};

export default {
  applicationService,
  taskService,
  reportService,
};
