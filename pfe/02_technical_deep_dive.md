# PFE Defense — Part 2: Technical Deep Dive
> Every key file, every pattern explained

---

## 1. AUTHENTICATION & AUTHORIZATION — COMPLETE EXPLANATION

### JWT Flow (Step by Step)

**Step 1 — Registration**
```
POST /auth/register
{
  "firstName": "Ahmed",
  "lastName": "Gharbi",
  "email": "ahmed@company.com",
  "password": "secret123",
  "organizationName": "My Company"
}
```

What happens internally:
1. `AuthService.register()` called
2. Hash password: `bcrypt.hash(password, 10)` → never store plain text
3. Create `Organization` in master DB with unique slug
4. `TenantProvisioningService.provisionTenant(org)`:
   - Generate DB name: `crm_tenant_org_<uuid>`
   - Create PostgreSQL database with admin credentials
   - Initialize TypeORM DataSource → creates all tables (synchronize: true in dev)
   - Seed default roles (Admin, Manager, User)
5. Create `GlobalUser` in master DB (email, hashed password, organizationId)
6. Create `User` in tenant DB (linked to GlobalUser)
7. Sign JWT: `jwt.sign({ sub: userId, email, organizationId, role })`
8. Return `{ accessToken }`

**Step 2 — Login**
```
POST /auth/login
{ "email": "ahmed@company.com", "password": "secret123" }
```
1. Find `GlobalUser` by email in master DB
2. `bcrypt.compare(plainPassword, storedHash)` → boolean
3. If wrong → `UnauthorizedException`
4. Update `lastLogin` timestamp
5. Sign and return JWT

**Step 3 — Authenticated Request**
Every subsequent request:
1. Frontend sends: `Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...`
2. `AuthGuard('jwt')` from `@nestjs/passport` intercepts
3. Calls `JwtStrategy.validate(payload)`:
   ```typescript
   validate(payload: any) {
     return {
       id: payload.sub,
       email: payload.email,
       organizationId: payload.organizationId,
       role: payload.role
     };
   }
   ```
4. Returns user object → attached to `req.user`
5. `RolesGuard` checks `req.user.role` against `@Roles()` decorator metadata
6. `TenantInterceptor` reads `req.user.organizationId` → sets context

### Why JWT (not sessions)?
- **Stateless**: No session storage needed, scales horizontally
- **Self-contained**: Role and orgId embedded in token (no DB lookup per request)
- **Standard**: RFC 7519, supported by all clients

### JWT Security Considerations
- Secret stored in `.env` (`JWT_SECRET`)
- Tokens expire (configurable, typically 24h)
- No refresh tokens in current impl (jury may ask — acknowledge as improvement area)
- HTTPS in production prevents token interception

### Guard Chain
```
Request
  │
  ├── AuthGuard('jwt')       ← Is token valid? (cryptographic check)
  │     └── FAIL → 401 Unauthorized
  │
  ├── TenantInterceptor      ← Set organization context
  │
  ├── RolesGuard             ← Does user have required role?
  │     └── FAIL → 403 Forbidden
  │
  └── Controller method      ← Execute business logic
```

---

## 2. MULTI-TENANCY — COMPLETE EXPLANATION

### Why Database-Per-Tenant (not shared DB)?

| Approach | Isolation | Complexity | Cost |
|----------|-----------|------------|------|
| Shared DB + tenantId filter | Low (row-level) | Low | Low |
| Schema-per-tenant | Medium | Medium | Medium |
| **Database-per-tenant (our choice)** | **High** | **High** | **High** |

**We chose database-per-tenant because:**
- Complete data isolation (no accidental cross-tenant leaks)
- Easier compliance (GDPR, industry regulations)
- Independent backup/restore per org
- Better performance (indexes per org, no WHERE tenantId on every query)
- Suits multi-organization SaaS model

### TenantContextService
```typescript
// This service stores the current request's organizationId
// It uses NestJS REQUEST scope — a new instance per HTTP request
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private organizationId: string;
  private userId: string;

  setOrganizationId(id: string) { this.organizationId = id; }
  getOrganizationId(): string { return this.organizationId; }
}
```

**Why REQUEST scope?** Each HTTP request is independent. Using a singleton would cause race conditions — request A's orgId would overwrite request B's while both are being processed.

### TenantInterceptor
```typescript
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (user?.organizationId) {
      this.tenantContext.setOrganizationId(user.organizationId);
      this.tenantContext.setUserId(user.id);
    }

    return next.handle(); // Execute the controller
  }
}
```

