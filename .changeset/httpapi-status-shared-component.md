---
"effect": patch
---

Fix `HttpApiSchema.status` forking named schemas, so a schema reused across response statuses emits a single OpenAPI component.
