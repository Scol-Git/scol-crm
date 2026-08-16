// API Simulation Services (Universities/Courses/Dashboard/Lookups still mocked -
// no backend support for these yet) + real CRM Leads service.
import {
  countries,
  states,
  cities,
  academicDegrees,
  programmes,
  englishTests,
  intakes,
  users,
  leadProfiles,
  universities,
  courses,
  courseIntakes,
  universityIntakes,
  detailedCourses,
} from '../mockData';
import { api, extractList } from './apiClient';
import { LEAD_STATUS } from './mappers';

// Import additional services
export { applicationService, taskService, reportService } from './applicationService';
export { authService } from './authService';

// Simulate API delay (mock-only services below)
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeLead = (raw) => ({
  id: raw.id ?? raw.leadId,
  fullName: raw.name ?? raw.fullName ?? null,
  phone: raw.phone ?? null,
  email: raw.email ?? null,
  address: raw.address ?? null,
  city: raw.city ?? null,
  gender: raw.gender ?? null,
  targetCountryId: raw.targetCountryId ?? null,
  targetCountry: raw.targetCountry ?? raw.targetCountryName ?? raw.country?.name ?? null,
  consultantId: raw.consultantId ?? null,
  consultantName: raw.consultantName ?? raw.consultant?.name ?? null,
  registerSource: raw.registerSource ?? null,
  status: raw.leadStatus ?? raw.status ?? null,
  hasPassedEnglishTest: raw.hasPassedEnglishTest ?? raw.englishTestPassed ?? false,
  enrollmentStatus: raw.enrollmentStatus ?? null,
  createdAt: raw.createdAt ?? null,
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

  // No GET /crm/leads/{id} on the backend yet. Until it lands, walk the cursor
  // instead of only checking the first page - previously any lead past row 50
  // was unreachable by direct URL. Bounded so a bad id can't loop forever.
  async getById(id, { maxPages = 20 } = {}) {
    let cursor = null;
    for (let page = 0; page < maxPages; page += 1) {
      const { leads, pagination } = await this.getAll({ cursor });
      const match = leads.find((lead) => lead.id === id);
      if (match) return match;
      if (!pagination?.hasNext || !pagination?.cursor) break;
      cursor = pagination.cursor;
    }
    return null;
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
    return normalizeLead(data ?? payload);
  },

  async update(id, formData) {
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
      ...(formData.enrollmentStatus ? { enrollmentStatus: formData.enrollmentStatus } : {}),
      hasPassedEnglishTest: !!formData.hasPassedEnglishTest,
    };
    const data = await api.put(`/crm/leads/${id}`, payload);
    return normalizeLead(data ?? { id, ...payload });
  },

  // Countries + consultants for the Target Country / Consultant selects.
  async getDropdownData() {
    const data = await api.get('/crm/leads/dropdown-data');
    const raw = data ?? {};
    const countries = raw.countries ?? raw.targetCountries ?? [];
    const consultants = raw.consultants ?? raw.counselors ?? [];
    return { countries, consultants, leadStatuses: LEAD_STATUS.options };
  },
};

// University Services (mock - no backend endpoints yet)
export const universityService = {
  async getAll() {
    await delay();
    return universities.map(uni => ({
      ...uni,
      country: countries.find(c => c.id === uni.sysCountryId),
      state: states.find(s => s.id === uni.sysStateId),
      city: cities.find(c => c.id === uni.sysCityId),
    }));
  },

  async getById(id) {
    await delay();
    const uni = universities.find(u => u.id === id);
    if (!uni) return null;

    const uniCourses = courses.filter(c => c.uniId === id).map(course => ({
      ...course,
      programme: programmes.find(p => p.id === course.sysProgrammeId),
      degree: academicDegrees.find(d => d.id === course.sysDegreeId),
      intakes: courseIntakes.filter(ci => ci.uniCourseId === course.id),
    }));

    return {
      ...uni,
      country: countries.find(c => c.id === uni.sysCountryId),
      state: states.find(s => s.id === uni.sysStateId),
      city: cities.find(c => c.id === uni.sysCityId),
      courses: uniCourses,
      intakes: universityIntakes.filter(ui => ui.uniId === id),
    };
  },

  async create(uniData) {
    await delay();
    const newId = `uni${universities.length + 1}`;
    return {
      id: newId,
      ...uniData,
    };
  },

  async update(id, uniData) {
    await delay();
    const index = universities.findIndex(u => u.id === id);
    if (index === -1) return null;

    return { ...universities[index], ...uniData };
  },

  async search(query) {
    await delay();
    const lowerQuery = query.toLowerCase();
    return universities
      .filter(uni => uni.uniName.toLowerCase().includes(lowerQuery))
      .map(uni => ({
        ...uni,
        country: countries.find(c => c.id === uni.sysCountryId),
        state: states.find(s => s.id === uni.sysStateId),
        city: cities.find(c => c.id === uni.sysCityId),
      }));
  },
};

