# What's Missing

## High Priority (Functional gaps from cahier des charges)

### Reports page
- Currently a placeholder (`SimpleView`)
- Needed: pre-built reports (pipeline summary, leads by source, activities by type)
- Nice to have: CSV export button

### Activity log action buttons in Detail Panel
- Email / Call / Meet / Note buttons in the detail panel are visual-only
- Should open QuickAdd pre-filled with type + linked record

### Pipeline filter pills
- "My pipeline / Team / All open" pills in Pipeline view are visual-only
- "Owner: Anyone" and "Close: Q2 2026" filter chips not wired
- "New deal" button in Pipeline toolbar not wired (no modal opens)

### Pipeline list view toggle
- The list-view icon next to the Kanban icon does nothing

---

## Medium Priority (Architecture / Delivery)

### Docker + CI/CD
- No `docker-compose.yml` for local dev
- No GitHub Actions workflow for lint/test/build
- Required by cahier des charges

### Custom fields / Dynamic entities
- Backend entities exist (`dynamic-entity.entity.ts`, `dynamic-field.entity.ts`)
- No frontend UI to create or display custom fields
- Most complex missing feature — skip unless explicitly required for defense

---

## Low Priority / Polish

### Inbox page
- Placeholder — no functionality defined yet

### Contacts detail panel
- Shows fields but no related deals or activity feed (unlike accounts/deals)

### Seed data
- `data/seed.js` still imported by Pipeline, Dashboard, Opportunities pages for `STAGES`
- Could be replaced with a shared constant in `utils/`

### Members page — remove member
- No way to remove an existing team member (only revoke pending invites)

### Error boundaries
- No React error boundaries — a crash in one page crashes the whole app

---

## PFE Deliverables (Academic)

### Rapport PFE
- Not started

### Presentation slides
- Not started

### Demo script / screenshots
- Not started
