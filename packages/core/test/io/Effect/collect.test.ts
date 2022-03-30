import { List } from "../../../src/collection/immutable/List"
import { Option } from "../../../src/data/Option"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("collectAllPar", () => {
    it("returns the list in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.collectAllPar(list).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("is referentially transparent", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bindValue("op", ({ counter }) => counter.getAndUpdate((n) => n + 1))
        .bindValue("ops3", ({ op }) =>
          Effect.collectAllPar(List(op, op, op)).map((chunk) => chunk.toArray())
        )
        .bindValue("ops6", ({ ops3 }) => ops3.zipPar(ops3))
        .flatMap(({ ops6 }) => ops6)

      const result = await program.unsafeRunPromise()

      expect(result.get(0)).not.toStrictEqual(result.get(1))
    })
  })

  describe("collectAllPar - parallelism", () => {
    it("returns results in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.collectAllPar(list)
        .withParallelism(2)
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })
  })

  describe("collectAllParDiscard - parallelism", () => {
    it("preserves failures", async () => {
      const list = List.repeat(Effect.fail(new RuntimeError()), 10)
      const program = Effect.collectAllParDiscard(list).withParallelism(5).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(new RuntimeError())
    })
  })

  describe("collectFirst", () => {
    it("collects the first value for which the effectual function returns Some", async () => {
      const program = Effect.collectFirst(List.range(0, 10), (n) =>
        n > 5 ? Effect.succeed(Option.some(n)) : Effect.succeed(Option.none)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(6))
    })
  })
})
