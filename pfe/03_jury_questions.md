# PFE Defense — Part 3: Jury Simulation
> 80+ questions with model answers — from beginner to trick questions

---

## BEGINNER QUESTIONS (Level 1)

**Q1: What is a CRM?**
> A CRM (Customer Relationship Management) system is software that helps businesses manage interactions with customers and potential customers. It centralizes data about accounts (companies), contacts (people), leads (prospects), and opportunities (deals in progress), helping sales teams track their pipeline and close more deals.

**Q2: What is the difference between a Lead and an Opportunity?**
> A Lead is an unqualified prospect — someone who showed interest but hasn't been evaluated yet. An Opportunity is a qualified prospect that has entered the sales pipeline with a specific deal value, close date, and stage. In our system, a Lead can be "converted" into a Contact + Account + Opportunity via the conversion feature.

**Q3: What is multi-tenancy?**
> Multi-tenancy means a single application instance serves multiple independent organizations (tenants) simultaneously, with complete data isolation between them. Like an apartment building — one building, many separate apartments with locked doors.

**Q4: What is JWT and why do you use it?**
> JWT (JSON Web Token) is a compact, self-contained way to securely transmit information between parties as a JSON object. We use it for authentication because it's stateless — the server doesn't need to store session data. The token contains the user's ID, email, organizationId, and role, signed with a secret key.

**Q5: What is the difference between authentication and authorization?**
> Authentication = "Who are you?" (verifying identity — JWT validation)
> Authorization = "What can you do?" (verifying permissions — RolesGuard, PermissionsGuard)

**Q6: What is NestJS?**
> NestJS is a progressive Node.js framework for building scalable server-side applications. It uses TypeScript and is heavily inspired by Angular's architecture — modules, controllers, services, and dependency injection. It provides a clear, maintainable structure for large applications.

**Q7: What is TypeORM?**
> TypeORM is an Object-Relational Mapping library for TypeScript/JavaScript. It lets you define database tables as TypeScript classes (entities) and interact with the database using objects instead of raw SQL queries. It supports multiple databases simultaneously — which is critical for our multi-tenant architecture.

**Q8: What is React?**
> React is a JavaScript library for building user interfaces. It uses a component-based model where the UI is composed of reusable pieces (components). React uses a virtual DOM to efficiently update only the parts of the page that change, making it fast.

**Q9: What is PostgreSQL and why did you choose it?**
> PostgreSQL is an open-source relational database system. We chose it because: (1) it supports JSONB — essential for storing custom fields flexibly, (2) it's ACID-compliant — data integrity guaranteed, (3) it allows dynamic database creation — needed for tenant provisioning, (4) excellent TypeORM integration.

**Q10: What is RBAC?**
> Role-Based Access Control is a security model where permissions are granted to roles (Admin, Manager, User), and users are assigned roles. Instead of assigning permissions to each user individually, you manage them at the role level. We have 4 roles: super_admin, admin, manager, user.

**Q11: What happens when a user registers?**
> 1. Validate input, hash password with bcrypt
> 2. Create Organization record in master database
> 3. Provision a new PostgreSQL database for this org
> 4. Create all CRM tables in that new database
> 5. Seed default roles (Admin, Manager, User)
> 6. Create GlobalUser in master DB + User in tenant DB
> 7. Generate and return JWT token

**Q12: What is the purpose of the Sidebar in your app?**
> The Sidebar is the main navigation component. It shows different sections based on the user's role: Records (Accounts, Contacts, etc.), Workflow (Inbox, Tasks, Analytics, Reports), Management (Team Metrics — managers only), Settings (Members, Custom Fields — admins only), Platform (Back Office — super admins only).

**Q13: What is a Kanban board?**
> A Kanban board visualizes work as cards moving through columns (stages). In our Pipeline view, each column represents a sales stage (Prospecting, Qualification, Proposal, Negotiation, Closed-Won). Sales reps drag deals between columns to update their status. This gives instant visual overview of the entire pipeline.

