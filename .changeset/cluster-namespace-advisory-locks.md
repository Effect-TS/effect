---
"effect": minor
---

Add opt-in `namespaceAdvisoryLocks` to `SqlRunnerStorage` so PostgreSQL advisory locks are keyed by table prefix. Enable when multiple clusters share one Postgres database with different prefixes; default lock behavior is unchanged.
