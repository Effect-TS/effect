---
"effect": patch
---

Fix `ExecutionPlan.captureRequirements` to provide the captured services to effectful `while` predicates. Captured plans can now evaluate retry predicates outside their original service context, and captured services take precedence over conflicting services at execution time. Predicates remain lazy and preserve their failures and defects.
