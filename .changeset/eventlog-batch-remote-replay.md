---
"effect": patch
---

Replay each remote EventLog batch with one journal callback and one conflict read, and add `EventLog.HandlerTransaction` to run a batch's handlers in a single transaction. `EventJournal.writeFromRemote` now passes its `effect` every entry of the batch at once.
