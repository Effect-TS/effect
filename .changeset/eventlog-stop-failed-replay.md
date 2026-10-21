---
"effect": patch
---

Fail and retry an EventLog remote replay batch when an entry fails to decode or its handler fails, instead of committing the entry without applying it.