// NOTE: the old mock `courseService` was removed here. Courses are now backed by
// the real search endpoints - import { courseService } from './courseService'.
// Keeping a same-named mock in this barrel file silently shadowed the real one.

export const detailedCourseService = {
  async getAll() {
    await delay();
    return detailedCourses;
  },
  async getByUniversity(uniId) {
    await delay();
    return detailedCourses.filter(c => c.uniId === uniId);
  }
};

// Dashboard Statistics Services (mock - no backend endpoints yet)
export const dashboardService = {
  async getStats() {
    await delay();
    return {
      // Top Stats Row 1
      totalLeads: leadProfiles.length,
      onlineLeads: Math.floor(leadProfiles.length * 0.4),
      offlineLeads: Math.floor(leadProfiles.length * 0.4),
      loggedInLeads: Math.floor(leadProfiles.length * 0.2),

      // Top Stats Row 2
      totalEnrollment: 120,
      onlineEnrollment: 80,
      physicalEnrollment: 40,

      // Quick Overview Rates
      eligibleLeadRate: 45,
      applicationRate: 25,
      visaRate: 85,
      enrollRate: 20,

      // Lead Status Distribution
      leadsByStatus: {
        'new lead': leadProfiles.filter(l => l.status === 'eligible').length + 2,
        eligible: leadProfiles.filter(l => l.status === 'eligible').length,
        'not eligible': leadProfiles.filter(l => l.status === 'not eligible').length,
        unreachable: leadProfiles.filter(l => l.status === 'unreachable').length,
        visited: leadProfiles.filter(l => l.status === 'visited').length,
      },

      // Application Statuses Graph Data
      applicationStatuses: [
        {
          name: 'Winter (Jan - Mar)',
          submitted: 120,
          conditional: 95,
          unconditional: 80,
          interview: 70,
          payment: 65,
          cas: 60,
          visa: 55,
        },
        {
          name: 'Spring (Apr - Jun)',
          submitted: 90,
          conditional: 70,
          unconditional: 60,
          interview: 55,
          payment: 45,
          cas: 40,
          visa: 38,
        },
        {
          name: 'Summer (Jul - Sep)',
          submitted: 150,
          conditional: 120,
          unconditional: 100,
          interview: 90,
          payment: 85,
          cas: 80,
          visa: 75,
        },
        {
          name: 'Fall (Oct - Dec)',
          submitted: 200,
          conditional: 160,
          unconditional: 140,
          interview: 125,
          payment: 110,
          cas: 105,
          visa: 95,
        }
      ],
      recentLeads: leadProfiles.slice(0, 5).map(lead => {
        const user = users.find(u => u.id === lead.userId);
        return {
          ...lead,
          email: user?.email || null,
          phone: user?.phone || null,
        };
      }),
    };
  },
};

// Lookup Services (mock - no backend endpoints yet)
export const lookupService = {
  async getCountries() {
    await delay(100);
    return countries;
  },

  async getStates(countryId) {
    await delay(100);
    return states.filter(s => s.sysCountryId === countryId);
  },

  async getCities(stateId) {
    await delay(100);
    return cities.filter(c => c.sysStateId === stateId);
  },

  async getProgrammes() {
    await delay(100);
    return programmes;
  },

  async getDegrees() {
    await delay(100);
    return academicDegrees;
  },

  async getEnglishTests() {
    await delay(100);
    return englishTests;
  },

  async getIntakes() {
    await delay(100);
    return intakes;
  },
};

export default {
  leadService,
  universityService,
  dashboardService,
  lookupService,
};
