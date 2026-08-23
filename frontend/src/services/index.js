// CRM Leads service. Universities, Courses and the Dashboard live in
// crmUniversityService, courseService and crmDashboardService.
import { api, extractList } from './apiClient';
import { LEAD_STATUS, REGISTER_SOURCE, ENROLLMENT_STATUS } from './mappers';

// Import additional services
export { applicationService, taskService, reportService } from './applicationService';
export { authService } from './authService';
export { courseService, buildCourseQuery, MONTHS } from './courseService';
export { crmUniversityService } from './crmUniversityService';
export { crmDashboardService } from './crmDashboardService';


// Shape from CrmLeadListItemDto, verified live. Consultant and target country
// arrive as NESTED objects (consultantInfo / targetCountryInfo), not flat ids,
// and the timestamp is registerDate. Flat fallbacks kept so a lead echoed back
// from create/update still maps.
const normalizeLead = (raw = {}) => ({
  id: raw.id ?? raw.leadId ?? null,
  fullName: raw.name ?? raw.fullName ?? null,
  phone: raw.phone ?? null,
  email: raw.email ?? null,
  address: raw.address ?? null,
  city: raw.city ?? null,
  gender: raw.gender ?? null,
  targetCountryId: raw.targetCountryInfo?.countryId ?? raw.targetCountryId ?? null,
  targetCountry: raw.targetCountryInfo?.name ?? raw.targetCountryInfo?.countryName ?? raw.targetCountry ?? null,
  consultantId: raw.consultantInfo?.consultantId ?? raw.consultantInfo?.userId ?? raw.consultantId ?? null,
  consultantName: raw.consultantInfo?.name ?? raw.consultantName ?? null,
  registerSource: raw.registerSource ?? null,
  status: raw.leadStatus ?? raw.status ?? null,
  hasPassedEnglishTest: raw.hasPassedEnglishTest ?? false,
  enrollmentStatus: raw.enrollmentStatus ?? null,
  enrollmentDate: raw.enrollmentDate ?? null,
  createdAt: raw.registerDate ?? raw.createdAt ?? null,
  _raw: raw,
});

// Backend caps pagination.limit at 50 (CursorPaginationDto).
const PAGE_LIMIT = 50;

// Maps the UI's flat filter state onto CrmLeadFiltersDto / CrmLeadRangesDto /
// CrmLeadFlagsDto. Empty values are omitted so we never send empty arrays.
export const buildLeadQuery = ({ searchText, status, countryId, consultantId, englishTest, dateFrom, dateTo } = {}) => {
  const filters = {};
  if (status) filters.leadStatuses = [status];
  if (countryId) filters.targetCountryIds = [countryId];
  if (consultantId) filters.consultantIds = [consultantId];

  const ranges = {};
  if (dateFrom) ranges.startDate = dateFrom;
  if (dateTo) ranges.endDate = dateTo;

  const flags = {};
  if (englishTest === 'true' || englishTest === true) flags.hasPassedEnglishTest = true;
  if (englishTest === 'false' || englishTest === false) flags.hasPassedEnglishTest = false;

  return {
    ...(searchText?.trim() ? { searchText: searchText.trim() } : {}),
    ...(Object.keys(filters).length ? { filters } : {}),
    ...(Object.keys(ranges).length ? { ranges } : {}),
    ...(Object.keys(flags).length ? { flags } : {}),
  };
};

