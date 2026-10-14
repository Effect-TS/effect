---
"effect": patch
---

Name cluster entity RPC server spans by entity type only (e.g. `WorkflowEntity.Run`) so span names stay low-cardinality. The entity ID is still recorded in the `entity.id` span attribute.
