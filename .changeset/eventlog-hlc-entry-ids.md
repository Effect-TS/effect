---
"effect": patch
---

Generate EventLog entry ids from a hybrid logical clock, so a local write always sorts after every entry committed to its journal, even when the local clock is behind.

- The memory, IndexedDB and SQL journals generate each local id after the latest id in their store, without adopting it into the process's id sequence. The IndexedDB and SQL journals read it from the store, because other tabs or processes sharing the store keep their own sequence. This adds one read per `writeMany`. Inside an enclosing SQL transaction, local ids also sort after its uncommitted rows, and a rollback leaves nothing behind.
- Clocks that run ahead are not clamped. A warning is logged when an imported id is more than 24 hours ahead of the local clock, read from the `Clock` service.
- If a store holds an id at the end of the UUID v7 timestamp range, local writes to that store fail with an `EventJournalError` instead of committing ids that sort before it. `makeEntryIdUnsafe` throws a `RangeError` once its own sequence passes the range. Ids created with an explicit `msecs` still clamp.
