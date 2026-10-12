// Bun: executors are Bun workers.
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import * as BunWorker from "@effect/platform-bun/BunWorker"
import * as Layer from "effect/Layer"
import { moduleUrl, type Platform } from "../../Platform.ts"
import type { Services } from "../bin.ts"

const executor = moduleUrl("../../executor-worker/bun", import.meta.url)

export const platform: Platform<Services> = {
  runtime: "bun",
  layer: Layer.merge(BunServices.layer, BunWorker.layer(() => new globalThis.Worker(executor))),
  runMain: (effect) => BunRuntime.runMain(effect)
}
