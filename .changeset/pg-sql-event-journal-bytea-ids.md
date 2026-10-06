---
"effect": patch
---

Fix PostgreSQL `SqlEventJournal` writes by storing entry and remote IDs as `BYTEA`, and decode `BIGINT` timestamps returned as strings or bigints.

Existing tables with `UUID` columns are not migrated automatically. Recreate both journal tables only after confirming they are empty, or externally migrate `id`, `remote_id`, and `entry_id` to `BYTEA` while preserving existing data.
