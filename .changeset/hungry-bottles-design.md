---
"effect": patch
---

add Match.withReturnType api

Which can be used to constrain the return type of a match expression.

```ts
import { Match } from "effect"

Match.type<string>().pipe(
  Match.withReturnType<string>(),
  Match.when("foo", () => "foo"), // valid
  Match.when("bar", () => 123), // type error
  Match.else(() => "baz")
)
```
