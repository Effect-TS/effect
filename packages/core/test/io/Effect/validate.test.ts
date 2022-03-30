import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { Cause } from "../../../src/io/Cause"
import type { IO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("validate", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validate(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("accumulate errors and ignore successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validate(list, (n) =>
        n % 2 === 0 ? Effect.succeed(n) : Effect.fail(n)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 3, 5, 7, 9])
    })

    it("accumulate successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validate(list, Effect.succeedNow).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("fails", async () => {
      const program = Effect.succeed(1).validate(Effect.fail(2)).sandbox().either()

      const result = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.fail(2))
      )
    })

    it("combines both cause", async () => {
      const program = Effect.fail(1).validate(Effect.fail(2)).sandbox().either()

      const result = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.fail(1) + Cause.fail(2))
      )
    })
  })

  describe("validateDiscard", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validateDiscard(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })
  })

  describe("validatePar", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 1000)
      const program = Effect.validatePar(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("accumulate errors and ignore successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validatePar(list, (n) =>
        n % 2 === 0 ? Effect.succeed(n) : Effect.fail(n)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 3, 5, 7, 9])
    })

    it("accumulate successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validatePar(list, Effect.succeedNow).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })
  })

  describe("validateParDiscard", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validateParDiscard(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })
  })

  describe("validateFirst", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validateFirst(list, Effect.failNow)
        .flip()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("runs sequentially and short circuits on first success validation", async () => {
      function f(n: number): IO<number, number> {
        return n === 6 ? Effect.succeed(n) : Effect.fail(n)
      }

      const list = List.range(1, 10)
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bind("result", ({ counter }) =>
          Effect.validateFirst(list, (n) => counter.update((n) => n + 1) > f(n))
        )
        .bind("count", ({ counter }) => counter.get)

      const { count, result } = await program.unsafeRunPromise()

      expect(result).toBe(6)
      expect(count).toBe(6)
    })

    it("returns errors in correct order", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Effect.validateFirst(list, Effect.failNow)
        .flip()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([2, 4, 6, 3, 5, 6])
    })
  })

  describe("validateFirstPar", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 1000)
      const program = Effect.validateFirstPar(list, Effect.failNow)
        .flip()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("returns success if valid", async () => {
      function f(n: number): IO<number, number> {
        return n === 6 ? Effect.succeed(n) : Effect.fail(n)
      }

      const list = List.range(1, 10)
      const program = Effect.validateFirstPar(list, f)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(6)
    })
  })

  describe("validateWith", () => {
    it("succeeds", async () => {
      const program = Effect.succeed(1).validateWith(Effect.succeed(2), (a, b) => a + b)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(3)
    })
  })
})
