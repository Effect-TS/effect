---
"effect": patch
---

Add `EventLog.writeMany` and `EventJournal.writeMany`, which write a batch of local events under one lock, one handler transaction and one journal commit. Clock-based entry ids are now strictly ascending within a process.
