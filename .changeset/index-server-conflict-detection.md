---
"effect": patch
---

Index unencrypted event-log server conflict detection per batch. `EventLogServerUnencrypted.Storage.entriesAfter` now receives the whole sorted batch and only has to return stored entries that share an id with the batch, or share an event and primary key and sort at or after its oldest entry. Previously it returned the full history after the oldest entry. Conflicts reported to handlers are unchanged. Custom `Storage` implementations must update `entriesAfter` to the new signature. Returning the old, wider result set still works. SQL storage adds an `<prefix>_event_key_idx` index on startup.
