---
"effect": patch
---

Fix `ExecutionPlan` to track schedule errors and service requirements, including in plans with unscheduled fallback steps. Provide captured services to schedules when using `captureRequirements`.
