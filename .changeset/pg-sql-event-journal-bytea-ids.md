---
"effect": patch
---

Fix `SqlEventJournal` on PostgreSQL by storing entry and remote ids as `BYTEA` and decoding `BIGINT` timestamps returned as strings.
