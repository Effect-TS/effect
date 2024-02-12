---
"@effect/schema": patch
---

disable instanceof check for encoding schema classes

This allows for the encoding of structs that have the same shape as the class.

For example, this will no longer throw an error:

```ts
class User extends Schema.Class<User>()({ name: Schema.string }) {}

Schema.encodeSync(User)({ name: "John" });
```
