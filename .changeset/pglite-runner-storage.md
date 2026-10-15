---
"effect": patch
"@effect/sql-pglite": patch
---

Fix `SqlRunnerStorage` hanging on PGlite. SQL clients now report `singleSession`, and PGlite sets it. On a single-session client, runner storage no longer reserves the only connection and uses lock table rows instead of advisory locks, so runner and application queries are no longer blocked.
