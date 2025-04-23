import { describe, it } from "@effect/vitest"
import { deepStrictEqual, notDeepStrictEqual } from "@effect/vitest/utils"
import { Cause, Effect, pipe, Ref } from "effect"

describe("Effect", () => {
  describe("all", () => {
    describe("returns results in the same order", () => {
      it.effect("unbounded", () =>
        Effect.gen(function*() {
          const result = yield* (Effect.all([1, 2, 3].map(Effect.succeed), {
            concurrency: "unbounded"
          }))
          deepStrictEqual(Array.from(result), [1, 2, 3])
        }))

      it.effect("concurrency > 1", () =>
        Effect.gen(function*() {
          const result = yield* (Effect.all([1, 2, 3].map(Effect.succeed), {
            concurrency: 2
          }))
          deepStrictEqual(Array.from(result), [1, 2, 3])
        }))
    })

    it.effect("is referentially transparent", () =>
      Effect.gen(function*() {
        const counter = yield* (Ref.make(0))
        const op = Ref.getAndUpdate(counter, (n) => n + 1)
        const ops3 = Effect.all([op, op, op], { concurrency: "unbounded" })
        const result = yield* pipe(ops3, Effect.zip(ops3, { concurrent: true }))
        notDeepStrictEqual(Array.from(result[0]), Array.from(result[1]))
      }))

    it.effect("preserves failures", () =>
      Effect.gen(function*() {
        const result = yield* pipe(
          Effect.all(Array.from({ length: 10 }, () => Effect.fail(new Cause.RuntimeException())), {
            concurrency: 5,
            discard: true
          }),
          Effect.flip
        )
        deepStrictEqual(result, new Cause.RuntimeException())
      }))
  })
})
