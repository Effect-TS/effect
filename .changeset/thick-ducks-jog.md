---
"@effect/experimental": patch
---

add VariantSchema module to experimental

The `VariantSchema` module can be used to schemas with multiple variants.

```ts
import { VariantSchema } from "@effect/experimental";
import { Schema } from "@effect/schema";
import { DateTime } from "effect";

export const { Class, Field, Struct } = VariantSchema.factory({
  variants: ["database", "api"],
  defaultVariant: "database",
});

class User extends Class<User>("User")({
  id: Schema.Number,
  createdAt: Field({
    database: Schema.DateTimeUtc.pipe(
      Schema.optionalWith({ default: DateTime.unsafeNow }),
    ),
    api: Schema.DateTimeUtc,
  }),
  updateAt: Field({
    database: Schema.DateTimeUtc.pipe(
      Schema.optionalWith({ default: DateTime.unsafeNow }),
    ),
    api: Schema.DateTimeUtc,
  }),
}) {}

// the class will use the `defaultVariant` fields
const user = new User({ id: 1 });
user.createdAt;
user.updateAt;

// access the `Schema.Struct` variants as static props
User.database;
User.api;
```
