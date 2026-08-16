export { default as Dashboard } from './Dashboard';
export { LeadList, LeadDetails } from './Leads';
export { CourseList, CourseDetails } from './Courses';
// University list is superseded by Courses; the details page is still reachable
// by clicking a university name on a course.
export { UniversityDetails } from './Universities';
export { default as Settings } from './Settings';
export { Applications, ApplicationDetails } from './Applications';
export { default as Tasks } from './Tasks';
export { default as Reports } from './Reports';
export { Login, Register, ForgotPassword, VerifyOtp } from './Auth';
