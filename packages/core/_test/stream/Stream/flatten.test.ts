describe.concurrent("Stream", () => {
  describe.concurrent("flattenExitMaybe", () => {
    it("happy path", async () => {
      const program = Effect.scoped(
        Stream.range(0, 10)
          .toQueue(1)
          .flatMap((queue) =>
            Stream.fromQueue(queue)
              .map((take) => take.exit)
              .flattenExitMaybe
              .runCollect
          )
          .map((chunk) => chunk.flatten)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })

    it("errors", async () => {
      const error = new RuntimeError("boom")
      const program = Effect.scoped(
        (Stream.range(0, 10) + Stream.fail(error)).toQueue(1).flatMap((queue) =>
          Stream.fromQueue(queue)
            .map((take) => take.exit)
            .flattenExitMaybe
            .runCollect
        )
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })
  })

  describe.concurrent("flattenCollection", () => {
    it("flattens a stream of collections", async () => {
      const lists = List(List(1, 2, 3), List.empty<number>(), List(4, 5))
      const program = Stream.fromCollection(lists).flattenCollection.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.toImmutableArray == lists.flatten.toImmutableArray)
    })
  })

  describe.concurrent("flattenTake", () => {
    it("happy path", async () => {
      const chunks = Chunk(Chunk(1, 2, 3), Chunk.empty<number>(), Chunk(4, 5))
      const program = Stream.fromChunks(...chunks)
        .mapChunks((chunk) => Chunk.single(Take.chunk(chunk)))
        .flattenTake
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result ==
          chunks.reduce(Chunk.empty<number>(), (acc, c) => acc + c)
      )
    })

    it("stop collecting on Exit.Failure", async () => {
      const program = Stream(Take.chunk(Chunk(1, 2)), Take.single(3), Take.end)
        .flattenTake
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("work with empty chunks", async () => {
      const program = Stream(
        Take.chunk(Chunk.empty<number>()),
        Take.chunk(Chunk.empty<number>())
      )
        .flattenTake
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("work with empty streams", async () => {
      const program = Stream.fromCollection(List.empty<Take<never, never>>())
        .flattenTake
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })
  })
})
