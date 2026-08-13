# SCOL Backend — Issues Blocking the CRM

Problems on the **API side** only. Frontend defects are fixed and tracked separately in [API-INVENTORY.md](API-INVENTORY.md).

**Backend:** `https://scol-backend-qa.vercel.app` · **Spec:** `/swagger-json` · **Verified:** 2026-08-13

---

## Summary

| # | Issue | Severity | Blocks |
| --- | --- | --- | --- |
| 1 | No `role` on the user object | 🔴 Blocker | All CRM access control |
| 2 | `/crm/*` returns 404 for non-consultants | 🔴 Blocker | Diagnosing login problems |
| 3 | No response schemas on any `/crm/*` endpoint | 🔴 Blocker | Trusting any CRM response shape |
| 4 | No `GET /crm/leads/{leadId}` | 🟠 High | Lead Details on refresh / direct link |
| 5 | No CRM view of a lead's profile or documents | 🟠 High | Consultants reading lead records |
| 6 | Pagination capped at 50, no total count | 🟡 Medium | Page numbers, "X of Y" |
| 7 | `/crm/leads/list` returns 201 for a read | ⚪ Low | Nothing — cosmetic |
| 8 | `/auth/refresh` returns 400 instead of 401 | ⚪ Low | Nothing — handled |
| 9 | 3 endpoints mis-declared as requiring auth | ⚪ Low | Spec accuracy |
| 10 | `/categories/cities` returns an empty list | ⚪ Low | City lookups |

---

## 🔴 1. The user object carries no role

`AuthResponseUserDto` — returned by `/auth/login`, `/auth/verify-otp`, `/auth/refresh`:

```jsonc
{ "userId": "uuid", "academicFormStatus": "INCOMPLETE|PARTIALLY_COMPLETED|COMPLETED",
  "fullName": "…", "joinedAt": 2023, "imgUrl": "…" }
```

There is **no `role`, no permissions, no account-type field.**

Leads and staff authenticate through the same `POST /auth/login`. The frontend therefore cannot tell whether the person who just logged in is a lead, a consultant, or an admin. Consequences:

