---
"@effect/sql-pg": patch
"effect": patch
---

Replace `@effect/sql-pg`'s `pg` runtime with a native PostgreSQL client. `PgConnection` and `PgPool` now handle connection setup, binary queries, prepared statements, pipelining, streaming, notifications, cancellation, and custom codecs. `PgClient` uses the native stack, and the legacy `fromPool`, `fromClient`, and `makeWith` constructors are removed.

Inferred parameters stay permissive: strings bind untyped so the backend derives the type from the statement, and safe integers beyond the `int4` range bind as `int8`.

Add `Pool.reserve` for exclusive access to a concurrent pool item, and fix waiter wakeups and capacity replacement after invalidation.
