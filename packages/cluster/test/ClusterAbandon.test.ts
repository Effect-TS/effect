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
})
