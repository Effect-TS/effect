import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as TestClock from "effect/TestClock"

describe("Effect", () => {
  it.effect("cached - returns new instances after duration", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const cache = yield* pipe(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.cachedWithTTL(Duration.minutes(60))
      )
      const a = yield* cache
      yield* (TestClock.adjust(Duration.minutes(59)))
      const b = yield* cache
      yield* (TestClock.adjust(Duration.minutes(1)))
      const c = yield* cache
      yield* (TestClock.adjust(Duration.minutes(59)))
      const d = yield* cache
      strictEqual(a, b)
      assertTrue(b !== c)
      strictEqual(c, d)
    }))
  it.effect("cached - correctly handles an infinite duration time to live", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const cached = yield* pipe(
        Ref.modify(ref, (curr) => [curr, curr + 1]),
        Effect.cachedWithTTL(Duration.infinity)
      )
      const a = yield* cached
      const b = yield* cached
      const c = yield* cached
      strictEqual(a, 0)
      strictEqual(b, 0)
      strictEqual(c, 0)
    }))
  it.effect("cachedInvalidate - returns new instances after duration", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const [cached, invalidate] = yield* (
        pipe(
          Ref.updateAndGet(ref, (n) => n + 1),
          Effect.cachedInvalidateWithTTL(Duration.minutes(60))
        )
      )
      const a = yield* cached
      yield* (TestClock.adjust(Duration.minutes(59)))
      const b = yield* cached
      yield* invalidate
      const c = yield* cached
      yield* (TestClock.adjust(Duration.minutes(1)))
      const d = yield* cached
      yield* (TestClock.adjust(Duration.minutes(59)))
      const e = yield* cached
      strictEqual(a, b)
      assertTrue(b !== c)
      strictEqual(c, d)
      assertTrue(d !== e)
    }))
})
