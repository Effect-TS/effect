import { Chunk } from "packages/core/src/collection/immutable/Chunk"

import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { constFalse, constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Ref } from "../../../src/io/Ref"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("fold", () => {
    it("empty", async () => {
      const program = Stream.empty
        .transduce(Sink.fold(0, constTrue, (a, b) => a + b))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0])
    })

    it("termination in the middle", async () => {
      const program = Stream.range(1, 10).run(
        Sink.fold(
          0,
          (n) => n < 5,
          (a, b) => a + b
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(6)
    })

    it("immediate termination", async () => {
      const program = Stream.range(1, 10).run(Sink.fold(0, constFalse, (a, b) => a + b))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("termination at the end", async () => {
      const program = Stream.range(1, 10).run(
        Sink.fold(
          0,
          (n) => n < 500,
          (a, b) => a + b
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(45)
    })
  })

  describe("foldLeft", () => {
    it("equivalence with Chunk.reduce", async () => {
      const program = Effect.struct({
        xs: Stream(1, 2, 3, 4).run(Sink.foldLeft("", (s, n: number) => s + n)),
        ys: Stream(1, 2, 3, 4)
          .runCollect()
          .map((chunk) => chunk.reduce("", (s, n: number) => s + n))
      })

      const { xs, ys } = await program.unsafeRunPromise()

      expect(xs).toEqual(ys)
    })
  })

  describe("foldEffect", () => {
    it("empty", async () => {
      const program = Stream.empty
        .transduce(Sink.foldEffect(0, constTrue, (a, b) => Effect.succeed(a + b)))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0])
    })

    it("short circuits", async () => {
      const empty: Stream<unknown, never, number> = Stream.empty
      const single: Stream<unknown, never, number> = Stream.succeed(1)
      const double: Stream<unknown, never, number> = Stream(1, 2)
      const failed: Stream<unknown, string, number> = Stream.fail("ouch")

      function run<E>(stream: Stream<unknown, E, number>) {
        return Effect.Do()
          .bind("effects", () => Ref.make(List.empty<number>()))
          .bind("exit", ({ effects }) =>
            stream
              .transduce(
                Sink.foldEffect(
                  0,
                  constTrue,
                  (_, a) =>
                    effects.update((list) => list.prepend(a)) > Effect.succeed(30)
                )
              )
              .runCollect()
          )
          .bind("result", ({ effects }) => effects.get())
          .map(({ exit, result }) => Tuple(exit.toArray(), result.toArray()))
          .exit()
      }

      const result1 = await run(empty).unsafeRunPromise()
      const result2 = await run(single).unsafeRunPromise()
      const result3 = await run(double).unsafeRunPromise()
      const result4 = await run(failed).unsafeRunPromise()

      expect(result1).toEqual(Exit.succeed(Tuple([0], [])))
      expect(result2).toEqual(Exit.succeed(Tuple([30], [1])))
      expect(result3).toEqual(Exit.succeed(Tuple([30], [2, 1])))
      expect(result4.untraced()).toEqual(Exit.fail("ouch"))
    })

    describe("foldLeftEffect", () => {
      it("equivalence with List.reduce", async () => {
        const program = Effect.struct({
          sinkResult: Stream(1, 2, 3)
            .run(Sink.foldLeftEffect("", (s, n: number) => Effect.succeed(s + n)))
            .exit(),
          foldResult: Stream(1, 2, 3)
            .runFold(List.empty<number>(), (acc, el) => acc.prepend(el))
            .map((list) => list.reverse().reduce("", (s, n) => s + n))
            .exit()
        })

        const { foldResult, sinkResult } = await program.unsafeRunPromise()

        expect(sinkResult).toEqual(Exit.succeed("123"))
        expect(foldResult).toEqual(Exit.succeed("123"))
      })
    })
  })

  describe("foldUntil", () => {
    it("should fold until the predicate is satisfied", async () => {
      const program = Stream(1, 1, 1, 1, 1, 1)
        .transduce(Sink.foldUntil(0, 3, (n, a: number) => n + a))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([3, 3, 0])
    })
  })

  describe("foldUntilEffect", () => {
    it("should fold until the effectful predicate is satisfied", async () => {
      const program = Stream(1, 1, 1, 1, 1, 1)
        .transduce(
          Sink.foldUntilEffect(0, 3, (n, a: number) => Effect.succeedNow(n + a))
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([3, 3, 0])
    })
  })

  describe("foldWeighted", () => {
    it("should fold using the cost function", async () => {
      const program = Stream(1, 5, 2, 3)
        .transduce(
          Sink.foldWeighted(
            List.empty<number>(),
            (_, x) => x * 2,
            12,
            (acc, el) => acc.prepend(el)
          )
        )
        .map((list) => list.reverse().toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [1, 5],
        [2, 3]
      ])
    })
  })

  describe("foldWeightedDecompose", () => {
    it("simple example", async () => {
      const program = Stream(1, 5, 1)
        .transduce(
          Sink.foldWeightedDecompose<List<number>, number>(
            List.empty<number>(),
            (_, i) => i,
            4,
            (i) => (i > 1 ? Chunk(i - 1, 1) : Chunk(1)),
            (acc, el) => acc.prepend(el)
          )
        )
        .map((list) => list.reverse().toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [1, 3],
        [1, 1, 1]
      ])
    })

    it("empty stream", async () => {
      const program = Stream.empty
        .transduce(
          Sink.foldWeightedDecompose(
            0,
            (_, n) => n,
            1000,
            (n: number) => Chunk.single(n),
            (a, b) => a + b
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0])
    })
  })

  describe("foldWeightedEffect", () => {
    it("should effectfully fold using the cost function", async () => {
      const program = Stream(1, 5, 2, 3)
        .transduce(
          Sink.foldWeightedEffect(
            List.empty<number>(),
            (_, x) => Effect.succeed(x * 2),
            12,
            (acc, el) => Effect.succeed(acc.prepend(el))
          )
        )
        .map((list) => list.reverse().toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [1, 5],
        [2, 3]
      ])
    })
  })

  describe("foldWeightedDecompose", () => {
    it("simple example", async () => {
      const program = Stream(1, 5, 1)
        .transduce(
          Sink.foldWeightedDecomposeEffect(
            List.empty<number>(),
            (_, i) => Effect.succeedNow(i),
            4,
            (i) => Effect.succeedNow(i > 1 ? Chunk(i - 1, 1) : Chunk(1)),
            (acc, el) => Effect.succeedNow(acc.prepend(el))
          )
        )
        .map((list) => list.reverse().toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [1, 3],
        [1, 1, 1]
      ])
    })

    it("empty stream", async () => {
      const program = Stream.empty
        .transduce(
          Sink.foldWeightedDecomposeEffect(
            0,
            (_, n) => Effect.succeedNow(n),
            1000,
            (n: number) => Effect.succeedNow(Chunk.single(n)),
            (a, b) => Effect.succeedNow(a + b)
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0])
    })
  })
})
