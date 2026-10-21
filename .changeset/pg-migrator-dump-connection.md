---
"@effect/sql-pg": patch
---

Run `PgMigrator` schema dumps against the connection `PgClient` resolves, including `url`, Unix socket `path`, `application_name`, `options` and TLS verification, and keep the password out of `pg_dump` arguments. Optional TLS (`sslmode=prefer` / `allow`) is dumped with `sslmode=verify-full`, so dumps from servers that refuse TLS fail.
