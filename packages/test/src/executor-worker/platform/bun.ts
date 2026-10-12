import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunWorkerRunner from "@effect/platform-bun/BunWorkerRunner"
import type { Platform } from "../../Platform.ts"
import type { Services } from "../platforms.ts"

export const platform: Platform<Services> = {
  runtime: "bun",
  layer: BunWorkerRunner.layer,
  runMain: (effect) => BunRuntime.runMain(effect)
}
