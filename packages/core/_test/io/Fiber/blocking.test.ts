describe.concurrent("Fiber", () => {
  describe.concurrent("track blockingOn", () => {
    it("in await", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.never.fork())
        .bind("f2", ({ f1 }) => f1.await().fork())
        .bind("blockingOn", ({ f2 }) =>
          f2._status
            .continueOrFail(
              () => undefined,
              (status) =>
                status._tag === "Suspended"
                  ? Option.some(status.blockingOn)
                  : Option.none
            )
            .eventually());

      const { blockingOn, f1 } = await program.unsafeRunPromise();

      assert.isTrue(blockingOn == f1.id());
    });
  });
});
