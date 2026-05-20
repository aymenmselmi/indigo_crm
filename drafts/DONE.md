# What's Done

## Backend (NestJS)

### Auth
- JWT login / register / logout
- Invitation flow: create invite → accept invite via token
- List & revoke invitations
- `GET /auth/me` to rehydrate session
- Role hierarchy: `user` < `manager` < `admin` < `super_admin`

### Multi-tenancy
- Database-per-organization architecture
- `TenantInterceptor` reads `organizationId` from JWT and routes to correct DB
- `DatabaseSwitcherService` dynamically switches TypeORM data sources

### Guards
- `JwtAuthGuard` — protects all private routes
- `ManagerGuard` — allows manager / admin / super_admin
- `AdminGuard` — allows admin / super_admin
- `SuperAdminGuard` — allows super_admin only

### CRM Endpoints
- **Accounts** — CRUD + `/accounts/:id/contacts` + `/accounts/:id/opportunities`
- **Contacts** — CRUD
- **Leads** — CRUD + `POST /leads/:id/convert` (converts to opportunity)
- **Opportunities** — CRUD + `/opportunities/:id/activities`
- **Activities** — CRUD
- **Tasks** — CRUD + `GET /api/tasks/my-tasks`

### Manager / Admin / Back-office
- `GET /manager/metrics` — pipeline stats for the org (manager+ only)
- `GET /admin/stats` + `/admin/organizations` + `/admin/users` (admin+ only)

---

## Frontend (React + Vite)

### Auth flow
- Login page, Register page, Accept-invite page
- Token stored in `localStorage`, auto-cleared on 401
- `auth:logout` event dispatches on any 401 response

### Pages

| Page | Status |
|---|---|
| Dashboard | Real data — KPIs, open deals table, activity feed |
| Accounts | Full CRUD modal, bulk delete, search, type filter |
| Contacts | Full CRUD modal, search |
| Leads | Full CRUD modal, convert-to-opportunity button |
| Opportunities | Full CRUD modal, table with edit/delete per row |
| Pipeline | Kanban board, drag-and-drop (persists stage to API) |
| Activities | List view |
| Inbox | Placeholder |
| My Tasks | Full CRUD modal |
| Analytics | Real data — funnel, KPIs from API (no hardcoded values) |
| Reports | Placeholder only |
| Team Metrics (Manager) | KPIs, pipeline by stage, activity feed, close-deal action |
| Members (Admin) | List members, invite form with role picker, revoke pending invites |
| Back Office (Super Admin) | Org + user management |

