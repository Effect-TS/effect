import * as Runner from "@effect/platform-browser/WorkerRunner"
import { Effect, Layer, Stream } from "effect"

const WorkerLive = Runner.layer((n: number) => Stream.range(0, n))

Effect.runFork(Layer.launch(WorkerLive))
