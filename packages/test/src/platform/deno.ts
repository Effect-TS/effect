// Deno: executors are Deno (web) workers.
import * as DenoRuntime from "@effect/platform-deno/DenoRuntime"
import * as DenoServices from "@effect/platform-deno/DenoServices"
import * as DenoWorker from "@effect/platform-deno/DenoWorker"
import * as DenoWorkerRunner from "@effect/platform-deno/DenoWorkerRunner"
import * as Layer from "effect/Layer"
import type { Platform } from "../Platform.ts"

const executor = new URL("../executor-worker.ts", import.meta.url)

export const platform: Platform = {
  runtime: "deno",
  layer: Layer.merge(DenoServices.layer, DenoWorker.layer(() => new globalThis.Worker(executor, { type: "module" }))),
  workerRunner: DenoWorkerRunner.layer,
  runMain: (effect) => DenoRuntime.runMain(effect)
}