### DatabaseSwitcherService — The Core Engine
```typescript
// Cache: orgId → DataSource (persistent connection)
private dataSourceMap: Map<string, DataSource> = new Map();

async getDataSourceForOrganization(orgId: string): Promise<DataSource> {
  // 1. Check cache
  if (this.dataSourceMap.has(orgId)) {
    return this.dataSourceMap.get(orgId);
  }

  // 2. Load org from master DB (only happens once per org)
  const org = await masterDB.getRepository(Organization)
    .findOne({ where: { id: orgId } });

  // 3. Create DataSource with org's DB credentials
  const tenantDS = new DataSource({
    type: 'postgres',
    host: org.dbHost,
    port: org.dbPort,
    database: org.dbName,  // e.g., 'crm_tenant_org_abc123'
    username: org.dbUser,
    password: org.dbPassword,
    entities: [User, Account, Contact, Lead, Opportunity, ...],
    synchronize: true, // Auto-create tables in dev
  });

  // 4. Initialize connection
  await tenantDS.initialize();

  // 5. Cache for future requests
  this.dataSourceMap.set(orgId, tenantDS);

  return tenantDS;
}
```

**Performance:** After the first request for an org, subsequent requests use the cached `DataSource` — no re-connection overhead.

### Tenant Provisioning — What Happens on Register
```
1. GenerateUniqueName: 'crm_tenant_org_<uuid_slice>'
2. CREATE DATABASE crm_tenant_org_xyz (PostgreSQL command)
3. Save Organization record in master DB:
   { dbHost, dbPort, dbName, dbUser, dbPassword }
4. Initialize DataSource → TypeORM runs synchronize:
   Creates: users, accounts, contacts, leads, opportunities,
            activities, tasks, notifications, custom_field_schemas,
            dynamic_entities, dynamic_fields, roles, permissions table
5. Seed default roles:
   - Admin: all permissions
   - Manager: CRUD on CRM entities
   - User: read + create only
6. On failure → DROP DATABASE (cleanup)
```

---

## 3. RBAC — ROLE-BASED ACCESS CONTROL

### Architecture
```
@Roles('admin', 'manager')           ← Decorator sets metadata
@UseGuards(AuthGuard('jwt'), RolesGuard)  ← Applied at controller/method

RolesGuard.canActivate():
  const requiredRoles = reflector.get('roles', context.getHandler())
  const user = request.user
  return requiredRoles.includes(user.role)
```

### Role Hierarchy
```
super_admin > admin > manager > user
```
- **super_admin**: Cross-org platform management (BackOffice)
- **admin**: Manage org members, custom fields, settings
- **manager**: View team metrics, assign deals, see all records
- **user**: CRUD on own records, view shared records

### Fine-Grained Permissions (PermissionsGuard)
Beyond roles, individual permissions exist (e.g., `crm:leads:delete`):
```typescript
@Permissions('crm:leads:delete')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
async deleteLead(@Param('id') id: string) { ... }
```
`PermissionsGuard` queries the DB for user's role → role's permissions → checks set membership.

---

## 4. CRM MODULES — DETAILED BREAKDOWN

### Accounts Module
**Entity fields:** name, type (prospect/customer/partner/competitor), industry, website, phone, email, billingAddress, shippingAddress, employees, annualRevenue, ownerId, customFields (JSONB)

**Service methods:**
- `findAll(limit, offset, mine?)` — paginated, optional mine=true filter
- `findById(id)` — with contacts and opportunities relations loaded
- `create(data, userId)` — sets ownerId to creator if not specified
- `update(id, data)` — partial update via `Object.assign(existing, data)`
- `delete(id)` — hard delete
- `getContacts(accountId)` — related contacts
- `getOpportunities(accountId)` — related deals

**Controller routes:**
```
GET    /accounts?limit=50&mine=true
GET    /accounts/:id
POST   /accounts
PUT    /accounts/:id
DELETE /accounts/:id
GET    /accounts/:id/contacts
GET    /accounts/:id/opportunities
```

### Leads Module — Special Features

**Lead Conversion** (`POST /leads/:id/convert`):
```
1. Find lead (status must not be 'converted')
2. Find or create Account from lead.company
3. Create Contact from lead (firstName, lastName, email, phone)
4. Create Opportunity from lead (name, estimatedValue → amount)
5. Update lead.status = 'converted'
6. Return { lead, account, contact, opportunity }
```

**Lead Scoring:** `leadScore` field (0–100) for prioritization

**Lead Sources:** website | email | phone | referral | event | social | cold

### Opportunities Module — Pipeline Engine

