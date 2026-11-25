### FILE 4: `.agent/rules/04-security-quality.md`

```markdown
# 04-security-quality.md — Security Standards, Safety Guardrails & Quality Control

## 1. Database Safety & Data-Loss Protocols
- **Destructive Action Gate:** NEVER execute database reset commands (`DROP DATABASE`, `migrate core zero`, or recursive migration deletions) without explicitly listing the command and asking for user confirmation first.
- **Idempotent Data Seeding:** All seeding logic (e.g., `seed_trixul.py`) must use `get_or_create()` to prevent record duplication on repeated executions.

---

## 2. Secrets & Credentials Security
- **No Hardcoded Secrets:** Never commit passwords, JWT secret keys, or host credentials directly into source files.
- **Environment Isolation:**
  - `Backend/.env` stores `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SECRET_KEY`, and `DEBUG`.
  - `Backend/.env.example` must be maintained with dummy values for repository commits.
  - `ETM-Interface/.env` stores `EXPO_PUBLIC_API_URL`.
- **Database Transport Security:** Production database connections must enforce SCRAM-SHA-256 host authentication.

---

## 3. Code Quality & Verification Standards

### Input Validation
- All backend REST endpoints must validate incoming payloads through DRF `Serializer` classes before invoking `services.py`.
- Reject unvalidated raw dictionaries or missing fields with explicit `HTTP_400_BAD_REQUEST` responses.

### Code Hygiene & Sanity Checks
- **Git Conflict Sweep:** Every code output must be verified free of Git merge markers (`<<<<<<<`, `=======`, `>>>>>>>`).
- **Orphaned File Sweeps:** Do not leave unused temporary test scripts or duplicate model files (`api/models.py` vs `core/models.py`) in the codebase.
- **Error Logging:** Log full tracebacks for internal server errors (`500`) while returning structured JSON error messages to clients.
