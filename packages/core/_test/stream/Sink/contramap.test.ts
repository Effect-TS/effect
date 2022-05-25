describe.concurrent("Sink", () => {
  describe.concurrent("contramap", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramap((s: string) => Number.parseInt(s))
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramap((s: string) => Number.parseInt(s))
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })

  describe.concurrent("contramapChunks", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramapChunks((chunk: Chunk<string>) =>
        chunk.map((s) => Number.parseInt(s))
      )
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramapChunks((chunk: Chunk<string>) => chunk.map((s) => Number.parseInt(s)))
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })

  describe.concurrent("contramapEffect", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramapEffect((s: string) => Effect.attempt(Number.parseInt(s)))
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramapEffect((s: string) => Effect.attempt(Number.parseInt(s)))
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("error in transformation", async () => {
      const error = new Error("woops")
      const sink = Sink.collectAll<number>().contramapEffect((s: string) =>
        Effect.attempt(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw error
          }
          return n
        })
      )
      const program = Stream("1", "a").run(sink)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced() == Exit.fail(error))
    })
  })

  describe.concurrent("contramapChunksEffect", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramapChunksEffect(
        (chunk: Chunk<string>) => chunk.mapEffect((s) => Effect.attempt(Number.parseInt(s)))
      )
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramapChunksEffect((chunk: Chunk<string>) =>
        chunk.mapEffect((s) => Effect.attempt(Number.parseInt(s)))
      )
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("error in transformation", async () => {
      const error = new Error("woops")
      const sink = Sink.collectAll<number>().contramapChunksEffect(
        (chunk: Chunk<string>) =>
          chunk.mapEffect((s) =>
            Effect.attempt(() => {
              const n = Number.parseInt(s)
              if (Number.isNaN(n)) {
                throw error
              }
              return n
            })
          )
      )
      const program = Stream("1", "a").run(sink)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced() == Exit.fail(error))
    })
  })
})
