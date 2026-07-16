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
})