**Q14: What is bcrypt?**
> bcrypt is a password hashing algorithm designed to be slow and computationally expensive, making brute-force attacks impractical. We use it to hash passwords before storing them — we never store plain text passwords. `bcrypt.hash(password, 10)` generates a salted hash, and `bcrypt.compare(plain, hash)` verifies it.

**Q15: What is a DTO in NestJS?**
> DTO (Data Transfer Object) is a class that defines the shape of data sent in a request. NestJS uses class-validator decorators (`@IsString()`, `@IsEmail()`, `@IsOptional()`) to validate incoming data automatically via the `ValidationPipe`. If data doesn't match, NestJS returns a 400 Bad Request before even reaching the service.

---

## INTERMEDIATE QUESTIONS (Level 2)

**Q16: Explain the request lifecycle in your application.**
> 1. Client sends HTTP request with JWT in Authorization header
> 2. `AuthGuard('jwt')` validates the token signature and expiry
> 3. `JwtStrategy.validate()` extracts payload → attaches `user` to request
> 4. `TenantInterceptor` reads `user.organizationId` → calls `TenantContextService.setOrganizationId()`
> 5. `RolesGuard` checks `user.role` against `@Roles()` decorator
> 6. Controller method executes → calls Service
> 7. Service calls `DatabaseSwitcherService.getDataSourceForOrganization(orgId)`
> 8. Gets TypeORM repository for tenant DB → executes query
> 9. Response returned to client
> 10. `TenantInterceptor` clears context after request completes

**Q17: How does your application prevent data leakage between tenants?**
> Three layers of isolation:
> 1. **Authentication**: JWT contains `organizationId` — you can only request your org's data
> 2. **Tenant routing**: `DatabaseSwitcherService` uses `organizationId` to connect to the specific tenant database — physically impossible to access another org's data
> 3. **Database-level isolation**: Each org has its own PostgreSQL database — no shared tables, no WHERE clauses that could be bypassed

**Q18: What is the DataSource cache in DatabaseSwitcherService and why is it important?**
> It's a `Map<string, DataSource>` that stores active PostgreSQL connections indexed by organizationId. Without it, every request would open a new database connection — expensive and slow. With the cache, the first request for an org establishes the connection, and all subsequent requests reuse it. This is connection pooling at the application level.

**Q19: Why did you use REQUEST scope for TenantContextService?**
> NestJS services are singletons by default — one instance shared across all requests. If we stored `organizationId` in a singleton service, simultaneous requests from different organizations would overwrite each other's context (race condition). REQUEST scope means NestJS creates a fresh service instance for each HTTP request, guaranteeing isolation.

**Q20: Explain the custom fields architecture.**
> We use a two-table approach (Option A):
> 1. `custom_field_schemas` table stores field definitions (label, type, options) per entity type — admin-managed
> 2. `customFields: JSONB` column on each CRM entity stores actual values as key-value pairs
> When rendering a form, the frontend fetches schemas for that entity type and renders extra inputs. When saving, values go into the `customFields` JSON object alongside the standard fields.

**Q21: How does the notification system work?**
> Notifications are created in business logic (e.g., when a deal is assigned). We use fire-and-forget — the notification creation doesn't block the main operation:
> ```typescript
> this.notifications.create({...}).catch(() => {});
> ```
> Notifications are stored in the tenant DB. The frontend Inbox page fetches them on load. Users can mark individual or all notifications as read.

**Q22: Explain the Lead Conversion feature.**
> When a lead is marked as "convert", the system automatically:
> 1. Finds or creates an Account from the lead's company name
> 2. Creates a Contact with the lead's personal info (linked to the account)
> 3. Creates an Opportunity with the lead's estimated value (linked to both)
> 4. Updates the lead's status to 'converted'
> This mirrors real CRM workflows where you qualify a lead and push it into the pipeline.

**Q23: What is the difference between `synchronize: true` and migrations in TypeORM?**
> `synchronize: true` automatically creates/updates database tables when the application starts, based on entity definitions. It's fast for development but dangerous in production — it could drop columns with data. Migrations are explicit SQL scripts that describe schema changes and can be reviewed, tested, and rolled back safely. We use synchronize in development, migrations would be used in production.

