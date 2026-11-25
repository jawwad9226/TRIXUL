# 01-system-workflow.md — Execution Workflow & Agent Discipline

## 1. Core Operating Loop: Blueprint -> Construct -> Validate
The agent must execute all development tasks through a strict 3-phase cycle to prevent silent architectural drift, broken builds, or regressions.

### Phase 1: Mandatory Blueprint (Plan First)
Before modifying or creating any code, the agent MUST produce a clear structural Blueprint containing:
1. **Goal & Scope:** Clear definition of the task and target sub-product (`Backend`, `ETM-Interface`, or `Admin-Dashboard`).
2. **File Execution List:** Exact list of files to create, modify, or delete.
3. **Architectural Impact:** Verification of how changes affect existing models, endpoints, or Redux slices.
4. **User Confirmation Gate:** Stop and wait for explicit user approval before writing code whenever structural schema, authentication, or multi-file refactoring is involved.

### Phase 2: Construct (One Change at a Time)
1. **Incremental Execution:** Apply changes iteratively. Modify one file or tightly coupled module at a time.
2. **No Silent Assumptions:** Never guess missing database schema columns, API key names, or frontend state properties. Check existing files (`models.py`, `serializers.py`, `slices/`) first.
3. **No Unrequested Refactoring:** Do not rewrite unrelated files, reformat unchanged components, or replace working logic without explicit prompt instructions.

### Phase 3: Mandatory Validation (Verify Before Stopping)
Before declaring any turn or phase complete, run validation checks:
1. **Syntax & Conflict Check:** Verify that no Git conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) exist in modified files.
2. **Backend Integrity:** If modifying `Backend/`, verify syntax using `python manage.py check` or test views/serializers.
3. **Frontend Integrity:** If modifying `ETM-Interface/` or `Admin-Dashboard/`, verify that imports resolve and no orphaned state references exist.
4. **Contract Verification:** Ensure JSON key casing matches between Django (`snake_case`) and the frontend.

---

## 2. Karpathy Vibe Coding Discipline
* **Never Guess, Always Read:** Never edit code based on memory of prior state—actively inspect the file on disk first.
* **Stop on Failures:** If a migration, API request, or bundler build fails, stop immediately. Do not stack further code changes on top of a broken state.
* **Clean Purging:** When removing obsolete modules, purge all associated imports, exports, and dead code across the sub-product.