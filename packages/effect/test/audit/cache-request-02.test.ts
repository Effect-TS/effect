import { assert, it } from "@effect/vitest"
import { Effect, Exit, Request, RequestResolver } from "effect"

class GetValue extends Request.TaggedClass("GetValue")<{ readonly id: number }, number> {}

// internal/request.ts:131-164: completion/cleanup (`onExit`) wraps only `batch.run`, not the
// resolver delay. RequestResolver.makeWith (RequestResolver.ts:175-177) requires accepted entries
// to be completed, and the runAll failure path propagates its Cause to all waiting requests; a
// failed delay should do the same and release the pending batch for later requests.
it.effect("a failed batch delay completes current and later requests with its Cause", () =>
  Effect.gen(function*() {
    const resolver = RequestResolver.fromFunction<GetValue>(() => 42).pipe(
      RequestResolver.setDelayEffect(Effect.andThen(Effect.yieldNow, Effect.die("delay defect")))
    )
    const first = yield* Effect.request(new GetValue({ id: 1 }), resolver).pipe(
      Effect.forkChild({ startImmediately: true })
    )
    for (let i = 0; i < 5; i++) yield* Effect.yieldNow
    const second = yield* Effect.request(new GetValue({ id: 2 }), resolver).pipe(
      Effect.forkChild({ startImmediately: true })
    )
    for (let i = 0; i < 5; i++) yield* Effect.yieldNow
    assert.deepStrictEqual(
      [first.pollUnsafe(), second.pollUnsafe()],
      [Exit.die("delay defect"), Exit.die("delay defect")]
    )
  }))
