---
"@effect/sql-pg": patch
---

Fix `PgClient` query span names and `db.namespace`/`server.address`/`server.port` attributes to follow the connection `url`, defaulting the namespace to the connection user when no database is configured.
