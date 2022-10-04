describe.concurrent("Stream", () => {
  describe.concurrent("zipAllSortedByKeyWith", () => {
    // TODO(Mike/Max): implement after Gen
    it.skip("zips and sorts by keys", async () => {
      // val genSortedByKey = for {
      //   map    <- Gen.mapOf(Gen.int(1, 100), Gen.int(1, 100))
      //   chunk   = Chunk.fromIterable(map).sorted
      //   chunks <- splitChunks(Chunk(chunk))
      // } yield chunks
      // check(genSortedByKey, genSortedByKey) { (as, bs) =>
      //   val left   = ZStream.fromChunks(as: _*)
      //   val right  = ZStream.fromChunks(bs: _*)
      //   val actual = left.zipAllSortedByKeyWith(right)(identity, identity)(_ + _)
      //   val expected = Chunk.fromIterable {
      //     as.flatten.toMap.foldLeft(bs.flatten.toMap) { case (map, (k, v)) =>
      //       map.get(k).fold(map + (k -> v))(v1 => map + (k -> (v + v1)))
      //     }
      //   }.sorted
      //   assertM(actual.runCollect)(equalTo(expected))
      // }
    })
  })

  describe.concurrent("zip", () => {
    it("doesn't pull too much when one of the streams is done", async () => {
      const left = Stream.fromChunks(Chunk(1, 2), Chunk(3, 4), Chunk(5)) +
        Stream.failSync("nothing to see here")
      const right = Stream.fromChunks(Chunk("a", "b"), Chunk("c"))
      const program = left.zip(right).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Tuple(1, "a"), Tuple(2, "b"), Tuple(3, "c")))
    })

    it("equivalence with Chunk.zip", async () => {
      const left = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5))
      const right = Chunk(Chunk(6, 7), Chunk(8, 9), Chunk(10))
      const program = Effect.struct({
        chunkResult: Effect.sync(left.flatten.zip(right.flatten)),
        streamResult: Stream.fromChunks(...left)
          .zip(Stream.fromChunks(...right))
          .runCollect
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })
  })

  describe.concurrent("zipWith", () => {
    it("prioritizes failure", async () => {
      const program = Stream.never
        .zipWith(Stream.failSync("ouch"), () => Maybe.none)
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("dies if one of the streams throws an exception", async () => {
      const error = Error("ouch")
      const program = Stream(1)
        .flatMap(() =>
          Stream.sync(() => {
            throw error
          })
        )
        .zipWith(Stream(1), (a, b) => a + b)
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })
  })

  describe.concurrent("zipAll", () => {
    it("prioritizes failure", async () => {
      const program = Stream.never
        .zipAll(Stream.failSync("ouch"), Maybe.none, Maybe.none)
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })

  describe.concurrent("zipAllWith", () => {
    it("simple example", async () => {
      const left = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5))
      const right = Chunk(Chunk(6, 7), Chunk(8, 9), Chunk(10))
      const program = Stream.fromChunks(...left)
        .map(Maybe.some)
        .zipAll(Stream.fromChunks(...right).map(Maybe.some), Maybe.none, Maybe.none)
        .runCollect

      const result = await program.unsafeRunPromise()
      const expected = left.flatten.zipAllWith(
        right.flatten,
        (a, b) => Tuple(Maybe.some(a), Maybe.some(b)),
        (a) => Tuple(Maybe.some(a), Maybe.none),
        (b) => Tuple(Maybe.none, Maybe.some(b))
      )

      assert.isTrue(result == expected)
    })
  })

  describe.concurrent("zipWithIndex", () => {
    it("equivalence with Chunk.zipWithIndex", async () => {
      const stream = Stream.range(0, 5)
      const program = Effect.struct({
        streamResult: stream.zipWithIndex.runCollect,
        chunkResult: stream.runCollect.map((chunk) => chunk.zipWithIndex)
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })
  })

  describe.concurrent("zipWithLatest", () => {
    it("succeed", async () => {
      const program = Effect.Do()
        .bind("left", () => Queue.unbounded<Chunk<number>>())
        .bind("right", () => Queue.unbounded<Chunk<number>>())
        .bind("out", () => Queue.bounded<Take<never, Tuple<[number, number]>>>(1))
        .tap(({ left, out, right }) =>
          Stream.fromChunkQueue(left)
            .zipWithLatest(Stream.fromChunkQueue(right), (a, b) => Tuple(a, b))
            .runIntoQueue(out)
            .fork
        )
        .tap(({ left }) => left.offer(Chunk.single(0)))
        .tap(({ right }) => right.offerAll(Chunk(Chunk.single(0), Chunk.single(1))))
        .bind("chunk1", ({ out }) =>
          out.take
            .flatMap((take) => take.done)
            .replicateEffect(2)
            .map((chunk) => chunk.flatten))
        .tap(({ left }) => left.offerAll(Chunk(Chunk.single(1), Chunk.single(2))))
        .bind("chunk2", ({ out }) =>
          out.take
            .flatMap((take) => take.done)
            .replicateEffect(2)
            .map((chunk) => chunk.flatten))

      const { chunk1, chunk2 } = await program.unsafeRunPromise()

      assert.isTrue(chunk1 == Chunk(Tuple(0, 0), Tuple(0, 1)))
      assert.isTrue(chunk2 == Chunk(Tuple(1, 1), Tuple(2, 1)))
    })

    it("handle empty pulls properly - 1", async () => {
      const stream0 = Stream.fromChunks(
        Chunk.empty<number>(),
        Chunk.empty<number>(),
        Chunk.single(2)
      )
      const stream1 = Stream.fromChunks(Chunk.single(1), Chunk.single(1))
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, number>())
        .bind("latch", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred, latch }) =>
          stream0
            .concat(Stream.fromEffect(deferred.await))
            .concat(Stream(2))
            .zipWithLatest(
              Stream(1, 1).ensuring(latch.succeed(undefined)).concat(stream1),
              (_, n) => n
            )
            .take(3)
            .runCollect
            .fork)
        .tap(({ latch }) => latch.await)
        .tap(({ deferred }) => deferred.succeed(2))
        .flatMap(({ fiber }) => fiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1, 1))
    })

    it("handle empty pulls properly - 2", async () => {
      const program = Stream.unfold(
        0,
        (n) => Maybe.some(Tuple(n < 3 ? Chunk.empty<number>() : Chunk.single(2), n + 1))
      )
        .unchunks
        .forever
        .zipWithLatest(Stream(1).forever, (_, n) => n)
        .take(3)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1, 1))
    })

    // TODO(Mike/Max): implement after Gen
    it.skip("preserves partial ordering of stream elements", async () => {
      // val genSortedStream = for {
      //   chunk  <- Gen.chunkOf(Gen.int(1, 100)).map(_.sorted)
      //   chunks <- splitChunks(Chunk(chunk))
      // } yield ZStream.fromChunks(chunks: _*)
      // check(genSortedStream, genSortedStream) { (left, right) =>
      //   for {
      //     out <- left.zipWithLatest(right)(_ + _).runCollect
      //   } yield assert(out)(isSorted)
      // }
    })
  })

  describe.concurrent("zipWithNext", () => {
    it("should zip with next element for a single chunk", async () => {
      const program = Stream(1, 2, 3).zipWithNext.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Tuple(1, Maybe.some(2)),
          Tuple(2, Maybe.some(3)),
          Tuple(3, Maybe.none)
        )
      )
    })

    it("should work with multiple chunks", async () => {
      const program = Stream.fromChunks(
        Chunk.single(1),
        Chunk.single(2),
        Chunk.single(3)
      )
        .zipWithNext
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Tuple(1, Maybe.some(2)),
          Tuple(2, Maybe.some(3)),
          Tuple(3, Maybe.none)
        )
      )
    })

    it("should play well with empty streams", async () => {
      const program = Stream.empty.zipWithNext.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("should output same values as zipping with tail plus last element", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6, 7), Chunk(8))
      const stream = Stream.fromChunks(...chunks)
      const program = Effect.struct({
        result0: stream.zipWithNext.runCollect,
        result1: stream.zipAll(stream.drop(1).map(Maybe.some), 0, Maybe.none).runCollect
      })

      const { result0, result1 } = await program.unsafeRunPromise()

      assert.isTrue(result0 == result1)
    })
  })

  describe.concurrent("zipWithPrevious", () => {
    it("should zip with previous element for a single chunk", async () => {
      const program = Stream(1, 2, 3).zipWithPrevious.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Tuple(Maybe.none, 1),
          Tuple(Maybe.some(1), 2),
          Tuple(Maybe.some(2), 3)
        )
      )
    })

    it("should work with multiple chunks", async () => {
      const program = Stream.fromChunks(
        Chunk.single(1),
        Chunk.single(2),
        Chunk.single(3)
      )
        .zipWithPrevious
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Tuple(Maybe.none, 1),
          Tuple(Maybe.some(1), 2),
          Tuple(Maybe.some(2), 3)
        )
      )
    })

    it("should play well with empty streams", async () => {
      const program = Stream.empty.zipWithPrevious.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("should output same values as first element plus zipping with init", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6, 7), Chunk(8))
      const stream = Stream.fromChunks(...chunks)
      const program = Effect.struct({
        result0: stream.zipWithPrevious.runCollect,
        result1: (Stream(Maybe.none) + stream.map(Maybe.some)).zip(stream).runCollect
      })

      const { result0, result1 } = await program.unsafeRunPromise()

      assert.isTrue(result0 == result1)
    })
  })

  describe.concurrent("zipWithPreviousAndNext", () => {
    it("succeed", async () => {
      const program = Stream(1, 2, 3).zipWithPreviousAndNext.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Tuple(Maybe.none, 1, Maybe.some(2)),
          Tuple(Maybe.some(1), 2, Maybe.some(3)),
          Tuple(Maybe.some(2), 3, Maybe.none)
        )
      )
    })

    it("should output same values as zipping with both previous and next element", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6, 7), Chunk(8))
      const stream = Stream.fromChunks(...chunks)
      const program = Effect.struct({
        result0: stream.zipWithPreviousAndNext.runCollect,
        result1: (Stream(Maybe.none) + stream.map(Maybe.some))
          .zip(stream)
          .zipFlatten(stream.drop(1).map(Maybe.some) + Stream(Maybe.none))
          .runCollect
      })

      const { result0, result1 } = await program.unsafeRunPromise()

      assert.isTrue(result0 == result1)
    })
  })

  describe.concurrent("tuple", () => {
    it("should zip the results of an arbitrary number of streams into a Tuple", async () => {
      const program = Stream.tuple(
        Stream(1, 2, 3),
        Stream("a", "b", "c"),
        Stream(true, false, true)
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Tuple(1, "a", true),
          Tuple(2, "b", false),
          Tuple(3, "c", true)
        )
      )
    })

    it("should terminate on exit of the shortest stream", async () => {
      const program = Stream.tuple(
        Stream(1, 2, 3),
        Stream("a", "b", "c"),
        Stream(true, false)
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Tuple(1, "a", true), Tuple(2, "b", false)))
    })
  })
})
