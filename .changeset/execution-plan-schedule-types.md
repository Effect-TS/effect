---
"effect": patch
---

Fix `ExecutionPlan` to preserve errors and service requirements from layers, predicates, and schedules across fallback steps. Provide captured services to schedules when using `captureRequirements`.
