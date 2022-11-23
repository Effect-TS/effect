import { Effect, Logger, pipe } from "effect"

pipe(
  Effect.log("Hello World"),
  Effect.provideLayer(Logger.console()),
  Effect.unsafeFork
)
