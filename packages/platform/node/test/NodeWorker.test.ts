import * as NodeWorker from "@effect/platform-node/NodeWorker"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import * as Worker from "effect/workers/Worker"
import { Worker as NativeWorker } from "node:worker_threads"

// Signals readiness, then ignores the close request and stays alive.
const unresponsive = `
const { parentPort } = require("node:worker_threads")
parentPort.postMessage([0])
setInterval(() => {}, 1000)
`

describe("NodeWorker", () => {
  it.effect("terminates a worker that does not close within CloseTimeout", () =>
    Effect.gen(function*() {
      const native = yield* Effect.acquireRelease(
        Effect.sync(() => new NativeWorker(unresponsive, { eval: true })),
        (worker) => Effect.promise(() => worker.terminate())
      )
      const exited = yield* Deferred.make<number>()
      native.on("exit", (code) => Deferred.doneUnsafe(exited, Exit.succeed(code)))
      const scope = yield* Scope.make()
      const ready = yield* Deferred.make<void>()
      const worker = yield* Worker.WorkerPlatform.use((platform) => platform.spawn(0)).pipe(
        Effect.provide(NodeWorker.layer(() => native)),
        Effect.provideService(Worker.CloseTimeout, Duration.seconds(1))
      )
      yield* worker.run(() => Effect.void, { onSpawn: Deferred.succeed(ready, undefined) }).pipe(
        Effect.forkIn(scope)
      )
      yield* Deferred.await(ready)

      const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* TestClock.adjust(Duration.millis(999))
      assert.isUndefined(closing.pollUnsafe())
      yield* TestClock.adjust(Duration.millis(1))
      yield* Fiber.join(closing)

      assert.strictEqual(yield* Deferred.await(exited), 1)
    }))
})
