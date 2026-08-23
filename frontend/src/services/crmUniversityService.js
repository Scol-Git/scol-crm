// CRM University endpoints. Verified live against the dev backend.
//
//   GET   /crm/universities/{uniId}                        -> { university, totalCourses,
//                                                               activeIntakes, commission,
//                                                               customApplicationStageFlow, meta }
//   PATCH /crm/universities/{uniId}                         UpdateCrmUniversityRequestDto (ADMIN)
//   PUT   /crm/universities/{uniId}/application-stage-flow  UpdateCrmUniversityStageFlowRequestDto (ADMIN)
import { api } from './apiClient';

export const crmUniversityService = {
  async getById(uniId) {
    const data = await api.get(`/crm/universities/${uniId}`);
    const u = data?.university ?? {};

    return {
      id: u.uniId ?? uniId,
      uniName: u.uniName ?? null,
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

  // Partial update — ADMIN only. `aboutUs` is a single string with paragraphs
  // separated by blank lines, not the array the read endpoint returns.
  async update(uniId, patch) {
    return api.patch(`/crm/universities/${uniId}`, patch);
  },

  // Idempotent full replace — every stage must carry stageId, displayOrder and
  // isEnabled. Display order only; it does not change the live workflow.
  async replaceStageFlow(uniId, stages) {
    return api.put(`/crm/universities/${uniId}/application-stage-flow`, { stages });
  },
};

export default crmUniversityService;
