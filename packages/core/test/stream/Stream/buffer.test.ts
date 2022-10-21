describe.concurrent("Stream", () => {
  describe.concurrent("buffer", () => {
    it("maintains elements and ordering", async () => {
      const chunk = Chunk(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty<number>(),
        Chunk(6, 7)
      )
      const program = Stream.fromChunks(...chunk).buffer(2).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk.flatten)
    })

    it("buffer the stream with error", async () => {
      const error = new RuntimeError("boom")
      const program = (Stream.range(0, 10) + Stream.failSync(error)).buffer(2).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("fast producer progress independently", async () => {
      const program = Effect.scoped(
        Effect.Do()
          .bind("ref", () => Ref.make<List<number>>(List.empty()))
          .bind("latch", () => Deferred.make<never, void>())
          .bindValue("stream", ({ latch, ref }) =>
            Stream.range(1, 5)
              .tap(
                (n) =>
                  ref.update((list) => list.prepend(n)) >
                    Effect.when(n === 4, latch.succeed(undefined))
              )
              .buffer(2))
          .bind("chunk", ({ stream }) => stream.take(2).runScoped(Sink.collectAll()))
          .tap(({ latch }) => latch.await)
          .bind("list", ({ ref }) => ref.get)
      )

      const { chunk, list } = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk(1, 2))
      assert.isTrue(list.reverse == List(1, 2, 3, 4))
    })
  })

  describe.concurrent("bufferDropping", () => {
    it("buffer the stream with error", async () => {
      const error = new RuntimeError("boom")
      const program = (
        Stream.range(1, 1000) +
        Stream.failSync(error) +
        Stream.range(1001, 2000)
      )
        .bufferDropping(2)
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("fast producer progress independently", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("latch3", () => Deferred.make<never, void>())
        .bind("latch4", () => Deferred.make<never, void>())
        .bindValue(
          "stream1",
          ({ latch1, latch2 }) =>
            Stream(0) +
            Stream.fromEffect(latch1.await).flatMap(() =>
              Stream.range(1, 17).rechunk(1).ensuring(latch2.succeed(undefined))
            )
        )
        .bindValue(
          "stream2",
          ({ latch3, latch4 }) =>
            Stream(0) +
            Stream.fromEffect(latch3.await).flatMap(() =>
              Stream.range(17, 25).rechunk(1).ensuring(latch4.succeed(undefined))
            )
        )
        .bindValue("stream3", () => Stream(-1))
        .bindValue(
          "stream",
          ({ stream1, stream2, stream3 }) => (stream1 + stream2 + stream3).bufferDropping(8)
        )
        .flatMap(({ latch1, latch2, latch3, latch4, ref, stream }) =>
          Effect.scoped(
            stream.toPull.flatMap((as) =>
              Effect.Do()
                .bind("zero", () => as)
                .tap(() => latch1.succeed(undefined))
                .tap(() => latch2.await)
                .tap(() =>
                  as
                    .flatMap((a) => ref.update((list) => List.from(a) + list))
                    .repeatN(7)
                )
                .bind("snapshot1", () => ref.get)
                .tap(() => latch3.succeed(undefined))
                .tap(() => latch4.await)
                .tap(() =>
                  as
                    .flatMap((a) => ref.update((list) => List.from(a) + list))
                    .repeatN(7)
                )
                .bind("snapshot2", () => ref.get)
            )
          )
        )

      const { snapshot1, snapshot2, zero } = await program.unsafeRunPromise()

      assert.isTrue(zero == Chunk(0))
      assert.isTrue(snapshot1 == List(8, 7, 6, 5, 4, 3, 2, 1))
      assert.isTrue(snapshot2 == List(24, 23, 22, 21, 20, 19, 18, 17, 8, 7, 6, 5, 4, 3, 2, 1))
    })
  })

  describe.concurrent("bufferSliding", () => {
    it("buffer the stream with error", async () => {
      const error = new RuntimeError("boom")
      const program = (
        Stream.range(1, 1000) +
        Stream.failSync(error) +
        Stream.range(1001, 2000)
      )
        .bufferSliding(2)
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("fast producer progress independently", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("latch3", () => Deferred.make<never, void>())
        .bind("latch4", () => Deferred.make<never, void>())
        .bindValue(
          "stream1",
          ({ latch1, latch2 }) =>
            Stream(0) +
            Stream.fromEffect(latch1.await).flatMap(() =>
              Stream.range(1, 17).ensuring(latch2.succeed(undefined))
            )
        )
        .bindValue(
          "stream2",
          ({ latch3, latch4 }) =>
            Stream.fromEffect(latch3.await).flatMap(() =>
              Stream.range(17, 25).ensuring(latch4.succeed(undefined))
            )
        )
        .bindValue("stream3", () => Stream(-1))
        .bindValue(
          "stream",
          ({ stream1, stream2, stream3 }) => (stream1 + stream2 + stream3).bufferSliding(8)
        )
        .flatMap(({ latch1, latch2, latch3, latch4, ref, stream }) =>
          Effect.scoped(
            stream.toPull.flatMap((as) =>
              Effect.Do()
                .bind("zero", () => as)
                .tap(() => latch1.succeed(undefined))
                .tap(() => latch2.await)
                .tap(() =>
                  as
                    .flatMap((a) => ref.update((list) => List.from(a) + list))
                    .repeatN(7)
                )
                .bind("snapshot1", () => ref.get)
                .tap(() => latch3.succeed(undefined))
                .tap(() => latch4.await)
                .tap(() =>
                  as
                    .flatMap((a) => ref.update((list) => List.from(a) + list))
                    .repeatN(7)
                )
                .bind("snapshot2", () => ref.get)
            )
          )
        )

      const { snapshot1, snapshot2, zero } = await program.unsafeRunPromise()

      assert.isTrue(zero == Chunk(0))
      assert.isTrue(snapshot1 == List(16, 15, 14, 13, 12, 11, 10, 9))
      assert.isTrue(
        snapshot2 == List(-1, 24, 23, 22, 21, 20, 19, 18, 16, 15, 14, 13, 12, 11, 10, 9)
      )
    })
  })

  describe.concurrent("bufferUnbounded", () => {
    it("buffer the stream", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Stream.fromCollection(chunk).bufferUnbounded.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk)
    })

    it("buffer the stream with error", async () => {
      const error = new RuntimeError("boom")
      const program = (Stream.range(0, 10) + Stream.failSync(error))
        .bufferUnbounded
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("fast producer progress independently", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .bind("latch", () => Deferred.make<never, void>())
        .bindValue("stream", ({ latch, ref }) =>
          Stream.range(1, 1000)
            .tap(
              (i) =>
                ref.update((list) => list.prepend(i)) >
                  Effect.when(i === 999, latch.succeed(undefined))
            )
            .rechunk(1000)
            .bufferUnbounded)
        .bind("chunk", ({ stream }) => stream.take(2).runCollect)
        .tap(({ latch }) => latch.await)
        .bind("list", ({ ref }) => ref.get)

      const { chunk, list } = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk(1, 2))
      assert.isTrue(list == List.from(Chunk.range(1, 999)).reverse)
    })
  })

  describe.concurrent("bufferChunks", () => {
    it("maintains elements and ordering", async () => {
      const chunk = Chunk(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty<number>(),
        Chunk(6, 7)
      )
      const program = Stream.fromChunks(...chunk)
        .bufferChunks(2)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk.flatten)
    })

    it("bufferChunks the stream with error", async () => {
      const error = new RuntimeError("boom")
      const program = (Stream.range(0, 10) + Stream.failSync(error))
        .bufferChunks(2)
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("fast producer progress independently", async () => {
      const program = Effect.scoped(
        Effect.Do()
          .bind("ref", () => Ref.make<List<number>>(List.empty()))
          .bind("latch", () => Deferred.make<never, void>())
          .bindValue("stream", ({ latch, ref }) =>
            Stream.range(1, 5)
              .tap(
                (n) =>
                  ref.update((list) => list.prepend(n)) >
                    Effect.when(n === 4, latch.succeed(undefined))
              )
              .bufferChunks(2))
          .bind("chunk", ({ stream }) => stream.take(2).runScoped(Sink.collectAll()))
          .tap(({ latch }) => latch.await)
          .bind("list", ({ ref }) => ref.get)
      )

      const { chunk, list } = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk(1, 2))
      assert.isTrue(list.reverse == List(1, 2, 3, 4))
    })
  })
})
