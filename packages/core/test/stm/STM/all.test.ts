import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { constVoid } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("collectAll", () => {
    // TODO: implement after TQueue
    it.skip("ordering", async () => {
      // val tx = for {
      //   tq  <- TQueue.bounded[Int](3)
      //   _   <- tq.offer(1)
      //   _   <- tq.offer(2)
      //   _   <- tq.offer(3)
      //   ans <- ZSTM.collectAll(List(tq.take, tq.take, tq.take))
      // } yield ans
      // assertM(tx.commit)(equalTo(List(1, 2, 3)))
    })

    it("collects a list of transactional effects to a single transaction that produces a list of values", async () => {
      const program = Effect.Do()
        .bind("iterable", () =>
          Effect.succeed(List.range(1, 101).map((n) => TRef.make(n)))
        )
        .bind("tRefs", ({ iterable }) => STM.collectAll(iterable).commit())
        .flatMap(({ tRefs }) =>
          Effect.forEachPar(tRefs, (tRef) => tRef.get().commit()).map((chunk) =>
            chunk.toArray()
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 101).toArray())
    })

    it("collects a chunk of transactional effects to a single transaction that produces a chunk of values", async () => {
      const program = Effect.Do()
        .bind("iterable", () =>
          Effect.succeed(List.range(1, 101).map((n) => TRef.make(n)))
        )
        .bind("tRefs", ({ iterable }) => STM.collectAll(Chunk.from(iterable)).commit())
        .flatMap(({ tRefs }) =>
          Effect.forEachPar(tRefs, (tRef) => tRef.get().commit()).map((chunk) =>
            chunk.toArray()
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 101).toArray())
    })
  })

  describe("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = STM.mergeAll(
        List.empty<STM<unknown, never, number>>(),
        zeroElement,
        () => nonZero
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("merge list using function", async () => {
      const program = STM.mergeAll(
        List(3, 5, 7).map(STM.succeedNow),
        1,
        (a, b) => a + b
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })
    it("return error if it exists in list", async () => {
      const program = STM.mergeAll(
        List<STM<unknown, any, any>>(STM.unit, STM.fail(1)),
        undefined,
        constVoid
      ).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })
  describe("reduceAll", () => {
    it("should reduce all elements to a single value", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List(2, 3, 4).map(STM.succeedNow),
        (acc, a) => acc + a
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("should handle an empty iterable", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List.empty<STM<unknown, never, number>>(),
        (acc, a) => acc + a
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
