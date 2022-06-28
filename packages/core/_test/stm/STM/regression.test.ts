describe.concurrent("STM", () => {
  describe.concurrent("regression tests", () => {
    it("read only STM shouldn't return partial state of concurrent read-write STM", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(0))
        .bind("tRef2", () => TRef.makeCommit(0))
        .bind("sumFiber", ({ tRef1, tRef2 }) =>
          tRef1
            .get
            .flatMap((n1) => tRef2.get.map((n2) => n1 + n2))
            .commit
            .fork)
        .tap(({ tRef1, tRef2 }) => (tRef1.update((n) => n + 1) > tRef2.update((n) => n + 1)).commit)
        .flatMap(({ sumFiber }) => sumFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === 0 || result === 2)
    })
  })
})
