---
"effect": patch
---

Added type-level validation for the `Effect.Service` function to ensure the `Self` generic parameter is provided. If the generic is missing, the `MissingSelfGeneric` type will be returned, indicating that the generic parameter must be specified. This improves type safety and prevents misuse of the `Effect.Service` function.

```ts
type MissingSelfGeneric =
  `Missing \`Self\` generic - use \`class Self extends Service<Self>()...\``
```
