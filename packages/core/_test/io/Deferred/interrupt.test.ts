describe.concurrent("Promise", () => {
  describe.concurrent("interrupt", () => {
    it("interrupt a deferred", async () => {
      const program = Deferred.make<string, number>().flatMap((deferred) => deferred.interrupt());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
