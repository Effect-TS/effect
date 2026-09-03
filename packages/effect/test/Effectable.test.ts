import { assert, describe, it } from "@effect/vitest"
import { Effect, Effectable } from "effect"

describe("Effectable", () => {
  it.effect("runs Class instances using their override", () =>
    Effect.gen(function*() {
      class Answer extends Effectable.Class<number> {
        readonly override = Effect.succeed(42)
      }

      assert.strictEqual(yield* new Answer(), 42)
    }))

  it.effect("reads the Class override from the receiver on every run", () =>
    Effect.gen(function*() {
      class Answer extends Effectable.Class<number> {
        value = 1
        reads = 0

        get override() {
          this.reads++
          return Effect.succeed(this.value)
        }
      }

      const answer = new Answer()
      assert.strictEqual(answer.reads, 0)
      assert.strictEqual(yield* answer, 1)
      assert.strictEqual(answer.reads, 1)

      answer.value = 2
      assert.strictEqual(yield* answer, 2)
      assert.strictEqual(answer.reads, 2)
    }))
})
