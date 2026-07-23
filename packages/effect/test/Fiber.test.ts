import { assert, describe, it } from "@effect/vitest"
import { Effect, ErrorReporter, Exit, Fiber, Latch, Metric } from "effect"

const forkYielded = <A, E, R>(self: Effect.Effect<A, E, R>) =>
  Effect.andThen(Effect.yieldNow, self).pipe(
    Effect.forkDetach({ startImmediately: true })
  )

const assertCompletionStateCleared = <A, E>(fiber: Fiber.Fiber<A, E>) => {
  const state = fiber as Fiber.Fiber<A, E> & {
    readonly _observers: ReadonlyArray<unknown>
    readonly _stack: ReadonlyArray<unknown>
    readonly _children: ReadonlySet<unknown> | undefined
  }
  assert.strictEqual(state._observers.length, 0)
  assert.strictEqual(state._stack.length, 0)
  assert.isUndefined(state._children)
  assert.strictEqual(fiber.context.mapUnsafe.size, 0)
}

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

  describe("completion observers", () => {
    it.effect("notifies all detached observers when one cancels itself", () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(Effect.succeed(1))
        let cancelSelf: () => void = () => {}
        cancelSelf = fiber.addObserver(() => {
          events.push("self")
          cancelSelf()
        })
        fiber.addObserver(() => events.push("later"))

        yield* Fiber.await(fiber)

        assert.deepStrictEqual(events, ["self", "later"])
      }))

    it.effect("notifies all detached observers when one cancels an earlier observer", () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(Effect.succeed(1))
        const cancelEarlier = fiber.addObserver(() => events.push("earlier"))
        fiber.addObserver(() => {
          events.push("cancelling")
          cancelEarlier()
        })
        fiber.addObserver(() => events.push("later"))

        yield* Fiber.await(fiber)

        assert.deepStrictEqual(events, ["earlier", "cancelling", "later"])
      }))

    it.effect("notifies all detached observers when one cancels a later observer", () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(Effect.succeed(1))
        let cancelLater: () => void = () => {}
        fiber.addObserver(() => {
          events.push("cancelling")
          cancelLater()
        })
        fiber.addObserver(() => events.push("middle"))
        cancelLater = fiber.addObserver(() => events.push("later"))

        yield* Fiber.await(fiber)

        assert.deepStrictEqual(events, ["cancelling", "middle", "later"])
      }))

    it.effect("does not strand await behind a failing joinAll observer", () =>
      Effect.gen(function*() {
        const target = yield* forkYielded(Effect.fail("boom"))
        const joiner = yield* Fiber.joinAll([target]).pipe(
          Effect.forkDetach({ startImmediately: true })
        )
        const waiter = yield* Fiber.await(target).pipe(
          Effect.forkDetach({ startImmediately: true })
        )

        const joinExit = yield* Fiber.await(joiner)
        const awaitExit = yield* Fiber.await(waiter)

        assert.isTrue(Exit.isFailure(joinExit))
        assert.deepStrictEqual(awaitExit, Exit.succeed(Exit.fail("boom")))
      }))

    it.effect("notifies later observers and tears down when the first observer throws", () => {
      const reported: Array<string> = []
      const reporter = ErrorReporter.make(({ error, fiber }) => {
        reported.push(error.message)
        assert.strictEqual(fiber.context.mapUnsafe.size, 0)
      })

      return Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(
          Effect.forkChild(Effect.never).pipe(Effect.as(1))
        )
        fiber.addObserver(() => {
          events.push("first")
          throw new Error("first observer")
        })
        fiber.addObserver(() => events.push("later"))

        const exit = yield* Fiber.await(fiber)
        yield* Effect.yieldNow

        assert.deepStrictEqual(exit, Exit.succeed(1))
        assert.deepStrictEqual(events, ["first", "later"])
        assert.deepStrictEqual(reported, ["first observer"])
        assertCompletionStateCleared(fiber)
      }).pipe(
        Effect.provideService(ErrorReporter.CurrentErrorReporters, new Set([reporter]))
      )
    })

    it.effect("notifies later observers when a middle observer throws", () => {
      const reported: Array<string> = []
      const reporter = ErrorReporter.make(({ error }) => {
        reported.push(error.message)
      })

      return Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(Effect.succeed(1))
        fiber.addObserver(() => events.push("first"))
        fiber.addObserver(() => {
          events.push("middle")
          throw new Error("middle observer")
        })
        fiber.addObserver(() => events.push("last"))

        yield* Fiber.await(fiber)
        yield* Effect.yieldNow

        assert.deepStrictEqual(events, ["first", "middle", "last"])
        assert.deepStrictEqual(reported, ["middle observer"])
      }).pipe(
        Effect.provideService(ErrorReporter.CurrentErrorReporters, new Set([reporter]))
      )
    })

    it.effect("notifies observers and tears down when the metric end hook throws", () => {
      const reported: Array<string> = []
      const throwingReporter = ErrorReporter.make(() => {
        throw new Error("reporter failure")
      })
      const reporter = ErrorReporter.make(({ error }) => {
        reported.push(error.message)
      })
      const metrics: Metric.FiberRuntimeMetricsService = {
        recordFiberStart: () => {},
        recordFiberEnd: () => {
          throw new Error("metric end")
        }
      }

      return Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(Effect.succeed(1))
        fiber.addObserver(() => events.push("observer"))

        const exit = yield* Fiber.await(fiber)
        yield* Effect.yieldNow

        assert.deepStrictEqual(exit, Exit.succeed(1))
        assert.deepStrictEqual(events, ["observer"])
        assert.deepStrictEqual(reported, ["metric end"])
        assertCompletionStateCleared(fiber)
      }).pipe(
        Effect.provideService(Metric.FiberRuntimeMetrics, metrics),
        Effect.provideService(
          ErrorReporter.CurrentErrorReporters,
          new Set([throwingReporter, reporter])
        )
      )
    })

    it.effect("invokes an observer added during completion synchronously", () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const fiber = yield* forkYielded(Effect.succeed(1))
        fiber.addObserver((exit) => {
          events.push("outer start")
          fiber.addObserver((reentrantExit) => {
            assert.strictEqual(reentrantExit, exit)
            events.push("reentrant")
          })
          events.push("outer end")
        })
        fiber.addObserver(() => events.push("later"))

        yield* Fiber.await(fiber)

        assert.deepStrictEqual(events, ["outer start", "reentrant", "outer end", "later"])
      }))
  })
})
