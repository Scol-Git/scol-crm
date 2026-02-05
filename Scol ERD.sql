CREATE TABLE "sys_Users" (
  "id" uuid PRIMARY KEY,
  "email" varchar,
  "phone" varchar UNIQUE NOT NULL,
  "passwordHash" varchar NOT NULL,
  "accountStatus" varchar,
  "userType" varchar,
  "passResetTokenHash" varchar,
  "passResetTokenExpiredAt" timestamp,
  "isPhoneVerified" boolean,
  "failedLoginAttempts" int,
  "lockedUntil" timestamp
);

CREATE TABLE "sys_LeadProfiles" (
  "id" uuid PRIMARY KEY,
  "userId" uuid UNIQUE NOT NULL,
  "fullName" varchar,
  "dob" date,
  "gender" varchar,
  "address" varchar,
  "city" varchar,
  "imgUrl" varchar
);

CREATE TABLE "sys_AcademicDegrees" (
  "id" uuid PRIMARY KEY,
  "degreeName" varchar NOT NULL,
  "gpaScale" decimal,
  "levelOrder" int NOT NULL
);

CREATE TABLE "LeadAcademicResults" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "sysDegreeId" uuid NOT NULL,
  "institute" varchar,
  "gpa" decimal,
  "passingDate" date,
  "isVerified" boolean
);

CREATE TABLE "sys_EnglishTests" (
  "id" uuid PRIMARY KEY,
  "testName" varchar NOT NULL,
  "maxScore" decimal
);

CREATE TABLE "sys_EnglishTestSections" (
  "id" uuid PRIMARY KEY,
  "testId" uuid NOT NULL,
  "sectionName" varchar NOT NULL,
  "maxScore" decimal
);

CREATE TABLE "LeadEnglishTestResults" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "sysEngTestId" uuid NOT NULL,
  "testDate" date,
  "overallScore" decimal,
  "isVerified" boolean
);

CREATE TABLE "LeadEnglishTestSectionResults" (
  "id" uuid PRIMARY KEY,
  "resultId" uuid NOT NULL,
  "sysEngTestSectionId" uuid NOT NULL,
  "sectionScore" decimal
);

CREATE TABLE "sys_Countries" (
  "id" uuid PRIMARY KEY,
  "countryName" varchar
);

CREATE TABLE "LeadPreferredCountries" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "sysCountryId" uuid NOT NULL
);

