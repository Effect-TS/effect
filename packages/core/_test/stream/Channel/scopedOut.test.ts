describe.concurrent("Channel", () => {
  describe.concurrent("scopedOut", () => {
    it("failure", async () => {
      const program = Channel.scopedOut(Effect.fail("error")).runCollect();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("error"));
    });
  });
});
