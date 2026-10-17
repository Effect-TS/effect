---
"effect": patch
---

Speed up conflict detection in the IndexedDB event journal. Remote writes now read only the stored entries that share an event and primary key with the incoming batch, using a new `[event, primaryKey, id]` index, instead of every entry newer than the oldest incoming one. Stored rows are no longer re-validated when read. Existing databases upgrade to version 3 automatically; the upgrade only adds the index.
