// Bun: executors are Bun workers.
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import * as BunWorker from "@effect/platform-bun/BunWorker"
import * as Layer from "effect/Layer"
import { makePlatform, moduleUrl } from "../Platform.ts"

const executor = moduleUrl("../executor/bun", import.meta.url)

export default makePlatform({
  layer: Layer.merge(BunServices.layer, BunWorker.layer(() => new globalThis.Worker(executor))),
  run: (effect) => BunRuntime.runMain(effect)
})
