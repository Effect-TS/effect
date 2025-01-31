import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Effect", () => {
  it.effect("returns first success", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.raceAll([Effect.fail("fail"), Effect.succeed(24)]))
      strictEqual(result, 24)
    }))
  it.live("returns last failure", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          Effect.raceAll([pipe(Effect.sleep(Duration.millis(100)), Effect.zipRight(Effect.fail(24))), Effect.fail(25)]),
          Effect.flip
        )
      )
      strictEqual(result, 24)
    }))
  it.live("returns success when it happens after failure", () =>
    Effect.gen(function*() {
      const result = yield* (
        Effect.raceAll([
          Effect.fail(42),
          pipe(Effect.succeed(24), Effect.zipLeft(Effect.sleep(Duration.millis(100))))
        ])
      )
      strictEqual(result, 24)
    }))
})
