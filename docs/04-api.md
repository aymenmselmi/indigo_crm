# API Reference

Base URL: `http://localhost:3000`

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Pagination parameters available on list endpoints:
- `?limit=20` — records per page (max 100)
- `?offset=0` — skip N records

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new org + admin user |
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/me` | JWT | Get current user from token |
| POST | `/auth/refresh` | JWT | Refresh JWT token |
| POST | `/auth/invite` | JWT (admin) | Create invitation, returns invite URL |
| GET | `/auth/invitations` | JWT | List org invitations |
| DELETE | `/auth/invitations/:id` | JWT | Revoke invitation |
| GET | `/auth/check-invite/:token` | Public | Validate invite token |
| POST | `/auth/accept-invite/:token` | Public | Accept invite, create account |
| GET | `/auth/members` | JWT | List org members |

---

## Accounts

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/accounts` | all | List accounts (paginated) |
| GET | `/accounts/:id` | all | Get account by ID |
| GET | `/accounts/:id/contacts` | all | Get contacts linked to account |
| GET | `/accounts/:id/opportunities` | all | Get opportunities linked to account |
| GET | `/accounts/search?query=` | all | Search accounts by name |
| GET | `/accounts/stats/count` | all | Get total account count |
| POST | `/accounts` | all | Create account |
| PUT | `/accounts/:id` | admin, manager | Update account |
| DELETE | `/accounts/:id` | admin | Delete account |

**Create/Update body fields:**
```json
{
  "name": "Acme Inc",
  "type": "prospect | customer | partner | competitor",
  "industry": "SaaS",
  "website": "https://acme.com",
  "phone": "+1 555 000 0000",
  "email": "info@acme.com",
  "employees": 100,
  "annualRevenue": 1000000,
  "description": "Optional description"
}
```

---

## Contacts

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/contacts` | all | List contacts (paginated) |
| GET | `/contacts/:id` | all | Get contact by ID |
| GET | `/contacts/search?query=` | all | Search contacts |
| POST | `/contacts` | all | Create contact |
| PUT | `/contacts/:id` | admin, manager | Update contact |
| DELETE | `/contacts/:id` | admin | Delete contact |

**Create/Update body fields:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "accountId": "uuid (required)",
  "email": "jane@acme.com",
  "phone": "+1 555 000 0000",
  "mobilePhone": "+1 555 000 0001",
  "title": "VP of Sales",
  "department": "Sales",
  "status": "active | inactive | prospect"
}
```

---

## Leads

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/leads` | all | List leads (paginated) |
| GET | `/leads/:id` | all | Get lead by ID |
| GET | `/leads/search?query=` | all | Search leads |
| GET | `/leads/stats/count` | all | Get total lead count |
| POST | `/leads` | all | Create lead |
| PUT | `/leads/:id` | all | Update lead |
| DELETE | `/leads/:id` | admin | Delete lead |
| POST | `/leads/:id/convert` | admin, manager | Convert lead → Account + Contact + Opportunity |

**Create/Update body fields:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@prospect.com",
  "phone": "+1 555 000 0000",
  "company": "Prospect Co",
  "title": "CEO",
  "status": "new | contacted | qualified | converted | rejected",
  "source": "website | email | phone | referral | event | social | cold",
  "estimatedValue": 50000,
  "leadScore": 75,
  "notes": "Met at conference"
}
```

**Convert response:**
```json
{
  "lead": { ...leadObject },
  "account": { ...createdAccount },
  "contact": { ...createdContact },
  "opportunity": { ...createdOpportunity }
}
```

---

## Opportunities

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/opportunities` | all | List opportunities (paginated) |
| GET | `/opportunities/:id` | all | Get opportunity by ID |
| GET | `/opportunities/:id/activities` | all | Get activities for opportunity |
| GET | `/opportunities/search?query=` | all | Search opportunities |
| POST | `/opportunities` | all | Create opportunity |
| PUT | `/opportunities/:id` | all | Update opportunity |
| DELETE | `/opportunities/:id` | admin | Delete opportunity |

**Create/Update body fields:**
```json
{
  "name": "Acme - Enterprise Deal",
  "accountId": "uuid",
  "stage": "prospecting | qualification | proposal | negotiation | closed-won | closed-lost",
  "amount": 50000,
  "probability": 75,
  "expectedCloseDate": "2026-06-30",
  "description": "Enterprise renewal"
}
```

---

## Activities

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/activities` | all | List activities (paginated) |
| GET | `/activities/:id` | all | Get activity by ID |
| GET | `/activities/contact/:contactId` | all | Activities for a contact |
| GET | `/activities/opportunity/:opportunityId` | all | Activities for an opportunity |
| GET | `/activities/search?query=` | all | Search activities |
| POST | `/activities` | all | Log activity |
| PUT | `/activities/:id` | all | Update activity |
| DELETE | `/activities/:id` | admin, manager | Delete activity |

**Create/Update body fields:**
```json
{
  "type": "call | email | meeting | note | task",
  "subject": "Follow-up call",
  "description": "Discussed pricing",
  "contactId": "uuid (optional)",
  "opportunityId": "uuid (optional)",
  "dueDate": "2026-05-10T10:00:00Z"
}
```

---

## Tasks

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/tasks` | all | List all tasks |
| GET | `/api/tasks/my-tasks` | all | Tasks assigned to current user |
| GET | `/api/tasks/:id` | all | Get task by ID |
| POST | `/api/tasks` | all | Create task |
| PUT | `/api/tasks/:id` | all | Update task |
| DELETE | `/api/tasks/:id` | admin | Delete task |

**Create/Update body fields:**
```json
{
  "title": "Send follow-up email",
  "priority": "low | medium | high | urgent",
  "status": "pending | in_progress | completed | cancelled",
  "dueDate": "2026-05-10T10:00:00Z",
  "relatedContactId": "uuid (optional)",
  "relatedOpportunityId": "uuid (optional)"
}
```

---

## Back Office (super_admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Platform stats (total orgs, users, active, suspended) |
| GET | `/admin/organizations` | List all organizations with user counts |
| GET | `/admin/organizations/:id` | Get org details with members list |
| PATCH | `/admin/organizations/:id` | Update org status or plan |
| GET | `/admin/users?search=` | List all global users (searchable) |
| PATCH | `/admin/users/:id` | Update user role or status |

**Update org body:**
```json
{
  "status": "active | suspended | inactive",
  "planType": "free | starter | professional | enterprise",
  "maxUsers": 20
}
```

**Update user body:**
```json
{
  "role": "user | admin | super_admin",
  "status": "active | suspended | inactive"
}
```