### UI system
- oklch CSS design tokens (accent, theme, density)
- TweaksPanel — toggle light/dark, accent color, density, sidebar
- Command palette (⌘K / /)
- Quick Add modal (C)
- Toast notifications
- Detail panel — slides in for accounts, deals, tasks, contacts
  - Account: real open deals + real activity feed (filtered by account's opportunities)
  - Deal: real activity feed via `/opportunities/:id/activities`
  - Contact: fields panel
  - Task: fields panel

### Role-based sidebar
- All users: Dashboard, Records, Workflow sections
- manager+: Team Metrics nav item
- admin+: Members nav item
- super_admin: Back Office nav item

### Fixes applied this session
- Input focus loss bug fixed (helper components hoisted to module scope)
- ManagerView translated from French to English
- Members page role chips handle `manager` and `super_admin` roles
- DetailPanel removed seed data dependency entirely

---

## Session 2 — Partially implemented features resolved

### Gérer utilisateurs et rôles
- Backend: `PATCH /auth/members/:id/role` — validates role, blocks self-change, protects super_admin
- Frontend: role dropdown replaces static chip per member row (except self and super_admins), fires immediately on change

### Lier à un contact ou une opportunité
- QuickAdd activity form now loads contacts + opportunities on mount
- Two new dropdowns: "Link to contact" / "Link to opportunity"
- `relatedContactId` + `relatedOpportunityId` sent in create payload

### Consulter historique des activités
- Backend: `findAll` and `findByOpportunity` queries now JOIN `relatedContact` and `relatedOpportunity`
- `normalizeActivity` exposes `linkedLabel` (contact name · opportunity name)
- Activities page shows linked-record badge with link icon under each activity subject

### Analyser les activités de l'équipe
- ManagerView "Recent team activities" replaced with "Team activity breakdown"
- Bar chart per type (call/email/meeting/note/task) showing count + completed ratio
- Completed vs pending totals summary strip
- Recent feed still shows last 5 activities below the breakdown

---

## Session 3 — Bug fixes

### Invite DTO — manager role was rejected
- `@IsIn(['admin', 'user'])` was missing `'manager'`
- Fixed: `@IsIn(['admin', 'manager', 'user'])` in `invite.dto.ts`

### "New task" / "New deal" buttons not working
- `openQuickAdd` prop was not passed from App.jsx to Pipeline or Tasks
- Buttons had no `onClick` handler
- Fixed: App.jsx passes the prop, both buttons wired to `openQuickAdd`

### Account/Contacts filter pills visual-only
- Accounts: filter logic was comparing against `health` field which is always `'good'`; replaced with type-based filter (Customer/Prospect/Partner) matching real data
- Contacts: `filter` state didn't exist at all; added state + pills + filter logic (active/inactive/prospect)
- `normalizeAccount` now preserves `type` field through to UI layer

### Opportunities table — Account column blank
- `findAll` in `opportunities.service.ts` was missing `leftJoinAndSelect('opportunity.account', 'account')`
- `findById` was missing `relations: ['account']`
- Fixed both; account name now appears in the Opportunities table

---

## Session 4 — Dashboard & Notifications

### Contacts table — Account column blank
- Same JOIN bug as Opportunities: `findAll` and `findById` in `contacts.service.ts` missing `leftJoinAndSelect` / `relations: ['account']`
- Fixed both; account name now shows in the Contacts table

### Tasks not appearing in My Tasks after creation
- Root cause: `assignedToId` was never set on task creation, so `getMyTasks` (which filters by `assignedToId = userId`) returned nothing
- Fixed: `tasks.service.ts` now defaults `assignedToId` to `createdByUserId` when not provided

### Dashboard — Tasks section added
- Fetches `getMyTasks()` alongside deals and activities on load
- Shows up to 8 open tasks with overdue/today/upcoming state and priority chips
- Check-off button marks task complete inline via API
- "New task" button opens QuickAdd pre-set to task tab
- `refreshKey` prop added: QuickAdd fires `onSaved` callback → App.jsx increments `refreshKey` → Dashboard re-fetches all data (deals, activities, tasks)

### Dashboard — Sales Forecast chart
- Vertical bar chart with Y-axis dollar labels and dashed grid lines
- 3 bars: **Pipeline** (total open), **Weighted** (amount × prob%), **Committed** (prob ≥ 75%)
- Deal counts labeled above each bar; color-coded legend below

### Dashboard — Deal Type radar chart
- Hexagonal SVG spider chart with 6 axes (Prospect → Qualify → Propose → Negotiate → Won → Lost)
- 3 filled polygons: Pending (yellow), Loss (red), Won (green)
- Uses real deal stage distribution from API data

### Dashboard — Open deals table improved
- Added Probability column with color coding (green ≥ 75%, accent ≥ 40%, grey below)
- "New deal" button in card header wired to QuickAdd
- Empty state has inline "Add first deal" button

### Notifications system (full stack)
**Backend:**
- `Notification` entity added to tenant DB (auto-sync creates table)
- `NotificationsService` + `NotificationsController` under `/notifications`
- Endpoints: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
- `TasksService` fires `task_assigned` notification when a task is assigned to a different user
- `Notification` entity registered in both `database.module.ts` and `database-switcher.service.ts`

**Frontend:**
- Bell icon in Topbar shows red badge with unread count
- Click opens dropdown: title, body snippet, relative time, blue dot for unread
- Unread items highlighted with accent background
- Click notification → marks read (optimistic update + API call)
- "Mark all read" button
- Polls every 30 seconds for new notifications

---

## Refactoring & Cleanup

### Frontend restructure
- `components/` reorganized into subfolders: `layout/`, `panels/`, `shared/`, `UI/`
- All import paths updated after move
- Old prototype files removed from `frontend/` root
- Test scripts, debug files, log files, JSON artifacts removed from project root
