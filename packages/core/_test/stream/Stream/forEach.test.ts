describe.concurrent("Stream", () => {
  describe.concurrent("iterate", () => {
    it("simple example", async () => {
      const program = Stream.iterate(1, (n) => n + 1)
        .take(10)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(1, 10))
    })
  })

  describe.concurrent("runForEach", () => {
    it("with small data set", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) => Stream(1, 1, 1, 1, 1).runForEach((n) => ref.update((m) => n + m)))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })

    it("with bigger data set", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) => Stream.fromCollection(Chunk.fill(1000, () => 1)).runForEach((n) => ref.update((m) => n + m)))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1000)
    })
  })

  describe.concurrent("forEachWhile", () => {
    it("with small data set", async () => {
      const expected = 3
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream(1, 1, 1, 1, 1).runForEachWhile((a) =>
            ref.modify((sum) => sum >= expected ? Tuple(false, sum) : Tuple(true, sum + a))
          )
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, expected)
    })

    it("with bigger data set", async () => {
      const expected = 500
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream.fromCollection(Chunk.fill(1000, () => 1)).runForEachWhile((a) =>
            ref.modify((sum) => sum >= expected ? Tuple(false, sum) : Tuple(true, sum + a))
          )
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, expected)
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(true))
        .tap(({ ref }) =>
          (
            Stream(true, true, false) + Stream.fromEffect(ref.set(false)).drain()
          ).runForEachWhile(Effect.succeedNow)
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
