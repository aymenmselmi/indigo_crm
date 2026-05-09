# Authentication & Roles

## Overview

Authentication uses **JWT (JSON Web Tokens)**. Every protected request must include:

```
Authorization: Bearer <accessToken>
```

The token payload contains:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "organizationId": "org-uuid",
  "role": "admin"
}
```

---

## Roles

| Role | Access |
|------|--------|
| `user` | Read + create on CRM data |
| `admin` | Full CRUD on CRM data + manage members/invitations |
| `super_admin` | Back office — manage all organizations and global users |

### Role assignment
- The **first user** of an organization (registered via the Register page) is always `admin`
- Invited users get the role assigned at invite time (`user` or `admin`)
- `super_admin` can only be set directly in the database (see [Setup Guide](./01-setup.md))

---

## Auth Endpoints

### Register new organization
```
POST /auth/register
```
Creates a new organization + admin user + tenant database.

**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "password": "secret123",
  "organizationName": "Acme Inc",
  "organizationSlug": "acme-inc"
}
```

**Response:** `{ accessToken, user }`

---

### Login
```
POST /auth/login
```

**Body:**
```json
{
  "email": "jane@company.com",
  "password": "secret123"
}
```

**Response:** `{ accessToken, user }`

---

### Get current user
```
POST /auth/me
Authorization: Bearer <token>
```

**Response:** `{ id, email, organizationId, role }`

---

### Refresh token
```
POST /auth/refresh
Authorization: Bearer <token>
```

---

## Invitation System

Admins can invite teammates to their organization. No email service is required — the invite URL is returned in the API response for the admin to share manually.

### Flow

```
Admin creates invite
  → POST /auth/invite
  → Returns inviteUrl: http://localhost:5174/accept-invite?token=UUID
  → Admin copies and shares the link

Colleague opens the link
  → Frontend calls GET /auth/check-invite/:token (validates, returns org name + email)
  → Colleague fills in name + password
  → POST /auth/accept-invite/:token
  → GlobalUser + TenantUser created, invitation marked accepted
  → Returns JWT → colleague is auto-logged in
```

### Invite endpoints

#### Create invitation (admin only)
```
POST /auth/invite
Authorization: Bearer <token>
```
**Body:**
```json
{
  "email": "colleague@company.com",
  "role": "user"
}
```
**Response:**
```json
{
  "id": "invite-uuid",
  "email": "colleague@company.com",
  "role": "user",
  "expiresAt": "2026-05-15T...",
  "inviteUrl": "http://localhost:5174/accept-invite?token=UUID"
}
```

#### List invitations
```
GET /auth/invitations
Authorization: Bearer <token>
```

#### Revoke invitation
```
DELETE /auth/invitations/:id
Authorization: Bearer <token>
```

#### Validate invite token (public)
```
GET /auth/check-invite/:token
```
**Response:**
```json
{
  "email": "colleague@company.com",
  "organizationName": "Acme Inc",
  "organizationSlug": "acme-inc",
  "role": "user",
  "expiresAt": "2026-05-15T..."
}
```

#### Accept invitation (public)
```
POST /auth/accept-invite/:token
```
**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "password": "newpassword123"
}
```
**Response:** `{ accessToken, user }`

---

## Members

#### List org members
```
GET /auth/members
Authorization: Bearer <token>
```
Returns all `GlobalUser` records for the current organization.

---

## Token Storage

The frontend stores the access token in `localStorage` under the key `accessToken`.

On **401 Unauthorized**, the frontend:
1. Removes the token from `localStorage`
2. Dispatches a `auth:logout` window event
3. The app resets to the login page
