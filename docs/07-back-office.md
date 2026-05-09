# Back Office

The back office is a super admin panel for managing the entire platform — all organizations and all users across tenants.

## Access

Only users with `role = 'super_admin'` can access the back office.

After logging in as super_admin, the **"Back office"** link appears in the sidebar under a **"Platform"** section.

All back office API endpoints are protected by `SuperAdminGuard` which rejects requests with `403 Forbidden` if the role is not `super_admin`.

---

## Setting Up a Super Admin

There is no UI to create a super admin — it must be set directly in the master database:

```sql
-- Connect to master database
\c crm_dev

-- Promote a user
UPDATE global_users SET role = 'super_admin' WHERE email = 'your@email.com';
```

Then log out and log back in to get a fresh JWT with the new role.

---

## Back Office Pages

### Stats Row
Four KPI cards at the top:
- **Organizations** — total number of registered tenants
- **Total users** — all global users across all orgs
- **Active orgs** — orgs with status = active
- **Suspended** — orgs with status = suspended

### Organizations Tab

Lists all organizations with:

| Column | Description |
|--------|-------------|
| Name + slug | Organization identity |
| Status | Active / Inactive / Suspended (colored chip) |
| Plan | Free / Starter / Pro / Enterprise |
| Users | Current user count / max users limit |
| Database | Tenant DB name |
| Created | Registration date |
| Action | Suspend / Activate toggle button |

**Suspend an org:** click "Suspend" → org status changes to `suspended`  
**Reactivate an org:** click "Activate" → org status changes to `active`

> Suspending an org does not drop the database or delete data. It only updates the status field. The tenant's users can still log in unless their individual accounts are also suspended.

### Users Tab

Searchable list of all global users across all organizations:

| Column | Description |
|--------|-------------|
| Name + email | User identity |
| Organization | Which org they belong to |
| Role | Member / Admin / Super admin (colored chip) |
| Status | Active / Inactive / Suspended |
| Last login | Most recent login date |
| Joined | Account creation date |
| Action | Suspend / Activate toggle |

**Search:** filters by email, first name, or last name in real time.

---

## API Endpoints

All endpoints require `Authorization: Bearer <super_admin_token>`.

```
GET    /admin/stats
GET    /admin/organizations
GET    /admin/organizations/:id
PATCH  /admin/organizations/:id
GET    /admin/users?search=
PATCH  /admin/users/:id
```

See [API Reference](./04-api.md#back-office-super_admin-only) for full request/response details.

---

## What's NOT in the Back Office (Yet)

| Feature | Status |
|---------|--------|
| Create organization manually | Not implemented — orgs are created via the Register page |
| Delete organization + database | Not implemented |
| Usage stats per tenant (record counts) | Not implemented |
| Billing / plan management | Not implemented |
| Audit log | Not implemented |
