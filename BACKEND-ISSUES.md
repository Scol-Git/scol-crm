# SCOL Backend — Issues Affecting the CRM

For the backend team. Frontend status lives in [API-INVENTORY.md](API-INVENTORY.md).

**Backend:** `https://scol-dev-test-u3dku.ondigitalocean.app` · **Verified live:** 2026-08-23 with an `ADMIN` account · **73 endpoints**

---

## ✅ Resolved since the last review

The previous round of issues is largely fixed — recorded here so nobody re-reports them.

| Was | Now |
| --- | --- |
| No `role` on the user object | ✅ Login returns `user.userRole` (e.g. `["ADMIN"]`) and the JWT carries `roles` + `permissions`. The CRM now gates on it. |
| No response schemas on any `/crm/*` endpoint | ✅ All 39 CRM operations have documented response DTOs, and every one matched the live response. |
| No `GET /crm/leads/{leadId}` | ✅ `GET /crm/leads/{leadId}/profile` covers it — the frontend's cursor-walk workaround is gone. |
| No CRM view of a lead's profile / documents | ✅ Profile returns personal info, academic + English results, shared documents and the application journey, with verify and delete endpoints. |
| No CRM university or course endpoints | ✅ `/crm/universities/*`, `/crm/courses/*` and `/crm/search` all exist. Course and university editing now persist. |
| No dashboard endpoint | ✅ `GET /crm/dashboard` with date range and `recentLeadLimit`. |
| `/categories/cities` returns an empty list | ✅ Now documented as requiring `countryId`. |

---

## Summary of what's still open

| # | Issue | Severity | Blocks |
| --- | --- | --- | --- |
| 0 | **Document storage bucket has no CORS policy** | 🔴 **High** | **All document uploads** |
| 1 | Duplicate city records with distinct UUIDs | 🟠 Medium | Trustworthy city filtering |
| 2 | `POST /crm/leads/list` returns **201** for a read | ⚪ Low | Nothing — cosmetic |
| 3 | `/auth/refresh` returns **400** instead of 401 | ⚪ Low | Nothing — handled |
| 4 | Pagination has no total count, `limit` capped at 50 | 🟡 Minor | Page numbers, "showing X of Y" |
| 5 | No Tasks, Reports, or account-management endpoints | 🟠 Medium | Three CRM screens |
| 6 | `/search`, `/home`, `/search/advanced` marked auth-required | ⚪ Low | Spec accuracy only |
| 7 | `GET /crm/dashboard` `recentLeads[]` carry no `leadId` | 🟠 Medium | Clicking through to a lead |
| 8 | Write endpoints return `{success:true}` instead of the record | 🟡 Minor | Forces an extra read after every save |
| 9 | `GET /crm/courses/{id}` omits duration and application deadline | 🟡 Minor | Prefilling the course edit form |
| 10 | No `DELETE /crm/leads/{leadId}` | 🟡 Minor | Removing a lead (incl. test data) |

---

## 🔴 0. Document uploads are blocked by CORS — nothing can be uploaded

The presigned flow itself is correct: `upload-url` returns a valid ticket
(`documentId`, `documentVersionId`, `uploadUrl`, `headers`, `expiresInSeconds`).
But the browser cannot complete step 2, the `PUT` to storage:

```text
Access to fetch at 'https://s3.us-east-005.backblazeb2.com/scol-documents/leads/…'
from origin 'http://localhost:5199' has been blocked by CORS policy
→ TypeError: Failed to fetch
```

The Backblaze bucket needs a CORS rule allowing `PUT` (and the signed headers)
from the CRM origins. Until then **no document can be attached to any
application from the browser** — the feature is fully built on our side and
fails at the last step.

Also worth checking: the returned `uploadUrl` embeds a **different**
`document-types/{id}` segment than the one requested
(requested `3f39f1ad-…` / PASSPORT, URL contained `15ceadef-…`).

---

## 🟠 1. `/categories/cities` returns duplicate city names with different UUIDs

```http
GET /categories/cities?countryId=22ae0ae2-50b6-43d9-9b4d-db071fb4c595   (Canada)
→ 200  { "cities": [
    { "id": "def90df7-…", "name": "Calgary" },
    { "id": "d7e4e311-…", "name": "Calgary" },
    { "id": "e6f128ee-…", "name": "Calgary" },
    { "id": "a889dcbd-…", "name": "Calgary" }, … ] }
```

Four separate `Calgary` rows, each with its own id. The CRM de-duplicates by name so the dropdown is usable, but that means we pick one id arbitrarily — and filtering by it will only match courses attached to *that* city record.

This looks like a data-seeding problem rather than an API bug. Worth checking whether these should be merged.

---

## ⚪ 2. `POST /crm/leads/list` returns 201 for a read operation

Confirmed live: still `201`. `POST /crm/search` does the same. Harmless — the client treats any 2xx as success — but `200` is the conventional response for a read, and the docs say `200`, so spec and behaviour disagree.

---

## ⚪ 3. `/auth/refresh` returns 400 when the token is missing

```http
GET /auth/refresh   (no Authorization header)
→ 400  { "message": "Refresh token is required" }
```

`401` would be conventional for a missing credential. Handled either way.

---

## 🟡 4. Pagination has no total count

`CursorPaginationDto` allows `limit` 1–50 and returns `{ cursor, limit, hasNext }`. `CursorPaginationResponseDto` is declared as an empty object in the spec, so the response shape isn't described.

