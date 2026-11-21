// CRM University endpoints. Verified live against the dev backend.
//
//   GET   /crm/universities/{uniId}                        -> { university, totalCourses,
//                                                               activeIntakes, commission,
//                                                               customApplicationStageFlow, meta }
//   PATCH /crm/universities/{uniId}                         UpdateCrmUniversityRequestDto (ADMIN)
//   PUT   /crm/universities/{uniId}/application-stage-flow  UpdateCrmUniversityStageFlowRequestDto (ADMIN)
//
// Draft/publish additions (Bulk_Import_Frontend_Guide.md, feature/bulk-import):
//   GET    /crm/universities?publishStatus=&importBatchId=&search=&page=&pageSize=
//                                                           -> { items, page, pageSize, total }
//   GET    /crm/universities/{uniId}/publish-preview        -> PublishPreviewResponse (ADMIN)
//   POST   /crm/universities/{uniId}/publish                -> { counts, publishedAt } (ADMIN)
//   DELETE /crm/universities/{uniId}                        never-published drafts only (ADMIN)
import { api, buildQuery } from './apiClient';

export const crmUniversityService = {
  // Counsellors always get published universities only: the backend ignores
  // publishStatus and importBatchId for them.
  async list({ publishStatus, importBatchId, search, page = 1, pageSize = 20 } = {}) {
    const data = await api.get(`/crm/universities${buildQuery({
      publishStatus, importBatchId, search: search?.trim(), page, pageSize,
    })}`);
    return {
      items: (data?.items ?? []).map((u) => ({
        // `id` is what <Table> keys its rows on.
        id: u.uniId,
        uniId: u.uniId,
        uniName: u.uniName ?? null,
        countryName: u.countryName ?? null,
        cityName: u.cityName ?? null,
        logoUrl: u.logoUrl ?? null,
        isPublished: u.isPublished !== false,
        importBatchId: u.importBatchId ?? null,
        intakeCount: u.intakeCount ?? 0,
      })),
      page: data?.page ?? page,
      pageSize: data?.pageSize ?? pageSize,
      total: data?.total ?? 0,
    };
  },

  async getById(uniId) {
    const data = await api.get(`/crm/universities/${uniId}`);
    const u = data?.university ?? {};

    return {
      id: u.uniId ?? uniId,
      uniName: u.uniName ?? null,
      // Only an explicit `false` is a draft, so a backend without the
      // draft/publish fields keeps behaving as "everything is live".
      isPublished: u.isPublished !== false,
      publishedAt: u.publishedAt ?? null,
      importBatchId: u.importBatchId ?? null,
      logoUrl: u.uniLogoUrl ?? null,
      coverImageUrl: u.uniCoverImageUrl ?? null,
      website: u.website ?? null,
      establishedYear: u.establishedYear ?? null,
      universityType: u.universityType ?? null,
      aboutUs: u.aboutUs?.description ?? [],
      campusLifeVideos: u.campusLife?.media?.videoUrl ?? [],
      location: u.location ?? null,
      ranking: u.ranking ?? null,
      totalCourses: data?.totalCourses ?? 0,
      activeIntakes: data?.activeIntakes ?? { count: 0, items: [] },
      commission: data?.commission ?? null,
      stageFlow: data?.customApplicationStageFlow ?? [],
      meta: Object.fromEntries((data?.meta ?? []).map((m) => [m.infoKey, m])),
      _raw: data,
    };
  },

  async listCountries() {
    const data = await api.get('/crm/lookups/countries');
    return data?.countries ?? [];
  },

  async listStates(countryId) {
    const data = await api.get(`/crm/lookups/states${buildQuery({ countryId })}`);
    return data?.states ?? [];
  },

  async listCities(stateId) {
    const data = await api.get(`/crm/lookups/cities${buildQuery({ stateId })}`);
    return data?.cities ?? [];
  },

  // Partial update — ADMIN only. `aboutUs` is a single string with paragraphs
  // separated by blank lines, not the array the read endpoint returns.
  async listIntakes(uniId) {
    const data = await api.get(`/crm/universities/${uniId}/intakes`);
    return data?.intakes ?? [];
  },

  async updateIntakeFees(uniId, body) {
    return api.post(`/crm/universities/${uniId}/intake-fees`, body);
  },

  async update(uniId, patch) {
    return api.patch(`/crm/universities/${uniId}`, patch);
  },

  // Presign, PUT the image straight to the public bucket, then confirm.
  // Confirm saves the permanent file URL on coverImageUrl or logoUrl.
  async uploadAsset(uniId, kind, file) {
    const ticket = await api.post(`/crm/universities/${uniId}/assets/upload-url`, {
      kind,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    });
    const uploadUrl = ticket?.uploadUrl;
    if (!uploadUrl) throw new Error('The server did not return an upload URL.');

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type, ...(ticket?.headers ?? {}) },
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed (${put.status}). Please try again.`);

    return api.post(`/crm/universities/${uniId}/assets/confirm`, {
      kind,
      storageKey: ticket.storageKey,
    });
  },

  // Idempotent full replace — every stage must carry stageId, displayOrder and
  // isEnabled. Display order only; it does not change the live workflow.
  async replaceStageFlow(uniId, stages) {
    return api.put(`/crm/universities/${uniId}/application-stage-flow`, { stages });
  },

  // Counts include the draft country/state/city the university brings along.
  async publishPreview(uniId) {
    return api.get(`/crm/universities/${uniId}/publish-preview`);
  },

  // Publishes the university only. Its courses stay drafts; they go live
  // through their batch.
  async publish(uniId) {
    return api.post(`/crm/universities/${uniId}/publish`);
  },

  // 409 "Delete its courses first" while it still has courses;
  // 409 "Only never-published drafts can be deleted" otherwise.
  async deleteDraft(uniId) {
    return api.delete(`/crm/universities/${uniId}`);
  },
};

export default crmUniversityService;
