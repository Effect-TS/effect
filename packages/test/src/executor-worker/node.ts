// An executor on Node: a worker thread, started by the CLI's Node platform (cli/platform/node.ts).
// It always runs on the same runtime as the CLI that spawned it, so nothing is detected.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import * as Layer from "effect/Layer"
import * as Executor from "../Executor.ts"

Executor.layerWorker.pipe(Layer.provide(NodeWorkerRunner.layer), Layer.launch, NodeRuntime.runMain)