// Lead Services - backed by CRM Leads endpoints
export const leadService = {
  async getAll({ searchText, filters, ranges, flags, cursor, limit } = {}) {
    const data = await api.post('/crm/leads/list', {
      ...(searchText ? { searchText } : {}),
      ...(filters ? { filters } : {}),
      ...(ranges ? { ranges } : {}),
      ...(flags ? { flags } : {}),
      pagination: { limit: limit ?? PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    const { items, pagination } = extractList(data, ['leads']);
    return { leads: items.map(normalizeLead), pagination };
  },

  // GET /crm/leads/{leadId}/profile now exists, so a direct URL visit no longer
  // needs the old cursor walk through the list.
  async getById(id) {
    const data = await api.get(`/crm/leads/${id}/profile`);
    const p = data?.personalInformation ?? {};
    return {
      id: p.leadId ?? id,
      fullName: p.fullName ?? null,
      phone: p.phoneNumber ?? null,
      email: p.email ?? null,
      address: p.address ?? null,
      dateOfBirth: p.dateOfBirth ?? null,
      status: p.leadStatus ?? null,
      targetUniversities: p.targetUniversities ?? [],
      createdAt: p.joined ?? null,
      imageUrl: p.imageUrl ?? null,
      city: null,
      gender: null,
      targetCountryId: null,
      consultantId: null,
      registerSource: null,
      hasPassedEnglishTest: (data?.englishTestResults ?? []).some((t) => t.isVerified),
      _profile: data,
      _raw: data,
    };
  },

  // Full profile: personal info, academic results, English tests, shared
  // documents and the application journey.
  async getProfile(leadId) {
    const data = await api.get(`/crm/leads/${leadId}/profile`);
    return {
      personal: data?.personalInformation ?? null,
      academicResults: data?.academicResults ?? [],
      englishTestResults: data?.englishTestResults ?? [],
      sharedDocuments: data?.applicationSharedDocuments?.items ?? [],
      applicationJourney: data?.applicationJourney ?? [],
      _raw: data,
    };
  },

  // --- Academic results -----------------------------------------------------
  async updateAcademicResults(leadId, academicResults) {
    return api.put(`/crm/leads/${leadId}/academic-results`, { academicResults });
  },

  async setAcademicResultVerified(leadId, degreeId, isVerified) {
    return api.post(`/crm/leads/${leadId}/academic-results/${degreeId}/verification-status-changes`, { isVerified });
  },

  async deleteAcademicResult(leadId, degreeId) {
    return api.delete(`/crm/leads/${leadId}/academic-results/${degreeId}`);
  },

  // --- English test results -------------------------------------------------
  async updateEnglishTestResults(leadId, englishTestResults) {
    return api.put(`/crm/leads/${leadId}/english-test-results`, { englishTestResults });
  },

  async setEnglishTestVerified(leadId, testId, isVerified) {
    return api.post(`/crm/leads/${leadId}/english-test-results/${testId}/verification-status-changes`, { isVerified });
  },

  async deleteEnglishTestResult(leadId, testId) {
    return api.delete(`/crm/leads/${leadId}/english-test-results/${testId}`);
  },

  // --- Lead documents -------------------------------------------------------
  async changeDocumentStatus(leadId, documentId, { toStatus, remarks }) {
    return api.post(`/crm/leads/${leadId}/documents/${documentId}/status-changes`, {
      toStatus,
      ...(remarks ? { remarks } : {}),
    });
  },

  async create(formData) {
    const payload = {
      name: formData.fullName,
      phone: formData.phone,
      ...(formData.email ? { email: formData.email } : {}),
      ...(formData.address ? { address: formData.address } : {}),
      ...(formData.city ? { city: formData.city } : {}),
      ...(formData.gender ? { gender: formData.gender } : {}),
      ...(formData.targetCountryId ? { targetCountryId: formData.targetCountryId } : {}),
      ...(formData.consultantId ? { consultantId: formData.consultantId } : {}),
      ...(formData.registerSource ? { registerSource: formData.registerSource } : {}),
      ...(formData.leadStatus ? { leadStatus: formData.leadStatus } : {}),
      hasPassedEnglishTest: !!formData.hasPassedEnglishTest,
    };
    const data = await api.post('/crm/leads', payload);
    // The response does NOT echo the lead. It is
    //   { success, newLeadInfo: { phone, password } }
    // where `password` is the portal password the backend generated for the
    // new lead. It is not retrievable afterwards, so hand it to the caller.
    return {
      success: data?.success ?? true,
      phone: data?.newLeadInfo?.phone ?? payload.phone,
      password: data?.newLeadInfo?.password ?? null,
    };
  },

  // Form-field name -> API field name. Drives the partial update below.
  FIELD_MAP: {
    fullName: 'name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    city: 'city',
    gender: 'gender',
    targetCountryId: 'targetCountryId',
    consultantId: 'consultantId',
    registerSource: 'registerSource',
    leadStatus: 'leadStatus',
    enrollmentStatus: 'enrollmentStatus',
    hasPassedEnglishTest: 'hasPassedEnglishTest',
  },

  // PUT is a partial update: verified live that any subset is accepted (even an
  // empty body returns 200 and changes nothing), and omitted fields keep their
  // stored value.
  //
  // So send ONLY the fields the caller is actually changing. Previously this
  // sent the whole form every time, which meant leadStatus, registerSource and
  // hasPassedEnglishTest were written from the edit modal's placeholder
  // defaults whenever they could not be prefilled - silently downgrading a lead
  // to "NewLead / Offline / no English test" just by opening Edit and saving.
  async update(id, changes = {}) {
    const payload = {};
    for (const [formKey, apiKey] of Object.entries(this.FIELD_MAP)) {
      if (!(formKey in changes)) continue;
      const value = changes[formKey];
      payload[apiKey] = formKey === 'hasPassedEnglishTest'
        ? !!value
        : (value === '' ? null : value);
    }

    await api.put(`/crm/leads/${id}`, payload);
    // The response is only { success: true } - there is no lead to normalize,
    // so callers must re-read rather than rendering whatever comes back.
    return { success: true, changed: Object.keys(payload) };
  },

  // Countries + consultants for the Target Country / Consultant selects.
  // Live shape (verified): {
  //   targetCountries: [{ countryId, countryName }],
  //   consultantUsers: [{ consultantId, name }],
  //   registerSources / leadStatuses / enrollmentStatuses: string[]
  // }
  // The selects render { id, name }, so normalize here rather than per page.
  async getDropdownData() {
    const raw = (await api.get('/crm/leads/dropdown-data')) ?? {};

    const countries = (raw.targetCountries ?? raw.countries ?? []).map((c) => ({
      id: c.countryId ?? c.id,
      name: c.countryName ?? c.name,
    }));
    const consultants = (raw.consultantUsers ?? raw.consultants ?? []).map((c) => ({
      id: c.consultantId ?? c.userId ?? c.id,
      name: c.name,
    }));

    // Prefer the server's enum lists; fall back to our local label maps.
    const toOptions = (values, fallback) => (Array.isArray(values) && values.length
      ? values.map((v) => ({ value: v, label: fallback.label(v) }))
      : fallback.options);

    return {
      countries,
      consultants,
      leadStatuses: toOptions(raw.leadStatuses, LEAD_STATUS),
      registerSources: toOptions(raw.registerSources, REGISTER_SOURCE),
      enrollmentStatuses: toOptions(raw.enrollmentStatuses, ENROLLMENT_STATUS),
    };
  },
};



// NOTE: the old mock `courseService` was removed here. Courses are now backed by
// the real search endpoints - import { courseService } from './courseService'.
// Keeping a same-named mock in this barrel file silently shadowed the real one.



// Dashboard Statistics - now backed by GET /crm/dashboard.
// Kept under the original export name so pages need no import change.
export { crmDashboardService as dashboardService } from './crmDashboardService';


export default {
  leadService,
};
