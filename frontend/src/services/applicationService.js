// Application Services - backed by the real CRM Applications endpoints.
// Task/Report services below remain on mock data (no backend support yet).
import { applications, tasks, monthlyStats, countryStats } from '../mockData/applications';
import { leadProfiles } from '../mockData';
import { api, extractList } from './apiClient';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ApplicationIntakeDto = { intakeMonth: 1-12, intakeYear: number }
const toIntake = (intake) => {
  if (intake && typeof intake === 'object' && 'intakeMonth' in intake) return intake;
  const d = intake instanceof Date ? intake : new Date(intake);
  if (Number.isNaN(d.getTime())) return intake;
  return { intakeMonth: d.getMonth() + 1, intakeYear: d.getFullYear() };
};

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

// Backend caps pagination.limit at 50 (CursorPaginationDto).
const PAGE_LIMIT = 50;

// Maps the UI's flat filter state onto CrmApplicationFiltersDto.
// NOTE: unlike the Leads DTO, the status/stage keys are PascalCase and the date
// range is nested under `ranges.dateRange`. Sending camelCase or a flat range
// here is silently ignored by the backend rather than rejected.
export const buildApplicationQuery = ({ searchText, status, stage, consultantId, dateFrom, dateTo } = {}) => {
  const filters = {};
  if (status) filters.ApplicationStatuses = [status];
  if (stage) filters.ApplicationStages = [stage];
  if (consultantId) filters.consultantIds = [consultantId];

  const dateRange = {};
  if (dateFrom) dateRange.startDate = dateFrom;
  if (dateTo) dateRange.endDate = dateTo;

  return {
    ...(searchText?.trim() ? { searchText: searchText.trim() } : {}),
    ...(Object.keys(filters).length ? { filters } : {}),
    ...(Object.keys(dateRange).length ? { ranges: { dateRange } } : {}),
  };
};

export const applicationService = {
  async getAll({ searchText, filters, ranges, cursor, limit } = {}) {
    const data = await api.post('/crm/applications/list', {
      ...(searchText ? { searchText } : {}),
      ...(filters ? { filters } : {}),
      ...(ranges ? { ranges } : {}),
      pagination: { limit: limit ?? PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    const { items, pagination } = extractList(data, ['applications']);
    return { applications: items.map(normalizeApplication), pagination };
  },

  // Consultants (and whatever else the backend exposes) for the list filters.
  // Response is undocumented, so probe the likely key names.
  async getDropdownData() {
    const data = await api.get('/crm/applications/dropdown-data');
    const raw = data ?? {};
    return {
      consultants: raw.consultants ?? raw.counselors ?? [],
      universities: raw.universities ?? [],
      raw,
    };
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

  // CreateApplicationRequestDto requires intake as { intakeMonth, intakeYear } -
  // accept either that or a Date/ISO string and normalize before sending.
  async create(leadId, { universityId, courseId, intake }) {
    const payload = {
      universityId,
      courseId,
      intake: toIntake(intake),
    };
    const data = await api.post(`/crm/leads/${leadId}/applications`, payload);
    return normalizeApplication(data ?? { leadId, ...payload });
  },

  // Resolves the owning leadId for an application when it wasn't passed via
  // router state (direct URL / refresh). Walks the cursor rather than only
  // checking the first page.
  async findLeadId(applicationId, { maxPages = 20 } = {}) {
    let cursor = null;
    for (let page = 0; page < maxPages; page += 1) {
      const { applications, pagination } = await this.getAll({ cursor });
      const match = applications.find((a) => a.id === applicationId);
      if (match?.leadId) return match.leadId;
      if (!pagination?.hasNext || !pagination?.cursor) break;
      cursor = pagination.cursor;
    }
    return null;
  },

  async getStageProgress(leadId, applicationId) {
    return api.get(`/crm/leads/${leadId}/applications/${applicationId}/stage-progress`);
  },

  async getDocumentProgress(leadId, applicationId) {
    return api.get(`/crm/leads/${leadId}/applications/${applicationId}/document-progress`);
  },

  // --- Documents -----------------------------------------------------------
  // Two distinct things live here and must not be confused:
  //   * a *document* is an uploaded file  -> statuses PENDING/IN_PROGRESS/REJECTED/VERIFIED
  //   * a *requirement* is the slot it fills (documentType) -> PENDING/IN_PROGRESS/VERIFIED
  // They have separate endpoints and separate enums (a requirement can't be REJECTED).

  async changeDocumentStatus(leadId, applicationId, documentId, { toStatus, remarks }) {
    return api.post(
      `/crm/leads/${leadId}/applications/${applicationId}/documents/${documentId}/status-changes`,
      { toStatus, ...(remarks ? { remarks } : {}) },
    );
  },

  async changeRequirementStatus(leadId, applicationId, documentTypeId, { toStatus, remarks }) {
    return api.post(
      `/crm/leads/${leadId}/applications/${applicationId}/document-types/${documentTypeId}/status-changes`,
      { toStatus, ...(remarks ? { remarks } : {}) },
    );
  },

  // Returns whatever the backend hands back (typically a short-lived signed URL).
  async getDocumentDownload(leadId, applicationId, documentId) {
    return api.get(`/crm/leads/${leadId}/applications/${applicationId}/documents/${documentId}/download`);
  },

  async requestUploadUrl(leadId, applicationId, documentTypeId, { fileName, mimeType, fileSizeBytes }) {
    return api.post(
      `/crm/leads/${leadId}/applications/${applicationId}/document-types/${documentTypeId}/upload-url`,
      { fileName, mimeType, fileSizeBytes },
    );
  },

  async confirmUpload(leadId, applicationId, documentTypeId, { documentId, documentVersionId }) {
    return api.post(
      `/crm/leads/${leadId}/applications/${applicationId}/document-types/${documentTypeId}/confirm-upload`,
      { documentId, documentVersionId },
    );
  },

  // Three-step presigned upload: ask for a URL, PUT the bytes straight to
  // storage (no auth header - the signature carries it), then confirm.
  async uploadDocument(leadId, applicationId, documentTypeId, file) {
    const ticket = await this.requestUploadUrl(leadId, applicationId, documentTypeId, {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
    });

    const uploadUrl = ticket?.uploadUrl ?? ticket?.url ?? ticket?.signedUrl;
    if (!uploadUrl) throw new Error('The server did not return an upload URL.');

    const put = await fetch(uploadUrl, {
      method: ticket?.method ?? 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream', ...(ticket?.headers ?? {}) },
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed (${put.status}). Please try again.`);

    return this.confirmUpload(leadId, applicationId, documentTypeId, {
      documentId: ticket?.documentId,
      documentVersionId: ticket?.documentVersionId,
    });
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
