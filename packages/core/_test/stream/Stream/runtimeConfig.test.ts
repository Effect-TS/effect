describe.concurrent("Stream", () => {
  describe.concurrent("withRuntimeConfig", () => {
    it("runs the stream on the specified runtime configuration", async () => {
      const program = Effect.Do()
        .bind("def", () => Effect.runtimeConfig)
        .bindValue("modified", ({ def }) => RuntimeConfig({ ...def.value, maxOp: 4096 }))
        .bind("ref1", ({ def }) => Ref.make(def))
        .bind("ref2", ({ def }) => Ref.make(def))
        .bindValue("stream1", ({ modified, ref1 }) =>
          Stream.fromEffect(
            Effect.runtimeConfig.flatMap((c) => ref1.set(c))
          ).withRuntimeConfig(modified))
        .bindValue(
          "stream2",
          ({ ref2 }) => Stream.fromEffect(Effect.runtimeConfig.flatMap((c) => ref2.set(c)))
        )
        .tap(({ stream1, stream2 }) => (stream1 > stream2).runDrain)
        .bind("count1", ({ ref1 }) => ref1.get().map((runtimeConfig) => runtimeConfig.value.maxOp))
        .bind("count2", ({ ref2 }) => ref2.get().map((runtimeConfig) => runtimeConfig.value.maxOp))

      const { count1, count2 } = await program.unsafeRunPromise()

      assert.strictEqual(count1, 4096)
      assert.strictEqual(count2, 2048)
    })
  })
})
