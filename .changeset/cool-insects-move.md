---
"effect": patch
---

filter non-JSON values from schema examples and defaults, closes #5884

Introduce JsonValue type and update JsonSchemaAnnotations to use it for
type safety. Add validation to filter invalid values (BigInt, cyclic refs)
from examples and defaults, preventing infinite recursion on cycles.
