# Indigo CRM — Documentation

A multi-tenant CRM platform built with NestJS, PostgreSQL, and React.

## Table of Contents

| # | Document | Description |
|---|----------|-------------|
| 1 | [Setup Guide](./01-setup.md) | Prerequisites, installation, running the project |
| 2 | [Architecture](./02-architecture.md) | Multi-tenant design, database strategy, project structure |
| 3 | [Authentication & Roles](./03-auth.md) | JWT auth, roles, invitation system, accept invite flow |
| 4 | [API Reference](./04-api.md) | All backend endpoints with methods, guards, and payloads |
| 5 | [Frontend Pages](./05-frontend.md) | All pages, navigation, and component overview |
| 6 | [CRM Modules](./06-crm-modules.md) | Accounts, Contacts, Leads, Opportunities, Activities, Tasks |
| 7 | [Back Office](./07-back-office.md) | Super admin panel — organizations, users, stats |

## Quick Start

```bash
# 1. Start backend
cd backend && npm run start:dev

# 2. Start frontend
cd new-frontend && npm run dev
```

- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:5174`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeORM, PostgreSQL, JWT, Passport |
| Frontend | React 19, Vite, custom CSS design system |
| Auth | JWT (access token), bcrypt password hashing |
| Architecture | Multi-tenant, database-per-tenant |
