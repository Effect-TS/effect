---
"effect": patch
---

Decode `EventJournal` entry timestamps without allocating, and merge remote imports into the in-memory journal instead of re-sorting it on every batch.
