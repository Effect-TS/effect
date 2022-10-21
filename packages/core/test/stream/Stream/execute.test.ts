describe.concurrent("Stream", () => {
  describe.concurrent("execute", () => {
    it("should execute the specified effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .tap(({ ref }) => Stream.execute(ref.set(List(1))).runDrain)
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == List(1))
    })
  })
})
