import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option, SubscriptionRef, SynchronizedRef } from "effect"

describe("SynchronizedRef.modifySomeEffect runtime controls", () => {
  for (const update of [false, true]) {
    const branch = update ? "Some" : "None"
    const tuple = (value: number): readonly [string, Option.Option<number>] => [
      `callback-${branch}`,
      update ? Option.some(value + 1) : Option.none()
    ]
    const pf = (value: number) => Effect.succeed(tuple(value))

    for (const curried of [false, true]) {
      it.effect(`control: SynchronizedRef ${curried ? "callback-only runtime" : "data-first"} ${branch}`, () =>
        Effect.gen(function*() {
          const ref = yield* SynchronizedRef.make(10)
          let calls = 0
          const counted = (value: number) => {
            calls++
            assert.strictEqual(value, 10)
            return pf(value)
          }
          const effect = curried
            ? SynchronizedRef.modifySomeEffect(counted)(ref)
            : SynchronizedRef.modifySomeEffect(ref, counted)
          assert.strictEqual(calls, 0)
          assert.strictEqual(yield* effect, `callback-${branch}`)
          assert.strictEqual(calls, 1)
          assert.strictEqual(yield* SynchronizedRef.get(ref), update ? 11 : 10)
        }))

      it.effect(`control: pure modifySome ${curried ? "curried" : "data-first"} ${branch}`, () =>
        Effect.gen(function*() {
          const ref = yield* SynchronizedRef.make(10)
          const effect = curried ? ref.pipe(SynchronizedRef.modifySome(tuple)) : SynchronizedRef.modifySome(ref, tuple)
          assert.strictEqual(yield* effect, `callback-${branch}`)
          assert.strictEqual(yield* SynchronizedRef.get(ref), update ? 11 : 10)
        }))

      it.effect(`control: SubscriptionRef ${curried ? "curried" : "data-first"} ${branch}`, () =>
        Effect.gen(function*() {
          const ref = yield* SubscriptionRef.make(10)
          const effect = curried
            ? ref.pipe(SubscriptionRef.modifySomeEffect(pf))
            : SubscriptionRef.modifySomeEffect(ref, pf)
          assert.strictEqual(yield* effect, `callback-${branch}`)
          assert.strictEqual(yield* SubscriptionRef.get(ref), update ? 11 : 10)
        }))
    }
  }

  for (const curried of [false, true]) {
    it.effect(`control: ${curried ? "callback-only runtime" : "data-first"} failure preserves state and releases permit`, () =>
      Effect.gen(function*() {
        const ref = yield* SynchronizedRef.make(10)
        const pf = (_: number): Effect.Effect<readonly [string, Option.Option<number>], string> =>
          Effect.fail("failure")
        const effect = curried ? SynchronizedRef.modifySomeEffect(pf)(ref) : SynchronizedRef.modifySomeEffect(ref, pf)
        assert.deepStrictEqual(yield* Effect.exit(effect), Exit.fail("failure"))
        assert.strictEqual(yield* SynchronizedRef.get(ref), 10)
        yield* SynchronizedRef.update(ref, (value) => value + 1)
        assert.strictEqual(yield* SynchronizedRef.get(ref), 11)
      }))
  }
})
