import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, FiberId } from "effect"
import * as Abandon from "../src/internal/clusterAbandon.js"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"

describe("clusterAbandon", () => {
  it.effect("abandonment respects masking and interrupts when the mask is restored", () =>
    Effect.gen(function*() {
      const events: Array<string> = []
      const fiber = yield* Abandon.interrupt.pipe(
        Effect.andThen(Effect.sync(() => events.push("inside-mask"))),
        Effect.uninterruptible,
        Effect.andThen(Effect.yieldNow()),
        Effect.andThen(Effect.sync(() => events.push("outside-mask"))),
        Effect.fork
      )
      const exit = yield* Fiber.await(fiber)
      assert.deepStrictEqual(events, ["inside-mask"], "abandonment must remain pending until interruption is restored")
      assert(Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause))
      assert.isTrue(Abandon.isCause(exit.cause))
    }))
  it.effect("the storage shutdown marker survives composed causes and differs from ordinary interruption", () =>
    Effect.gen(function*() {
      const cause = yield* abandonmentCause
      assert.isTrue(Abandon.isCause(cause))
      assert.isTrue(Abandon.isCause(Cause.parallel(cause, Cause.interrupt(FiberId.none))))
      assert.isTrue(Abandon.isCause(Cause.sequential(Cause.die("defect"), cause)))
      assert.isFalse(Abandon.isCause(Cause.interrupt(FiberId.unsafeMake())))
      assert.isFalse(Abandon.isCause(Cause.fail("typed failure")))
    }).pipe(Effect.provide(MemoryLive)))

  for (const owner of ["none", "active", "inactive"] as const) {
    it.effect(`reSignal permits recovery only outside an active owner (owner=${owner})`, () =>
      Effect.gen(function*() {
        const cause = yield* abandonmentCause
        let recovered = false
        let continued = false
        const recovery = Effect.failCause(cause).pipe(
          Effect.onError(Abandon.reSignal),
          Effect.catchAllCause((cause) =>
            Effect.sync(() => {
              assert.isTrue(Abandon.isCause(cause))
              recovered = true
            })
          ),
          Effect.uninterruptible,
          Effect.andThen(Effect.yieldNow()),
          Effect.andThen(Effect.sync(() => {
            continued = true
            return "continued" as const
          }))
        )
        const caller = owner === "active" ?
          Abandon.withOwner(recovery)
          : owner === "inactive" ?
          Effect.gen(function*() {
            const context = yield* Abandon.withOwner(Effect.context<never>())
            return yield* recovery.pipe(Effect.provide(context))
          })
          : recovery
        const fiber = yield* Effect.fork(caller)
        const exit = yield* Fiber.await(fiber)
        assert.isTrue(recovered, "the masked caller must observe the relayed abandonment cause")
        if (owner === "active") {
          assert.isFalse(continued, "an active owner cannot continue after recovering abandonment")
          assert(Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause))
          assert.isTrue(Abandon.isCause(exit.cause))
        } else {
          assert.isTrue(continued, "a caller outside an active owner must continue after recovery")
          assert.deepStrictEqual(exit, Exit.succeed("continued"))
        }
      }).pipe(Effect.provide(MemoryLive)))
  }
})
