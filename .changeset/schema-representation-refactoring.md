---
"effect": patch
---

Refactor the `SchemaRepresentation` module to improve clarity and maintainability.

Add constructors for declaration, filter, and filter group revivers that infer their payload type from `payloadSchema`.
