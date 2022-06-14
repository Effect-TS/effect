describe.concurrent("Stream", () => {
  describe.concurrent("Combinators", () => {
    describe.concurrent("absolve", () => {
      it("happy path", async () => {
        const program = Stream.fromCollection(Chunk(1, 2, 3).map(Either.right))
          .absolve()
          .runCollect()

        const result = await program.unsafeRunPromise()

        assert.isTrue(result == Chunk(1, 2, 3))
      })

      it("failure", async () => {
        const program = Stream.fromCollection(
          Chunk(1, 2, 3).map(Either.right) + Chunk(Either.left("ouch"))
        )
          .absolve()
          .runCollect()

        const result = await program.unsafeRunPromiseExit()

        assert.isTrue(result.untraced == Exit.fail("ouch"))
      })

      it("round trip #1", async () => {
        const xss = Stream.fromCollection(Chunk(1, 2, 3).map(Either.right))
        const stream = xss + Stream(Either.left(4)) + xss
        const program = Effect.Do()
          .bind("res1", () => stream.runCollect())
          .bind("res2", () => stream.absolve().either().runCollect())

        const { res1, res2 } = await program.unsafeRunPromise()

        assert.isTrue(res1.take(res2.length) == res2)
      })

      it("round trip #2", async () => {
        const xss = Stream.fromCollection(Chunk(1, 2, 3))
        const stream = xss + Stream.fail("ouch")
        const program = Effect.Do()
          .bind("res1", () => stream.runCollect().exit())
          .bind("res2", () => stream.either().absolve().runCollect().exit())

        const { res1, res2 } = await program.unsafeRunPromise()

        assert.isTrue(res1.untraced == Exit.fail("ouch"))
        assert.isTrue(res2.untraced == Exit.fail("ouch"))
      })
    })
  })
})
