---
"@effect/experimental": patch
"@effect/sql": patch
---

Add VariantSchema fieldFromKey utility to rename the encoded side of a field by variant.

Example usage:

```ts
import { Schema } from "@effect/schema"
import { VariantSchema } from "@effect/experimental"

const { Class, fieldFromKey } = VariantSchema.make({
  variants: ["domain", "json"],
  defaultVariant: "domain"
})

class User extends Class<User>("User")({
  id: Schema.Int,
  firstName: Schema.String.pipe(fieldFromKey({ json: "first_name" }))
}) {}

console.log(
  Schema.encodeSync(User.json)({
    id: 1,
    firstName: "Bob"
  })
)
/*
{ id: 1, first_name: 'Bob' }
*/
```
