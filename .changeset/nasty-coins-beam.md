---
"effect": patch
---

Fixes a bug where non existing properties were allowed in the `make` constructor of a `Schema.Class`, closes #4767.

**Example**

```ts
import { Schema } from "effect"

class A extends Schema.Class<A>("A")({
  a: Schema.String
}) {}

A.make({
  a: "a",
  // @ts-expect-error: Object literal may only specify known properties, and 'b' does not exist in type '{ readonly a: string; }'.ts(2353)
  b: "b"
})
```
