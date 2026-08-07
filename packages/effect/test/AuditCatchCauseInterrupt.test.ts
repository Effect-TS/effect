import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber } from "effect"

describe("EFFECT-AUD-C0001", () => {
  // Observed: catchCause does NOT receive interruption when fiber is interruptible
  // (the exitFailCause while loop skips contE handlers on interruptible interrupted fibers)
  it.effect("catchCause is NOT called on interruption (reproducing the claim)", () =>
    Effect.gen(function*() {
      let catchFired = false

      const fiber = yield* Effect.never.pipe(
        Effect.catchCause(() =>
          Effect.sync(() => {
            catchFired = true
          })
        ),
        Effect.forkChild({ startImmediately: true })
      )

      yield* Fiber.interrupt(fiber)
      const exit = yield* Fiber.await(fiber)
      assert.isFalse(catchFired)
      assert.isTrue(Exit.hasInterrupts(exit))
    }))

  // Control: catchCause DOES receive typed errors
  it.effect("catchCause is called on typed failure", () =>
    Effect.gen(function*() {
      let catchFired = false
      let received: Cause.Cause<string> | undefined

      const fiber = yield* Effect.fail("boom").pipe(
        Effect.catchCause((cause) =>
          Effect.sync(() => {
            catchFired = true
            received = cause as Cause.Cause<string>
          })
        ),
        Effect.forkChild({ startImmediately: true })
      )

      yield* Fiber.await(fiber)
      assert.isTrue(catchFired)
      assert.isTrue(Cause.hasFails(received!))
    }))

  // Existing behavior test: catch + ensuring + interrupt
  it.effect("existing test: catch + ensuring + interrupt", () =>
    Effect.gen(function*() {
      let catchFailure = false
      let ensuring = false
      const handle = yield* Effect.never.pipe(
        Effect.catchCause((_) =>
          Effect.sync(() => {
            catchFailure = true
          })
        ),
        Effect.ensuring(Effect.sync(() => {
          ensuring = true
        })),
        Effect.forkChild({ startImmediately: true })
      )
      yield* Fiber.interrupt(handle)
      assert.isFalse(catchFailure)
      assert.isTrue(ensuring)
    }))
})
