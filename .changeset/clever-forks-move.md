---
"effect": patch
---

Schema: respect custom constructors in `make` for `Schema.Class`, closes #4797

Previously, the `make` method did not support custom constructors defined using `Schema.Class` or `Schema.TaggedError`, resulting in type errors when passing custom constructor arguments.

This update ensures that `make` now correctly uses the class constructor, allowing custom parameters and initialization logic.

Before

```ts
import { Schema } from "effect"

class MyError extends Schema.TaggedError<MyError>()("MyError", {
  message: Schema.String
}) {
  constructor({ a, b }: { a: string; b: string }) {
    super({ message: `${a}:${b}` })
  }
}

// @ts-expect-error: Object literal may only specify known properties, and 'a' does not exist in type '{ readonly message: string; }'.ts(2353)
MyError.make({ a: "1", b: "2" })
```

After

```ts
import { Schema } from "effect"

class MyError extends Schema.TaggedError<MyError>()("MyError", {
  message: Schema.String
}) {
  constructor({ a, b }: { a: string; b: string }) {
    super({ message: `${a}:${b}` })
  }
}

console.log(MyError.make({ a: "1", b: "2" }).message)
// Output: "1:2"
```
