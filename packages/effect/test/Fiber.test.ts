import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Latch, Scope } from "effect"

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
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.gen(function*() {
          const self = Fiber.getCurrent()!
          Fiber.runIn(self, closedScope)
          return 42
        }).pipe(Effect.forkChild({ startImmediately: true }))

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
      })
  )

  describe("synchronous self-interrupt mid-runLoop", () => {
    it.live("runs an async interrupt finalizer exactly once, in order", () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.gen(function*() {
          const self = Fiber.getCurrent()!
          yield* Effect.sync(() => {
            Fiber.runIn(self, closedScope)
            events.push("acquired")
          }).pipe(
            Effect.onInterrupt(() =>
              Effect.sync(() => {
                events.push("finalizer-start")
              }).pipe(
                Effect.andThen(Effect.sleep(10)),
                Effect.andThen(Effect.sync(() => {
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

    it.effect("aborts an interruptible acquisition without running release", () =>
      Effect.gen(function*() {
        let released = false
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.gen(function*() {
          const self = Fiber.getCurrent()!
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              Fiber.runIn(self, closedScope)
              return "resource"
            }),
            () =>
              Effect.sync(() => {
                released = true
              }),
            { interruptible: true }
          )
        }).pipe(Effect.scoped, Effect.forkChild({ startImmediately: true }))

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
        assert.isFalse(released)
      }))

    it.effect("runs release for an uninterruptible acquisition", () =>
      Effect.gen(function*() {
        let released = false
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.gen(function*() {
          const self = Fiber.getCurrent()!
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              Fiber.runIn(self, closedScope)
              return "resource"
            }),
            () =>
              Effect.sync(() => {
                released = true
              })
          )
        }).pipe(Effect.scoped, Effect.forkChild({ startImmediately: true }))

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
        assert.isTrue(released)
      }))

    it.effect("does not enter an uninterruptible region begun after the interrupt", () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.suspend(() => {
          Fiber.runIn(Fiber.getCurrent()!, closedScope)
          return Effect.uninterruptible(
            Effect.sync(() => events.push("mask-1")).pipe(
              Effect.flatMap(() => Effect.sync(() => events.push("mask-2")))
            )
          )
        }).pipe(Effect.forkChild({ startImmediately: true }))

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
        assert.deepStrictEqual(events, [])
      }))

    it.effect("wins over a failure returned by the same op", () =>
      Effect.gen(function*() {
        let recovered = false
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.suspend(() => {
          Fiber.runIn(Fiber.getCurrent()!, closedScope)
          return Effect.fail("boom")
        }).pipe(
          Effect.catch(() =>
            Effect.sync(() => {
              recovered = true
            })
          ),
          Effect.forkChild({ startImmediately: true })
        )

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
        assert.isFalse(recovered)
      }))

    it.effect("wins over a defect thrown by the same op", () =>
      Effect.gen(function*() {
        let interrupted = false
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.sync(() => {
          Fiber.runIn(Fiber.getCurrent()!, closedScope)
          throw new Error("kaboom")
        }).pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              interrupted = true
            })
          ),
          Effect.forkChild({ startImmediately: true })
        )

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
        assert.isTrue(interrupted)
      }))

    it.effect("cancels an async registration made by the interrupting op", () =>
      Effect.gen(function*() {
        let cleanups = 0
        const closedScope = yield* Scope.make()
        yield* Scope.close(closedScope, Exit.void)

        const child = yield* Effect.callback<number>(() => {
          Fiber.runIn(Fiber.getCurrent()!, closedScope)
          return Effect.sync(() => {
            cleanups++
          })
        }).pipe(Effect.forkChild({ startImmediately: true }))

        const exit = yield* Fiber.await(child)
        assert.isTrue(Exit.hasInterrupts(exit))
        assert.strictEqual(cleanups, 1)
      }))
  })
})
