// Node: executors are worker threads.
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as NodeWorker from "@effect/platform-node/NodeWorker"
import * as Layer from "effect/Layer"
import * as Module from "node:module"
import { Worker } from "node:worker_threads"
import { makePlatform, moduleUrl } from "../Platform.ts"

const executor = moduleUrl("../executor/node", import.meta.url)

export default makePlatform({
  layer: Layer.merge(
    NodeServices.layer,
    NodeWorker.layer(() => {
      // the CLI turned on Node's compile cache (bin.ts); workers only use it if told where it is
      const cacheDir = Module.getCompileCacheDir?.()
      const env = cacheDir === undefined ? process.env : { ...process.env, NODE_COMPILE_CACHE: cacheDir }
      const worker = new Worker(executor, { stdout: true, stderr: true, env })
      // keep the coordinator's stdout for the reporter only
      worker.stdout.pipe(process.stderr)
      worker.stderr.pipe(process.stderr)
      return worker
    })
  ),
  run: (effect) => NodeRuntime.runMain(effect)
})
