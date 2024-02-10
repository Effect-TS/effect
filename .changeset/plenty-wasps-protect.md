---
"@effect/rpc-http": patch
"@effect/rpc": patch
---

add rpc Router.provideService and .provideServiceEffect

with these apis you can provide context to a Rpc or Router to eliminate
requirements.

```ts
import { Rpc, Router } from "@effect/rpc"

Router.make(
  Rpc.effect(MyRequest, () => ...)
).pipe(
  Router.provideServiceEffect(Session, makeSessionEffect)
)
```
