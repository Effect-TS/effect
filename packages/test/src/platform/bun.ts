// Bun: executors are Bun workers.
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import * as BunWorker from "@effect/platform-bun/BunWorker"
import * as BunWorkerRunner from "@effect/platform-bun/BunWorkerRunner"
import * as Layer from "effect/Layer"
import { moduleUrl, type Platform } from "../Platform.ts"
import type { Services } from "../platforms.ts"

const executor = moduleUrl("../executor-worker", import.meta.url)

export const platform: Platform<Services> = {
  runtime: "bun",
  layer: Layer.mergeAll(
    BunServices.layer,
    BunWorker.layer(() => new globalThis.Worker(executor)),
    BunWorkerRunner.layer
  ),
  runMain: (effect) => BunRuntime.runMain(effect)
}
