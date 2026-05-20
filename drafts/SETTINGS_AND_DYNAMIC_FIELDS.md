# Settings Page & Dynamic Fields Plan

## Two Distinct Features

### 1. Custom Fields (Moderate effort)
Add extra fields to existing objects (Account, Contact, Lead, Opportunity).
- Storage already exists: every entity has `customFields: Record<string, any>` JSON column
- `dynamic-field.entity.ts` already exists in backend, just needs endpoints

### 2. Custom Entities (Heavy lift — Salesforce model)
Create entirely new object types (Projects, Invoices, Assets) with their own sidebar entry, list page, forms, and detail panel.
- `dynamic-entity.entity.ts` already exists in backend, just needs everything else

---

## Settings Page Structure (Admin only)

A new **Settings** section in the sidebar replacing/extending Members & BackOffice nav:

| Tab | Content |
|---|---|
| **Fields** | Manage custom fields per existing object type |
| **Objects** | Create new entity types, define their fields, choose icon |
| **Members** | Current Members page moved here |
| **Appearance** | Current TweaksPanel but persistent per-user in DB |

---

## Custom Fields — Implementation Plan

### Backend
- Field definition shape: `{ id, objectType, name, label, type, required, options[] }`
- Field types: `text`, `number`, `date`, `select`, `checkbox`, `url`
- Endpoints (admin only):
  - `GET /field-definitions?objectType=account`
  - `POST /field-definitions`
  - `PATCH /field-definitions/:id`
  - `DELETE /field-definitions/:id`
- Values save into existing `customFields` JSON column — no migration needed

### Frontend
1. **`<DynamicFields>` component** — takes `definitions` + `values` + `onChange`, renders correct input per type. Write once, plug in everywhere.
2. **Modals** (AccountModal, ContactModal, LeadModal, OpportunityModal) — fetch definitions on open, render extra fields below standard fields, merge into `customFields` on save
3. **Detail panel** — render a "Custom fields" section reading from `data.customFields`
4. **Settings > Fields tab** — table per object type, add/remove field definitions

### Caching
Field definitions change rarely — fetch once per object type and cache in a module-level map. Avoids round-trip on every modal open.

### Suggested build order
1. Backend CRUD endpoints
2. `<DynamicFields>` component
3. Plug into AccountModal first to validate
4. Plug into remaining modals
5. Settings > Fields tab UI
6. Detail panel display

---

## Custom Entities — Implementation Plan

### Backend
- Entity definition: `{ id, orgId, name, pluralName, icon, fields[] }`
- Each entity instance stored in a generic `entity_records` table with `{ id, entityTypeId, data: JSON }`
- Endpoints:
  - CRUD for entity type definitions
  - CRUD for entity records (generic, driven by entityTypeId)

### Frontend
- Settings > Objects tab — create/edit/delete entity types, define fields per type
- **Dynamic sidebar entries** — on app load, fetch org's custom entity types, inject into sidebar nav
- **Dynamic list page** — one generic `<EntityListView>` component that renders columns based on field definitions
- **Dynamic modal** — one generic `<EntityModal>` using `<DynamicFields>`
- **Dynamic detail panel** — add a `kind === 'custom'` case

---

## Honest Scope Assessment

| Feature | Effort | PFE priority |
|---|---|---|
| Custom fields + Settings/Fields tab | 1 sprint | High |
| Custom entities (full Salesforce model) | 2-3 sprints | Low — mention in rapport as future work |
| Appearance tab (persistent tweaks) | Small | Medium |
| Members tab move | Trivial | Do with Settings page |
