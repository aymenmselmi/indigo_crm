# Setup Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | Required for both backend and frontend |
| PostgreSQL | 14+ | Must be running locally |
| npm | 8+ | Comes with Node.js |

---

## 1. Database Setup

The project uses two types of databases:
- **Master DB** (`crm_dev`) — stores organizations, global users, invitations
- **Tenant DBs** (one per org) — auto-created when a new organization registers

```bash
# Create the master database
createdb crm_dev

# Or using psql
psql -U postgres -c "CREATE DATABASE crm_dev;"
```

---

## 2. Backend Setup

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env.development
```

Edit `.env.development`:

```env
# Database (master)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=crm_dev

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=3600s

# Frontend URL (used for invite links)
FRONTEND_URL=http://localhost:5174
```

Start the backend:

```bash
npm run start:dev
```

The backend will start on `http://localhost:3000`.  
TypeORM `synchronize: true` is enabled in development — all tables are auto-created on first run.

---

## 3. Frontend Setup

```bash
cd new-frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5174`.

The frontend reads the API URL from `VITE_API_URL` (defaults to `http://localhost:3000` if not set).

---

## 4. First Run

1. Open `http://localhost:5174`
2. Click **"Create a workspace"** on the login page
3. Fill in your details and organization name
4. You are automatically logged in as **admin** of your new organization

---

## 5. Creating a Super Admin

Super admins have access to the Back Office (all organizations and users).  
This must be done directly in the database — there is no UI to create super admins.

```bash
psql -U postgres -d crm_dev
```

```sql
-- List existing users
SELECT id, email, role FROM global_users;

-- Promote a user to super_admin
UPDATE global_users SET role = 'super_admin' WHERE email = 'your@email.com';

-- Verify
SELECT id, email, role FROM global_users WHERE email = 'your@email.com';
```

Log out and log back in — the new role will be reflected in the JWT.

---

## 6. Available Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Start production build |
| `npx tsc --noEmit` | Type-check without compiling |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
