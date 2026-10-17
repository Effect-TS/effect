---
"effect": patch
---

Handle an entry that appears more than once in one remote replay. The memory, IndexedDB and SQL event journals now keep the first copy, and `SqlEventJournal` moves an entry's remote sequence forward when it arrives again later, so `nextRemoteSequence` passes it.
