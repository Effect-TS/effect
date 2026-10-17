---
"effect": patch
---

Index duplicate and conflict detection in the unencrypted event-log server once per incoming batch instead of rescanning stored history for every entry. `EventLogServerUnencrypted.Storage.entriesAfter` now receives the batch as an optional third argument. The built-in storages use it to read only matching entries, and SQL storage creates a `<prefix>_event_key_idx` index on startup for SQLite, Postgres and MySQL. Custom storages that ignore the argument keep working.
