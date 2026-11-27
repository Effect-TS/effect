import * as BunWorker from "@effect/platform-bun/BunWorker"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import * as Worker from "effect/workers/Worker"

// Signals readiness, then ignores the close request and stays alive.
const unresponsive = URL.createObjectURL(
  new Blob([`postMessage([0]); setInterval(() => {}, 1000)`], { type: "application/javascript" })
)

describe("BunWorker", () => {
  it.effect("terminates a worker that does not close within CloseTimeout", () =>
    Effect.gen(function*() {
      const native = yield* Effect.acquireRelease(
        Effect.sync(() => new globalThis.Worker(unresponsive)),
        (worker) => Effect.sync(() => worker.terminate())
      )
      const closed = yield* Deferred.make<void>()
      native.addEventListener("close", () => Deferred.doneUnsafe(closed, Exit.void))
      const scope = yield* Scope.make()
      const ready = yield* Deferred.make<void>()
      yield* Worker.WorkerPlatform.use((platform) => platform.spawn(0)).pipe(
        Effect.flatMap((worker) => worker.run(() => Effect.void, { onSpawn: Deferred.succeed(ready, undefined) })),
        Effect.provide(BunWorker.layer(() => native)),
        Effect.provideService(Worker.CloseTimeout, Duration.seconds(1)),
        Effect.forkIn(scope)
      )
      yield* Deferred.await(ready)

      const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void))
      yield* TestClock.adjust(Duration.millis(999))
      assert.isUndefined(closing.pollUnsafe())
      yield* TestClock.adjust(Duration.millis(1))
      yield* Fiber.join(closing)

      yield* Deferred.await(closed)
    }))
})
