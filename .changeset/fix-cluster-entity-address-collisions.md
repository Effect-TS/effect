---
"effect": patch
---

Fix cluster entity tracking when the same entity id is resident on multiple shards. Idle reaping, processing checks, entity counts, and interrupt or acknowledgement delivery during draining now distinguish full entity addresses.
