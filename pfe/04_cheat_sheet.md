# PFE Defense — Part 4: CHEAT SHEET
> Read this the morning of your defense. Memorize these.

---

## ⚡ 5-MINUTE PROJECT PRESENTATION (memorize this)

> "Notre projet est un CRM cloud multi-tenant développé en NestJS et React. 
> Il permet à plusieurs organisations indépendantes de gérer leur pipeline commercial — contacts, comptes, leads, opportunités, activités — avec une isolation complète des données entre tenants.
>
> L'architecture clé : chaque organisation possède sa propre base de données PostgreSQL, provisionnée automatiquement à l'inscription. La commutation de base de données se fait dynamiquement par requête via notre `DatabaseSwitcherService`.
>
> Côté frontend, une SPA React avec palette de commandes (⌘K), panneau de détail, Kanban drag-and-drop, système de notifications in-app, et champs personnalisés par entité via JSONB.
>
> Les défis techniques résolus : multi-tenancy par isolation de base de données, RBAC à trois niveaux, champs dynamiques sans migration, et un système de notifications asynchrone fire-and-forget."

---

## 🏗️ ARCHITECTURE IN ONE DIAGRAM

```
┌──────────────────────────────────────────────────────────┐
│                    REACT SPA (Vite)                       │
│  Dashboard | Pipeline | Analytics | CRM modules          │
│  api.js (fetch) → normalize.js → useState components      │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP/REST + JWT
┌────────────────────────▼─────────────────────────────────┐
│                 NESTJS BACKEND (:3000)                    │
│                                                           │
│  AuthGuard → TenantInterceptor → RolesGuard → Controller  │
│                      ↓                                    │
│              TenantContextService (request-scoped)        │
│                      ↓                                    │
│           DatabaseSwitcherService (Map<orgId, DS>)        │
└──────────┬────────────────────────────┬──────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼─────────────────┐
│   MASTER DB          │    │  TENANT DB (per org)          │
│  organizations       │    │  accounts, contacts,          │
│  global_users        │    │  leads, opportunities,         │
│  invitations         │    │  activities, tasks,            │
│                      │    │  notifications,                │
│                      │    │  custom_field_schemas         │
└─────────────────────┘    └──────────────────────────────┘
```

---

## 🔑 KEY NUMBERS TO REMEMBER

| Metric | Value |
|--------|-------|
| Backend framework | NestJS (Node.js + TypeScript) |
| Frontend framework | React 18 + Vite |
| Database | PostgreSQL (1 master + N tenant) |
| ORM | TypeORM |
| Auth | JWT (access token, bcrypt passwords) |
| Roles | 4: super_admin, admin, manager, user |
| CRM entities | 7: Account, Contact, Lead, Opportunity, Activity, Task, Notification |
| Custom field types | 5: text, number, date, boolean, dropdown |
| Notification types | 5: task_assigned, lead_assigned, deal_assigned, deal_stage_changed, deal_won/lost |
| Pipeline stages | 6: prospecting → qualification → proposal → negotiation → closed-won/lost |
| Lead sources | 7: website, email, phone, referral, event, social, cold |

---

## 📚 CONCEPTS YOU MUST KNOW BY HEART

### 1. Multi-Tenancy (explain in 30 seconds)
> "Each organization gets its own PostgreSQL database, created automatically on registration. The DatabaseSwitcherService dynamically connects to the right database per request by reading the organizationId from the JWT, cached in a Map for performance."

### 2. JWT (explain in 30 seconds)
> "JSON Web Token contains { sub: userId, email, organizationId, role }, signed with a secret key. It's stateless — we don't store sessions. The backend validates the signature on every request. Role and orgId are in the token to avoid DB lookups."

### 3. Custom Fields (explain in 30 seconds)
> "Admins define field schemas (label, type, options) stored in custom_field_schemas. Actual values are stored as JSONB in a customFields column on each entity. No migrations needed — adding a field is instant."

### 4. RBAC (explain in 30 seconds)
> "Three-layer security: JwtAuthGuard validates the token, RolesGuard checks user.role from JWT against @Roles() decorator, PermissionsGuard checks fine-grained permissions from the DB. Roles are seeded per tenant on org creation."

### 5. Lead Conversion (explain in 30 seconds)
> "One click converts a Lead into: Account (from company name), Contact (from personal info), and Opportunity (from estimated value). The lead status becomes 'converted'."

---

## 🎯 WHAT TO SAY WHEN YOU DON'T KNOW

**If asked about something you didn't implement:**
> "Cette fonctionnalité n'est pas implémentée dans la version actuelle — c'est une limitation reconnue. Dans une version production, je l'implémenterais en utilisant [brief solution]. C'est documenté dans notre fichier MISSING.md."

**If asked about a weakness:**
> "C'est une observation pertinente. Nous avons fait ce choix délibérément pour la phase MVP afin de [reason]. En production, on ajouterait [improvement]. L'architecture actuelle est conçue pour supporter cette évolution."

**If you forget something:**
> "Je vais reformuler pour m'assurer de bien répondre à votre question..." (buys time to think)

---

## 💡 IMPRESSIVE THINGS TO MENTION

1. **"Database-per-tenant is architecturally the strongest isolation model"** — shows you know the tradeoffs
2. **"We use fire-and-forget with `.catch()` for notifications so main operations are never blocked"** — shows production thinking
3. **"The DataSource cache eliminates repeated connection overhead"** — shows performance awareness
4. **"JSONB gives us schemaless flexibility while keeping PostgreSQL's transactional guarantees"** — shows database knowledge
5. **"We use `Promise.allSettled` instead of `Promise.all` so partial failures don't crash the whole operation"** — shows defensive programming
6. **"REQUEST-scoped TenantContextService prevents race conditions between concurrent requests"** — shows concurrency understanding
7. **"The normalize.js layer decouples backend schema evolution from frontend rendering"** — shows clean architecture thinking

