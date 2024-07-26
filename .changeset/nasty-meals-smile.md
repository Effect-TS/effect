---
"effect": patch
---

Add `Service` and `Identifier` to `Context.Tag`.

These helpers can be used, for example, to extract the service shape from a tag:

```ts
import * as Context from "effect/Context"

export class Foo extends Context.Tag("Foo")<
  Foo,
  {
    readonly foo: Effect.Effect<void>
  }
>() {}

type ServiceShape = typeof Foo.Service
```
