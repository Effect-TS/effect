import { describe, it } from "@effect/vitest"
import { assertLeft, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

describe("Channel", () => {
  it("acquireUseReleaseOut - acquire is executed uninterruptibly", async () => {
    const latch = Deferred.unsafeMake<void>(FiberId.none)
    const program = Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const acquire = Effect.zipRight(Ref.update(ref, (n) => n + 1), Effect.yieldNow())
      const release = Ref.update(ref, (n) => n - 1)
      yield* pipe(
        Channel.acquireReleaseOut(acquire, () => release),
        Channel.as(Channel.fromEffect(Deferred.await(latch))),
        Channel.runDrain,
        Effect.fork,
        Effect.flatMap((fiber) => pipe(Effect.yieldNow(), Effect.zipRight(Fiber.interrupt(fiber)))),
        Effect.repeatN(1_000)
      )
      return yield* (Ref.get(ref))
    })
    const result = await Effect.runPromise(program)
    await Effect.runPromise(Deferred.succeed(latch, void 0))
    strictEqual(result, 0)
  }, 35_000)

  it("scoped closes the scope", async () => {
    const latch = Deferred.unsafeMake<void>(FiberId.none)
    const program = Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const acquire = Effect.zipRight(Ref.update(ref, (n) => n + 1), Effect.yieldNow())
      const release = () => Ref.update(ref, (n) => n - 1)
      const scoped = Effect.acquireRelease(acquire, release)
      yield* pipe(
        Channel.unwrapScoped(pipe(scoped, Effect.as(Channel.fromEffect(Deferred.await(latch))))),
        Channel.runDrain,
        Effect.fork,
        Effect.flatMap((fiber) => pipe(Effect.yieldNow(), Effect.zipRight(Fiber.interrupt(fiber)))),
        Effect.repeatN(1_000)
      )
      return yield* (Ref.get(ref))
    })
    const result = await Effect.runPromise(program)
    await Effect.runPromise(Deferred.succeed(latch, void 0))
    strictEqual(result, 0)
  }, 35_000)

  it.effect("finalizer failure is propagated", () =>
    Effect.gen(function*() {
      const exit = yield* pipe(
        Channel.void,
        Channel.ensuring(Effect.die("ok")),
        Channel.ensuring(Effect.void),
        Channel.runDrain,
        Effect.sandbox,
        Effect.either
      )

      assertLeft(exit, Cause.die("ok"))
    }))
})
