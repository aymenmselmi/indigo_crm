# What's Done

## Backend (NestJS)

### Auth & Invitations
- JWT login / register / logout
- `GET /auth/me` to rehydrate session
- Invitation flow: `POST /auth/invite` → `GET /auth/check-invite/:token` → `POST /auth/accept-invite/:token`
- `GET /auth/invitations` + `DELETE /auth/invitations/:id` (revoke pending)
- `GET /auth/members` — list all org members
- `PATCH /auth/members/:id/role` — change role (admin only, blocks self-change, protects super_admin)
- `DELETE /auth/members/:id` — remove member (admin only, blocks self-remove and super_admin)
- Role hierarchy: `user` < `manager` < `admin` < `super_admin`

### Multi-tenancy
- Database-per-organization architecture
- `TenantInterceptor` reads `organizationId` from JWT and routes to correct DB
- `DatabaseSwitcherService` dynamically switches TypeORM data sources

### Guards
- `JwtAuthGuard` — protects all private routes
- `RolesGuard` + `@Roles()` decorator — fine-grained per-route role enforcement
- `ManagerGuard`, `AdminGuard`, `SuperAdminGuard` for shorthand guards

### CRM Endpoints
All four core resources follow the same pattern:
- **Accounts** — CRUD + `/accounts/:id/contacts` + `/accounts/:id/opportunities` + `?mine=true` filter + `search` + `stats/count`
- **Contacts** — CRUD + `/contacts/:id/activities` + `?mine=true` + `search` + `stats/count`
- **Leads** — CRUD + `POST /leads/:id/convert` + `?mine=true` + `search` + `stats/count`
- **Opportunities** — CRUD + `/opportunities/:id/activities` + `?mine=true` + `search` + `stats/count`
- **Activities** — CRUD; `findAll` JOINs `relatedContact` + `relatedOpportunity`
- **Tasks** — CRUD + `GET /api/tasks/my-tasks`
- Route ordering fixed: `search` and `stats/count` declared before `/:id` in all controllers

### Record Ownership
- `ownerId` UUID column on Account, Contact, Opportunity, Lead (nullable, TypeORM auto-syncs)
- `create` defaults `ownerId` to `req.user.id`; `?mine=true` param filters by owner on `findAll`
- DTOs accept optional `ownerId` to assign on creation

