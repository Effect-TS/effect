import { Effect, Logger, pipe, Queue } from "effect"

pipe(
  Effect.log("Hello World"),
  Effect.provideLayer(Logger.console()),
  Effect.unsafeFork
)

export const program = Effect.gen(function*() {
  const queue = yield* Queue.bounded<number>(100)

  return queue
})
