import * as MicroInstances from "@effect/typeclass/data/Micro"
import * as RecordInstances from "@effect/typeclass/data/Record"
import { describe, expect, it } from "@effect/vitest"
import * as Micro from "effect/Micro"

describe.concurrent("Micro", () => {
  describe("Applicative", () => {
    it("sequential", async () => {
      const applicative = MicroInstances.getApplicative()
      const traverse = RecordInstances.Traversable.traverse(applicative)
      const log: Array<number> = []
      return Micro.runPromise(Micro.gen(function*() {
        const result = yield* traverse({ a: 1, b: 2 }, (n) =>
          Micro.gen(function*() {
            yield* Micro.sync(() => log.push(n)).pipe(Micro.delay(30 - (n * 10)))
            return n + 1
          }))
        expect(result).toStrictEqual({ a: 2, b: 3 })
        expect(log).toStrictEqual([1, 2])
      }))
    })

    it("concurrent", async () => {
      const applicative = MicroInstances.getApplicative({ concurrency: "unbounded" })
      const traverse = RecordInstances.Traversable.traverse(applicative)
      const log: Array<number> = []
      return Micro.runPromise(Micro.gen(function*() {
        const result = yield* traverse({ a: 1, b: 2 }, (n) =>
          Micro.gen(function*() {
            yield* Micro.sync(() => log.push(n)).pipe(Micro.delay(30 - (n * 10)))
            return n + 1
          }))
        expect(result).toStrictEqual({ a: 2, b: 3 })
        expect(log).toStrictEqual([2, 1])
      }))
    })
  })
})
