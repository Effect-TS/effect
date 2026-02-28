import { DevTools } from "@effect/experimental"
import { NodeSdk } from "@effect/opentelemetry"
import { NodeRuntime } from "@effect/platform-node"
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node"
import { Console, Effect, FiberSet, Layer, Option, pipe, Schedule } from "effect"

export const TracingLive = NodeSdk.layer(Effect.sync(() => ({
  resource: {
    serviceName: "test"
  },
  spanProcessor: new SimpleSpanProcessor(new InMemorySpanExporter())
})))

const program = Effect.gen(function*() {
  const fs = yield* FiberSet.make()

  yield* FiberSet.run(fs)(
    Effect.gen(function*() {
      // const currentSpan = yield* Effect.currentSpan.pipe(Effect.option)
      // console.dir({ _tag: "start", currentSpan }, { depth: 20 })

      yield* Effect.gen(function*() {
        // const currentSpan = yield* Effect.currentSpan.pipe(Effect.option)

        // // we actually have a parent span because of auto inherit via OTel Context
        // if (Option.isSome(currentSpan) && Option.isSome(currentSpan.value.parent)) {
        //   return yield* Effect.die("ya fucked up!")
        // }
      }).pipe(
        Effect.withSpan("Iter", { root: true }),
        Effect.repeat(Schedule.spaced("1 seconds")),
        Effect.onExit(Console.dir)
      )
    })
  )
}).pipe(Effect.withSpan("main"))

const DevToolsLive = DevTools.layer()

Layer.mergeAll(program.pipe(Layer.scopedDiscard)).pipe(
  // doesn't reach Otel
  // Layer.provide([DevToolsLive, TracingLive]),
  // reaches Otel, but no options passed!
  Layer.provide(pipe(DevToolsLive, Layer.provideMerge(TracingLive))),
  // this works
  // Layer.provide(TracingLive),
  Layer.launch,
  NodeRuntime.runMain
)
