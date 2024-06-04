---
"@effect/schema": patch
---

Align constructors arguments:

- Refactor `Class` interface to accept options for disabling validation
- Refactor `TypeLiteral` interface to accept options for disabling validation
- Refactor `refine` interface to accept options for disabling validation
- Refactor `BrandSchema` interface to accept options for disabling validation

Example

```ts
import { Schema } from "@effect/schema"

const BrandedNumberSchema = Schema.Number.pipe(
  Schema.between(1, 10),
  Schema.brand("MyNumber")
)

BrandedNumberSchema.make(20, { disableValidation: true }) // Bypasses validation and creates the instance without errors
```