- No menu item, route, or action can be permission-gated.
- A lead's token is accepted by the CRM login screen; the app looks logged in, then every screen fails.
- We only discover the account lacks CRM access when a `/crm/*` call fails (see #2).

**Ask:** add `role` (e.g. `ADMIN` / `CONSULTANT` / `LEAD`) to `AuthResponseUserDto`, and optionally a `permissions` array.

---

## 🔴 2. `/crm/*` returns **404** when the user isn't a consultant

Reproduced live. Logged in successfully, then:

```
POST /crm/leads/list
→ 404  {"status":"error","message":"Consultant user not found","statusCode":404}
```

The token is valid — this is a 404, not a 401, so the backend authenticated the user and *then* failed to find a consultant record for them.

Two problems:

1. **Wrong status code.** 404 means "no such resource". This is an authorization failure and should be **403 Forbidden**. As a 404 it's indistinguishable from a missing/misspelled endpoint — it cost real debugging time to work out that the URL was fine and the *account* was wrong.
2. **Undocumented.** Swagger lists only `201` for `POST /crm/leads/list`. No 4xx responses are declared on any CRM endpoint, so there was no way to anticipate this.

**Ask:** return `403` with a distinguishable error code (e.g. `NO_CRM_ACCESS`), and document the error responses.

> **Frontend mitigation already shipped:** `apiClient` detects this message on `/crm/*` paths and shows "This account does not have CRM access…" instead of the raw string. That is a workaround, not a fix.

**Also needed:** a QA account with a consultant record, so the CRM can be tested end-to-end at all. Nothing below #3 can be verified against live data until this exists.

---

## 🔴 3. No response schemas on any `/crm/*` endpoint

**All 23 CRM endpoints** declare a response with no schema:

```
POST /crm/leads/list                → 201, no schema
GET  /crm/leads/dropdown-data       → 200, no schema
GET  /crm/leads/{id}/applications   → 200, no schema
… and 20 more
```

Every response shape the frontend relies on is inferred. A `200 OK` whose keys differ from our guess renders an empty table and throws no error — the worst possible failure mode.

What we inferred, and would like confirmed:

```jsonc
// The convention we observed on the *documented* /home and /search endpoints:
{ "status": "success", "message": "…", "statusCode": 200,
  "data": { "<entityName>": [ … ],
            "pagination": { "cursor": "…", "limit": 15, "hasNext": true } } }
```

Specifically we need the exact shape of:

- the list envelope — is the array under `leads` / `items` / `results`?
- the pagination object, and whether a total count exists
- the nested `lead` / `university` / `course` objects on an application
- `document-progress` — how requirements and uploaded documents are represented
- `stage-progress` — the per-stage fields (`completed`? `current`? timestamps?)
- `dropdown-data` for both leads and applications

**Encouraging sign:** where the backend *does* document a schema it is accurate. We fetched `GET /courses/{id}` with a real id and the live keys matched `CourseDetailsResponseDto` exactly. So this is missing annotations, not drift — adding `@ApiOkResponse({ type: … })` to the CRM controllers should be enough.

---

## 🟠 4. No `GET /crm/leads/{leadId}`

There is no way to fetch a single lead. The CRM has create, update, and list — but no read-by-id.

**Impact:** Lead Details works when you click through from the list (the row is passed via router state), but a refresh or a shared link has nothing to load from.

**Current workaround:** we page through `POST /crm/leads/list` following the cursor until the id matches — up to 20 requests to open one lead. It works, but it is obviously wrong.

**Ask:** `GET /crm/leads/{leadId}` returning the same shape as a list row plus any detail-only fields.

---

## 🟠 5. No CRM view of a lead's profile, documents, or activity

`/leads/profile*` exists but is **self-service only** — it has no `leadId` parameter and reads the caller's own record. A consultant cannot open a lead's academic form or documents.

Missing:

```
GET /crm/leads/{leadId}/profile              # academic form, English tests, preferences
GET /crm/leads/{leadId}/documents            # uploaded documents + statuses
GET /crm/leads/{leadId}/documents/{id}/download
GET /crm/leads/{leadId}/activities           # timeline / journey events
GET,POST /crm/leads/{leadId}/notes           # lead-level notes (only application-level notes exist)
```

---

## 🟡 6. Pagination is cursor-only, capped at 50, with no total

`CursorPaginationDto`: `limit` has `maximum: 50`, and no list response documents a total count.

**Impact:** no "showing X of Y", no page numbers, no jump-to-last-page. The UI can only offer "Load more". It also means server-side filtering cannot be verified against a known total.

**Ask:** either add `totalCount` to the list response envelope, or confirm cursor-only is intentional so the UI can commit to infinite scroll permanently.

---

## ⚪ 7. `POST /crm/leads/list` returns **201** for a read operation

A search/list endpoint returning `201 Created` is misleading. Harmless — our client treats any `res.ok` as success — but it reads as a bug to anyone inspecting traffic. Same for `POST /crm/applications/list`.

**Ask:** return `200`.

---

## ⚪ 8. `/auth/refresh` returns 400 when the token is missing

```
GET /auth/refresh  (no Authorization header)
→ 400  {"status":"error","message":"Refresh token is required","statusCode":400}
```

A missing credential is conventionally `401`. Handled correctly on our side (any non-ok response fails the refresh), so this is cosmetic consistency only.

---

## ⚪ 9. Three endpoints are declared as requiring auth but are public

`POST /home`, `POST /search`, `POST /search/advanced` are marked `JWT-auth` in Swagger, but all three return `200`/`201` with full course data and **no token**, reporting `"userState": "NOT_LOGGED_IN"`.

This is optional-auth behaviour (public catalogue, personalised when signed in) documented as required auth. **No data is leaked** — but the spec is misleading for anyone integrating against it.

**Ask:** mark them as optional auth, or remove the security requirement.

---

## ⚪ 10. `/categories/cities` returns an empty list

```
GET /categories/cities
→ 200  {"status":"success","data":{"cities":[]}}
```

Routed and healthy, but empty — either unseeded in QA or it needs an undocumented parameter (a `countryId`/`stateId` filter?). It's the only city lookup available, so the CRM's city fields have no real data source.

**Note:** countries and programmes *are* available publicly via `GET /search/advanced/filters` (8 countries, 120 programmes, with real UUIDs). States, degrees, English tests, and intakes have no endpoint at all.

---

## Verification notes

All 55 endpoints were probed live on 2026-08-13.

- ✅ **Routing is healthy** — no 404s on unknown routes, no 5xx. Every path in Swagger is really deployed with the documented method.
- ✅ **Auth guards work** — every `/crm/*` endpoint returns a clean 401 without a token.
- ✅ **Documented schemas are accurate** where they exist (see #3).
- ⛔ **CRM responses remain unverified** — blocked on #2 (no consultant account).

## What would unblock us fastest

1. A QA account with a consultant record (#2) — lets us verify everything else.
2. `role` on the user object (#1).
3. Response schemas on the CRM controllers (#3).
4. `GET /crm/leads/{leadId}` (#4).
