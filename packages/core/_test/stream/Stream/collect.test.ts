describe.concurrent("Stream", () => {
  describe.concurrent("collect", () => {
    it("collects values according to the partial function", async () => {
      const program = Stream<Either<number, number>>(
        Either.left(1),
        Either.right(2),
        Either.left(3)
      )
        .collect((either) => either.isRight() ? Maybe.some(either.right) : Maybe.none)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(2))
    })
  })

  describe.concurrent("collectEffect", () => {
    it("simple example", async () => {
      const program = Stream<Either<number, number>>(
        Either.left(1),
        Either.right(2),
        Either.left(3)
      )
        .collectEffect((either) => either.isRight() ? Maybe.some(Effect.succeed(either.right * 2)) : Maybe.none)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(4))
    })

    it("collects on multiple chunks", async () => {
      const program = Stream.fromChunks<Either<number, number>>(
        Chunk(Either.left(1), Either.right(2)),
        Chunk(Either.right(3), Either.left(4))
      )
        .collectEffect((either) =>
          either.isRight()
            ? Maybe.some(Effect.succeed(either.right * 10))
            : Maybe.none
        )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(20, 30))
    })

    it("fails", async () => {
      const program = Stream.fromChunks<Either<number, number>>(
        Chunk(Either.left(1), Either.right(2)),
        Chunk(Either.left(3), Either.right(4))
      )
        .collectEffect((either) => either.isRight() ? Maybe.some(Effect.fail("ouch")) : Maybe.none)
        .runDrain
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3, 4)
        .collectEffect((n) => n === 3 ? Maybe.some(Effect.fail("boom")) : Maybe.some(Effect.succeed(n)))
        .either
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.right(2),
          Either.left("boom")
        )
      )
    })

    it("eagerness on values", async () => {
      const builder = Chunk.builder<number>()
      const program = Stream.fromChunk(Chunk.range(0, 3))
        .collectEffect((n) => {
          builder.append(n)
          return Maybe.some(Effect.succeed(n))
        })
        .map((n) => {
          builder.append(n)
          return n
        })
        .runDrain

      await program.unsafeRunPromise()

      assert.isTrue(
        builder.build() == Chunk(0, 0, 1, 1, 2, 2, 3, 3)
      )
    })
  })

  describe.concurrent("collectSome", () => {
    it("simple example", async () => {
      const stream = Stream(Maybe.some(1), Maybe.none, Maybe.some(2))
      const program = Effect.struct({
        actual: stream.collectSome.runCollect,
        expected: stream.runCollect.map((chunk) => chunk.compact)
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })

  describe.concurrent("collectWhile", () => {
    it("simple example", async () => {
      const program = Stream(
        Maybe.some(1),
        Maybe.some(2),
        Maybe.some(3),
        Maybe.none,
        Maybe.some(4)
      )
        .collectWhile(identity)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("short circuits", async () => {
      const program = (Stream(Maybe.some(1)) + Stream.fail("ouch"))
        .collectWhile((option) => (option.isNone() ? Maybe.some(1) : Maybe.none))
        .runDrain
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.right(undefined))
    })
  })

  describe.concurrent("collectWhileEffect", () => {
    it("simple example", async () => {
      const program = Stream(
        Maybe.some(1),
        Maybe.some(2),
        Maybe.some(3),
        Maybe.none,
        Maybe.some(4)
      )
        .collectWhileEffect((option) => option.isSome() ? Maybe.some(Effect.succeed(option.value * 2)) : Maybe.none)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(2, 4, 6))
    })

    it("short circuits", async () => {
      const program = (Stream(Maybe.some(1)) + Stream.fail("ouch"))
        .collectWhileEffect((option) => option.isNone() ? Maybe.some(Effect.succeedNow(1)) : Maybe.none)
        .runDrain
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.right(undefined))
    })

    it("fails", async () => {
      const program = Stream(
        Maybe.some(1),
        Maybe.some(2),
        Maybe.some(3),
        Maybe.none,
        Maybe.some(4)
      )
        .collectWhileEffect((option) => option.isSome() ? Maybe.some(Effect.fail("ouch")) : Maybe.none)
        .runDrain
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3, 4)
        .collectWhileEffect((n) => n === 3 ? Maybe.some(Effect.fail("boom")) : Maybe.some(Effect.succeed(n)))
        .either
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.right(2),
          Either.left("boom")
        )
      )
    })

    it("eagerness on values", async () => {
      const builder = Chunk.builder<number>()
      const program = Stream.fromChunk(Chunk.range(0, 3))
        .collectWhileEffect((n) => {
          builder.append(n)
          return Maybe.some(Effect.succeed(n))
        })
        .map((n) => {
          builder.append(n)
          return n
        })
        .runDrain

      await program.unsafeRunPromise()

      assert.isTrue(
        builder.build() == Chunk(0, 0, 1, 1, 2, 2, 3, 3)
      )
    })
  })
})
