import * as EffectInstances from "@effect/typeclass/data/Effect"
import * as RecordInstances from "@effect/typeclass/data/Record"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

describe.concurrent("Effect", () => {
  describe("Applicative", () => {
    it("sequential", async () => {
      const applicative = EffectInstances.getApplicative()
      const traverse = RecordInstances.Traversable.traverse(applicative)
      const log: Array<number> = []
      return Effect.runPromise(Effect.gen(function*() {
        const result = yield* traverse({ a: 1, b: 2 }, (n) =>
          Effect.gen(function*() {
            yield* Effect.sync(() => log.push(n)).pipe(Effect.delay(30 - (n * 10)))
            return n + 1
          }))
        expect(result).toStrictEqual({ a: 2, b: 3 })
        expect(log).toStrictEqual([1, 2])
      }))
    })

    it("concurrent", async () => {
      const applicative = EffectInstances.getApplicative({ concurrency: "unbounded" })
      const traverse = RecordInstances.Traversable.traverse(applicative)
      const log: Array<number> = []
      return Effect.runPromise(Effect.gen(function*() {
        const result = yield* traverse({ a: 1, b: 2 }, (n) =>
          Effect.gen(function*() {
            yield* Effect.sync(() => log.push(n)).pipe(Effect.delay(30 - (n * 10)))
            return n + 1
          }))
        expect(result).toStrictEqual({ a: 2, b: 3 })
        expect(log).toStrictEqual([2, 1])
      }))
    })
  })
})
