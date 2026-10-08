import * as BunWorkerRunner from "@effect/platform-bun/BunWorkerRunner"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as WorkerRunner from "effect/workers/WorkerRunner"
import { afterEach, vi } from "vitest"

describe("BunWorkerRunner", () => {
  afterEach(() => vi.unstubAllGlobals())

  it.effect("runs finalizers on shutdown when self.close is unavailable", () =>
    Effect.gen(function*() {
      const listeners = new Map<string, EventListener>()
      // Bun exposes the worker global, not a MessagePort with a close method.
      vi.stubGlobal("self", {
        postMessage() {},
        addEventListener(type: string, listener: EventListener) {
          listeners.set(type, listener)
        },
        removeEventListener(type: string) {
          listeners.delete(type)
        }
      })

      const platform = yield* WorkerRunner.WorkerRunnerPlatform
      const runner = yield* platform.start()
      let finalized = false
      const fiber = yield* Effect.forkChild(
        runner.run<void, never, never>(() => {}).pipe(
          Effect.ensuring(Effect.sync(() => {
            finalized = true
          }))
        )
      )
      yield* Effect.yieldNow

      const onMessage = listeners.get("message")
      assert.isDefined(onMessage)
      onMessage({ data: [1] } as MessageEvent)
      yield* Fiber.join(fiber)

      assert.isTrue(finalized)
      assert.strictEqual(listeners.size, 0)
    }).pipe(Effect.provide(BunWorkerRunner.layer)))
})
