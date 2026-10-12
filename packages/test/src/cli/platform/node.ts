// Node: executors are worker threads.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as NodeWorker from "@effect/platform-node/NodeWorker"
import * as Layer from "effect/Layer"
import { Worker } from "node:worker_threads"
import type { Services } from "../bin.ts"
import { moduleUrl, type Platform } from "../Platform.ts"

const executor = moduleUrl("../executor/node", import.meta.url)

export const platform: Platform<Services> = {
  runtime: "node",
  layer: Layer.merge(
    NodeServices.layer,
    NodeWorker.layer(() => {
      const worker = new Worker(executor, { stdout: true, stderr: true })
      // keep the coordinator's stdout for the reporter only
      worker.stdout.pipe(process.stderr)
      worker.stderr.pipe(process.stderr)
      return worker
    })
  ),
  runMain: (effect) => NodeRuntime.runMain(effect)
}
