---
"@effect/sql-pg": patch
---

Increase the default PostgreSQL pool idle timeout from 10 seconds to 60 seconds to reduce reconnections between bursts of traffic. Idle connections stay open longer, retaining PostgreSQL backends and `max_connections` slots until the pool retires them. Set `idleTimeout: "10 seconds"` to keep the previous timeout.
