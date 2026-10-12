// Node: executors are worker threads.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as NodeWorker from "@effect/platform-node/NodeWorker"
import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import * as Layer from "effect/Layer"
import { Worker } from "node:worker_threads"
import { moduleUrl, type Platform } from "../Platform.ts"
import type { Services } from "../platforms.ts"

const executor = moduleUrl("../executor-worker", import.meta.url)

export const platform: Platform<Services> = {
  runtime: "node",
  layer: Layer.mergeAll(
    NodeServices.layer,
    NodeWorkerRunner.layer,
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
