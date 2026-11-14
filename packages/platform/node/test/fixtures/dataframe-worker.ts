import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import { Parallel } from "effect/dataframe"
import * as Effect from "effect/Effect"

await Effect.runPromise(Parallel.runWorker.pipe(Effect.provide(NodeWorkerRunner.layer)))
