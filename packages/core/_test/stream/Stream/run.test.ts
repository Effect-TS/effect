describe.concurrent("Stream", () => {
  describe.concurrent("runHead", () => {
    it("nonempty stream", async () => {
      const program = Stream(1, 2, 3, 4).runHead

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })

    it("empty stream", async () => {
      const program = Stream.empty.runHead

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("pulls up to the first non-empty chunk", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .bind("head", ({ ref }) =>
          Stream(
            Stream.fromEffect(ref.update((list) => list.prepend(1))).drain,
            Stream.fromEffect(ref.update((list) => list.prepend(2))).drain,
            Stream(1),
            Stream.fromEffect(ref.update((list) => list.prepend(3)))
          )
            .flatten
            .runHead)
        .bind("result", ({ ref }) => ref.get)

      const { head, result } = await program.unsafeRunPromise()

      assert.isTrue(head == Maybe.some(1))
      assert.isTrue(result == Chunk(2, 1))
    })
  })

  describe.concurrent("runLast", () => {
    it("nonempty stream", async () => {
      const program = Stream(1, 2, 3, 4).runLast

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(4))
    })

    it("empty stream", async () => {
      const program = Stream.empty.runLast

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })

  describe.concurrent("runScoped", () => {
    it("properly closes the resources", async () => {
      const program = Effect.Do()
        .bind("closed", () => Ref.make(false))
        .bindValue(
          "res",
          ({ closed }) => Effect.acquireRelease(Effect.sync(1), () => closed.set(true))
        )
        .bindValue("stream", ({ res }) => Stream.scoped(res).flatMap((a) => Stream(a, a, a)))
        .bind("collectAndCheck", ({ closed, stream }) =>
          Effect.scoped(
            stream
              .runScoped(Sink.collectAll())
              .flatMap((r) => closed.get.map((b) => Tuple(r, b)))
          ))
        .bind("finalState", ({ closed }) => closed.get)

      const { collectAndCheck, finalState } = await program.unsafeRunPromise()

      assert.isTrue(collectAndCheck[0] == Chunk(1, 1, 1))
      assert.isFalse(collectAndCheck[1])
      assert.isTrue(finalState)
    })
  })
})
