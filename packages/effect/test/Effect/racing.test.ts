import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as TestClock from "effect/TestClock"

describe("Effect", () => {
  it.effect("raceAll waits losers interruption", () =>
    Effect.gen(function*() {
      const messages: Array<string> = []

      const a = Effect.gen(function*() {
        yield* Effect.addFinalizer(() => Effect.sync(() => messages.push("finalize a")))
        yield* Effect.sleep("100 millis")
        yield* Effect.sync(() => messages.push("done a"))
      })

      const b = Effect.gen(function*() {
        yield* Effect.addFinalizer(() => Effect.sync(() => messages.push("finalize b")))
        yield* Effect.sleep("200 millis")
        yield* Effect.sync(() => messages.push("done b"))
      })

      yield* Effect.raceAll([
        Effect.scoped(a),
        Effect.scoped(b)
      ]).pipe(
        Effect.tap(() => Effect.sync(() => messages.push("race done"))),
        Effect.fork
      )

      yield* TestClock.adjust("300 millis")

      deepStrictEqual(messages, [
        "done a",
        "finalize a",
        "finalize b",
        "race done"
      ])
    }))
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
