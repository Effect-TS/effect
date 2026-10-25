import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Snowflake } from "effect/cluster"
import { TestClock } from "effect/testing"

describe("Snowflake", () => {
  it.effect("keeps ids unique across successive overflows with a frozen clock", () =>
    Effect.gen(function*() {
      const now = Snowflake.constEpochMillis + 1000
      yield* TestClock.setTime(now)
      const generator = yield* Snowflake.makeGenerator
      const ids = Array.from({ length: 8193 }, () => generator.nextUnsafe())

      assert.strictEqual(new Set(ids).size, 8193)
      assert.isTrue(ids.every((id, index) => index === 0 || id > ids[index - 1]))
      assert.deepStrictEqual(
        [0, 4095, 4096, 8191, 8192].map((index) => Snowflake.timestamp(ids[index])),
        [now, now, now + 1, now + 1, now + 2]
      )
    }))

  it.effect("keeps ids unique when the clock moves backward and resumes when it moves forward", () =>
    Effect.gen(function*() {
      const now = Snowflake.constEpochMillis + 2000
      yield* TestClock.setTime(now)
      const generator = yield* Snowflake.makeGenerator
      const first = generator.nextUnsafe()
      yield* TestClock.setTime(now - 1000)
      const ids = [first, ...Array.from({ length: 4097 }, () => generator.nextUnsafe())]

      assert.strictEqual(new Set(ids).size, 4098)
      assert.isTrue(ids.every((id, index) => index === 0 || id > ids[index - 1]))
      assert.deepStrictEqual(
        [0, 4095, 4096, 4097].map((index) => Snowflake.timestamp(ids[index])),
        [now, now, now + 1, now + 1]
      )

      yield* TestClock.setTime(now + 1000)
      const next = generator.nextUnsafe()
      assert.isTrue(next > ids[ids.length - 1])
      assert.strictEqual(Snowflake.timestamp(next), now + 1000)
      assert.strictEqual(Snowflake.sequence(next), 0)
    }))
})
