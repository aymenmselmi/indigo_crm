# PFE Defense — Part 1: Project Overview & Architecture
> CRM Cloud Multi-Tenant — Soutenance Technique

---

## 1. WHAT PROBLEM DOES THIS CRM SOLVE?

### The Business Problem
Small and medium enterprises (PMEs) struggle with fragmented tools: spreadsheets for contacts, email for follow-ups, and no visibility into their sales pipeline. Enterprise CRMs like Salesforce are too expensive, too complex, and not customizable for niche sectors.

**Our CRM solves three core problems:**
1. **Data fragmentation** — all customer data (accounts, contacts, leads, deals, activities) in one place
2. **No collaboration** — multi-user access with role-based permissions so teams work together
3. **No scalability** — multi-tenant architecture means any number of organizations can onboard without sharing data

### Business Objective
Build a **cloud-native, multi-tenant CRM platform** that allows multiple independent organizations to manage their sales pipeline, contacts, and activities — with complete data isolation between tenants.

### Target Users
| Role | Responsibilities in the CRM |
|------|-----------------------------|
| **Super Admin** | Platform-level management: suspend orgs, monitor usage |
| **Admin** | Manage team members, custom fields, org settings |
| **Manager** | Team metrics, pipeline visibility, deal oversight |
| **User** | Day-to-day CRM: leads, contacts, accounts, deals, tasks |

---

## 2. HOW THE APPLICATION WORKS — END TO END

```
Browser (React SPA)
     │
     │  HTTP/REST (fetch API)
     ▼
NestJS Backend (:3000)
     │
     ├── JWT Guard validates token
     ├── TenantInterceptor extracts organizationId
     ├── DatabaseSwitcher routes to correct tenant DB
     │
     ├── Master PostgreSQL DB
     │     └── Organizations, GlobalUsers, Invitations
     │
     └── Tenant PostgreSQL DB (one per org)
           └── Accounts, Contacts, Leads, Opportunities,
               Activities, Tasks, Notifications, CustomFieldSchemas
```

**A typical user session:**
1. User opens `localhost:5173` → React SPA loads
2. User logs in → POST `/auth/login` → receives JWT
3. JWT stored in `localStorage`
4. Every API call sends `Authorization: Bearer <token>`
5. Backend validates JWT, extracts `organizationId`
6. `TenantInterceptor` sets the tenant context for that request
7. `DatabaseSwitcherService` connects to that org's PostgreSQL database
8. Data is returned, React updates UI
9. User sees their organization's data — completely isolated from other orgs

---

## 3. WHAT MAKES US DIFFERENT FROM SALESFORCE?

| Feature | Salesforce | Our CRM |
|---------|-----------|---------|
| **Price** | $25–$300/user/month | Free / affordable |
| **Setup** | Weeks of configuration | Minutes (register → ready) |
| **Custom fields** | Supported but complex | Simple admin UI |
| **Multi-tenant** | Shared DB with row filters | Dedicated DB per org (stronger isolation) |
| **Open source** | No | Yes (full code access) |
| **Tech stack** | Proprietary | Modern: NestJS + React + PostgreSQL |
| **Learning curve** | Very steep | Intuitive UI |
| **Self-hostable** | No | Yes |

**Key differentiator:** Database-per-tenant isolation is architecturally superior to row-level security for compliance-sensitive industries (banking, healthcare).

---

## 4. MAJOR TECHNICAL CHALLENGES SOLVED

### Challenge 1 — Multi-Tenant Database Isolation
**Problem:** How to completely isolate data between organizations without duplicating the entire application?

**Solution:** `DatabaseSwitcherService` dynamically creates and caches a PostgreSQL connection per organization. Each org has its own database. No `tenantId` column filtering needed — isolation is structural.

### Challenge 2 — Dynamic Connection Switching
**Problem:** NestJS is designed for single-database applications. How to switch databases per request?

**Solution:** `TenantContextService` (request-scoped, using AsyncLocalStorage pattern) stores the current `organizationId`. `DatabaseSwitcherService` caches `DataSource` objects in a `Map<orgId, DataSource>`. Connection is established once and reused.

