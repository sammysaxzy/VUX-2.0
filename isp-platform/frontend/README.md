# ISP OSS/BSS Frontend (React + Vite)

Modern multi-tenant ISP operations dashboard for NOC, CRM, fibre mapping, and field workflows.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand (global auth/tenant/theme/realtime state)
- React Query (API data)
- React Hook Form + Zod
- Mapbox GL (`react-map-gl`)
- WebSocket realtime provider (`/ws`)
- shadcn-style UI primitives (custom components in `src/components/ui`)

## Run

```bash
npm install
npm run dev
```

## Environment

Use `.env` (see `.env.example`):

- `VITE_API_BASE_URL=http://localhost:8001`
- `VITE_MAPBOX_TOKEN=<mapbox_public_token>`
- `VITE_USE_MOCKS=true`

## Structure

```text
src/
  App.tsx
  main.tsx
  pages/
    login-page.tsx
    register-page.tsx
    dashboard-page.tsx
    map-page.tsx
    customers-page.tsx
    customer-profile-page.tsx
    infrastructure-page.tsx
    faults-page.tsx
    field-page.tsx
    radius-page.tsx
    settings-page.tsx
  components/
    map/map-component.tsx
    customers/customer-table.tsx
    customers/customer-form.tsx
    allocation/splitter-selector.tsx
    fibre/fibre-viewer.tsx
    faults/fault-report-dialog.tsx
    layout/{sidebar,topbar,workspace-shell}.tsx
    dashboard/{kpi-cards,alerts-panel}.tsx
    radius/radius-session-table.tsx
    field/activity-timeline.tsx
    providers/{app-providers,realtime-provider,theme-sync}.tsx
    ui/...
  hooks/
    api/{use-auth,use-dashboard,use-customers,use-network,use-faults,use-radius}.ts
  lib/
    api/{client,mock-data}.ts
    query-client.ts
    utils.ts
  store/app-store.ts
  types/index.ts
  constants/fibre.ts
  styles/globals.css
```

## Notes

- `legacy-vite-src/` keeps the previous code as backup.
- Build verified with `npm run build`.
