// An executor on Bun: a Bun worker, started by the CLI's Bun platform (cli/platform/bun.ts).
// It always runs on the same runtime as the CLI that spawned it, so nothing is detected.
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunWorkerRunner from "@effect/platform-bun/BunWorkerRunner"
import * as Layer from "effect/Layer"
import * as Executor from "../Executor.ts"

Executor.layerWorker.pipe(Layer.provide(BunWorkerRunner.layer), Layer.launch, BunRuntime.runMain)
