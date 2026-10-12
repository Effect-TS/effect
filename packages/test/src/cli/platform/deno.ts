// Deno: executors are Deno (web) workers.
import * as DenoRuntime from "@effect/platform-deno/DenoRuntime"
import * as DenoServices from "@effect/platform-deno/DenoServices"
import * as DenoWorker from "@effect/platform-deno/DenoWorker"
import * as Layer from "effect/Layer"
import { moduleUrl, type Platform } from "../../Platform.ts"
import type { Services } from "../bin.ts"

const executor = moduleUrl("../../executor-worker/deno", import.meta.url)

export const platform: Platform<Services> = {
  runtime: "deno",
  layer: Layer.merge(
    DenoServices.layer,
    DenoWorker.layer(() => new globalThis.Worker(executor, { type: "module" }))
  ),
  runMain: (effect) => DenoRuntime.runMain(effect)
}