### Challenge 3 — Custom Fields Without Schema Changes
**Problem:** Different organizations need different fields on the same entity (e.g., one org needs "LinkedIn URL" on contacts, another needs "Contract Type").

**Solution:** Option A — `customFields: JSONB` column on each CRM entity + `CustomFieldSchema` entity to store field definitions (label, type, options). No database migrations needed when adding new custom fields.

### Challenge 4 — Real-Time Notifications
**Problem:** When a deal is assigned or stage changes, the responsible user should be notified.

**Solution:** Fire-and-forget notification creation in service layer with `.catch(() => {})`. Notifications are stored in tenant DB and polled by the frontend Inbox page.

### Challenge 5 — RBAC at Scale
**Problem:** Different users need different access levels across modules.

**Solution:** Three-layer security: JWT validation → `RolesGuard` (role from token) → `PermissionsGuard` (fine-grained permissions from DB). Roles seeded per tenant on org creation.

---

## 5. HIGH-LEVEL ARCHITECTURE

### Frontend Architecture (React SPA)
```
src/
├── App.jsx                    ← Root: auth state, routing, global state
├── pages/                     ← One file per view/page
│   ├── Dashboard.jsx          ← KPI overview
│   ├── Accounts.jsx           ← Account CRUD table
│   ├── Contacts.jsx           ← Contact CRUD table
│   ├── Leads.jsx              ← Lead management + conversion
│   ├── Opportunities.jsx      ← Deal table view
│   ├── Pipeline.jsx           ← Kanban drag-and-drop
│   ├── Analytics.jsx          ← Charts, funnel, leaderboard
│   ├── Reports.jsx            ← Tabular data + CSV export
│   ├── Inbox.jsx              ← In-app notifications
│   ├── Tasks.jsx              ← My tasks
│   ├── Members.jsx            ← Team management
│   ├── CustomFields.jsx       ← Field schema admin
│   └── BackOffice.jsx         ← Super admin panel
├── components/
│   ├── layout/                ← Sidebar, Topbar
│   ├── panels/                ← DetailPanel, QuickAdd
│   ├── shared/                ← CommandPalette, ErrorBoundary, CustomFieldInputs
│   └── UI/                    ← Icon, Primitives, TweaksPanel
├── services/
│   └── api.js                 ← All API calls (fetch wrapper)
└── utils/
    ├── normalize.js           ← Backend → UI data mapping
    └── stages.js              ← Pipeline stage definitions
```

**State management:** Pure React `useState` / `useEffect` — no Redux, no Zustand. Global state lives in `App.jsx` and is passed as props.

**Styling:** CSS custom properties (design tokens) in `styles.css`. No Tailwind. No component library. 100% custom components.

**Routing:** No React Router. View switching via `useState('view')` in `App.jsx`.

### Backend Architecture (NestJS)
```
src/
├── main.ts                    ← App bootstrap
├── app.module.ts              ← Root module
├── auth/                      ← JWT, login, register, invite
├── rbac/                      ← Roles, permissions, guards
├── tenant/                    ← Multi-tenancy engine
│   ├── services/
│   │   ├── tenant-context.service.ts      ← Request-scoped org context
│   │   ├── database-switcher.service.ts   ← Dynamic DB connections
│   │   └── tenant-provisioning.service.ts ← Org + DB creation
│   └── interceptors/
│       └── tenant.interceptor.ts          ← Sets context per request
├── database/
│   ├── entities/
│   │   ├── master/            ← Organization, GlobalUser, Invitation
│   │   └── tenant/            ← All CRM entities
│   └── migrations/
├── crm/                       ← Business logic
│   ├── accounts/
│   ├── contacts/
│   ├── leads/
│   ├── opportunities/
│   ├── activities/
│   ├── tasks/
│   ├── notifications/
│   └── custom-fields/         ← CustomFieldSchema CRUD
└── admin/                     ← Super admin + manager endpoints
```

### Database Architecture

**Master Database (1 instance):**
```
organizations          global_users           invitations
─────────────         ────────────           ───────────
id (PK)               id (PK)                id (PK)
name                  email                  email
slug                  password               token
dbHost                organizationId (FK)    organizationId (FK)
dbPort                role                   status
dbName                status                 expiresAt
dbUser                lastLogin              role
dbPassword
status
planType
```

