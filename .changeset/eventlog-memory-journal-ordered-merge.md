---
"effect": patch
---

Speed up EventLog event processing by decoding entry id timestamps without allocating and by merging remote imports into the in-memory `EventJournal` instead of re-sorting the whole journal on every batch.
