import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("partition", () => {
    it("collects only successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partition(list, (n) => Effect.succeed(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List.empty())
      expect(right).toEqual(list)
    })

    it("collects only failures", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.partition(list, (n) => Effect.fail(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(list)
      expect(right).toEqual(List.empty())
    })

    it("collects failures and successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partition(list, (n) =>
        n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)
      )

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List(0, 2, 4, 6, 8))
      expect(right).toEqual(List(1, 3, 5, 7, 9))
    })

    it("evaluates effects in correct order", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.partition(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(2, 4, 6, 3, 5, 6))
    })
  })

  describe("partitionPar", () => {
    it("collects a lot of successes", async () => {
      const list = List.range(0, 1000)
      const program = Effect.partitionPar(list, (n) => Effect.succeed(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List.empty())
      expect(right).toEqual(list)
    })

    it("collects failures", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.partitionPar(list, (n) => Effect.fail(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(list)
      expect(right).toEqual(List.empty())
    })

    it("collects failures and successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partitionPar(list, (n) =>
        n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)
      )

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List(0, 2, 4, 6, 8))
      expect(right).toEqual(List(1, 3, 5, 7, 9))
    })
  })

  describe("partitionPar - parallelism", () => {
    it("collects a lot of successes", async () => {
      const list = List.range(0, 1000)
      const program = Effect.partitionPar(list, (n) =>
        Effect.succeed(n)
      ).withParallelism(3)

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List.empty())
      expect(right).toEqual(list)
    })

    it("collects failures", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.partitionPar(list, (n) => Effect.fail(n)).withParallelism(
        3
      )

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(list)
      expect(right).toEqual(List.empty())
    })

    it("collects failures and successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partitionPar(list, (n) =>
        n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)
      ).withParallelism(3)

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List(0, 2, 4, 6, 8))
      expect(right).toEqual(List(1, 3, 5, 7, 9))
    })
  })
})
