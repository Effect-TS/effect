---
"effect": patch
"@effect/sql-clickhouse": patch
---

Fix `ClickhouseMigrator` failing to create its migrations table or record applied migrations, by running those statements as ClickHouse commands instead of queries. `Migrator.make` accepts an optional `wrapMigrationsTableWrite` wrapper for these statements, defaulting to `identity`.
