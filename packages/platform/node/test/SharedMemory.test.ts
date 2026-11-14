import * as NodeWorker from "@effect/platform-node/NodeWorker"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as RpcClient from "effect/rpc/RpcClient"
import * as SharedMemory from "effect/workers/SharedMemory"
import * as ChildProcess from "node:child_process"
import { fileURLToPath } from "node:url"
import * as WorkerThreads from "node:worker_threads"
import { Compute } from "./fixtures/shared-memory-rpc.ts"

const fixture = new URL("./fixtures/shared-memory-worker.ts", import.meta.url)

const ranges = (length: number, parts: number) =>
  Array.from({ length: parts }, (_, i) => [Math.floor(i * length / parts), Math.floor((i + 1) * length / parts)])

const threads = RpcClient.layerProtocolWorker({ size: 4 }).pipe(
  Layer.provide(NodeWorker.layer(() => new WorkerThreads.Worker(fixture, { execArgv: [] })))
)

const childProcess = RpcClient.layerProtocolWorker({ size: 1 }).pipe(
  Layer.provide(NodeWorker.layer(() => ChildProcess.fork(fileURLToPath(fixture), { execArgv: [] })))
)

describe("SharedMemory on Node workers", () => {
  it.live("worker threads write into the caller's shared array", () =>
    Effect.gen(function*() {
      const client = yield* RpcClient.make(Compute)
      const data = SharedMemory.make(Int32Array, 100_000)
      yield* Effect.forEach(ranges(data.length, 4), ([from, to]) => client.Fill({ data, from, to }), {
        concurrency: "unbounded"
      })
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== i * 2) assert.fail(`data[${i}] = ${data[i]}`)
      }
    }).pipe(Effect.scoped, Effect.provide(threads)), { timeout: 30_000 })

  it.live("worker threads read a shared copy", () =>
    Effect.gen(function*() {
      const client = yield* RpcClient.make(Compute)
      const data = SharedMemory.share(Float64Array.from({ length: 10_000 }, (_, i) => i))
      const sums = yield* Effect.forEach(ranges(data.length, 4), ([from, to]) => client.Sum({ data, from, to }), {
        concurrency: "unbounded"
      })
      assert.strictEqual(sums.reduce((a, b) => a + b, 0), (10_000 * 9_999) / 2)
    }).pipe(Effect.scoped, Effect.provide(threads)), { timeout: 30_000 })

  it.live("a child process rejects a shared array instead of copying it", () =>
    Effect.gen(function*() {
      const client = yield* RpcClient.make(Compute)
      const data = SharedMemory.make(Int32Array, 4)
      const exit = yield* Effect.exit(client.Fill({ data, from: 0, to: 4 }))
      assert.isTrue(Exit.isFailure(exit) && String(exit.cause).includes("Expected Int32Array in shared memory"))
      assert.deepStrictEqual(Array.from(data), [0, 0, 0, 0])
    }).pipe(Effect.scoped, Effect.provide(childProcess)), { timeout: 30_000 })
})
