import { List } from "../../../src/collection/immutable/List"
import { constFalse, constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import * as Equal from "../../../src/prelude/Equal"

describe("Effect", () => {
  describe("repeatUntil", () => {
    it("repeatUntil repeats until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).repeatUntil(
            (n) => n === 0
          )
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("repeatUntil always evaluates effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) => ref.update((n) => n + 1).repeatUntil(constTrue))
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(1)
    })
  })

  describe("repeatUntilEquals", () => {
    it("repeatUntilEquals repeats until result is equal to predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).repeatUntilEquals(Equal.number)(5)
        )
        .flatMap(({ acc }) => acc.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("repeatUntilEffect", () => {
    it("repeats until the effectful condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (
            input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)
          ).repeatUntilEffect((n) => Effect.succeed(n === 0))
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).repeatUntilEffect(() => Effect.succeed(true))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("repeatWhile", () => {
    it("repeats while the condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).repeatWhile(
            (n) => n >= 0
          )
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) => ref.update((n) => n + 1).repeatWhile(constFalse))
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("repeatWhileEquals", () => {
    it("repeats while the result equals the predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).repeatWhileEquals(Equal.number)(0)
        )
        .flatMap(({ acc }) => acc.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("repeatWhileEffect", () => {
    it("repeats while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (
            input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)
          ).repeatWhileEffect((v) => Effect.succeed(v >= 0))
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("always evaluates effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).repeatWhileEffect(() => Effect.succeed(false))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
