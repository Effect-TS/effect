---
"@effect/cluster": patch
---

add @effect/cluster EntityResource module

A `EntityResource` is a resource that can be acquired inside a cluster
entity, which will keep the entity alive even across restarts.

The resource will only be fully released when the idle time to live is
reached, or when the `close` effect is called.

By default, the `idleTimeToLive` is infinite, meaning the resource will only
be released when `close` is called.

```ts
import { Entity, EntityResource } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { Effect } from "effect"

const EntityA = Entity.make("EntityA", [Rpc.make("method")])

export const EntityALayer = EntityA.toLayer(
  Effect.gen(function* () {
    // When the entity receives a message, it will first acquire the resource
    //
    // If the entity restarts, the resource will be re-acquired in the new
    // instance.
    //
    // It will only be released when the idle TTL is reached, or when the
    // `close` effect is called.
    const resource = yield* EntityResource.make({
      acquire: Effect.acquireRelease(
        Effect.logInfo("Acquiring Entity resource"),
        () => Effect.logInfo("Releasing Entity resource")
      ),
      // If the resource is not used for 10 minutes, it will be released and the
      // entity will be allowed to shut down.
      idleTimeToLive: "10 minutes"
    })

    return EntityA.of({
      method: Effect.fnUntraced(function* () {
        yield* Effect.logInfo("EntityA.method called")
        // To access the resource, use `resource.get` inside an Effect.scoped
        yield* resource.get
      }, Effect.scoped)
    })
  }),
  {
    // After the resource is released, if the entity is not used for 1 minute,
    // the entity will be shut down.
    maxIdleTime: "1 minute"
  }
)
```
