import * as NodeWorker from "@effect/platform-node/NodeWorker"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as Worker from "effect/unstable/workers/Worker"
import { fork } from "node:child_process"
import { Worker as NativeWorker } from "node:worker_threads"
import type { Request } from "./fixtures/worker-runner.ts"

type Transport = "thread" | "child"

const fixture = new URL("./fixtures/worker-runner.ts", import.meta.url)
const expectedObject = { value: 42, nested: ["node", 7] }
const deadline = 10_000

const start = (transport: Transport) =>
  Effect.gen(function*() {
    const replies = yield* Queue.unbounded<unknown>()
    const ready = yield* Deferred.make<void>()
    const exited = yield* Deferred.make<{ code: number | null; signal: string | null }>()
    const nativeMessages: Array<unknown> = []
    const applicationMessages: Array<unknown> = []
    let hasExited = false
    const native = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const native = transport === "thread"
          ? new NativeWorker(fixture, { execArgv: [] })
          : fork(fixture, {
            execPath: process.execPath,
            execArgv: [],
            stdio: ["ignore", "inherit", "inherit", "ipc"]
          })
        native.on("message", (message: unknown) => nativeMessages.push(message))
        native.once("exit", (code, signal) => {
          hasExited = true
          Deferred.doneUnsafe(exited, Exit.succeed({ code, signal: signal ?? null }))
        })
        return native
      }),
      (native) =>
        Effect.gen(function*() {
          if (hasExited) return
          if ("postMessage" in native) {
            yield* Effect.promise(() => native.terminate())
          } else {
            native.kill("SIGKILL")
          }
          yield* Deferred.await(exited).pipe(Effect.timeout(deadline), Effect.orDie)
        })
    )
    const worker = yield* Worker.WorkerPlatform.use((platform) => platform.spawn<unknown, Request>(0)).pipe(
      Effect.provide(NodeWorker.layer(() => native))
    )
    // Readiness is the public onSpawn barrier, not a timing assumption.
    const fiber = yield* worker.run((message) =>
      Effect.sync(() => {
        applicationMessages.push(message)
        Queue.offerUnsafe(replies, message)
      }), { onSpawn: Deferred.succeed(ready, undefined) }).pipe(
        Effect.forkScoped
      )
    yield* Deferred.await(ready).pipe(Effect.timeout(deadline))
    assert.deepStrictEqual(nativeMessages, [[0]])
    assert.deepStrictEqual(applicationMessages, [])
    const close = Effect.gen(function*() {
      yield* Fiber.interrupt(fiber)
      const exit = yield* Deferred.await(exited).pipe(Effect.timeout(deadline))
      assert.deepStrictEqual(exit, { code: 0, signal: null })
    })
    return { worker, replies, close }
  })

describe("NodeWorkerRunner", () => {
  for (const transport of ["thread", "child"] as const) {
    it.live(
      `${transport}: readiness is not application data; scope close removes listeners`,
      () =>
        Effect.gen(function*() {
          const { close } = yield* start(transport)
          yield* close
        }),
      { timeout: 20_000 }
    )

    it.live(`${transport}: send preserves an ordinary object`, () =>
      Effect.gen(function*() {
        const { close, replies, worker } = yield* start(transport)
        yield* worker.send({ kind: "object", mode: "safe" })
        const actual = yield* Queue.take(replies).pipe(Effect.timeout(deadline))
        assert.deepStrictEqual(actual, expectedObject)
        yield* close
      }), { timeout: 20_000 })

    it.live(`${transport}: sendUnsafe preserves the same ordinary object as send`, () =>
      Effect.gen(function*() {
        const { close, replies, worker } = yield* start(transport)
        yield* worker.send({ kind: "object", mode: "safe" })
        const safe = yield* Queue.take(replies).pipe(Effect.timeout(deadline))
        yield* worker.send({ kind: "object", mode: "unsafe" })
        const unsafe = yield* Queue.take(replies).pipe(Effect.timeout(deadline))
        console.log(JSON.stringify({ transport, safe, unsafe: unsafe === undefined ? "undefined" : unsafe }))
        assert.deepStrictEqual(safe, expectedObject)
        assert.deepStrictEqual(unsafe, safe)
        yield* close
      }), { timeout: 20_000 })
  }

  // Child IPC does not have the worker-thread transfer-list contract.
  for (const mode of ["safe", "unsafe"] as const) {
    it.live(
      `thread: ${mode} preserves transferred bytes and detaches the fresh source buffer`,
      () =>
        Effect.gen(function*() {
          const { close, replies, worker } = yield* start("thread")
          yield* worker.send({ kind: "transfer", mode })
          const actual = yield* Queue.take(replies).pipe(Effect.timeout(deadline))
          const detached = yield* Queue.take(replies).pipe(Effect.timeout(deadline))
          console.log(JSON.stringify({ mode, actual: actual === undefined ? "undefined" : actual, detached }))
          assert.deepStrictEqual(detached, { byteLength: 0 })
          assert.deepStrictEqual(actual, { bytes: new Uint8Array([7, 8, 9]) })
          yield* close
        }),
      { timeout: 20_000 }
    )
  }
})
