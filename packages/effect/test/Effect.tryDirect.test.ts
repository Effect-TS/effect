import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect } from "effect"

describe("try direct preservation", () => {
  it.effect("R01 synchronous direct evaluation is lazy and repeated", () =>
    Effect.gen(function*() {
      const thrown = new Error("source")
      let calls = 0
      const program = Effect.try((): number => {
        calls++
        throw thrown
      })
      assert.strictEqual(calls, 0)
      const first = yield* Effect.flip(program)
      const second = yield* Effect.flip(program)
      assert.instanceOf(first, Cause.UnknownError)
      assert.instanceOf(second, Cause.UnknownError)
      assert.strictEqual(first.cause, thrown)
      assert.strictEqual(second.cause, thrown)
      assert.strictEqual(first.message, "An error occurred in Effect.try")
      assert.strictEqual(calls, 2)
    }))

  it.effect("R02 asynchronous direct evaluation is lazy and repeated", () =>
    Effect.gen(function*() {
      const rejected = new Error("source")
      let calls = 0
      const program = Effect.tryPromise((signal) => {
        calls++
        assert.instanceOf(signal, AbortSignal)
        return Promise.reject<number>(rejected)
      })
      assert.strictEqual(calls, 0)
      const first = yield* Effect.flip(program)
      const second = yield* Effect.flip(program)
      assert.instanceOf(first, Cause.UnknownError)
      assert.instanceOf(second, Cause.UnknownError)
      assert.strictEqual(first.cause, rejected)
      assert.strictEqual(second.cause, rejected)
      assert.strictEqual(first.message, "An error occurred in Effect.tryPromise")
      assert.strictEqual(calls, 2)
    }))

  it.effect("R03 mapped wrappers preserve error identity and mapping count", () =>
    Effect.gen(function*() {
      const thrown = new Error("source")
      const mapped = { _tag: "LoadError", cause: thrown }
      let mappings = 0
      const catchError = (error: unknown) => {
        mappings++
        assert.strictEqual(error, thrown)
        return mapped
      }
      const sync = Effect.try({
        try: (): number => {
          throw thrown
        },
        catch: catchError
      })
      const async = Effect.tryPromise({ try: () => Promise.reject<number>(thrown), catch: catchError })
      assert.strictEqual(mappings, 0)
      assert.strictEqual(yield* Effect.flip(sync), mapped)
      assert.strictEqual(yield* Effect.flip(async), mapped)
      assert.strictEqual(mappings, 2)
    }))
})
