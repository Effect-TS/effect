import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { exactlyOnce } from "./test-utils"

describe("Effect", () => {
  describe("filter", () => {
    it("filters a collection using an effectual predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("results", ({ ref }) =>
          Effect.filter(list, (n) =>
            ref.update((list) => list.prepend(n)).as(n % 2 === 0)
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get.map((list) => list.reverse().toArray()))

      const { effects, results } = await program.unsafeRunPromise()

      expect(results).toEqual([2, 4, 6, 6])
      expect(effects).toEqual([2, 4, 6, 3, 5, 6])
    })
  })

  describe("filterNot", () => {
    it("filters a collection using an effectual predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("results", ({ ref }) =>
          Effect.filterNot(list, (n) =>
            ref.update((list) => list.prepend(n)).as(n % 2 === 0)
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get.map((list) => list.reverse().toArray()))

      const { effects, results } = await program.unsafeRunPromise()

      expect(results).toEqual([3, 5])
      expect(effects).toEqual([2, 4, 6, 3, 5, 6])
    })
  })

  describe("filterPar", () => {
    it("filters a collection in parallel using an effectual predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28)
      const program = Effect.filterPar(list, (n) => Effect.succeed(n % 2 === 0)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([2, 4, 6, 6, 10, 20, 22, 28])
    })
  })

  describe("filterNotPar", () => {
    it("filters a collection in parallel using an effectual predicate, removing all elements that satisfy the predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28)
      const program = Effect.filterNotPar(list, (n) => Effect.succeed(n % 2 === 0)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([3, 5, 11, 15, 17, 23, 25])
    })
  })

  describe("filterOrElseWith", () => {
    it("returns checked failure from held value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            )
          )
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("1 was not 0")))
    })
  })

  describe("filterOrElse", () => {
    it("returns checked failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.filterOrElse((n) => n === 0, Effect.fail("predicate failed!"))
          )
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.filterOrElse((n) => n === 0, Effect.fail("predicate failed!"))
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("predicate failed!")))
    })
  })

  describe("filterOrFail", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) => _.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) => _.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("predicate failed!")))
    })
  })
})
