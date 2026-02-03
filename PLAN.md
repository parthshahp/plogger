# Time Tracker PWA (Local‑First) — Project Plan

## Project Description
A local‑first time‑tracking PWA built with Next.js (App Router) and Dexie (IndexedDB). The app lets users track time 24/7 with a single active timer, optional tags, and editable running entries. It works fully offline and supports multi‑device sync via REST endpoints (self‑hosted). Basic reporting (totals by tag and date range) is included initially, with an architecture that supports more advanced reporting later.

### Core Goals
- **Local‑first**: full functionality offline using Dexie.
- **Single active timer**: only one running entry at a time; starting a new timer stops the previous one.
- **Optional tags**: entries can be tagged or left untagged.
- **Live editing**: description and tags can be edited while the timer is running.
- **PWA**: installable, offline assets, fast startup.
- **REST sync**: push/pull endpoints for multi‑device synchronization (no auth initially).

### Non‑Goals (for now)
- Authentication and multi‑user accounts.
- Real‑time websocket sync.
- Advanced reporting beyond basic totals.

---

## Data Model (Dexie)

### Tables
- **tags**
  - `id` (uuid)
  - `name` (string)
  - `color` (string, optional)
  - `createdAt`, `updatedAt` (timestamp)
  - `deletedAt` (timestamp, optional)

- **entries**
  - `id` (uuid)
  - `description` (string)
  - `tagIds` (string[])
  - `startAt` (timestamp)
  - `endAt` (timestamp, nullable for active)
  - `durationSec` (number, nullable while running)
  - `createdAt`, `updatedAt` (timestamp)
  - `deletedAt` (timestamp, optional)

- **device**
  - `id` (uuid)
  - `lastSyncAt` (timestamp, optional)
  - `schemaVersion` (number)

- **oplog** (for sync)
  - `id` (uuid)
  - `entity` ("tags" | "entries")
  - `entityId` (uuid)
  - `op` ("upsert" | "delete")
  - `payload` (object)
  - `ts` (timestamp)

### Constraints
- **Single active entry**: at most one entry with `endAt = null`.
- **Soft delete**: `deletedAt` indicates logical deletion.
- **Last‑write‑wins**: compare `updatedAt` on sync.

---

## REST Sync Design (No Auth Yet)

### Endpoints
- **POST `/api/sync/push`**
  - Body: `{ deviceId, changes: oplog[] }`
  - Response: `{ accepted: count, conflicts?: [] }`

- **GET `/api/sync/pull?since=timestamp`**
  - Response: `{ changes: [tags, entries], serverTime }`

### Sync Flow
1. App start → push local oplog since `lastSyncAt`.
2. Pull changes since `lastSyncAt`.
3. Apply updates using `updatedAt` (last‑write‑wins).
4. Update `lastSyncAt` to `serverTime`.

### Conflict Strategy
- If two devices updated the same entity, keep the record with newer `updatedAt`.
- Log conflicts to a local list for future UI (optional in later milestone).

---

## Milestones

### Milestone 1 — Project Scaffolding + PWA
- Initialize Next.js App Router project.
- Add PWA manifest + service worker for offline assets.
- Global layout + base routes:
  - `/` (dashboard)
  - `/entries` (timeline)
  - `/tags` (tag manager)
  - `/report` (basic totals)

**Deliverable**: App boots offline, installable as PWA.

---

### Milestone 2 — Dexie Schema + Local CRUD
- Implement Dexie DB schema.
- CRUD for tags and entries.
- Timer controls:
  - Start timer (description + optional tags)
  - Stop timer (auto duration)
  - Edit running entry
- Enforce single active timer.

**Deliverable**: Full offline functionality for timers, tags, and entries.

---

### Milestone 3 — UI Flows
- Start timer modal.
- Running timer card with live elapsed time.
- Entries list with edit/delete.
- Tag manager with color and rename support.

**Deliverable**: Complete user flow for daily tracking.

---

### Milestone 4 — Basic Reporting
- Totals by tag (including “Untagged”).
- Totals for today + rolling 7 days.
- Date range filter.

**Deliverable**: Basic analytics dashboard.

---

### Milestone 5 — REST Sync
- Implement `/api/sync/push` and `/api/sync/pull`.
- Client sync loop:
  - on app start
  - on interval (e.g., 60s)
  - on network reconnect
- Apply last‑write‑wins resolution.

**Deliverable**: Multi‑device sync with offline‑first behavior.

---

## Future Extensions
- Authentication + multi‑user accounts.
- Advanced reports (heatmaps, weekly trends, exports).
- Tag hierarchies or tag groups.
- Conflict UI for manual merge.
- CSV export/import.

---

## Open Questions (for later)
- Storage of long‑term aggregates vs. computed on the fly.
- Advanced conflict resolution strategy.
- Multi‑workspace support.
