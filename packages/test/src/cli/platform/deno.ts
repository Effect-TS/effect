// Deno: executors are Deno (web) workers.
import * as DenoRuntime from "@effect/platform-deno/DenoRuntime"
import * as DenoServices from "@effect/platform-deno/DenoServices"
import * as DenoWorker from "@effect/platform-deno/DenoWorker"
import * as Layer from "effect/Layer"
import { makePlatform, moduleUrl } from "../Platform.ts"

const executor = moduleUrl("../executor/deno", import.meta.url)

export default makePlatform({
  layer: Layer.merge(
    DenoServices.layer,
    DenoWorker.layer(() => new globalThis.Worker(executor, { type: "module" }))
  ),
  run: (effect) => DenoRuntime.runMain(effect)
})
