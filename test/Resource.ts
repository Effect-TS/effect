import { Duration, Effect, Either, Ref, Resource, Schedule, TestClock } from "effect"
import * as it from "effect-test/utils/extend"
import { identity, pipe } from "effect/Function"
import { assert, describe } from "vitest"

describe.concurrent("Resource", () => {
  it.scoped("manual", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(Resource.manual(Ref.get(ref)))
      const resul1 = yield* $(Resource.get(cached))
      const result2 = yield* $(
        pipe(Ref.set(ref, 1), Effect.zipRight(Resource.refresh(cached)), Effect.zipRight(Resource.get(cached)))
      )
      assert.strictEqual(resul1, 0)
      assert.strictEqual(result2, 1)
    }))
  it.scoped("auto", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const cached = yield* $(Resource.auto(Ref.get(ref), Schedule.spaced(Duration.millis(4))))
      const result1 = yield* $(Resource.get(cached))
      const result2 = yield* $(
        pipe(
          Ref.set(ref, 1),
          Effect.zipRight(TestClock.adjust(Duration.millis(5))),
          Effect.zipRight(Resource.get(cached))
        )
      )
      assert.strictEqual(result1, 0)
      assert.strictEqual(result2, 1)
    }))
  it.scopedLive("failed refresh doesn't affect cached value", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<Either<string, number>>(Either.right(0)))
      const cached = yield* $(
        Resource.auto(Effect.flatMap(Ref.get(ref), identity), Schedule.spaced(Duration.millis(4)))
      )
      const result1 = yield* $(Resource.get(cached))
      const result2 = yield* $(
        pipe(
          Ref.set(ref, Either.left("Uh oh!")),
          Effect.zipRight(Effect.sleep(Duration.millis(5))),
          Effect.zipRight(Resource.get(cached))
        )
      )
      assert.strictEqual(result1, 0)
      assert.strictEqual(result2, 0)
    }))
})
