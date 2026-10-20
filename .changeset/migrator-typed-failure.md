---
"effect": patch
---

Fail SQL migrations with a typed `MigrationError` instead of a defect, so `Effect.catchTag("MigrationError")` and retries can handle them.
