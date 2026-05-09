# Frontend Pages

## Tech Stack

- **React 19** with Vite
- **Custom CSS design system** — no Tailwind or MUI, uses CSS variables (oklch color tokens)
- **No React Router** — view state managed via `useState` in `App.jsx`

---

## Navigation

### Sidebar sections

| Section | Items | Visible to |
|---------|-------|-----------|
| Workspace | Dashboard | Everyone |
| Records | Accounts, Contacts, Leads, Opportunities, Pipeline, Activities | Everyone |
| Workflow | Inbox, My tasks, Analytics, Reports | Everyone |
| Settings | Members | Admin + Super admin |
| Platform | Back office | Super admin only |

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `C` | Open Quick Add modal |
| `/` | Open command palette |
| `Esc` | Close panels / modals |

---

## Pages

### Login (`/`)
- Email + password form
- Link to Register page ("Create a workspace")
- On success: stores `accessToken` in `localStorage`, loads app

### Register (`/register`)
- 2-step form:
  - Step 1: First name, last name, email, password, confirm password
  - Step 2: Organization name, slug (auto-generated, editable)
- Calls `POST /auth/register`
- On success: auto-login

### Accept Invite (`/accept-invite?token=UUID`)
- Validates token on load via `GET /auth/check-invite/:token`
- Shows org name and pre-filled email
- Form: first name, last name, password, confirm password
- Calls `POST /auth/accept-invite/:token`
- On success: auto-login

### Dashboard
- KPI cards: Pipeline value, Closed won, Win rate, Avg deal size, Activities count
- Pipeline by stage (bar strips)
- Forecast vs target (placeholder)
- Lead sources (placeholder)
- Indigo AI nudges (dynamic based on real deal data)
- Top open deals table
- Activity feed

### Accounts
- Table: name, domain, industry, tier, health, MRR, tags, owner
- Filter: All / Strategic / At-risk
- Search by name
- Bulk select with export/delete
- **New account** → modal form (name, type, industry, website, employees, revenue)
- **Edit** (pencil icon per row) → same modal pre-filled
- **Delete** (× icon per row) → confirm then delete

### Contacts
- Table: name, title, account, email, status, last contact date
- Search by name or email
- **New contact** → modal form (first/last name, account dropdown, email, phone, title, department, status)
- **Edit** / **Delete** per row

### Leads
- Table: name+initials, company, status chip, source tag, lead score bar, estimated value, age
- Filter pills: All / New / Contacted / Qualified / Converted / Rejected (with counts)
- Search by name, company, or email
- **New lead** → modal form (all fields including score, estimated value, notes)
- **Edit** / **Delete** per row
- **Convert** button per row (not shown for converted/rejected leads) → confirmation modal showing what will be created (Account + Contact + Opportunity)

### Opportunities
- Table: deal name, stage (colored dot), amount, probability bar, close date, account, owner
- Filter: All / Open / Won
- Sort by clicking column headers (Amount, Name, Stage, Probability)
- Search by deal or account name
- **New deal** → opens Quick Add modal

### Pipeline
- Kanban board organized by stage columns: Lead → Qualify → Proposal → Negotiate → Close-Won
- Drag-and-drop cards between columns
- Each card shows: deal name, company, amount, probability bar, owner avatar, age
- Updates backend on drop via `PUT /opportunities/:id`

### Activities
- Feed list: all activity types (call, email, meeting, note, task)
- Filter by type + search by subject
- **Log activity** → Quick Add modal pre-set to activity type

### My Tasks
- Grouped by status: To do / In progress
- Priority badges (High / Med / Low)
- Overdue/today/tomorrow indicators
- Checkbox to mark complete
- **New task** → Quick Add modal

### Analytics
- KPI row: Bookings, Avg sales cycle, Pipeline coverage, Conversion rate
- Funnel chart: Lead → Qualified → Proposal → Negotiation → Closed-Won
- Team leaderboard (placeholder — no team data yet)
- Revenue by source (placeholder)

### Members (admin only)
- Invite form: email + role → returns copyable invite URL
- Team members list: avatar, name, email, role chip, last active
- Pending invitations with Revoke button
- Past invitations (accepted/revoked/expired) at reduced opacity

### Back Office (super_admin only)
- Stats row: total orgs, total users, active orgs, suspended orgs
- **Organizations tab**: all tenants with plan badge, user count, database name, suspend/activate toggle
- **All users tab**: searchable list of all global users across all orgs with role/status badges

---

## Global Components

### Quick Add Modal (`C` key or "New" button)
Tabs: Deal / Account / Contact / Task / Activity  
Creates records via the API and shows a toast on success.

### Command Palette (`⌘K`)
- Navigate to any page
- Quick create actions
- AI placeholder

### Detail Panel
Slides in from the right when clicking a row.  
Shows record details — currently wired for accounts and deals.

### Tweaks Panel
Floating settings panel (gear icon, bottom right).  
Controls: Theme (light/dark), Accent color, Density, Sidebar mode.  
Settings are persisted in `localStorage`.

---

## API Service (`src/services/api.js`)

All API calls go through the `api` object in `api.js`.  
Automatically attaches the Bearer token from `localStorage`.  
On 401: clears token and fires `auth:logout` event.

The `unwrap(res)` helper normalizes paginated responses:
```js
// Handles: array, { data: [] }, { items: [] }
unwrap(response) → array
```

## Data Normalizers (`src/utils/normalize.js`)

Maps backend entity shapes to frontend UI shapes:

| Function | Input | Output |
|----------|-------|--------|
| `normalizeOpportunity` | Backend opportunity | Deal card data |
| `normalizeAccount` | Backend account | Table row data |
| `normalizeContact` | Backend contact | Table row data |
| `normalizeLead` | Backend lead | Table row data |
| `normalizeActivity` | Backend activity | Feed item data |
| `normalizeTask` | Backend task | Task row data |
