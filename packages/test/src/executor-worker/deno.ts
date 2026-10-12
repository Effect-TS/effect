// An executor on Deno: a Deno worker, started by the CLI's Deno platform (cli/platform/deno.ts).
// It always runs on the same runtime as the CLI that spawned it, so nothing is detected.
import * as DenoRuntime from "@effect/platform-deno/DenoRuntime"
import * as DenoWorkerRunner from "@effect/platform-deno/DenoWorkerRunner"
import * as Layer from "effect/Layer"
import * as Executor from "../Executor.ts"

Executor.layerWorker.pipe(Layer.provide(DenoWorkerRunner.layer), Layer.launch, DenoRuntime.runMain)
