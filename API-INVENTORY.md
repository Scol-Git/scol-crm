# SCOL CRM — API Inventory

What the backend has, and what we still need.

> **API-side problems live in [BACKEND-ISSUES.md](BACKEND-ISSUES.md)** — that's the list for the backend team. This file is the endpoint inventory and our own frontend status.

**Source:** `https://scol-backend-qa.vercel.app/swagger-json` · **Checked:** 2026-08-13 · **55 endpoints**

| | |
| --- | --- |
| CRM endpoints (`/crm/*`) | 23 |
| — reachable from the UI | 22 |
| — exist but unused | 1 |
| Features still on mock data | 5 |
| New endpoints needed | ~30 |

---

## What we have

All `…` paths below are under `/crm/leads/{leadId}/applications/{applicationId}`.
"Screen" is the page a user is on; "Call site" is the file that makes the request.

### CRM Leads — 4 (all wired ✅)

| Endpoint | Screen — what it powers | Call site |
| --- | --- | --- |
| `POST /crm/leads/list` | **Leads** — the table, plus server-side search, filters and Load more. Also backs the direct-URL lookup on **Lead Details**. | `leadService.getAll` → `LeadList.jsx` |
| `POST /crm/leads` | **Leads** — "Add Lead" modal | `leadService.create` → `LeadList.jsx` |
| `PUT /crm/leads/{leadId}` | **Leads** and **Lead Details** — "Edit Lead" modals | `leadService.update` → `LeadList.jsx`, `LeadDetails.jsx` |
| `GET /crm/leads/dropdown-data` | **Leads** and **Lead Details** — Target Country / Consultant selects, and the country filter | `leadService.getDropdownData` → `LeadList.jsx`, `LeadDetails.jsx` |

### CRM Applications — 10 (9 wired)

| Endpoint | Screen — what it powers | Call site |
| --- | --- | --- |
| `POST /crm/applications/list` | **Applications** — the table, plus search, filters and Load more. Also resolves the owning lead on **Application Details** opened by direct URL. | `getAll` / `findLeadId` → `Applications.jsx` |
| `GET …` (single application) | **Application Details** — header, course, university, status/stage badges | `getById` → `ApplicationDetails.jsx` |
| `GET …/activities` | **Application Details** — "Recent Activity" timeline | `getActivities` → `ApplicationDetails.jsx` |
| `GET …/document-progress` | **Application Details** — the Documents panel rows | `getDocumentProgress` → `ApplicationDetails.jsx` |
| `GET …/stage-progress` | **Application Details** — the progress stepper (real per-application progress, not the generic stage list) | `getStageProgress` → `ApplicationDetails.jsx` |
| `POST …/status-changes` | **Applications** ("Update Status" row action) and **Application Details** ("Update Status" button) | `changeStatus` → `Applications.jsx`, `ApplicationDetails.jsx` |
| `POST …/stage-changes` | **Application Details** — "Update Stage" button | `changeStage` → `ApplicationDetails.jsx` |
| `GET /crm/leads/{leadId}/applications` | **Lead Details** — the "Applications" card listing that lead's applications | `getByLead` → `LeadDetails.jsx` |
| `GET /crm/applications/dropdown-data` | **Applications** — the Consultant filter dropdown | `getDropdownData` → `Applications.jsx` |
| `POST /crm/leads/{leadId}/applications` | ⛔ **Not wired** — no screen. See below. | `create` (service only) |

### CRM Notes — 4 (all wired ✅)

All on **Application Details** → "Notes & Comments" panel, except where noted.

| Endpoint | What it powers | Call site |
| --- | --- | --- |
| `GET …/notes` | Renders the notes list | `getNotes` → `ApplicationDetails.jsx` |
| `POST …/notes` | "Add" button — also the "Add Note" row action on **Applications** | `addNote` → `ApplicationDetails.jsx`, `Applications.jsx` |
| `PUT …/notes/{noteId}` | Inline "Edit" (save) and the Resolve/Reopen toggle | `updateNote` → `ApplicationDetails.jsx` |
| `DELETE …/notes/{noteId}` | "Delete" button, behind a confirm dialog | `deleteNote` → `ApplicationDetails.jsx` |

### CRM Documents — 5 (all wired ✅)

All on **Application Details** → "Documents" panel. Every row is one document requirement.

| Endpoint | What it powers | Call site |
| --- | --- | --- |
| `POST …/document-types/{id}/upload-url` | "Upload" / "Replace" — step 1, asks for the presigned URL | `uploadDocument` → `ApplicationDetails.jsx` |
| `POST …/document-types/{id}/confirm-upload` | "Upload" / "Replace" — step 3, confirms after the file is PUT to storage | `uploadDocument` → `ApplicationDetails.jsx` |
| `POST …/document-types/{id}/status-changes` | "Verify" on a row with **no uploaded file** (requirement status) | `changeRequirementStatus` → `ApplicationDetails.jsx` |
| `POST …/documents/{id}/status-changes` | "Verify" / "Reject" on a row **with** an uploaded file (document status; Reject prompts for remarks) | `changeDocumentStatus` → `ApplicationDetails.jsx` |
| `GET …/documents/{id}/download` | "Download" — opens the returned signed URL in a new tab | `getDocumentDownload` → `ApplicationDetails.jsx` |

> ⚠️ **Requirement vs document is a real distinction.** A *requirement* is the slot (`documentTypeId`, statuses `PENDING`/`IN_PROGRESS`/`VERIFIED`); a *document* is the uploaded file (`documentId`, adds `REJECTED`). They are separate endpoints with separate enums — a requirement cannot be rejected. `normalizeDocumentRequirement` keeps both ids so the panel calls the right one.

