---
"effect": patch
---

add apis for manipulating context to the Runtime module

These include:

- `Runtime.updateContext` for modifying the `Context` directly
- `Runtime.provideService` for adding services to an existing Runtime

Example:

```ts
import { Context, Runtime } from "effect";

interface Name {
  readonly _: unique symbol;
}
const Name = Context.Tag<Name, string>("Name");

const runtime: Runtime.Runtime<Name> = Runtime.defaultRuntime.pipe(
  Runtime.provideService(Name, "John")
);
```
