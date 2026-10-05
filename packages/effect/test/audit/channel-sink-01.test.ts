import { assert, describe, it } from "@effect/vitest"
import { Channel, Deferred, Effect, Exit, Fiber } from "effect"

describe("Channel", () => {
  // Channel.acquireUseRelease (packages/effect/src/Channel.ts:556) guarantees `release` runs when the
  // channel is interrupted, and acquisition is uninterruptible. An interrupt that arrives during
  // acquisition must therefore still release the successfully acquired resource.
  it.effect("acquireUseRelease releases resource when interrupted during acquisition", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const gate = yield* Deferred.make<void>()
      let released = false
      const acquire = Effect.gen(function*() {
        yield* Deferred.succeed(started, undefined)
        yield* Deferred.await(gate)
        return 1
      })
      const fiber = yield* Effect.forkChild(Channel.runDrain(Channel.acquireUseRelease(
        acquire,
        () => Channel.never,
        () =>
          Effect.sync(() => {
            released = true
          })
      )))
      yield* Deferred.await(started)
      yield* Effect.forkChild(Fiber.interrupt(fiber), { startImmediately: true })
      yield* Deferred.succeed(gate, undefined)
      const exit = yield* Fiber.await(fiber)
      assert.isTrue(Exit.hasInterrupts(exit))
      assert.isTrue(released)
    }))
})