Consequences: no "showing X of Y", no page numbers, no jump-to-last-page. The CRM uses infinite "Load more" instead.

**Ask:** either add `totalCount` to the pagination object, or confirm cursor-only is intentional so we can stop planning around it. Also worth filling in `CursorPaginationResponseDto`, which is currently empty in the spec.

---

## 🟠 5. Missing endpoints for three CRM screens

| Screen | Needs |
| --- | --- |
| **Tasks** | Full CRUD — list (filter by status/lead/assignee), create, update, change status, delete. Nothing exists; the page is entirely mock. |
| **Reports** | `summary`, `monthly`, `by-country` over a date range. `GET /crm/dashboard` covers some of this but not the report breakdowns. |
| **Settings** | `GET /auth/me` (or `/users/me`), profile update, change password, avatar upload. `imgUrl` exists on the user DTO but there's no upload path. |

Also still missing: **states, degrees, English tests and intakes** lookups. Countries and programmes come from `/crm/search/filters`, cities from `/categories/cities`, but these four have no endpoint, so those form fields stay mock-backed.

---

## ⚪ 6. Three endpoints are declared as requiring auth but are public

`POST /home`, `POST /search`, `POST /search/advanced` are marked `JWT-auth` in the spec but return data without a token, reporting `userState: "NOT_LOGGED_IN"`.

No data leak — it's a public course catalogue — but the spec is misleading. Either mark them optional-auth or enforce the guard.

---

## 🟠 7. `recentLeads[]` has no `leadId`

`GET /crm/dashboard` returns recent leads as `{ name, email, phone,
targetUniversity, status }` — no id. The Dashboard therefore cannot link a row
to its lead; navigating with any synthesised key returns
`400 Validation failed (uuid is expected)`. The row click has been removed until
`leadId` is added.

---

## 🟡 8. Write endpoints don't return the updated record

`PUT /crm/leads/{leadId}` and the note/status/stage writes all return
`{ "success": true }`. `POST /crm/leads` returns only
`{ success, newLeadInfo: { phone, password } }` — not the created lead, so the
caller doesn't even learn its id.

Every save therefore needs a follow-up read to refresh the screen. Returning the
affected entity (or at least its id) would remove a round trip from each one.

**Related, and worth documenting explicitly:** `PUT /crm/leads/{leadId}` is a
*partial* update — an empty body returns 200 and omitted fields keep their
stored values. That's the sensible behaviour, but it isn't stated anywhere, and
assuming the opposite is an easy way to lose data.

---

## 🟡 9. `GET /crm/courses/{courseId}` omits two editable fields

`PATCH /crm/courses/{courseId}` accepts `courseDuration` and
`applicationDeadline`, but the GET returns neither, so the edit form cannot show
their current values. `durationMonths` *is* present on `POST /crm/search`
results — the CRM now carries it over from the list as a workaround, but a
direct link to a course still can't prefill it, and the deadline is unavailable
on any endpoint.

---

## 🟡 10. No way to delete a lead

`DELETE /crm/leads/{leadId}` returns `404 Cannot DELETE …`. There's no delete or
archive path, so mistakes and test records are permanent.

Two probe leads created during verification are stuck in the dev database and
need removing server-side: **"ZZ Audit Probe"** (`01900000001`) and
**"ZZ Cred Probe"** (`01900000042`).

---

## Reference: when remarks are mandatory

Not an issue — undocumented behaviour worth recording, since the spec marks
`remarks` optional on both endpoints. Verified live:

| Change | Remarks |
| --- | --- |
| status → `IN_PROGRESS`, `PENDING` | optional |
| status → `ON_HOLD` | **required** — *"Remarks are required for this application status"* |
| status → `COMPLETED`, `REJECTED`, `CANCELLED` | **required** — *"…when moving to a terminal application status"* |
| stage → forwards | optional |
| stage → backwards | **required** — *"…when moving to an earlier application stage"* |

The CRM now requires remarks in these cases before enabling Save.

Separately, a document *requirement* with no uploaded file cannot be verified
(`400 Requirement cannot be marked as verified`) — the CRM now hides Verify
until a file exists.

---

## Verification notes

Probed live on 2026-08-23 with `admin@admin.com` (role `ADMIN`).

- ✅ **All 73 endpoints route correctly** — no 404s on known routes, no 5xx.
- ✅ **Every CRM response matched its documented DTO.** This was the biggest previous risk and it is now closed.
- ✅ **Role is present end to end** — login response, JWT claims, and 403s on role failure.
- ⚠️ **The dev database is nearly empty.** `POST /crm/leads/list` returns only leads *created through the CRM* — the pre-existing lead-app registrations (Arvind, Fahmidur Rahman) never appear, though `/crm/dashboard` counts them and applications reference them. Worth confirming this scoping is deliberate, and seeding a few CRM-owned leads either way.

### Re-verified 2026-08-23 (second pass, driving the UI in a browser)

Every CRM screen was exercised end to end with a real session, not just probed.
Confirmed working: dashboard metrics and charts, lead list/filters/create/edit,
application list, stat cards, filters, status and stage changes, note CRUD,
stage and document progress, activities, course search, advanced search with the
country→city cascade, course and university editing, and all four auth screens.

Confirmed broken **on the backend side**: issue 0 (uploads) — everything else
found in that pass was a frontend defect and has been fixed.
