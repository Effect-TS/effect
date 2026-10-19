---
"effect": patch
---

Bind each `EventJournal` to one store id. The first `withLock` records its store id, and `withLock` with another store id fails with an `EventJournalError` caused by a new `StoreIdMismatchError`, without running the effect. Previously a journal reused with a different `CurrentStoreId` resumed the new store at the old store's sequence and uploaded the old store's pending entries to it.

The memory, IndexedDB and SQL journals all enforce this. IndexedDB and SQL persist the binding atomically across journal instances, tabs and connections: IndexedDB in a new `store` object store (database version 3), SQL in a new `${entryTable}_store` table. Existing journals are bound on their first use after upgrading. `EventLog` checks the binding while it is built, so `layerEventLog` and `layer` now fail with `EventJournalError` before any remote syncs. Use a separate journal per store id.
