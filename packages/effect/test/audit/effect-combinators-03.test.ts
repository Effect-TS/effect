import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, TxRef } from "effect"

// Effect.tx (src/Effect.ts:14634-14650) treats any failure while `state.retry` is set as a pure
// retry signal and discards the exit. Effect.onExit (Effect.ts:6958-6964) promises that cleanup
// failures are merged into the result, so a finalizer defect raised alongside Effect.txRetry must
// surface as the transaction's failure instead of being swallowed by a later successful attempt.
it.effect("txRetry does not discard a finalizer defect", () =>
  Effect.gen(function*() {
    const ref = TxRef.makeUnsafe(0)
    const fiber = yield* Effect.tx(Effect.gen(function*() {
      const n = yield* TxRef.get(ref)
      return n === 0 ? yield* Effect.txRetry.pipe(Effect.onExit(() => Effect.die("release-defect"))) : n
    })).pipe(Effect.forkChild({ startImmediately: true }))
    yield* Effect.tx(TxRef.set(ref, 1))
    const exit = yield* Fiber.await(fiber)
    assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause), `expected release-defect, got ${String(exit)}`)
  }))