### Notifications
- `Notification` entity in tenant DB (auto-synced)
- `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
- `TasksService` fires `task_assigned` when a task is assigned to a different user
- `OpportunityService` fires `deal_assigned` on create/owner-change, `deal_stage_changed` / `deal_won` / `deal_lost` on stage change (only notifies owner when actor ≠ owner)
- `LeadService` fires `lead_assigned` on create/owner-change (same actor-guard)
- All notification calls are fire-and-forget with `.catch(() => {})` to avoid blocking the request

### Manager / Admin / Back-office
- `GET /manager/metrics` — pipeline stats for the org (manager+)
- `GET /admin/stats` + `/admin/organizations` + `/admin/users` (admin+)

---

## Frontend (React + Vite)

### Auth flow
- Login, Register, Accept-invite pages
- Token stored in `localStorage`, auto-cleared on 401
- `auth:logout` event dispatches on any 401 response
- `App.jsx` fetches `GET /auth/members` on login → builds `membersById` map passed to all pages

### Pages

| Page | Status |
|---|---|
| Dashboard | KPIs, open deals table (with probability), sales forecast chart, deal type radar chart, tasks section, activity feed |
| Accounts | CRUD modal, bulk delete, search, type filter (Customer/Prospect/Partner), "My accounts" pill, owner avatar |
| Contacts | CRUD modal, search, status filter (active/inactive/prospect), "My contacts" pill, owner avatar, account column |
| Leads | CRUD modal, convert-to-opportunity button, "My leads" pill, owner avatar |
| Opportunities | CRUD modal, table with edit/delete, "My deals" pill, owner avatar, account column |
| Pipeline | Kanban + list view toggle, drag-and-drop (persists to API), close-date filters (5 options), "My pipeline" pill |
| Activities | List view with linked-record badges |
| Inbox | Notifications tab (real data, click-to-read, mark-all-read) + Urgent tasks tab (overdue + due today) |
| My Tasks | CRUD modal, overdue/today/upcoming states, priority chips, inline check-off |
| Analytics | Conversion funnel, revenue KPIs, lead stats — all real API data |
| Reports | Pipeline by stage, leads by status, activities by type — bar charts + summary table + CSV export per section |
| Team Metrics (Manager) | KPIs, pipeline by stage, team activity breakdown (bar chart by type), recent feed, close-deal action |
| Members (Admin) | List members + role dropdown, invite form (email + role), revoke pending invites, remove accepted members |
| Back Office (Super Admin) | Org + user management |

### UI system
- oklch CSS design tokens (accent, theme, density)
- TweaksPanel — toggle light/dark, accent color, density, sidebar
- Command palette (⌘K or /)
- Quick Add modal (C) — Deal / Account / Contact / Task / Activity tabs
- Toast notifications
- Detail panel — slides in for accounts, deals, tasks, contacts
  - Account: real open deals + activity feed filtered by account's opportunities
  - Deal: activity feed via `/opportunities/:id/activities`; Email/Call/Meet/Note buttons open QuickAdd pre-filled
  - Contact: fields; Email/Call/Meet/Note buttons open QuickAdd pre-filled with contact linked
  - Task: fields panel
- Error boundaries: each page wrapped in `ErrorBoundary` — crash in one page shows "Try again" without breaking the shell

### Record ownership UI
- `Avatar` component resolves `ownerId` → real initials + consistent color via `membersById`
- `ownerId = null` renders dashed grey "—" with "Unassigned" tooltip
- Owner dropdown in all create/edit modals (Account, Contact, Opportunity, Lead)
- "My …" toggle pills on Accounts, Contacts, Leads, Opportunities, Pipeline

### Bell notifications (Topbar)
- Red badge with unread count, polls every 30 seconds
- Dropdown: title, body, relative time, blue dot for unread
- Click → marks read (optimistic); "Mark all read" button

### Role-based sidebar
- All users: Dashboard, Records, Workflow sections
- manager+: Team Metrics nav item
- admin+: Members nav item
- super_admin: Back Office nav item

---

## Code quality & architecture

- `components/` split into `layout/`, `panels/`, `shared/`, `UI/`
- `STAGES` moved from `data/seed.js` to `utils/stages.js` (seed.js no longer used)
- `normalizeOpportunity`, `normalizeAccount`, `normalizeContact`, `normalizeLead` — consistent shape for all list/detail views
- `downloadCSV` utility in Reports — pure JS blob download, no library dependency
- `ErrorBoundary` class component at `components/shared/ErrorBoundary.jsx`

---

## Session 9 — Button audit & wiring

### Buttons audited across all pages
Full grep pass across all `.jsx` files to identify buttons missing `onClick` handlers.

### Fixed — now functional
| Button | Location | Fix applied |
|---|---|---|
| "New deal" (page header) | `Dashboard.jsx` | Wired to `openQuickAdd('deal')` |
| "View board →" (pipeline card) | `Dashboard.jsx` | Wired to `setView('pipeline')` — `setView` prop added to Dashboard |
| "Export" (bulk-select bar) | `Accounts.jsx` | Downloads selected accounts as CSV (Name, Type, Industry, Website, Owner) |
| "Export" (page header) | `Analytics.jsx` | Downloads KPI summary as CSV |
| "+" (each kanban column header) | `Pipeline.jsx` | Wired to `openQuickAdd('deal')` |
| "Filter" | `Tasks.jsx` | Replaced with priority dropdown (All / High / Medium / Low) + "Hide/Show completed" toggle |

### Left as intentional placeholders
| Button | Reason |
|---|---|
| "Last 30 days" date picker | Dashboard chrome — no date-range filter built |
| "Ask Indigo AI" | AI feature, out of scope |
| "Dismiss all" in AI nudges card | Nudge content is static/fake |
| Activity feed filter icon | Minor chrome |
| "⋯" more menu in DetailPanel | Overflow menu, no defined actions yet |

---

## Session 10 — Polish & wiring pass

### Contact detail panel — activity feed
- `api.getContactActivities(id)` added (`GET /contacts/:id/activities` — backend already existed)
- `DetailPanel` `useEffect` now fetches activities for `contact` kind
- "Recent activity" `ActivityFeed` section added to the contact panel, matching the deal panel

### CommandPalette — real search + correct QuickAdd types
- Full rewrite of `CommandPalette.jsx`
- Typing ≥ 2 chars fires debounced parallel search across accounts, contacts, opportunities, leads
- Results grouped by type (Account / Contact / Deal / Lead) with sub-label (industry, email, stage)
- Below 2 chars: shows static nav + action items as before
- "New deal / contact / task / account" actions now pass the correct type to `openQuickAdd`
- All nav items extended to cover Contacts, Analytics, Reports pages

### Dashboard AI nudge action buttons
- "Draft email" → opens QuickAdd pre-set to activity tab
- "New task" → opens QuickAdd pre-set to task tab
- "View pipeline" → navigates to Pipeline view via `setView('pipeline')`

### Dead code removed
- `SimpleView` component removed from `QuickAdd.jsx` (no longer imported anywhere since Reports page was built)

### MISSING.md updated
- Removed all completed items; now reflects only genuine remaining gaps

---

## Known remaining gaps (from cahier des charges)

| Item | Priority |
|---|---|
| Docker + `docker-compose.yml` for local dev | Medium |
| GitHub Actions CI workflow (lint / build) | Medium |
| Custom fields / Dynamic entities UI | Medium (backend entities exist, no frontend) |
| Contacts detail panel — related deals + activity feed | Low |
| Rapport PFE | Academic |
| Presentation slides | Academic |
