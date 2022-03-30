import { List } from "../../../src/collection/immutable/List"
import { constFalse, constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import * as Equal from "../../../src/prelude/Equal"

describe("Effect", () => {
  describe("retryUntil", () => {
    it("retries until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntil((n) => n === 0)
          )
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).flipWith((effect) => effect.retryUntil(constTrue))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("retryUntilEquals", () => {
    it("retries until error equals predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).flipWith((effect) =>
            effect.retryUntilEquals(Equal.number)(5)
          )
        )
        .flatMap(({ acc }) => acc.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("retryUntilEffect", () => {
    it("retries until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntilEffect((n) => Effect.succeed(n === 0))
          )
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref
            .update((n) => n + 1)
            .flipWith((effect) => effect.retryUntilEffect(() => Effect.succeed(true)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("retryWhile", () => {
    it("retries while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhile((n) => n >= 0)
          )
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).flipWith((effect) => effect.retryWhile(constFalse))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("retryWhileEquals", () => {
    it("retries while error equals predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take < acc.update((n) => n + 1)).flipWith((effect) =>
            effect.retryWhileEquals(Equal.number)(0)
          )
        )
        .flatMap(({ acc }) => acc.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("retryWhileEffect", () => {
    it("retries while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhileEffect((n) => Effect.succeed(n >= 0))
          )
        )
        .flatMap(({ output }) => output.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref
            .update((n) => n + 1)
            .flipWith((effect) => effect.retryWhileEffect(() => Effect.succeed(false)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
