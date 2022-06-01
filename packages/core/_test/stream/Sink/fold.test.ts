import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Sink", () => {
  describe.concurrent("fold", () => {
    it("empty", async () => {
      const program = Stream.empty
        .transduce(Sink.fold<number, number>(0, constTrue, (a, b) => a + b))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0))
    })

    it("termination in the middle", async () => {
      const program = Stream.range(1, 10).run(
        Sink.fold<number, number>(
          0,
          (n) => n < 5,
          (a, b) => a + b
        )
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 6)
    })

    it("immediate termination", async () => {
      const program = Stream.range(1, 10).run(Sink.fold<number, number>(0, constFalse, (a, b) => a + b))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("termination at the end", async () => {
      const program = Stream.range(1, 10).run(
        Sink.fold<number, number>(
          0,
          (n) => n < 500,
          (a, b) => a + b
        )
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 45)
    })
  })

  describe.concurrent("foldLeft", () => {
    it("equivalence with Chunk.reduce", async () => {
      const program = Effect.struct({
        xs: Stream(1, 2, 3, 4).run(Sink.foldLeft<number, string>("", (s, n) => s + n)),
        ys: Stream(1, 2, 3, 4)
          .runCollect()
          .map((chunk) => chunk.reduce("", (s, n) => s + n))
      })

      const { xs, ys } = await program.unsafeRunPromise()

      assert.strictEqual(xs, ys)
    })
  })

  describe.concurrent("foldEffect", () => {
    it("empty", async () => {
      const program = Stream.empty
        .transduce(Sink.foldEffect<never, never, number, number>(0, constTrue, (a, b) => Effect.succeed(a + b)))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0))
    })

    it("short circuits", async () => {
      const empty: Stream<never, never, number> = Stream.empty
      const single: Stream<never, never, number> = Stream.succeed(1)
      const double: Stream<never, never, number> = Stream(1, 2)
      const failed: Stream<never, string, number> = Stream.fail("ouch")

      function run<E>(stream: Stream<never, E, number>) {
        return Effect.Do()
          .bind("effects", () => Ref.make(List.empty<number>()))
          .bind("exit", ({ effects }) =>
            stream
              .transduce(
                Sink.foldEffect<never, never, number, number>(
                  0,
                  constTrue,
                  (_, a) => effects.update((list) => list.prepend(a)) > Effect.succeed(30)
                )
              )
              .runCollect())
          .bind("result", ({ effects }) => effects.get())
          .map(({ exit, result }) => Tuple(exit, result))
          .exit()
      }

      const result1 = await run(empty).unsafeRunPromise()
      const result2 = await run(single).unsafeRunPromise()
      const result3 = await run(double).unsafeRunPromise()
      const result4 = await run(failed).unsafeRunPromise()

      assert.isTrue(result1 == Exit.succeed(Tuple(Chunk(0), List.empty())))
      assert.isTrue(result2 == Exit.succeed(Tuple(Chunk(30), List(1))))
      assert.isTrue(result3 == Exit.succeed(Tuple(Chunk(30), List(2, 1))))
      assert.isTrue(result4.untraced() == Exit.fail("ouch"))
    })

    describe.concurrent("foldLeftEffect", () => {
      it("equivalence with List.reduce", async () => {
        const program = Effect.struct({
          sinkResult: Stream(1, 2, 3)
            .run(Sink.foldLeftEffect<never, never, number, string>("", (s, n) => Effect.succeed(s + n)))
            .exit(),
          foldResult: Stream(1, 2, 3)
            .runFold<never, never, number, List<number>>(List.empty<number>(), (acc, el) => acc.prepend(el))
            .map((list) => list.reverse().reduce("", (s, n) => s + n))
            .exit()
        })

        const { foldResult, sinkResult } = await program.unsafeRunPromise()

        assert.isTrue(sinkResult == Exit.succeed("123"))
        assert.isTrue(foldResult == Exit.succeed("123"))
      })
    })
  })

  describe.concurrent("foldUntil", () => {
    it("should fold until the predicate is satisfied", async () => {
      const program = Stream(1, 1, 1, 1, 1, 1)
        .transduce(Sink.foldUntil<number, number>(0, 3, (n, a) => n + a))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(3, 3, 0))
    })
  })

  describe.concurrent("foldUntilEffect", () => {
    it("should fold until the effectful predicate is satisfied", async () => {
      const program = Stream(1, 1, 1, 1, 1, 1)
        .transduce(
          Sink.foldUntilEffect<never, never, number, number>(0, 3, (n, a) => Effect.succeedNow(n + a))
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(3, 3, 0))
    })
  })

  describe.concurrent("foldWeighted", () => {
    it("should fold using the cost function", async () => {
      const program = Stream(1, 5, 2, 3)
        .transduce(
          Sink.foldWeighted<number, List<number>>(
            List.empty(),
            (_, x) => x * 2,
            12,
            (acc, el) => acc.prepend(el)
          )
        )
        .map((list) => list.reverse())
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          List(1, 5),
          List(2, 3)
        )
      )
    })
  })

  describe.concurrent("foldWeightedDecompose", () => {
    it("simple example", async () => {
      const program = Stream(1, 5, 1)
        .transduce(
          Sink.foldWeightedDecompose<List<number>, number>(
            List.empty(),
            (_, i) => i,
            4,
            (i) => (i > 1 ? Chunk(i - 1, 1) : Chunk(1)),
            (acc, el) => acc.prepend(el)
          )
        )
        .map((list) => list.reverse())
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          List(1, 3),
          List(1, 1, 1)
        )
      )
    })

    it("empty stream", async () => {
      const program = Stream.empty
        .transduce(
          Sink.foldWeightedDecompose<number, number>(
            0,
            (_, n) => n,
            1000,
            (n) => Chunk.single(n),
            (a, b) => a + b
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0))
    })
  })

  describe.concurrent("foldWeightedEffect", () => {
    it("should effectfully fold using the cost function", async () => {
      const program = Stream(1, 5, 2, 3)
        .transduce(
          Sink.foldWeightedEffect(
            List.empty<number>(),
            (_, x: number) => Effect.succeed(x * 2),
            12 as number,
            (acc: List<number>, el) => Effect.succeed(acc.prepend(el))
          )
        )
        .map((list: List<number>) => list.reverse())
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          List(1, 5),
          List(2, 3)
        )
      )
    })
  })

  describe.concurrent("foldWeightedDecompose", () => {
    it("simple example", async () => {
      const program = Stream(1, 5, 1)
        .transduce<never, never, number, never, never, List<number>>(
          Sink.foldWeightedDecomposeEffect(
            List.empty(),
            (_, i) => Effect.succeedNow(i),
            4,
            (i) => Effect.succeedNow(i > 1 ? Chunk(i - 1, 1) : Chunk(1)),
            (acc: List<number>, el) => Effect.succeedNow(acc.prepend(el))
          )
        )
        .map((list) => list.reverse())
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          List(1, 3),
          List(1, 1, 1)
        )
      )
    })

    it("empty stream", async () => {
      const program = Stream.empty
        .transduce(
          Sink.foldWeightedDecomposeEffect(
            0 as number,
            (_, n: number) => Effect.succeedNow(n),
            1000,
            (n) => Effect.succeedNow(Chunk.single(n)),
            (a, b) => Effect.succeedNow(a + b)
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0))
    })
  })
})
