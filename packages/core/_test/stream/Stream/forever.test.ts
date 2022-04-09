describe.concurrent("Stream", () => {
  describe.concurrent("forever", () => {
    it("forever", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream(1)
            .forever()
            .runForEachWhile(() => ref.modify((sum) => Tuple(sum >= 9 ? false : true, sum + 1)))
        )
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10);
    });
  });
});
