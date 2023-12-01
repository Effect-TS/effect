import * as Command from "@effect/platform-node/Command"
import * as NodeContext from "@effect/platform-node/NodeContext"
import { runMain } from "@effect/platform-node/Runtime"
import { Console, Effect, Fiber } from "effect"

const spawn = Command.make("sleep", "100000").pipe(
  Command.start,
  Effect.tap((_) => Console.log("started", _.pid)),
  Effect.fork
)

Effect.gen(function*(_) {
  const fiber = yield* _(spawn)
  yield* _(Effect.sleep(2000))
  yield* _(Fiber.interrupt(fiber))
}).pipe(
  Effect.scoped,
  Effect.provide(NodeContext.layer),
  runMain
)
