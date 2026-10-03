---
"@effect/sql-pg": patch
---

Increase the default idle timeout from 10 to 60 seconds to reduce reconnections between bursts. Idle connections hold PostgreSQL backends and `max_connections` slots longer. Set `idleTimeout: "10 seconds"` to keep the old timeout.
