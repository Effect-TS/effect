import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Latch } from "effect"

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
})
