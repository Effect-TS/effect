import { runMain } from "@effect/platform-node/Runtime"
import * as Runner from "@effect/platform-node/WorkerRunner"
import { Effect, Stream } from "effect"

Effect.log("runner started").pipe(
  Effect.zipRight(Runner.make((n: number) => Stream.range(0, n))),
  Effect.scoped,
  Effect.ensuring(Effect.log("runner closed")),
  runMain
)
