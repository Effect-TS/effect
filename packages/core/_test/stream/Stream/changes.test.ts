describe.concurrent("Stream", () => {
  describe.concurrent("changes", () => {
    it("only emits non-equal elements", async () => {
      const stream = Stream(1, 2, 3, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.changes.runCollect.map((chunk) => List.from(chunk)),
        expected: stream.runCollect.map((as) =>
          as
            .reduce<number, List<number>>(List.empty(), (list, n) =>
              list.isNil() || list.unsafeHead !== n ? list.prepend(n) : list)
            .reverse
        )
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })

  describe.concurrent("changesWithEffect", () => {
    it("only emits non-equal elements", async () => {
      const stream = Stream(1, 2, 3, 3, 4, 5)
      const program = Effect.struct({
        actual: stream
          .changesWithEffect((l, r) => Effect.succeed(l === r))
          .runCollect
          .map((chunk) => List.from(chunk)),
        expected: stream.runCollect.map((as) =>
          as
            .reduce<number, List<number>>(List.empty(), (list, n) =>
              list.isNil() || list.unsafeHead !== n ? list.prepend(n) : list)
            .reverse
        )
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })
})