**Stages (in order):**
```
prospecting → qualification → proposal → negotiation → closed-won | closed-lost
```

**Stage Change Notifications:**
```typescript
// When stage changes to 'closed-won' or 'closed-lost':
if (data.stage !== existing.stage) {
  const isWon  = data.stage === 'closed-won';
  const isLost = data.stage === 'closed-lost';
  if (isWon || isLost) {
    notifications.create({ type: isWon ? 'deal_won' : 'deal_lost', ... })
  }
}
```

**Owner Assignment Notifications:**
```typescript
// If ownerId changed AND new owner is not the actor:
if (data.ownerId && data.ownerId !== prevOwner && data.ownerId !== actorId) {
  notifications.create({ type: 'deal_assigned', userId: data.ownerId, ... })
}
```

### Notifications Module

**Notification types:**
- `task_assigned` — task assigned to you
- `lead_assigned` — lead assigned to you
- `deal_assigned` — deal assigned to you
- `deal_stage_changed` — a deal's stage changed
- `deal_won` / `deal_lost` — terminal stage reached

**Architecture:** Fire-and-forget pattern:
```typescript
this.notifications.create({ ... }).catch(() => {});
// If notification fails, it doesn't break the main operation
```

**Frontend polling:** `InboxView` fetches notifications on mount + marks as read.

### Custom Fields Module

**CustomFieldSchema entity:**
```typescript
@Entity('custom_field_schemas')
export class CustomFieldSchema {
  entityType: 'lead' | 'account' | 'contact' | 'opportunity';
  name: string;        // slug: 'linkedin_url'
  label: string;       // display: 'LinkedIn URL'
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  options: string[];   // for dropdown: ['Option A', 'Option B']
  required: boolean;
  order: number;
}
```

**API:**
```
GET    /custom-fields?entity=contact   → schemas for contacts
POST   /custom-fields                  → create schema (admin only)
DELETE /custom-fields/:id              → delete schema (admin only)
```

**Where values are stored:**
```sql
-- In the contacts table:
ALTER TABLE contacts ADD COLUMN custom_fields JSONB;

-- Example stored value:
{ "linkedin_url": "https://linkedin.com/in/john", "contract_type": "Enterprise" }
```

---

## 5. FRONTEND ARCHITECTURE — DETAILED

### App.jsx — The Brain
```javascript
// Global state managed here:
const [view, setView]         = useState('dashboard');   // current page
const [detail, setDetail]     = useState(null);          // detail panel
const [showCmd, setShowCmd]   = useState(false);         // command palette
const [showAdd, setShowAdd]   = useState(false);         // quick add modal
const [toasts, setToasts]     = useState([]);            // toast notifications
const [refreshKey, setRefreshKey] = useState(0);         // force re-fetch
const [user, setUser]         = useState(null);          // authenticated user
const [membersById, setMembersById] = useState({});      // member cache
```

**Why no React Router?**
- Single-page app with no URL-based navigation needed
- Simpler state management — just `useState`
- Faster tab switching (no unmount/remount on URL change)
- For a PFE, this is a legitimate architectural choice

**Why no Redux/Zustand?**
- Data is mostly server state (fetched fresh per page)
- Global UI state is minimal (current view, panels open/closed)
- React's built-in state is sufficient at this scale

### api.js — The API Layer
```javascript
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function req(method, path, body) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Token expired or invalid → force logout
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Unauthorized');
  }
  // Parse and return JSON
}
```

**Why vanilla fetch (not Axios)?**
- No extra dependency
- Native browser API, widely supported
- Sufficient for our needs (no interceptor chains, no request cancellation)
- Reduces bundle size

### normalize.js — Data Transformation Layer
```javascript
// Backend returns raw entity:
{ id: 'abc-123', firstName: 'John', lastName: 'Doe', accountId: 'xyz' }

// normalize.js transforms to UI shape:
{
  id: 'ABC-123',        // display ID (truncated, uppercase)
  _id: 'abc-123',       // real ID for API calls
  name: 'John Doe',     // computed full name
  _accountId: 'xyz',    // preserved for detail panel
  customFields: {...}   // passed through for custom field display
}
```

**Why a normalize layer?**
- Backend and frontend have different data shapes
- Centralized transformation — change once, affects everything
- Easier to test
- Backend schema can evolve independently of UI

### DetailPanel — Context Panel
Opens as a slide-in panel from the right when clicking any record.
- Fetches related data lazily (activities, linked deals)
- Shows custom field values from `customFields` JSON
- Has ⋯ menu with Delete action
- "Log activity" quick buttons (call, email, meeting, note)

