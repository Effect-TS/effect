---
"effect": patch
---

Fix Arbitrary property checks, schema generation, and shrinking swallowing defects or interruption when they accompany typed failures. Propagate the defect and interruption reasons with their annotations, removing typed failures from mixed causes to preserve the existing error types.
