# SCOL CRM Frontend

React + Vite frontend for the SCOL CRM. Talks to the real SCOL backend API for authentication, leads, and applications; a few sections still run on local mock data (see below) because the backend doesn't expose endpoints for them yet.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the API base URL — copy `.env.example` to `.env` (already present, pointing at the QA backend):

   ```bash
   VITE_API_BASE_URL=https://scol-backend-qa.vercel.app
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## API Integration Status

The backend's Swagger docs are at `{VITE_API_BASE_URL}/swagger`. It only exposes real endpoints for **auth**, **CRM Leads**, and **CRM Applications** — everything else in this app still runs on the mock data in `src/mockData/`.

### ✅ Connected to the real backend

- **Auth** (`src/services/authService.js`, `src/services/apiClient.js`)
  - Login (email or phone + password), logout, silent access-token refresh on 401.
  - Register → OTP verify (phone-based lead signup).
  - Forgot password → OTP verify (new password is submitted up front, per the backend's flow — there's no separate "reset password" step).
- **Leads** (`leadService` in `src/services/index.js`, used by `LeadList.jsx` / `LeadDetails.jsx`)
  - List (search + filters), create, update, dropdown data (target countries / consultants) via `/crm/leads/*`.
  - **Known gap:** the backend has no `GET /crm/leads/{id}`. Lead Details is populated via navigation state when you click a row in the list; a direct URL visit falls back to re-fetching the list and matching by id.
- **Applications** (`applicationService` in `src/services/applicationService.js`, used by `Applications.jsx` / `ApplicationDetails.jsx`)
  - List (search + status/stage filters), per-lead application list, application detail, stage/document progress, activity feed, notes (create), status changes, stage changes via `/crm/leads/{leadId}/applications/*` and `/crm/applications/*`.
  - The list/detail/progress endpoints aren't fully documented in Swagger (no response schema), so the service layer normalizes responses defensively (`normalizeApplication`, `normalizeActivity`, `normalizeDocumentRequirement` in the respective files). If a field renders as blank, check the live response shape against these normalizers first.
  - Document verification/rejection actions (`ChangeCrmApplicationDocumentStatus` / `ChangeCrmApplicationRequirementStatus` endpoints) are **not wired up yet** — the Documents panel on Application Details is read-only.

### ⛔ Still on mock data (`src/mockData/`) — no backend support yet

- **Universities** (`universityService`, `courseService`, `detailedCourseService`) — no `Universities`/`Courses` CRM endpoints exist on the backend.
- **Dashboard** (`dashboardService`) — no stats endpoint.
- **Tasks** (`taskService`) — no tasks endpoint.
- **Reports** (`reportService`) — no reporting endpoint.
- **Lookups** (`lookupService`: countries/states/cities/programmes/degrees/English tests/intakes used by the University pages) — no public lookup endpoints wired in; note this is separate from `leadService.getDropdownData()`, which *is* real and feeds the Lead form's country/consultant selects.

When backend support lands for any of the above, follow the same pattern used for Leads/Applications: replace the mock array reads in the relevant service with `api.get`/`api.post` calls from `src/services/apiClient.js`, and add any new enum labels/variants to `src/services/mappers.js`.

## Project Structure

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/       # Shared UI (Button, Card, Table, Modal, etc.)
│   ├── context/          # AuthContext (session state)
│   ├── layout/            # MainLayout, Sidebar, Header
│   ├── mockData/          # Mock data backing the not-yet-connected services
│   ├── pages/              # Route-level pages (Auth, Leads, Applications, Dashboard, ...)
│   ├── services/
│   │   ├── apiClient.js    # fetch wrapper: base URL, auth header, 401 refresh, error unwrapping
│   │   ├── authService.js  # /auth/* endpoints
│   │   ├── applicationService.js  # /crm/applications/*, /crm/leads/{id}/applications/* + mocked Task/Report services
│   │   ├── mappers.js      # backend enum <-> UI label/Badge-variant maps (lead status, application status/stage, ...)
│   │   └── index.js        # leadService (real) + University/Dashboard/Lookup services (mocked)
│   ├── theme/
│   ├── App.jsx
│   └── main.jsx
├── .env                   # VITE_API_BASE_URL (gitignored)
├── .env.example
├── eslint.config.js
├── index.html
├── package.json
└── vite.config.js
```
