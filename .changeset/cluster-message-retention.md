---
"effect": patch
"@effect/sql-mysql2": patch
---

Add `MessageRetention.make` to delete a persisted entity's old completed requests, and fix `@effect/sql-mysql2` not starting a transaction for a `SET TRANSACTION` `BeginTransaction`.

- Custom `MessageStorage` implementations must add `deleteProcessed`.
- SQL message storage on MySQL needs MySQL 8.0.1+ or MariaDB 10.6+, and `binlog_format` `ROW` or `MIXED`.
