# TRIXUL Security Review

**Review date:** 2026-11-27

**Review type:** Read-only source review
**Code fixes included:** None

## Scope and result

The review covered the main Django backend's authentication, permissions, and configuration; the Express telemetry service; Admin Dashboard and ETM API handling; the isolated Swayam Yatri OTP/CSRF/CORS/session/public API and web/Expo clients; and the reviewed dependency manifests and lockfiles.

Five concerns were recorded in the main backend, Express service, and ETM transport. The reviewer found no actionable issue in the isolated Swayam Yatri flows or the reviewed dependency manifests, and no separate Admin Dashboard client-side vulnerability. Deployment reachability and effective environment overrides were not established. The prior full-repository baseline findings remain in [`testing.md`](./testing.md) and were not revalidated by this review.

## Findings

| # | Severity | File | Lines | Finding | Confidence |
|---|---|---|---|---|---|
| 1 | 🔴 CRITICAL | [`Backend/core/serializers.py`](./Backend/core/serializers.py) | 13-21 | Conductor login accepts an employee ID alone and issues JWTs. Anyone who knows or guesses an ID may impersonate that employee. This concern was confirmed outside the changed lines. | Reviewer did not score |
| 2 | 🟠 HIGH | [`Backend/core/views.py`](./Backend/core/views.py), [`Backend/core/urls.py`](./Backend/core/urls.py) | `views.py:57-89, 111-162, 216-274`; `urls.py:19-37` | Operational/admin APIs do not enforce authentication and authorization. A network-reachable caller may access fleet/revenue data and create or alter operational records. | 9/10 |
| 3 | 🟠 HIGH | [`Backend/core/settings.py`](./Backend/core/settings.py) | 13-23 | Fallback signing key, `DEBUG=True`, wildcard hosts, and permissive CORS are unsafe if active. The review did not establish whether deployment overrides them. | Source concern confirmed; deployment exposure unverified |
| 4 | 🟡 MEDIUM | [`Backend/index.js`](./Backend/index.js) | 51, 382-415 | Express accepts unauthenticated location updates for caller-selected bus IDs and binds to `0.0.0.0` by default. A network-reachable caller can spoof displayed bus positions. | 9/10 |
| 5 | 🟡 MEDIUM | [`ETM-Interface/scripts/update-env.js`](./ETM-Interface/scripts/update-env.js), [`ETM-Interface/src/services/api.js`](./ETM-Interface/src/services/api.js) | `update-env.js:22-23`; `api.js:46-48, 78-83` | ETM LAN configuration sends API traffic over HTTP while handling JWTs. An attacker on an untrusted LAN could observe or modify traffic and capture bearer tokens. | 8/10 |

Severity for the ID-only login and settings concerns carries forward the prior baseline classification; the latest reviewer did not assign those numeric severity/confidence scores. The settings finding is conditional on the active deployment configuration.

## Recommended actions

1. Apply default-deny authentication and role/ownership authorization to Django operational and admin APIs.
2. Replace employee-ID-only token issuance with verified conductor credentials and add appropriate throttling and audit logging.
3. Require HTTPS for ETM API traffic outside loopback-only local development.
4. Authenticate Express telemetry devices, bind them to authorized buses, validate updates, and restrict network exposure.
5. Require explicit production settings: a strong secret, `DEBUG=False`, explicit allowed hosts, and a narrow CORS allowlist.
6. Re-review deployment configuration and run targeted authorization/transport tests after remediation.

## Limitations

- No live deployment configuration or network reachability was verified.
- The impact statements describe code-path capability under the stated network preconditions; no exploitation was performed.
- Findings in the earlier full-repository audit are tracked in [`testing.md`](./testing.md) but are not restated as newly verified findings here.
