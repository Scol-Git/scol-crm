// Course search, details and editing — backed by the CRM course endpoints.
//
// Contracts verified live against the dev backend on 2026-08-23:
//   POST  /crm/search                 CrmCourseSearchRequestDto -> { pagination, courses[] }
//   GET   /crm/search/filters                                   -> { filters: [{ name, values[] }] }
//   GET   /crm/courses/{courseId}                               -> { courseDetails, meta[] }
//   PATCH /crm/courses/{courseId}     UpdateCrmCourseRequestDto  (ADMIN only)
//   GET   /categories/cities?countryId=<uuid>                    -> { cities: [{ id, name }] }
//
// These replace the lead-facing /search, /search/advanced and /courses/{id}
// endpoints the CRM used before the backend grew /crm equivalents.
import { api, extractList } from './apiClient';

const PAGE_LIMIT = 15;

export const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
];

// `courseId` is the course-intake id; the CRM course-details endpoint documents
// it as "the same identifier returned by search/list endpoints".
const normalizeCourse = (raw = {}) => ({
  id: raw.courseId,
  name: raw.courseName,
  imgUrl: raw.imgUrl ?? raw.university?.imgUrl ?? null,
  university: {
    id: raw.university?.id ?? null,
    name: raw.university?.name ?? null,
    country: raw.university?.country ?? null,
    state: raw.university?.state ?? null,
    city: raw.university?.city ?? null,
    logoUrl: raw.university?.logoUrl ?? null,
    imgUrl: raw.university?.imgUrl ?? null,
  },
  intake: raw.intake ? { name: raw.intake.name, year: raw.intake.year } : null,
  tuitionFee: raw.tuitionFee ?? null,
  currency: raw.currency ?? null,
  durationMonths: raw.durationMonths ?? null,
  initialDeposit: raw.initialDeposit ?? null,
  applicationFee: raw.applicationFee ?? null,
  hasScholarship: !!raw.isScholarshipAvailable,
  engRequirements: raw.engRequirements ?? [],
  _raw: raw,
});

// Maps the Advanced Search modal onto SearchFiltersDto / SearchRangesDto /
// SearchFlagsDto (shared by /search and /crm/search). Intake months come from
// the chips; the backend takes a range, so we send the span they cover.
export const buildCourseQuery = ({
  countryId, cityId, programmeId,
  intakeYear, intakeMonths = [],
  tuitionMin, tuitionMax,
  durationMinMonths, durationMaxMonths,
  hasScholarship,
} = {}) => {
  const filters = {};
  if (countryId) filters.countryIds = [countryId];
  if (cityId) filters.cityIds = [cityId];
  if (programmeId) filters.programmeIds = [programmeId];

  const months = [...intakeMonths].sort((a, b) => a - b);
  if (intakeYear && months.length) {
    filters.intake = { year: Number(intakeYear), fromMonth: months[0], toMonth: months[months.length - 1] };
  } else if (intakeYear) {
    filters.intake = { year: Number(intakeYear), fromMonth: 1, toMonth: 12 };
  }

  const ranges = {};
  if (tuitionMin != null || tuitionMax != null) {
    ranges.tuitionFee = {
      ...(tuitionMin != null ? { min: Number(tuitionMin) } : {}),
      ...(tuitionMax != null ? { max: Number(tuitionMax) } : {}),
    };
  }
  if (durationMinMonths != null || durationMaxMonths != null) {
    ranges.durationMonths = {
      ...(durationMinMonths != null ? { min: Number(durationMinMonths) } : {}),
      ...(durationMaxMonths != null ? { max: Number(durationMaxMonths) } : {}),
    };
  }

  const flags = {};
  if (hasScholarship === true || hasScholarship === false) flags.hasScholarship = hasScholarship;

  return {
    ...(Object.keys(filters).length ? { filters } : {}),
    ...(Object.keys(ranges).length ? { ranges } : {}),
    ...(Object.keys(flags).length ? { flags } : {}),
  };
};

export const courseService = {
  // One endpoint covers both plain text and faceted search.
  async search({ searchText, filters, ranges, flags, cursor, limit } = {}) {
    const data = await api.post('/crm/search', {
      pagination: { limit: limit ?? PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
      ...(searchText?.trim() ? { searchText: searchText.trim() } : {}),
      ...(filters ? { filters } : {}),
      ...(ranges ? { ranges } : {}),
      ...(flags ? { flags } : {}),
    });
    const { items, pagination } = extractList(data, ['courses']);
    return { courses: items.map(normalizeCourse), pagination };
  },

  // Kept as an alias so existing callers that distinguished the two still work.
  async searchAdvanced(opts) {
    return this.search(opts);
  },

  async getById(courseId) {
    const data = await api.get(`/crm/courses/${courseId}`);
    return {
      course: data?.courseDetails ?? null,
      // meta[] carries tooltip copy keyed by infoKey (rankingMetaData, …)
      meta: Object.fromEntries((data?.meta ?? []).map((m) => [m.infoKey, m])),
    };
  },

  // Partial update — ADMIN only. Only send the fields being changed.
  async update(courseId, patch) {
    return api.patch(`/crm/courses/${courseId}`, patch);
  },

  async getFilterOptions() {
    const data = await api.get('/crm/search/filters');
    const byName = Object.fromEntries((data?.filters ?? []).map((f) => [f.name, f.values ?? []]));
    return {
      countries: byName.country ?? [],
      programmes: byName.programme ?? [],
      raw: byName,
    };
  },

  // Cities cascade off country. `countryId` is a REQUIRED query param: without
  // it the endpoint returns an empty array rather than an error. The backend
  // also returns duplicate names with distinct ids, so de-dupe by name.
  async getCities(countryId) {
    if (!countryId) return [];
    const data = await api.get(`/categories/cities?countryId=${encodeURIComponent(countryId)}`);
    const cities = data?.cities ?? [];
    const seen = new Set();
    return cities.filter((c) => {
      const key = (c.name ?? '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
};

export default courseService;
