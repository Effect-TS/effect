import { assert, it } from "@effect/vitest"
import { Effect, Exit, Request, RequestResolver } from "effect"

class R extends Request.Class<{ readonly id: number }, number> {}

// packages/effect/src/internal/request.ts:164-169 forks the delay fiber before inserting the entry.
// Contract (RequestResolver.ts:43-47, :167-170): `runAll` receives a non-empty batch for one resolver/key,
// and setDelayEffect (RequestResolver.ts:553-599) accepts any Effect<void>, including synchronous ones.
it.effect("synchronous resolver delay batches the triggering request and keeps resolvers isolated", () =>
  Effect.gen(function*() {
    const seenA: Array<Array<number>> = []
    const seenB: Array<Array<number>> = []
    const a = RequestResolver.fromFunctionBatched<R>((entries) => {
      seenA.push(entries.map((e) => e.request.id))
      return entries.map((e) => e.request.id)
    }).pipe(RequestResolver.setDelayEffect(Effect.void))
    const b = RequestResolver.fromFunctionBatched<R>((entries) => {
      seenB.push(entries.map((e) => e.request.id))
      return entries.map((e) => e.request.id)
    })

    const exitA = yield* Effect.exit(Effect.request(new R({ id: 1 }), a))
    const exitB = yield* Effect.exit(Effect.request(new R({ id: 2 }), b))

    assert.deepStrictEqual({ exitA, exitB, seenA, seenB }, {
      exitA: Exit.succeed(1),
      exitB: Exit.succeed(2),
      seenA: [[1]],
      seenB: [[2]]
    })
  }))