**Q24: How does the Pipeline drag-and-drop work?**
> We use native HTML5 drag-and-drop API (no library). On `dragStart`, we store the deal ID and current stage in `dataTransfer`. On `drop`, we read that data and call `api.updateOpportunity(dealId, { stage: newStage })`. If the API call succeeds, we reload the pipeline data. A visual `dragOver` state shows drop targets.

**Q25: Why is your frontend state management so simple?**
> The app is primarily a CRUD interface — data lives in the backend, not in complex client-side state. Each page component fetches its own data on mount. Global state is minimal (current view, open panels, authenticated user). Using React's built-in `useState`/`useEffect` is sufficient and avoids the complexity of Redux or Zustand. Adding a state manager would be over-engineering for this scale.

**Q26: Explain the normalize.js pattern.**
> Backend entities have database-centric shapes (UUIDs as `id`, snake_case fields, nested relations). The UI needs display-centric shapes (short display IDs, computed full names, flattened fields). `normalize.js` is a pure transformation layer with functions like `normalizeAccount()`, `normalizeContact()`. This decouples backend schema from UI — if the backend changes a field name, we only update normalize.js.

**Q27: How does the Invitation system work?**
> 1. Admin sends invite → POST `/auth/invite` with email + role
> 2. System generates UUID token, creates Invitation record with 7-day expiry
> 3. Frontend shows the invite link (in production, this would be emailed)
> 4. Invitee clicks link → `/accept-invite?token=...`
> 5. Frontend calls POST `/auth/accept-invite/:token`
> 6. Server validates token (not expired, not already accepted)
> 7. Creates GlobalUser in master DB + User in tenant DB with assigned role
> 8. Returns JWT → invitee is logged in

**Q28: What does the `unwrap()` utility function do?**
> ```javascript
> function unwrap(res) {
>   if (Array.isArray(res)) return res;
>   if (Array.isArray(res.items)) return res.items;
>   if (Array.isArray(res.data))  return res.data;
>   return [];
> }
> ```
> Some endpoints return `{ data: [...], total }`, others return arrays directly. `unwrap()` normalizes this so page components always get an array regardless of response shape.

**Q29: How does the Command Palette search work?**
> Using a `useDebounce` hook that waits 250ms after the user stops typing before searching. Then it calls `Promise.allSettled([getAccounts, getContacts, getOpportunities, getLeads])` in parallel. Results are filtered client-side by the search term, grouped by type, and displayed. If a result is clicked, it opens the detail panel for that record. `Promise.allSettled` (not `Promise.all`) means a failing endpoint doesn't break the entire search.

**Q30: How is the theme system implemented?**
> CSS custom properties (variables) defined at `:root` level in `styles.css`. The `TweaksPanel` component stores preferences in `localStorage`. When settings change, `App.jsx` updates `document.documentElement.dataset.theme` and sets CSS variables directly:
> ```javascript
> root.style.setProperty('--accent', accentColor);
> ```
> The `[data-theme="dark"]` CSS selector overrides all color tokens for dark mode.

---

## ADVANCED QUESTIONS (Level 3)

**Q31: What are the ACID properties and how does PostgreSQL guarantee them?**
> - **Atomicity**: Transaction either fully completes or fully rolls back
> - **Consistency**: Data always moves from one valid state to another
> - **Isolation**: Concurrent transactions don't interfere with each other
> - **Durability**: Committed data persists even after crashes
> PostgreSQL uses WAL (Write-Ahead Logging) for durability and MVCC (Multi-Version Concurrency Control) for isolation.

**Q32: How would you add refresh tokens to your current JWT implementation?**
> Current: Only access token (short-lived, e.g., 24h)
> Improvement:
> 1. Generate two tokens on login: `accessToken` (15min) + `refreshToken` (30 days)
> 2. Store `refreshToken` hash in database (GlobalUser.refreshTokenHash)
> 3. Add `POST /auth/refresh` endpoint: validates refresh token, issues new access token
> 4. On 401 in frontend, automatically call refresh endpoint before forcing logout
> This reduces re-login friction while keeping access tokens short-lived for security.

