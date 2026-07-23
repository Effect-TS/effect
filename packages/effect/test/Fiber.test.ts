import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Fiber, Latch, Metric, References, Scheduler, Tracer } from "effect"

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

  it("clears context-derived caches on completion", () => {
    const dispatcher: Scheduler.SchedulerDispatcher = {
      scheduleTask() {},
      flush() {}
    }
    const scheduler: Scheduler.Scheduler = {
      executionMode: "sync",
      shouldYield: () => false,
      makeDispatcher: () => dispatcher
    }
    const span = Tracer.externalSpan({
      spanId: "span",
      traceId: "trace"
    })
    const tracerContext: NonNullable<Tracer.Tracer["context"]> = (primitive, fiber) =>
      primitive["~effect/Effect/evaluate"](fiber)
    const tracer = Tracer.make({
      span: () => {
        throw new Error("unexpected span")
      },
      context: tracerContext
    })
    let ended = false
    let endedContext: Context.Context<never> | undefined
    const metrics: Metric.FiberRuntimeMetricsService = {
      recordFiberStart() {},
      recordFiberEnd(context) {
        ended = true
        endedContext = context
      }
    }
    const stackFrame: References.StackFrame = {
      name: "frame",
      stack: () => undefined,
      parent: undefined
    }
    const context = Context.empty().pipe(
      Context.add(Scheduler.Scheduler, scheduler),
      Context.add(Tracer.ParentSpan, span),
      Context.add(Tracer.Tracer, tracer),
      Context.add(Metric.FiberRuntimeMetrics, metrics),
      Context.add(References.CurrentStackFrame, stackFrame)
    )

    const fiber = Effect.runForkWith(context)(Effect.sync(() => {
      const current = Fiber.getCurrent()!
      assert.strictEqual(current.currentDispatcher, dispatcher)
      assert.strictEqual(current.currentScheduler, scheduler)
      assert.strictEqual(current.currentSpan, span)
      assert.strictEqual(current.currentStackFrame, stackFrame)
    })) as Fiber.Fiber<void> & {
      readonly _dispatcher: Scheduler.SchedulerDispatcher | undefined
      readonly currentTracerContext: Tracer.Tracer["context"]
      readonly runtimeMetrics: Metric.FiberRuntimeMetricsService | undefined
    }

    assert.isDefined(fiber.pollUnsafe())
    assert.isTrue(ended)
    assert.strictEqual(endedContext, context)
    assert.strictEqual(fiber.context, Context.empty())
    assert.strictEqual(fiber.currentScheduler, fiber.getRef(Scheduler.Scheduler))
    assert.notStrictEqual(fiber.currentScheduler, scheduler)
    assert.notStrictEqual(fiber.getRef(Tracer.Tracer), tracer)
    assert.isUndefined(fiber.getRef(Metric.FiberRuntimeMetrics))
    assert.isUndefined(fiber.getRef(References.CurrentStackFrame))
    assert.isUndefined(fiber.currentSpan)
    assert.isUndefined(fiber.currentStackFrame)
    assert.isUndefined(fiber._dispatcher)
    assert.isUndefined(fiber.currentTracerContext)
    assert.isUndefined(fiber.runtimeMetrics)
  })

  it("clears context-derived caches before running completion hooks", () => {
    const span = Tracer.externalSpan({
      spanId: "span",
      traceId: "trace"
    })
    const metrics: Metric.FiberRuntimeMetricsService = {
      recordFiberStart() {},
      recordFiberEnd() {
        completionHookRan = true
        throw new Error("completion hook failed")
      }
    }
    const context = Context.empty().pipe(
      Context.add(Tracer.ParentSpan, span),
      Context.add(Metric.FiberRuntimeMetrics, metrics)
    )
    let completionHookRan = false
    let fiber:
      | (Fiber.Fiber<void> & {
        readonly runtimeMetrics: Metric.FiberRuntimeMetricsService | undefined
      })
      | undefined

    try {
      Effect.runForkWith(context)(Effect.sync(() => {
        fiber = Fiber.getCurrent() as typeof fiber
      }))
    } catch {
      // Completion-hook failure handling is outside this teardown invariant.
    }

    assert.isTrue(completionHookRan)
    assert.isDefined(fiber)
    assert.isDefined(fiber.pollUnsafe())
    assert.strictEqual(fiber.context, Context.empty())
    assert.isUndefined(fiber.currentSpan)
    assert.isUndefined(fiber.runtimeMetrics)
  })
})
