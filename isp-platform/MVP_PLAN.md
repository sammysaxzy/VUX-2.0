# ISP Operations Platform MVP Plan

## 1. MVP Goal

Deliver a working first version where:

- Map and CRM are linked as one system of record.
- Every client has coordinates and an MST link.
- Fibre routes and cores are tracked and assignable.
- Core operations are audited and visible in real-time.

If data is not mapped and linked, it is not considered valid network state.

---

## 2. MVP Scope (Must Have)

### A. Auth and Roles (minimum)

- Login with JWT.
- Roles: `super_admin`, `isp_admin`, `field_engineer`, `noc_viewer`.
- Route-level access control (write actions blocked for `noc_viewer`).

### B. Infrastructure Mapping (minimum)

- Manage MST boxes with:
  - `mst_id`, coordinates, splitter type, total/used ports.
- Map view with:
  - MST markers.
  - Client markers.
  - Fibre route lines.
- Add fibre route by selecting start/end points and fibre type.
- Auto-calculate route distance.

### C. Fibre Core Management (minimum)

- Auto-generate cores when a route is created.
- Core fields:
  - `core_number`, `color`, `status` (`free|used|faulty|reserved`).
- Assign/unassign core to a client.
- Prevent assigning one core to multiple clients.

### D. CRM (minimum)

- Client CRUD with:
  - identity/contact,
  - coordinates,
  - status,
  - network fields (PPPoE, VLAN/service ID, plan/speed, OLT/PON, ONU serial, RX/TX, last seen).
- Mandatory MST link for activation:
  - activation blocked if `mst_id` is missing.
- Client detail page shows:
  - linked MST,
  - assigned fibre core,
  - network path summary.

### E. CRM <-> Map Linking (minimum)

- From map -> client popup opens client profile.
- From client profile -> open map and highlight:
  - client,
  - MST,
  - route/core info where available.
- MST detail lists connected clients.

### F. Field Activity and Audit

- Log these actions with before/after snapshots:
  - client created/updated/activated/suspended,
  - MST created/updated,
  - route created,
  - core assigned/released/faulted.
- Each log includes:
  - user,
  - timestamp,
  - related entity IDs,
  - optional coordinates.

### G. Real-Time Events

- FastAPI WebSocket endpoint `/ws`.
- Broadcast on key mutations:
  - client update,
  - MST update,
  - fibre/core update,
  - activity event.
- Frontend auto-refreshes affected lists/cards/map layers.

---

## 3. Explicit Non-Goals for MVP (Phase 2+)

- Full Google Earth advanced layers/editing toolkit.
- Full splice workflow UI with complex splice graph visualization.
- Router/OLT live polling integrations (MikroTik, Huawei, etc.).
- Advanced analytics/reporting and SLA dashboards.
- Mobile/offline field app.
- Billing/invoicing.

These are important, but not required for MVP go-live.

---

## 4. MVP Data Model (Core Entities)

- `users`
- `clients`
- `mst_boxes`
- `fibre_routes`
- `fibre_cores`
- `activity_logs`
- `splicing_records` (basic create/list only in MVP)

Minimum integrity rules:

1. Client `status=active` requires `mst_id`.
2. Core with `status=used` must be linked to exactly one client.
3. MST used ports cannot exceed total ports.
4. All map objects must have valid coordinates.

---

## 5. MVP API Surface (Minimum)

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register` (admin-controlled in production)
- `GET /api/auth/me`

### Clients

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/{id}`
- `PUT /api/clients/{id}`
- `POST /api/clients/{id}/connect-mst`
- `GET /api/clients/{id}/network-path`

### MST

- `GET /api/mst`
- `POST /api/mst`
- `GET /api/mst/{id}`
- `PUT /api/mst/{id}`
- `GET /api/mst/{id}/capacity`

### Fibre

- `GET /api/fibre/routes`
- `POST /api/fibre/routes`
- `GET /api/fibre/routes/{id}/cores`
- `PUT /api/fibre/cores/{id}`
- `POST /api/fibre/cores/{core_id}/assign-client/{client_id}`

### Map + Activity + Realtime

- `GET /api/map/data`
- `GET /api/activity`
- `POST /api/activity`
- `GET /api/dashboard/stats`
- `WS /ws`

---

## 6. MVP Frontend Pages

- Login
- Dashboard
- Map
- Clients list + client detail
- MST list + MST detail
- Fibre routes + cores
- Activity log

UI behavior requirements:

- Dark operator-focused UI.
- Fast table filtering/search.
- One-click navigation map <-> CRM entity context.

---

## 7. Delivery Plan (4 Milestones)

## Milestone 1: Stabilize Foundation

- Align backend schemas/models/routes naming.
- Enforce auth and role guards.
- Make Docker local run deterministic.
- Seed demo data reliably.

Exit criteria:

- System boots with one command.
- Login works.
- No 500s on core list endpoints.

## Milestone 2: Map + Fibre Inventory

- MST CRUD and map markers.
- Route creation with auto-distance and auto-core generation.
- Core list/status updates.

Exit criteria:

- Engineer can create route and see generated cores.
- Map reflects new entities without reload (WebSocket event).

## Milestone 3: CRM Linking

- Client CRUD with full network fields.
- Activate/suspend flow with MST requirement.
- Client network path view + map jump/highlight.

Exit criteria:

- Every active client is physically linked and visible on map.

## Milestone 4: Audit + Monitoring View

- Structured activity logs for all write actions.
- Dashboard stats tied to live data.
- Basic alerts surface (offline/low power placeholders).

Exit criteria:

- Operations can answer: who changed what, when, and where.

---

## 8. Acceptance Criteria for MVP Go-Live

1. Every client record has coordinates and appears on map.
2. Every active client has MST + port + core association.
3. Fibre cores cannot be double-assigned.
4. Map click opens CRM context; CRM opens map path context.
5. All critical changes create activity logs.
6. Multi-user changes propagate in near real-time.
7. Role restrictions prevent unauthorized writes.

---

## 9. Immediate Next Build Tasks (This Repo)

1. Normalize backend naming inconsistencies between models/schemas/routes.
2. Add service-layer validation for core/port/activation rules.
3. Add missing frontend API typings and remove compatibility shims.
4. Implement map-to-CRM deep links and highlight state.
5. Harden WebSocket auth/subscription flow and event contracts.
6. Add smoke tests:
   - auth,
   - client activation rule,
   - core assignment uniqueness,
   - map data endpoint.

---

## 10. Definition of Done (MVP)

MVP is done when an ISP admin can:

1. Log in,
2. Add MST + route + clients,
3. Connect client to MST/core,
4. View linked network path from CRM and map,
5. See actions logged and reflected live for other users.

