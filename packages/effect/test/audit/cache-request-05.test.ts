import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Request, RequestResolver } from "effect"

class GetValue extends Request.TaggedClass("GetValue")<{ readonly id: number }, number> {}

// RequestResolver.withCache (src/RequestResolver.ts:1193-1198) chains each pending duplicate onto the
// original entry's completeUnsafe. Per RequestResolver.makeWith (:175) every accepted request must be
// completed, and withCache documents no limit on how many callers can share one cache entry.
it.effect("withCache completes many coalesced requests for one cache entry", () =>
  Effect.gen(function*() {
    const gate = yield* Deferred.make<void>()
    const resolver = yield* RequestResolver.make<GetValue>((entries) =>
      Effect.sync(() => {
        for (const entry of entries) entry.completeUnsafe(Exit.succeed(42))
      })
    ).pipe(RequestResolver.setDelayEffect(Deferred.await(gate)), RequestResolver.withCache({ capacity: 1 }))
    const fibers = yield* Effect.forEach(
      Array.from({ length: 20_000 }),
      () => Effect.request(new GetValue({ id: 1 }), resolver).pipe(Effect.forkChild({ startImmediately: true }))
    )
    yield* Deferred.succeed(gate, undefined)
    yield* Effect.yieldNow

    assert.deepStrictEqual(fibers.filter((fiber) => fiber.pollUnsafe() === undefined).length, 0)
    assert.deepStrictEqual(yield* Fiber.join(fibers[0]), 42)
  }))
