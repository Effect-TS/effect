import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Duration, Effect, Either, identity, pipe, Ref, Resource, Schedule } from "effect"
import * as TestClock from "effect/TestClock"

describe("Resource", () => {
  it.scoped("manual", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const cached = yield* Resource.manual(Ref.get(ref))
      const resul1 = yield* Resource.get(cached)
      const result2 = yield* pipe(
        Ref.set(ref, 1),
        Effect.zipRight(Resource.refresh(cached)),
        Effect.zipRight(Resource.get(cached))
      )
      strictEqual(resul1, 0)
      strictEqual(result2, 1)
    }))
  it.scoped("auto", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const cached = yield* Resource.auto(Ref.get(ref), Schedule.spaced(Duration.millis(4)))
      const result1 = yield* Resource.get(cached)
      const result2 = yield* pipe(
        Ref.set(ref, 1),
        Effect.zipRight(TestClock.adjust(Duration.millis(5))),
        Effect.zipRight(Resource.get(cached))
      )
      strictEqual(result1, 0)
      strictEqual(result2, 1)
    }))
  it.scopedLive("failed refresh doesn't affect cached value", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<Either.Either<number, string>>(Either.right(0))
      const cached = yield* Resource.auto(Effect.flatMap(Ref.get(ref), identity), Schedule.spaced(Duration.millis(4)))
      const result1 = yield* Resource.get(cached)
      const result2 = yield* pipe(
        Ref.set(ref, Either.left("Uh oh!")),
        Effect.zipRight(Effect.sleep(Duration.millis(5))),
        Effect.zipRight(Resource.get(cached))
      )
      strictEqual(result1, 0)
      strictEqual(result2, 0)
    }))
  it.scoped("subtype of Effect", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const cached = yield* Resource.manual(ref)
      const resul1 = yield* cached

      strictEqual(resul1, 0)
    }))
})
