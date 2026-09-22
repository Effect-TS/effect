import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Option, Scheduler, Scope, TxSemaphore } from "effect"
import { TestClock } from "effect/testing"

describe("TxSemaphore", () => {
  describe("constructors", () => {
    it.effect("make creates semaphore with specified permits", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)
        const available = yield* TxSemaphore.available(semaphore)
        const capacity = yield* TxSemaphore.capacity(semaphore)

        assert.strictEqual(available, 5)
        assert.strictEqual(capacity, 5)
      })))

    it.effect("make with zero permits creates empty semaphore", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(0)
        const available = yield* TxSemaphore.available(semaphore)
        const capacity = yield* TxSemaphore.capacity(semaphore)

        assert.strictEqual(available, 0)
        assert.strictEqual(capacity, 0)
      })))

    it.effect("make with negative permits causes defect", () =>
      Effect.tx(Effect.gen(function*() {
        const result = yield* Effect.exit(TxSemaphore.make(-1))
        assert.isTrue(Exit.hasDies(result))
      })))
  })

  describe("basic operations", () => {
    it.effect("acquire and release work correctly", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(3)

        yield* TxSemaphore.acquire(semaphore)
        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 2)

        yield* TxSemaphore.release(semaphore)
        const availableAfter = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(availableAfter, 3)
      })))

    it.effect("acquireN and releaseN work correctly", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)

        yield* TxSemaphore.acquireN(semaphore, 3)
        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 2)

        yield* TxSemaphore.releaseN(semaphore, 2)
        const availableAfter = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(availableAfter, 4)
      })))

    it.effect("tryAcquire succeeds when permits available", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(2)

        const first = yield* TxSemaphore.tryAcquire(semaphore)
        assert.strictEqual(first, true)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 1)
      })))

    it.effect("tryAcquire fails when no permits available", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(1)

        // Acquire the only permit
        yield* TxSemaphore.acquire(semaphore)

        // Try to acquire when none available
        const result = yield* TxSemaphore.tryAcquire(semaphore)
        assert.strictEqual(result, false)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 0)
      })))

    it.effect("tryAcquireN succeeds when enough permits available", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)

        const result = yield* TxSemaphore.tryAcquireN(semaphore, 3)
        assert.strictEqual(result, true)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 2)
      })))

    it.effect("tryAcquireN fails when not enough permits available", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(2)

        const result = yield* TxSemaphore.tryAcquireN(semaphore, 3)
        assert.strictEqual(result, false)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 2)
      })))
  })

  describe("scoped operations", () => {
    it.effect("withPermit automatically manages permit lifecycle", () =>
      Effect.gen(function*() {
        const semaphore = yield* Effect.tx(TxSemaphore.make(2))

        const result = yield* TxSemaphore.withPermit(
          semaphore,
          Effect.gen(function*() {
            const available = yield* Effect.tx(TxSemaphore.available(semaphore))
            assert.strictEqual(available, 1) // One permit acquired
            return "success"
          })
        )

        assert.strictEqual(result, "success")

        // Permit should be released
        const finalAvailable = yield* Effect.tx(TxSemaphore.available(semaphore))
        assert.strictEqual(finalAvailable, 2)
      }))

    it.effect("withPermits automatically manages multiple permits", () =>
      Effect.gen(function*() {
        const semaphore = yield* Effect.tx(TxSemaphore.make(5))

        const result = yield* TxSemaphore.withPermits(
          semaphore,
          3,
          Effect.gen(function*() {
            const available = yield* Effect.tx(TxSemaphore.available(semaphore))
            assert.strictEqual(available, 2) // Three permits acquired
            return ["result1", "result2", "result3"]
          })
        )

        assert.deepStrictEqual(result, ["result1", "result2", "result3"])

        // All permits should be released
        const finalAvailable = yield* Effect.tx(TxSemaphore.available(semaphore))
        assert.strictEqual(finalAvailable, 5)
      }))

    it.effect("withPermitScoped works within scoped context", () =>
      Effect.gen(function*() {
        const semaphore = yield* Effect.tx(TxSemaphore.make(3))

        yield* Effect.scoped(
          Effect.gen(function*() {
            yield* TxSemaphore.withPermitScoped(semaphore)

            const available = yield* Effect.tx(TxSemaphore.available(semaphore))
            assert.strictEqual(available, 2) // One permit acquired for scope
          })
        )

        // Permit should be released when scope closes
        const finalAvailable = yield* Effect.tx(TxSemaphore.available(semaphore))
        assert.strictEqual(finalAvailable, 3)
      }))
  })

  describe("edge cases", () => {
    it.effect("acquireN with zero permits causes defect", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)
        const result = yield* Effect.exit(TxSemaphore.acquireN(semaphore, 0))
        assert.isTrue(Exit.hasDies(result))
      })))

    it.effect("acquireN with negative permits causes defect", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)
        const result = yield* Effect.exit(TxSemaphore.acquireN(semaphore, -1))
        assert.isTrue(Exit.hasDies(result))
      })))

    it.effect("releaseN with zero permits causes defect", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)
        const result = yield* Effect.exit(TxSemaphore.releaseN(semaphore, 0))
        assert.isTrue(Exit.hasDies(result))
      })))

    it.effect("releaseN with negative permits causes defect", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)
        const result = yield* Effect.exit(TxSemaphore.releaseN(semaphore, -1))
        assert.isTrue(Exit.hasDies(result))
      })))

    it.effect("release does not exceed capacity", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(3)

        // Release more permits than capacity
        yield* TxSemaphore.release(semaphore)
        yield* TxSemaphore.release(semaphore)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 3) // Should not exceed capacity
      })))

    it.effect("releaseN does not exceed capacity", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)

        // Release more permits than capacity
        yield* TxSemaphore.releaseN(semaphore, 10)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 5) // Should not exceed capacity
      })))
  })

  describe("type guards", () => {
    it.effect("isTxSemaphore correctly identifies TxSemaphore instances", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)
        const notSemaphore = { some: "object" }

        assert.isTrue(TxSemaphore.isTxSemaphore(semaphore))
        assert.isFalse(TxSemaphore.isTxSemaphore(notSemaphore))
        assert.isFalse(TxSemaphore.isTxSemaphore(null))
        assert.isFalse(TxSemaphore.isTxSemaphore(undefined))
        assert.isFalse(TxSemaphore.isTxSemaphore([5]))
      })))
  })

  describe("concurrency", () => {
    it.effect("withPermit bounds concurrent work and releases for the next waiter", () =>
      Effect.gen(function*() {
        const semaphore = yield* Effect.tx(TxSemaphore.make(3))

        const fiber1 = yield* Effect.forkChild(
          TxSemaphore.withPermit(semaphore, Effect.succeed(1))
        )

        const fiber2 = yield* Effect.forkChild(
          TxSemaphore.withPermit(semaphore, Effect.succeed(2))
        )

        const fiber3 = yield* Effect.forkChild(
          TxSemaphore.withPermit(semaphore, Effect.succeed(3))
        )

        const [result1, result2, result3] = yield* Effect.all([
          Fiber.join(fiber1),
          Fiber.join(fiber2),
          Fiber.join(fiber3)
        ])

        assert.strictEqual(result1, 1)
        assert.strictEqual(result2, 2)
        assert.strictEqual(result3, 3)

        // All permits should be released
        const finalAvailable = yield* Effect.tx(TxSemaphore.available(semaphore))
        assert.strictEqual(finalAvailable, 3)
      }))
  })

  describe("transactional behavior", () => {
    it.effect("operations are atomic within transactions", () =>
      Effect.tx(Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(5)

        yield* TxSemaphore.acquire(semaphore)
        yield* TxSemaphore.acquire(semaphore)
        yield* TxSemaphore.release(semaphore)

        const available = yield* TxSemaphore.available(semaphore)
        assert.strictEqual(available, 4) // Net effect: -1 permit
      })))
  })

  describe("interruption while waiting", () => {
    const settle = Effect.gen(function*() {
      for (let i = 0; i < 50; i++) yield* Effect.yieldNow
    })

    it.effect("interrupting a withPermit waiter completes, and leaks no permit", () =>
      Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(1)
        yield* TxSemaphore.acquire(semaphore)
        const waiter = yield* Effect.forkChild(TxSemaphore.withPermit(semaphore, Effect.void), {
          startImmediately: true
        })
        yield* settle
        const interrupter = yield* Effect.forkChild(Fiber.interrupt(waiter), { startImmediately: true })
        yield* settle
        assert.isDefined(interrupter.pollUnsafe(), "the interrupt completes while no permit is free")
        yield* TxSemaphore.release(semaphore)
        yield* settle
        assert.strictEqual(yield* TxSemaphore.available(semaphore), 1)
      }))

    it.effect("a timeout cancels a withPermits waiter", () =>
      Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(2)
        yield* TxSemaphore.acquireN(semaphore, 2)
        const fiber = yield* Effect.forkChild(
          Effect.timeoutOption(TxSemaphore.withPermits(semaphore, 2, Effect.void), "1 second"),
          { startImmediately: true }
        )
        yield* settle
        yield* TestClock.adjust("2 seconds")
        yield* settle
        assert.deepStrictEqual(fiber.pollUnsafe(), Exit.succeed(Option.none()))
        yield* TxSemaphore.releaseN(semaphore, 2)
        assert.strictEqual(yield* TxSemaphore.available(semaphore), 2)
      }))

    it.effect("interrupting a withPermitScoped waiter completes", () =>
      Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(1)
        yield* TxSemaphore.acquire(semaphore)
        const scope = yield* Scope.make()
        const waiter = yield* Effect.forkChild(
          Scope.provide(TxSemaphore.withPermitScoped(semaphore), scope),
          { startImmediately: true }
        )
        yield* settle
        const interrupter = yield* Effect.forkChild(Fiber.interrupt(waiter), { startImmediately: true })
        yield* settle
        assert.isDefined(interrupter.pollUnsafe())
        yield* Scope.close(scope, Exit.void)
        yield* TxSemaphore.release(semaphore)
        assert.strictEqual(yield* TxSemaphore.available(semaphore), 1)
      }))

    // A small op budget makes the fiber yield at each point between the
    // transaction that takes the permit and the release that returns it;
    // interrupting it there must return the permit. (With a budget below 3 a
    // fiber yields again before making progress.)
    it.effect("an interrupted withPermit returns a free permit at every yield", () =>
      Effect.gen(function*() {
        const failed: Array<number> = []
        for (let ops = 3; ops <= 64; ops++) {
          const semaphore = yield* TxSemaphore.make(1)
          const fiber = yield* Effect.forkChild(
            Effect.provideService(
              TxSemaphore.withPermit(semaphore, Effect.never),
              Scheduler.MaxOpsBeforeYield,
              ops
            ),
            { startImmediately: true }
          )
          yield* Fiber.interrupt(fiber)
          yield* settle
          if ((yield* TxSemaphore.available(semaphore)) !== 1) failed.push(ops)
        }
        assert.deepStrictEqual(failed, [])
      }))

    it.effect("withPermits rejects a non-positive count without running the effect", () =>
      Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(2)
        let ran = false
        const exit = yield* Effect.exit(
          TxSemaphore.withPermits(
            semaphore,
            0,
            Effect.sync(() => {
              ran = true
            })
          )
        )
        assert.isTrue(Exit.isFailure(exit))
        assert.isFalse(ran)
        assert.strictEqual(yield* TxSemaphore.available(semaphore), 2)
      }))

    it.effect("a waiter that is not interrupted still gets the permit", () =>
      Effect.gen(function*() {
        const semaphore = yield* TxSemaphore.make(1)
        yield* TxSemaphore.acquire(semaphore)
        const waiter = yield* Effect.forkChild(TxSemaphore.withPermit(semaphore, Effect.succeed(42)), {
          startImmediately: true
        })
        yield* settle
        assert.isUndefined(waiter.pollUnsafe())
        yield* TxSemaphore.release(semaphore)
        assert.strictEqual(yield* Fiber.join(waiter), 42)
        assert.strictEqual(yield* TxSemaphore.available(semaphore), 1)
      }))
  })
})
