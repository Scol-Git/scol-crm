// Models based on Scol ERD.sql

export interface SysUser {
  id: string;
  email: string | null;
  phone: string;
  passwordHash: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
  userType: 'lead' | 'admin' | 'counselor';
  passResetTokenHash: string | null;
  passResetTokenExpiredAt: string | null;
  isPhoneVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
}

export interface SysLeadProfile {
  id: string;
  userId: string;
  fullName: string | null;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  city: string | null;
  imgUrl: string | null;
}

export interface SysAcademicDegree {
  id: string;
  degreeName: string;
  gpaScale: number | null;
  levelOrder: number;
}

export interface LeadAcademicResult {
  id: string;
  leadId: string;
  sysDegreeId: string;
  institute: string | null;
  gpa: number | null;
  passingDate: string | null;
  isVerified: boolean;
}

export interface SysEnglishTest {
  id: string;
  testName: string;
  maxScore: number | null;
}

export interface SysEnglishTestSection {
  id: string;
  testId: string;
  sectionName: string;
  maxScore: number | null;
}

export interface LeadEnglishTestResult {
  id: string;
  leadId: string;
  sysEngTestId: string;
  testDate: string | null;
  overallScore: number | null;
  isVerified: boolean;
}

export interface LeadEnglishTestSectionResult {
  id: string;
  resultId: string;
  sysEngTestSectionId: string;
  sectionScore: number | null;
}

export interface SysCountry {
  id: string;
  countryName: string | null;
}

export interface SysState {
  id: string;
  sysCountryId: string;
  stateName: string;
}

export interface SysCity {
  id: string;
  sysStateId: string;
  cityName: string;
}

export interface LeadPreferredCountry {
  id: string;
  leadId: string;
  sysCountryId: string;
}

export interface SysProgramme {
  id: string;
  name: string | null;
}

export interface LeadPreferredProgram {
  id: string;
  leadId: string;
  programmeId: string;
}

export interface SysRole {
  id: string;
  name: string | null;
}

export interface SysPermission {
  id: string;
  name: string | null;
}

export interface UserRole {
  userId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  userId: string;
  permissionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  refreshTokenHash: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface OtpSession {
  id: string;
  phone: string | null;
  purpose: string | null;
  sessionId: string | null;
  passwordHash: string | null;
  fullName: string | null;
  attemptCount: number;
  resendCount: number;
  expiresAt: string | null;
  lastOtpSentAt: string | null;
  otpHash: string | null;
  otpAttempts: number;
  otpCreatedAt: string | null;
}

export interface SysIntake {
  id: string;
  name: string;
  intakeMonth: number | null;
}

export interface SysUniversity {
  id: string;
  uniName: string;
  sysCountryId: string;
  sysStateId: string | null;
  sysCityId: string | null;
  logoUrl: string | null;
  website: string | null;
  aboutUs: string | null;
  address: string | null;
  coverImageUrl: string | null;
  campusLifeLinks: string[] | null;
  commission: number | null;
}

export interface UniIntake {
  id: string;
  uniId: string;
  sysIntakeId: string;
  intakeName: string | null;
}

export interface UniCourse {
  id: string;
  uniId: string;
  sysProgrammeId: string;
  sysDegreeId: string;
  courseName: string;
  minSysDegreeId: string | null;
  minGpa: number | null;
}

export interface UniCourseIntake {
  id: string;
  uniCourseId: string;
  uniIntakeId: string;
  intakeYear: number | null;
  courseDuration: number | null;
  applicationDeadline: string | null;
  tuitionFee: number | null;
  currency: string | null;
  initialDeposit: number | null;
  isActive: boolean;
}

export interface CourseIntakeScholarship {
  id: string;
  courseIntakeId: string;
  name: string;
  maxAmount: number | null;
  criteriaJson: string | null;
  isActive: boolean;
}

export interface UniAcademicReq {
  id: string;
  uniId: string;
  sysDegreeId: string;
  minGpa: number | null;
}

export interface UniEngReq {
  id: string;
  uniId: string;
  sysEngTestId: string;
  minOverallReq: number | null;
  minSectionReq: number | null;
}

export interface CourseEngReq {
  id: string;
  uniCourseId: string;
  sysEngTestId: string;
  minOverallReq: number | null;
  minSectionReq: number | null;
}

// Extended types for UI usage
export interface LeadWithDetails extends SysLeadProfile {
  user?: SysUser;
  academicResults?: LeadAcademicResult[];
  englishTestResults?: LeadEnglishTestResult[];
  preferredCountries?: SysCountry[];
  preferredPrograms?: SysProgramme[];
  status?: 'new' | 'contacted' | 'qualified' | 'enrolled' | 'lost';
  targetUniversity?: string;
}

export interface UniversityWithDetails extends SysUniversity {
  country?: SysCountry;
  state?: SysState;
  city?: SysCity;
  courses?: UniCourse[];
  intakes?: UniIntake[];
}

export interface CourseWithDetails extends UniCourse {
  university?: SysUniversity;
  programme?: SysProgramme;
  degree?: SysAcademicDegree;
  intakes?: UniCourseIntake[];
}
