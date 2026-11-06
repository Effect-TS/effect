---
"effect": patch
---

Allow RPC handlers to fail with the errors declared by their middleware, as `HttpApi` handlers can. The client and the wire format already included these errors, so a handler no longer has to repeat them in its RPC's `error` schema.

```ts
import { Effect, Schema } from "effect"
import { Rpc, RpcGroup, RpcMiddleware } from "effect/rpc"

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {}) {}

class Auth extends RpcMiddleware.Service<Auth>()("Auth", { error: Unauthorized }) {}

const Group = RpcGroup.make(
  Rpc.make("GetSecret", { success: Schema.String })
).middleware(Auth)

const Handlers = Group.toLayer({
  GetSecret: () => Effect.fail(new Unauthorized())
})
```
