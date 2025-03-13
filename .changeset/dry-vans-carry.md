---
"effect": patch
---

Schema: enhance the internal `formatUnknown` function to handle various types including iterables, classes, and additional edge cases.

Before

```ts
import { Schema } from "effect"

const schema = Schema.Array(Schema.Number)

Schema.decodeUnknownSync(schema)(new Set([1, 2]))
// throws Expected ReadonlyArray<number>, actual {}

class A {
  constructor(readonly a: number) {}
}

Schema.decodeUnknownSync(schema)(new A(1))
// throws Expected ReadonlyArray<number>, actual {"a":1}
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Array(Schema.Number)

Schema.decodeUnknownSync(schema)(new Set([1, 2]))
// throws Expected ReadonlyArray<number>, actual Set([1,2])

class A {
  constructor(readonly a: number) {}
}

Schema.decodeUnknownSync(schema)(new A(1))
// throws Expected ReadonlyArray<number>, actual A({"a":1})
```
