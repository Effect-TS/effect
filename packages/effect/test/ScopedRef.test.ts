import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as ScopedRef from "effect/ScopedRef"
import * as Counter from "effect/test/utils/counter"
import * as it from "effect/test/utils/extend"
import { assert, describe, expect } from "vitest"

describe("ScopedRef", () => {
  it.scoped("single set", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const ref = yield* $(ScopedRef.make(() => 0))
      yield* $(ScopedRef.set(ref, counter.acquire()))
      const result = yield* $(ScopedRef.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.scoped("dual set", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const ref = yield* $(ScopedRef.make(() => 0))
      yield* $(
        ScopedRef.set(ref, counter.acquire()),
        Effect.zipRight(ScopedRef.set(ref, counter.acquire()))
      )
      const result = yield* $(ScopedRef.get(ref))
      assert.strictEqual(result, 2)
    }))
  it.scoped("release on swap", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const ref = yield* $(ScopedRef.make(() => 0))
      yield* $(
        ScopedRef.set(ref, counter.acquire()),
        Effect.zipRight(ScopedRef.set(ref, counter.acquire()))
      )

      const acquired = yield* $(counter.acquired())
      const released = yield* $(counter.released())
      assert.strictEqual(acquired, 2)
      assert.strictEqual(released, 1)
    }))
  it.scoped("double release on double swap", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const ref = yield* $(ScopedRef.make(() => 0))
      yield* $(
        pipe(
          ScopedRef.set(ref, counter.acquire()),
          Effect.zipRight(ScopedRef.set(ref, counter.acquire())),
          Effect.zipRight(ScopedRef.set(ref, counter.acquire()))
        )
      )
      const acquired = yield* $(counter.acquired())
      const released = yield* $(counter.released())
      assert.strictEqual(acquired, 3)
      assert.strictEqual(released, 2)
    }))
  it.effect("full release", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      yield* $(
        ScopedRef.make(() => 0),
        Effect.flatMap((ref) =>
          pipe(
            ScopedRef.set(ref, counter.acquire()),
            Effect.zipRight(ScopedRef.set(ref, counter.acquire())),
            Effect.zipRight(ScopedRef.set(ref, counter.acquire()))
          )
        ),
        Effect.scoped
      )
      const acquired = yield* $(counter.acquired())
      const released = yield* $(counter.released())
      assert.strictEqual(acquired, 3)
      assert.strictEqual(released, 3)
    }))
  it.effect("full release", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Effect.scoped(ScopedRef.make(() => 0)))
      expect(ref.pipe(identity)).toBe(ref)
    }))
  it.scoped("subtype of Effect", () =>
    Effect.gen(function*() {
      const ref = yield* ScopedRef.make(() => 0)
      const result = yield* ref
      assert.strictEqual(result, 0)
    }))
})
