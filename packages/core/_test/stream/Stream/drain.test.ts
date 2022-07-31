import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("drain", () => {
    it("drain", async () => {
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) =>
          Stream.range(0, 10)
            .mapEffect((n) => ref.update((list) => list.prepend(n)))
            .drain
            .runDrain
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.reverse == List.from(Chunk.range(0, 9)))
    })

    it("isn't too eager", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind(
          "res",
          ({ ref }) => (Stream(1).tap((n) => ref.set(n)) + Stream.fail("fail")).runDrain.either
        )
        .bind("refRes", ({ ref }) => ref.get())

      const { refRes, res } = await program.unsafeRunPromise()

      assert.isTrue(res == Either.left("fail"))
      assert.strictEqual(refRes, 1)
    })
  })

  describe.concurrent("drainFork", () => {
    it("runs the other stream in the background", async () => {
      const program = Deferred.make<never, void>().flatMap((latch) =>
        Stream.fromEffect(latch.await)
          .drainFork(Stream.fromEffect(latch.succeed(undefined)))
          .runDrain
          .map(constTrue)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("interrupts the background stream when the foreground exits", async () => {
      const program = Effect.Do()
        .bind("backgroundInterrupted", () => Ref.make(constFalse))
        .bind("latch", () => Deferred.make<never, void>())
        .tap(({ backgroundInterrupted, latch }) =>
          (Stream(1, 2, 3) + Stream.fromEffect(latch.await).drain)
            .drainFork(
              Stream.fromEffect(
                latch.succeed(undefined)
                  .zipRight(Effect.never)
                  .onInterrupt(() => backgroundInterrupted.set(true))
              )
            )
            .runDrain
        )
        .flatMap(({ backgroundInterrupted }) => backgroundInterrupted.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("fails the foreground stream if the background fails with a typed error", async () => {
      const program = Stream.never.drainFork(Stream.fail("boom")).runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail("boom"))
    })

    it("fails the foreground stream if the background fails with a defect", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.never.drainFork(Stream.die(error)).runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })
  })
})
