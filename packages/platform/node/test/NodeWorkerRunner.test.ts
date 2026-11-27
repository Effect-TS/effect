import * as NodeWorker from "@effect/platform-node/NodeWorker"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import * as Worker from "effect/workers/Worker"
import { Worker as NativeWorker } from "node:worker_threads"

const fixture = new URL("./fixtures/worker-runner.ts", import.meta.url)
const unresponsive = `require("node:worker_threads").parentPort.postMessage([0]); setInterval(() => {}, 1000)`

describe("NodeWorkerRunner", () => {
  it.live("sendUnsafe preserves reply payloads", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const replies = yield* Queue.unbounded<unknown>()
        const ready = yield* Deferred.make<void>()
        const native = new NativeWorker(fixture, { execArgv: [] })
        const worker = yield* Worker.WorkerPlatform.use((platform) => platform.spawn<unknown, void>(0)).pipe(
          Effect.provide(NodeWorker.layer(() => native))
        )
        yield* worker.run((reply) => Queue.offer(replies, reply), {
          onSpawn: Deferred.succeed(ready, undefined)
        }).pipe(Effect.forkScoped)
        yield* Deferred.await(ready)

        yield* worker.send(undefined)

        assert.deepStrictEqual(yield* Queue.take(replies), { value: 42 })
      })
    ), { timeout: 20_000 })

  it.effect("terminates an unresponsive worker at CloseTimeout", () =>
    Effect.gen(function*() {
      const native = new NativeWorker(unresponsive, { eval: true })
      yield* Effect.addFinalizer(() => Effect.promise(() => native.terminate()))
      let terminated = 0
      const terminate = native.terminate.bind(native)
      native.terminate = () => {
        terminated++
        return terminate()
      }
      const scope = yield* Scope.make()
      const ready = yield* Deferred.make<void>()
      yield* Worker.WorkerPlatform.use((platform) => platform.spawn(0)).pipe(
        Effect.flatMap((worker) => worker.run(() => Effect.void, { onSpawn: Deferred.succeed(ready, undefined) })),
        Effect.provide(NodeWorker.layer(() => native)),
        Effect.provideService(Worker.CloseTimeout, Duration.seconds(1)),
        Effect.forkIn(scope)
      )
      yield* Deferred.await(ready)

      const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* TestClock.adjust(Duration.millis(999))
      assert.strictEqual(terminated, 0)
      yield* TestClock.adjust(Duration.millis(1))
      yield* Fiber.join(closing)
      assert.strictEqual(terminated, 1)
    }))
})
