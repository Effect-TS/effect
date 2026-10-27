---
"effect": patch
---

Split `SqlEventJournal` batch statements so large remote syncs and `writeMany` calls stay within database parameter limits, still committing each batch in one transaction after a single callback.
