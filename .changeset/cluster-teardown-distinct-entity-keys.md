---
"effect": patch
---

Keep teardown tracking separate for distinct cluster entity addresses whose types or IDs contain delimiters. Closing one entity no longer suppresses persisted cancellations from an unrelated live entity. Persisted and wire identities are unchanged.
