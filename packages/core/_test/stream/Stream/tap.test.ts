describe.concurrent("Stream", () => {
  describe.concurrent("tap", () => {
    it("tap", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("result", ({ ref }) =>
          Stream(1, 1)
            .tap((m) => ref.update((n) => n + m))
            .runCollect)
        .bind("sum", ({ ref }) => ref.get())

      const { result, sum } = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 1))
      assert.strictEqual(sum, 2)
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .tap((n) => Effect.when(n === 3, Effect.fail("fail")))
        .either
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.right(2),
          Either.left("fail")
        )
      )
    })
  })

  describe.concurrent("tapError", () => {
    it("tapError", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(""))
        .bind("result", ({ ref }) =>
          (Stream(1, 1) + Stream.fail("ouch"))
            .tapError((err) => ref.update((s) => s + err))
            .runCollect
            .either)
        .bind("err", ({ ref }) => ref.get())

      const { err, result } = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
      assert.strictEqual(err, "ouch")
    })
  })

  describe.concurrent("tapSink", () => {
    it("sink that is done after stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) => Sink.forEach((m: number) => ref.update((n) => n + m)))
        .bindValue("stream", ({ sink }) => Stream(1, 1, 2, 3, 5, 8).tapSink(sink))
        .bind("elements", ({ stream }) => stream.runCollect)
        .bind("done", ({ ref }) => ref.get())

      const { done, elements } = await program.unsafeRunPromise()

      assert.isTrue(elements == Chunk(1, 1, 2, 3, 5, 8))
      assert.strictEqual(done, 20)
    })

    it("sink that is done before stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) =>
          Sink.take<number>(3)
            .map((chunk) => chunk.reduce(0, (a, b) => a + b))
            .mapEffect((m) => ref.update((n) => n + m)))
        .bindValue("stream", ({ sink }) => Stream(1, 1, 2, 3, 5, 8).tapSink(sink))
        .bind("elements", ({ stream }) => stream.runCollect)
        .bind("done", ({ ref }) => ref.get())

      const { done, elements } = await program.unsafeRunPromise()

      assert.isTrue(elements == Chunk(1, 1, 2, 3, 5, 8))
      assert.strictEqual(done, 4)
    })

    it("sink that fails before stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) => Sink.fail("error"))
        .bindValue("stream", ({ sink }) => Stream.never.tapSink(sink))
        .flatMap(({ stream }) => stream.runCollect.flip)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "error")
    })

    it("does not read ahead", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) => Sink.forEach((m: number) => ref.update((n) => n + m)))
        .bindValue("stream", () => Stream(1, 2, 3, 4, 5).rechunk(1).forever)
        .bind("elements", ({ sink, stream }) => stream.tapSink(sink).take(3).runDrain)
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 6)
    })
  })
})
