---
"@effect/cluster": patch
---

Drop the entity id from server-side entity RPC span names to keep span name cardinality bounded. The id remains available as the `entity.id` span attribute.
