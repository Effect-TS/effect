---
"effect": patch
---

Speed up conflict detection in the IndexedDB event journal. Remote writes now read only the stored entries that share an event and primary key with the batch, through a new `[event, primaryKey, id]` index, and no longer re-validate stored rows. Existing databases upgrade to version 3, which only adds the index.
