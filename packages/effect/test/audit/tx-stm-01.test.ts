import { assert, it } from "@effect/vitest"
import { Effect, Exit, Fiber, TxSemaphore } from "effect"

// TxSemaphore.ts:548 (withPermit) runs the blocking `acquire` inside
// acquireUseRelease's uninterruptible acquisition. The JSDoc promises permits are
// released "even if the effect fails or is interrupted"; the manual `acquire` is
// interruptible under the same contention, and Semaphore.withPermits restores
// interruption while waiting. A waiter that owns no permit must be interruptible.
it.effect("withPermit waiter can be interrupted while waiting for a permit", () =>
  Effect.gen(function*() {
    const semaphore = yield* TxSemaphore.make(1)
    yield* TxSemaphore.acquire(semaphore)

    const waiter = yield* Effect.forkChild(TxSemaphore.withPermit(semaphore, Effect.void), { startImmediately: true })
    const interruptor = yield* Effect.forkChild(Fiber.interrupt(waiter), { startImmediately: true })
    yield* Effect.yieldNow
    yield* Effect.yieldNow

    const interrupted = interruptor.pollUnsafe() !== undefined
    // unblock both fibers so the test terminates either way
    yield* TxSemaphore.release(semaphore)
    yield* Fiber.join(interruptor)

    assert.isTrue(interrupted, "Fiber.interrupt should complete while the permit is still held")
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(waiter)))
  }))