---

## 🚨 COMMON MISTAKES TO AVOID

1. **Don't say "I used Tailwind/Next.js/Axios"** — we didn't. We used CSS custom properties, Vite SPA, and vanilla fetch.
2. **Don't say "we have a REST API"** without explaining JWT + guards
3. **Don't say "the data is secure"** — always qualify HOW it's secure (db isolation + JWT + RBAC)
4. **Don't confuse `synchronize: true` (dev) with migrations (prod)**
5. **Don't say we have refresh tokens** — we don't, acknowledge it as an improvement
6. **Don't say "React Router"** — we don't use it, we use `useState` for routing

---

## 📋 TECHNICAL ACHIEVEMENTS TO HIGHLIGHT

### ✅ Completed Features
- Multi-tenant database-per-org provisioning
- JWT authentication + RBAC (4 role levels)
- Full CRM: Accounts, Contacts, Leads, Opportunities, Activities, Tasks
- Lead → Opportunity conversion workflow
- Kanban pipeline with drag-and-drop
- In-app notification system (5 trigger types)
- Command palette (⌘K) with global search
- Custom fields (admin UI + form rendering + detail display)
- CSV export (Reports page)
- Analytics: funnel, team leaderboard, weekly revenue chart
- Theme system: light/dark + 5 accent colors + 3 density levels
- Back office: org management, user management (super admin)
- Team metrics: pipeline overview, activity breakdown (managers)
- Invitation system with role assignment
- Detail panel with related data (deals, activities)
- Quick Add modal (global create shortcut)

### ⚠️ Known Limitations (be proactive about these)
- No Docker / CI/CD pipeline yet
- No refresh tokens (access token only)
- No rate limiting on auth endpoints
- No automated tests (unit/e2e)
- No production deployment yet
- Custom field values not validated at backend
- No real-time notifications (polling-based)

---

## 🎤 DEFENSE DAY SCRIPT

### Opening (30 seconds)
> "Bonjour à tous. Notre projet de fin d'études est le développement d'un CRM cloud multi-tenant, inspiré de Salesforce, permettant à plusieurs organisations de gérer leurs relations clients avec une isolation totale des données. Je vais vous présenter l'architecture technique, les choix technologiques, et les défis résolus."

### Architecture (2 minutes)
> "L'architecture se compose de trois couches :
> Frontend React SPA avec Vite — pas de React Router, navigation par état, thème CSS custom properties.
> Backend NestJS avec deux bases de données : une base master partagée pour les organisations et utilisateurs globaux, et une base dédiée par organisation pour les données CRM — c'est notre stratégie multi-tenant.
> La commutation de base de données se fait via le DatabaseSwitcherService qui maintient un cache de connexions TypeORM par organisation.
> L'authentification est JWT avec contrôle d'accès à 4 niveaux : super_admin, admin, manager, user."

### Key Features (2 minutes)
> "Les fonctionnalités clés :
> Pipeline Kanban avec drag-and-drop natif HTML5.
> Système de notifications in-app fire-and-forget.
> Champs personnalisés via JSONB sans migration de base de données.
> Palette de commandes ⌘K avec recherche multi-entités.
> Analytics avec funnel de conversion, leaderboard équipe, et graphique de revenus hebdomadaire.
> Conversion de leads automatisée en Contact + Compte + Opportunité."

### Technical Challenges (1 minute)
> "Les défis principaux : la commutation dynamique de bases de données par requête, l'isolation stricte des tenants sans tenantId column, et l'implémentation de champs dynamiques sans modification de schéma via JSONB."

### Closing (30 seconds)
> "Le projet est fonctionnel et déployable. Les améliorations prévues pour une version production incluent Docker, CI/CD, refresh tokens, rate limiting, et tests automatisés. Je suis prêt pour vos questions."

---

## 🔢 ERD SUMMARY (Entity Relationship)

```
MASTER DB:
Organization ──< GlobalUser (email, role, orgId)
Organization ──< Invitation (email, token, expiry)

TENANT DB (per org):
Account ──< Contact    (accountId FK)
Account ──< Opportunity (accountId FK)
Lead    ──< Opportunity (leadId FK, optional)
Contact ──< Activity   (relatedContactId FK, optional)
Opportunity ──< Activity (relatedOpportunityId FK, optional)
Task (assignedToId, relatedContactId, relatedOpportunityId — all optional FKs)
Notification (userId FK)
CustomFieldSchema (entityType, name, label, fieldType)

All CRM entities have:
- customFields JSONB (nullable)
- ownerId UUID (nullable)
- createdAt, updatedAt timestamps
```

---

## 📖 GLOSSARY (For jury communication)

| Term | Definition |
|------|-----------|
| **Tenant** | An organization using the platform |
| **DataSource** | TypeORM object representing a database connection |
| **JWT** | Signed JSON token for stateless authentication |
| **JSONB** | PostgreSQL binary JSON column type |
| **DTO** | Data Transfer Object — validates incoming request data |
| **Guard** | NestJS class that decides if a request can proceed |
| **Interceptor** | NestJS class that runs before/after a request |
| **Decorator** | TypeScript annotation (`@Roles()`, `@Get()`) |
| **Repository** | TypeORM object for querying a specific entity table |
| **Provisioning** | Automatically setting up a new tenant's database |
| **RBAC** | Role-Based Access Control |
| **SPA** | Single Page Application — no full page reloads |
| **HMR** | Hot Module Replacement — Vite's instant update in dev |
| **Fire-and-forget** | Async operation that doesn't wait for completion |
| **Debounce** | Delay execution until input stops changing |
