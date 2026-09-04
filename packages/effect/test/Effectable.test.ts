import { assert, describe, it } from "@effect/vitest"
import { Effect, Effectable } from "effect"

describe("Effectable", () => {
  it.effect("runs Class instances using asEffect", () =>
    Effect.gen(function*() {
      class Answer extends Effectable.Class<number> {
        asEffect() {
          return Effect.succeed(42)
        }
      }

      assert.strictEqual(yield* new Answer(), 42)
    }))

  it.effect("calls asEffect on the receiver for every run", () =>
    Effect.gen(function*() {
      class Answer extends Effectable.Class<number> {
        value = 1
        calls = 0

        asEffect() {
          this.calls++
          return Effect.succeed(this.value)
        }
      }

      const answer = new Answer()
      assert.strictEqual(answer.calls, 0)
      assert.strictEqual(yield* answer, 1)
      assert.strictEqual(answer.calls, 1)

      answer.value = 2
      assert.strictEqual(yield* answer, 2)
      assert.strictEqual(answer.calls, 2)
    }))
})
