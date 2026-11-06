# 03-context-memory.md — Context Preservation & Local Scratchpad Protocol

## 1. Active Scratchpad Enforcement (`MEMORY.md`)
To prevent context drift and memory loss across long agent sessions, the agent must maintain an active `MEMORY.md` file located at the project root directory.

---

## 2. Start-of-Turn Routine (Read Memory)
At the beginning of every multi-step prompt turn, the agent MUST:
1. Check if `MEMORY.md` exists in the root directory. If not, initialize it.
2. Read `MEMORY.md` to load current project context, active sprint goals, recent architectural decisions, and open blockers.

---

## 3. End-of-Turn Routine (Update Memory)
At the end of every prompt turn in which architectural decisions, schema updates, or fixes were applied, the agent MUST append or update `MEMORY.md` with:
- **Current Active Task:** The task currently in progress.
- **Completed Milestones:** Confirmed working endpoints, migrations, or frontend connections.
- **Recent Architectural Changes:** Model edits, view refactoring, or payload updates.
- **Open Issues / P0 History:** Pending bugs or missing data contracts.

---

## 4. Standard `MEMORY.md` Template Structure
```markdown
# TRIXUL Project Memory Scratchpad

## Current Focus & Status
- **Active Sprint:** [e.g., ETM Telemetry & Ticketing Handshake]
- **Target Component:** [Backend / ETM-Interface / Admin-Dashboard]

## Sub-Product Execution Trackers
- [x] Backend: Single-app `core` architecture migration & SimpleJWT setup
- [x] ETM-Interface: Pure Redux store integration & mock data purge
- [ ] Admin Dashboard: Real-time telemetry WebSocket / Polling HUD

## Key System Architecture Rules Locked
- Auth uses `Employee.emp_id` via custom `EmployeeJWTAuthentication`.
- Spatial queries handled exclusively in PostgreSQL via GeoDjango.

## Active Blockers & Known Issues
- [ ] Issue description and target resolution path.