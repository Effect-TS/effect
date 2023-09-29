import * as it from "effect-test/utils/extend"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("returns first success", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.raceAll([Effect.fail("fail"), Effect.succeed(24)]))
      assert.strictEqual(result, 24)
    }))
  it.live("returns last failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          Effect.raceAll([pipe(Effect.sleep(Duration.millis(100)), Effect.zipRight(Effect.fail(24))), Effect.fail(25)]),
          Effect.flip
        )
      )
      assert.strictEqual(result, 24)
    }))
  it.live("returns success when it happens after failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.raceAll([
          Effect.fail(42),
          pipe(Effect.succeed(24), Effect.zipLeft(Effect.sleep(Duration.millis(100))))
        ])
      )
      assert.strictEqual(result, 24)
    }))
})
