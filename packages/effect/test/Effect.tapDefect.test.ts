import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit } from "effect"

describe("tapDefect runtime preservation", () => {
  it.effect("saved observer skips success and typed failure", () =>
    Effect.gen(function*() {
      let calls = 0
      const observe = Effect.tapDefect(() =>
        Effect.sync(() => {
          calls++
        })
      )
      const error = { business: "failed" }
      const cause = Cause.fail(error)
      assert.strictEqual(yield* observe(Effect.succeed(1)), 1)
      const exit = yield* Effect.exit(observe(Effect.failCause(cause)))
      assert(Exit.isFailure(exit))
      assert.strictEqual(exit.cause, cause)
      assert.strictEqual(Cause.squash(exit.cause), error)
      assert.strictEqual(calls, 0)
    }))

  it.effect("saved data-first and inline observers retain original defect cause", () =>
    Effect.gen(function*() {
      const defect = { unexpected: true }
      const cause = Cause.die(defect)
      const seen: Array<unknown> = []
      const observer = (value: unknown) =>
        Effect.sync(() => {
          seen.push(value)
        })
      const saved = Effect.tapDefect(observer)
      const effects = [
        saved(Effect.failCause(cause)),
        Effect.tapDefect(Effect.failCause(cause), observer),
        Effect.failCause(cause).pipe(Effect.tapDefect(observer))
      ]
      for (const effect of effects) {
        const exit = yield* Effect.exit(effect)
        assert(Exit.isFailure(exit))
        assert.strictEqual(exit.cause, cause)
        assert.strictEqual(Cause.squash(exit.cause), defect)
      }
      assert.strictEqual(seen.length, 3)
      for (const value of seen) assert.strictEqual(value, defect)
    }))

  it.effect("observer failure propagates its original error once", () =>
    Effect.gen(function*() {
      const defect = new Error("defect")
      const error = { observer: "failed" }
      let calls = 0
      const saved = Effect.tapDefect((value) => {
        assert.strictEqual(value, defect)
        calls++
        return Effect.fail(error)
      })
      const exit = yield* Effect.exit(saved(Effect.die(defect)))
      assert.deepStrictEqual(exit, Exit.fail(error))
      assert(Exit.isFailure(exit))
      assert.strictEqual(Cause.squash(exit.cause), error)
      assert.strictEqual(calls, 1)
    }))
})
