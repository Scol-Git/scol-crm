// Course search + course details, backed by the real SCOL search endpoints.
//
// These live under /search and /courses rather than /crm. They're the lead-facing
// discovery endpoints, but they're the only real source of course/university data
// the backend exposes, and they work with or without a token.
//
// Contracts used here (all verified against the live QA backend):
//   POST /search              SearchRequestDto          -> SearchResponseDto
//   POST /search/advanced     AdvancedSearchRequestDto  -> SearchResponseDto
//   GET  /search/advanced/filters                       -> { filters: [{ name, values[] }] }
//   GET  /categories/cities?countryId=<uuid>            -> { cities: [{ id, name }] }
//   GET  /courses/{id}                                  -> CourseDetailsResponseDto
import { api, extractList } from './apiClient';

const PAGE_LIMIT = 15;

export const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
];

// A course card. `courseId` is documented as "Course intake ID" - it's the id
// GET /courses/{id} expects, so it's what we navigate with.
const normalizeCourse = (raw) => ({
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

// Maps the Advanced Search modal's state onto AdvancedSearchRequestDto.
// Intake months come from the month chips: the backend takes a *range*
// (fromMonth/toMonth), so we send the span covering the selected months.
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
  // Plain text search. searchText matches course name, university and country.
  async search({ searchText, cursor, limit } = {}) {
    const data = await api.post('/search', {
      pagination: { limit: limit ?? PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
      ...(searchText?.trim() ? { searchText: searchText.trim() } : {}),
    });
    const { items, pagination } = extractList(data, ['courses']);
    return { courses: items.map(normalizeCourse), pagination };
  },

  // Faceted search - the Advanced Search modal.
  async searchAdvanced({ filters, ranges, flags, cursor, limit } = {}) {
    const data = await api.post('/search/advanced', {
      pagination: { limit: limit ?? PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
      ...(filters ? { filters } : {}),
      ...(ranges ? { ranges } : {}),
      ...(flags ? { flags } : {}),
    });
    const { items, pagination } = extractList(data, ['courses']);
    return { courses: items.map(normalizeCourse), pagination };
  },

  async getById(courseId) {
    const data = await api.get(`/courses/${courseId}`);
    return {
      course: data?.courseDetails ?? null,
      // meta[] carries the tooltip copy, keyed by infoKey (rankingMetaData, ...)
      meta: Object.fromEntries((data?.meta ?? []).map((m) => [m.infoKey, m])),
    };
  },

  // Country + programme lookups. This endpoint is public and is currently the
  // only real source for either (there is no /crm lookup endpoint yet).
  async getFilterOptions() {
    const data = await api.get('/search/advanced/filters');
    const byName = Object.fromEntries((data?.filters ?? []).map((f) => [f.name, f.values ?? []]));
    return {
      countries: byName.country ?? [],
      programmes: byName.programme ?? [],
    };
  },

  // Cities are cascading: the countryId query param is REQUIRED. Without it the
  // endpoint returns an empty array rather than an error, which reads as "no
  // cities exist". The backend also returns duplicate names with distinct ids,
  // so de-dupe by name to keep the dropdown usable.
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
