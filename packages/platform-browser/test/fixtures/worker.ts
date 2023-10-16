import * as Runner from "@effect/platform-browser/WorkerRunner"
import { Effect, Stream } from "effect"

Runner.make((n: number) => Stream.range(0, n)).pipe(
  Effect.scoped,
  Effect.runFork
)