**Tenant Database (1 per org):**
```
accounts        contacts        leads
────────        ────────        ─────
id              id              id
name            firstName       firstName
type            lastName        lastName
industry        email           email
ownerId         accountId(FK)   status
customFields    customFields    source
                                estimatedValue
                                customFields

opportunities       activities          tasks
─────────────       ──────────          ─────
id                  id                  id
name                type                title
stage               subject             status
amount              relatedContactId    priority
accountId(FK)       relatedOpportunityId dueDate
ownerId             ownerId             assignedToId
customFields

notifications       custom_field_schemas
─────────────       ────────────────────
id                  id
userId              entityType
type                name (slug)
title               label
body                fieldType
read                options[]
entityType          required
entityId            order
```

### Authentication Flow
```
Client                          Server
  │                               │
  │── POST /auth/login ──────────►│
  │   { email, password }         │
  │                               │── Query GlobalUser in master DB
  │                               │── bcrypt.compare(password, hash)
  │                               │── Generate JWT:
  │                               │   { sub: userId,
  │                               │     email,
  │                               │     organizationId,
  │                               │     role }
  │◄── { accessToken } ──────────│
  │                               │
  │── GET /accounts ────────────►│
  │   Authorization: Bearer <jwt> │
  │                               │── JwtAuthGuard validates token
  │                               │── TenantInterceptor sets orgId
  │                               │── DatabaseSwitcher gets tenant DB
  │                               │── AccountsService queries tenant DB
  │◄── { data: [...accounts] } ──│
```

### Multi-Tenancy Architecture
```
Request arrives
     │
     ▼
TenantInterceptor.intercept()
     │── JWT payload has organizationId
     │── TenantContextService.setOrganizationId(orgId)
     │
     ▼
Any CRM Service
     │── this.databaseSwitcher.getDataSourceForOrganization(orgId)
     │
     ▼
DatabaseSwitcherService
     │── Check cache: Map.has(orgId) ?
     │     YES → return cached DataSource
     │     NO  → query Organization from master DB
     │            → new DataSource({ host, port, db, user, pass })
     │            → dataSource.initialize()
     │            → Map.set(orgId, dataSource)
     │            → return dataSource
     │
     ▼
dataSource.getRepository(Account)
     │── Returns TypeORM repository scoped to tenant DB
     │── All queries execute against org's database
```

---

## 6. API COMMUNICATION FLOW

```
Frontend (api.js)
     │
     │  fetch(`${BASE}${path}`, { headers: { Authorization: 'Bearer ...' } })
     │
     ▼
NestJS Controller
     │  @UseGuards(AuthGuard('jwt'), RolesGuard)
     │  @Roles('admin', 'manager', 'user')
     │
     ▼
NestJS Service
     │  const ds = await this.databaseSwitcher.getDataSourceForOrganization(orgId)
     │  const repo = ds.getRepository(Entity)
     │  return repo.find(...)
     │
     ▼
PostgreSQL (Tenant DB)
     │  SELECT * FROM accounts WHERE ...
     │
     ▼
Response: { data: [...], total: N, hasMore: boolean }
```

---

## 7. DYNAMIC FIELDS ARCHITECTURE

### How It Works
When an admin creates a custom field (e.g., "LinkedIn URL" for Contacts):

1. **Schema stored** in `custom_field_schemas` table:
   ```json
   { "entityType": "contact", "name": "linkedin_url",
     "label": "LinkedIn URL", "fieldType": "text", "required": false }
   ```

2. **When creating/editing a record**, the form fetches schemas for that entity type and renders the extra inputs

3. **Value saved** in the `customFields` JSONB column:
   ```json
   { "linkedin_url": "https://linkedin.com/in/john" }
   ```

4. **When viewing a record**, DetailPanel fetches schemas and displays values from `customFields`

### Why JSONB (Option A) vs Full Dynamic Entities (Option B)?
- **Option A (our choice):** Fast, no migrations, simple — perfect for MVP and PFE
- **Option B:** Full entity creation (new tables) — complex, requires runtime TypeORM schema changes
- Option A covers 90% of real-world "custom field" use cases
