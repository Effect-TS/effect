describe.concurrent("Stream", () => {
  describe.concurrent("acquireUseRelease", () => {
    it("simple example", async () => {
      const program = Effect.Do()
        .bind("done", () => Ref.make(false))
        .bindValue(
          "stream",
          ({ done }) =>
            Stream.acquireUseRelease(Effect.succeed(Chunk.range(0, 2)), () => done.set(true)).flatMap((chunk) =>
              Stream.fromCollection(chunk)
            )
        )
        .bind("result", ({ stream }) => stream.runCollect())
        .bind("released", ({ done }) => done.get());

      const { released, result } = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(0, 1, 2));
      assert.isTrue(released);
    });

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("done", () => Ref.make(false))
        .bindValue(
          "stream",
          ({ done }) =>
            Stream.acquireUseRelease(Effect.succeed(Chunk.range(0, 3)), () => done.set(true))
              .flatMap((chunk) => Stream.fromCollection(chunk))
              .take(2)
        )
        .bind("result", ({ stream }) => stream.runCollect())
        .bind("released", ({ done }) => done.get());

      const { released, result } = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(0, 1));
      assert.isTrue(released);
    });

    it("no acquisition when short circuiting", async () => {
      const program = Effect.Do()
        .bind("acquired", () => Ref.make(false))
        .bindValue("stream", ({ acquired }) =>
          (
            Stream(1) + Stream.acquireUseRelease(acquired.set(true), () => Effect.unit)
          ).take(0))
        .bind("result", ({ stream }) => stream.runDrain())
        .flatMap(({ acquired }) => acquired.get());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("releases when there are defects", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Stream.acquireUseRelease(Effect.unit, () => ref.set(true))
            .flatMap(() => Stream.fromEffect(Effect.dieMessage("boom")))
            .runDrain()
            .exit()
        )
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("flatMap associativity doesn't affect acquire release lifetime", async () => {
      const program = Effect.struct({
        leftAssoc: Stream.acquireUseRelease(Ref.make(true), (ref) => ref.set(false))
          .flatMap((ref) => Stream.succeed(ref))
          .flatMap((ref) => Stream.fromEffect(ref.get()))
          .runCollect()
          .map((chunk) => chunk.unsafeHead()),
        rightAssoc: Stream.acquireUseRelease(Ref.make(true), (ref) => ref.set(false))
          .flatMap((ref) => Stream.succeed(ref).flatMap((ref) => Stream.fromEffect(ref.get())))
          .runCollect()
          .map((chunk) => chunk.unsafeHead())
      });

      const { leftAssoc, rightAssoc } = await program.unsafeRunPromise();

      assert.isTrue(rightAssoc);
      assert.isTrue(leftAssoc);
    });

    it("propagates errors", async () => {
      const program = Stream.acquireUseRelease(Effect.unit, () => Effect.dieMessage("die")).runCollect();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.isFailure() && result.cause.isDie());
    });
  });
});
