import { afterEach, assert, describe, it, vi } from "@effect/vitest"
import { Cause, Context, Deferred, Effect, Exit, Fiber, Latch, Metric, References } from "effect"

describe("Fiber", () => {
  it("is a fiber", async () => {
    const result = Effect.runFork(Effect.succeed(1))
    assert.isTrue(Fiber.isFiber(result))
  })

  it("notifies all observers when an observer cancels during exit", () => {
    const fiber = Effect.runFork(Effect.never)
    const observed: Array<number> = []
    let cancel = () => {}
    cancel = fiber.addObserver(() => {
      observed.push(1)
      cancel()
    })
    fiber.addObserver(() => {
      observed.push(2)
    })

    fiber.interruptUnsafe()

    assert.deepStrictEqual(observed, [1, 2])
  })

  describe("a throwing exit callback", () => {
    const reported: Array<unknown> = []
    const collectReports = () => {
      reported.length = 0
      vi.stubGlobal("queueMicrotask", (task: () => void) => {
        try {
          task()
        } catch (error) {
          reported.push(error)
        }
      })
    }
    afterEach(() => {
      vi.unstubAllGlobals()
    })
    const observerError = new Error("observer")
    const throwing = () => {
      throw observerError
    }

    it("does not stop the other observers", () => {
      collectReports()
      const latch = Latch.makeUnsafe(false)
      const fiber = Effect.runFork(latch.await)
      const observed: Array<string> = []
      fiber.addObserver(throwing)
      fiber.addObserver((exit) => {
        observed.push(exit._tag)
      })
      const secondError = new Error("second observer")
      fiber.addObserver(() => {
        throw secondError
      })
      fiber.addObserver((exit) => {
        observed.push(exit._tag)
      })
      latch.openUnsafe()
      assert.deepStrictEqual(observed, ["Success", "Success"])
      assert.deepStrictEqual(reported, [observerError, secondError])
    })

    it("reports a throwing observer added after the fiber has exited", () => {
      collectReports()
      const fiber = Effect.runFork(Effect.succeed(1))
      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.succeed(1))
      assert.doesNotThrow(() => fiber.addObserver(throwing))
      assert.deepStrictEqual(reported, [observerError])
    })

    it("does not stop the completer resuming other waiters", () => {
      collectReports()
      const deferred = Deferred.makeUnsafe<void>()
      Effect.runCallback(Deferred.await(deferred), { onExit: throwing })
      const other = Effect.runFork(Deferred.await(deferred))
      const completer = Effect.runSyncExit(Deferred.succeed(deferred, undefined))
      assert.deepStrictEqual(completer, Exit.succeed(true))
      assert.deepStrictEqual(other.pollUnsafe(), Exit.void)
      assert.deepStrictEqual(reported, [observerError])
    })

    it("in runtime metrics does not stop the fiber ending", () => {
      collectReports()
      const metrics: Metric.FiberRuntimeMetricsService = {
        recordFiberStart: () => {},
        recordFiberEnd: throwing
      }
      const deferred = Deferred.makeUnsafe<void>()
      const waiter = Effect.runForkWith(Context.make(Metric.FiberRuntimeMetrics, metrics))(Deferred.await(deferred))
      const other = Effect.runFork(Deferred.await(deferred))
      const completer = Effect.runSyncExit(Deferred.succeed(deferred, undefined))
      assert.deepStrictEqual(completer, Exit.succeed(true))
      assert.deepStrictEqual(waiter.pollUnsafe(), Exit.void)
      assert.deepStrictEqual(other.pollUnsafe(), Exit.void)
      assert.deepStrictEqual(reported, [observerError])
    })
  })

  describe("joinAll", () => {
    it.effect("cleans up observers on interruption", () =>
      Effect.gen(function*() {
        const fiber = yield* Effect.forkChild(Effect.never)
        let cleaned = 0
        const tracked = new Proxy(fiber, {
          get(target, property, receiver) {
            if (property !== "addObserver") return Reflect.get(target, property, receiver)
            return (observer: Parameters<typeof target.addObserver>[0]) => {
              const cancel = target.addObserver(observer)
              return () => {
                cleaned++
                cancel()
              }
            }
          }
        })
        const joinFiber = yield* Fiber.joinAll([tracked]).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* Fiber.interrupt(joinFiber)
        assert.strictEqual(cleaned, 1)
      }))
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

  it.effect("retains distinct target and interruptor stack frames", () =>
    Effect.gen(function*() {
      const targetFrame: References.StackFrame = {
        name: "target-frame",
        stack: () => "at target-call-site.ts:1:1",
        parent: undefined
      }
      const interruptorFrame: References.StackFrame = {
        name: "interruptor-frame",
        stack: () => "at interruptor-call-site.ts:2:2",
        parent: undefined
      }
      const target = yield* Effect.never.pipe(
        Effect.provideService(References.CurrentStackFrame, targetFrame),
        Effect.forkChild({ startImmediately: true })
      )

      yield* Fiber.interrupt(target).pipe(
        Effect.provideService(References.CurrentStackFrame, interruptorFrame)
      )

      const exit = yield* Fiber.await(target)
      if (exit._tag !== "Failure") {
        return assert.fail("expected interrupted fiber to exit with failure")
      }
      const annotations = Cause.reasonAnnotations(exit.cause.reasons[0])
      assert.strictEqual(Context.getUnsafe(annotations, Cause.StackTrace), targetFrame)
      assert.strictEqual(Context.getUnsafe(annotations, Cause.InterruptorStackTrace), interruptorFrame)
      assert.isTrue(Cause.pretty(exit.cause).includes("interruptor-call-site.ts:2:2"))
    }))

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
})
