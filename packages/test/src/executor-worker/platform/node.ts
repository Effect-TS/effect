import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import type { Platform } from "../../Platform.ts"
import type { Services } from "../platforms.ts"

export const platform: Platform<Services> = {
  runtime: "node",
  layer: NodeWorkerRunner.layer,
  runMain: (effect) => NodeRuntime.runMain(effect)
}
