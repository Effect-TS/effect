---
"effect": patch
---

Split `SqlEventJournal` batch statements so large remote syncs and `writeMany` calls stay within database parameter limits, including the 100 parameters Durable Object SQLite allows per statement, still committing each batch in one transaction after a single callback.
