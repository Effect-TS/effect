import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { identity, pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Cached from "effect/Resource"
import * as Schedule from "effect/Schedule"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe("Resource", () => {
  it.scoped("manual", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(Cached.manual(Ref.get(ref)))
      const resul1 = yield* $(Cached.get(cached))
      const result2 = yield* $(
        pipe(Ref.set(ref, 1), Effect.zipRight(Cached.refresh(cached)), Effect.zipRight(Cached.get(cached)))
      )
      assert.strictEqual(resul1, 0)
      assert.strictEqual(result2, 1)
    }))
  it.scoped("auto", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(Cached.auto(Ref.get(ref), Schedule.spaced(Duration.millis(4))))
      const result1 = yield* $(Cached.get(cached))
      const result2 = yield* $(
        pipe(
          Ref.set(ref, 1),
          Effect.zipRight(TestClock.adjust(Duration.millis(5))),
          Effect.zipRight(Cached.get(cached))
        )
      )
      assert.strictEqual(result1, 0)
      assert.strictEqual(result2, 1)
    }))
  it.scopedLive("failed refresh doesn't affect cached value", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<Either.Either<number, string>>(Either.right(0)))
      const cached = yield* $(Cached.auto(Effect.flatMap(Ref.get(ref), identity), Schedule.spaced(Duration.millis(4))))
      const result1 = yield* $(Cached.get(cached))
      const result2 = yield* $(
        pipe(
          Ref.set(ref, Either.left("Uh oh!")),
          Effect.zipRight(Effect.sleep(Duration.millis(5))),
          Effect.zipRight(Cached.get(cached))
        )
      )
      assert.strictEqual(result1, 0)
      assert.strictEqual(result2, 0)
    }))
  it.scoped("subtype of Effect", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const cached = yield* Cached.manual(ref)
      const resul1 = yield* cached

      assert.strictEqual(resul1, 0)
    }))
})
