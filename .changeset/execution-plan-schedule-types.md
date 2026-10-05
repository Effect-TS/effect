---
"effect": patch
---

Fix `ExecutionPlan` schedule typing: a step schedule's error type now flows into the plan's `error` (previously it was inferred as a requirement), schedules that require services are accepted and tracked in `requirements`, and `captureRequirements` now also provides the captured context to step schedules.