CREATE TABLE "sys_Programmes" (
  "id" uuid PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "LeadPreferredPrograms" (
  "id" uuid PRIMARY KEY,
  "leadId" uuid NOT NULL,
  "programmeId" uuid NOT NULL
);

CREATE TABLE "sys_Roles" (
  "id" uuid PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "sys_Permissions" (
  "id" uuid PRIMARY KEY,
  "name" varchar
);

CREATE TABLE "UserRoles" (
  "userId" uuid,
  "roleId" uuid,
  "createdAt" timestamp,
  "updatedAt" timestamp,
  PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "UserPermissions" (
  "userId" uuid,
  "permissionId" uuid,
  "createdAt" timestamp,
  "updatedAt" timestamp,
  PRIMARY KEY ("userId", "permissionId")
);

CREATE TABLE "UserSessions" (
  "id" uuid PRIMARY KEY,
  "userId" uuid,
  "refreshTokenHash" varchar,
  "expiresAt" timestamp,
  "revokedAt" timestamp,
  "ipAddress" varchar,
  "userAgent" varchar
);

CREATE TABLE "otp_sessions" (
  "id" uuid PRIMARY KEY,
  "phone" varchar,
  "purpose" varchar,
  "sessionId" varchar,
  "passwordHash" varchar,
  "fullName" varchar,
  "attemptCount" int,
  "resendCount" int,
  "expiresAt" timestamp,
  "lastOtpSentAt" timestamp,
  "otpHash" varchar,
  "otpAttempts" int,
  "otpCreatedAt" timestamp
);

CREATE TABLE "sys_States" (
  "id" uuid PRIMARY KEY,
  "sysCountryId" uuid NOT NULL,
  "stateName" varchar NOT NULL
);

CREATE TABLE "sys_Cities" (
  "id" uuid PRIMARY KEY,
  "sysStateId" uuid NOT NULL,
  "cityName" varchar NOT NULL
);

CREATE TABLE "sys_Intakes" (
  "id" uuid PRIMARY KEY,
  "name" varchar NOT NULL,
  "intakeMonth" int
);

CREATE TABLE "sys_Universities" (
  "id" uuid PRIMARY KEY,
  "uniName" varchar NOT NULL,
  "sysCountryId" uuid NOT NULL,
  "sysStateId" uuid,
  "sysCityId" uuid,
  "logoUrl" varchar,
  "website" varchar,
  "aboutUs" varchar,
  "address" varchar,
  "coverImageUrl" varchar,
  "campusLifeLinks" array,
  "commission" decimal
);

CREATE TABLE "UniIntakes" (
  "id" uuid PRIMARY KEY,
  "uniId" uuid NOT NULL,
  "sysIntakeId" uuid NOT NULL,
  "intakeName" varchar
);

CREATE TABLE "UniCourses" (
  "id" uuid PRIMARY KEY,
  "uniId" uuid NOT NULL,
  "sysProgrammeId" uuid NOT NULL,
  "sysDegreeId" uuid NOT NULL,
  "courseName" varchar NOT NULL,
  "minSysDegreeId" uuid,
  "minGpa" decimal
);

CREATE TABLE "UniCourseIntakes" (
  "id" uuid PRIMARY KEY,
  "uniCourseId" uuid NOT NULL,
  "uniIntakeId" uuid NOT NULL,
  "intakeYear" int,
  "courseDuration" int,
  "applicationDeadline" date,
  "tuitionFee" decimal,
  "currency" varchar,
  "initialDeposit" decimal,
  "isActive" boolean
);

CREATE TABLE "CourseIntakeScholarships" (
  "id" uuid PRIMARY KEY,
  "courseIntakeId" uuid NOT NULL,
  "name" varchar NOT NULL,
  "maxAmount" decimal,
  "criteriaJson" varchar,
  "isActive" boolean
);

CREATE TABLE "UniAcademicReq" (
  "id" uuid PRIMARY KEY,
  "uniId" uuid NOT NULL,
  "sysDegreeId" uuid NOT NULL,
  "minGpa" decimal
);

CREATE TABLE "UniEngReq" (
  "id" uuid PRIMARY KEY,
  "uniId" uuid NOT NULL,
  "sysEngTestId" uuid NOT NULL,
  "minOverallReq" decimal,
  "minSectionReq" decimal
);

CREATE TABLE "CourseEngReq" (
  "id" uuid PRIMARY KEY,
  "uniCourseId" uuid NOT NULL,
  "sysEngTestId" uuid NOT NULL,
  "minOverallReq" decimal,
  "minSectionReq" decimal
);

ALTER TABLE "sys_LeadProfiles" ADD FOREIGN KEY ("userId") REFERENCES "sys_Users" ("id");

ALTER TABLE "LeadAcademicResults" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id");

ALTER TABLE "LeadAcademicResults" ADD FOREIGN KEY ("sysDegreeId") REFERENCES "sys_AcademicDegrees" ("id");

ALTER TABLE "sys_EnglishTestSections" ADD FOREIGN KEY ("testId") REFERENCES "sys_EnglishTests" ("id");

ALTER TABLE "LeadEnglishTestResults" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id");

ALTER TABLE "LeadEnglishTestResults" ADD FOREIGN KEY ("sysEngTestId") REFERENCES "sys_EnglishTests" ("id");

ALTER TABLE "LeadEnglishTestSectionResults" ADD FOREIGN KEY ("resultId") REFERENCES "LeadEnglishTestResults" ("id");

ALTER TABLE "LeadEnglishTestSectionResults" ADD FOREIGN KEY ("sysEngTestSectionId") REFERENCES "sys_EnglishTestSections" ("id");

ALTER TABLE "LeadPreferredCountries" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id");

ALTER TABLE "LeadPreferredCountries" ADD FOREIGN KEY ("sysCountryId") REFERENCES "sys_Countries" ("id");

ALTER TABLE "LeadPreferredPrograms" ADD FOREIGN KEY ("leadId") REFERENCES "sys_LeadProfiles" ("id");

ALTER TABLE "LeadPreferredPrograms" ADD FOREIGN KEY ("programmeId") REFERENCES "sys_Programmes" ("id");

ALTER TABLE "UserRoles" ADD FOREIGN KEY ("userId") REFERENCES "sys_Users" ("id");

ALTER TABLE "UserRoles" ADD FOREIGN KEY ("roleId") REFERENCES "sys_Roles" ("id");

ALTER TABLE "UserPermissions" ADD FOREIGN KEY ("userId") REFERENCES "sys_Users" ("id");

ALTER TABLE "UserPermissions" ADD FOREIGN KEY ("permissionId") REFERENCES "sys_Permissions" ("id");

ALTER TABLE "UserSessions" ADD FOREIGN KEY ("userId") REFERENCES "sys_Users" ("id");

ALTER TABLE "sys_States" ADD FOREIGN KEY ("sysCountryId") REFERENCES "sys_Countries" ("id");

ALTER TABLE "sys_Cities" ADD FOREIGN KEY ("sysStateId") REFERENCES "sys_States" ("id");

ALTER TABLE "UniIntakes" ADD FOREIGN KEY ("uniId") REFERENCES "sys_Universities" ("id");

ALTER TABLE "UniCourses" ADD FOREIGN KEY ("uniId") REFERENCES "sys_Universities" ("id");

ALTER TABLE "UniCourseIntakes" ADD FOREIGN KEY ("uniCourseId") REFERENCES "UniCourses" ("id");

ALTER TABLE "CourseIntakeScholarships" ADD FOREIGN KEY ("courseIntakeId") REFERENCES "UniCourseIntakes" ("id");

ALTER TABLE "UniAcademicReq" ADD FOREIGN KEY ("uniId") REFERENCES "sys_Universities" ("id");

ALTER TABLE "UniEngReq" ADD FOREIGN KEY ("uniId") REFERENCES "sys_Universities" ("id");

ALTER TABLE "CourseEngReq" ADD FOREIGN KEY ("uniCourseId") REFERENCES "UniCourses" ("id");

ALTER TABLE "UniCourseIntakes" ADD FOREIGN KEY ("uniIntakeId") REFERENCES "UniIntakes" ("id");