**Q33: What are the scalability concerns with your current multi-tenant implementation?**
> 1. **DataSource cache memory**: 1000 orgs = 1000 cached DataSources in memory. Solution: LRU cache with max size + idle connection closing
> 2. **Single server bottleneck**: All orgs share one Node.js process. Solution: Horizontal scaling with shared cache (Redis)
> 3. **DB provisioning time**: Creating a new PostgreSQL database takes seconds. Solution: Pre-warm a pool of empty databases
> 4. **Connection limits**: PostgreSQL default is 100 connections. With many tenants: Solution: PgBouncer connection pooler

**Q34: How would you implement real-time notifications (WebSockets)?**
> Replace polling with WebSocket push:
> 1. Add `@nestjs/websockets` + Socket.io to NestJS
> 2. Create `NotificationsGateway` with `@SubscribeMessage`
> 3. On connection, join room named by `userId`
> 4. When `NotificationsService.create()` is called, emit to user's room
> 5. Frontend connects with `socket.io-client`, listens for 'notification' events
> This reduces server load (no polling) and gives instant notifications.

**Q35: How would you implement field-level encryption for sensitive data?**
> For fields like SSN or contract values:
> 1. Use `pgcrypto` PostgreSQL extension: `pgp_sym_encrypt(value, key)`
> 2. Or application-level encryption with `crypto` module before saving
> 3. Store encryption key in environment variable / AWS KMS
> 4. Decrypt on read in the service layer
> The `customFields` JSONB column is particularly important to encrypt if it contains sensitive data.

**Q36: Explain CORS and how you handle it.**
> CORS (Cross-Origin Resource Sharing) is a browser security mechanism that blocks requests from one origin to another unless the server explicitly allows it.
> In our backend:
> ```typescript
> app.enableCors({
>   origin: process.env.NODE_ENV === 'development' ? '*' : process.env.FRONTEND_URL,
>   credentials: true,
> });
> ```
> In development, we allow all origins (`*`). In production, only requests from `FRONTEND_URL` are allowed. This prevents malicious sites from making API calls on behalf of authenticated users.

**Q37: What is SQL injection and how does TypeORM protect against it?**
> SQL injection is when user input is embedded directly into SQL queries, allowing attackers to execute arbitrary SQL. Example:
> ```sql
> SELECT * FROM users WHERE email = '' OR '1'='1'
> ```
> TypeORM protects us by using **parameterized queries** automatically:
> ```typescript
> repo.findOne({ where: { email: userInput } })
> // Generates: SELECT * FROM users WHERE email = $1 with userInput as parameter
> ```
> The parameter is never concatenated into the SQL string — it's passed separately to PostgreSQL, which treats it as a literal value, not SQL code.

**Q38: How does your application handle concurrent updates to the same record?**
> Currently: Last-write-wins. Two users editing the same account simultaneously — the last `PUT /accounts/:id` wins.
> Improvement: Optimistic locking with `@VersionColumn()` in TypeORM:
> ```typescript
> @VersionColumn() version: number;
> ```
> Client sends current version in update request. Server checks: if `currentVersion !== storedVersion`, reject with 409 Conflict. This prevents accidental data overwrite.

**Q39: What is the N+1 query problem and do you have it?**
> N+1 problem: Fetching 50 accounts, then for each account, making a separate query to get its contacts = 1 + 50 = 51 queries.
> We use TypeORM `relations` option or JOIN queries to prevent this:
> ```typescript
> repo.find({ relations: ['contacts', 'opportunities'] })
> ```
> This generates a single SQL JOIN query instead of N+1 separate queries.

**Q40: How would you add full-text search?**
> Option 1 — PostgreSQL full-text search:
> ```sql
> WHERE to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('search term')
> ```
> Option 2 — Elasticsearch integration for advanced search with ranking, fuzzy matching, and cross-entity search
> Currently we use ILIKE for simple substring search — works fine at small scale, but ILIKE doesn't use indexes and degrades at large scale.

