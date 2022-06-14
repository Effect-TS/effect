describe.concurrent("Stream", () => {
  describe.concurrent("catchAllCause", () => {
    it("happy path", async () => {
      const program = Stream(1, 2)
        .catchAllCause(() => Stream(3, 4))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2))
    })

    it("recovery from errors", async () => {
      const program = (Stream(1, 2) + Stream.fail("boom"))
        .catchAllCause(() => Stream(3, 4))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("recovery from defects", async () => {
      const program = (Stream(1, 2) + Stream.dieMessage("boom"))
        .catchAllCause(() => Stream(3, 4))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("executes finalizers", async () => {
      const program = Effect.Do()
        .bind("finalizers", () => Ref.make<List<string>>(List.empty()))
        .bindValue("stream1", ({ finalizers }) =>
          (Stream(1, 2) + Stream.fail("boom")).ensuring(
            finalizers.update((list) => list.prepend("stream1"))
          ))
        .bindValue("stream2", ({ finalizers }) =>
          (Stream(3, 4) + Stream.fail("boom")).ensuring(
            finalizers.update((list) => list.prepend("stream2"))
          ))
        .tap(({ stream1, stream2 }) =>
          stream1
            .catchAllCause(() => stream2)
            .runCollect()
            .exit()
        )
        .flatMap(({ finalizers }) => finalizers.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("stream2", "stream1"))
    })

    it("releases all resources by the time the failover stream has started", async () => {
      const program = Effect.Do()
        .bind("finalizers", () => Ref.make(Chunk.empty<number>()))
        .bindValue(
          "stream",
          ({ finalizers }) =>
            Stream.finalizer(finalizers.update((chunk) => chunk.prepend(1))) >
              Stream.finalizer(finalizers.update((chunk) => chunk.prepend(2))) >
              Stream.finalizer(finalizers.update((chunk) => chunk.prepend(3))) >
              Stream.fail("boom")
        )
        .flatMap(({ finalizers, stream }) =>
          stream
            .drain()
            .catchAllCause(() => Stream.fromEffect(finalizers.get()))
            .runCollect()
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.flatten == Chunk(1, 2, 3))
    })

    it("propagates the right exit value to the failing stream (ZIO issue #3609)", async () => {
      const program = Ref.make<Exit<unknown, unknown>>(Exit.unit)
        .tap((ref) =>
          Stream.acquireReleaseExit(Effect.unit, (_, exit) => ref.set(exit))
            .flatMap(() => Stream.fail("boom"))
            .either()
            .runDrain()
            .exit()
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Exit.fail("boom"))
    })
  })

  describe.concurrent("catchSome", () => {
    it("recovery from some errors", async () => {
      const program = (Stream(1, 2) + Stream.fail("boom"))
        .catchSome((s) => (s === "boom" ? Option.some(Stream(3, 4)) : Option.none))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("fails stream when partial function does not match", async () => {
      const program = (Stream(1, 2) + Stream.fail("boom"))
        .catchSome((s) => (s === "boomer" ? Option.some(Stream(3, 4)) : Option.none))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("boom"))
    })
  })

  describe.concurrent("catchSomeCause", () => {
    it("recovery from some errors", async () => {
      const program = (Stream(1, 2) + Stream.failCause(Cause.fail("boom")))
        .catchSomeCause((cause) =>
          cause.isFailType() && cause.value === "boom"
            ? Option.some(Stream(3, 4))
            : Option.none
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("halts stream when partial function does not match", async () => {
      const program = (Stream(1, 2) + Stream.fail("boom"))
        .catchSomeCause((cause) => cause.isEmpty ? Option.some(Stream(3, 4)) : Option.none)
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("boom"))
    })
  })

  describe.concurrent("onError", () => {
    it("simple example", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("exit", ({ ref }) =>
          Stream.fail("boom")
            .onError(() => ref.set(true))
            .runDrain()
            .exit())
        .bind("called", ({ ref }) => ref.get())

      const { called, exit } = await program.unsafeRunPromise()

      assert.isTrue(called)
      assert.isTrue(exit.untraced == Exit.fail("boom"))
    })
  })
})
