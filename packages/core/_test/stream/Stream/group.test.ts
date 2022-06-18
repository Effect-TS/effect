describe.concurrent("Stream", () => {
  describe.concurrent("groupBy", () => {
    it("values", async () => {
      const words = Chunk.fill(10, () => Chunk.range(0, 10))
        .flatten
        .map((n) => n.toString())
      const program = Stream.fromCollection(words)
        .groupByKey(identity, 8192)
        .mergeGroupBy((k, s) => Stream.fromEffect(s.runCollect().map((c) => Tuple(k, c.size).toNative)))
        .runCollect()
        .map((chunk) => new Map([...chunk]))

      const result = await program.unsafeRunPromise()
      const expected = new Map([
        ...Chunk.range(0, 10).map((n) => Tuple(n.toString(), 10).toNative)
      ])

      assert.deepStrictEqual(result, expected)
    })

    it("first", async () => {
      const words = Chunk.fill(10, () => Chunk.range(0, 10))
        .flatten
        .map((n) => n.toString())
      const program = Stream.fromCollection(words)
        .groupByKey(identity, 1050)
        .first(2)
        .mergeGroupBy((k, s) => Stream.fromEffect(s.runCollect().map((c) => Tuple(k, c.size).toNative)))
        .runCollect()
        .map((chunk) => new Map([...chunk]))

      const result = await program.unsafeRunPromise()
      const expected = new Map([
        ...Chunk.range(0, 1).map((n) => Tuple(n.toString(), 10).toNative)
      ])

      assert.deepStrictEqual(result, expected)
    })

    it("filter", async () => {
      const words = Chunk.fill(10, () => Chunk.range(0, 10)).flatten
      const program = Stream.fromCollection(words)
        .groupByKey(identity, 1050)
        .filter((n) => n <= 5)
        .mergeGroupBy((k, s) => Stream.fromEffect(s.runCollect().map((c) => Tuple(k, c.size).toNative)))
        .runCollect()
        .map((chunk) => new Map([...chunk]))

      const result = await program.unsafeRunPromise()
      const expected = new Map([
        ...Chunk.range(0, 5).map((n) => Tuple(n, 10).toNative)
      ])

      assert.deepStrictEqual(result, expected)
    })

    it("outer errors", async () => {
      const words = Chunk("abc", "test", "test", "foo")
      const program = (Stream.fromCollection(words) + Stream.fail("boom"))
        .groupByKey(identity)
        .mergeGroupBy((_, s) => s.drain())
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("boom"))
    })
  })

  describe.concurrent("grouped", () => {
    it("sanity", async () => {
      const program = Stream(1, 2, 3, 4, 5)
        .grouped(2)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5)))
    })

    it("group size is correct", async () => {
      const program = Stream.range(0, 100)
        .grouped(10)
        .map((chunk) => chunk.size)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.fill(10, () => 10))
    })

    it("doesn't emit empty chunks", async () => {
      const program = Stream.fromCollection(Chunk.empty<number>()).grouped(5).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("is equivalent to Chunk#grouped", async () => {
      const stream = Stream.range(1, 10)
      const program = Effect.Do()
        .bind("result1", () => stream.grouped(2).runCollect())
        .bind("partial", () => stream.runCollect())
        .bindValue("result2", ({ partial }) => partial.grouped(2))

      const { result1, result2 } = await program.unsafeRunPromise()

      assert.isTrue(result1 == result2)
    })

    it("emits elements properly when a failure occurs", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<Chunk<number>>()))
        .bindValue("streamChunks", () => Stream.fromChunks(Chunk(1, 2, 3, 4), Chunk(5, 6, 7), Chunk(8)))
        .bindValue("stream", ({ streamChunks }) => (streamChunks + Stream.fail("ouch")).grouped(3))
        .bind("either", ({ ref, stream }) =>
          stream
            .mapEffect((chunk) => ref.update((cs) => cs.append(chunk)))
            .runCollect()
            .either())
        .bind("result", ({ ref }) => ref.get())

      const { either, result } = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk(1, 2, 3), Chunk(4, 5, 6), Chunk(7, 8)))
      assert.isTrue(either == Either.left("ouch"))
    })
  })

  // TODO(Mike/Max): implement after TestClock
  // describe.concurrent("groupedWithin", () => {
  //   it("group based on time passed", async () => {
  //     assertWithChunkCoordination(List(Chunk(1, 2), Chunk(3, 4), Chunk.single(5))) { c =>
  //       val stream = ZStream
  //         .fromQueue(c.queue)
  //         .collectWhileSuccess
  //         .flattenChunks
  //         .groupedWithin(10, 2.seconds)
  //         .tap(_ => c.proceed)

  //       assertM(for {
  //         f      <- stream.runCollect().fork
  //         _      <- c.offer *> TestClock.adjust(2.seconds) *> c.awaitNext
  //         _      <- c.offer *> TestClock.adjust(2.seconds) *> c.awaitNext
  //         _      <- c.offer
  //         result <- f.join
  //       } yield result)(equalTo(Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5))))
  //     }
  //   })

  //   it("group based on time passed (#5013)", async () => {
  //     val chunkResult = Chunk(
  //       Chunk(1, 2, 3),
  //       Chunk(4, 5, 6),
  //       Chunk(7, 8, 9),
  //       Chunk(10, 11, 12, 13, 14, 15, 16, 17, 18, 19),
  //       Chunk(20, 21, 22, 23, 24, 25, 26, 27, 28, 29)
  //     )

  //     assertWithChunkCoordination((1 to 29).map(Chunk.single).toList) { c =>
  //       for {
  //         latch <- ZStream.Handoff.make[Unit]
  //         ref   <- Ref.make(0)
  //         fiber <- ZStream
  //                    .fromQueue(c.queue)
  //                    .collectWhileSuccess
  //                    .flattenChunks
  //                    .tap(_ => c.proceed)
  //                    .groupedWithin(10, 3.seconds)
  //                    .tap(chunk => ref.update(_ + chunk.size) *> latch.offer(()))
  //                    .run(ZSink.take(5))
  //                    .fork
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         result0 <- latch.take *> ref.get
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         result1 <- latch.take *> ref.get
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         _       <- c.offer *> TestClock.adjust(1.second) *> c.awaitNext
  //         result2 <- latch.take *> ref.get
  //         // This part is to make sure schedule clock is being restarted
  //         // when the specified amount of elements has been reached
  //         _       <- TestClock.adjust(2.second) *> (c.offer *> c.awaitNext).repeatN(9)
  //         result3 <- latch.take *> ref.get
  //         _       <- c.offer *> c.awaitNext *> TestClock.adjust(2.second) *> (c.offer *> c.awaitNext).repeatN(8)
  //         result4 <- latch.take *> ref.get
  //         result  <- fiber.join
  //       } yield assert(result)(equalTo(chunkResult)) &&
  //         assert(result0)(equalTo(3)) &&
  //         assert(result1)(equalTo(6)) &&
  //         assert(result2)(equalTo(9)) &&
  //         assert(result3)(equalTo(19)) &&
  //         assert(result4)(equalTo(29))
  //     }
  //   })

  //   it("group immediately when chunk size is reached", async () => {
  //     assertM(ZStream(1, 2, 3, 4).groupedWithin(2, 10.seconds).runCollect())(
  //       equalTo(Chunk(Chunk(1, 2), Chunk(3, 4), Chunk()))
  //     )
  //   })
  // })
})