### QuickAdd — Global Create Modal
Opened by:
- `C` keyboard shortcut (when not in input)
- `⌘K` → "New deal/contact/task"
- `+` button in topbar
- Sidebar `+` next to Records label

Supports: deal | account | contact | task | activity

Fetches custom field schemas per entity type and renders extra inputs dynamically.

### CommandPalette (⌘K)
```javascript
// Debounced search (250ms) across:
// - Accounts (by name)
// - Contacts (by name/email)
// - Opportunities (by name)
// - Leads (by name/company)
// Also supports navigation commands and quick-create actions
```

### Theme System
```css
/* 5 accent colors, switchable at runtime: */
--accent: oklch(0.58 0.18 258);  /* Cobalt (default) */

/* 2 modes: light/dark */
[data-theme="dark"] { --bg: oklch(0.18 0.01 258); ... }

/* 3 density levels: compact | default | cozy */
[data-density="compact"] .nav-item { padding: 4px 8px; }
```

Stored in `localStorage` via `TweaksPanel`. Applied to `document.documentElement` as CSS variables.

---

## 6. PIPELINE (KANBAN) ARCHITECTURE

### Drag-and-Drop Implementation
```javascript
// No DnD library — native HTML5 drag events
onDragStart={(e) => {
  e.dataTransfer.setData('dealId', deal._id);
  e.dataTransfer.setData('fromStage', stageId);
}}

onDrop={(e) => {
  const dealId   = e.dataTransfer.getData('dealId');
  const fromStage = e.dataTransfer.getData('fromStage');
  if (fromStage !== toStage) {
    api.updateOpportunity(dealId, { stage: backendStage })
      .then(() => reload());
  }
}}
```

**Stage mapping (frontend ↔ backend):**
```javascript
const BE_STAGE = {
  lead:      'prospecting',
  qualify:   'qualification',
  propose:   'proposal',
  negotiate: 'negotiation',
  close:     'closed-won',
};
```

---

## 7. TECHNOLOGY JUSTIFICATION

### NestJS (Backend Framework)
**Why:** 
- TypeScript-first → type safety, better IDE support
- Opinionated structure → controllers/services/modules → scalable
- Built-in dependency injection → testable
- Decorators for guards, pipes, interceptors → clean code
- Rich ecosystem: TypeORM integration, Passport.js, Swagger

**Alternative:** Express.js
**Why NestJS is better here:** Express is too minimal for a complex multi-tenant app. NestJS's module system enforces clean architecture.

### TypeORM (ORM)
**Why:**
- Decorator-based entity definition
- Supports multiple simultaneous DataSources → essential for multi-tenancy
- Auto synchronize in development (no migrations needed during dev)
- Repository pattern → testable services

**Alternative:** Prisma, Sequelize
**Why TypeORM:** Only ORM that natively supports multiple DataSources — critical for our architecture.

### PostgreSQL (Database)
**Why:**
- JSONB support → essential for `customFields` storage
- Strong ACID compliance → reliable transactions
- Mature, battle-tested
- Excellent TypeORM support
- Can CREATE DATABASE dynamically (needed for provisioning)

**Alternative:** MongoDB (JSONB not needed, any doc DB works), MySQL
**Why PostgreSQL:** JSONB + transactional DDL + reliability

### React 18 (Frontend)
**Why:**
- Component-based → reusable UI pieces
- Hooks (useState, useEffect, useRef, useMemo) → clean functional components
- Large ecosystem
- Fast virtual DOM reconciliation

**Alternative:** Vue 3, Svelte
**Why React:** Most widely adopted, team familiarity, largest job market

### Vite (Build Tool)
**Why:**
- Instant dev server start (ESM-based, no bundling in dev)
- Fast HMR (Hot Module Replacement)
- Modern, replacing Create React App

**Alternative:** Webpack, Create React App
**Why Vite:** Speed — CRA takes 30s to start, Vite takes <1s

### CSS Custom Properties (No Tailwind)
**Why:**
- Full control over design system
- Theme switching (light/dark) without JS — just change CSS variable
- Zero runtime overhead
- Smaller bundle (no utility class purging needed)

**Alternative:** Tailwind CSS
**Tradeoff:** More initial CSS to write, but the result is a tighter, more maintainable design system

### JWT (Authentication)
**Why:**
- Stateless — no session storage
- Self-contained — role and orgId in token
- Standard (RFC 7519)
- Works across domains (CORS-compatible)

**Alternative:** Session-based auth (express-session + Redis)
**Why JWT:** Stateless = horizontal scaling without session sync
