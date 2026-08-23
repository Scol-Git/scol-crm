# SCOL CRM — API Inventory

What the backend has, and what we still need.

> **API-side problems live in [BACKEND-ISSUES.md](BACKEND-ISSUES.md)** — that's the list for the backend team. This file is the endpoint inventory and our own frontend status.

**Source:** `https://scol-dev-test-u3dku.ondigitalocean.app/swagger-json` · **73 operations**

**Response shapes verified live:** 2026-08-23 · **UI driven end to end in a browser:** 2026-08-23

| | |
| --- | --- |
| CRM operations (`/crm/*`) | 39 |
| — reachable from the UI | **39** |
| — wired but blocked externally (bucket CORS) | 1 (document upload) |
| Features still on mock data | 3 (Tasks, Reports, Settings) |
| Response shapes verified against live data | ✅ all CRM |
| Frontend defects found and fixed in the UI pass | 10 |

> **Two levels of "wired".** Everything below was first checked by matching our
> normalizers against live responses. A second pass then drove every screen in a
> real browser — clicking, saving, uploading. That pass found ten defects that
> shape-checking could not: endpoints returned 200, but the UI mishandled the
> reply. They are listed under [Fixed in the UI pass](#fixed-in-the-ui-pass).

---

## What we have

`…` below is shorthand for `/crm/leads/{leadId}/applications/{applicationId}`.

### CRM Leads — 12 (all wired ✅)

| Endpoint | Screen — what it powers | Call site |
| --- | --- | --- |
| `POST /crm/leads/list` | **Leads** — table, server-side search, filters, Load more | `leadService.getAll` → `LeadList.jsx` |
| `POST /crm/leads` | **Leads** — "Add Lead" | `leadService.create` |
| `PUT /crm/leads/{leadId}` | **Leads** / **Lead Details** — "Edit Lead". Partial update: only changed fields are sent | `leadService.update` |
| `GET /crm/leads/dropdown-data` | Target Country / Consultant selects + filters | `leadService.getDropdownData` |
| `GET /crm/leads/{leadId}/profile` | **Lead Details** — personal info, academic + English results, shared documents, application journey | `leadService.getProfile` / `getById` |
| `PUT /crm/leads/{leadId}/academic-results` | **Lead Details** — "Add result" / "Edit" on a degree row (upsert by `degreeId`) | `leadService.updateAcademicResults` |
| `POST …/academic-results/{degreeId}/verification-status-changes` | **Lead Details** — Verify / Unverify on an academic row | `setAcademicResultVerified` |
| `DELETE …/academic-results/{degreeId}` | **Lead Details** — Delete an academic row | `deleteAcademicResult` |
| `PUT /crm/leads/{leadId}/english-test-results` | **Lead Details** — "Add result" / "Edit" on a test row (upsert by `testId`) | `updateEnglishTestResults` |
| `POST …/english-test-results/{testId}/verification-status-changes` | **Lead Details** — Verify / Unverify a test row | `setEnglishTestVerified` |
| `DELETE …/english-test-results/{testId}` | **Lead Details** — Delete a test row | `deleteEnglishTestResult` |
| `POST /crm/leads/{leadId}/documents/{documentId}/status-changes` | Lead document status | `leadService.changeDocumentStatus` |

### CRM Applications — 10 (all wired ✅)

| Endpoint | Screen — what it powers |
| --- | --- |
| `POST /crm/applications/list` | **Applications** — table, search, filters, Load more, **and the four stat cards** (server `statistics`) |
| `GET /crm/applications/dropdown-data` | Consultant filter |
| `GET …` (single application) | **Application Details** — header, university, course, status/stage. Carries **no `leadInfo`**, so the applicant name is fetched from the lead profile |
| `GET …/activities` | "Recent Activity" timeline |
| `GET …/document-progress` | Documents panel rows |
| `GET …/stage-progress` | The progress stepper (real per-application state) |
| `POST …/status-changes` | "Update Status". Remarks **required** for `ON_HOLD`, `COMPLETED`, `REJECTED`, `CANCELLED` |
| `POST …/stage-changes` | "Update Stage". Remarks **required** when moving to an earlier stage |
| `GET /crm/leads/{leadId}/applications` | **Lead Details** — that lead's applications |
| `POST /crm/leads/{leadId}/applications` | Create an application for a lead (`applicationService.create`) |

### CRM Notes — 4 (all wired ✅)

All on **Application Details**: list, create, inline edit, resolve toggle, delete.
The full lifecycle was exercised in a browser and round-trips cleanly.

> The note object is keyed by **`noteId`**, not `id`. Reading `id` gave every note
> an `undefined` id, which made `editingNote?.id === note.id` true for all of them
> and pinned every note in edit mode. Fixed — but it's the kind of trap that
> passes a shape check and still breaks the screen.

### CRM Documents — 5 (wired ✅ · upload blocked externally 🔴)

Presigned upload (`upload-url` → PUT → `confirm-upload`), download, and the two
status endpoints. The ticket shape is correct and our flow follows it, but the
browser's `PUT` to Backblaze is refused — **the bucket has no CORS policy**, so
no document can actually be uploaded. See [BACKEND-ISSUES.md](BACKEND-ISSUES.md) #0.

> ⚠️ **Requirement vs document.** A *requirement* is the slot (`documentTypeId`, statuses `PENDING`/`IN_PROGRESS`/`VERIFIED`); a *document* is the uploaded file (`documentId`, adds `REJECTED`). Separate endpoints, separate enums — a requirement cannot be rejected.
>
> A requirement with **no uploaded file cannot be verified** either
> (`400 Requirement cannot be marked as verified`), so the UI hides Verify until
> a file exists.

### CRM Courses & Search — 4 (all wired ✅)

| Endpoint | Screen — what it powers |
| --- | --- |
| `POST /crm/search` | **Courses** — course cards, text search **and** the Advanced Search modal |
| `GET /crm/search/filters` | Country + programme options in Advanced Search |
| `GET /crm/courses/{courseId}` | **Course Details** — tabs, ranking, fees, requirements, intakes. Returns **neither `courseDuration` nor `applicationDeadline`**, though `PATCH` accepts both |
| `PATCH /crm/courses/{courseId}` | **Course Details** — "Edit" (ADMIN only). Duration prefills from the search row carried over by the Courses list; the deadline can't be prefilled at all |

### CRM Universities — 3 (all wired ✅)

| Endpoint | Screen — what it powers |
| --- | --- |
| `GET /crm/universities/{uniId}` | **University Details** — about, campus life, location, commission, total courses, active intakes, stage flow |
| `PATCH /crm/universities/{uniId}` | **University Details** — "Edit" (ADMIN only) |
| `PUT /crm/universities/{uniId}/application-stage-flow` | **University Details** — "Reorder": move stages, enable/disable (full replace) |

### CRM Dashboard — 1 (wired ✅)

`GET /crm/dashboard?startDate=&endDate=&recentLeadLimit=` → **Dashboard**: lead + enrollment stats, status distribution, quick-overview rates, per-intake stage chart, recent leads.

> `recentLeads[]` carries **no `leadId`** — only name, email, phone, target
> university and status. The rows are therefore not clickable; a synthesised key
> produced `400 Validation failed (uuid is expected)`. Use "View All" until the
> endpoint returns an id.

### Auth — 9 (7 wired)

`login` · `register` · `verify-otp` · `resend-otp` · `forgot-password` · `refresh` · `logout` all wired.
`POST /v2/auth/verify-otp` and `POST /v2/auth/resend-otp` (OTP token in the body instead of the header) are **not used** — the v1 header flow still works.

### Other — 25 (lead-facing app; the CRM uses only one)

`applications` (6) · `leads/profile` (5) · `application-documents` (4) · `search` (4) · `wishlists` (3) · `health` (2) — plus `home` and `courses/{id}`.

`GET /categories/cities?countryId=` **is** used by the CRM, for the Advanced
Search city dropdown. Everything else here is the lead-app equivalent of a
`/crm` endpoint and no CRM screen touches it.

> Tally: 39 CRM (12 + 10 + 4 + 5 + 4 + 3 + 1) + 9 auth + 25 other = **73** ✓

---

## Editors added for the last three endpoints

These three had a working service wrapper and no screen calling them. All now
have UI, verified end to end against the live backend.

| Endpoint | UI | Where |
| --- | --- | --- |
| `PUT /crm/leads/{leadId}/academic-results` | Per-degree editor: institution, GPA, passing date | **Lead Details** → Academic History → *Add result* / *Edit* |
| `PUT /crm/leads/{leadId}/english-test-results` | Per-test editor: overall score, test date, one input per section | **Lead Details** → English Test Results → *Add result* / *Edit* |
| `PUT /crm/universities/{uniId}/application-stage-flow` | Reorder (↑/↓) and enable/disable each stage | **University Details** → Application Stage Flow → *Reorder* |

**The shape of these endpoints drove the UI**, and it isn't what the names suggest:

- The backend **pre-creates every slot**. A lead always has all four degrees
  (SSC/HSC/BSc/MSc) and all three tests (TOEFL/IELTS/PTE), initially with null
  values. So there is nothing to "add" — an empty slot is filled in. The button
  reads *Add result* when empty and *Edit* when filled, and Verify/Delete only
  appear once a slot has a value (verifying an empty slot is rejected).
- Both PUTs are **upserts keyed by id**, not replacements: sending one entry
  leaves the other degrees/tests untouched. Confirmed live.
- The stage-flow PUT *is* a full replace — every stage must carry `stageId`,
  `displayOrder` and `isEnabled` — so the editor submits the whole ordered list
  and recomputes `displayOrder` from the on-screen order.

Validation limits come from the response itself rather than being hardcoded:
`validation.gpaScale` per degree (4 or 5), `validation.maxScore` per test, and
`validation.sections[].maxScore` per section. Section scores are all-or-nothing —
the backend rejects a partial set (*"All section scores are required for IELTS"*),
so the form enforces that before sending.

---

## Fixed in the UI pass

Driving every screen in a browser found ten defects that response-shape checking
had missed — in each case the endpoint answered correctly and the frontend
mishandled it. All are fixed and re-verified against the live backend.

| Where | Defect | Cause |
| --- | --- | --- |
| **Lead Details** | Saving an unchanged lead silently rewrote `leadStatus` → `NewLead`, `registerSource` → `Offline`, `hasPassedEnglishTest` → `false` | The modal sent the whole form every time, using placeholder defaults for fields the API never returns |
| **Lead Details** | Saving blanked the header (name, email, phone, country, status) | `PUT` returns `{success:true}`; the reply was normalized into an all-null lead and rendered |
| **Application Details** | Notes never displayed; Edit / Resolve / Delete unreachable | `normalizeNote` read `raw.id`, but the field is `noteId` |
| **Application Details** | Applicant always showed `-` | The detail DTO has no `leadInfo` and nothing fetched the name |
| **Application Details** | "Verify" offered on requirements with no file → 400 | Gate checked status but not `hasFile` |
| **Lead Details** | "Verify" and "Delete" offered on empty degree / test slots → 400 and 404 | Slots are pre-created with null values; the buttons didn't check whether one was filled |
| **Application Details** / **Applications** | Remarks labelled "optional" where the backend requires them → 400 | Rule undocumented; now enforced client-side |
| **Dashboard** | Recent-lead rows linked to `/leads/{phone}-{index}` → 400 | `recentLeads[]` has no id; the key was synthesised |
| **Course Details** | Duration always blank in the edit form | Not returned by `GET /crm/courses/{id}`; now carried over from the search row |
| **apiClient** | The 404 → "no CRM access" translation never fired | `\s` escapes had been stripped from `CRM_ACCESS_PATTERN` |

Also recovered rather than fixed: `POST /crm/leads` returns a generated portal
password in `newLeadInfo.password` that the UI used to discard. It is shown once,
after creation, with a copy button — it cannot be retrieved later.

---

## What we need

| # | Need | Why | Priority |
| --- | --- | --- | --- |
| 1 | Tasks CRUD (~5 endpoints) | Tasks page has a full UI and nothing behind it. | 🟠 |
| 2 | Reports: summary, monthly, by-country | Reports page still on mock data. Dashboard covers some of this. | 🟡 |
| 3 | `GET /auth/me`, profile update, change password | Settings page is display-only. | 🟡 |
| 4 | Lookups: **states** and **intakes** | Countries, programmes and cities exist; these two don't. Degrees and English tests are no longer needed — see below. | 🟡 |
| 5 | Total count in list responses | Cursor-only, `limit` capped at 50. No "showing X of Y". | 🟡 |
| 6 | `leadId` on `dashboard.recentLeads[]` | Rows can't link through to a lead. | 🟡 |
| 7 | `courseDuration` + `applicationDeadline` on `GET /crm/courses/{id}` | `PATCH` accepts them but the edit form can't show current values. | 🟡 |
| 8 | Delete lead · bulk assign · withdraw application · CSV export | Missing — no delete means test records are permanent. | ⚪ |

**Correction on #4:** degree and English-test lookups were previously listed here
as missing. They aren't needed. There is no standalone endpoint (confirmed —
`/categories/cities` is the only `/categories/*` path), but
`GET /crm/leads/{leadId}/profile` returns the **full catalogue inline**: every
lead carries all four degrees and all three tests, each with its id and its
validation rules, whether or not a value has been entered. That is exactly what
the result editors need, so no new endpoint is required. States and intakes are
still genuinely absent.

