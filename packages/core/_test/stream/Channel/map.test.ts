describe.concurrent("Channel", () => {
  describe.concurrent("map", () => {
    it("map", async () => {
      const program = Channel.succeed(1)
        .map((n) => n + 1)
        .runCollect();

      const {
        tuple: [chunk, z]
      } = await program.unsafeRunPromise();

      assert.isTrue(chunk.isEmpty());
      assert.strictEqual(z, 2);
    });
  });
});
