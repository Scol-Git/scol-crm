// CRM Dashboard. Verified live against the dev backend.
//   GET /crm/dashboard?startDate=&endDate=&recentLeadLimit=
import { api } from './apiClient';
import { LEAD_STATUS } from './mappers';

const QUARTER_LABELS = {
  1: 'Winter (Jan - Mar)',
  2: 'Spring (Apr - Jun)',
  3: 'Summer (Jul - Sep)',
  4: 'Fall (Oct - Dec)',
};

export const crmDashboardService = {
  async getStats({ dateFrom, dateTo, recentLeadLimit = 5 } = {}) {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set('startDate', dateFrom);
    if (dateTo) qs.set('endDate', dateTo);
    if (recentLeadLimit) qs.set('recentLeadLimit', String(recentLeadLimit));

    const d = await api.get(`/crm/dashboard${qs.toString() ? `?${qs}` : ''}`);

    const lead = d?.leadStatistics ?? {};
    const enrol = d?.enrollmentStatistics ?? {};
    const dist = d?.leadStatusDistribution ?? {};
    const quick = d?.quickOverview ?? {};

    return {
      totalLeads: lead.totalLead ?? 0,
      onlineLeads: lead.onlineLead ?? 0,
      offlineLeads: lead.offlineLead ?? 0,
      loggedInLeads: lead.loggedInLead ?? 0,

      totalEnrollment: enrol.totalEnrollment ?? 0,
      onlineEnrollment: enrol.onlineEnrollment ?? 0,
      physicalEnrollment: enrol.physicalEnrollment ?? 0,

      eligibleLeadRate: quick.eligibleLeadRate ?? 0,
      applicationRate: quick.applicationRate ?? 0,
      visaRate: quick.visaRate ?? 0,
      enrollRate: quick.enrollRate ?? 0,

      // Keyed by the labels the Dashboard's status chart already renders.
      leadsByStatus: {
        [LEAD_STATUS.label('NewLead')]: dist.newLead ?? 0,
        [LEAD_STATUS.label('Eligible')]: dist.eligible ?? 0,
        [LEAD_STATUS.label('NotEligible')]: dist.notEligible ?? 0,
        [LEAD_STATUS.label('Unreachable')]: dist.unreachable ?? 0,
        [LEAD_STATUS.label('Visited')]: dist.visited ?? 0,
      },

      // One row per intake quarter for the stacked stage chart.
      applicationStatuses: (d?.applicationStatisticsByIntake ?? []).map((r) => ({
        name: `${QUARTER_LABELS[r.quarter] ?? `Q${r.quarter}`} ${r.intakeYear ?? ''}`.trim(),
        submitted: r.submitted ?? 0,
        conditional: r.conditionalOffer ?? 0,
        unconditional: r.unconditionalOffer ?? 0,
        interview: r.interview ?? 0,
        payment: r.payment ?? 0,
        cas: r.casOrCoeOrI20 ?? 0,
        visa: r.visa ?? 0,
      })),

      recentLeads: (d?.recentLeads ?? []).map((l, i) => ({
        id: `${l.phone ?? l.email ?? 'lead'}-${i}`,
        fullName: l.name ?? null,
        email: l.email ?? null,
        phone: l.phone ?? null,
        targetUniversity: l.targetUniversity ?? null,
        status: l.status ?? null,
      })),

      _raw: d,
    };
  },
};

export default crmDashboardService;
