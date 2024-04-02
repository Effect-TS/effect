---
"effect": minor
---

support variadic arguments in Effect.log

This makes Effect.log more similar to console.log:

```ts
Effect.log("hello", { foo: "bar" }, Cause.fail("error"));
```
