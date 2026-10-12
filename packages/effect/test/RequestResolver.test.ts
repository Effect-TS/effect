import { assert, describe, it } from "@effect/vitest"
import { Data, Deferred, Effect, Exit, Fiber, Request, RequestResolver } from "effect"

class Key extends Data.Class<{ id: number }> {}
class GetValue extends Request.Class<{ key: Key }, number> {}

describe("RequestResolver.makeGrouped", () => {
  it.effect("keeps equal keys batched across derived resolvers and releases them before the next window", () =>
    Effect.gen(function*() {
      const gate = yield* Deferred.make<void>()
      const batches: Array<{ key: Key; size: number }> = []
      const resolver = RequestResolver.makeGrouped<GetValue, Key>({
        key: ({ request }) => request.key,
        resolver: (entries, key) =>
          Effect.sync(() => {
            batches.push({ key, size: entries.length })
            for (const entry of entries) entry.completeUnsafe(Exit.succeed(key.id))
          })
      }).pipe(RequestResolver.setDelayEffect(Effect.andThen(Effect.yieldNow, Deferred.await(gate))))
      const first = yield* Effect.request(new GetValue({ key: new Key({ id: 1 }) }), resolver).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      // Running a derived resolver must not split the delayed resolver's pending batch.
      yield* Effect.request(new GetValue({ key: new Key({ id: 1 }) }), RequestResolver.batchN(resolver, 1))
      const rest = yield* Effect.forEach(
        [1, 2],
        (id) =>
          Effect.request(new GetValue({ key: new Key({ id }) }), resolver).pipe(
            Effect.forkChild({ startImmediately: true })
          )
      )
      yield* Deferred.succeed(gate, undefined)
      const values = yield* Effect.forEach([first, ...rest], Fiber.join)
      assert.deepStrictEqual(values, [1, 1, 2])
      assert.deepStrictEqual(batches.map(({ size }) => size), [1, 2, 1])

      const next = new Key({ id: 1 })
      yield* Effect.request(new GetValue({ key: next }), resolver)
      assert.strictEqual(batches[3].key, next)
    }))

  it.effect("releases the key when the last pending request is interrupted", () =>
    Effect.gen(function*() {
      const keys: Array<Key> = []
      const resolver = RequestResolver.makeGrouped<GetValue, Key>({
        key: ({ request }) => request.key,
        resolver: (entries, key) =>
          Effect.sync(() => {
            keys.push(key)
            for (const entry of entries) entry.completeUnsafe(Exit.succeed(key.id))
          })
      })
      const fiber = yield* Effect.request(new GetValue({ key: new Key({ id: 1 }) }), resolver).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* Fiber.interrupt(fiber)
      const next = new Key({ id: 1 })
      yield* Effect.request(new GetValue({ key: next }), resolver)

      assert.strictEqual(keys.length, 1)
      assert.strictEqual(keys[0], next)
    }))
})
