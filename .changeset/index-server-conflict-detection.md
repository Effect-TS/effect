---
"effect": patch
---

Speed up duplicate and conflict detection in the unencrypted event-log server by indexing each incoming batch, instead of rescanning stored history for every entry. `EventLogServerUnencrypted.Storage.entriesAfter` now also receives the batch as an optional third argument, which the built-in storages use to read only matching entries. Custom storages that ignore it keep working unchanged. SQL storage creates a `<prefix>_event_key_idx` index on startup for SQLite, Postgres and MySQL.
