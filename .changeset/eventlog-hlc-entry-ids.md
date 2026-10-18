---
"effect": patch
---

Generate EventLog entry ids from a hybrid logical clock, so a local write always sorts after every committed entry the process has seen, even when the local clock is behind.

- The memory, IndexedDB and SQL journals advance the entry id clock past each remote entry they import, once the import commits. A rejected or rolled-back import leaves the clock alone, except in `@effect/sql-sqlite-do`, whose transactions run `afterCommit` callbacks immediately.
- The IndexedDB and SQL journals also read the latest stored id before each local write, because other tabs or processes sharing the store keep their own clock. This adds one read per `writeMany`.
- Clocks that run ahead are not clamped. A warning is logged when an observed id is more than 24 hours ahead of the local clock.
- If an observed id is at the end of the UUID v7 timestamp range, local writes fail with an `EventJournalError` from then on, instead of committing ids that sort before it. `makeEntryIdUnsafe` throws a `RangeError` in that state. Ids created with an explicit `msecs` still clamp.
