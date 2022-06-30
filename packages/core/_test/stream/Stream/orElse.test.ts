describe.concurrent("Stream", () => {
  describe.concurrent("orElse", () => {
    it("simple example", async () => {
      const stream1 = Stream(1, 2, 3) + Stream.fail("boom")
      const stream2 = Stream(4, 5, 6)
      const program = stream1
        .orElse(stream2)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4, 5, 6))
    })
  })

  describe.concurrent("orElseEither", () => {
    it("simple example", async () => {
      const stream1 = Stream.succeed(1) + Stream.fail("boom")
      const stream2 = Stream.succeed(2)
      const program = stream1
        .orElseEither(stream2)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Either.left(1), Either.right(2)))
    })
  })

  describe.concurrent("orElseFail", () => {
    it("simple example", async () => {
      const stream = Stream.succeed(1) + Stream.fail("boom")
      const program = stream.orElseFail("boomer").runCollect.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("boomer"))
    })
  })

  describe.concurrent("orElseOptional", () => {
    it("simple example", async () => {
      const stream1 = Stream.succeed(1) + Stream.fail(Maybe.none)
      const stream2 = Stream.succeed(2)
      const program = stream1
        .orElseOptional(stream2)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2))
    })
  })

  describe.concurrent("orElseSucceed", () => {
    it("simple example", async () => {
      const stream = Stream.succeed(1) + Stream.fail(Maybe.none)
      const program = stream
        .orElseSucceed(2)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2))
    })
  })
})
