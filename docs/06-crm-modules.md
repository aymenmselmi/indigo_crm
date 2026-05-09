# CRM Modules

## Accounts

Represents a company or organization you do business with.

### Entity fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | auto | Primary key |
| `name` | string | yes | Company name |
| `type` | enum | no | prospect, customer, partner, competitor |
| `industry` | string | no | e.g. SaaS, Finance |
| `website` | string | no | Company URL |
| `phone` | string | no | Main phone |
| `email` | string | no | Main email |
| `employees` | integer | no | Headcount |
| `annualRevenue` | decimal | no | Annual revenue in USD |
| `description` | text | no | Free text |
| `billingAddress` | string | no | |
| `shippingAddress` | string | no | |

### Relations
- Has many **Contacts**
- Has many **Opportunities**

---

## Contacts

Individual people associated with an account.

### Entity fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | auto | |
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `accountId` | UUID | yes | Links to an Account |
| `email` | string | no | |
| `phone` | string | no | |
| `mobilePhone` | string | no | |
| `title` | string | no | Job title |
| `department` | string | no | |
| `status` | enum | no | active, inactive, prospect |
| `address` | string | no | |

---

## Leads

Potential customers not yet qualified as contacts/accounts.

### Entity fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | auto | |
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `email` | string | no | |
| `phone` | string | no | |
| `company` | string | no | Prospect company name |
| `title` | string | no | |
| `status` | enum | no | new, contacted, qualified, converted, rejected |
| `source` | enum | no | website, email, phone, referral, event, social, cold |
| `estimatedValue` | decimal | no | Potential deal value |
| `leadScore` | integer | no | 0–100 scoring |
| `notes` | text | no | |

### Lead Conversion

`POST /leads/:id/convert` creates three records atomically:

1. **Account** — from `lead.company` (finds existing or creates new)
2. **Contact** — from lead's name, email, phone, title
3. **Opportunity** — named `"<lead name> — Opportunity"`, linked to both Account and Contact

The lead status is set to `converted` after successful conversion.

---

## Opportunities (Deals)

Deals in the sales pipeline.

### Entity fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | auto | |
| `name` | string | yes | Deal name |
| `accountId` | UUID | no | Linked account |
| `stage` | enum | no | prospecting, qualification, proposal, negotiation, closed-won, closed-lost |
| `amount` | decimal | no | Deal value in USD |
| `probability` | integer | no | 0–100% close probability |
| `expectedCloseDate` | date | no | |
| `status` | enum | no | open, closed-won, closed-lost |
| `description` | text | no | |

### Pipeline Stages

The frontend maps backend stages to display names:

| Backend value | Display name | Frontend ID |
|--------------|--------------|-------------|
| `prospecting` | Lead | `lead` |
| `qualification` | Qualify | `qualify` |
| `proposal` | Proposal | `propose` |
| `negotiation` | Negotiate | `negotiate` |
| `closed-won` | Close-Won | `close` |

---

## Activities

Logs interactions — calls, emails, meetings, notes.

### Entity fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | auto | |
| `type` | enum | yes | call, email, meeting, note, task |
| `subject` | string | yes | Activity title |
| `description` | text | no | Details |
| `contactId` | UUID | no | Linked contact |
| `opportunityId` | UUID | no | Linked opportunity |
| `createdByUserId` | string | auto | Set from JWT on create |
| `dueDate` | timestamp | no | For scheduled activities |

---

## Tasks

To-do items assignable to users with due dates.

### Entity fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | auto | |
| `title` | string | yes | Task description |
| `priority` | enum | no | low, medium, high, urgent |
| `status` | enum | no | pending, in_progress, completed, cancelled |
| `dueDate` | timestamp | no | |
| `assignedToUserId` | string | no | |
| `relatedContactId` | UUID | no | |
| `relatedOpportunityId` | UUID | no | |

---

## RBAC (Roles & Permissions)

The backend has a full RBAC system stored in each tenant's database.

### Default roles seeded on tenant creation

| Role | Permissions |
|------|-------------|
| Admin | Full CRUD on all modules + user/role management |
| Manager | Read + Create + Update on all CRM modules |
| User | Read-only on all CRM modules |

### Permission naming convention
```
<module>.<action>
```
Examples: `account.create`, `lead.delete`, `users.manage`

> **Note:** The current API enforces simplified role checks (`admin`, `manager`, `user`) via the `@Roles()` decorator. The full granular permission system is built in the backend but the admin UI to configure it is not yet implemented.
