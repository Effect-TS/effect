import * as DenoRuntime from "@effect/platform-deno/DenoRuntime"
import * as DenoWorkerRunner from "@effect/platform-deno/DenoWorkerRunner"
import type { Platform } from "../../Platform.ts"
import type { Services } from "../platforms.ts"

export const platform: Platform<Services> = {
  runtime: "deno",
  layer: DenoWorkerRunner.layer,
  runMain: (effect) => DenoRuntime.runMain(effect)
}
