# ISP OSS/BSS + GIS audit

## Current architecture

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind, React Query and Zustand.
- **Map:** Mapbox GL through `react-map-gl`, with an OpenStreetMap fallback in the current map component.
- **Backend:** FastAPI with async SQLAlchemy, JWT bearer authentication and WebSockets.
- **Database:** PostgreSQL/PostGIS (GeoAlchemy models); tables are currently initialized with SQLAlchemy metadata rather than migrations.
- **Existing operational domains:** CRM/customers, MSTs, fibre routes and cores, OLT/closures/network links, tickets, billing/payments, inventory, finance, field work orders, activity logging, customer portal and RADIUS screens.

## What is already working in the codebase

- The GIS page has layer/filter/search controls, fibre drawing, core assignment, MST splitter handling, closure splice editing, customer focus, route highlighting, fault impact views and permission-aware UI controls.
- The backend has persisted CRUD for clients, MSTs, legacy fibre routes/cores, OLTs, closures, links, tickets, billing, inventory, finance and work orders.
- Activity logging is present in several operational routes.

## Priority gaps and defects

1. **Frontend/backend map-contract mismatch (P0).** The current frontend calls `/api/network/nodes`, `/api/network/fibre`, `/api/network/closures`, and map mutation routes. The FastAPI `network` router currently exposes only `/api/network/devices`. In production mode, map data and mutations therefore fail even though mock mode appears functional.
2. **Mock mode is the default (P0).** `VITE_USE_MOCKS=true` in the example configuration masks missing API contracts. It must remain an explicit demo/development option only once the P0 map contracts are implemented.
3. **Map persistence is incomplete (P0).** Several callbacks in `map-page.tsx` update local React state only (infrastructure, node details and closure details). They need real mutation hooks plus invalidation and audit entries.
4. **Authorization is not enforced by action (P0).** The frontend has a map permission model, but backend routes predominantly require only an authenticated user. Add server-side role/permission dependencies to every mutation before relying on the UI restriction.
5. **Data model is split (P1).** The legacy PostGIS model covers OLT, MST, closure, client and fibre route. The new UI additionally supports poles, cabinets, ODFs, POPs and other facilities without a corresponding persisted generic asset model. Introduce a tenant-scoped network asset table/API or map these types explicitly before enabling CRUD.
6. **Tenant isolation is incomplete (P1).** A tenant header is resolved by authentication helpers, but the core operational tables and most queries are not tenant-scoped. Do not claim multi-tenant isolation until migrations and query filters are in place.
7. **Missing production migration workflow (P1).** `create_all` is unsuitable for schema evolution. Adopt Alembic migrations before relationship expansion or production data deployment.
8. **Dashboard and several newer modules still use mock datasets (P1).** KPI/readiness figures are not universally database-backed yet; they must not be represented as live operations data.
9. **Audit log coverage is uneven (P1).** It exists for several API operations, but map-local mutations, many updates, IP/device data and prior/new-state capture are inconsistent.

## Validation baseline

- `npm run typecheck`: passes.
- `npm run lint`: passes after the existing lint autofix pass.
- `npm run build`: needs an unsandboxed esbuild run in this environment; the sandboxed run was blocked reading the Vite config. The elevated run reached Vite transformation but did not produce a final completion record in this session.

## Implementation sequence

1. Create versioned, tenant-scoped map API contracts and adapters for nodes, cables, closures, geometry and customer network paths; make map UI mutations persist through them.
2. Add server-side RBAC dependencies and action-level audit logging to all map and network mutations.
3. Add the generic network asset model, migrations and soft-delete/restore lifecycle; then complete all infrastructure CRUD from the map.
4. Normalize customer → ONU → PON/OLT → MST/splitter → cable/core relationships and expose a persisted path-trace endpoint.
5. Replace mock-backed dashboard, inventory, portal and operational modules incrementally with their existing backend equivalents; switch mock mode to opt-in.
6. Add import/export validation, API/permission tests, map CRUD/path-trace integration tests and production build verification.
