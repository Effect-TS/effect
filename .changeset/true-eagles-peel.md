---
"effect": minor
---

return a proxy Layer from LayerMap service

The new usage is:

```ts
import { NodeRuntime } from "@effect/platform-node"
import { Context, Effect, FiberRef, Layer, LayerMap } from "effect"

class Greeter extends Context.Tag("Greeter")<
  Greeter,
  {
    greet: Effect.Effect<string>
  }
>() {}

// create a service that wraps a LayerMap
class GreeterMap extends LayerMap.Service<GreeterMap>()("GreeterMap", {
  // define the lookup function for the layer map
  //
  // The returned Layer will be used to provide the Greeter service for the
  // given name.
  lookup: (name: string) =>
    Layer.succeed(Greeter, {
      greet: Effect.succeed(`Hello, ${name}!`)
    }),

  // If a layer is not used for a certain amount of time, it can be removed
  idleTimeToLive: "5 seconds",

  // Supply the dependencies for the layers in the LayerMap
  dependencies: []
}) {}

// usage
const program: Effect.Effect<void, never, GreeterMap> = Effect.gen(
  function* () {
    // access and use the Greeter service
    const greeter = yield* Greeter
    yield* Effect.log(yield* greeter.greet)
  }
).pipe(
  // use the GreeterMap service to provide a variant of the Greeter service
  Effect.provide(GreeterMap.get("John"))
)

// run the program
program.pipe(Effect.provide(GreeterMap.Default), NodeRuntime.runMain)
```
