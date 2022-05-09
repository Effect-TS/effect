describe.concurrent("Stream", () => {
  describe.concurrent("ensuring", () => {
    it("runs finalizers in the correct order", async () => {
      const event = (label: string) => (list: List<string>) => list.prepend(label);
      const program = Effect.Do()
        .bind("log", () => Ref.make<List<string>>(List.empty()))
        .tap(({ log }) =>
          Stream.acquireRelease(log.update(event("acquire")), () => log.update(event("release")))
            .flatMap(() => Stream.fromEffect(log.update(event("use"))))
            .ensuring(log.update(event("ensuring")))
            .runDrain()
        )
        .flatMap(({ log }) => log.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result.reverse() == List(
          "acquire",
          "use",
          "release",
          "ensuring"
        )
      );
    });
  });

  describe.concurrent("finalizer", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("log", () => Ref.make<List<string>>(List.empty()))
        .bindValue(
          "entry",
          ({ log }) => (label: string) => log.update((list) => list.prepend(label))
        )
        .tap(({ entry }) =>
          Stream.acquireRelease(entry("Acquire"), () => entry("Release"))
            .flatMap(() => Stream.finalizer(entry("Use")))
            .ensuring(entry("Ensuring"))
            .runDrain()
        )
        .flatMap(({ log }) => log.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result.reverse() == List(
          "Acquire",
          "Use",
          "Release",
          "Ensuring"
        )
      );
    });

    it("finalizer is not run if stream is not pulled", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Effect.scoped(
            Stream.finalizer(ref.set(true))
              .toPull()
              .flatMap(() => Effect.unit)
          )
        )
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });
  });
});
