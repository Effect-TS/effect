import * as DevTools from "@effect/experimental/DevTools"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Effect } from "effect"

const program = Effect.log("Hello!").pipe(
  Effect.delay(2000),
  Effect.withSpan("Hi", { attributes: { foo: "bar" } }),
  Effect.forever
)

program.pipe(
  Effect.provide(DevTools.layer()),
  runMain
)