---

## TRICK QUESTIONS (Watch Out!)

**T1: "Your multi-tenant approach is expensive — 1000 clients means 1000 databases. How do you justify this?"**
> You're right that the database-per-tenant approach uses more storage and connection resources than a shared-table approach. However, the tradeoffs are justified for our use case:
> 1. **Compliance**: Many industries (healthcare, finance) require strict data segregation — a shared database with row-level security may not satisfy auditors
> 2. **Security**: Even a bug in our application cannot leak data between tenants — physical separation is the strongest guarantee
> 3. **Performance**: No `WHERE tenantId = ?` on every query, dedicated indexes per org
> 4. **Scalability strategy**: Large tenants can be migrated to dedicated infrastructure trivially
> In practice, we would implement resource limits (max users, storage quotas) per subscription tier to make this economically viable.

**T2: "You have no refresh tokens. If someone steals a JWT, they have full access for 24 hours."**
> That's a valid security concern. The current implementation uses long-lived access tokens for simplicity during the MVP/PFE phase. In production, I would implement:
> 1. Short-lived access tokens (15 minutes)
> 2. Refresh tokens (stored as hashed values in DB, 30-day expiry)
> 3. Token rotation on refresh
> 4. Refresh token revocation on logout
> This is documented as a known limitation and planned improvement.

**T3: "What happens if your NestJS server crashes? All tenant DataSource connections are lost."**
> Yes — connections are lost when the process dies. This is intentional:
> - DataSources are re-initialized on the next request for each org (lazy initialization)
> - The first request after restart takes slightly longer (connection setup)
> - Persistent connections in memory is actually preferable to this — in production, I would add health checks and connection pool warming on startup
> PostgreSQL itself is unaffected — the database server continues running, only the application-level cache is lost.

**T4: "Your `synchronize: true` in production would be catastrophic. Why is it there?"**
> `synchronize: true` is only enabled when `NODE_ENV === 'development'`. For production environments, it must be disabled and replaced with TypeORM migrations. This is a development convenience — in a real production deployment:
> ```typescript
> synchronize: process.env.NODE_ENV === 'development'
> ```
> And we would run `typeorm migration:run` as part of the deployment pipeline (Docker entrypoint or CI/CD).

**T5: "You have no rate limiting. I could make 10,000 login requests per second and brute-force any password."**
> This is a real vulnerability in the current implementation. The fix:
> 1. Add `@nestjs/throttler` for rate limiting:
>    ```typescript
>    ThrottlerModule.forRoot({ ttl: 60, limit: 10 }) // 10 req/minute
>    ```
> 2. Apply more aggressive limits on auth endpoints (5 requests/minute)
> 3. Implement account lockout after N failed attempts
> 4. Add CAPTCHA for register/login in production
> This is acknowledged as a security improvement needed before production deployment.

**T6: "Your JWT secret is in .env — what if the .env file leaks?"**
> If the JWT secret leaks, all tokens could be forged. Mitigations:
> 1. Never commit `.env` to git (`.gitignore` already handles this)
> 2. Use environment variables from the deployment platform (not files)
> 3. In production: use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
> 4. Rotate the JWT secret periodically
> 5. If a leak is suspected: change the secret immediately (invalidates all existing tokens — forces re-login)

**T7: "Your custom fields are not validated at the backend — I could save any value for any field type."**
> Correct observation. Currently the `customFields` JSONB is saved as-is without backend validation. The fix:
> 1. In the service, fetch `CustomFieldSchema` records for the entity type
> 2. Validate each key in `customFields` against the schema (type check, required check)
> 3. Reject invalid values with a 400 response
> This was simplified for the PFE implementation — it's a known improvement area.

