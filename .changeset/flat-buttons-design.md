---
"effect": patch
---

Made Schema.brand keep type of schema being piped into it even if brand schema was extracted into a variable. Type was previously Schema.any

Before:

```ts
const UserIdBrandSchema = Schema.brand("UserId")
const UserIdSchema = pipe(Schema.Number, UserIdBrandSchema)
//    ^? Schema.brand<Schema.Schema.Any, "UserId">
```

After:

```ts
const UserIdBrandSchema = Schema.brand("UserId")
const UserIdSchema = pipe(Schema.Number, UserIdBrandSchema)
//    ^? Schema.brand<typeof Schema.Number, "UserId">
```
