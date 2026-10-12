// Node: executors are worker threads.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as NodeWorker from "@effect/platform-node/NodeWorker"
import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import * as Layer from "effect/Layer"
import { Worker } from "node:worker_threads"
import type { Platform } from "../Platform.ts"

const executor = new URL("../executor-worker.ts", import.meta.url)

export const platform: Platform = {
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
  workerRunner: NodeWorkerRunner.layer,
  runMain: (effect) => NodeRuntime.runMain(effect)
}
