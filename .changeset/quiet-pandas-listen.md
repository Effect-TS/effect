---
"@effect/sql-pg": patch
"@effect/sql-pglite": patch
---

Make PostgreSQL `listen` subscriptions scoped and readiness-aware. `listen` now returns a dequeue after the subscription is installed, preserves empty payloads, shares a reference-counted listener connection, isolates concurrent subscriptions, and reports terminal listener failures.