**T8: "React without React Router — how do users share links to specific records?"**
> Currently they can't — all navigation is view-state-only, no URL changes. This is a limitation for link sharing and browser back/forward navigation. The fix would be adding `react-router-dom`:
> ```jsx
> <Route path="/accounts/:id" element={<AccountDetail />} />
> ```
> For the PFE context, this was deprioritized in favor of feature completeness. The architecture is compatible with adding routing — it's an additive change.

**T9: "How do you handle if two admins create the same custom field simultaneously?"**
> Currently there's no unique constraint on `(entityType, name)` in `custom_field_schemas`. Two concurrent requests could create duplicate fields. Fix:
> ```typescript
> @Unique(['entityType', 'name'])
> export class CustomFieldSchema { ... }
> ```
> This adds a database-level unique constraint. TypeORM would throw a constraint violation, and the service would return a 409 Conflict.

**T10: "Your notifications are fire-and-forget with `.catch(() => {})`. You're silently swallowing errors."**
> Yes — we consciously chose this approach because notification failures should never break the main business operation. A failed notification is much less critical than a failed deal update. However, we should at minimum:
> 1. Log the error: `.catch((err) => this.logger.warn('Notification failed:', err))`
> 2. In production: use a message queue (Bull/Redis) for guaranteed delivery
> The current approach is pragmatic for MVP — silencing errors is never ideal, but crashing the deal-save operation because of a notification failure would be worse UX.

**T11: "You're using `Object.assign(existing, data)` for updates. This could accidentally patch fields you didn't intend to change."**
> Partially true. If the DTO allows a field and the client sends it, it will be updated. This is by design — it's a PATCH-style update. However:
> 1. DTOs use `@IsOptional()` — only explicitly sent fields are updated
> 2. `ValidationPipe` with `whitelist: true` strips unknown fields
> 3. `forbidNonWhitelisted: true` rejects requests with unexpected fields
> So only DTO-defined and explicitly-sent fields can be updated — it's safe.

**T12: "What's your backup strategy?"**
> Currently no automated backup strategy — this is a PFE/MVP. In production:
> 1. PostgreSQL continuous WAL archiving to S3
> 2. Daily pg_dump for point-in-time recovery
> 3. Per-tenant backup policy (enterprise customers may want more frequent backups)
> 4. Test restore procedures quarterly
> The database-per-tenant model makes per-org restore trivial — restore just one org's database without affecting others.

---

## QUESTIONS ABOUT SPECIFIC DESIGN DECISIONS

**Q: Why no Docker?**
> Docker and CI/CD are listed in the cahier des charges and acknowledged as missing deliverables. The architecture is containerization-ready:
> - Backend can be `Dockerfile`-ed with `FROM node:20-alpine`
> - Environment-based configuration (no hardcoded values)
> - The database-per-tenant model works cleanly with Docker Compose (one postgres container, tenant DBs created dynamically)
> Adding Docker would be a 2-hour task — it was deprioritized in favor of feature completeness.

**Q: Why did you choose Option A (JSONB) over Option B (full dynamic entities)?**
> Option B (full dynamic entity creation — new tables per entity type) would require:
> - Runtime TypeORM schema modifications
> - Dynamic entity registration (not supported by TypeORM at runtime)
> - Complex migrations
> - Significant additional development time
> 
> Option A (JSONB custom fields) covers the actual requirement: "organizations can customize field definitions on existing CRM entities." This satisfies the cahier des charges requirement for "gestion dynamique des entités" in a pragmatic way. The `DynamicEntity` and `DynamicField` backend entities exist and form the foundation for Option B if needed in the future.

**Q: How does your application scale to 10,000 users?**
> 1. **Horizontal scaling**: Add more NestJS instances behind a load balancer (stateless JWT auth makes this clean)
> 2. **Shared cache**: Move DataSource management to Redis (connection strings cached, not actual connections)
> 3. **Connection pooling**: PgBouncer between NestJS and PostgreSQL
> 4. **CDN**: Static React assets served from CDN (Cloudflare, CloudFront)
> 5. **Read replicas**: PostgreSQL read replicas for analytics queries
> 6. **Rate limiting**: Already discussed — prevent abuse
