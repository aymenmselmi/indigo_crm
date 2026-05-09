# Architecture

## Multi-Tenant Design

Each organization (tenant) gets its own dedicated PostgreSQL database. This ensures complete data isolation — no shared tables, no `tenantId` filtering at the query level.

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│               http://localhost:5174                  │
└──────────────────────┬──────────────────────────────┘
                       │ JWT (Bearer token)
┌──────────────────────▼──────────────────────────────┐
│                 Backend (NestJS)                     │
│               http://localhost:3000                  │
├──────────────────────┬──────────────────────────────┤
│   Master DB          │   Tenant DBs                 │
│   (crm_dev)          │   (crm_tenant_<org_id>)      │
│                      │                              │
│ - organizations      │ - accounts                   │
│ - global_users       │ - contacts                   │
│ - invitations        │ - leads                      │
│ - tenant_configs     │ - opportunities              │
│                      │ - activities                 │
│                      │ - tasks                      │
│                      │ - users (tenant copy)        │
│                      │ - roles / permissions        │
│                      │ - dynamic_entities           │
└──────────────────────┴──────────────────────────────┘
```

---

## Database Strategy

### Master Database (`crm_dev`)
Stores platform-level data shared across all tenants:

| Table | Purpose |
|-------|---------|
| `organizations` | Each registered workspace/tenant |
| `global_users` | User accounts with org association |
| `invitations` | Pending/accepted/revoked invite tokens |
| `tenant_configs` | Connection info per tenant DB |

### Tenant Database (`crm_tenant_<org_id>`)
Created automatically when an organization registers. Contains all CRM data for that org:

| Table | Purpose |
|-------|---------|
| `accounts` | Company accounts |
| `contacts` | Individual contacts linked to accounts |
| `leads` | Lead records with scoring and conversion |
| `opportunities` | Deals in the sales pipeline |
| `activities` | Calls, emails, meetings, notes |
| `tasks` | To-do items with due dates and priorities |
| `users` | Mirror of global_users for tenant context |
| `roles` / `permissions` | RBAC configuration per tenant |
| `dynamic_entities` / `dynamic_fields` | Custom entity definitions |

---

## Request Lifecycle

Every authenticated request goes through:

```
Request
  → JWT Guard (validates Bearer token)
  → Roles Guard (checks role from JWT payload)
  → Tenant Context (extracts organizationId from JWT)
  → Database Switcher (connects to correct tenant DB)
  → Service (queries tenant-specific repository)
  → Response
```

---

## Project Structure

```
crm/
├── backend/
│   └── src/
│       ├── admin/              ← Back office (super_admin only)
│       │   ├── guards/
│       │   ├── admin.controller.ts
│       │   ├── admin.service.ts
│       │   └── admin.module.ts
│       ├── auth/               ← JWT auth + invite system
│       │   ├── dto/
│       │   ├── strategies/
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── auth.module.ts
│       ├── crm/                ← CRM modules
│       │   ├── accounts/
│       │   ├── contacts/
│       │   ├── leads/
│       │   ├── opportunities/
│       │   ├── activities/
│       │   └── tasks/
│       ├── database/
│       │   ├── entities/
│       │   │   ├── master/     ← Master DB entities
│       │   │   └── tenant/     ← Tenant DB entities
│       │   └── database.module.ts
│       ├── rbac/               ← Roles & permissions
│       │   ├── decorators/
│       │   ├── guards/
│       │   └── dto/
│       └── tenant/             ← Tenant context & DB switching
│           ├── interceptors/
│           └── services/
│               ├── database-switcher.service.ts
│               ├── tenant-context.service.ts
│               └── tenant-provisioning.service.ts
│
└── new-frontend/
    └── src/
        ├── components/
        │   ├── UI/             ← Icon, Primitives, TweaksPanel
        │   ├── Sidebar.jsx
        │   ├── Topbar.jsx
        │   ├── QuickAdd.jsx
        │   ├── DetailPanel.jsx
        │   └── CommandPalette.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── AcceptInvite.jsx
        │   ├── Dashboard.jsx
        │   ├── Accounts.jsx
        │   ├── Contacts.jsx
        │   ├── Leads.jsx
        │   ├── Opportunities.jsx
        │   ├── Pipeline.jsx
        │   ├── Activities.jsx
        │   ├── Tasks.jsx
        │   ├── Members.jsx
        │   ├── Analytics.jsx
        │   ├── Inbox.jsx
        │   └── BackOffice.jsx
        ├── services/
        │   └── api.js          ← All API calls
        ├── utils/
        │   └── normalize.js    ← Backend → UI data mappers
        └── data/
            └── seed.js         ← STAGES config (pipeline columns)
```

---

## Key Services

### DatabaseSwitcherService
Manages dynamic connections to tenant databases. Caches open connections per `organizationId`.

### TenantContextService
Stores the current `organizationId` per request using NestJS `AsyncLocalStorage` (request-scoped).

### TenantProvisioningService
Creates a new PostgreSQL database and runs schema sync when a new organization registers.
