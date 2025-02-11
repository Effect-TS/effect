import * as BrowserRunner from "@effect/platform-browser/BrowserWorkerRunner"
import * as Runner from "@effect/platform/WorkerRunner"
import { Effect, Layer, Stream } from "effect"

const WorkerLive = Runner.layer((n: number) => Stream.range(0, n)).pipe(
  Layer.provide(BrowserRunner.layer)
)

Effect.runFork(Runner.launch(WorkerLive))
