---
"@effect/openapi-generator": patch
---

Generated HttpApi groups now drop the group prefix from endpoint names (`balance.read` becomes `read`) while keeping the qualified OpenAPI operation id, reject operations whose names collide within a group, and only emit the parameter schemas grouped endpoints use.
