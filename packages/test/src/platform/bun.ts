// Bun: executors are Bun workers.
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import * as BunWorker from "@effect/platform-bun/BunWorker"
import * as BunWorkerRunner from "@effect/platform-bun/BunWorkerRunner"
import * as Layer from "effect/Layer"
import { moduleUrl, type Platform } from "../Platform.ts"

const executor = moduleUrl("../executor-worker", import.meta.url)

export const platform: Platform = {
  runtime: "bun",
  layer: Layer.merge(BunServices.layer, BunWorker.layer(() => new globalThis.Worker(executor))),
  workerRunner: BunWorkerRunner.layer,
  runMain: (effect) => BunRuntime.runMain(effect)
}