### The one remaining unused endpoint

**`POST /crm/leads/{leadId}/applications`** — deliberately left unwired.

The service method exists and sends a correct payload (including normalizing `intake` to `{ intakeMonth, intakeYear }`), but there is no safe way to populate it from the CRM:

- `CreateApplicationRequestDto` requires `universityId` + `courseId`, and **no CRM endpoint lists universities or courses** (gap #4).
- The only course source on the backend is the lead-facing `POST /search/advanced`, whose `CourseResultDto.courseId` is documented as *"Course intake ID"* — which may not be the `courseId` this endpoint expects. Its `listType` also defaults to `ELIGIBLE_ONLY`, filtering by the *logged-in user's* eligibility, which is meaningless for a staff account.

Since this is a **mutation**, guessing the identifier risks creating bad application records. It needs one of:

1. A CRM course/university endpoint (gap #4), **or**
2. Confirmation from the backend team that the search `courseId` is the right identifier to pass here.

Everything else that was unused is now wired — see the ✅ marks above.

### Auth — 7 (all wired ✅)

| Endpoint | Screen — what it powers | Call site |
| --- | --- | --- |
| `POST /auth/login` | **Login** — email (staff) or phone (leads) + password | `Login.jsx` → `useAuth().login` → `AuthContext.jsx` |
| `POST /auth/register` | **Register** — creates the lead, returns the OTP token | `Register.jsx` → `useAuth().register` → `AuthContext.jsx` |
| `POST /auth/verify-otp` | **Verify OTP** — completes both signup and password reset | `VerifyOtp.jsx` → `useAuth().completeOtpVerification` → `AuthContext.jsx` |
| `GET /auth/resend-otp` | **Verify OTP** — "Resend code" | `VerifyOtp.jsx` (calls `authService` directly) |
| `POST /auth/forgot-password` | **Forgot Password** — new password submitted up front, applied after OTP | `ForgotPassword.jsx` (calls `authService` directly) |
| `GET /auth/refresh` | No screen — silent token refresh on any 401 | `apiClient.js` (`refreshAccessToken`) |
| `GET /auth/logout` | Header "Log out" | `AuthContext.jsx` → `authService.logout` |

### Other — 25 (lead-facing app, no CRM screen uses these)

| Group | Endpoints | Why unused here |
| --- | --- | --- |
| `leads/profile` | 5 | Self-service only — no `leadId` param, so a consultant can't read another user's record (gap #3) |
| `applications` | 5 | Lead-side equivalents of the `/crm` application endpoints |
| `application-documents` | 4 | Lead-side equivalents of the `/crm` document endpoints |
| `search` | 3 | Course discovery for the lead app; `listType` defaults to the logged-in user's eligibility |
| `wishlists` | 3 | Lead-only feature, no CRM concept |
| `health` | 2 | Infrastructure probes |
| `home`, `courses/{id}`, `categories/cities` | 3 | Lead app landing / course detail / city lookup |

---

## What we need

| # | Need | Why | Priority |
| --- | --- | --- | --- |
| 1 | **Response schemas for all 23 `/crm/*` endpoints** | All are undocumented. Our response parsing is guesswork — data can return `200 OK` and render blank. | 🔴 |
| 2 | `GET /crm/leads/{leadId}` | Doesn't exist. Lead Details breaks on refresh or direct link. | 🔴 |
| 3 | CRM view of a lead's profile, documents, activity, notes | `/leads/profile` is self-service only — no `leadId`. Consultants can't open a lead's record. | 🔴 |
| 4 | Universities & Courses CRM endpoints (~9) | Whole feature is mocked. Also blocks creating applications. | 🟠 |
| 5 | Lookups: states, cities, degrees, English tests, intakes | Mocked. Countries + programmes already exist publicly via `GET /search/advanced/filters`. | 🟠 |
| 6 | `GET /crm/dashboard/stats` | Dashboard fully mocked. | 🟠 |
| 7 | Tasks CRUD (~5) | Tasks page has full UI, nothing behind it. | 🟠 |
| 8 | Reports: summary, monthly, by-country | Reports page mocked. | 🟡 |
| 9 | `GET /auth/me`, profile update, change password | Settings page wired to nothing. | 🟡 |
| 10 | `role` on the user object | No way to tell admin from consultant from lead — nothing can be permission-gated. | 🟡 |
| 11 | Total count in list responses | Cursor-only, capped at 50. No "showing X of Y". | 🟡 |
| 12 | Delete lead · bulk assign · withdraw application · CSV export | Missing. | ⚪ |

---

## Reference: response envelope

Confirmed from the documented `/home` and `/search` endpoints. The `/crm/*` endpoints are undocumented but appear to follow it — `apiClient` parses against this shape:

```jsonc
{ "status": "success", "message": "…", "statusCode": 200,
  "data": { "<entityName>": [ … ],
            "pagination": { "cursor": "…", "limit": 15, "hasNext": true } } }
```

The collection key is named after the entity (`data.courses`, so presumably `data.leads`). `extractList` probes `items` / `results` / `data` as fallbacks so an unexpected key doesn't blank the table.

---

## Still open

| What | Blocked on |
| --- | --- |
| `POST /crm/leads/{leadId}/applications` — the one unwired CRM endpoint | Need #4 (CRM course/university endpoints), or confirmation that the search `courseId` is the right identifier |
| Lead Details on refresh currently pages through the list to find one lead | Need #2 (`GET /crm/leads/{leadId}`) — the cursor walk is a workaround |
| **CRM response shapes are inferred, not verified** | Need a QA account with a consultant record — see [BACKEND-ISSUES.md](BACKEND-ISSUES.md) #2 |