---

## Mock data

Exactly one mock file remains: `src/mockData/index.js` (~3.7 KB), imported by one file (`applicationService.js`).

| Page | Mock source | Why |
| --- | --- | --- |
| **Tasks** | `tasks`, `leadNames` | No Tasks endpoints exist |
| **Reports** | `applicationStatuses`, `monthlyStats`, `countryStats` | No Reports endpoints exist |
| **Settings** | hardcoded in the component | No account-management endpoints |

Every other page runs on the real API — confirmed by driving all eleven
authenticated routes in a browser.

Note that Tasks and Reports are mock **all the way down**: creating a task or
changing its status updates local state only and is lost on refresh, the Tasks
priority filter is never applied, and the Reports date range and its two "trend"
figures (`+5%`, `+12%`) are inert. Settings' toggles and theme buttons are
likewise decorative. These are unbuilt features, not defects — they need the
endpoints in [What we need](#what-we-need) first.

---

## Reference: response envelope

Verified live on every CRM endpoint:

```jsonc
{ "status": "success", "message": "…", "statusCode": 200,
  "data": { "<entityName>": [ … ],
            "pagination": { "cursor": "…", "limit": 15, "hasNext": true } } }
```

`apiClient` unwraps `data`; `extractList` reads the entity key and probes `items` / `results` / `data` as fallbacks.

**Field-name traps confirmed live** — these are not guesses:

| Where | Trap |
| --- | --- |
| Lead list | Consultant and country are **nested** (`consultantInfo`, `targetCountryInfo`), not flat ids. Timestamp is `registerDate`. |
| Application list | `universityCourseInfo.Uniname` / `.Coursename` / `.UniCourseId` (odd casing), and `lastupdateDate` (lowercase "u"). |
| Lead dropdown | `targetCountries[{countryId, countryName}]`, `consultantUsers[{consultantId, name}]`. |
| Application dropdown | `consultantUsers[{userId, name}]` — different id field from the lead one. |
| Application filters | `ApplicationStatuses` / `ApplicationStages` are **PascalCase**, and dates nest under `ranges.dateRange` — unlike Leads, which is camelCase with a flat `ranges`. |
| Stage progress | `progressBarItems[].state` is `COMPLETED` / `CURRENT` / `UPCOMING`. |
| Document progress | `progressBarItems[].overallStatus`, with the type under `documentType`. |
| Activities | Timestamp is `occurredAt`; person is `actor.displayName`. |
| Notes | Keyed by **`noteId`**, not `id`. |
| Application detail | No `leadInfo` at all — unlike the list item, which has it. |
| Dashboard | `recentLeads[]` has **no id field**. |
| Course detail | No `courseDuration` / `applicationDeadline`, though `PATCH` accepts both. `durationMonths` exists on search results. |
| Lead profile | Academic and English **slots are pre-created** — all four degrees and all three tests are always present, with `null` values until filled. An empty slot is not a missing row. |
| Lead profile | Each result carries its own limits: `academicResults[].validation.gpaScale` (4 or 5, per degree) and `englishTestResults[].validation.{maxScore, sections[].maxScore}`. Read them — don't hardcode. |

**Result writes are upserts, keyed by id.** Unlike the stage-flow PUT (a full
replace), the two result endpoints merge:

| Endpoint | Semantics |
| --- | --- |
| `PUT …/academic-results` | Upsert by `degreeId` — other degrees untouched |
| `PUT …/english-test-results` | Upsert by `testId` — other tests untouched |
| `PUT …/application-stage-flow` | **Full replace** — send every stage with `stageId`, `displayOrder`, `isEnabled` |

Server-side rules the UI mirrors so users don't hit a 400: GPA is rejected above
the degree's `gpaScale`, an overall score above the test's `maxScore` is
rejected, and section scores are all-or-nothing (*"All section scores are
required for IELTS"*). Verifying an unfilled slot returns 400; deleting one
returns 404.

**Write responses carry no entity.** Every mutation returns a bare acknowledgement,
so a save must be followed by a re-read — never render the reply:

| Endpoint | Returns |
| --- | --- |
| `PUT /crm/leads/{leadId}` | `{ success: true }` |
| `POST /crm/leads` | `{ success, newLeadInfo: { phone, password } }` — not the lead, not even its id |
| status / stage / note writes | `{ success: true }` |

`PUT /crm/leads/{leadId}` is a **partial** update — verified live that an empty
body returns 200 and omitted fields keep their stored values. Undocumented, and
assuming otherwise is how the status-clobbering bug above happened.
