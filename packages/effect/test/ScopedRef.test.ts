import { Effect, identity, pipe, ScopedRef } from "effect"
import { strictEqual } from "effect/test/util"
import * as Counter from "effect/test/utils/counter"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("ScopedRef", () => {
  it.scoped("single set", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const ref = yield* $(ScopedRef.make(() => 0))
      yield* $(ScopedRef.set(ref, counter.acquire()))
      const result = yield* $(ScopedRef.get(ref))
      strictEqual(result, 1)
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
      strictEqual(result, 2)
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
      strictEqual(acquired, 2)
      strictEqual(released, 1)
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
      strictEqual(acquired, 3)
      strictEqual(released, 2)
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
      strictEqual(acquired, 3)
      strictEqual(released, 3)
    }))
  it.effect("full release", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Effect.scoped(ScopedRef.make(() => 0)))
      strictEqual(ref.pipe(identity), ref)
    }))
  it.scoped("subtype of Effect", () =>
    Effect.gen(function*() {
      const ref = yield* ScopedRef.make(() => 0)
      const result = yield* ref
      strictEqual(result, 0)
    }))
})
