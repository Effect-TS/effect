import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("effectify runtime preservation", () => {
  it.effect("callback error mappers receive only caller inputs", () =>
    Effect.gen(function*() {
      const error = new Error("callback")
      const calls: Array<ReadonlyArray<unknown>> = []
      const original = (input: string, count: number, cb: (error: Error | null, value?: string) => void) => {
        calls.push([input, count, typeof cb])
        cb(error)
      }
      const mapped = { mapped: true }
      const adapted = Effect.effectify(original, (received, args) => {
        assert.strictEqual(received, error)
        calls.push(args)
        return mapped
      })
      assert.deepStrictEqual(calls, [])
      assert.strictEqual(yield* Effect.flip(adapted("hello", 2)), mapped)
      assert.deepStrictEqual(calls, [["hello", 2, "function"], ["hello", 2]])
    }))

  it.effect("three-argument adapter selects callback and sync mapper once", () =>
    Effect.gen(function*() {
      const callbackError = new Error("callback")
      const syncError = new Error("sync")
      const calls: Array<ReadonlyArray<unknown>> = []
      const adapted = Effect.effectify((input: string, cb: (error: Error | null, value?: number) => void) => {
        if (input === "throw") throw syncError
        cb(callbackError)
      }, (error, args) => {
        assert.strictEqual(error, callbackError)
        calls.push(["callback", ...args])
        return callbackError
      }, (error, args) => {
        assert.strictEqual(error, syncError)
        calls.push(["sync", ...args])
        return syncError
      })
      assert.strictEqual(yield* Effect.flip(adapted("fail")), callbackError)
      assert.strictEqual(yield* Effect.flip(adapted("throw")), syncError)
      assert.deepStrictEqual(calls, [["callback", "fail"], ["sync", "throw"]])
    }))

  it.effect("zero inputs give an empty array and success skips mappers", () =>
    Effect.gen(function*() {
      const calls: Array<ReadonlyArray<unknown>> = []
      const failed = Effect.effectify(
        (cb: (error: Error | null, value?: string) => void) => cb(new Error("fail")),
        (_error, args) => {
          calls.push(args)
          return "mapped"
        }
      )
      assert.strictEqual(yield* Effect.flip(failed()), "mapped")
      const success = Effect.effectify((cb: (error: Error | null, value?: string) => void) => cb(null, "ok"), () => {
        assert.fail("success must not invoke error mapper")
      })
      assert.strictEqual(yield* success(), "ok")
      assert.deepStrictEqual(calls, [[]])
    }))
})
