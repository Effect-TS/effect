---
"effect": patch
---

Fix `EventLog` remote reconnects resuming from the sequence captured at startup instead of the journal's current sequence, which replayed already-written entries and re-triggered reactivity invalidations.
