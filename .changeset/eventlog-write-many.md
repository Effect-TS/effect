---
"effect": patch
---

Add `EventLog.writeMany` and `EventJournal.writeMany` to write a batch of local events under one lock, one handler transaction and one journal commit, and make clock-based entry ids strictly ascending within a process.
