import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Latch } from "effect"

const trackObserverCancellation = <A, E>(
  fiber: Fiber.Fiber<A, E>,
  onRegister?: () => void
) => {
  let registrations = 0
  let cancellations = 0
  const addObserver: Fiber.Fiber<A, E>["addObserver"] = (observer) => {
    onRegister?.()
    registrations++
    const cancel = fiber.addObserver(observer)
    return () => {
      cancellations++
      cancel()
    }
  }
  return {
    fiber: new Proxy(fiber, {
      get(target, property, receiver) {
        return property === "addObserver"
          ? addObserver
          : Reflect.get(target, property, receiver)
      }
    }),
    registrations: () => registrations,
    cancellations: () => cancellations
  }
}

const observerCount = (fiber: Fiber.Fiber<any, any>) =>
  (fiber as Fiber.Fiber<any, any> & { readonly _observers: ReadonlyArray<unknown> })._observers.length

describe("Fiber", () => {
  it("is a fiber", async () => {
    const result = Effect.runFork(Effect.succeed(1))
    assert.isTrue(Fiber.isFiber(result))
  })

  describe("interruptAll", () => {
    it.effect("awaits fibers passed as a one-shot iterable", () =>
      Effect.gen(function*() {
        let cleaned = false
        const latch = Latch.makeUnsafe()
        const fiber = yield* Effect.never.pipe(
          Effect.onInterrupt(() =>
            latch.whenOpen(Effect.sync(() => {
              cleaned = true
            }))
          ),
          Effect.forkChild({ startImmediately: true })
        )
        yield* Effect.forkChild(latch.open)
        yield* Fiber.interruptAll(
          (function*() {
            yield fiber
          })()
        )
        assert.isTrue(cleaned)
      }))
  })

  describe("interruptAllAs", () => {
    it.effect("awaits fibers passed as a one-shot iterable", () =>
      Effect.gen(function*() {
        const latch = Latch.makeUnsafe()
        let cleaned = false
        const fiber = yield* Effect.never.pipe(
          Effect.onInterrupt(() =>
            latch.whenOpen(Effect.sync(() => {
              cleaned = true
            }))
          ),
          Effect.forkChild({ startImmediately: true })
        )
        yield* Effect.forkChild(latch.open)
        yield* Fiber.interruptAllAs(
          (function*() {
            yield fiber
          })(),
          0
        )
        assert.isTrue(cleaned)
      }))
  })

  it.effect(
    "delivers a synchronous self-interrupt instead of completing to success",
    () =>
      Effect.gen(function*() {
        const child = yield* Effect.gen(function*() {
          const self = Fiber.getCurrent()!
          self.interruptUnsafe()
          return 42
        }).pipe(Effect.forkChild({ startImmediately: true }))

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
      })
  )

  it.effect("delivers a pending interrupt when interruptibleMask restores interruptibility", () =>
    Effect.gen(function*() {
      const masked = yield* Latch.make()
      const resume = yield* Latch.make()
      const events: Array<string> = []

      const child = yield* Effect.uninterruptible(
        Effect.gen(function*() {
          yield* masked.open
          yield* resume.await
          return yield* Effect.interruptibleMask(() => {
            events.push("interruptibleMask")
            return Effect.never
          })
        })
      ).pipe(Effect.forkChild({ startImmediately: true }))

      yield* masked.await
      events.push("masked")

      yield* Effect.sync(() => {
        child.interruptUnsafe(123)
        events.push("interrupted")
      })
      assert.isUndefined(child.pollUnsafe())

      yield* resume.open
      events.push("resumed")
      yield* Effect.yieldNow
      yield* Effect.yieldNow

      const exit = child.pollUnsafe()
      if (exit === undefined) {
        assert.fail("fiber did not exit after interruptibleMask restored interruptibility")
      }
      assert.isTrue(Exit.hasInterrupts(exit))
      if (exit._tag !== "Failure") {
        assert.fail("expected interrupted fiber to exit with failure")
      }
      assert.deepStrictEqual(Cause.interruptors(exit.cause), new Set([123]))
      assert.deepStrictEqual(events, ["masked", "interrupted", "resumed", "interruptibleMask"])
    }))

  it.effect("runs an async interrupt finalizer exactly once, in order", () =>
    Effect.gen(function*() {
      const events: Array<string> = []

      const child = yield* Effect.gen(function*() {
        const self = Fiber.getCurrent()!
        yield* Effect.suspend(() => {
          self.interruptUnsafe()
          events.push("acquired")
          return Effect.void
        }).pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              events.push("finalizer-start")
            }).pipe(
              Effect.tap(Effect.yieldNow),
              Effect.tap(Effect.sync(() => {
                events.push("finalizer-end")
              }))
            )
          )
        )
        events.push("unreachable")
      }).pipe(Effect.forkChild({ startImmediately: true }))

      const exit = yield* Fiber.await(child)
      events.push("awaited")
      assert.isTrue(Exit.hasInterrupts(exit))
      assert.deepStrictEqual(events, ["acquired", "finalizer-start", "finalizer-end", "awaited"])
    }))

  describe("joinAll", () => {
    it.effect("cleans up when interrupted before the first observer is registered", () =>
      Effect.gen(function*() {
        const target = yield* Effect.never.pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const observersBefore = observerCount(target)
        const tracked = trackObserverCancellation(target, () => {
          Fiber.getCurrent()!.interruptUnsafe()
        })

        const joiner = yield* Fiber.joinAll([tracked.fiber]).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const exit = yield* Fiber.await(joiner)

        assert.isTrue(Exit.hasInterrupts(exit))
        assert.strictEqual(tracked.registrations(), 1)
        assert.strictEqual(tracked.cancellations(), 1)
        assert.strictEqual(observerCount(target), observersBefore)
      }))

    it.effect("cleans up synchronous registrations when interrupted during setup", () =>
      Effect.gen(function*() {
        const targets = yield* Effect.forEach([1, 2, 3], (value) =>
          Effect.succeed(value).pipe(Effect.forkChild({ startImmediately: true })))
        const tracked = targets.map((fiber, index) =>
          trackObserverCancellation(
            fiber,
            index === 0
              ? () =>
                Fiber.getCurrent()!.interruptUnsafe()
              : undefined
          )
        )

        const joiner = yield* Fiber.joinAll(tracked.map((entry) => entry.fiber)).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const exit = yield* Fiber.await(joiner)

        assert.isTrue(Exit.hasInterrupts(exit))
        assert.deepStrictEqual(tracked.map((entry) => entry.registrations()), [1, 1, 1])
        assert.deepStrictEqual(tracked.map((entry) => entry.cancellations()), [1, 1, 1])
      }))

    it.effect("cleans up one observer when the joiner is interrupted", () =>
      Effect.gen(function*() {
        const target = yield* Effect.never.pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const observersBefore = observerCount(target)
        const tracked = trackObserverCancellation(target)
        const joiner = yield* Fiber.joinAll([tracked.fiber]).pipe(
          Effect.forkChild({ startImmediately: true })
        )

        assert.strictEqual(observerCount(target), observersBefore + 1)
        yield* Fiber.interrupt(joiner)

        assert.strictEqual(tracked.registrations(), 1)
        assert.strictEqual(tracked.cancellations(), 1)
        assert.strictEqual(observerCount(target), observersBefore)
      }))

    it.effect("cleans up idempotently when a target is interrupted", () =>
      Effect.gen(function*() {
        const target = yield* Effect.never.pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const tracked = trackObserverCancellation(target)
        const joiner = yield* Fiber.joinAll([tracked.fiber]).pipe(
          Effect.forkChild({ startImmediately: true })
        )

        target.interruptUnsafe()
        const exit = yield* Fiber.await(joiner)

        assert.isTrue(Exit.hasInterrupts(exit))
        assert.strictEqual(tracked.registrations(), 1)
        assert.strictEqual(tracked.cancellations(), 1)
        assert.strictEqual(observerCount(target), 0)
      }))

    it.effect("cleans up many observers when interrupted", () =>
      Effect.gen(function*() {
        const targets = yield* Effect.forEach([0, 1, 2], () =>
          Effect.never.pipe(Effect.forkChild({ startImmediately: true })))
        const observersBefore = targets.map(observerCount)
        const tracked = targets.map((fiber) =>
          trackObserverCancellation(fiber)
        )
        const joiner = yield* Fiber.joinAll(tracked.map((entry) => entry.fiber)).pipe(
          Effect.forkChild({ startImmediately: true })
        )

        assert.deepStrictEqual(targets.map(observerCount), observersBefore.map((count) => count + 1))
        yield* Fiber.interrupt(joiner)

        assert.deepStrictEqual(tracked.map((entry) => entry.registrations()), [1, 1, 1])
        assert.deepStrictEqual(tracked.map((entry) => entry.cancellations()), [1, 1, 1])
        assert.deepStrictEqual(targets.map(observerCount), observersBefore)
      }))

    it.effect("cleans up synchronous and asynchronous target registrations", () =>
      Effect.gen(function*() {
        const syncLeft = yield* Effect.succeed(1).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const asyncTarget = yield* Effect.never.pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const syncRight = yield* Effect.succeed(3).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const observersBefore = observerCount(asyncTarget)
        const tracked = [syncLeft, asyncTarget, syncRight].map((fiber) => trackObserverCancellation(fiber))
        const joiner = yield* Fiber.joinAll(tracked.map((entry) => entry.fiber)).pipe(
          Effect.forkChild({ startImmediately: true })
        )

        assert.strictEqual(observerCount(asyncTarget), observersBefore + 1)
        yield* Fiber.interrupt(joiner)

        assert.deepStrictEqual(tracked.map((entry) => entry.registrations()), [1, 1, 1])
        assert.deepStrictEqual(tracked.map((entry) => entry.cancellations()), [1, 1, 1])
        assert.strictEqual(observerCount(asyncTarget), observersBefore)
      }))

    it.effect("cleans up cancellation returned during partial registration", () =>
      Effect.gen(function*() {
        const pending = yield* Effect.never.pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const failed = yield* Effect.fail("boom").pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const unvisited = yield* Effect.never.pipe(
          Effect.forkChild({ startImmediately: true })
        )
        const trackedPending = trackObserverCancellation(pending)
        const trackedFailed = trackObserverCancellation(failed)
        const trackedUnvisited = trackObserverCancellation(unvisited)
        const observersBefore = observerCount(pending)

        const joiner = yield* Fiber.joinAll([
          trackedPending.fiber,
          trackedFailed.fiber,
          trackedUnvisited.fiber
        ]).pipe(Effect.forkChild({ startImmediately: true }))
        const exit = yield* Fiber.await(joiner)

        assert.isTrue(Exit.isFailure(exit))
        assert.strictEqual(trackedPending.cancellations(), 1)
        assert.strictEqual(trackedFailed.cancellations(), 1)
        assert.strictEqual(trackedUnvisited.registrations(), 0)
        assert.strictEqual(observerCount(pending), observersBefore)
      }))
  })
})
