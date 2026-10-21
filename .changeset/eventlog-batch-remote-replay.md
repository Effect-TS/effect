---
"effect": patch
---

`EventJournal.writeFromRemote` now hands its `effect` the whole batch with conflicts read up front, and `EventLog.HandlerTransaction` runs a replayed batch's handlers in one transaction.
