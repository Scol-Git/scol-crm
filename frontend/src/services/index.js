// API Simulation Services
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
  leadAcademicResults,
  leadEnglishTestResults,
  detailedCourses,
} from '../mockData';

// Import additional services
export { applicationService, journeyService, taskService, reportService } from './applicationService';
export { authService } from './authService';

// Simulate API delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Lead Services
export const leadService = {
  async getAll() {
    await delay();
    return leadProfiles.map(lead => {
      const user = users.find(u => u.id === lead.userId);
      return {
        ...lead,
        email: user?.email || null,
        phone: user?.phone || null,
      };
    });
  },

  async getById(id) {
    await delay();
    const lead = leadProfiles.find(l => l.id === id);
    if (!lead) return null;

    const user = users.find(u => u.id === lead.userId);
    const academics = leadAcademicResults.filter(a => a.leadId === id);
    const englishResults = leadEnglishTestResults.filter(e => e.leadId === id);

    return {
      ...lead,
      email: user?.email || null,
      phone: user?.phone || null,
      academicResults: academics.map(a => ({
        ...a,
        degree: academicDegrees.find(d => d.id === a.sysDegreeId),
      })),
      englishTestResults: englishResults.map(e => ({
        ...e,
        test: englishTests.find(t => t.id === e.sysEngTestId),
      })),
    };
  },

  async create(leadData) {
    await delay();
    const newId = `lp${leadProfiles.length + 1}`;
    const newUserId = `u${users.length + 1}`;

    const newLead = {
      id: newId,
      userId: newUserId,
      fullName: leadData.fullName,
      dob: leadData.dob || null,
      gender: leadData.gender || null,
      address: leadData.address || null,
      city: leadData.city || null,
      imgUrl: null,
      status: 'eligible',
      targetCountry: leadData.targetCountry || null,
      consultantName: leadData.consultantName || null,
      englishTestPassed: leadData.englishTestPassed || false,
      email: leadData.email || null,
      phone: leadData.phone,
    };

    return newLead;
  },

  async update(id, leadData) {
    await delay();
    const index = leadProfiles.findIndex(l => l.id === id);
    if (index === -1) return null;

    return { ...leadProfiles[index], ...leadData };
  },

  async delete(id) {
    await delay();
    return { success: true };
  },

  async search(query) {
    await delay();
    const lowerQuery = query.toLowerCase();
    return leadProfiles
      .map(lead => {
        const user = users.find(u => u.id === lead.userId);
        return {
          ...lead,
          email: user?.email || null,
          phone: user?.phone || null,
        };
      })
      .filter(lead =>
        lead.fullName?.toLowerCase().includes(lowerQuery) ||
        lead.email?.toLowerCase().includes(lowerQuery) ||
        lead.phone?.includes(query)
      );
  },
};

// University Services
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

// Course Services
export const courseService = {
  async getAll() {
    await delay();
    return courses.map(course => ({
      ...course,
      university: universities.find(u => u.id === course.uniId),
      programme: programmes.find(p => p.id === course.sysProgrammeId),
      degree: academicDegrees.find(d => d.id === course.sysDegreeId),
    }));
  },

  async getByUniversity(uniId) {
    await delay();
    return courses
      .filter(c => c.uniId === uniId)
      .map(course => ({
        ...course,
        programme: programmes.find(p => p.id === course.sysProgrammeId),
        degree: academicDegrees.find(d => d.id === course.sysDegreeId),
        intakes: courseIntakes.filter(ci => ci.uniCourseId === course.id),
      }));
  },
};

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

// Dashboard Statistics Services
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

// Lookup Services
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
  courseService,
  dashboardService,
  lookupService,
};
