// Application Services
import { applications, journeyEvents, tasks, monthlyStats, countryStats } from '../mockData/applications';
import { leadProfiles, users, universities, courses, programmes, academicDegrees } from '../mockData';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const applicationService = {
  async getAll() {
    await delay();
    return applications.map(app => {
      const lead = leadProfiles.find(l => l.id === app.leadId);
      const user = users.find(u => u.id === lead?.userId);
      const course = courses.find(c => c.id === app.uniCourseId);
      const university = universities.find(u => u.id === course?.uniId);
      const programme = programmes.find(p => p.id === course?.sysProgrammeId);

      return {
        ...app,
        lead: lead ? { ...lead, email: user?.email, phone: user?.phone } : null,
        course: course ? { ...course, programme } : null,
        university,
      };
    });
  },

  async getById(id) {
    await delay();
    const app = applications.find(a => a.id === id);
    if (!app) return null;

    const lead = leadProfiles.find(l => l.id === app.leadId);
    const user = users.find(u => u.id === lead?.userId);
    const course = courses.find(c => c.id === app.uniCourseId);
    const university = universities.find(u => u.id === course?.uniId);
    const programme = programmes.find(p => p.id === course?.sysProgrammeId);
    const degree = academicDegrees.find(d => d.id === course?.sysDegreeId);

    return {
      ...app,
      lead: lead ? { ...lead, email: user?.email, phone: user?.phone } : null,
      course: course ? { ...course, programme, degree } : null,
      university,
    };
  },

  async getByLead(leadId) {
    await delay();
    return applications
      .filter(app => app.leadId === leadId)
      .map(app => {
        const course = courses.find(c => c.id === app.uniCourseId);
        const university = universities.find(u => u.id === course?.uniId);
        const programme = programmes.find(p => p.id === course?.sysProgrammeId);

        return {
          ...app,
          course: course ? { ...course, programme } : null,
          university,
        };
      });
  },

  async create(appData) {
    await delay();
    const newId = `app${applications.length + 1}`;
    return {
      id: newId,
      ...appData,
      status: 'draft',
      appliedDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
    };
  },

  async updateStatus(id, status, notes) {
    await delay();
    return { success: true, status, notes };
  },
};

export const journeyService = {
  async getByLead(leadId) {
    await delay();
    return journeyEvents
      .filter(event => event.leadId === leadId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async addEvent(leadId, eventData) {
    await delay();
    const newId = `je${journeyEvents.length + 1}`;
    return {
      id: newId,
      leadId,
      ...eventData,
      date: new Date().toISOString().split('T')[0],
    };
  },
};

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
  journeyService,
  taskService,
  reportService,
};
