describe.concurrent("Sink", () => {
  describe.concurrent("contramap", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().contramap((s: string) => Number.parseInt(s))
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("error", () =>
      Do(($) => {
        const sink = Sink.failSync("ouch").contramap((s: string) => Number.parseInt(s))
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink).either)
        assert.isTrue(result == Either.left("ouch"))
      }).unsafeRunPromise())
  })

  describe.concurrent("contramapChunks", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>()
          .contramapChunks((chunk: Chunk<string>) => chunk.map((s) => Number.parseInt(s)))
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("error", () =>
      Do(($) => {
        const sink = Sink.failSync("ouch")
          .contramapChunks((chunk: Chunk<string>) => chunk.map((s) => Number.parseInt(s)))
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink).either)
        assert.isTrue(result == Either.left("ouch"))
      }).unsafeRunPromise())
  })

  describe.concurrent("contramapEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>()
          .contramapEffect((s: string) => Effect.attempt(Number.parseInt(s)))
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("error", () =>
      Do(($) => {
        const sink = Sink.failSync("ouch")
          .contramapEffect((s: string) => Effect.attempt(Number.parseInt(s)))
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink).either)
        assert.isTrue(result == Either.left("ouch"))
      }).unsafeRunPromise())

    it("error in transformation", () =>
      Do(($) => {
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
        const stream = Stream("1", "a")
        const result = $(stream.run(sink).exit)
        assert.isTrue(result == Exit.fail(error))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("contramapChunksEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().contramapChunksEffect((chunk: Chunk<string>) =>
          Effect.forEach(chunk, (s) => Effect.attempt(Number.parseInt(s)))
        )
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("error", () =>
      Do(($) => {
        const sink = Sink.failSync("ouch").contramapChunksEffect((chunk: Chunk<string>) =>
          Effect.forEach(chunk, (s) => Effect.attempt(Number.parseInt(s)))
        )
        const stream = Stream("1", "2", "3")
        const result = $(stream.run(sink).either)
        assert.isTrue(result == Either.left("ouch"))
      }).unsafeRunPromise())

    it("error in transformation", () =>
      Do(($) => {
        const error = new Error("woops")
        const sink = Sink.collectAll<number>().contramapChunksEffect(
          (chunk: Chunk<string>) =>
            Effect.forEach(chunk, (s) =>
              Effect.attempt(() => {
                const n = Number.parseInt(s)
                if (Number.isNaN(n)) {
                  throw error
                }
                return n
              }))
        )
        const stream = Stream("1", "a")
        const result = $(stream.run(sink).exit)
        assert.isTrue(result == Exit.fail(error))
      }).unsafeRunPromiseExit())
  })
})
